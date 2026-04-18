import { useState, useCallback, useEffect } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useNotificationStore } from '../../stores/notificationStore';
import axios from 'axios';
// Mirrors TestResult from performance.service — kept in client to avoid cross-boundary imports
interface TestResult {
  testId: string;
  connectionId: string;
  type: 'latency' | 'throughput';
  startedAt: string;
  completedAt: string | null;
  aborted: boolean;
  latencies?: number[];
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  p95?: number;
  p99?: number;
  messagesSent?: number;
  actualRate?: number;
  errorCount?: number;
}

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

interface ProgressState {
  completed: number;
  total: number;
  messagesSent: number;
  elapsed: number;
  durationMs: number;
}

interface PerfPanelState {
  running: boolean;
  testId: string | null;
  progress: ProgressState | null;
  result: TestResult | null;
  error: string | null;
}

type TestType = 'latency' | 'throughput';

function LatencyResults({ r }: { r: TestResult }) {
  const rows = [
    { label: 'Min', value: r.min != null ? `${r.min}ms` : '—' },
    { label: 'Max', value: r.max != null ? `${r.max}ms` : '—' },
    { label: 'Avg', value: r.avg != null ? `${r.avg}ms` : '—' },
    { label: 'Median', value: r.median != null ? `${r.median}ms` : '—' },
    { label: 'p95', value: r.p95 != null ? `${r.p95}ms` : '—' },
    { label: 'p99', value: r.p99 != null ? `${r.p99}ms` : '—' },
    { label: 'Samples', value: String(r.latencies?.length ?? 0) },
  ];

  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {rows.map(({ label, value }) => (
        <div key={label} className="bg-surface-primary rounded p-2 border border-surface-border text-center">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-semibold text-gray-200">{value}</p>
        </div>
      ))}
    </div>
  );
}

