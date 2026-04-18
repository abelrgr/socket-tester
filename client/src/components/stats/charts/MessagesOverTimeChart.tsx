import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { MsgBucket } from '../../../stores/statsStore';

interface Props {
  data: MsgBucket[];
}

export function MessagesOverTimeChart({ data }: Props) {
  const formatted = data.map((b) => ({
    t: new Date(b.time * 1000).toLocaleTimeString(),
    sent: b.sent,
    recv: b.received,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#9ca3af' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', fontSize: 11 }}
          labelStyle={{ color: '#d1d5db' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="sent" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Sent" />
        <Line type="monotone" dataKey="recv" stroke="#10b981" dot={false} strokeWidth={1.5} name="Received" />
      </LineChart>
    </ResponsiveContainer>
  );
}
