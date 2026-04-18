import { Injectable } from '@nestjs/common';
import { SessionService } from '../session/session.service';

export interface EnhancedStats {
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

@Injectable()
export class StatsService {
  constructor(private readonly sessionService: SessionService) {}

  computePercentile(samples: number[], p: number): number | null {
    if (samples.length === 0) return null;
    const sorted = [...samples].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  getEnhancedStats(connectionId: string): EnhancedStats | null {
    const session = this.sessionService.get(connectionId);
    if (!session) return null;

    const { stats } = session;
    const samples = stats.latencySamples;

    return {
      messagesSent: stats.messagesSent,
      messagesReceived: stats.messagesReceived,
      bytesSent: stats.bytesSent,
      bytesReceived: stats.bytesReceived,
      latencyLast: stats.latencyLast,
      latencyAvg: stats.latencyAvg,
      latencyP95: this.computePercentile(samples, 95),
      latencyP99: this.computePercentile(samples, 99),
      latencyMin: samples.length ? Math.min(...samples) : null,
      latencyMax: samples.length ? Math.max(...samples) : null,
      errorCount: stats.errorCount,
      reconnectionCount: stats.reconnectionCount,
      connectedAt: stats.connectedAt,
      connectionDurationMs: stats.connectedAt
        ? Date.now() - new Date(stats.connectedAt).getTime()
        : null,
    };
  }

  getGlobalStats(): GlobalStats {
    const sessions = this.sessionService.getAll();
    const active = sessions.filter((s) => s.status === 'connected');

    const byProtocol: Record<string, number> = {};
    for (const s of active) {
      byProtocol[s.type] = (byProtocol[s.type] ?? 0) + 1;
    }

    return {
      totalConnections: sessions.length,
      activeConnections: active.length,
      totalMessagesSent: sessions.reduce((a, s) => a + s.stats.messagesSent, 0),
      totalMessagesReceived: sessions.reduce((a, s) => a + s.stats.messagesReceived, 0),
      totalBytesSent: sessions.reduce((a, s) => a + s.stats.bytesSent, 0),
      totalBytesReceived: sessions.reduce((a, s) => a + s.stats.bytesReceived, 0),
      connectionsByProtocol: byProtocol,
    };
  }
}
