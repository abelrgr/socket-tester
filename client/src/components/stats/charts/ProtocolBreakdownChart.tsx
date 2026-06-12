import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { GlobalStats } from '../../../stores/statsStore';
import { PROTOCOL_COLORS } from '../../../constants/protocolColors';
import { useChartTheme } from '../../../hooks/useChartTheme';

interface Props {
  globalStats: GlobalStats | null;
}

export function ProtocolBreakdownChart({ globalStats }: Props) {
  const t = useChartTheme();

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
            <Cell key={entry.name} fill={PROTOCOL_COLORS[entry.name as keyof typeof PROTOCOL_COLORS] ?? '#6b7280'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: t.ttBg, border: `1px solid ${t.ttBorder}`, fontSize: 11, color: t.ttText }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
