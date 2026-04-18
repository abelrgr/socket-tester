import { Injectable } from '@nestjs/common';

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

const MAX_PER_CONNECTION = 5000;

@Injectable()
export class LogService {
  private readonly logs = new Map<string, LogEntry[]>();
  private counter = 0;

  log(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const { connectionId } = entry;
    if (!this.logs.has(connectionId)) {
      this.logs.set(connectionId, []);
    }
    const entries = this.logs.get(connectionId)!;
    entries.push({
      ...entry,
      id: `${Date.now()}-${++this.counter}`,
      timestamp: new Date().toISOString(),
    });
    if (entries.length > MAX_PER_CONNECTION) {
      entries.splice(0, entries.length - MAX_PER_CONNECTION);
    }
  }

  getByConnection(connectionId: string, level?: string): LogEntry[] {
    const entries = this.logs.get(connectionId) ?? [];
    if (level) return entries.filter((e) => e.level === level);
    return [...entries];
  }

  exportNdjson(connectionId: string): string {
    const entries = this.logs.get(connectionId) ?? [];
    return entries.map((e) => JSON.stringify(e)).join('\n');
  }

  clearByConnection(connectionId: string): void {
    this.logs.set(connectionId, []);
  }

  deleteByConnection(connectionId: string): void {
    this.logs.delete(connectionId);
  }
}
