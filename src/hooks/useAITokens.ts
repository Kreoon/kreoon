import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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

async function invokeTokenService<T = any>(action: string, body?: Record<string, any>): Promise<T | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase.functions.invoke(`ai-tokens-service/${action}`, {
    body: body || {},
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error || data?.error) return null;
  return data as T;
}

export function useAITokens(organizationId?: string) {
  const { profile, user } = useAuth();
  const orgId = organizationId ?? profile?.current_organization_id ?? null;
  const [balance, setBalance] = useState<AITokenBalance | null>(null);
  const [transactions, setTransactions] = useState<AITokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!orgId && !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [balanceRes, historyRes] = await Promise.all([
        invokeTokenService<{ success: boolean; balance: any }>("get-balance", {
          organization_id: orgId || undefined,
        }),
        invokeTokenService<{ success: boolean; transactions: any[]; stats: any }>("get-history", {
          organization_id: orgId || undefined,
          limit: 20,
        }),
      ]);

      if (balanceRes?.success && balanceRes.balance) {
        const b = balanceRes.balance;
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

      if (historyRes?.success && historyRes.transactions) {
        setTransactions(
          historyRes.transactions.map((t: any) => ({
            id: t.id,
            type: t.transaction_type === "consumption" ? "usage" : t.transaction_type,
            tokens_amount: t.transaction_type === "consumption" ? -Math.abs(t.tokens) : t.tokens,
            module_key: t.action_type?.split(".")?.[0] || null,
            action: t.action_type || null,
            description: null,
            created_at: t.created_at,
          }))
        );
      } else {
        setTransactions([]);
      }
    } catch {
      setBalance(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalAvailable = balance
    ? balance.tokensRemaining + balance.purchasedTokens
    : 0;
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
