import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeFinanceSyncOptions {
  orgId: string | undefined;
  /** true = suscribir también a payouts de plataforma (vista admin) */
  includePlatformPayouts?: boolean;
}

interface SyncState {
  connected: boolean;
  lastUpdated: Date | null;
}

/**
 * Suscribe a cambios en tablas de finanzas y invalida React Query automáticamente.
 *
 * Tablas escuchadas:
 *  - client_packages   → stats agencia, ingresos por cliente, paquetes activos
 *  - content           → estado, creator_paid, editor_paid (pagos a talento)
 *  - talent_payments   → registros de pago reales
 *  - platform_payouts  → nóminas plataforma (si includePlatformPayouts=true)
 *  - creator_wallets   → saldo wallet de creadores (si includePlatformPayouts=true)
 */
export function useRealtimeFinanceSync({
  orgId,
  includePlatformPayouts = false,
}: UseRealtimeFinanceSyncOptions): SyncState {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const invalidateAgency = useCallback(() => {
    if (!orgId) return;
    setLastUpdated(new Date());
    queryClient.invalidateQueries({ queryKey: ['agency-package-stats', orgId] });
    queryClient.invalidateQueries({ queryKey: ['client-packages-revenue', orgId] });
    queryClient.invalidateQueries({ queryKey: ['active-client-packages', orgId] });
    queryClient.invalidateQueries({ queryKey: ['barter-packages', orgId] });
  }, [orgId, queryClient]);

  const invalidateTalent = useCallback(() => {
    if (!orgId) return;
    setLastUpdated(new Date());
    queryClient.invalidateQueries({ queryKey: ['payroll-summary',           orgId] });
    queryClient.invalidateQueries({ queryKey: ['content-financial-summary', orgId] });
    queryClient.invalidateQueries({ queryKey: ['pending-content-payment',   orgId] });
    queryClient.invalidateQueries({ queryKey: ['monthly-closures',          orgId] });
    queryClient.invalidateQueries({ queryKey: ['overdue-payments',          orgId] });
    queryClient.invalidateQueries({ queryKey: ['paid-closures-by-month',    orgId] });
    queryClient.invalidateQueries({ queryKey: ['talent-payments',           orgId] });
  }, [orgId, queryClient]);

  const invalidatePayouts = useCallback(() => {
    setLastUpdated(new Date());
    queryClient.invalidateQueries({ queryKey: ['all-payouts'] });
    queryClient.invalidateQueries({ queryKey: ['platform-finance-stats'] });
    if (orgId) {
      queryClient.invalidateQueries({ queryKey: ['creator-wallet', orgId] });
    }
  }, [orgId, queryClient]);

  useEffect(() => {
    if (!orgId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `finance-sync-${orgId}`;

    let channel = supabase
      .channel(channelName)
      // Paquetes de clientes
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'client_packages' },
        invalidateAgency,
      )
      // Estado de contenido y flags de pago a talento
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'content',
          filter: `organization_id=eq.${orgId}` },
        invalidateTalent,
      )
      // Registros de pagos reales
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'talent_payments',
          filter: `organization_id=eq.${orgId}` },
        invalidateTalent,
      );

    if (includePlatformPayouts) {
      channel = channel
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'platform_payouts' },
          invalidatePayouts,
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'creator_wallets' },
          invalidatePayouts,
        );
    }

    channel.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setConnected(false);
      }
    };
  }, [orgId, includePlatformPayouts, invalidateAgency, invalidateTalent, invalidatePayouts]);

  return { connected, lastUpdated };
}
