import React from 'react';
import { Users, DollarSign, TrendingUp, Heart, ArrowUpRight, Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { useSpaceAnalytics } from '@/hooks/academy/useSpaceAnalytics';
import { cn } from '@/lib/utils';

interface SpaceDashboardProps {
  spaceId: string;
  accentColor?: string;
}

export function SpaceDashboard({ spaceId, accentColor = '#8B5CF6' }: SpaceDashboardProps) {
  const { data, isLoading } = useSpaceAnalytics(spaceId, 30);

  if (isLoading || !data) {
    return <div className="text-zinc-500 p-8 text-center">Cargando analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Row métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={Users}
          label="Miembros"
          value={data.total_members.toString()}
          accent={accentColor}
        />
        <Stat
          icon={DollarSign}
          label="MRR"
          value={`$${Math.round(data.mrr_usd).toLocaleString()}`}
          accent={accentColor}
        />
        <Stat
          icon={Heart}
          label="Engagement"
          value={`${data.engagement_rate}%`}
          accent={accentColor}
        />
        <Stat
          icon={TrendingUp}
          label="Retención"
          value={`${data.retention_rate}%`}
          accent={accentColor}
        />
      </div>

      {/* Growth panel */}
      <Card className="p-5 bg-white/5 border-white/10">
        <h3 className="font-semibold mb-4">Últimos 30 días</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniMetric label="Visitantes" value={data.visitors_30d.toLocaleString()} />
          <MiniMetric label="Inscripciones" value={data.signups_30d.toLocaleString()} />
          <MiniMetric label="Conversión" value={`${data.conversion_rate}%`} />
          <MiniMetric label="Nuevo MRR" value={`$${Math.round(data.new_mrr_30d).toLocaleString()}`} />
        </div>
      </Card>

      {/* Chart visitantes */}
      <Card className="p-5 bg-white/5 border-white/10">
        <h3 className="font-semibold mb-4">Visitantes en el tiempo</h3>
        {data.daily_data.length === 0 ? (
          <div className="text-zinc-500 text-sm py-8 text-center">
            Aún no hay datos. Las métricas aparecerán cuando empieces a recibir tráfico.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.daily_data}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: '#0c0c16',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="unique_visitors"
                stroke={accentColor}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="signups"
                stroke="#00D9FF"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Traffic sources */}
      <Card className="p-5 bg-white/5 border-white/10">
        <h3 className="font-semibold mb-4">Fuentes de tráfico</h3>
        {data.top_sources.length === 0 ? (
          <div className="text-zinc-500 text-sm">Sin datos.</div>
        ) : (
          <div className="space-y-2">
            {data.top_sources.map((s) => (
              <div key={s.source} className="flex items-center gap-3">
                <span className="text-sm w-32 truncate text-zinc-300">{s.source}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${s.pct}%`, backgroundColor: accentColor }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-16 text-right">{s.count}</span>
                <span className="text-xs text-zinc-400 w-12 text-right">{s.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Funnel (Fase 8) */}
      <Card className="p-5 bg-white/5 border-white/10">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4" /> Funnel de conversión
        </h3>
        <div className="space-y-3">
          {data.funnel.map((f, i) => (
            <div key={f.stage} className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 w-32">{f.stage}</span>
              <div className="flex-1 h-7 rounded-md bg-white/5 overflow-hidden relative">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.max(2, f.pct)}%`,
                    backgroundColor: accentColor,
                    opacity: 1 - i * 0.15,
                  }}
                />
                <span className="absolute inset-0 flex items-center px-3 text-xs font-medium">
                  {f.count} ({f.pct}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Heatmap (Fase 8) */}
      <Card className="p-5 bg-white/5 border-white/10">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Heatmap de actividad
        </h3>
        <Heatmap data={data.activity_heatmap} accentColor={accentColor} />
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <Card className="p-4 bg-white/5 border-white/10">
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center mb-2"
        style={{ backgroundColor: `${accent}26` }}
      >
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-wide mt-0.5">{label}</div>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

function Heatmap({
  data,
  accentColor,
}: {
  data: { day: number; hour: number; count: number }[];
  accentColor: string;
}) {
  const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const hours = [0, 6, 10, 14, 18, 22];
  const max = Math.max(1, ...data.map((d) => d.count));

  function cellOpacity(day: number, hour: number) {
    const cell = data.find((d) => d.day === day && d.hour === hour);
    return cell ? Math.min(1, cell.count / max) : 0.05;
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${hours.length}, 1fr)` }}>
        <div />
        {hours.map((h) => (
          <div key={h} className="text-[10px] text-zinc-500 text-center">
            {h.toString().padStart(2, '0')}h
          </div>
        ))}
        {days.map((d, dayIdx) => (
          <React.Fragment key={`row-${dayIdx}`}>
            <div className="text-[10px] text-zinc-500 pr-2 self-center">
              {d}
            </div>
            {hours.map((h) => (
              <div
                key={`${dayIdx}-${h}`}
                className={cn('h-6 w-12 rounded')}
                style={{
                  backgroundColor: accentColor,
                  opacity: cellOpacity(dayIdx, h),
                }}
                title={`${d} ${h}h`}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
