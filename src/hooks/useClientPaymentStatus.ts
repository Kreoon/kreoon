/**
 * Hook para detectar el estado de pagos del cliente
 * Usado para bloquear descargas cuando hay pagos vencidos
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStatus {
  hasExpiredPayment: boolean;
  expiredAmount: number;
  nextDueDate: Date | null;
  loading: boolean;
}

export function useClientPaymentStatus(clientId: string | null): PaymentStatus {
  const [status, setStatus] = useState<PaymentStatus>({
    hasExpiredPayment: false,
    expiredAmount: 0,
    nextDueDate: null,
    loading: true,
  });

  useEffect(() => {
    if (!clientId) {
      setStatus({
        hasExpiredPayment: false,
        expiredAmount: 0,
        nextDueDate: null,
        loading: false,
      });
      return;
    }

    const checkPayments = async () => {
      try {
        const { data: packages } = await supabase
          .from('client_packages')
          .select('total_value, paid_amount, payment_due_date, payment_status')
          .eq('client_id', clientId)
          .neq('payment_status', 'paid');

        if (!packages || packages.length === 0) {
          setStatus({
            hasExpiredPayment: false,
            expiredAmount: 0,
            nextDueDate: null,
            loading: false,
          });
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filtrar paquetes con pagos vencidos
        const expiredPackages = packages.filter(p =>
          p.payment_due_date && new Date(p.payment_due_date) < today
        );

        // Calcular monto vencido
        const expiredAmount = expiredPackages.reduce((sum, p) =>
          sum + (Number(p.total_value || 0) - Number(p.paid_amount || 0)), 0
        );

        // Encontrar próxima fecha de vencimiento
        const futureDates = packages
          .filter(p => p.payment_due_date && new Date(p.payment_due_date) >= today)
          .map(p => new Date(p.payment_due_date!))
          .sort((a, b) => a.getTime() - b.getTime());

        setStatus({
          hasExpiredPayment: expiredPackages.length > 0,
          expiredAmount,
          nextDueDate: futureDates[0] || null,
          loading: false,
        });
      } catch (error) {
        console.error('[useClientPaymentStatus] Error:', error);
        setStatus({
          hasExpiredPayment: false,
          expiredAmount: 0,
          nextDueDate: null,
          loading: false,
        });
      }
    };

    checkPayments();
  }, [clientId]);

  return status;
}
