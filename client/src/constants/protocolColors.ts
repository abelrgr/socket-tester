import type { Protocol } from '../types';

export const PROTOCOL_COLORS: Record<Protocol, string> = {
  websocket: '#3b82f6',
  socketio: '#7c3aed',
  mqtt: '#f59e0b',
  amqp: '#10b981',
};

export const PROTOCOL_LABELS: Record<Protocol, string> = {
  websocket: 'WebSocket',
  socketio: 'Socket.IO',
  mqtt: 'MQTT',
  amqp: 'AMQP',
};
