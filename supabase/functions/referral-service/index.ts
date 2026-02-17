// ============================================================================
// KREOON REFERRAL SERVICE
// Edge Function para gestionar el sistema de referidos perpetuos
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid token");
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = req.method === "GET" ? {} : await req.json();

    let result;

    switch (action) {
      case "generate-code":
        result = await generateReferralCode(supabase, user.id, body);
        break;
      case "get-my-codes":
        result = await getMyReferralCodes(supabase, user.id);
        break;
      case "get-my-referrals":
        result = await getMyReferrals(supabase, user.id);
        break;
      case "get-my-earnings":
        result = await getMyEarnings(supabase, user.id);
        break;
      case "validate-code":
        result = await validateReferralCode(supabase, body.code);
        break;
      case "apply-code":
        result = await applyReferralCode(supabase, user.id, body.code);
        break;
      case "track-click":
        result = await trackClick(supabase, body.code);
        break;
      case "get-dashboard":
        result = await getReferralDashboard(supabase, user.id);
        break;
      case "withdraw-earnings":
        result = await withdrawEarnings(supabase, user.id, body);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Referral error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// GENERAR CÓDIGO DE REFERIDO
// ============================================================================

async function generateReferralCode(supabase: any, userId: string, options: any = {}) {
  const { target_type = "all", custom_code } = options;

  // Verificar límite de códigos (máximo 5 por usuario)
  const { count } = await supabase
    .from("referral_codes")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (count >= 5) {
    throw new Error("Maximum number of referral codes reached (5)");
  }

  // Generar código único
  let code = custom_code;
  if (!code) {
    // Obtener nombre del usuario para generar código personalizado
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", userId)
      .single();

    const baseName = (profile?.username || profile?.full_name || "").slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    code = `${baseName || "REF"}${randomSuffix}`;
  }

  // Verificar unicidad
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("id")
    .eq("code", code)
    .single();

  if (existing) {
    // Si existe, agregar sufijo aleatorio
    code = `${code}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
  }

  // Crear código
  const { data: newCode, error } = await supabase
    .from("referral_codes")
    .insert({
      user_id: userId,
      code,
      target_type,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create code: ${error.message}`);
  }

  // Generar URL de referido
  const baseUrl = Deno.env.get("FRONTEND_URL") || "https://kreoon.com";
  const referralUrl = `${baseUrl}/r/${code}`;

  return {
    success: true,
    code: newCode.code,
    referral_url: referralUrl,
    target_type,
  };
}

// ============================================================================
// OBTENER MIS CÓDIGOS
// ============================================================================

async function getMyReferralCodes(supabase: any, userId: string) {
  const { data: codes, error } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get codes: ${error.message}`);
  }

  const baseUrl = Deno.env.get("FRONTEND_URL") || "https://kreoon.com";

  return {
    success: true,
    codes: codes.map((c: any) => ({
      ...c,
      referral_url: `${baseUrl}/r/${c.code}`,
    })),
  };
}

// ============================================================================
// OBTENER MIS REFERIDOS
// ============================================================================

async function getMyReferrals(supabase: any, userId: string) {
  const { data: referrals, error } = await supabase
    .from("referral_relationships")
    .select(`
      id,
      referred_id,
      referred_type,
      status,
      total_subscription_earned,
      total_transaction_earned,
      total_earned,
      created_at,
      referred:profiles!referral_relationships_referred_id_fkey(
        full_name,
        avatar_url
      )
    `)
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get referrals: ${error.message}`);
  }

  // Calcular estadísticas
  const stats = {
    total_referrals: referrals.length,
    active_referrals: referrals.filter((r: any) => r.status === "active").length,
    total_earned: referrals.reduce((sum: number, r: any) => sum + (r.total_earned || 0), 0),
    by_type: {
      brand: referrals.filter((r: any) => r.referred_type === "brand").length,
      creator: referrals.filter((r: any) => r.referred_type === "creator").length,
      organization: referrals.filter((r: any) => r.referred_type === "organization").length,
    },
  };

  return {
    success: true,
    referrals,
    stats,
  };
}

// ============================================================================
// OBTENER MIS GANANCIAS
// ============================================================================

