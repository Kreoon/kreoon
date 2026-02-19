// ============================================================================
// KREOON REFERRAL SERVICE
// Edge Function para gestionar el sistema de referidos perpetuos
// Enhanced: tiers, bilateral rewards, leaderboard, promos, nurture
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = req.method === "GET" ? {} : await req.json();

    // Public actions that don't require authentication (for landing pages)
    const PUBLIC_ACTIONS = [
      "validate-code", "track-click",
      "get-tiers", "get-leaderboard", "get-promo-campaigns",
    ];

    if (PUBLIC_ACTIONS.includes(action || "")) {
      let result;
      switch (action) {
        case "validate-code":
          result = await validateReferralCode(supabase, body.code);
          break;
        case "track-click":
          result = await trackClick(supabase, body.code);
          break;
        case "get-tiers":
          result = await getTiers(supabase);
          break;
        case "get-leaderboard":
          result = await getLeaderboard(supabase, body.month);
          break;
        case "get-promo-campaigns":
          result = await getPromoCampaigns(supabase);
          break;
        default:
          result = { error: "Unknown public action" };
      }
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All other actions require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid token");
    }

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
      case "apply-code":
        result = await applyReferralCode(supabase, user.id, body.code);
        break;
      case "get-dashboard":
        result = await getReferralDashboard(supabase, user.id);
        break;
      case "withdraw-earnings":
        result = await withdrawEarnings(supabase, user.id, body);
        break;
      case "update-slug":
        result = await updateSlug(supabase, user.id, body);
        break;
      case "check-nurture":
        result = await checkNurture(supabase, user.id);
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
// PUBLIC: GET TIERS
// ============================================================================

async function getTiers(supabase: any) {
  const { data: tiers, error } = await supabase
    .from("referral_tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Failed to get tiers: ${error.message}`);

  return { success: true, tiers };
}

// ============================================================================
// PUBLIC: GET LEADERBOARD
// ============================================================================

async function getLeaderboard(supabase: any, month?: string) {
  const period = month || new Date().toISOString().slice(0, 7);

  const { data: entries, error } = await supabase
    .from("referral_leaderboard")
    .select("*")
    .eq("period_month", period)
    .order("rank_position", { ascending: true })
    .limit(50);

  if (error) throw new Error(`Failed to get leaderboard: ${error.message}`);

  // Enrich with profile data
  const userIds = (entries || []).map((e: any) => e.user_id);
  let profileMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, referral_tier")
      .in("id", userIds);
    for (const p of profiles || []) {
      profileMap[p.id] = p;
    }
  }

  const leaderboard = (entries || []).map((e: any) => ({
    ...e,
    full_name: profileMap[e.user_id]?.full_name || null,
    avatar_url: profileMap[e.user_id]?.avatar_url || null,
    referral_tier: profileMap[e.user_id]?.referral_tier || "starter",
  }));

  return { success: true, leaderboard };
}

// ============================================================================
// PUBLIC: GET ACTIVE PROMO CAMPAIGNS
// ============================================================================

async function getPromoCampaigns(supabase: any) {
  const now = new Date().toISOString();

  const { data: campaigns, error } = await supabase
    .from("promotional_campaigns")
    .select("*")
    .eq("is_active", true)
    .lte("start_date", now)
    .gte("end_date", now)
    .order("end_date", { ascending: true });

  if (error) throw new Error(`Failed to get promo campaigns: ${error.message}`);

  // Filter out maxed-out campaigns
  const available = (campaigns || []).filter(
    (c: any) => !c.max_redemptions || c.current_redemptions < c.max_redemptions
  );

  return { success: true, campaigns: available };
}

// ============================================================================
// AUTH: CHECK NURTURE STATUS
// ============================================================================

