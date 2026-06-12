import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { LatencyPoint } from '../../../stores/statsStore';
import { useChartTheme } from '../../../hooks/useChartTheme';

interface Props {
  data: LatencyPoint[];
  avg?: number | null;
  p95?: number | null;
}

export function LatencyChart({ data, avg, p95 }: Props) {
  const t = useChartTheme();

  const formatted = data.map((p, i) => ({
    i: i + 1,
    ms: p.latency,
    t: new Date(p.time).toLocaleTimeString(),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
        <XAxis dataKey="i" tick={{ fontSize: 10, fill: t.axis }} label={{ value: 'sample', position: 'insideRight', fontSize: 9, fill: t.axis }} />
        <YAxis tick={{ fontSize: 10, fill: t.axis }} unit="ms" />
        <Tooltip
          contentStyle={{ background: t.ttBg, border: `1px solid ${t.ttBorder}`, fontSize: 11, color: t.ttText }}
          formatter={(v) => [`${v ?? 0}ms`, 'RTT']}
          labelFormatter={(i) => `Sample #${i}`}
        />
        {avg != null && (
          <ReferenceLine y={avg} stroke={t.s2} strokeDasharray="4 2" label={{ value: `avg ${avg}ms`, fill: t.s2, fontSize: 9 }} />
        )}
        {p95 != null && (
          <ReferenceLine y={p95} stroke={t.danger} strokeDasharray="4 2" label={{ value: `p95 ${p95}ms`, fill: t.danger, fontSize: 9 }} />
        )}
        <Line type="monotone" dataKey="ms" stroke={t.accent} dot={false} strokeWidth={1.5} name="RTT (ms)" />
      </LineChart>
    </ResponsiveContainer>
  );
}
