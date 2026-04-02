import {
  LazyAreaChart,
  LazyChartContainer,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '@/components/ui/lazy-charts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DailyMetrics } from '@/analytics/types/dashboard';

interface TrendChartProps {
  data: DailyMetrics[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="bg-[var(--nova-bg-elevated)] dark:bg-[var(--nova-bg-elevated)] light:bg-white/80 rounded-sm p-6 border border-[var(--nova-border-default)] dark:border-[var(--nova-border-default)] light:border-gray-200">
      <h3 className="text-lg font-semibold text-foreground mb-4">Conversiones por Día</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          Sin datos en este periodo
        </div>
      ) : (
        <LazyChartContainer height={300}>
          <ResponsiveContainer width="100%" height={300}>
            <LazyAreaChart data={data}>
              <defs>
                <linearGradient id="gradSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--nova-info)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--nova-info)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradTrials" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--nova-accent-secondary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--nova-accent-secondary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSubs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--nova-success)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--nova-success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v) => format(new Date(v), 'dd MMM', { locale: es })}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                labelFormatter={(v) => format(new Date(v as string), 'dd MMMM yyyy', { locale: es })}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="signups" stroke="var(--nova-info)" fillOpacity={1} fill="url(#gradSignups)" name="Signups" />
              <Area type="monotone" dataKey="trials" stroke="var(--nova-accent-secondary)" fillOpacity={1} fill="url(#gradTrials)" name="Trials" />
              <Area type="monotone" dataKey="subscriptions" stroke="var(--nova-success)" fillOpacity={1} fill="url(#gradSubs)" name="Suscripciones" />
            </LazyAreaChart>
          </ResponsiveContainer>
        </LazyChartContainer>
      )}
    </div>
  );
}
