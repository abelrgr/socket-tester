export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'reconnecting';

export type Protocol = 'websocket' | 'socketio' | 'mqtt' | 'amqp';

export type MessageDirection = 'sent' | 'received' | 'system';
export type MessageType = 'text' | 'json' | 'binary';

export interface Message {
  id: string;
  connectionId: string;
  payload: string;
  direction: MessageDirection;
  type: MessageType;
  timestamp: string;
  size: number;
  latency?: number | null;
  /** Protocol-specific extras */
  eventName?: string;   // Socket.io
  topic?: string;       // MQTT
  qos?: 0 | 1 | 2;     // MQTT
  retain?: boolean;     // MQTT
  exchange?: string;    // AMQP
  routingKey?: string;  // AMQP
  deliveryTag?: string; // AMQP
}

// ---- Auth types ----
export type AuthType = 'none' | 'bearer' | 'apikey' | 'basic' | 'custom';

export interface AuthConfig {
  type: AuthType;
  token?: string;          // bearer
  apiKeyName?: string;     // apikey header name
  apiKeyValue?: string;    // apikey header value
  username?: string;       // basic / mqtt / amqp
  password?: string;       // basic / mqtt / amqp
  customHeaders?: { key: string; value: string }[];
  socketioAuth?: string;   // JSON string for socket.io auth
}

// ---- Per-protocol connection config ----
export interface WebSocketConfig {
  url: string;
  headers?: { key: string; value: string }[];
  protocols?: string;   // comma-separated sub-protocols
  auth?: AuthConfig;
}

export interface SocketIoConfig {
  url: string;
  namespace?: string;
  path?: string;
  auth?: AuthConfig;
  query?: { key: string; value: string }[];
  transports?: ('websocket' | 'polling')[];
  autoReconnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export interface MqttConfig {
  brokerUrl: string;
  clientId?: string;
  username?: string;
  password?: string;
  keepalive?: number;
  connectTimeout?: number;
  clean?: boolean;
  topics?: { topic: string; qos: 0 | 1 | 2 }[];
}

export interface AmqpConfig {
  url: string;
  vhost?: string;
  username?: string;
  password?: string;
  heartbeat?: number;
}

export type ProtocolConfig = WebSocketConfig | SocketIoConfig | MqttConfig | AmqpConfig;

export interface ConnectionConfig {
  id: string;
  name: string;
  protocol: Protocol;
  config: ProtocolConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveConnection {
  connectionId: string;
  url: string;
  protocol: Protocol;
  status: ConnectionStatus;
  connectedAt?: string;
  /** MQTT subscribed topics */
  mqttTopics?: string[];
  /** Socket.io subscribed events */
  socketioEvents?: string[];
}

// ---- Message templates ----
export interface MessageTemplate {
  id: string;
  name: string;
  payload: string;
  type: MessageType;
  eventName?: string;
  topic?: string;
  createdAt: string;
}