async function getMyEarnings(supabase: any, userId: string) {
  // Obtener todas las ganancias
  const { data: earnings, error } = await supabase
    .from("referral_earnings")
    .select(`
      *,
      relationship:referral_relationships(
        referred:profiles!referral_relationships_referred_id_fkey(full_name)
      )
    `)
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get earnings: ${error.message}`);
  }

  // Calcular totales
  const totals = {
    pending: 0,
    credited: 0,
    paid: 0,
    total: 0,
    from_subscriptions: 0,
    from_transactions: 0,
  };

  for (const earning of earnings) {
    totals.total += earning.commission_amount;
    totals[earning.status as keyof typeof totals] += earning.commission_amount;
    
    if (earning.source_type === "subscription") {
      totals.from_subscriptions += earning.commission_amount;
    } else {
      totals.from_transactions += earning.commission_amount;
    }
  }

  // Obtener balance disponible para retiro
  const { data: wallet } = await supabase
    .from("unified_wallets")
    .select("balance_available")
    .eq("user_id", userId)
    .single();

  return {
    success: true,
    earnings,
    totals,
    available_for_withdrawal: wallet?.balance_available || 0,
  };
}

// ============================================================================
// VALIDAR CÓDIGO (Sin autenticación para landing pages)
// ============================================================================

async function validateReferralCode(supabase: any, code: string) {
  if (!code) {
    return { success: false, valid: false, error: "No code provided" };
  }

  const { data: referralCode } = await supabase
    .from("referral_codes")
    .select(`
      id,
      code,
      target_type,
      is_active,
      expires_at,
      max_uses,
      conversions,
      user:profiles!referral_codes_user_id_fkey(
        full_name,
        avatar_url
      )
    `)
    .eq("code", code.toUpperCase())
    .single();

  if (!referralCode) {
    return { success: true, valid: false, error: "Code not found" };
  }

  // Verificar si está activo
  if (!referralCode.is_active) {
    return { success: true, valid: false, error: "Code is inactive" };
  }

  // Verificar expiración
  if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
    return { success: true, valid: false, error: "Code has expired" };
  }

  // Verificar límite de usos
  if (referralCode.max_uses && referralCode.conversions >= referralCode.max_uses) {
    return { success: true, valid: false, error: "Code usage limit reached" };
  }

  return {
    success: true,
    valid: true,
    code: referralCode.code,
    target_type: referralCode.target_type,
    referrer: {
      name: referralCode.user?.full_name,
      avatar: referralCode.user?.avatar_url,
    },
  };
}

// ============================================================================
// APLICAR CÓDIGO (Durante registro)
// ============================================================================

async function applyReferralCode(supabase: any, userId: string, code: string) {
  // Verificar que el usuario no ya tiene un referidor
  const { data: existingRelation } = await supabase
    .from("referral_relationships")
    .select("id")
    .eq("referred_id", userId)
    .single();

  if (existingRelation) {
    throw new Error("User already has a referrer");
  }

  // Validar código
  const { data: referralCode } = await supabase
    .from("referral_codes")
    .select("user_id, is_active")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  if (!referralCode) {
    throw new Error("Invalid referral code");
  }

  // No puede referirse a sí mismo
  if (referralCode.user_id === userId) {
    throw new Error("Cannot use your own referral code");
  }

  // Obtener wallet del referidor
  const { data: referrerWallet } = await supabase
    .from("unified_wallets")
    .select("id")
    .eq("user_id", referralCode.user_id)
    .single();

  // Obtener wallet del referido
  const { data: referredWallet } = await supabase
    .from("unified_wallets")
    .select("id")
    .eq("user_id", userId)
    .single();

  // Obtener tipo del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const referredType = profile?.role === "brand" ? "brand" : "creator";

  // Crear relación
  const { data: relation, error } = await supabase
    .from("referral_relationships")
    .insert({
      referrer_id: referralCode.user_id,
      referrer_wallet_id: referrerWallet?.id,
      referred_id: userId,
      referred_wallet_id: referredWallet?.id,
      referral_code: code.toUpperCase(),
      referred_type: referredType,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to apply code: ${error.message}`);
  }

  // Incrementar registrations en el código atómicamente
  const { data: codeRow } = await supabase
    .from("referral_codes")
    .select("id")
    .eq("code", code.toUpperCase())
    .single();

  if (codeRow) {
    await supabase.rpc("increment_column", {
      p_table: "referral_codes",
      p_column: "registrations",
      p_amount: 1,
      p_id: codeRow.id,
    });
  }

  return {
    success: true,
    message: "Referral code applied successfully",
    relationship_id: relation.id,
  };
}

// ============================================================================
// TRACKEAR CLICK
// ============================================================================

async function trackClick(supabase: any, code: string) {
  if (!code) {
    return { success: false };
  }

  // Incrementar clicks atómicamente
  const { data: clickCode } = await supabase
    .from("referral_codes")
    .select("id")
    .eq("code", code.toUpperCase())
    .single();

  if (clickCode) {
    await supabase.rpc("increment_column", {
      p_table: "referral_codes",
      p_column: "clicks",
      p_amount: 1,
      p_id: clickCode.id,
    });
  }

  return { success: true };
}

