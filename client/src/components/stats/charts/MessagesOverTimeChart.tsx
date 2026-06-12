import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { MsgBucket } from '../../../stores/statsStore';
import { useChartTheme } from '../../../hooks/useChartTheme';

interface Props {
  data: MsgBucket[];
}

export function MessagesOverTimeChart({ data }: Props) {
  const t = useChartTheme();

  const formatted = data.map((b) => ({
    t: new Date(b.time * 1000).toLocaleTimeString(),
    sent: b.sent,
    recv: b.received,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
        <XAxis dataKey="t" tick={{ fontSize: 10, fill: t.axis }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: t.axis }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: t.ttBg, border: `1px solid ${t.ttBorder}`, fontSize: 11, color: t.ttText }}
          labelStyle={{ color: t.ttText }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="sent" stroke={t.s1} dot={false} strokeWidth={1.5} name="Sent" />
        <Line type="monotone" dataKey="recv" stroke={t.s2} dot={false} strokeWidth={1.5} name="Received" />
      </LineChart>
    </ResponsiveContainer>
  );
}
