import { create } from 'zustand';

// 1-second buckets for messages-over-time chart
export interface MsgBucket {
  time: number;   // Unix second (floor(Date.now()/1000))
  sent: number;
  received: number;
}

// Raw latency measurement for latency-over-time chart
export interface LatencyPoint {
  time: number;   // Unix ms timestamp
  latency: number;
}

// Per-minute error counters for error-rate chart
export interface ErrorBucket {
  time: number;   // Unix minute
  errors: number;
}

// Raw message sizes for histogram
export interface SizePoint {
  size: number;
}

export interface ConnectionTimeSeries {
  messages: MsgBucket[];    // last 60 `MsgBucket`s
  latency: LatencyPoint[];  // last 100 measurements
  errors: ErrorBucket[];    // last 60 1-minute buckets
  sizes: SizePoint[];       // last 1000 message sizes
}

// Stats polled from `GET /api/stats/:id`
export interface BackendStats {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  latencyLast: number | null;
  latencyAvg: number | null;
  latencyP95: number | null;
  latencyP99: number | null;
  latencyMin: number | null;
  latencyMax: number | null;
  errorCount: number;
  reconnectionCount: number;
  connectedAt: string | null;
  connectionDurationMs: number | null;
}

export interface GlobalStats {
  totalConnections: number;
  activeConnections: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalBytesSent: number;
  totalBytesReceived: number;
  connectionsByProtocol: Record<string, number>;
}

interface StatsState {
  timeSeries: Record<string, ConnectionTimeSeries>;
  backendStats: Record<string, BackendStats>;
  globalStats: GlobalStats | null;

  recordMessage: (
    connectionId: string,
    direction: 'sent' | 'received',
    size: number,
    latency?: number | null,
  ) => void;
  recordError: (connectionId: string) => void;
  setBackendStats: (connectionId: string, stats: BackendStats) => void;
  setGlobalStats: (stats: GlobalStats) => void;
  clearConnection: (connectionId: string) => void;
  getTimeSeries: (connectionId: string) => ConnectionTimeSeries;
}

function emptyTimeSeries(): ConnectionTimeSeries {
  return { messages: [], latency: [], errors: [], sizes: [] };
}

export const useStatsStore = create<StatsState>((set, get) => ({
  timeSeries: {},
  backendStats: {},
  globalStats: null,

  recordMessage: (connectionId, direction, size, latency) => {
    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);
    const cutoffSec = nowSec - 60;

    set((state) => {
      const ts = state.timeSeries[connectionId] ?? emptyTimeSeries();

      // ---- messages buckets (1s) ----
      let msgs = ts.messages.filter((b) => b.time > cutoffSec);
      const last = msgs[msgs.length - 1];
      if (last && last.time === nowSec) {
        msgs = [
          ...msgs.slice(0, -1),
          {
            ...last,
            sent: last.sent + (direction === 'sent' ? 1 : 0),
            received: last.received + (direction === 'received' ? 1 : 0),
          },
        ];
      } else {
        msgs = [
          ...msgs,
          {
            time: nowSec,
            sent: direction === 'sent' ? 1 : 0,
            received: direction === 'received' ? 1 : 0,
          },
        ];
      }

      // ---- latency ----
      let lat = ts.latency;
      if (latency != null) {
        lat = [...lat, { time: nowMs, latency }].slice(-100);
      }

      // ---- sizes ----
      const sizes = [...ts.sizes, { size }].slice(-1000);

      return {
        timeSeries: {
          ...state.timeSeries,
          [connectionId]: { ...ts, messages: msgs, latency: lat, sizes },
        },
      };
    });
  },

  recordError: (connectionId) => {
    const nowMin = Math.floor(Date.now() / 60000);
    const cutoffMin = nowMin - 60;

    set((state) => {
      const ts = state.timeSeries[connectionId] ?? emptyTimeSeries();
      let errs = ts.errors.filter((b) => b.time > cutoffMin);
      const last = errs[errs.length - 1];
      if (last && last.time === nowMin) {
        errs = [...errs.slice(0, -1), { ...last, errors: last.errors + 1 }];
      } else {
        errs = [...errs, { time: nowMin, errors: 1 }];
      }
      return {
        timeSeries: {
          ...state.timeSeries,
          [connectionId]: { ...ts, errors: errs },
        },
      };
    });
  },

  setBackendStats: (connectionId, stats) =>
    set((state) => ({
      backendStats: { ...state.backendStats, [connectionId]: stats },
    })),

  setGlobalStats: (stats) => set({ globalStats: stats }),

  clearConnection: (connectionId) =>
    set((state) => {
      const { [connectionId]: _ts, ...restTs } = state.timeSeries;
      const { [connectionId]: _bs, ...restBs } = state.backendStats;
      void _ts; void _bs;
      return { timeSeries: restTs, backendStats: restBs };
    }),

  getTimeSeries: (connectionId) =>
    get().timeSeries[connectionId] ?? emptyTimeSeries(),
}));
