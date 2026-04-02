import { Star } from 'lucide-react';
import type { CreatorStats } from '../types/marketplace';

interface StatsSectionProps {
  stats: CreatorStats;
}

export function StatsSection({ stats }: StatsSectionProps) {
  const items = [
    {
      value: stats.completed_projects.toString(),
      label: 'Proyectos completados',
    },
    {
      value: stats.rating_avg.toFixed(1),
      label: 'Rating promedio',
      icon: <Star className="inline h-5 w-5 text-purple-400 fill-purple-400 ml-1" />,
    },
    {
      value: stats.response_time_hours < 1
        ? `< ${Math.round(stats.response_time_hours * 60)} min`
        : `< ${stats.response_time_hours} hrs`,
      label: 'Tiempo de respuesta',
    },
    {
      value: `${stats.on_time_delivery_pct}%`,
      label: 'Entrega a tiempo',
    },
  ];

  return (
    <div className="pb-8 border-b border-white/10 space-y-4">
      <h2 className="text-xl font-semibold text-white">Estadísticas</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-sm p-5 text-center"
          >
            <div className="text-2xl font-bold text-white mb-1">
              {item.value}
              {item.icon}
            </div>
            <div className="text-gray-500 text-xs">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
