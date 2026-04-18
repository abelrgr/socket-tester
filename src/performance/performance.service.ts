import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EventsGateway } from '../events/events.gateway';
import { SessionService } from '../session/session.service';
import { WebSocketService } from '../websocket/websocket.service';

export interface LatencyTestConfig {
  /** 1–1000 */
  count: number;
  /** ms between pings */
  intervalMs: number;
}

export interface ThroughputTestConfig {
  /** messages per second, 1–1000 */
  messagesPerSecond: number;
  /** seconds, 1–60 */
  durationSeconds: number;
  /** payload byte size, 1–65536 */
  payloadSize: number;
}

export interface TestResult {
  testId: string;
  connectionId: string;
  type: 'latency' | 'throughput';
  startedAt: string;
  completedAt: string | null;
  aborted: boolean;
  // latency
  latencies?: number[];
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  p95?: number;
  p99?: number;
  // throughput
  messagesSent?: number;
  actualRate?: number;
  errorCount?: number;
}

interface ActiveTest {
  testId: string;
  abortRequested: boolean;
}

@Injectable()
export class PerformanceTestService {
  private readonly logger = new Logger(PerformanceTestService.name);
  private readonly activeTests = new Map<string, ActiveTest>();
  private readonly results = new Map<string, TestResult>();

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly sessionService: SessionService,
    private readonly wsService: WebSocketService,
  ) {}

  async startLatencyTest(
    connectionId: string,
    config: LatencyTestConfig,
  ): Promise<{ testId: string }> {
    const session = this.sessionService.get(connectionId);
    if (!session) throw new NotFoundException('Connection not found');
    if (session.type !== 'websocket')
      throw new BadRequestException('Latency test only supports WebSocket connections');
    if (this.activeTests.has(connectionId))
      throw new BadRequestException('A test is already running for this connection');

    const testId = uuidv4();
    const activeTest: ActiveTest = { testId, abortRequested: false };
    this.activeTests.set(connectionId, activeTest);

    const result: TestResult = {
      testId,
      connectionId,
      type: 'latency',
      startedAt: new Date().toISOString(),
      completedAt: null,
      aborted: false,
      latencies: [],
    };
    this.results.set(testId, result);

    void this.runLatencyTest(connectionId, config, activeTest, result);
    return { testId };
  }

  private async runLatencyTest(
    connectionId: string,
    config: LatencyTestConfig,
    activeTest: ActiveTest,
    result: TestResult,
  ): Promise<void> {
    const total = Math.min(Math.max(config.count, 1), 1000);
    const interval = Math.max(10, config.intervalMs ?? 100);

    for (let i = 0; i < total; i++) {
      if (activeTest.abortRequested) {
        result.aborted = true;
        break;
      }
      try {
        const latency = await this.wsService.pingAsync(connectionId);
        result.latencies!.push(latency);
        this.eventsGateway.emitToConnection(connectionId, 'perf:progress', {
          testId: activeTest.testId,
          completed: i + 1,
          total,
          latencyMs: latency,
        });
      } catch {
        result.aborted = true;
        break;
      }
      if (i < total - 1) {
        await new Promise<void>((r) => setTimeout(r, interval));
      }
    }

    const lats = result.latencies ?? [];
    if (lats.length > 0) {
      const sorted = [...lats].sort((a, b) => a - b);
      result.min = sorted[0];
      result.max = sorted[sorted.length - 1];
      result.avg = Math.round(lats.reduce((a, b) => a + b, 0) / lats.length);
      result.median = sorted[Math.floor(sorted.length / 2)];
      result.p95 = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? sorted[sorted.length - 1];
      result.p99 = sorted[Math.ceil(sorted.length * 0.99) - 1] ?? sorted[sorted.length - 1];
    }

    result.completedAt = new Date().toISOString();
    this.activeTests.delete(connectionId);
    this.eventsGateway.emitToConnection(connectionId, 'perf:complete', {
      testId: activeTest.testId,
      result,
    });
    this.logger.log(`Latency test ${activeTest.testId} finished on ${connectionId}`);
  }

  async startThroughputTest(
    connectionId: string,
    config: ThroughputTestConfig,
  ): Promise<{ testId: string }> {
    const session = this.sessionService.get(connectionId);
    if (!session) throw new NotFoundException('Connection not found');
    if (session.type !== 'websocket')
      throw new BadRequestException('Throughput test only supports WebSocket connections');
    if (this.activeTests.has(connectionId))
      throw new BadRequestException('A test is already running for this connection');

    const testId = uuidv4();
    const activeTest: ActiveTest = { testId, abortRequested: false };
    this.activeTests.set(connectionId, activeTest);

    const result: TestResult = {
      testId,
      connectionId,
      type: 'throughput',
      startedAt: new Date().toISOString(),
      completedAt: null,
      aborted: false,
      messagesSent: 0,
      errorCount: 0,
    };
    this.results.set(testId, result);

    void this.runThroughputTest(connectionId, config, activeTest, result);
    return { testId };
  }

  private async runThroughputTest(
    connectionId: string,
    config: ThroughputTestConfig,
    activeTest: ActiveTest,
    result: TestResult,
  ): Promise<void> {
    const msPerMessage = 1000 / Math.max(1, config.messagesPerSecond);
    const totalMs = Math.min(60, Math.max(1, config.durationSeconds)) * 1000;
    const payload = 'x'.repeat(Math.min(Math.max(config.payloadSize, 1), 65536));
    const startTime = Date.now();

    while (!activeTest.abortRequested && Date.now() - startTime < totalMs) {
      try {
        this.wsService.sendMessage(connectionId, { payload, type: 'text' });
        result.messagesSent!++;
        this.eventsGateway.emitToConnection(connectionId, 'perf:progress', {
          testId: activeTest.testId,
          messagesSent: result.messagesSent,
          elapsed: Date.now() - startTime,
          durationMs: totalMs,
        });
      } catch {
        result.errorCount!++;
      }
      await new Promise<void>((r) => setTimeout(r, msPerMessage));
    }

    if (activeTest.abortRequested) result.aborted = true;
    const elapsed = (Date.now() - startTime) / 1000;
    result.actualRate = result.messagesSent! / elapsed;
    result.completedAt = new Date().toISOString();
    this.activeTests.delete(connectionId);
    this.eventsGateway.emitToConnection(connectionId, 'perf:complete', {
      testId: activeTest.testId,
      result,
    });
    this.logger.log(`Throughput test ${activeTest.testId} finished on ${connectionId}`);
  }

  abortTest(connectionId: string): boolean {
    const active = this.activeTests.get(connectionId);
    if (!active) return false;
    active.abortRequested = true;
    return true;
  }

  getResults(testId: string): TestResult | null {
    return this.results.get(testId) ?? null;
  }

  getActiveTest(connectionId: string): { testId: string } | null {
    const t = this.activeTests.get(connectionId);
    return t ? { testId: t.testId } : null;
  }
}
