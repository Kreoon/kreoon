import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, Users, AlertCircle, ExternalLink, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStripeConnectStatus } from '@/hooks/academy/useStripeConnectStatus';

interface PayoutsAdminTabProps {
  spaceId: string;
  accentColor?: string;
}

/**
 * Resumen de ingresos del owner.
 *
 * Combina:
 *  - Compras de cursos (academy_enrollments con amount_paid_usd).
 *  - Suscripciones activas a la academia (academy_memberships con
 *    stripe_subscription_id).
 *
 * NOTA: este panel no incluye descuentos/cupones aplicados en
 * Stripe Checkout — esos solo se ven en el Stripe Express
 * Dashboard del owner. El botón "Ver en Stripe" lleva allá.
 */
export function PayoutsAdminTab({ spaceId, accentColor = '#8B5CF6' }: PayoutsAdminTabProps) {
  const { user } = useAuth();
  const { data: connectStatus } = useStripeConnectStatus();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['academy', 'admin-payouts', spaceId],
    queryFn: async () => {
      const [enrollmentsRes, membershipsRes, spaceRes] = await Promise.all([
        (supabase as any)
          .from('academy_enrollments')
          .select('amount_paid_usd, enrolled_at, course_id, academy_courses!inner(space_id, title)')
          .eq('academy_courses.space_id', spaceId),
        (supabase as any)
          .from('academy_memberships')
          .select(
            'id, user_id, joined_at, is_active, stripe_subscription_id, stripe_customer_id, role, user:profiles!fk_academy_memberships_user_profile(full_name, email)',
          )
          .eq('space_id', spaceId)
          .neq('role', 'owner')
          .order('joined_at', { ascending: false }),
        (supabase as any)
          .from('academy_spaces')
          .select('membership_price_usd, plan_slug, member_count')
          .eq('id', spaceId)
          .single(),
      ]);

      const enrollments = enrollmentsRes.data ?? [];
      const memberships = membershipsRes.data ?? [];
      const space = spaceRes.data ?? {};

      const totalCourses =
        enrollments.reduce((sum: number, e: any) => sum + Number(e.amount_paid_usd ?? 0), 0) || 0;

      const sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const last30Courses =
        enrollments
          .filter((e: any) => e.enrolled_at >= sinceISO)
          .reduce((sum: number, e: any) => sum + Number(e.amount_paid_usd ?? 0), 0) || 0;

      const activeMemberships = memberships.filter((m: any) => m.is_active);
      const paidMemberships = activeMemberships.filter((m: any) => !!m.stripe_subscription_id);
      const monthlyPrice = Number(space.membership_price_usd ?? 0);
      const projectedMrr = monthlyPrice * activeMemberships.length;

      const feePct = space.plan_slug === 'pro' ? 0.029 : 0.10;
      const totalGross = totalCourses;
      const platformFee = totalGross * feePct;
      const netEarnings = totalGross - platformFee;

      const newMembersLast30 = activeMemberships.filter(
        (m: any) => m.joined_at && m.joined_at >= sinceISO,
      ).length;

      return {
        totalGross,
        netEarnings,
        platformFee,
        feePct,
        last30Courses,
        projectedMrr,
        monthlyPrice,
        activeMembershipsCount: activeMemberships.length,
        paidMembershipsCount: paidMemberships.length,
        newMembersLast30,
        enrollments,
        memberships: activeMemberships,
      };
    },
    enabled: !!spaceId && !!user,
  });

  if (isLoading || !stats) {
    return <div className="text-zinc-400 text-sm py-8 text-center">Calculando earnings...</div>;
  }

  const dashboardLink = connectStatus?.dashboard_link;

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          icon={Users}
          label="Miembros activos"
          value={stats.activeMembershipsCount.toLocaleString()}
          subtext={`${stats.paidMembershipsCount} con suscripción de pago`}
          accent={accentColor}
        />
        <Stat
          icon={TrendingUp}
          label="Nuevos últimos 30d"
          value={stats.newMembersLast30.toLocaleString()}
          subtext="se inscribieron a la academia"
          accent={accentColor}
        />
        <Stat
          icon={Wallet}
          label="MRR potencial"
          value={`$${Math.round(stats.projectedMrr).toLocaleString()}`}
          subtext={`USD ${stats.monthlyPrice.toFixed(0)}/mes × ${stats.activeMembershipsCount}`}
          accent={accentColor}
        />
        <Stat
          icon={AlertCircle}
          label="Comisión KREOON"
          value={`${(stats.feePct * 100).toFixed(1)}%`}
          subtext="aplicada a cada cobro"
          accent="#f97316"
        />
      </div>

      {/* Aviso de descuentos */}
      <Card className="p-4 bg-amber-500/5 border-amber-500/20">
        <div className="flex items-start gap-3">
          <Tag className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-200">El MRR es el potencial bruto, no el cobrado real.</p>
            <p className="text-xs text-zinc-300 mt-1">
              Si aplicaste cupones (ej. <code className="bg-black/30 px-1 rounded">100% off</code>),
              el monto real cobrado se ve solo en tu <strong>Stripe Express Dashboard</strong> →
              Pagos / Suscripciones.
            </p>
          </div>
        </div>
      </Card>

      {/* Link al Stripe Dashboard del owner */}
      {dashboardLink && (
        <Card className="p-4 bg-kreoon-bg-card border-white/10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-sm">Ver ingresos reales en Stripe</p>
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

      {/* Suscripciones activas */}
      {stats.memberships.length > 0 && (
        <Card className="p-5 bg-kreoon-bg-card border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Suscripciones activas a la academia</h3>
            <span className="text-xs text-zinc-400">{stats.activeMembershipsCount} en total</span>
          </div>
          <ul className="divide-y divide-white/5">
            {stats.memberships.slice(0, 10).map((m: any) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-zinc-200 truncate">
                    {m.user?.full_name || m.user?.email || 'Miembro'}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {m.user?.email}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-zinc-400">
                    {m.joined_at ? new Date(m.joined_at).toLocaleDateString('es-ES') : '-'}
                  </span>
                  {m.stripe_subscription_id ? (
                    <span className="text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                      Suscrito
                    </span>
                  ) : (
                    <span className="text-zinc-500 px-2 py-0.5 rounded bg-white/5">
                      Manual / Free
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Ventas de cursos (si hay) */}
      {stats.enrollments.length > 0 && (
        <Card className="p-5 bg-kreoon-bg-card border-white/10">
          <h3 className="font-semibold mb-3">Compras de cursos</h3>
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
