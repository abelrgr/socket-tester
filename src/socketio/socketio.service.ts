import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { io as SocketIoClient, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { EventsGateway } from '../events/events.gateway';
import { SessionService } from '../session/session.service';
import { CreateSocketIoConnectionDto } from './dto/create-socketio-connection.dto';
import { SendSocketIoMessageDto } from './dto/send-socketio-message.dto';
import { SubscribeEventDto } from './dto/subscribe-event.dto';

@Injectable()
export class SocketIoProxyService {
  private readonly logger = new Logger(SocketIoProxyService.name);
  private readonly clients = new Map<string, Socket>();
  private readonly subscribedEvents = new Map<string, Set<string>>();
  /** Tracks connections that have already emitted a terminal error — prevents spam from multiple transport failures */
  private readonly failedConnections = new Set<string>();

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly sessionService: SessionService,
  ) {}

  createConnection(dto: CreateSocketIoConnectionDto): { connectionId: string } {
    const connectionId = uuidv4();
    const session = this.sessionService.create(connectionId, dto.url, 'socketio');

    const namespace = dto.namespace ?? '';
    const targetUrl = `${dto.url}${namespace}`;

    // Extract the origin from the target URL so we can set it as a header.
    // When the NestJS proxy connects via the `ws` npm package (Node.js), the WS
    // upgrade request either carries no Origin or carries the wrong one (port 3000).
    // Most socket.io servers enforce CORS and reject unknown origins with HTTP 400,
    // which manifests as the generic "websocket error". Setting Origin = target URL
    // makes the connection look same-origin to the server, bypassing the CORS check.
    let targetOrigin: string;
    try {
      const parsed = new URL(dto.url);
      targetOrigin = parsed.origin;
    } catch {
      targetOrigin = dto.url;
    }

    const client = SocketIoClient(targetUrl, {
      path: dto.path ?? '/socket.io',
      auth: dto.auth ?? {},
      query: dto.query ?? {},
      // Node.js proxy: default to websocket-only — polling via xmlhttprequest-ssl
      // fails with 'xhr poll error' in server-to-server contexts.
      transports: dto.transports ?? ['websocket'],
      reconnection: dto.autoReconnect ?? false,
      reconnectionAttempts: dto.autoReconnect ? (dto.reconnectionAttempts ?? 3) : 0,
      reconnectionDelay: dto.reconnectionDelay ?? 1000,
      autoConnect: true,
      timeout: 10_000,
      forceNew: true,
      extraHeaders: {
        // Allow user overrides to take precedence
        origin: targetOrigin,
        ...(dto.extraHeaders ?? {}),
      },
    });

    this.clients.set(connectionId, client);
    this.subscribedEvents.set(connectionId, new Set());

    // Store close callback in session
    session.close = () => {
      client.disconnect();
      this.clients.delete(connectionId);
      this.subscribedEvents.delete(connectionId);
    };

    // Forward ALL incoming events from the remote server to the frontend.
    // This ensures events like `welcome`, `response`, etc. are visible without
    // requiring an explicit per-event subscription.
    client.onAny((eventName: string, ...args: unknown[]) => {
      const payload = args.length === 1 ? args[0] : args;
      const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const size = Buffer.byteLength(json, 'utf8');
      this.sessionService.recordMessageReceived(connectionId, size);
      const msgData = {
        connectionId,
        eventName,
        payload: json,
        direction: 'received' as const,
        type: (typeof payload === 'object' ? 'json' : 'text') as 'json' | 'text',
        size,
        timestamp: new Date().toISOString(),
      };
      // Buffer for replay in case the frontend room hasn't been joined yet
      this.sessionService.bufferMessage(connectionId, 'connection:message', msgData);
      this.eventsGateway.emitToConnection(connectionId, 'connection:message', msgData);
    });

    client.on('connect', () => {
      this.sessionService.updateStatus(connectionId, 'connected');
      this.eventsGateway.emitToConnection(connectionId, 'connection:open', {
        connectionId,
        transport: client.io.engine?.transport?.name,
        namespace,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`Socket.io connected: ${connectionId} → ${targetUrl}`);
    });

    client.on('disconnect', (reason: string) => {
      this.sessionService.updateStatus(connectionId, 'disconnected');
      this.eventsGateway.emitToConnection(connectionId, 'connection:close', {
        connectionId,
        reason,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`Socket.io disconnected: ${connectionId} (${reason})`);
    });

    client.on('connect_error', (err: Error) => {
      // Only emit one terminal error per connection attempt — socket.io-client fires
      // connect_error once per transport (polling, websocket), which causes spam.
      if (this.failedConnections.has(connectionId)) return;
      this.failedConnections.add(connectionId);

      // Extract the real underlying cause.
      // socket.io-client wraps the ws/xhr error inside err.description.error
      // (an AggregateError with code ECONNREFUSED, etc.) — err.description.message
      // is on the prototype and is always undefined for the wrapping object.
      const errAny = err as any;
      const innerErr = errAny?.description?.error ?? errAny?.cause;
      const innerCode: string | undefined = innerErr?.code;
      const innerMsg: string | undefined =
        innerErr?.message ||
        errAny?.description?.message ||
        (typeof errAny?.description === 'string' ? errAny.description : undefined);

      let message: string;
      if (innerCode === 'ECONNREFUSED') {
        message = `Connection refused — is the server running at ${dto.url}?`;
      } else if (innerMsg) {
        message = `${err?.message ?? 'Connection failed'}: ${innerMsg}`;
      } else {
        message = err?.message ?? 'Connection failed';
      }

      this.sessionService.updateStatus(connectionId, 'error', message);
      this.sessionService.recordError(connectionId);
      this.eventsGateway.emitToConnection(connectionId, 'connection:error', {
        connectionId,
        message,
        timestamp: new Date().toISOString(),
      });
      this.logger.warn(`Socket.io connect error ${connectionId}: ${message}`);

      // Defer cleanup — remove disconnect listener first so the 'disconnect' event
      // that fires when we call client.disconnect() does NOT emit connection:close
      // over the already-emitted connection:error.
      setTimeout(() => {
        client.off('disconnect');
        client.disconnect();
        this.clients.delete(connectionId);
        this.subscribedEvents.delete(connectionId);
        this.failedConnections.delete(connectionId);
      }, 200);
    });

    if (dto.autoReconnect) {
      client.io.on('reconnect_attempt', (attempt: number) => {
        this.sessionService.updateStatus(connectionId, 'reconnecting');
        this.eventsGateway.emitToConnection(connectionId, 'connection:reconnecting', {
          connectionId,
          attempt,
          timestamp: new Date().toISOString(),
        });
      });
    }

    return { connectionId };
  }

  subscribeEvent(id: string, dto: SubscribeEventDto): void {
    const client = this.clients.get(id);
    if (!client) throw new NotFoundException(`Connection ${id} not found`);

    const events = this.subscribedEvents.get(id)!;
    if (events.has(dto.eventName)) return; // already subscribed

    events.add(dto.eventName);

    client.on(dto.eventName, (payload: unknown) => {
      const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const size = Buffer.byteLength(json, 'utf8');
      this.sessionService.recordMessageReceived(id, size);
      this.eventsGateway.emitToConnection(id, 'connection:message', {
        connectionId: id,
        eventName: dto.eventName,
        payload: json,
        direction: 'received',
        type: typeof payload === 'object' ? 'json' : 'text',
        size,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.log(`Subscribed to event "${dto.eventName}" on connection ${id}`);
  }

  sendMessage(id: string, dto: SendSocketIoMessageDto): Promise<unknown> {
    const client = this.clients.get(id);
    if (!client) throw new NotFoundException(`Connection ${id} not found`);
    if (!client.connected) throw new BadRequestException('Socket.io client is not connected');

    const json = typeof dto.payload === 'string' ? dto.payload : JSON.stringify(dto.payload);
    const size = Buffer.byteLength(json, 'utf8');
    this.sessionService.recordMessageSent(id, size);

    this.eventsGateway.emitToConnection(id, 'connection:message', {
      connectionId: id,
      eventName: dto.eventName,
      payload: json,
      direction: 'sent',
      type: typeof dto.payload === 'object' ? 'json' : 'text',
      size,
      timestamp: new Date().toISOString(),
    });

    return new Promise((resolve) => {
      if (dto.ack) {
        client.emit(dto.eventName, dto.payload, (ackPayload: unknown) => {
          this.eventsGateway.emitToConnection(id, 'connection:ack', {
            connectionId: id,
            eventName: dto.eventName,
            ackPayload,
            timestamp: new Date().toISOString(),
          });
          resolve({ acked: true, payload: ackPayload });
        });
      } else {
        client.emit(dto.eventName, dto.payload);
        resolve({ sent: true });
      }
    });
  }

  closeConnection(id: string): void {
    const session = this.sessionService.get(id);
    if (!session) throw new NotFoundException(`Connection ${id} not found`);
    if (session.close) {
      session.close();
    }
    this.sessionService.updateStatus(id, 'disconnected');
  }
}
