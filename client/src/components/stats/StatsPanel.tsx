import { useState, useEffect, useCallback } from 'react';
import { useStatsStore, type BackendStats } from '../../stores/statsStore';
import { MessagesOverTimeChart } from './charts/MessagesOverTimeChart';
import { LatencyChart } from './charts/LatencyChart';
import { MessageSizeDistChart } from './charts/MessageSizeDistChart';
import { ProtocolBreakdownChart } from './charts/ProtocolBreakdownChart';
import { ErrorRateChart } from './charts/ErrorRateChart';
import axios from 'axios';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

interface Props {
  connectionId: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-primary rounded-lg p-3 border border-surface-border">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-100 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

type ChartTab = 'msgtime' | 'latency' | 'sizes' | 'protocol' | 'errors';

export function StatsPanel({ connectionId }: Props) {
  const timeSeries = useStatsStore((s) =>
    connectionId ? s.timeSeries[connectionId] : undefined,
  );
  const backendStats = useStatsStore((s) =>
    connectionId ? s.backendStats[connectionId] : undefined,
  ) as BackendStats | undefined;
  const globalStats = useStatsStore((s) => s.globalStats);
  const setBackendStats = useStatsStore((s) => s.setBackendStats);
  const setGlobalStats = useStatsStore((s) => s.setGlobalStats);

  const [chartTab, setChartTab] = useState<ChartTab>('msgtime');
  const [duration, setDuration] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [globalRes] = await Promise.all([
        axios.get<typeof globalStats>(`${API_BASE}/api/stats`),
        ...(connectionId
          ? [axios.get<BackendStats>(`${API_BASE}/api/stats/${connectionId}`).then((r) => {
              setBackendStats(connectionId, r.data);
              setDuration(r.data.connectionDurationMs);
            })]
          : []),
      ]);
      setGlobalStats(globalRes.data!);
    } catch {
      // Stats are optional — silently ignore
    }
  }, [connectionId, setBackendStats, setGlobalStats]);

  // Poll every 2 seconds
  useEffect(() => {
    void fetchStats();
    const id = setInterval(() => void fetchStats(), 2000);
    return () => clearInterval(id);
  }, [fetchStats]);

  // Update duration clock every second
  useEffect(() => {
    if (!backendStats?.connectedAt) return;
    const id = setInterval(() => {
      setDuration(Date.now() - new Date(backendStats.connectedAt!).getTime());
    }, 1000);
    return () => clearInterval(id);
  }, [backendStats?.connectedAt]);

  const chartTabs: { id: ChartTab; label: string }[] = [
    { id: 'msgtime', label: 'Msgs/s' },
    { id: 'latency', label: 'Latency' },
    { id: 'sizes', label: 'Size Dist' },
    { id: 'protocol', label: 'Protocols' },
    { id: 'errors', label: 'Errors' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Global Stats Bar */}
      {globalStats && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Global
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Active Connections" value={String(globalStats.activeConnections)} />
            <StatCard
              label="Total Sent"
              value={String(globalStats.totalMessagesSent)}
              sub={formatBytes(globalStats.totalBytesSent)}
            />
            <StatCard
              label="Total Received"
              value={String(globalStats.totalMessagesReceived)}
              sub={formatBytes(globalStats.totalBytesReceived)}
            />
          </div>
        </section>
      )}

      {/* Per-connection stats */}
      {connectionId && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Connection
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <StatCard label="Duration" value={formatDuration(duration)} />
            <StatCard
              label="Messages Sent"
              value={String(backendStats?.messagesSent ?? timeSeries?.messages.reduce((a, b) => a + b.sent, 0) ?? 0)}
              sub={formatBytes(backendStats?.bytesSent ?? 0)}
            />
            <StatCard
              label="Messages Recv"
              value={String(backendStats?.messagesReceived ?? timeSeries?.messages.reduce((a, b) => a + b.received, 0) ?? 0)}
              sub={formatBytes(backendStats?.bytesReceived ?? 0)}
            />
            <StatCard
              label="Latency (last)"
              value={backendStats?.latencyLast != null ? `${backendStats.latencyLast}ms` : '—'}
            />
            <StatCard
              label="Latency avg / p95"
              value={
                backendStats?.latencyAvg != null
                  ? `${backendStats.latencyAvg}ms`
                  : '—'
              }
              sub={backendStats?.latencyP95 != null ? `p95: ${backendStats.latencyP95}ms` : undefined}
            />
            <StatCard
              label="Errors / Reconnects"
              value={`${backendStats?.errorCount ?? 0} / ${backendStats?.reconnectionCount ?? 0}`}
            />
          </div>
        </section>
      )}

      {/* Charts */}
      <section>
        <div className="flex gap-1 mb-2 flex-wrap">
          {chartTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setChartTab(t.id)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                chartTab === t.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-primary text-gray-400 hover:text-gray-200 border border-surface-border'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-surface-secondary rounded-lg p-3 border border-surface-border">
          {chartTab === 'msgtime' && (
            <>
              <p className="text-xs text-gray-500 mb-2">Messages per second — last 60s</p>
              <MessagesOverTimeChart data={timeSeries?.messages ?? []} />
            </>
          )}
          {chartTab === 'latency' && (
            <>
              <p className="text-xs text-gray-500 mb-2">Round-trip time — last 100 samples</p>
              <LatencyChart
                data={timeSeries?.latency ?? []}
                avg={backendStats?.latencyAvg}
                p95={backendStats?.latencyP95}
              />
            </>
          )}
          {chartTab === 'sizes' && (
            <>
              <p className="text-xs text-gray-500 mb-2">Message size distribution</p>
              <MessageSizeDistChart data={timeSeries?.sizes ?? []} />
            </>
          )}
          {chartTab === 'protocol' && (
            <>
              <p className="text-xs text-gray-500 mb-2">Active connections by protocol</p>
              <ProtocolBreakdownChart globalStats={globalStats} />
            </>
          )}
          {chartTab === 'errors' && (
            <>
              <p className="text-xs text-gray-500 mb-2">Errors per minute over session</p>
              <ErrorRateChart data={timeSeries?.errors ?? []} />
            </>
          )}
        </div>
      </section>

      {!connectionId && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 text-sm text-center">
            Connect to a socket server to see statistics.
          </p>
        </div>
      )}
    </div>
  );
}
