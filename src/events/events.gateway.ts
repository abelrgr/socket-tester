import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SessionService } from '../session/session.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  },
  path: '/socket.io',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly sessionService: SessionService) {}

  afterInit(): void {
    this.logger.log('Socket.io control gateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-connection')
  handleJoinConnection(
    @MessageBody() connectionId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    void client.join(`conn:${connectionId}`);
    this.logger.debug(`Client ${client.id} joined room conn:${connectionId}`);

    // Replay terminal state if the event already fired before the room was joined
    // (race condition: localhost connections resolve before React re-renders).
    const session = this.sessionService.get(connectionId);
    if (session?.status === 'connected') {
      client.emit('connection:open', {
        connectionId,
        timestamp: session.stats.connectedAt ?? new Date().toISOString(),
      });
      // Replay any messages that arrived before the room was joined (e.g. welcome event)
      if (session.bufferedMessages?.length) {
        for (const { event, data } of session.bufferedMessages) {
          client.emit(event, data);
        }
        // Clear buffer after first replay to avoid sending duplicates on reconnect
        session.bufferedMessages = [];
      }
      // Also replay any MQTT topic subscriptions that completed before the room was joined
      if (session.meta?.mqttTopics?.length) {
        for (const topic of session.meta.mqttTopics) {
          client.emit('mqtt:subscribed', {
            connectionId,
            topic,
            qos: 0,
            timestamp: session.stats.connectedAt ?? new Date().toISOString(),
          });
        }
      }
    } else if (session?.status === 'error') {
      client.emit('connection:error', {
        connectionId,
        message: session.lastError ?? 'Connection failed',
        timestamp: new Date().toISOString(),
      });
    } else if (session?.status === 'disconnected') {
      client.emit('connection:close', {
        connectionId,
        reason: 'transport close',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('leave-connection')
  handleLeaveConnection(
    @MessageBody() connectionId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    void client.leave(`conn:${connectionId}`);
  }

  emitToConnection(connectionId: string, event: string, data: unknown): void {
    this.server.to(`conn:${connectionId}`).emit(event, data);
  }
}
