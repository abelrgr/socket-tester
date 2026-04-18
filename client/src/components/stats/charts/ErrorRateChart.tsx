import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ErrorBucket } from '../../../stores/statsStore';

interface Props {
  data: ErrorBucket[];
}

export function ErrorRateChart({ data }: Props) {
  const formatted = data.map((b) => ({
    t: new Date(b.time * 60000).toLocaleTimeString(),
    errors: b.errors,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#9ca3af' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', fontSize: 11 }}
          formatter={(v) => [Number(v ?? 0), 'errors/min']}
        />
        <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="#ef44441a" strokeWidth={1.5} name="Errors/min" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
