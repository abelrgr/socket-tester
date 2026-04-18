import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL as string | undefined;

const api = axios.create({
  baseURL: import.meta.env.DEV ? (BACKEND_URL ?? 'http://localhost:5000') : '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- WebSocket proxy connections ----

export interface CreateWebSocketConnectionDto {
  url: string;
  headers?: Record<string, string>;
  protocols?: string[];
}

export const createWebSocketConnection = (dto: CreateWebSocketConnectionDto) =>
  api.post<{ connectionId: string }>('/api/connections/websocket', dto);

export interface SendMessageDto {
  payload: string;
  type?: 'text' | 'json' | 'binary';
}

export const sendMessage = (connectionId: string, dto: SendMessageDto) =>
  api.post<{ sent: boolean }>(`/api/connections/${connectionId}/send`, dto);

export const sendPing = (connectionId: string) =>
  api.post<{ ping: boolean }>(`/api/connections/${connectionId}/ping`);

export const closeConnection = (connectionId: string) =>
  api.delete(`/api/connections/${connectionId}`);

export const listConnections = () => api.get('/api/connections');

export const getConnectionStats = (connectionId: string) =>
  api.get(`/api/connections/${connectionId}/stats`);

export const checkHealth = () =>
  api.get<{ status: string; timestamp: string; uptime: number }>('/health');

// ---- Socket.io proxy connections ----

export interface CreateSocketIoConnectionDto {
  url: string;
  namespace?: string;
  path?: string;
  auth?: Record<string, unknown>;
  query?: Record<string, string>;
  transports?: ('websocket' | 'polling')[];
  autoReconnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export const createSocketIoConnection = (dto: CreateSocketIoConnectionDto) =>
  api.post<{ connectionId: string }>('/api/connections/socketio', dto);

export const subscribeSocketIoEvent = (connectionId: string, eventName: string) =>
  api.post(`/api/connections/socketio/${connectionId}/subscribe`, { eventName });

export interface SendSocketIoDto {
  eventName: string;
  payload: unknown;
  ack?: boolean;
}

export const sendSocketIoMessage = (connectionId: string, dto: SendSocketIoDto) =>
  api.post(`/api/connections/socketio/${connectionId}/send`, dto);

// ---- MQTT proxy connections ----

export interface CreateMqttConnectionDto {
  brokerUrl: string;
  clientId?: string;
  username?: string;
  password?: string;
  keepalive?: number;
  connectTimeout?: number;
  clean?: boolean;
  /** Topics to subscribe immediately after connecting, e.g. ['#'] */
  initialTopics?: string[];
}

export const createMqttConnection = (dto: CreateMqttConnectionDto) =>
  api.post<{ connectionId: string }>('/api/connections/mqtt', dto);

export const mqttSubscribe = (connectionId: string, topic: string, qos: 0 | 1 | 2 = 0) =>
  api.post(`/api/connections/mqtt/${connectionId}/subscribe`, { topic, qos });

export const mqttUnsubscribe = (connectionId: string, topic: string) =>
  api.delete(`/api/connections/mqtt/${connectionId}/subscribe`, { data: { topic } });

export interface MqttPublishDto {
  topic: string;
  payload: string;
  qos?: 0 | 1 | 2;
  retain?: boolean;
}

export const mqttPublish = (connectionId: string, dto: MqttPublishDto) =>
  api.post(`/api/connections/mqtt/${connectionId}/publish`, dto);

// ---- AMQP proxy connections ----

export interface CreateAmqpConnectionDto {
  url: string;
  vhost?: string;
  username?: string;
  password?: string;
  heartbeat?: number;
}

export const createAmqpConnection = (dto: CreateAmqpConnectionDto) =>
  api.post<{ connectionId: string }>('/api/connections/amqp', dto);

export interface AmqpSetupDto {
  queueName?: string;
  exchangeName?: string;
  exchangeType?: 'direct' | 'fanout' | 'topic' | 'headers';
  routingKey?: string;
  bindQueue?: boolean;
  durable?: boolean;
  autoDelete?: boolean;
}

export const amqpSetup = (connectionId: string, dto: AmqpSetupDto) =>
  api.post(`/api/connections/amqp/${connectionId}/setup`, dto);

export const amqpConsume = (connectionId: string, queue: string, noAck = false) =>
  api.post(`/api/connections/amqp/${connectionId}/consume`, { queue, noAck });

export const amqpAck = (connectionId: string, deliveryTag: string, nack = false) =>
  api.post(`/api/connections/amqp/${connectionId}/ack`, { deliveryTag, nack });

export interface AmqpPublishDto {
  exchange?: string;
  routingKey?: string;
  payload: string;
}

export const amqpPublish = (connectionId: string, dto: AmqpPublishDto) =>
  api.post(`/api/connections/amqp/${connectionId}/publish`, dto);

// ---- Share / Config sharing ----

export const shareConfig = (config: Record<string, unknown>) =>
  api.post<{ token: string; expiresAt: string; shareUrl: string }>('/api/share/config', {
    config,
  });

export const getSharedConfig = (token: string) =>
  api.get<Record<string, unknown>>(`/api/share/${token}`);

export default api;

