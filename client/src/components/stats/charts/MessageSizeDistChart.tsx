import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SizePoint } from '../../../stores/statsStore';
import { useChartTheme } from '../../../hooks/useChartTheme';

interface Props {
  data: SizePoint[];
}

const BUCKETS = [
  { label: '< 100B', max: 100 },
  { label: '100B–1K', max: 1024 },
  { label: '1K–10K', max: 10240 },
  { label: '10K–100K', max: 102400 },
  { label: '> 100K', max: Infinity },
];

export function MessageSizeDistChart({ data }: Props) {
  const t = useChartTheme();

  const counts = BUCKETS.map((b, i) => ({
    label: b.label,
    count: data.filter((d) => {
      const prev = BUCKETS[i - 1]?.max ?? 0;
      return d.size > prev && d.size <= b.max;
    }).length,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={counts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: t.axis }} />
        <YAxis tick={{ fontSize: 10, fill: t.axis }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: t.ttBg, border: `1px solid ${t.ttBorder}`, fontSize: 11, color: t.ttText }}
          formatter={(v) => [Number(v ?? 0), 'messages']}
        />
        <Bar dataKey="count" fill={t.s1} name="Messages" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
