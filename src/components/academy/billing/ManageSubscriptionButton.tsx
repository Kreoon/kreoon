import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ManageSubscriptionButtonProps {
  spaceSlug: string;
  /** Versión compacta sin texto ni icono, solo color discreto */
  variant?: 'default' | 'ghost';
  size?: 'sm' | 'default';
  className?: string;
}

/**
 * Abre el Stripe Customer Billing Portal para que el estudiante administre
 * su suscripción a la academia (cancelar, cambiar tarjeta, ver facturas).
 *
 * Solo debe renderizarse cuando la membresía tiene `stripe_subscription_id`.
 */
export function ManageSubscriptionButton({
  spaceSlug,
  variant = 'ghost',
  size = 'sm',
  className,
}: ManageSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke(
        'stripe-academy-portal',
        { body: { space_slug: spaceSlug } }
      );
      if (error) throw error;
      if (!data?.url) throw new Error('No recibimos URL del portal de pagos.');
      window.location.href = data.url as string;
    } catch (e: any) {
      console.error('billing portal failed', e);
      let code: string | undefined;
      let step: string | undefined;
      let detail: any;
      try {
        if (e?.context && typeof e.context.json === 'function') {
          const body = await e.context.json();
          code = body?.error;
          step = body?.step;
          detail = body?.detail;
          console.error('[stripe-academy-portal] response body:', body);
        }
      } catch (parseErr) {
        console.warn('[stripe-academy-portal] could not parse error body', parseErr);
      }
      const msg =
        code === 'no_paid_membership'
          ? 'No tienes una suscripción activa en esta academia.'
          : code === 'stripe_not_configured'
            ? 'El portal de pagos no está disponible por ahora. Contacta a soporte.'
            : code === 'unauthorized'
              ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
              : code === 'space_not_found'
                ? 'No encontramos esta academia.'
                : 'No pudimos abrir el portal. Intenta de nuevo.';
      toast.error(msg);
      void step;
      void detail;
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <CreditCard className="h-4 w-4 mr-1.5" />
          Gestionar suscripción
        </>
      )}
    </Button>
  );
}
