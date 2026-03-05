import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// ─── Fallback: query tokens directly from DB ───
async function getTokensFallback(userId: string, organizationId?: string | null): Promise<any | null> {
  try {
    let query = supabase.from('ai_token_balances').select('*');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error('[useAITokens] Fallback query error:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[useAITokens] Fallback error:', err);
    return null;
  }
}

export interface AITokenBalance {
  tokensRemaining: number;
  tokensUsedThisPeriod: number;
  monthlyTokensIncluded: number;
  purchasedTokens: number;
  periodStartDate: string | null;
  periodEndDate: string | null;
  customApiEnabled: boolean;
}

export interface AITokenTransaction {
  id: string;
  type: string;
  tokens_amount: number;
  module_key: string | null;
  action: string | null;
  description: string | null;
  created_at: string;
}

export interface UsageByModule {
  module: string;
  label: string;
  tokens: number;
  percentage: number;
}

const MODULE_LABELS: Record<string, string> = {
  scripts: "Scripts",
  research: "Research",
  board: "Board",
  talent: "Talent",
  content: "Contenido",
  live: "Live",
  portfolio: "Portafolio",
  dna: "ADN",
};

// Query directa para historial de transacciones (via balance_id)
async function getTransactionsFallback(userId: string, organizationId?: string | null, limit = 20): Promise<any[]> {
  try {
    // Primero obtener el balance_id del usuario
    let balanceQuery = supabase.from('ai_token_balances').select('id');
    if (organizationId) {
      balanceQuery = balanceQuery.eq('organization_id', organizationId);
    } else {
      balanceQuery = balanceQuery.eq('user_id', userId).is('organization_id', null);
    }
    const { data: balanceData } = await balanceQuery.limit(1).maybeSingle();

    if (!balanceData?.id) return [];

    // Ahora obtener transacciones usando balance_id
    const { data, error } = await supabase
      .from('ai_token_transactions')
      .select('*')
      .eq('balance_id', balanceData.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export function useAITokens(organizationId?: string | null) {
  const { profile, user } = useAuth();
  // null = explicitly user-level (no org fallback), undefined = use org fallback
  const orgId = organizationId === null
    ? null
    : (organizationId ?? profile?.current_organization_id ?? null);
  const [balance, setBalance] = useState<AITokenBalance | null>(null);
  const [transactions, setTransactions] = useState<AITokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Usar queries directas a la DB para evitar errores de token
      const [b, txns] = await Promise.all([
        getTokensFallback(user.id, orgId),
        getTransactionsFallback(user.id, orgId, 20),
      ]);

      if (b) {
        const totalBalance = (b.balance_subscription ?? 0) + (b.balance_purchased ?? 0) + (b.balance_bonus ?? 0);

        setBalance({
          tokensRemaining: totalBalance,
          tokensUsedThisPeriod: b.total_consumed ?? 0,
          monthlyTokensIncluded: b.monthly_allowance ?? 0,
          purchasedTokens: b.balance_purchased ?? 0,
          periodStartDate: b.last_reset_at ?? null,
          periodEndDate: b.next_reset_at ?? null,
          customApiEnabled: false,
        });
      } else {
        setBalance({
          tokensRemaining: 0,
          tokensUsedThisPeriod: 0,
          monthlyTokensIncluded: 0,
          purchasedTokens: 0,
          periodStartDate: null,
          periodEndDate: null,
          customApiEnabled: false,
        });
      }

      if (txns.length > 0) {
        setTransactions(
          txns.map((t: any) => ({
            id: t.id,
            type: t.transaction_type === "consumption" ? "usage" : t.transaction_type,
            tokens_amount: t.transaction_type === "consumption" ? -Math.abs(t.tokens) : t.tokens,
            module_key: t.action_type?.split(".")?.[0] || null,
            action: t.action_type || null,
            description: t.description || null,
            created_at: t.created_at,
          }))
        );
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.warn('[useAITokens] Error fetching data:', err);
      setBalance(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // tokensRemaining ya incluye purchasedTokens (ver línea 85)
  const totalAvailable = balance?.tokensRemaining || 0;
  const monthlyTotal =
    balance?.monthlyTokensIncluded && balance.monthlyTokensIncluded > 0
      ? balance.monthlyTokensIncluded
      : 1;
  const usedPercent =
    balance && monthlyTotal > 0
      ? Math.min(100, (balance.tokensUsedThisPeriod / monthlyTotal) * 100)
      : 0;
  const remainingPercent =
    balance && monthlyTotal > 0
      ? Math.min(100, (totalAvailable / (monthlyTotal + (balance.purchasedTokens || 0))) * 100)
      : 100;

  // Usage by module from usage transactions
  const usageByModule: UsageByModule[] = (() => {
    const byModule: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "usage" && t.tokens_amount < 0)
      .forEach((t) => {
        const key = t.module_key || "otros";
        byModule[key] = (byModule[key] || 0) + Math.abs(t.tokens_amount);
      });
    const total = Object.values(byModule).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(byModule)
      .map(([module, tokens]) => ({
        module,
        label: MODULE_LABELS[module] || module,
        tokens,
        percentage: Math.round((tokens / total) * 100),
      }))
      .sort((a, b) => b.tokens - a.tokens);
  })();

  const displayUsage =
    usageByModule.length > 0
      ? usageByModule
      : [
          { module: "scripts", label: "Scripts", tokens: 45, percentage: 45 },
          { module: "research", label: "Research", tokens: 30, percentage: 30 },
          { module: "board", label: "Board", tokens: 15, percentage: 15 },
          { module: "otros", label: "Otros", tokens: 10, percentage: 10 },
        ];

  const daysUntilReset = balance?.periodEndDate
    ? Math.max(0, Math.ceil((new Date(balance.periodEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isLowTokens =
    balance &&
    balance.monthlyTokensIncluded > 0 &&
    totalAvailable < balance.monthlyTokensIncluded * 0.2;

  const isOutOfTokens = balance && totalAvailable <= 0 && !balance.customApiEnabled;

  return {
    balance,
    transactions,
    loading,
    totalAvailable,
    usedPercent,
    remainingPercent,
    usageByModule: displayUsage,
    daysUntilReset,
    isLowTokens,
    isOutOfTokens,
    customApiEnabled: balance?.customApiEnabled ?? false,
    periodEndDate: balance?.periodEndDate ?? null,
    refetch: fetchData,
  };
}
