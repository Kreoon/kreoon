import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DailyMetrics } from '@/analytics/types/dashboard';

interface TrendChartProps {
  data: DailyMetrics[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-4">Conversiones por Día</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
          Sin datos en este periodo
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gradSignups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradTrials" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSubs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={11}
              tickFormatter={(v) => format(new Date(v), 'dd MMM', { locale: es })}
            />
            <YAxis stroke="#6b7280" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
              labelFormatter={(v) => format(new Date(v as string), 'dd MMMM yyyy', { locale: es })}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="signups" stroke="#3b82f6" fillOpacity={1} fill="url(#gradSignups)" name="Signups" />
            <Area type="monotone" dataKey="trials" stroke="#06b6d4" fillOpacity={1} fill="url(#gradTrials)" name="Trials" />
            <Area type="monotone" dataKey="subscriptions" stroke="#10b981" fillOpacity={1} fill="url(#gradSubs)" name="Suscripciones" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
