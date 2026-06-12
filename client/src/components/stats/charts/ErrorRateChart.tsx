import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ErrorBucket } from '../../../stores/statsStore';
import { useChartTheme } from '../../../hooks/useChartTheme';

interface Props {
  data: ErrorBucket[];
}

export function ErrorRateChart({ data }: Props) {
  const t = useChartTheme();

  const formatted = data.map((b) => ({
    t: new Date(b.time * 60000).toLocaleTimeString(),
    errors: b.errors,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
        <XAxis dataKey="t" tick={{ fontSize: 10, fill: t.axis }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: t.axis }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: t.ttBg, border: `1px solid ${t.ttBorder}`, fontSize: 11, color: t.ttText }}
          formatter={(v) => [Number(v ?? 0), 'errors/min']}
        />
        <Area type="monotone" dataKey="errors" stroke={t.danger} fill={`${t.danger}1a`} strokeWidth={1.5} name="Errors/min" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