function ThroughputResults({ r }: { r: TestResult }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {[
        { label: 'Sent', value: String(r.messagesSent ?? 0) },
        { label: 'Rate', value: r.actualRate != null ? `${r.actualRate.toFixed(1)} msg/s` : '—' },
        { label: 'Errors', value: String(r.errorCount ?? 0) },
      ].map(({ label, value }) => (
        <div key={label} className="bg-surface-primary rounded p-2 border border-surface-border text-center">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-semibold text-gray-200">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function PerformancePanel() {
  const activeConnection = useConnectionStore((s) => s.activeConnection);
  const connectionId = activeConnection?.connectionId ?? null;
  const addToast = useNotificationStore((s) => s.addToast);

  // Test configs
  const [activeTab, setActiveTab] = useState<TestType>('latency');
  const [latCount, setLatCount] = useState(20);
  const [latInterval, setLatInterval] = useState(100);
  const [tpRate, setTpRate] = useState(10);
  const [tpDuration, setTpDuration] = useState(5);
  const [tpPayload, setTpPayload] = useState(100);

  const [state, setState] = useState<PerfPanelState>({
    running: false,
    testId: null,
    progress: null,
    result: null,
    error: null,
  });

  // Listen to Socket.io perf events via a global handler via window events
  // (useControlSocket broadcasts them via window custom events for this panel)
  useEffect(() => {
    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent<ProgressState>).detail;
      setState((s) => ({ ...s, progress: detail }));
    };
    const onComplete = (e: Event) => {
      const result = (e as CustomEvent<TestResult>).detail;
      setState((s) => ({ ...s, running: false, progress: null, result }));
      addToast('Performance test complete', 'success');
    };
    window.addEventListener('perf:progress', onProgress);
    window.addEventListener('perf:complete', onComplete);
    return () => {
      window.removeEventListener('perf:progress', onProgress);
      window.removeEventListener('perf:complete', onComplete);
    };
  }, [addToast]);

  const startTest = useCallback(async () => {
    if (!connectionId) return;
    setState({ running: true, testId: null, progress: null, result: null, error: null });
    try {
      const url =
        activeTab === 'latency'
          ? `${API_BASE}/api/connections/${connectionId}/perf/latency`
          : `${API_BASE}/api/connections/${connectionId}/perf/throughput`;

      const body =
        activeTab === 'latency'
          ? { count: latCount, intervalMs: latInterval }
          : { messagesPerSecond: tpRate, durationSeconds: tpDuration, payloadSize: tpPayload };

      const resp = await axios.post<{ testId: string }>(url, body);
      setState((s) => ({ ...s, testId: resp.data.testId }));
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message ?? err.message : String(err);
      setState({ running: false, testId: null, progress: null, result: null, error: msg });
    }
  }, [connectionId, activeTab, latCount, latInterval, tpRate, tpDuration, tpPayload]);

  const abortTest = useCallback(async () => {
    if (!connectionId) return;
    await axios.delete(`${API_BASE}/api/connections/${connectionId}/perf`);
    setState((s) => ({ ...s, running: false, progress: null }));
  }, [connectionId]);

  const exportResult = () => {
    if (!state.result) return;
    const blob = new Blob([JSON.stringify(state.result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perf-${state.result.testId?.slice(0, 8) ?? 'test'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!connectionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-600 text-sm">Connect to a WebSocket server to run performance tests.</p>
      </div>
    );
  }

  const progressPct = state.progress
    ? activeTab === 'latency'
      ? Math.round((state.progress.completed / state.progress.total) * 100)
      : Math.round((state.progress.elapsed / state.progress.durationMs) * 100)
    : 0;

  return (
    <div className="p-4 flex flex-col gap-4 overflow-y-auto">
      {/* Tab selector */}
      <div className="flex gap-2">
        {(['latency', 'throughput'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-sm rounded font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-accent-primary text-white'
                : 'bg-surface-primary text-gray-400 hover:text-gray-200 border border-surface-border'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Latency config */}
      {activeTab === 'latency' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Ping count (1–1000)</span>
            <div className="flex items-center gap-2">
              <input
                type="range" min={1} max={1000} value={latCount}
                onChange={(e) => setLatCount(Number(e.target.value))}
                className="flex-1 accent-accent-primary"
              />
              <span className="text-xs text-gray-300 w-10 text-right">{latCount}</span>
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Interval between pings (ms)</span>
            <input
              type="number" min={10} max={5000} value={latInterval}
              onChange={(e) => setLatInterval(Number(e.target.value))}
              className="bg-surface-primary border border-surface-border rounded px-2 py-1 text-sm text-gray-200 outline-none"
            />
          </label>
        </div>
      )}

      {/* Throughput config */}
      {activeTab === 'throughput' && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Rate (msg/s, 1–1000)', value: tpRate, min: 1, max: 1000, set: setTpRate },
            { label: 'Duration (s, 1–60)', value: tpDuration, min: 1, max: 60, set: setTpDuration },
            { label: 'Payload size (bytes)', value: tpPayload, min: 1, max: 65536, set: setTpPayload },
          ].map(({ label, value, min, max, set }) => (
            <label key={label} className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">{label}</span>
              <input
                type="number" min={min} max={max} value={value}
                onChange={(e) => set(Number(e.target.value))}
                className="bg-surface-primary border border-surface-border rounded px-2 py-1 text-sm text-gray-200 outline-none"
              />
            </label>
          ))}
        </div>
      )}

      {/* Run / Abort */}
      <div className="flex gap-2">
        {!state.running ? (
          <button
            onClick={() => void startTest()}
            className="px-4 py-1.5 bg-accent-primary hover:bg-accent-hover text-white rounded text-sm font-medium"
          >
            ▶ Run {activeTab} test
          </button>
        ) : (
          <button
            onClick={() => void abortTest()}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
          >
            ■ Abort
          </button>
        )}
        {state.result && (
          <button
            onClick={exportResult}
            className="px-3 py-1.5 border border-surface-border text-gray-400 hover:text-gray-200 rounded text-sm"
          >
            Export JSON
          </button>
        )}
      </div>

      {/* Progress */}
      {state.running && state.progress && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>
              {activeTab === 'latency'
                ? `${state.progress.completed} / ${state.progress.total} pings`
                : `${state.progress.messagesSent ?? 0} messages sent`}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-surface-primary rounded-full h-2 overflow-hidden border border-surface-border">
            <div
              className="bg-accent-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <p className="text-red-400 text-xs bg-red-900/20 rounded p-2">{state.error}</p>
      )}

      {/* Results */}
      {state.result && !state.running && (
        <section>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-200">Results</h3>
            {state.result.aborted && (
              <span className="text-xs text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded">Aborted</span>
            )}
          </div>
          {state.result.type === 'latency' ? (
            <LatencyResults r={state.result} />
          ) : (
            <ThroughputResults r={state.result} />
          )}
        </section>
      )}
    </div>
  );
}
