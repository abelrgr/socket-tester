import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { EventsGateway } from '../events/events.gateway';
import { SessionService } from '../session/session.service';
import { CreateAmqpConnectionDto } from './dto/create-amqp-connection.dto';
import {
  AmqpSetupDto,
  AmqpConsumeDto,
  AmqpAckDto,
  SendAmqpMessageDto,
} from './dto/amqp-operations.dto';

interface AmqpState {
  connection: amqplib.ChannelModel;
  channel: amqplib.Channel;
  deliveryTags: Map<string, number>;
  consumerTags: string[];
}

@Injectable()
export class AmqpProxyService {
  private readonly logger = new Logger(AmqpProxyService.name);
  private readonly states = new Map<string, AmqpState>();

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly sessionService: SessionService,
  ) {}

  async createConnection(dto: CreateAmqpConnectionDto): Promise<{ connectionId: string }> {
    const connectionId = uuidv4();
    const session = this.sessionService.create(connectionId, dto.url, 'amqp');

    // Build connection URL with vhost/credentials if supplied but not in URL
    let connectUrl = dto.url;
    try {
      const parsed = new URL(dto.url);
      if (dto.username && !parsed.username) parsed.username = encodeURIComponent(dto.username);
      if (dto.password && !parsed.password) parsed.password = encodeURIComponent(dto.password);
      if (dto.vhost && parsed.pathname === '/') parsed.pathname = `/${encodeURIComponent(dto.vhost)}`;
      connectUrl = parsed.toString();
    } catch {
      throw new BadRequestException('Invalid AMQP URL');
    }

    try {
      const socketOptions: Record<string, unknown> = {
        heartbeat: dto.heartbeat ?? 60,
      };
      if (dto.tls) {
        if (dto.tls.ca) socketOptions['ca'] = [Buffer.from(dto.tls.ca)];
        if (dto.tls.cert) socketOptions['cert'] = Buffer.from(dto.tls.cert);
        if (dto.tls.key) socketOptions['key'] = Buffer.from(dto.tls.key);
        socketOptions['rejectUnauthorized'] = dto.tls.rejectUnauthorized ?? true;
      }

      // connect URL contains credentials — never log it
      const conn = await amqplib.connect(connectUrl, socketOptions);
      const chan = await conn.createChannel();

      const state: AmqpState = {
        connection: conn,
        channel: chan,
        deliveryTags: new Map(),
        consumerTags: [],
      };
      this.states.set(connectionId, state);

      session.close = async () => {
        try {
          for (const tag of state.consumerTags) {
            await chan.cancel(tag).catch(() => {/* ignore */});
          }
          await chan.close().catch(() => {/* ignore */});
          await conn.close().catch(() => {/* ignore */});
        } catch {/* ignore */}
        this.states.delete(connectionId);
      };

      conn.on('close', () => {
        this.sessionService.updateStatus(connectionId, 'disconnected');
        this.eventsGateway.emitToConnection(connectionId, 'connection:close', {
          connectionId,
          timestamp: new Date().toISOString(),
        });
      });

      conn.on('error', () => {
        this.sessionService.updateStatus(connectionId, 'error');
        this.sessionService.recordError(connectionId);
        this.eventsGateway.emitToConnection(connectionId, 'connection:error', {
          connectionId,
          message: 'AMQP connection error',
          timestamp: new Date().toISOString(),
        });
        this.logger.warn(`AMQP error on ${connectionId}`);
      });

      this.sessionService.updateStatus(connectionId, 'connected');
      this.eventsGateway.emitToConnection(connectionId, 'connection:open', {
        connectionId,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`AMQP connected: ${connectionId}`);
    } catch (err: unknown) {
      this.sessionService.updateStatus(connectionId, 'error');
      throw new InternalServerErrorException('Failed to connect to AMQP broker');
    }

    return { connectionId };
  }

  async setup(id: string, dto: AmqpSetupDto): Promise<{ ok: boolean }> {
    const state = this.states.get(id);
    if (!state) throw new NotFoundException(`Connection ${id} not found`);
    const { channel } = state;

    if (dto.exchangeName) {
      await channel.assertExchange(dto.exchangeName, dto.exchangeType ?? 'direct', {
        durable: dto.durable ?? true,
        autoDelete: dto.autoDelete ?? false,
      });
    }

    if (dto.queueName) {
      await channel.assertQueue(dto.queueName, {
        durable: dto.durable ?? true,
        autoDelete: dto.autoDelete ?? false,
      });

      if (dto.bindQueue && dto.exchangeName) {
        await channel.bindQueue(
          dto.queueName,
          dto.exchangeName,
          dto.routingKey ?? '',
        );
      }
    }

    this.eventsGateway.emitToConnection(id, 'amqp:setup', {
      connectionId: id,
      ...dto,
      timestamp: new Date().toISOString(),
    });

    return { ok: true };
  }

  async consume(id: string, dto: AmqpConsumeDto): Promise<{ consuming: boolean }> {
    const state = this.states.get(id);
    if (!state) throw new NotFoundException(`Connection ${id} not found`);

    const { channel } = state;
    const result = await channel.consume(
      dto.queue,
      (msg) => {
        if (!msg) return;
        const payload = msg.content.toString('utf8');
        const size = msg.content.byteLength;
        const tag = `${msg.fields.deliveryTag}`;
        state.deliveryTags.set(tag, msg.fields.deliveryTag);
        this.sessionService.recordMessageReceived(id, size);
        this.eventsGateway.emitToConnection(id, 'connection:message', {
          connectionId: id,
          payload,
          direction: 'received',
          type: 'text',
          size,
          deliveryTag: tag,
          queue: dto.queue,
          routingKey: msg.fields.routingKey,
          timestamp: new Date().toISOString(),
        });
      },
      { noAck: dto.noAck ?? false },
    );

    state.consumerTags.push(result.consumerTag);
    return { consuming: true };
  }

  ack(id: string, dto: AmqpAckDto): void {
    const state = this.states.get(id);
    if (!state) throw new NotFoundException(`Connection ${id} not found`);

    const tag = state.deliveryTags.get(dto.deliveryTag);
    if (tag === undefined) throw new BadRequestException(`Unknown delivery tag ${dto.deliveryTag}`);

    if (dto.nack) {
      state.channel.nack({ fields: { deliveryTag: tag } } as amqplib.Message, dto.multiple ?? false, false);
    } else {
      state.channel.ack({ fields: { deliveryTag: tag } } as amqplib.Message, dto.multiple ?? false);
    }

    state.deliveryTags.delete(dto.deliveryTag);
  }

  publish(id: string, dto: SendAmqpMessageDto): void {
    const state = this.states.get(id);
    if (!state) throw new NotFoundException(`Connection ${id} not found`);

    const { channel } = state;
    const content = Buffer.from(dto.payload, 'utf8');
    const size = content.byteLength;

    channel.publish(
      dto.exchange ?? '',
      dto.routingKey ?? '',
      content,
    );

    this.sessionService.recordMessageSent(id, size);
    this.eventsGateway.emitToConnection(id, 'connection:message', {
      connectionId: id,
      payload: dto.payload,
      direction: 'sent',
      type: 'text',
      size,
      exchange: dto.exchange ?? '',
      routingKey: dto.routingKey ?? '',
      timestamp: new Date().toISOString(),
    });
  }

  async closeConnection(id: string): Promise<void> {
    const session = this.sessionService.get(id);
    if (!session) throw new NotFoundException(`Connection ${id} not found`);
    if (session.close) await (session.close as () => Promise<void>)();
    this.sessionService.updateStatus(id, 'disconnected');
  }
}
