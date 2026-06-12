import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ExternalLink, Loader2, CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useStripeConnectStatus, useStartStripeConnectOnboarding } from '@/hooks/academy/useStripeConnectStatus';

interface Props {
  accentColor: string;
  planSlug?: string | null;
}

/**
 * Tab "Pagos" del panel admin de la academia. Permite al owner conectar
 * su cuenta de Stripe vía Connect Express y ver el estado actual.
 *
 * Estados visibles:
 *   - Sin cuenta: botón "Conectar mi cuenta de Stripe".
 *   - Cuenta creada pero onboarding pendiente: botón "Continuar onboarding"
 *     + lista de requirements faltantes.
 *   - Listo: badge "Activo", link al dashboard Express.
 */
export function ConnectOnboardingTab({ accentColor, planSlug }: Props) {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: status, isLoading, refetch } = useStripeConnectStatus();
  const start = useStartStripeConnectOnboarding();

  // Tras volver del onboarding (?stripe_connect=done) refetchamos
  // y limpiamos el query param.
  useEffect(() => {
    const flag = searchParams.get('stripe_connect');
    if (flag === 'done' || flag === 'refresh') {
      refetch();
      const next = new URLSearchParams(searchParams);
      next.delete('stripe_connect');
      setSearchParams(next, { replace: true });
      if (flag === 'done') {
        toast.success('Configuración guardada. Verifica tu estado abajo.');
      }
    }
  }, [searchParams, setSearchParams, refetch]);

  const feeLabel = planSlug === 'pro' ? '2.9 %' : '10 %';

  if (isLoading) {
    return (
      <Card className="p-8 bg-white/5 border-white/10 text-center text-zinc-400">
        <Loader2 className="h-6 w-6 mx-auto animate-spin" />
        <p className="text-sm mt-2">Consultando tu cuenta de Stripe…</p>
      </Card>
    );
  }

  const ready = !!status?.ready_to_receive_payments;
  const hasAccount = !!status?.has_account;
  const dueRequirements = status?.requirements_currently_due ?? [];

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <Card className="p-5 bg-white/5 border-white/10 space-y-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" style={{ color: accentColor }} />
          <h3 className="font-semibold">Cobros y Stripe Connect</h3>
        </div>
        <p className="text-sm text-zinc-400">
          Conecta tu cuenta de Stripe para recibir los pagos de tu academia directo
          en tu cuenta bancaria. KREOON descuenta su comisión ({feeLabel}) en cada
          cobro automáticamente — no tienes que transferir nada manual.
        </p>
      </Card>

      {/* Estado */}
      {ready ? (
        <Card className="p-5 bg-emerald-500/5 border-emerald-500/20 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <h4 className="font-semibold">Cuenta activa</h4>
          </div>
          <p className="text-sm text-zinc-300">
            Tu academia ya puede recibir pagos. Los cobros entrarán a tu cuenta
            Stripe y se transferirán a tu banco según la programación de Stripe.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {status?.dashboard_link && (
              <a href={status.dashboard_link} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="border-white/15">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Abrir mi dashboard de Stripe
                </Button>
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-zinc-400"
            >
              Actualizar estado
            </Button>
          </div>
        </Card>
      ) : hasAccount ? (
        <Card className="p-5 bg-amber-500/5 border-amber-500/20 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <h4 className="font-semibold">Onboarding pendiente</h4>
          </div>
          <p className="text-sm text-zinc-300">
            Ya creamos tu cuenta de Stripe pero falta completar el KYC y conectar
            tu banco. Hasta que termines, tus cobros estarán bloqueados con el
            mensaje "Esta academia está verificando su cuenta de pagos".
          </p>

          {dueRequirements.length > 0 && (
            <div className="rounded-md bg-black/30 border border-white/5 p-3 space-y-1.5">
              <p className="text-xs text-zinc-400">Stripe está esperando:</p>
              <ul className="text-xs text-zinc-300 space-y-1 pl-4 list-disc">
                {dueRequirements.map((r) => (
                  <li key={r}>{r.replace(/_/g, ' ').replace(/\./g, ' › ')}</li>
                ))}
              </ul>
            </div>
          )}

          <Button
            onClick={() => start.mutate({ spaceSlug })}
            disabled={start.isPending}
            className="text-white font-bold rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            }}
          >
            {start.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Abriendo Stripe…
              </>
            ) : (
              'Continuar onboarding'
            )}
          </Button>
        </Card>
      ) : (
        <Card className="p-5 bg-white/5 border-white/10 space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Conecta tu cuenta de Stripe</h4>
            <p className="text-sm text-zinc-400">
              Te abriremos el onboarding hosteado por Stripe. Necesitarás un
              documento de identidad y los datos de tu cuenta bancaria. Toma
              unos 5 minutos.
            </p>
          </div>

          <Button
            onClick={() => start.mutate({ spaceSlug })}
            disabled={start.isPending}
            className="text-white font-bold rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            }}
          >
            {start.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Abriendo Stripe…
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" /> Conectar mi cuenta de Stripe
              </>
            )}
          </Button>

          <p className="text-xs text-zinc-500">
            Mientras no completes este paso, los visitantes que quieran
            suscribirse a tu academia verán el mensaje "Esta academia está
            verificando su cuenta de pagos".
          </p>
        </Card>
      )}
    </div>
  );
}
