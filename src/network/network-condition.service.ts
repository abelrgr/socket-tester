import { Injectable, Logger } from '@nestjs/common';

export interface NetworkCondition {
  connectionId: string;
  delayMs: number;
  jitterMs: number;
  /** 0–1 probability of dropping a message */
  packetLossRate: number;
  /** 0 = unlimited */
  maxBytesPerSec: number;
  /** 0 = disabled; force-close after this many ms */
  disconnectAfterMs: number;
  flapping: boolean;
  flappingIntervalMs: number;
  active: boolean;
}

@Injectable()
export class NetworkConditionService {
  private readonly conditions = new Map<string, NetworkCondition>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly logger = new Logger(NetworkConditionService.name);

  setCondition(
    connectionId: string,
    condition: Partial<Omit<NetworkCondition, 'connectionId'>>,
  ): NetworkCondition {
    const existing = this.conditions.get(connectionId) ?? this.defaultCondition(connectionId);
    const updated: NetworkCondition = { ...existing, ...condition, connectionId, active: true };
    this.conditions.set(connectionId, updated);
    return updated;
  }

  getCondition(connectionId: string): NetworkCondition | null {
    return this.conditions.get(connectionId) ?? null;
  }

  clearCondition(connectionId: string): void {
    this.conditions.delete(connectionId);
    const timer = this.timers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(connectionId);
    }
  }

  async applyDelay(connectionId: string): Promise<void> {
    const cond = this.conditions.get(connectionId);
    if (!cond?.active || cond.delayMs === 0) return;
    const jitter = cond.jitterMs > 0 ? (Math.random() * 2 - 1) * cond.jitterMs : 0;
    const delay = Math.max(0, cond.delayMs + jitter);
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
  }

  shouldDrop(connectionId: string): boolean {
    const cond = this.conditions.get(connectionId);
    if (!cond?.active || cond.packetLossRate === 0) return false;
    return Math.random() < cond.packetLossRate;
  }

  scheduleDisconnect(connectionId: string, closeCallback: () => void): void {
    const cond = this.conditions.get(connectionId);
    if (!cond?.active || cond.disconnectAfterMs === 0) return;
    const timer = setTimeout(() => {
      this.logger.log(`Network sim: forcing disconnect on ${connectionId}`);
      closeCallback();
    }, cond.disconnectAfterMs);
    this.timers.set(connectionId, timer);
  }

  private defaultCondition(connectionId: string): NetworkCondition {
    return {
      connectionId,
      delayMs: 0,
      jitterMs: 0,
      packetLossRate: 0,
      maxBytesPerSec: 0,
      disconnectAfterMs: 0,
      flapping: false,
      flappingIntervalMs: 5000,
      active: false,
    };
  }
}
