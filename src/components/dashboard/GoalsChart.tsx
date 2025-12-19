import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

interface GoalData {
  period_type: string;
  period_value: number;
  year: number;
  revenue_goal: number | null;
  content_goal: number | null;
  new_clients_goal: number | null;
}

interface ActualData {
  month: number;
  year: number;
  revenue: number;
  content: number;
  clients: number;
}

interface GoalsChartProps {
  goals: GoalData[];
  actuals: ActualData[];
  metric: 'revenue' | 'content' | 'clients';
  title: string;
  startMonth?: number;
  endMonth?: number;
}

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function GoalsChart({ goals, actuals, metric, title, startMonth = 1, endMonth = 12 }: GoalsChartProps) {
  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const data = [];
    
    // Filter by month range
    for (let month = startMonth; month <= endMonth; month++) {
      const goal = goals.find(g => g.period_type === 'month' && g.period_value === month && g.year === currentYear);
      const actual = actuals.find(a => a.month === month && a.year === currentYear);
      
      let goalValue = 0;
      let actualValue = 0;
      
      if (metric === 'revenue') {
        goalValue = goal?.revenue_goal || 0;
        actualValue = actual?.revenue || 0;
      } else if (metric === 'content') {
        goalValue = goal?.content_goal || 0;
        actualValue = actual?.content || 0;
      } else {
        goalValue = goal?.new_clients_goal || 0;
        actualValue = actual?.clients || 0;
      }
      
      data.push({
        name: MONTHS_SHORT[month - 1],
        meta: goalValue,
        real: actualValue,
        percentage: goalValue > 0 ? Math.round((actualValue / goalValue) * 100) : 0
      });
    }
    
    return data;
  }, [goals, actuals, metric, startMonth, endMonth]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const meta = payload.find((p: any) => p.dataKey === 'meta')?.value || 0;
      const real = payload.find((p: any) => p.dataKey === 'real')?.value || 0;
      const percentage = meta > 0 ? Math.round((real / meta) * 100) : 0;
      
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Meta: <span className="font-medium text-primary">
                {metric === 'revenue' ? `$${meta.toLocaleString()}` : meta}
              </span>
            </p>
            <p className="text-muted-foreground">
              Real: <span className="font-medium text-success">
                {metric === 'revenue' ? `$${real.toLocaleString()}` : real}
              </span>
            </p>
            <p className="text-muted-foreground">
              Cumplimiento: <span className={`font-medium ${percentage >= 100 ? 'text-success' : percentage >= 75 ? 'text-warning' : 'text-destructive'}`}>
                {percentage}%
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickFormatter={(value) => metric === 'revenue' ? `$${(value / 1000).toFixed(0)}k` : value}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            formatter={(value) => value === 'meta' ? 'Meta' : 'Real'}
            wrapperStyle={{ paddingTop: '10px' }}
          />
          <Bar 
            dataKey="meta" 
            fill="hsl(var(--primary))" 
            radius={[4, 4, 0, 0]}
            opacity={0.6}
          />
          <Bar 
            dataKey="real" 
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={entry.percentage >= 100 ? 'hsl(var(--success))' : entry.percentage >= 75 ? 'hsl(var(--warning))' : 'hsl(var(--info))'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
