import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { LatencyPoint } from '../../../stores/statsStore';

interface Props {
  data: LatencyPoint[];
  avg?: number | null;
  p95?: number | null;
}

export function LatencyChart({ data, avg, p95 }: Props) {
  const formatted = data.map((p, i) => ({
    i: i + 1,
    ms: p.latency,
    t: new Date(p.time).toLocaleTimeString(),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="i" tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'sample', position: 'insideRight', fontSize: 9, fill: '#6b7280' }} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} unit="ms" />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', fontSize: 11 }}
          formatter={(v) => [`${v ?? 0}ms`, 'RTT']}
          labelFormatter={(i) => `Sample #${i}`}
        />
        {avg != null && (
          <ReferenceLine y={avg} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: `avg ${avg}ms`, fill: '#f59e0b', fontSize: 9 }} />
        )}
        {p95 != null && (
          <ReferenceLine y={p95} stroke="#ef4444" strokeDasharray="4 2" label={{ value: `p95 ${p95}ms`, fill: '#ef4444', fontSize: 9 }} />
        )}
        <Line type="monotone" dataKey="ms" stroke="#a78bfa" dot={false} strokeWidth={1.5} name="RTT (ms)" />
      </LineChart>
    </ResponsiveContainer>
  );
}
