import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PayoutsAdminTabProps {
  spaceId: string;
  accentColor?: string;
}

/**
 * Resumen de earnings del owner basado en:
 * - amount_paid_usd de academy_enrollments (compras de cursos del space)
 * - membership_price_usd × member_count_activo (recurrente proyectado mensual)
 * Solo lectura: el flujo real de payouts a Stripe Connect requiere setup adicional.
 */
export function PayoutsAdminTab({ spaceId, accentColor = '#8B5CF6' }: PayoutsAdminTabProps) {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['academy', 'admin-payouts', spaceId],
    queryFn: async () => {
      // Total bruto recibido (suma de amount_paid_usd de inscripciones a cursos del space)
      const { data: enrollments } = await (supabase as any)
        .from('academy_enrollments')
        .select('amount_paid_usd, enrolled_at, course_id, academy_courses!inner(space_id, title)')
        .eq('academy_courses.space_id', spaceId);

      const totalGross =
        (enrollments ?? []).reduce(
          (sum: number, e: any) => sum + Number(e.amount_paid_usd ?? 0),
          0
        ) || 0;

      // Compras último 30 días
      const sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const last30 =
        (enrollments ?? []).filter((e: any) => e.enrolled_at >= sinceISO).reduce(
          (sum: number, e: any) => sum + Number(e.amount_paid_usd ?? 0),
          0
        ) || 0;

      // MRR proyectado de membresías recurrentes
      const { data: space } = await (supabase as any)
        .from('academy_spaces')
        .select('membership_price_usd, member_count')
        .eq('id', spaceId)
        .single();
      const projectedMrr =
        Number(space?.membership_price_usd ?? 0) * Number(space?.member_count ?? 0);

      // Stripe fee de KREOON Academia
      // - Plan Hobby: 10% transaction fee
      // - Plan Pro: 2.9% transaction fee
      const { data: spacePlan } = await (supabase as any)
        .from('academy_spaces')
        .select('plan_slug')
        .eq('id', spaceId)
        .single();
      const feePct = spacePlan?.plan_slug === 'pro' ? 0.029 : 0.10;
      const platformFee = totalGross * feePct;
      const netEarnings = totalGross - platformFee;

      // Compras count
      const purchaseCount = (enrollments ?? []).filter((e: any) => Number(e.amount_paid_usd ?? 0) > 0)
        .length;

      return {
        totalGross,
        netEarnings,
        platformFee,
        feePct,
        last30,
        projectedMrr,
        purchaseCount,
        enrollments: enrollments ?? [],
      };
    },
    enabled: !!spaceId && !!user,
  });

  if (isLoading || !stats) {
    return <div className="text-zinc-400 text-sm py-8 text-center">Calculando earnings...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          icon={Wallet}
          label="Earnings netos"
          value={`$${Math.round(stats.netEarnings).toLocaleString()}`}
          subtext={`tras ${(stats.feePct * 100).toFixed(1)}% comisión`}
          accent={accentColor}
        />
        <Stat
          icon={TrendingUp}
          label="Últimos 30 días"
          value={`$${Math.round(stats.last30).toLocaleString()}`}
          subtext={`${stats.purchaseCount} compras totales`}
          accent={accentColor}
        />
        <Stat
          icon={Clock}
          label="MRR proyectado"
          value={`$${Math.round(stats.projectedMrr).toLocaleString()}`}
          subtext="recurrente / mes"
          accent={accentColor}
        />
        <Stat
          icon={AlertCircle}
          label="Comisión plataforma"
          value={`$${Math.round(stats.platformFee).toLocaleString()}`}
          subtext={`${(stats.feePct * 100).toFixed(1)}% de las ventas`}
          accent="#f97316"
        />
      </div>

      {/* Info de payout */}
      <Card className="p-5 bg-kreoon-bg-card border-white/10">
        <h3 className="font-semibold mb-3">Próximo pago</h3>
        <p className="text-sm text-zinc-300">
          Los earnings se procesan via <strong>Stripe Connect</strong> el primer día de cada mes.
          Para recibir pagos, conecta tu cuenta de Stripe desde Configuración → Pagos.
        </p>
        <div className="mt-4 p-3 rounded-lg bg-kreoon-bg-secondary border border-white/5 text-xs text-zinc-400">
          <strong className="text-zinc-200">Modelo de comisión actual:</strong> Plan{' '}
          <span style={{ color: accentColor }}>
            {(stats.feePct * 100).toFixed(1)}%
          </span>{' '}
          sobre cada venta de curso. Si subes a Plan Pro, baja al 2.9%.
        </div>
      </Card>

      {/* Últimas ventas */}
      {stats.enrollments.length > 0 && (
        <Card className="p-5 bg-kreoon-bg-card border-white/10">
          <h3 className="font-semibold mb-3">Últimas compras</h3>
          <ul className="divide-y divide-white/5">
            {stats.enrollments
              .filter((e: any) => Number(e.amount_paid_usd ?? 0) > 0)
              .slice(0, 8)
              .map((e: any) => (
                <li
                  key={`${e.course_id}-${e.enrolled_at}`}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="truncate text-zinc-200">
                    {(e as any).academy_courses?.title ?? 'Curso'}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-zinc-400">
                      {new Date(e.enrolled_at).toLocaleDateString('es-ES')}
                    </span>
                    <span className="font-mono font-semibold" style={{ color: accentColor }}>
                      ${Number(e.amount_paid_usd ?? 0).toFixed(2)}
                    </span>
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  subtext,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  subtext: string;
  accent: string;
}) {
  return (
    <Card className="p-4 bg-kreoon-bg-card border-white/10">
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center mb-2"
        style={{ backgroundColor: `${accent}26` }}
      >
        <Icon className="h-4 w-4" style={{ color: accent }} aria-hidden="true" />
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] text-zinc-300 uppercase tracking-wide mt-1">{label}</div>
      <div className="text-[10px] text-zinc-400 mt-0.5">{subtext}</div>
    </Card>
  );
}
