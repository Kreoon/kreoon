import { Share2, Users, MousePointerClick, UserPlus, DollarSign, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReferralShareCard } from '@/components/gate/ReferralShareCard';
import { useOrgReferrals } from '@/hooks/useOrgReferrals';
import { useSettingsPermissions } from '@/hooks/useSettingsPermissions';

function MetricCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-border bg-card/50 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function OrgReferralsSection() {
  const { currentOrgId } = useSettingsPermissions();
  const {
    dashboard,
    primaryCode,
    isLoading,
    metrics,
    referrals,
    orgName,
    generateCode,
    isGenerating,
  } = useOrgReferrals(currentOrgId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Share2 className="h-6 w-6 text-primary" />
          Referidos de {orgName || 'Organización'}
        </h2>
        <p className="text-muted-foreground mt-1">
          Genera links de referido para tu organización. Las comisiones van al wallet de la org, no a usuarios individuales.
        </p>
      </div>

      {/* Share card */}
      <ReferralShareCard
        code={primaryCode}
        onGenerateCode={async () => { await generateCode(); }}
        isGenerating={isGenerating}
        audience="brand"
        showTargetSelector
      />

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={MousePointerClick}
            label="Clicks totales"
            value={metrics.total_clicks}
            color="bg-blue-500/10 text-blue-400"
          />
          <MetricCard
            icon={UserPlus}
            label="Registros"
            value={metrics.total_registrations}
            color="bg-green-500/10 text-green-400"
          />
          <MetricCard
            icon={Users}
            label="Conversiones"
            value={metrics.total_conversions}
            color="bg-purple-500/10 text-purple-400"
          />
          <MetricCard
            icon={DollarSign}
            label="Ganado total"
            value={`$${(metrics.total_earned || 0).toFixed(2)}`}
            color="bg-amber-500/10 text-amber-400"
          />
        </div>
      )}

      {/* Referrals list */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuarios referidos</CardTitle>
            <CardDescription>
              Personas que se registraron con el link de tu organización
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    {r.referred?.avatar_url ? (
                      <img src={r.referred.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{r.referred?.full_name || 'Usuario'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.referred_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'active'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {r.status === 'active' ? 'Activo' : r.status}
                    </span>
                    {r.total_earned > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ${r.total_earned.toFixed(2)} ganado
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Los códigos de referido de organización son independientes de los personales.
            Cuando alguien se registra usando un link de tu org, las comisiones se acumulan
            en el wallet de la organización. El referido recibe los mismos beneficios
            (descuento + Tokens IA).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
