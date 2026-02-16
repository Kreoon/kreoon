import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { SourceMetrics } from '@/analytics/types/dashboard';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#ef4444'];

interface SourceDistributionProps {
  data: SourceMetrics[];
}

export function SourceDistribution({ data }: SourceDistributionProps) {
  const chartData = data
    .filter(s => s.revenue > 0 || s.visitors > 0)
    .slice(0, 7)
    .map(s => ({
      name: s.source,
      value: s.revenue > 0 ? s.revenue : s.visitors,
      type: s.revenue > 0 ? 'revenue' : 'visitors',
    }));

  const hasRevenue = data.some(s => s.revenue > 0);

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-4">
        {hasRevenue ? 'Revenue por Fuente' : 'Visitantes por Fuente'}
      </h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
          Sin datos en este periodo
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
              label={({ name, value }) =>
                hasRevenue ? `${name}: $${value.toLocaleString()}` : `${name}: ${value.toLocaleString()}`
              }
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => hasRevenue ? `$${value.toLocaleString()}` : value.toLocaleString()}
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