// ============================================================================
// DASHBOARD DE REFERIDOS
// ============================================================================

async function getReferralDashboard(supabase: any, userId: string) {
  // Obtener códigos
  const codesResult = await getMyReferralCodes(supabase, userId);
  
  // Obtener referidos
  const referralsResult = await getMyReferrals(supabase, userId);
  
  // Obtener ganancias
  const earningsResult = await getMyEarnings(supabase, userId);

  // Calcular métricas adicionales
  const totalClicks = codesResult.codes.reduce((sum: number, c: any) => sum + c.clicks, 0);
  const totalRegistrations = codesResult.codes.reduce((sum: number, c: any) => sum + c.registrations, 0);
  const conversionRate = totalClicks > 0 ? (totalRegistrations / totalClicks * 100).toFixed(2) : 0;

  // Ganancias del mes actual
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyEarnings = earningsResult.earnings
    .filter((e: any) => new Date(e.created_at) >= startOfMonth)
    .reduce((sum: number, e: any) => sum + e.commission_amount, 0);

  return {
    success: true,
    codes: codesResult.codes,
    referrals: referralsResult.referrals,
    recent_earnings: earningsResult.earnings.slice(0, 10),
    metrics: {
      total_clicks: totalClicks,
      total_registrations: totalRegistrations,
      conversion_rate: `${conversionRate}%`,
      total_referrals: referralsResult.stats.total_referrals,
      active_referrals: referralsResult.stats.active_referrals,
      total_earned: earningsResult.totals.total,
      this_month_earned: monthlyEarnings,
      available_for_withdrawal: earningsResult.available_for_withdrawal,
      by_type: referralsResult.stats.by_type,
      earnings_by_source: {
        subscriptions: earningsResult.totals.from_subscriptions,
        transactions: earningsResult.totals.from_transactions,
      },
    },
    rates: {
      subscription: "20%",
      transaction: "5% (del fee de plataforma)",
      duration: "Perpetuo mientras ambas cuentas estén activas",
    },
  };
}

// ============================================================================
// SOLICITAR RETIRO DE GANANCIAS
// ============================================================================

async function withdrawEarnings(supabase: any, userId: string, body: any) {
  const { amount, method, payment_details } = body;

  // Verificar balance disponible
  const { data: wallet } = await supabase
    .from("unified_wallets")
    .select("id, balance_available")
    .eq("user_id", userId)
    .single();

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  if (wallet.balance_available < amount) {
    throw new Error(`Insufficient balance. Available: $${wallet.balance_available}`);
  }

  // Obtener fees del método
  const { data: feeConfig } = await supabase
    .from("pricing_configuration")
    .select("config_value")
    .eq("config_key", "withdrawal_fees")
    .single();

  const methodFees = feeConfig?.config_value?.[method];
  if (!methodFees) {
    throw new Error(`Invalid withdrawal method: ${method}`);
  }

  // Verificar mínimo
  if (amount < methodFees.minimum) {
    throw new Error(`Minimum withdrawal for ${method}: ${methodFees.minimum} ${methodFees.currency}`);
  }

  // Calcular fees
  const feeFixed = methodFees.fixed || 0;
  const feePercentage = methodFees.percentage || 0;
  const feeTotal = feeFixed + (amount * feePercentage);
  const netAmount = amount - feeTotal;

  // Crear solicitud de retiro
  const { data: withdrawal, error } = await supabase
    .from("withdrawal_requests")
    .insert({
      wallet_id: wallet.id,
      user_id: userId,
      amount,
      currency: "USD",
      fee_fixed: feeFixed,
      fee_percentage: feePercentage,
      fee_total: feeTotal,
      net_amount: netAmount,
      method,
      payment_details,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create withdrawal: ${error.message}`);
  }

  // Reservar fondos atómicamente via RPC
  await supabase.rpc("update_wallet_balance", {
    p_wallet_id: wallet.id,
    p_available_delta: -amount,
    p_reserved_delta: amount,
  });

  // Registrar transacción
  await supabase.from("unified_transactions").insert({
    wallet_id: wallet.id,
    transaction_type: "withdrawal",
    status: "pending",
    amount: -amount,
    fee: feeTotal,
    description: `Withdrawal via ${method}`,
  });

  return {
    success: true,
    withdrawal_id: withdrawal.id,
    amount,
    fee_total: feeTotal,
    net_amount: netAmount,
    method,
    status: "pending",
    message: "Withdrawal request submitted. Processing time: 1-3 business days.",
  };
}
