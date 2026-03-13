/**
 * ADN Research v3 - Service
 * Servicio para interactuar con el sistema de research de 22 pasos
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  AdnResearchV3Config,
  AdnResearchV3Session,
  AdnResearchV3Result,
} from "@/types/adn-research-v3";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StartResearchParams {
  productId: string;
  productDnaId: string;
  clientDnaId?: string;
  organizationId: string;
  config: AdnResearchV3Config;
}

export interface StartResearchResult {
  success: boolean;
  sessionId?: string;
  status?: string;
  error?: string;
  code?: string;
  required_tokens?: number;
  current_balance?: number;
  shortfall?: number;
}

// ─── Start Research ──────────────────────────────────────────────────────────

export async function startAdnResearchV3(
  params: StartResearchParams
): Promise<StartResearchResult> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return { success: false, error: "No autenticado" };
    }

    const response = await supabase.functions.invoke("adn-orchestrator", {
      body: {
        product_id: params.productId,
        product_dna_id: params.productDnaId,
        client_dna_id: params.clientDnaId,
        organization_id: params.organizationId,
        user_id: userData.user.id,
        config: params.config,
      },
    });

    console.log("[ADN Service] Response:", { data: response.data, error: response.error });

    // Even on HTTP errors (like 402), Supabase may include response data
    const data = response.data || {};

    // Check for insufficient tokens error - check both data and error contexts
    if (data.code === "INSUFFICIENT_TOKENS") {
      const required = data.required_tokens || 2400;
      const current = data.current_balance || 0;
      return {
        success: false,
        error: data.error || "Tokens insuficientes",
        code: "INSUFFICIENT_TOKENS",
        required_tokens: required,
        current_balance: current,
        shortfall: Math.max(0, required - current),
      };
    }

    // Check if error message indicates insufficient tokens (fallback)
    if (response.error) {
      const errorMsg = response.error.message || "";
      if (errorMsg.includes("402") || errorMsg.toLowerCase().includes("token") || errorMsg.toLowerCase().includes("insuficiente")) {
        // Try to parse error context if available
        const context = (response.error as any).context;
        if (context?.code === "INSUFFICIENT_TOKENS" || context?.required_tokens) {
          return {
            success: false,
            error: context.error || "Tokens insuficientes para ADN Recargado",
            code: "INSUFFICIENT_TOKENS",
            required_tokens: context.required_tokens || 2400,
            current_balance: context.current_balance || 0,
            shortfall: context.required_tokens ? context.required_tokens - (context.current_balance || 0) : 2400,
          };
        }
        // Default insufficient tokens response
        return {
          success: false,
          error: "Tokens insuficientes. Se requieren 2,400 tokens para el ADN Recargado v3.",
          code: "INSUFFICIENT_TOKENS",
          required_tokens: 2400,
          current_balance: 0,
          shortfall: 2400,
        };
      }
      return { success: false, error: response.error.message };
    }

    return {
      success: data.success ?? false,
      sessionId: data.session_id,
      status: data.status,
      error: data.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// ─── Get Session ─────────────────────────────────────────────────────────────

export async function getResearchSession(
  sessionId: string
): Promise<AdnResearchV3Session | null> {
  const { data, error } = await supabase
    .from("adn_research_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !data) {
    console.error("Error fetching research session:", error);
    return null;
  }

  return data as unknown as AdnResearchV3Session;
}

// ─── Poll Progress ───────────────────────────────────────────────────────────

export function pollResearchProgress(
  sessionId: string,
  onUpdate: (session: AdnResearchV3Session) => void,
  intervalMs: number = 3000,
  maxAttempts: number = 200
): () => void {
  let attempts = 0;
  let cancelled = false;

  const poll = async () => {
    if (cancelled || attempts >= maxAttempts) return;

    const session = await getResearchSession(sessionId);
    if (!session) {
      attempts++;
      setTimeout(poll, intervalMs);
      return;
    }

    onUpdate(session);

    if (session.status === "completed" || session.status === "error") {
      return; // Stop polling
    }

    attempts++;
    setTimeout(poll, intervalMs);
  };

  poll();

  return () => {
    cancelled = true;
  };
}

// ─── Get Result ──────────────────────────────────────────────────────────────

export async function getResearchResult(
  productId: string
): Promise<AdnResearchV3Result | null> {
  const { data, error } = await supabase
    .from("products")
    .select("full_research_v3")
    .eq("id", productId)
    .single();

  if (error || !data?.full_research_v3) {
    console.error("Error fetching research result:", error);
    return null;
  }

  // Handle case where data is stored as escaped JSON string
  let result = data.full_research_v3;
  if (typeof result === "string") {
    try {
      result = JSON.parse(result);
    } catch (e) {
      console.error("Error parsing full_research_v3 string:", e);
      return null;
    }
  }

  return result as AdnResearchV3Result;
}

// ─── Get Tab ─────────────────────────────────────────────────────────────────

export async function getResearchTab<T = any>(
  productId: string,
  tabKey: string
): Promise<T | null> {
  const result = await getResearchResult(productId);
  if (!result?.tabs) return null;

  const tab = result.tabs[tabKey as keyof typeof result.tabs];
  return tab ? (tab as unknown as T) : null;
}

// ─── Regenerate Tab ──────────────────────────────────────────────────────────

export interface RegenerateTabResult {
  success: boolean;
  error?: string;
  code?: string;
  tokens_used?: number;
}

export async function regenerateTab(
  sessionId: string,
  tabKey: string,
  organizationId: string
): Promise<RegenerateTabResult> {
  try {
    const response = await supabase.functions.invoke("adn-orchestrator", {
      body: {
        action: "regenerate_tab",
        session_id: sessionId,
        tab_key: tabKey,
        organization_id: organizationId,
      },
    });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return {
      success: response.data?.success ?? false,
      error: response.data?.error,
      code: response.data?.code,
      tokens_used: response.data?.tokens_used,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// ─── Get History ─────────────────────────────────────────────────────────────

export async function getResearchHistory(
  productId: string
): Promise<AdnResearchV3Session[]> {
  const { data, error } = await supabase
    .from("adn_research_sessions")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching research history:", error);
    return [];
  }

  return (data || []) as unknown as AdnResearchV3Session[];
}

// ─── Get Latest Completed Session ────────────────────────────────────────────

export async function getLatestCompletedSession(
  productId: string
): Promise<AdnResearchV3Session | null> {
  const { data, error } = await supabase
    .from("adn_research_sessions")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as AdnResearchV3Session;
}

// ─── Check Active Session ────────────────────────────────────────────────────

export async function getActiveResearchSession(
  productId: string
): Promise<AdnResearchV3Session | null> {
  const { data, error } = await supabase
    .from("adn_research_sessions")
    .select("*")
    .eq("product_id", productId)
    .in("status", ["initializing", "gathering_intelligence", "researching"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as AdnResearchV3Session;
}

// ─── Cancel Session ──────────────────────────────────────────────────────────

export async function cancelResearchSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from("adn_research_sessions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  return !error;
}

// ─── Has Completed Research ──────────────────────────────────────────────────

export async function hasCompletedResearch(productId: string): Promise<boolean> {
  const { data } = await supabase
    .from("products")
    .select("full_research_v3")
    .eq("id", productId)
    .single();

  return !!(data?.full_research_v3?.tabs);
}

// ─── Start Research Lite (n8n) ────────────────────────────────────────────────

export interface StartResearchLiteParams {
  productId: string;
  organizationId: string;
  config?: AdnResearchV3Config;
}

export interface StartResearchLiteResult {
  success: boolean;
  sessionId?: string;
  status?: string;
  error?: string;
  code?: string;
}

/**
 * Inicia el research v3 usando el orchestrator-lite que dispara n8n
 * Esta versión es más simple y no requiere configuración compleja
 * Usa fetch directo para evitar problemas con el cliente Supabase
 */
export async function startAdnResearchV3Lite(
  params: StartResearchLiteParams
): Promise<StartResearchLiteResult> {
  console.log("[ADN Service Lite] Iniciando con params:", params);

  try {
    // Obtener sesión para el token
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.error("[ADN Service Lite] Usuario no autenticado");
      return { success: false, error: "No autenticado" };
    }

    const accessToken = sessionData.session.access_token;
    // Cache-busting para evitar problemas de caché del navegador
    const functionUrl = `https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/adn-orchestrator-lite?_t=${Date.now()}`;

    console.log("[ADN Service Lite] Llamando a adn-orchestrator-lite via fetch...", functionUrl);

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        product_id: params.productId,
        organization_id: params.organizationId,
        config: params.config || {
          include_client_dna: false,
          include_social_intelligence: true,
          include_ad_intelligence: true,
        },
      }),
    });

    const data = await response.json();
    console.log("[ADN Service Lite] Response:", { status: response.status, data });

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        code: data.code,
      };
    }

    return {
      success: data.success ?? false,
      sessionId: data.session_id,
      status: data.status,
      error: data.error,
      code: data.code,
    };
  } catch (error) {
    console.error("[ADN Service Lite] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
