import { Mail, MousePointerClick, Eye, AlertTriangle, Users, Send, TrendingUp, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEmailAnalytics } from "@/hooks/useEmailMarketing";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function EmailAnalyticsDashboard() {
  const { data: analytics, isLoading } = useEmailAnalytics();

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Cargando analíticas...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-12 text-muted-foreground">Sin datos</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Campañas Enviadas"
          value={analytics.total_campaigns}
          icon={Send}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          label="Emails Enviados"
          value={analytics.total_sent.toLocaleString()}
          icon={Mail}
          color="bg-violet-500/10 text-violet-400"
        />
        <StatCard
          label="Tasa de Apertura"
          value={`${(analytics.avg_open_rate * 100).toFixed(1)}%`}
          icon={Eye}
          color="bg-green-500/10 text-green-400"
          subtitle={`${analytics.total_opened.toLocaleString()} abiertos`}
        />
        <StatCard
          label="Tasa de Click"
          value={`${(analytics.avg_click_rate * 100).toFixed(1)}%`}
          icon={MousePointerClick}
          color="bg-cyan-500/10 text-cyan-400"
          subtitle={`${analytics.total_clicked.toLocaleString()} clicks`}
        />
      </div>

      {/* Funnel + Details */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Email Funnel */}
        <Card className="p-5">
          <h3 className="font-medium text-sm mb-4">Embudo de Email</h3>
          <div className="space-y-3">
            <MetricBar
              label="Enviados"
              value={analytics.total_sent}
              max={analytics.total_sent}
              color="bg-violet-500"
            />
            <MetricBar
              label="Entregados"
              value={analytics.total_delivered}
              max={analytics.total_sent}
              color="bg-blue-500"
            />
            <MetricBar
              label="Abiertos"
              value={analytics.total_opened}
              max={analytics.total_sent}
              color="bg-green-500"
            />
            <MetricBar
              label="Clicks"
              value={analytics.total_clicked}
              max={analytics.total_sent}
              color="bg-cyan-500"
            />
            <MetricBar
              label="Rebotados"
              value={analytics.total_bounced}
              max={analytics.total_sent}
              color="bg-red-500"
            />
          </div>
        </Card>

        {/* Infrastructure */}
        <Card className="p-5">
          <h3 className="font-medium text-sm mb-4">Infraestructura</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Segmentos</span>
              </div>
              <span className="font-semibold">{analytics.total_segments}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Contactos sincronizados</span>
              </div>
              <span className="font-semibold">{analytics.total_contacts_synced.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Drip enrollments activos</span>
              </div>
              <span className="font-semibold">{analytics.active_drip_enrollments}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Delivery Rate</span>
              </div>
              <span className="font-semibold">
                {analytics.total_sent > 0
                  ? `${((analytics.total_delivered / analytics.total_sent) * 100).toFixed(1)}%`
                  : "N/A"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
