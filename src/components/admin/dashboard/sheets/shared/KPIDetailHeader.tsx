import { cn } from "@/lib/utils";

interface MiniStat {
  label: string;
  value: string | number;
}

interface KPIDetailHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  miniStats?: MiniStat[];
  color: string;
}

export function KPIDetailHeader({ icon: Icon, title, subtitle, miniStats, color }: KPIDetailHeaderProps) {
  return (
    <div className="pb-4 border-b border-white/10">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center", color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-white/50">{subtitle}</p>}
        </div>
      </div>
      {miniStats && miniStats.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-3">
          {miniStats.map((stat, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-white/40">{stat.label}:</span>
              <span className="text-sm font-semibold text-white">{stat.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
