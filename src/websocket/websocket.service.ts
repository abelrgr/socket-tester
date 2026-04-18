import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { EventsGateway } from '../events/events.gateway';
import { SessionService } from '../session/session.service';
import { LogService } from '../log/log.service';
import { NetworkConditionService } from '../network/network-condition.service';
import { CreateWebSocketConnectionDto } from './dto/create-websocket-connection.dto';
import { SendMessageDto } from './dto/send-message.dto';

const MAX_PAYLOAD_BYTES = parseInt(process.env.MAX_MESSAGE_SIZE_BYTES ?? '1048576');
const PROXY_URL_ALLOWLIST = process.env.PROXY_URL_ALLOWLIST
  ? process.env.PROXY_URL_ALLOWLIST.split(',').map((s) => s.trim()).filter(Boolean)
  : [];

interface PingResolver {
  startTs: number;
  resolve: (latency: number) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private readonly sockets = new Map<string, WebSocket.WebSocket>();
  private readonly pingTimestamps = new Map<string, number>();
  private readonly pingResolvers = new Map<string, PingResolver>();

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly sessionService: SessionService,
    private readonly logService: LogService,
    private readonly networkService: NetworkConditionService,
  ) {}

  private validateAllowlist(url: string): void {
    if (PROXY_URL_ALLOWLIST.length === 0) return;
    try {
      const parsed = new URL(url);
      const allowed = PROXY_URL_ALLOWLIST.some((entry) => {
        const allowedHost = new URL(entry.startsWith('ws') ? entry : `ws://${entry}`).hostname;
        return parsed.hostname === allowedHost;
      });
      if (!allowed) {
        throw new BadRequestException(
          `Target URL is not in the proxy allowlist`,
        );
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Invalid URL');
    }
  }

  createConnection(dto: CreateWebSocketConnectionDto): { connectionId: string } {
    this.validateAllowlist(dto.url);

    const connectionId = uuidv4();
    const session = this.sessionService.create(connectionId, dto.url, 'websocket');

    const wsOptions: WebSocket.ClientOptions = {};
    if (dto.headers && Object.keys(dto.headers).length > 0) {
      wsOptions.headers = dto.headers;
    }

    const ws = new WebSocket.WebSocket(dto.url, dto.protocols ?? [], wsOptions);

    this.sockets.set(connectionId, ws);

    // Register close callback so the generic DELETE endpoint can close any protocol
    session.close = () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Client requested close');
      }
      this.sockets.delete(connectionId);
      this.pingTimestamps.delete(connectionId);
      this.pingTimestamps.delete(`ping:${connectionId}`);
    };

    ws.on('open', () => {
      this.sessionService.updateStatus(connectionId, 'connected');
      this.logService.log({
        connectionId,
        level: 'info',
        event: 'ws:open',
        metadata: { url: dto.url },
      });
      this.eventsGateway.emitToConnection(connectionId, 'connection:open', {
        connectionId,
        timestamp: new Date().toISOString(),
      });
      // Schedule forced disconnect if a network condition requires it
      this.networkService.scheduleDisconnect(connectionId, () => {
        ws.close(1001, 'Network simulation disconnect');
      });
      this.logger.log(`WebSocket connected: ${connectionId} → ${dto.url}`);
    });

    ws.on('message', (data: WebSocket.RawData) => {
      // Apply network condition: packet drop
      if (this.networkService.shouldDrop(connectionId)) return;

      const raw = data instanceof Buffer ? data : Buffer.from(data as ArrayBuffer);
      const size = raw.byteLength;
      const payload = raw.toString('utf8');

      // Check if this is a message-based pong response for latency calculation
      let latencyMs: number | undefined;
      const pingTs = this.pingTimestamps.get(connectionId);
      if (pingTs) {
        latencyMs = Date.now() - pingTs;
        this.pingTimestamps.delete(connectionId);
      }

      this.sessionService.recordMessageReceived(connectionId, size, latencyMs);
      this.logService.log({
        connectionId,
        level: 'debug',
        event: 'ws:message',
        direction: 'in',
        payload: payload.slice(0, 500),
        payloadSize: size,
        latency: latencyMs,
      });

      // Apply network delay before forwarding to client
      void this.networkService.applyDelay(connectionId).then(() => {
        const msgData = {
          connectionId,
          payload,
          timestamp: new Date().toISOString(),
          direction: 'received' as const,
          size,
          latency: latencyMs ?? null,
        };
        // Buffer for replay in case the frontend room hasn't been joined yet
        this.sessionService.bufferMessage(connectionId, 'connection:message', msgData);
        this.eventsGateway.emitToConnection(connectionId, 'connection:message', msgData);
      });
    });

    ws.on('error', (err: Error) => {
      this.sessionService.updateStatus(connectionId, 'error', err.message);
      this.sessionService.recordError(connectionId);
      this.logService.log({
        connectionId,
        level: 'error',
        event: 'ws:error',
        metadata: { message: err.message },
      });
      this.eventsGateway.emitToConnection(connectionId, 'connection:error', {
        connectionId,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
      this.logger.error(`WebSocket error on ${connectionId}: ${err.message}`);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.sessionService.updateStatus(connectionId, 'disconnected');
      this.sockets.delete(connectionId);
      this.pingTimestamps.delete(connectionId);
      this.networkService.clearCondition(connectionId);
      // Reject any pending pingAsync
      const resolver = this.pingResolvers.get(connectionId);
      if (resolver) {
        clearTimeout(resolver.timer);
        this.pingResolvers.delete(connectionId);
        resolver.reject(new Error('Connection closed'));
      }
      this.logService.log({
        connectionId,
        level: 'info',
        event: 'ws:close',
        metadata: { code, reason: reason.toString('utf8') },
      });
      this.eventsGateway.emitToConnection(connectionId, 'connection:close', {
        connectionId,
        code,
        reason: reason.toString('utf8'),
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`WebSocket closed: ${connectionId} (code: ${code})`);
    });

    ws.on('ping', () => {
      this.eventsGateway.emitToConnection(connectionId, 'connection:ping', {
        connectionId,
        timestamp: new Date().toISOString(),
      });
    });

    ws.on('pong', () => {
      // Handle named ping (sendPing REST endpoint)
      const pingTs = this.pingTimestamps.get(`ping:${connectionId}`);
      if (pingTs) {
        const latencyMs = Date.now() - pingTs;
        this.pingTimestamps.delete(`ping:${connectionId}`);
        this.eventsGateway.emitToConnection(connectionId, 'connection:pong', {
          connectionId,
          latency: latencyMs,
          timestamp: new Date().toISOString(),
        });
      }
      // Handle pingAsync (performance test)
      const resolver = this.pingResolvers.get(connectionId);
      if (resolver) {
        const latencyMs = Date.now() - resolver.startTs;
        clearTimeout(resolver.timer);
        this.pingResolvers.delete(connectionId);
        resolver.resolve(latencyMs);
      }
    });

    return { connectionId };
  }

  sendMessage(connectionId: string, dto: SendMessageDto): void {
    const ws = this.sockets.get(connectionId);
    if (!ws) {
      throw new NotFoundException(`Connection not found: ${connectionId}`);
    }

    let payload: string | Buffer;

    if (dto.type === 'json') {
      try {
        JSON.parse(dto.payload);
      } catch {
        throw new BadRequestException('Invalid JSON payload');
      }
      payload = dto.payload;
    } else if (dto.type === 'binary') {
      payload = Buffer.from(dto.payload, 'base64');
    } else {
      payload = dto.payload;
    }

    const size = typeof payload === 'string' ? Buffer.byteLength(payload) : payload.byteLength;
    if (size > MAX_PAYLOAD_BYTES) {
      throw new BadRequestException(
        `Payload exceeds maximum size of ${MAX_PAYLOAD_BYTES} bytes`,
      );
    }

    this.pingTimestamps.set(connectionId, Date.now());
    ws.send(payload);
    this.sessionService.recordMessageSent(connectionId, size);
    this.logService.log({
      connectionId,
      level: 'debug',
      event: 'ws:message',
      direction: 'out',
      payload: dto.payload.slice(0, 500),
      payloadSize: size,
    });

    this.eventsGateway.emitToConnection(connectionId, 'connection:message', {
      connectionId,
      payload: dto.payload,
      timestamp: new Date().toISOString(),
      direction: 'sent',
      size,
      type: dto.type,
    });
  }

  sendPing(connectionId: string): void {
    const ws = this.sockets.get(connectionId);
    if (!ws) {
      throw new NotFoundException(`Connection not found: ${connectionId}`);
    }
    this.pingTimestamps.set(`ping:${connectionId}`, Date.now());
    ws.ping();
  }

  pingAsync(connectionId: string, timeoutMs = 5000): Promise<number> {
    const ws = this.sockets.get(connectionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new NotFoundException(`Connection not found or not open: ${connectionId}`);
    }
    // Reject any pending resolver first
    const existing = this.pingResolvers.get(connectionId);
    if (existing) {
      clearTimeout(existing.timer);
      existing.reject(new Error('Superseded by new ping'));
    }
    return new Promise<number>((resolve, reject) => {
      const startTs = Date.now();
      const timer = setTimeout(() => {
        this.pingResolvers.delete(connectionId);
        reject(new Error('Ping timeout'));
      }, timeoutMs);
      this.pingResolvers.set(connectionId, { startTs, resolve, reject, timer });
      ws.ping();
    });
  }

  closeConnection(connectionId: string): void {
    const session = this.sessionService.get(connectionId);
    if (!session) {
      throw new NotFoundException(`Connection not found: ${connectionId}`);
    }
    if (session.close) {
      const result = session.close();
      if (result instanceof Promise) result.catch(() => {});
    }
    this.sessionService.updateStatus(connectionId, 'disconnected');
  }

  getSocket(connectionId: string): WebSocket.WebSocket | undefined {
    return this.sockets.get(connectionId);
  }
}
