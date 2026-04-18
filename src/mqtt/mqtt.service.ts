import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as mqtt from 'mqtt';
import { v4 as uuidv4 } from 'uuid';
import { EventsGateway } from '../events/events.gateway';
import { SessionService } from '../session/session.service';
import { CreateMqttConnectionDto } from './dto/create-mqtt-connection.dto';
import { MqttSubscribeDto, MqttUnsubscribeDto } from './dto/mqtt-subscribe.dto';
import { SendMqttMessageDto } from './dto/send-mqtt-message.dto';

@Injectable()
export class MqttProxyService {
  private readonly logger = new Logger(MqttProxyService.name);
  private readonly clients = new Map<string, mqtt.MqttClient>();
  private readonly subscribedTopics = new Map<string, Set<string>>();

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly sessionService: SessionService,
  ) {}

  createConnection(dto: CreateMqttConnectionDto): { connectionId: string } {
    const connectionId = uuidv4();
    const session = this.sessionService.create(connectionId, dto.brokerUrl, 'mqtt');

    const clientOptions: mqtt.IClientOptions = {
      clientId: dto.clientId ?? `socket-tester-${uuidv4().slice(0, 8)}`,
      keepalive: dto.keepalive ?? 60,
      connectTimeout: dto.connectTimeout ?? 30_000,
      clean: dto.clean ?? true,
      reconnectPeriod: 0, // manual reconnect control
    };

    // Credentials are never logged
    if (dto.username) clientOptions.username = dto.username;
    if (dto.password) clientOptions.password = dto.password;

    if (dto.will) {
      clientOptions.will = {
        topic: dto.will.topic,
        payload: dto.will.payload,
        qos: dto.will.qos,
        retain: dto.will.retain,
      };
    }

    if (dto.tls) {
      clientOptions.ca = dto.tls.ca;
      clientOptions.cert = dto.tls.cert;
      clientOptions.key = dto.tls.key;
      clientOptions.rejectUnauthorized = dto.tls.rejectUnauthorized ?? true;
    }

    const client = mqtt.connect(dto.brokerUrl, clientOptions);
    this.clients.set(connectionId, client);
    this.subscribedTopics.set(connectionId, new Set());

    session.close = () => {
      client.end(true);
      this.clients.delete(connectionId);
      this.subscribedTopics.delete(connectionId);
    };

    client.on('connect', () => {
      this.sessionService.updateStatus(connectionId, 'connected');
      this.eventsGateway.emitToConnection(connectionId, 'connection:open', {
        connectionId,
        transport: 'mqtt',
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`MQTT connected: ${connectionId} → ${dto.brokerUrl}`);

      // Subscribe to initial topics (e.g. '#') so the proxy receives broker messages
      if (dto.initialTopics?.length) {
        dto.initialTopics.forEach((topic) => {
          this.subscribe(connectionId, { topic, qos: 0 });
        });
      }
    });

    client.on('message', (topic: string, message: Buffer) => {
      const payload = message.toString('utf8');
      const size = message.byteLength;
      this.sessionService.recordMessageReceived(connectionId, size);
      this.eventsGateway.emitToConnection(connectionId, 'connection:message', {
        connectionId,
        topic,
        payload,
        direction: 'received',
        type: 'text',
        size,
        timestamp: new Date().toISOString(),
      });
    });

    client.on('error', (err: Error) => {
      // Never log full error object as it might contain credential info in message
      this.sessionService.updateStatus(connectionId, 'error', 'MQTT connection error');
      this.sessionService.recordError(connectionId);
      this.eventsGateway.emitToConnection(connectionId, 'connection:error', {
        connectionId,
        message: 'MQTT connection error',
        timestamp: new Date().toISOString(),
      });
      this.logger.warn(`MQTT error on ${connectionId}`);
    });

    client.on('close', () => {
      // If the session is already in error state (error event fired before close),
      // do not overwrite it — the gateway replay depends on the error status.
      const session = this.sessionService.get(connectionId);
      if (session?.status === 'error') return;
      this.sessionService.updateStatus(connectionId, 'disconnected');
      this.eventsGateway.emitToConnection(connectionId, 'connection:close', {
        connectionId,
        timestamp: new Date().toISOString(),
      });
    });

    return { connectionId };
  }

  subscribe(id: string, dto: MqttSubscribeDto): void {
    const client = this.clients.get(id);
    if (!client) throw new NotFoundException(`Connection ${id} not found`);

    const qos = dto.qos ?? 0;
    client.subscribe(dto.topic, { qos }, (err) => {
      if (err) {
        this.logger.warn(`MQTT subscribe error on ${id}: ${err.message}`);
        return;
      }
      const topics = this.subscribedTopics.get(id)!;
      topics.add(dto.topic);
      this.sessionService.addMqttTopic(id, dto.topic);
      this.eventsGateway.emitToConnection(id, 'mqtt:subscribed', {
        connectionId: id,
        topic: dto.topic,
        qos,
        timestamp: new Date().toISOString(),
      });
    });
  }

  unsubscribe(id: string, dto: MqttUnsubscribeDto): void {
    const client = this.clients.get(id);
    if (!client) throw new NotFoundException(`Connection ${id} not found`);

    client.unsubscribe(dto.topic, undefined, (err) => {
      if (!err) {
        this.subscribedTopics.get(id)?.delete(dto.topic);
        this.sessionService.removeMqttTopic(id, dto.topic);
        this.eventsGateway.emitToConnection(id, 'mqtt:unsubscribed', {
          connectionId: id,
          topic: dto.topic,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  publish(id: string, dto: SendMqttMessageDto): void {
    const client = this.clients.get(id);
    if (!client) throw new NotFoundException(`Connection ${id} not found`);
    if (!client.connected) throw new BadRequestException('MQTT client is not connected');

    const size = Buffer.byteLength(dto.payload, 'utf8');
    client.publish(dto.topic, dto.payload, { qos: dto.qos ?? 0, retain: dto.retain ?? false });
    this.sessionService.recordMessageSent(id, size);

    this.eventsGateway.emitToConnection(id, 'connection:message', {
      connectionId: id,
      topic: dto.topic,
      payload: dto.payload,
      direction: 'sent',
      type: 'text',
      size,
      qos: dto.qos ?? 0,
      retain: dto.retain ?? false,
      timestamp: new Date().toISOString(),
    });
  }

  closeConnection(id: string): void {
    const session = this.sessionService.get(id);
    if (!session) throw new NotFoundException(`Connection ${id} not found`);
    if (session.close) session.close();
    this.sessionService.updateStatus(id, 'disconnected');
  }
}
