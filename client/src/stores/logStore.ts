import { create } from 'zustand';

export interface LogEntry {
  id: string;
  timestamp: string;
  connectionId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  event: string;
  direction?: 'in' | 'out';
  payload?: string;
  payloadSize?: number;
  latency?: number;
  metadata?: Record<string, unknown>;
}

const MAX_ENTRIES = 5000;
let counter = 0;

interface LogState {
  entries: LogEntry[];
  filter: {
    level: 'all' | 'info' | 'warn' | 'error' | 'debug';
    search: string;
  };
  addEntry: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  setFilter: (f: Partial<LogState['filter']>) => void;
  clearForConnection: (connectionId: string) => void;
  clearAll: () => void;
  getFiltered: (connectionId: string) => LogEntry[];
}

export const useLogStore = create<LogState>((set, get) => ({
  entries: [],
  filter: { level: 'all', search: '' },

  addEntry: (entry) => {
    const logEntry: LogEntry = {
      ...entry,
      id: `${Date.now()}-${++counter}`,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      entries:
        state.entries.length >= MAX_ENTRIES
          ? [...state.entries.slice(1), logEntry]
          : [...state.entries, logEntry],
    }));
  },

  setFilter: (f) =>
    set((state) => ({ filter: { ...state.filter, ...f } })),

  clearForConnection: (connectionId) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.connectionId !== connectionId),
    })),

  clearAll: () => set({ entries: [] }),

  getFiltered: (connectionId) => {
    const { entries, filter } = get();
    return entries.filter((e) => {
      if (e.connectionId !== connectionId) return false;
      if (filter.level !== 'all' && e.level !== filter.level) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        return (
          e.event.toLowerCase().includes(q) ||
          (e.payload ?? '').toLowerCase().includes(q) ||
          e.level.includes(q)
        );
      }
      return true;
    });
  },
}));
