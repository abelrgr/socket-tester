export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'reconnecting';

export type ConnectionType = 'websocket' | 'socketio' | 'mqtt' | 'amqp';

export interface ConnectionStats {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  latencyLast: number | null;
  latencyAvg: number | null;
  errorCount: number;
  reconnectionCount: number;
  connectedAt: string | null;
  latencySamples: number[];
}

export interface ConnectionSession {
  id: string;
  url: string;
  type: ConnectionType;
  status: ConnectionStatus;
  lastError?: string;
  createdAt: string;
  stats: ConnectionStats;
  /** Protocol-specific extra metadata */
  meta?: {
    mqttTopics?: string[];
    namespace?: string;
    transport?: string;
  };
  /** Close callback registered by the owning service */
  close?: (() => void) | (() => Promise<void>);
  /**
   * Ring-buffer of the first N `connection:message` events received before
   * any frontend client joined the room.  Replayed in handleJoinConnection.
   */
  bufferedMessages?: Array<{ event: string; data: unknown }>;
}
