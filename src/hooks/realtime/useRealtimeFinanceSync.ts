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
 * Suscribe a cambios en TODAS las tablas financieras críticas y dispara
 * invalidaciones de React Query con debounce de 300ms.
 *
 * Tablas escuchadas:
 *  - client_packages              → paquetes (stats, ingresos, pendientes)
 *  - client_package_payments      → abonos registrados
 *  - content                      → estado, creator_paid, editor_paid (talento)
 *  - talent_payments              → liquidaciones de talento
 *  - package_costs                → costos por paquete
 *  - org_financial_costs          → costos operativos
 *  - org_financial_closings       → cierres financieros
 *  - platform_payouts, wallets    → solo si includePlatformPayouts
 */
export function useRealtimeFinanceSync({
  orgId,
  includePlatformPayouts = false,
}: UseRealtimeFinanceSyncOptions): SyncState {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Id unico por instancia — evita colision de canal con otro hook montado
  // para la misma org (ej. una vista admin con includePlatformPayouts=true
  // y una vista normal con false, antes compartian el mismo nombre de canal).
  const instanceIdRef = useRef(Math.random().toString(36).slice(2, 10));

  // Debounce de invalidaciones — agrupa eventos seguidos en una sola ronda
  const pendingInvalidations = useRef<Set<string>>(new Set());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushInvalidations = useCallback(() => {
    if (pendingInvalidations.current.size === 0) return;
    setLastUpdated(new Date());
    for (const keyJson of pendingInvalidations.current) {
      const key = JSON.parse(keyJson) as unknown[];
      queryClient.invalidateQueries({ queryKey: key });
    }
    pendingInvalidations.current.clear();
  }, [queryClient]);

  const scheduleInvalidations = useCallback((keys: unknown[][]) => {
    for (const key of keys) {
      pendingInvalidations.current.add(JSON.stringify(key));
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(flushInvalidations, 300);
  }, [flushInvalidations]);

  // Grupos de invalidación
  const invalidateAgency = useCallback(() => {
    if (!orgId) return;
    scheduleInvalidations([
      ['agency-package-stats', orgId],
      ['client-packages-revenue', orgId],
      ['active-client-packages', orgId],
      ['barter-packages', orgId],
      ['receivables-aging', orgId],
      ['package-profitability', orgId],
      ['cash-flow-forecast', orgId],
      ['org-finance-overview', orgId],
      ['financial-period-summary', orgId],
    ]);
  }, [orgId, scheduleInvalidations]);

  const invalidatePayments = useCallback(() => {
    if (!orgId) return;
    scheduleInvalidations([
      ['package-payments'],
      ['active-client-packages', orgId],
      ['client-packages-revenue', orgId],
      ['agency-package-stats', orgId],
      ['receivables-aging', orgId],
      ['package-profitability', orgId],
      ['cash-flow-forecast', orgId],
      ['org-finance-overview', orgId],
      ['org-costs-overview', orgId],
      ['financial-period-summary', orgId],
    ]);
  }, [orgId, scheduleInvalidations]);

  const invalidateCosts = useCallback(() => {
    if (!orgId) return;
    scheduleInvalidations([
      ['financial-costs', orgId],
      ['org-costs-overview', orgId],
      ['org-finance-overview', orgId],
      ['financial-period-summary', orgId],
      ['package-profitability', orgId],
    ]);
  }, [orgId, scheduleInvalidations]);

  const invalidateClosings = useCallback(() => {
    if (!orgId) return;
    scheduleInvalidations([
      ['financial-closings', orgId],
    ]);
  }, [orgId, scheduleInvalidations]);

  const invalidatePackageCosts = useCallback(() => {
    if (!orgId) return;
    scheduleInvalidations([
      ['package-costs'],
      ['package-profitability', orgId],
      ['cash-flow-forecast', orgId],
    ]);
  }, [orgId, scheduleInvalidations]);

  const invalidateTalent = useCallback(() => {
    if (!orgId) return;
    scheduleInvalidations([
      ['payroll-summary', orgId],
      ['content-financial-summary', orgId],
      ['pending-content-payment', orgId],
      ['monthly-closures', orgId],
      ['overdue-payments', orgId],
      ['paid-closures-by-month', orgId],
      ['talent-payments', orgId],
      ['org-payroll-overview', orgId],
      ['org-finance-overview', orgId],
    ]);
  }, [orgId, scheduleInvalidations]);

  const invalidatePayouts = useCallback(() => {
    scheduleInvalidations([
      ['all-payouts'],
      ['platform-finance-stats'],
      ...(orgId ? [['creator-wallet', orgId]] : []),
    ]);
  }, [orgId, scheduleInvalidations]);

  useEffect(() => {
    if (!orgId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `finance-sync-${orgId}-${includePlatformPayouts ? 'platform' : 'org'}-${instanceIdRef.current}`;

    let channel = supabase
      .channel(channelName)
      // Paquetes de clientes
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'client_packages' },
        invalidateAgency,
      )
      // Abonos
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'client_package_payments',
          filter: `organization_id=eq.${orgId}` },
        invalidatePayments,
      )
      // Costos operativos
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'org_financial_costs',
          filter: `organization_id=eq.${orgId}` },
        invalidateCosts,
      )
      // Cierres financieros
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'org_financial_closings',
          filter: `organization_id=eq.${orgId}` },
        invalidateClosings,
      )
      // Costos por paquete
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'package_costs',
          filter: `organization_id=eq.${orgId}` },
        invalidatePackageCosts,
      )
      // Estado de contenido y flags de pago a talento
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'content',
          filter: `organization_id=eq.${orgId}` },
        invalidateTalent,
      )
      // Liquidaciones de talento
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

    const pendingRef = pendingInvalidations;
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      pendingRef.current.clear();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setConnected(false);
      }
    };
  }, [
    orgId, includePlatformPayouts,
    invalidateAgency, invalidatePayments, invalidateCosts,
    invalidateClosings, invalidatePackageCosts, invalidateTalent, invalidatePayouts,
  ]);

  return { connected, lastUpdated };
}
