import { Wallet, TrendingUp, Users, ExternalLink, AlertTriangle, Tag, ArrowDownRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStripeConnectStatus } from '@/hooks/academy/useStripeConnectStatus';
import { useAcademyFinancialHealth } from '@/hooks/academy/useAcademyLive';

interface PayoutsAdminTabProps {
  spaceId: string;
  accentColor?: string;
}

/**
 * Panel financiero con métricas REALES (no potenciales).
 *
 * MRR efectivo = lo que realmente entra cada mes después de aplicar cupones.
 * Distinguir de MRR bruto evita engañarse cuando hay descuentos forever.
 * Actualiza vía realtime cuando llega un pago o cambia una membresía.
 */
export function PayoutsAdminTab({ spaceId, accentColor = '#8B5CF6' }: PayoutsAdminTabProps) {
  const { data: connectStatus } = useStripeConnectStatus();
  const { data: health, isLoading } = useAcademyFinancialHealth(spaceId);

  if (isLoading || !health) {
    return <div className="text-zinc-400 text-sm py-8 text-center">Calculando métricas en vivo...</div>;
  }

  const dashboardLink = connectStatus?.dashboard_link;
  const isHealthy = health.mrr_effective > 0;
  const conversionRate =
    health.total_redemptions > 0
      ? Math.round((health.active_members / health.total_redemptions) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* 3 tarjetas de MRR contando la historia real */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BigStat
          label="MRR efectivo"
          value={`$${health.mrr_effective.toFixed(2)}`}
          subtext="lo que realmente entra cada mes"
          color={isHealthy ? '#10b981' : '#71717a'}
          icon={Wallet}
          primary
        />
        <BigStat
          label="MRR bruto"
          value={`$${health.mrr_gross.toFixed(2)}`}
          subtext="techo sin descuentos"
          color="#a78bfa"
          icon={TrendingUp}
        />
        <BigStat
          label={
            health.dilution_percent > 0
              ? `Dilución −${health.dilution_percent}%`
              : 'Sin dilución'
          }
          value={`-$${health.mrr_lost_to_coupons.toFixed(2)}`}
          subtext="sacrificas/mes en cupones"
          color="#f59e0b"
          icon={Tag}
        />
      </div>

      {/* Salud financiera ampliada */}
      <Card className="p-5 bg-kreoon-bg-card border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Salud financiera (últimos 30 días)
          </h3>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            EN VIVO
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Mini label="Ingresos cobrados" value={`$${health.collected_30d_usd.toFixed(2)}`} />
          <Mini label="Tu comisión proyectada" value={`$${health.projected_commission_mrr.toFixed(2)} / mes`} />
          <Mini
            label="Nuevos miembros"
            value={`+${health.new_members_30d}`}
            iconRight={<ArrowUpRight className="h-3 w-3 text-emerald-400" />}
          />
          <Mini
            label="Cancelaciones"
            value={`${health.churned_30d}`}
            iconRight={
              health.churned_30d > 0 ? (
                <ArrowDownRight className="h-3 w-3 text-rose-400" />
              ) : undefined
            }
          />
          <Mini label="ARR efectivo" value={`$${health.arr_effective_usd.toFixed(2)}`} />
          <Mini label="Comisión KREOON" value={`${health.platform_fee_percent}%`} />
          <Mini
            label="Cupones activos"
            value={`${health.active_coupons}`}
            subtext={
              health.total_redemptions > 0
                ? `${health.total_redemptions} canjes totales`
                : 'ninguno canjeado'
            }
          />
          <Mini
            label="Conversión cupón→pago"
            value={
              health.total_redemptions > 0
                ? `${conversionRate}%`
                : '—'
            }
            subtext="suscritos vs canjes"
          />
        </div>
      </Card>

      {/* Aviso si dilución >50% */}
      {health.dilution_percent >= 50 && health.mrr_gross > 0 && (
        <Card className="p-4 bg-amber-500/5 border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-200">
                Estás sacrificando {health.dilution_percent}% del MRR en cupones
              </p>
              <p className="text-xs text-zinc-300 mt-1">
                Si los descuentos son por lanzamiento, revisá que tengan fecha de expiración
                (no "forever"). Sino, considerá bajar el precio de lista para que el MRR
                bruto refleje lo que realmente cobrás.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Link al Stripe Dashboard del owner */}
      {dashboardLink && (
        <Card className="p-4 bg-kreoon-bg-card border-white/10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-sm">Ver detalle en Stripe</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cobros, próximos pagos, descuentos aplicados, balance.
              </p>
            </div>
            <a href={dashboardLink} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Abrir Stripe
              </Button>
            </a>
          </div>
        </Card>
      )}

      {/* Estado de miembros */}
      <Card className="p-5 bg-kreoon-bg-card border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: accentColor }} />
            Miembros activos
          </h3>
          <span className="text-xs text-zinc-400">{health.active_members} en total</span>
        </div>
        <p className="text-sm text-zinc-400">
          {health.active_members === 0
            ? 'Aún no hay miembros activos en la academia.'
            : `Tenés ${health.active_members} ${
                health.active_members === 1 ? 'miembro activo' : 'miembros activos'
              } pagando un promedio efectivo de $${(
                health.mrr_effective / Math.max(health.active_members, 1)
              ).toFixed(2)}/mes.`}
        </p>
      </Card>
    </div>
  );
}

function BigStat({
  label,
  value,
  subtext,
  color,
  icon: Icon,
  primary,
}: {
  label: string;
  value: string;
  subtext: string;
  color: string;
  icon: any;
  primary?: boolean;
}) {
  return (
    <Card
      className={`p-5 ${primary ? 'border-2' : 'border'} bg-kreoon-bg-card`}
      style={primary ? { borderColor: `${color}50` } : { borderColor: 'rgba(255,255,255,.1)' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}26` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        {primary && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5">
            real
          </span>
        )}
      </div>
      <div className="text-3xl font-bold" style={{ color: primary ? color : undefined }}>
        {value}
      </div>
      <div className="text-[10px] text-zinc-300 uppercase tracking-wide mt-1">{label}</div>
      <div className="text-[11px] text-zinc-400 mt-0.5">{subtext}</div>
    </Card>
  );
}

function Mini({
  label,
  value,
  subtext,
  iconRight,
}: {
  label: string;
  value: string;
  subtext?: string;
  iconRight?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-black/30 border border-white/5 p-3">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-lg font-bold text-zinc-100">{value}</span>
        {iconRight}
      </div>
      <div className="text-[10px] text-zinc-400 mt-1">{label}</div>
      {subtext && <div className="text-[10px] text-zinc-500">{subtext}</div>}
    </div>
  );
}
