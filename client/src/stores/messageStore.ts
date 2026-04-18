import { create } from 'zustand';
import { Message, MessageDirection, MessageType } from '../types';
import { v4 as uuidv4 } from '../utils/uuid';

const MAX_MESSAGES = 1000;

export interface MessageFilter {
  search: string;
  direction: 'all' | 'sent' | 'received' | 'system';
  type: 'all' | MessageType | 'system';
}

interface MessageState {
  messages: Message[];
  filter: MessageFilter;
  addMessage: (
    connectionId: string,
    payload: string,
    direction: MessageDirection,
    type: MessageType,
    size?: number,
    latency?: number | null,
    extras?: Partial<Pick<Message, 'eventName' | 'topic' | 'qos' | 'retain' | 'exchange' | 'routingKey' | 'deliveryTag'>>,
  ) => void;
  clearMessages: (connectionId?: string | null) => void;
  setFilter: (filter: Partial<MessageFilter>) => void;
  getFiltered: (connectionId?: string | null) => Message[];
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  filter: { search: '', direction: 'all', type: 'all' },

  addMessage: (connectionId, payload, direction, type, size = 0, latency = null, extras = {}) => {
    const msg: Message = {
      id: uuidv4(),
      connectionId,
      payload,
      direction,
      type,
      timestamp: new Date().toISOString(),
      size,
      latency,
      ...extras,
    };
    set((state) => ({
      messages:
        state.messages.length >= MAX_MESSAGES
          ? [...state.messages.slice(1), msg]
          : [...state.messages, msg],
    }));
  },

  clearMessages: (connectionId?: string | null) => set((state) => ({
    messages: connectionId
      ? state.messages.filter((m) => m.connectionId !== connectionId)
      : [],
  })),

  setFilter: (partial) =>
    set((state) => ({ filter: { ...state.filter, ...partial } })),

  getFiltered: (connectionId?: string | null) => {
    const { messages, filter } = get();
    // null means "no active connection on this tab" → empty feed
    if (connectionId === null) return [];
    return messages.filter((m) => {
      if (connectionId !== undefined && m.connectionId !== connectionId) return false;
      if (filter.direction !== 'all' && m.direction !== filter.direction) return false;
      if (filter.type !== 'all') {
        if (filter.type === 'system' && m.direction !== 'system') return false;
        if (filter.type !== 'system' && m.type !== filter.type) return false;
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        return m.payload.toLowerCase().includes(q) ||
          (m.eventName ?? '').toLowerCase().includes(q) ||
          (m.topic ?? '').toLowerCase().includes(q);
      }
      return true;
    });
  },
}));

