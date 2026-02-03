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
};

export function useAITokens(organizationId?: string) {
  const { profile } = useAuth();
  const orgId = organizationId ?? profile?.current_organization_id ?? null;
  const [balance, setBalance] = useState<AITokenBalance | null>(null);
  const [transactions, setTransactions] = useState<AITokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tokensRes, txRes] = await Promise.all([
        supabase
          .from("organization_ai_tokens")
          .select("*")
          .eq("organization_id", orgId)
          .maybeSingle(),
        supabase
          .from("ai_token_transactions")
          .select("id, type, tokens_amount, module_key, action, description, created_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      // Si las tablas no existen (404) o hay error, usar valores por defecto
      const tokensData = tokensRes.error ? null : tokensRes.data;
      const txData = txRes.error ? [] : (txRes.data ?? []);

      if (tokensData) {
        const d = tokensRes.data as any;
        setBalance({
          tokensRemaining: d.tokens_remaining ?? 0,
          tokensUsedThisPeriod: d.tokens_used_this_period ?? 0,
          monthlyTokensIncluded: d.monthly_tokens_included ?? 0,
          purchasedTokens: d.purchased_tokens ?? 0,
          periodStartDate: d.period_start_date ?? null,
          periodEndDate: d.period_end_date ?? null,
          customApiEnabled: d.custom_api_enabled ?? false,
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

      setTransactions((txData as AITokenTransaction[]) ?? []);
    } catch {
      setBalance(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

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

  // If no usage data, show default distribution
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
