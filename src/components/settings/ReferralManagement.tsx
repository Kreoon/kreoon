import { Loader2, Users, DollarSign, MousePointerClick, TrendingUp, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUnifiedReferrals } from "@/hooks/useUnifiedReferrals";
import { useReferralGate } from "@/hooks/useReferralGate";
import { ReferralProgressRing } from "@/components/gate/ReferralProgressRing";
import { ReferralShareCard } from "@/components/gate/ReferralShareCard";
import { ReferralDetailList } from "@/components/gate/ReferralDetailList";
import { CustomSlugInput } from "@/components/gate/CustomSlugInput";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ReferralManagement() {
  const { user } = useAuth();
  const {
    dashboard,
    codes,
    referrals: unifiedReferrals,
    earnings,
    metrics,
    dashboardLoading,
    codesLoading,
    generateCode,
    isGenerating,
    updateSlug,
    isUpdatingSlug,
  } = useUnifiedReferrals();

  const {
    isUnlocked,
    isGateLoading,
    qualifiedCount,
    remaining,
    referralCode: gateCode,
    referrals: gateReferrals,
  } = useReferralGate();

  const isLoading = dashboardLoading || codesLoading || isGateLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Primary referral code — defensive: edge function returns {codes:[]} wrapper,
  // hook unwraps it, but stale cache may still hold the old shape
  const codesList = Array.isArray(codes) ? codes : (codes as any)?.codes || [];
  const referralsList = Array.isArray(unifiedReferrals) ? unifiedReferrals : (unifiedReferrals as any)?.referrals || [];
  const earningsList = Array.isArray(earnings) ? earnings : (earnings as any)?.earnings || [];
  const primaryCode = codesList.find((c: any) => c.is_active);
  const displayCode = primaryCode?.code || gateCode;

  return (
    <div className="space-y-6">
      {/* Gate progress (only show if not yet unlocked) */}
      {!isUnlocked && (
        <Card className="!bg-purple-500/5 !border-purple-500/20">
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <h3 className="text-white font-semibold mb-1">Desbloquea la Plataforma</h3>
              <p className="text-white/50 text-xs">
                Invita a 3 personas que completen su perfil en el marketplace.
              </p>
            </div>
            <div className="flex justify-center">
              <ReferralProgressRing qualified={qualifiedCount} />
            </div>
            {remaining > 0 && (
              <p className="text-center text-sm text-white/60 mt-4">
                Te {remaining === 1 ? 'falta' : 'faltan'}{' '}
                <strong className="text-purple-300">{remaining} {remaining === 1 ? 'llave' : 'llaves'}</strong>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Referidos"
          value={metrics.total_referrals}
          subtitle={`${metrics.active_referrals} activos`}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Ganancias Totales"
          value={`$${metrics.total_earned.toLocaleString()}`}
          subtitle={`$${metrics.this_month_earned.toLocaleString()} este mes`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Total Clicks"
          value={metrics.total_clicks}
          subtitle={`${metrics.total_registrations} registros`}
          icon={MousePointerClick}
          color="blue"
        />
        <StatCard
          title="Tasa Conversion"
          value={metrics.conversion_rate}
          subtitle="clicks → registros"
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Share Card - Link + Copy + Share */}
      <ReferralShareCard
        code={displayCode || null}
        onGenerateCode={async () => { await generateCode(); }}
        isGenerating={isGenerating}
      />

      {/* Custom Slug */}
      {primaryCode && (
        <Card className="p-6">
          <h3 className="text-white font-semibold text-sm mb-3">Personalizar tu Link</h3>
          <p className="text-white/50 text-xs mb-4">
            Cambia tu codigo de referido por uno personalizado. Solo letras, numeros y guiones.
          </p>
          <CustomSlugInput
            currentCode={primaryCode.code}
            codeId={primaryCode.id}
            onSave={updateSlug}
            isSaving={isUpdatingSlug}
          />
        </Card>
      )}

      {/* Referral Detail List (gate-style with qualification checks) */}
      {gateReferrals.length > 0 && (
        <ReferralDetailList referrals={gateReferrals} />
      )}

      {/* Unified referrals list (with earnings) */}
      {referralsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Todos los Referidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referralsList.map((ref: any) => (
                <div
                  key={ref.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5"
                >
                  {ref.referred?.avatar_url ? (
                    <img src={ref.referred.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-medium">
                      {(ref.referred?.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {ref.referred?.full_name || 'Usuario'}
                    </p>
                    <p className="text-white/40 text-[10px]">
                      {ref.created_at ? format(new Date(ref.created_at), "dd MMM yyyy", { locale: es }) : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium',
                      ref.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/10 text-white/50'
                    )}>
                      {ref.status === 'active' ? 'Activo' : ref.status}
                    </span>
                    {(ref.total_earned || 0) > 0 && (
                      <p className="text-[10px] text-green-400 mt-0.5">
                        +${Number(ref.total_earned).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings history */}
      {earningsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Historial de Comisiones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {earningsList.slice(0, 20).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                  <div>
                    <p className="text-white text-sm">
                      {e.source_type === 'subscription' ? 'Suscripcion' : 'Transaccion'}
                      {e.relationship?.referred?.full_name && (
                        <span className="text-white/40"> — {e.relationship.referred.full_name}</span>
                      )}
                    </p>
                    <p className="text-white/40 text-[10px]">
                      {e.created_at ? format(new Date(e.created_at), "dd MMM yyyy", { locale: es }) : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm font-semibold">
                      +${Number(e.commission_amount).toLocaleString()}
                    </p>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px]',
                      e.status === 'credited' ? 'bg-green-500/20 text-green-400' :
                      e.status === 'paid' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    )}>
                      {e.status === 'credited' ? 'Acreditado' : e.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      <Card className="p-6">
        <h3 className="text-white font-semibold text-sm mb-3">Como funciona el programa</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 text-xs text-white/50">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400 shrink-0" />
              <span>3 referidos calificados desbloquean la plataforma</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400 shrink-0" />
              <span>20% de comision por suscripciones de tus referidos</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400 shrink-0" />
              <span>5% del fee de plataforma en transacciones</span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-white/50">
            <p><strong className="text-white/70">Referido calificado:</strong> perfil activo en marketplace + foto de perfil + al menos 1 pieza en portafolio</p>
            <p><strong className="text-white/70">Duracion:</strong> perpetuo mientras ambas cuentas esten activas</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Internal stat card ───
type StatColor = "purple" | "green" | "blue" | "orange";

const COLOR_MAP: Record<StatColor, { text: string; bg: string }> = {
  purple: { text: "text-purple-400", bg: "bg-purple-500/20" },
  green: { text: "text-emerald-400", bg: "bg-emerald-500/20" },
  blue: { text: "text-blue-400", bg: "bg-blue-500/20" },
  orange: { text: "text-orange-400", bg: "bg-orange-500/20" },
};

function StatCard({
  title, value, subtitle, icon: Icon, color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: StatColor;
}) {
  const c = COLOR_MAP[color];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.bg)}>
          <Icon className={cn("h-5 w-5", c.text)} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/50">{title}</p>
          {subtitle && <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}
