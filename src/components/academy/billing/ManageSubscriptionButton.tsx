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
      const msg = e?.message ?? 'No pudimos abrir el portal. Intenta de nuevo.';
      toast.error(msg);
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
