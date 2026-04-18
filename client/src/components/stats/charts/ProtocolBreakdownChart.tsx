import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { GlobalStats } from '../../../stores/statsStore';

const COLORS: Record<string, string> = {
  websocket: '#3b82f6',
  socketio: '#10b981',
  mqtt: '#f59e0b',
  amqp: '#8b5cf6',
};

interface Props {
  globalStats: GlobalStats | null;
}

export function ProtocolBreakdownChart({ globalStats }: Props) {
  if (!globalStats) {
    return <p className="text-center text-gray-500 text-xs py-8">No active connections</p>;
  }

  const data = Object.entries(globalStats.connectionsByProtocol).map(([protocol, count]) => ({
    name: protocol,
    value: count,
  }));

  if (data.length === 0) {
    return <p className="text-center text-gray-500 text-xs py-8">No active connections</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={65} dataKey="value" nameKey="name">
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] ?? '#6b7280'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', fontSize: 11 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