async function checkNurture(supabase: any, userId: string) {
  const { data } = await supabase
    .from("referral_nurture_queue")
    .select("has_creator_profile, has_avatar, has_portfolio, is_qualified, completed_at")
    .eq("referred_id", userId)
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      has_creator_profile: false,
      has_avatar: false,
      has_portfolio: false,
      is_qualified: false,
      completed_at: null,
    };
  }

  return data;
}

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
  // Step 1: Get referral relationships
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
      referrer_coins_awarded,
      referred_coins_awarded,
      created_at
    `)
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get referrals: ${error.message}`);
  }

  // Step 2: Enrich with profile data (separate query — FK goes to auth.users, not profiles)
  const referredIds = (referrals || []).map((r: any) => r.referred_id).filter(Boolean);
  let profileMap: Record<string, any> = {};
  if (referredIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", referredIds);
    for (const p of profiles || []) {
      profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
    }
  }
  // Attach profile info to each referral
  for (const r of referrals || []) {
    r.referred = profileMap[r.referred_id] || { full_name: null, avatar_url: null };
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
  // Step 1: Get earnings with relationship data (no nested profile join — FK goes to auth.users)
  const { data: earnings, error } = await supabase
    .from("referral_earnings")
    .select(`
      *,
      relationship:referral_relationships(
        referred_id
      )
    `)
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get earnings: ${error.message}`);
  }

  // Step 2: Enrich with profile names
  const referredIds = (earnings || [])
    .map((e: any) => e.relationship?.referred_id)
    .filter(Boolean);
  if (referredIds.length > 0) {
    const uniqueIds = [...new Set(referredIds)] as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", uniqueIds);
    const profileMap: Record<string, string> = {};
    for (const p of profiles || []) {
      profileMap[p.id] = p.full_name;
    }
    for (const e of earnings || []) {
      if (e.relationship) {
        e.relationship.referred = {
          full_name: profileMap[e.relationship.referred_id] || null,
        };
      }
    }
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
    .select("available_balance")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return {
    success: true,
    earnings,
    totals,
    available_for_withdrawal: wallet?.available_balance || 0,
  };
}

// ============================================================================
// VALIDAR CÓDIGO (Sin autenticación para landing pages)
// ============================================================================

async function validateReferralCode(supabase: any, code: string) {
  if (!code) {
    return { success: false, valid: false, error: "No code provided" };
  }

  // Query code without FK join (FK points to auth.users, not profiles)
  const { data: referralCode } = await supabase
    .from("referral_codes")
    .select("id, code, target_type, is_active, expires_at, max_uses, conversions, user_id, referred_discount_percent, referred_bonus_coins")
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

  // Fetch referrer profile separately
  let referrerName = null;
  let referrerAvatar = null;
  let referrerTier = "starter";
  if (referralCode.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, referral_tier")
      .eq("id", referralCode.user_id)
      .single();
    referrerName = profile?.full_name || null;
    referrerAvatar = profile?.avatar_url || null;
    referrerTier = profile?.referral_tier || "starter";
  }

  // Check active promo
  const promosResult = await getPromoCampaigns(supabase);
  const activePromo = promosResult.campaigns?.[0] || null;

  return {
    success: true,
    valid: true,
    code: referralCode.code,
    target_type: referralCode.target_type,
    referrer: {
      name: referrerName,
      avatar: referrerAvatar,
      tier: referrerTier,
    },
    rewards: {
      discount_percent: activePromo?.referred_discount_percent || referralCode.referred_discount_percent || 30,
      bonus_coins: activePromo?.referred_bonus_coins || referralCode.referred_bonus_coins || 25,
    },
    active_promo: activePromo,
  };
}

// ============================================================================
// APLICAR CÓDIGO (Durante registro)
// ============================================================================

async function ensureUserWallet(supabase: any, userId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from("unified_wallets")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  // Auto-create wallet if missing
  const { data: created } = await supabase
    .from("unified_wallets")
    .insert({ user_id: userId, wallet_type: "personal" })
    .select("id")
    .single();

  return created?.id || null;
}

async function applyReferralCode(supabase: any, userId: string, code: string) {
  // Verificar que el usuario no ya tiene un referidor
  const { data: existingRelation } = await supabase
    .from("referral_relationships")
    .select("id")
    .eq("referred_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingRelation) {
    throw new Error("User already has a referrer");
  }

  // Validar código
  const { data: referralCode } = await supabase
    .from("referral_codes")
    .select("id, user_id, is_active, conversions, max_uses, referred_bonus_coins, referrer_bonus_coins")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!referralCode) {
    throw new Error("Invalid referral code");
  }

  // No puede referirse a sí mismo
  if (referralCode.user_id === userId) {
    throw new Error("Cannot use your own referral code");
  }

  // Verificar max_uses
  if (referralCode.max_uses && referralCode.conversions >= referralCode.max_uses) {
    throw new Error("Referral code has reached its maximum uses");
  }

  // Ensure wallets exist for both parties
  const referrerWalletId = await ensureUserWallet(supabase, referralCode.user_id);
  const referredWalletId = await ensureUserWallet(supabase, userId);

  // Obtener tipo del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  const referredType = profile?.role === "brand" ? "brand" : "creator";

  // Crear relación
  const { data: relation, error } = await supabase
    .from("referral_relationships")
    .insert({
      referrer_id: referralCode.user_id,
      referrer_wallet_id: referrerWalletId,
      referred_id: userId,
      referred_wallet_id: referredWalletId,
      referral_code: code.toUpperCase(),
      referred_type: referredType,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to apply code: ${error.message}`);
  }

  // Incrementar registrations Y conversions en el código atómicamente
  await supabase.rpc("increment_column", {
    p_table: "referral_codes",
    p_column: "registrations",
    p_amount: 1,
    p_id: referralCode.id,
  });
  await supabase.rpc("increment_column", {
    p_table: "referral_codes",
    p_column: "conversions",
    p_amount: 1,
    p_id: referralCode.id,
  });

  // ─── BILATERAL: Award welcome coins to referred user ───
  const welcomeCoins = referralCode.referred_bonus_coins || 25;
  try {
    await supabase.rpc("award_referral_coins", {
      p_user_id: userId,
      p_org_id: null,
      p_amount: welcomeCoins,
      p_reason: "referral_welcome",
    });

    // Track coins on relationship
    await supabase
      .from("referral_relationships")
      .update({ referred_coins_awarded: welcomeCoins })
      .eq("id", relation.id);
  } catch (e) {
    console.error("Error awarding welcome coins:", e);
  }

  // ─── Check active promo and apply extra bonuses ───
  try {
    const promosResult = await getPromoCampaigns(supabase);
    const activePromo = promosResult.campaigns?.[0];
    if (activePromo) {
      // Insert campaign redemption
      await supabase.from("campaign_redemptions").insert({
        campaign_id: activePromo.id,
        user_id: userId,
        referral_code_used: code.toUpperCase(),
        free_months_granted: activePromo.referral_extra_free_months || 0,
        bonus_coins_granted: activePromo.referred_bonus_coins || 0,
      });

      // Increment campaign redemptions
      await supabase.rpc("increment_column", {
        p_table: "promotional_campaigns",
        p_column: "current_redemptions",
        p_amount: 1,
        p_id: activePromo.id,
      });

      // Award extra promo coins if different from base
      const promoExtraCoins = (activePromo.referred_bonus_coins || 0) - welcomeCoins;
      if (promoExtraCoins > 0) {
        await supabase.rpc("award_referral_coins", {
          p_user_id: userId,
          p_org_id: null,
          p_amount: promoExtraCoins,
          p_reason: "promo_bonus_" + activePromo.slug,
        });
      }
    }
  } catch (e) {
    console.error("Error applying promo:", e);
  }

  // Note: referrer coins (50) are awarded later when referral QUALIFIES (via DB trigger)

  return {
    success: true,
    message: "Referral code applied successfully",
    relationship_id: relation.id,
    welcome_coins: welcomeCoins,
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
// DASHBOARD DE REFERIDOS (ENHANCED)
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

  // ─── Enhanced: Get user tier from profile ───
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_tier")
    .eq("id", userId)
    .single();

  const currentTierKey = profile?.referral_tier || "starter";

  // Get tier details
  const { data: currentTierData } = await supabase
    .from("referral_tiers")
    .select("*")
    .eq("tier_key", currentTierKey)
    .single();

  // Calculate effective rate
  const baseRate = 20;
  const bonusPercent = currentTierData?.bonus_subscription_percent || 0;
  const effectiveRate = baseRate + bonusPercent;

  // Get next tier
  const TIER_ORDER = ["starter", "ambassador", "champion", "elite", "legend"];
  const currentIndex = TIER_ORDER.indexOf(currentTierKey);
  let nextTier = null;
  if (currentIndex < TIER_ORDER.length - 1) {
    const nextKey = TIER_ORDER[currentIndex + 1];
    const { data: nextTierData } = await supabase
      .from("referral_tiers")
      .select("*")
      .eq("tier_key", nextKey)
      .single();
    if (nextTierData) {
      nextTier = {
        key: nextKey,
        label: nextTierData.label,
        referrals_needed: nextTierData.min_referrals - referralsResult.stats.active_referrals,
        bonus_percent: nextTierData.bonus_subscription_percent,
      };
    }
  }

  // Get leaderboard rank
  const period = now.toISOString().slice(0, 7);
  const { data: rankData } = await supabase
    .from("referral_leaderboard")
    .select("rank_position")
    .eq("user_id", userId)
    .eq("period_month", period)
    .limit(1)
    .maybeSingle();

  // Get active promo
  const promosResult = await getPromoCampaigns(supabase);
  const activePromo = promosResult.campaigns?.[0] || null;

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
      subscription: `${effectiveRate}%`,
      transaction: "5% (del fee de plataforma)",
      duration: "Perpetuo mientras ambas cuentas esten activas",
    },
    // Enhanced fields
    tier: {
      current: currentTierKey,
      label: currentTierData?.label || "Starter",
      effective_rate: effectiveRate,
      bonus_percent: bonusPercent,
    },
    next_tier: nextTier,
    leaderboard_rank: rankData?.rank_position || null,
    active_promo: activePromo,
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
    .select("id, available_balance")
    .eq("user_id", userId)
    .single();

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  if (wallet.available_balance < amount) {
    throw new Error(`Insufficient balance. Available: $${wallet.available_balance}`);
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
      fee: feeTotal,
      net_amount: netAmount,
      payment_method: method,
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

// ============================================================================
// ACTUALIZAR SLUG PERSONALIZADO
// ============================================================================

async function updateSlug(supabase: any, userId: string, body: any) {
  const { code_id, new_slug } = body;

  if (!code_id || !new_slug) {
    throw new Error("code_id and new_slug are required");
  }

  // Verify ownership of the code
  const { data: code } = await supabase
    .from("referral_codes")
    .select("id, user_id, code")
    .eq("id", code_id)
    .single();

  if (!code) {
    throw new Error("Referral code not found");
  }

  if (code.user_id !== userId) {
    throw new Error("You don't own this referral code");
  }

  // Validate the new slug via RPC
  const { data: validation, error: valError } = await supabase.rpc("validate_referral_slug", {
    p_slug: new_slug,
  });

  if (valError) {
    throw new Error(`Validation error: ${valError.message}`);
  }

  if (!validation.valid) {
    throw new Error(validation.error || "Slug no valido");
  }

  const normalized = validation.normalized;

  // Update the code
  const { error: updateError } = await supabase
    .from("referral_codes")
    .update({ code: normalized })
    .eq("id", code_id);

  if (updateError) {
    throw new Error(`Failed to update slug: ${updateError.message}`);
  }

  const baseUrl = Deno.env.get("FRONTEND_URL") || "https://kreoon.com";

  return {
    success: true,
    code: normalized,
    referral_url: `${baseUrl}/r/${normalized}`,
  };
}
