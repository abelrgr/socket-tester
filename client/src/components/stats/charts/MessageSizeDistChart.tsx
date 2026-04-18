import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SizePoint } from '../../../stores/statsStore';

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
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', fontSize: 11 }}
          formatter={(v) => [Number(v ?? 0), 'messages']}
        />
        <Bar dataKey="count" fill="#06b6d4" name="Messages" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
