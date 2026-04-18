import { Injectable, Logger } from '@nestjs/common';
import { ConnectionSession, ConnectionStatus, ConnectionType } from './session.types';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly sessions = new Map<string, ConnectionSession>();

  create(id: string, url: string, type: ConnectionType): ConnectionSession {
    const session: ConnectionSession = {
      id,
      url,
      type,
      status: 'connecting',
      createdAt: new Date().toISOString(),
      stats: {
        messagesSent: 0,
        messagesReceived: 0,
        bytesSent: 0,
        bytesReceived: 0,
        latencyLast: null,
        latencyAvg: null,
        errorCount: 0,
        reconnectionCount: 0,
        connectedAt: null,
        latencySamples: [],
      },
    };
    this.sessions.set(id, session);
    this.logger.log(`Session created: ${id} [${type}] → ${url}`);
    return session;
  }

  get(id: string): ConnectionSession | undefined {
    return this.sessions.get(id);
  }

  getAll(): ConnectionSession[] {
    return Array.from(this.sessions.values());
  }

  updateStatus(id: string, status: ConnectionStatus, errorMessage?: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      if (status === 'connected') {
        session.stats.connectedAt = new Date().toISOString();
        session.lastError = undefined;
      }
      if (status === 'error' && errorMessage) {
        session.lastError = errorMessage;
      }
    }
  }

  recordMessageSent(id: string, bytes: number): void {
    const session = this.sessions.get(id);
    if (session) {
      session.stats.messagesSent++;
      session.stats.bytesSent += bytes;
    }
  }

  recordMessageReceived(id: string, bytes: number, latencyMs?: number): void {
    const session = this.sessions.get(id);
    if (!session) return;

    session.stats.messagesReceived++;
    session.stats.bytesReceived += bytes;

    if (latencyMs !== undefined) {
      session.stats.latencyLast = latencyMs;
      session.stats.latencySamples.push(latencyMs);
      // Keep only last 100 samples
      if (session.stats.latencySamples.length > 100) {
        session.stats.latencySamples.shift();
      }
      const sum = session.stats.latencySamples.reduce((a, b) => a + b, 0);
      session.stats.latencyAvg = Math.round(sum / session.stats.latencySamples.length);
    }
  }

  recordError(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.stats.errorCount++;
    }
  }

  incrementReconnection(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.stats.reconnectionCount++;
    }
  }

  /** Buffer a connection:message for replay when the frontend room is later joined. */
  bufferMessage(id: string, event: string, data: unknown): void {
    const session = this.sessions.get(id);
    if (!session) return;
    if (!session.bufferedMessages) session.bufferedMessages = [];
    session.bufferedMessages.push({ event, data });
    // Keep at most 100 buffered messages to avoid unbounded memory growth
    if (session.bufferedMessages.length > 100) session.bufferedMessages.shift();
  }

  addMqttTopic(id: string, topic: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    if (!session.meta) session.meta = {};
    if (!session.meta.mqttTopics) session.meta.mqttTopics = [];
    if (!session.meta.mqttTopics.includes(topic)) {
      session.meta.mqttTopics.push(topic);
    }
  }

  removeMqttTopic(id: string, topic: string): void {
    const session = this.sessions.get(id);
    if (!session?.meta?.mqttTopics) return;
    session.meta.mqttTopics = session.meta.mqttTopics.filter((t) => t !== topic);
  }

  delete(id: string): void {
    this.sessions.delete(id);
    this.logger.log(`Session deleted: ${id}`);
  }
}
