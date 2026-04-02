import { useMemo } from "react";
import {
  LazyBarChart,
  LazyChartContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "@/components/ui/lazy-charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GoalData {
  period_type: string;
  period_value: number;
  year: number;
  revenue_goal: number | null;
  revenue_goal_usd?: number | null;
  content_goal: number | null;
  new_clients_goal: number | null;
}

interface ActualData {
  month: number;
  year: number;
  revenue: number;
  revenueCOP?: number;
  revenueUSD?: number;
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
  year?: number;
}

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function GoalsChart({ goals, actuals, metric, title, startMonth = 1, endMonth = 12, year }: GoalsChartProps) {
  // For revenue, we show both COP and USD in separate sub-tabs
  const isRevenue = metric === 'revenue';

  const buildChartData = (currency?: 'COP' | 'USD') => {
    // Use provided year, or find the max year from goals, or current year
    let targetYear = year;
    if (!targetYear && goals.length > 0) {
      targetYear = Math.max(...goals.map(g => g.year));
    }
    if (!targetYear) {
      targetYear = new Date().getFullYear();
    }
    
    const data = [];
    
    // Filter by month range
    for (let month = startMonth; month <= endMonth; month++) {
      const goal = goals.find(g => g.period_type === 'month' && g.period_value === month && g.year === targetYear);
      const actual = actuals.find(a => a.month === month && a.year === targetYear);
      
      let goalValue = 0;
      let actualValue = 0;
      
      if (metric === 'revenue') {
        if (currency === 'USD') {
          goalValue = goal?.revenue_goal_usd || 0;
          actualValue = actual?.revenueUSD || 0;
        } else {
          // COP (default)
          goalValue = goal?.revenue_goal || 0;
          actualValue = actual?.revenueCOP || actual?.revenue || 0;
        }
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
  };

  const chartDataCOP = useMemo(() => buildChartData('COP'), [goals, actuals, metric, startMonth, endMonth, year]);
  const chartDataUSD = useMemo(() => buildChartData('USD'), [goals, actuals, metric, startMonth, endMonth, year]);
  const chartDataOther = useMemo(() => buildChartData(), [goals, actuals, metric, startMonth, endMonth, year]);

  const CustomTooltip = ({ active, payload, label, currency }: any) => {
    if (active && payload && payload.length) {
      const meta = payload.find((p: any) => p.dataKey === 'meta')?.value || 0;
      const real = payload.find((p: any) => p.dataKey === 'real')?.value || 0;
      const percentage = meta > 0 ? Math.round((real / meta) * 100) : 0;
      const isMoney = metric === 'revenue';
      const prefix = isMoney ? (currency === 'USD' ? '$' : '$') : '';
      const suffix = isMoney && currency !== 'USD' ? ' COP' : (isMoney ? ' USD' : '');

      return (
        <div className="bg-[var(--nova-bg-elevated)] border border-[var(--nova-border-default)] rounded-sm p-3 shadow-xl nova-glass">
          <p className="font-semibold text-[var(--nova-text-bright)] mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-[var(--nova-text-secondary)]">
              Meta: <span className="font-medium text-[var(--nova-accent-primary)]">
                {prefix}{meta.toLocaleString()}{suffix}
              </span>
            </p>
            <p className="text-[var(--nova-text-secondary)]">
              Real: <span className="font-medium text-[var(--nova-success)]">
                {prefix}{real.toLocaleString()}{suffix}
              </span>
            </p>
            <p className="text-[var(--nova-text-secondary)]">
              Cumplimiento: <span className={`font-medium ${percentage >= 100 ? 'text-[var(--nova-success)]' : percentage >= 75 ? 'text-[var(--nova-warning)]' : 'text-[var(--nova-error)]'}`}>
                {percentage}%
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = (data: any[], currency?: 'COP' | 'USD') => (
    <LazyChartContainer height={220}>
      <ResponsiveContainer width="100%" height={220}>
        <LazyBarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickFormatter={(value) => {
              if (metric === 'revenue') {
                if (currency === 'USD') {
                  return `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`;
                }
                return `$${(value / 1000000).toFixed(1)}M`;
              }
              return value;
            }}
          />
          <Tooltip content={(props) => <CustomTooltip {...props} currency={currency} />} />
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
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.percentage >= 100 ? 'hsl(var(--success))' : entry.percentage >= 75 ? 'hsl(var(--warning))' : 'hsl(var(--info))'}
              />
            ))}
          </Bar>
        </LazyBarChart>
      </ResponsiveContainer>
    </LazyChartContainer>
  );

  if (isRevenue) {
    return (
      <div className="w-full">
        {title && <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>}
        <Tabs defaultValue="cop" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-7 mb-2">
            <TabsTrigger value="cop" className="text-[10px] h-6">🇨🇴 COP</TabsTrigger>
            <TabsTrigger value="usd" className="text-[10px] h-6">🇺🇸 USD</TabsTrigger>
          </TabsList>
          <TabsContent value="cop" className="m-0">
            {renderChart(chartDataCOP, 'COP')}
          </TabsContent>
          <TabsContent value="usd" className="m-0">
            {renderChart(chartDataUSD, 'USD')}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>}
      {renderChart(chartDataOther)}
    </div>
  );
}
