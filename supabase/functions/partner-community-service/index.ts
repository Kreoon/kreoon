// ============================================================================
// KREOON PARTNER COMMUNITY SERVICE
// Edge Function para gestionar comunidades de partners y sus beneficios
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ValidateRequest {
  slug: string;
}

interface ApplyRequest {
  community_slug: string;
  brand_id?: string;
}

interface CheckMembershipRequest {
  community_slug?: string;
  brand_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json().catch(() => ({}));

    let result;

    switch (action) {
      // Acciones públicas (no requieren auth)
      case "validate":
        result = await validateCommunity(supabase, body as ValidateRequest);
        break;
      case "get-info":
        result = await getCommunityInfo(supabase, body.slug);
        break;

      // Acciones que requieren autenticación
      case "apply":
      case "check-membership": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          throw new Error("Se requiere autenticación para esta acción");
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          throw new Error("Token inválido");
        }

        if (action === "apply") {
          result = await applyToCommunity(supabase, user.id, body as ApplyRequest);
        } else {
          result = await checkMembership(supabase, user.id, body as CheckMembershipRequest);
        }
        break;
      }

      default:
        throw new Error(`Acción desconocida: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Partner community error:", error?.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// VALIDAR COMUNIDAD (público)
// ============================================================================

async function validateCommunity(supabase: any, request: ValidateRequest) {
  const { slug } = request;

  if (!slug) {
    throw new Error("Se requiere el slug de la comunidad");
  }

  const { data: community, error } = await supabase
    .from("partner_communities")
    .select("id, slug, name, is_active, target_types, max_redemptions, current_redemptions, start_date, end_date")
    .eq("slug", slug)
    .single();

  if (error || !community) {
    return {
      success: false,
      valid: false,
      error: "Comunidad no encontrada",
    };
  }

  // Verificar si está activa
  if (!community.is_active) {
    return {
      success: false,
      valid: false,
      error: "Esta comunidad ya no está activa",
    };
  }

  // Verificar fechas
  const now = new Date();
  if (community.start_date && new Date(community.start_date) > now) {
    return {
      success: false,
      valid: false,
      error: "Esta comunidad aún no está disponible",
    };
  }
  if (community.end_date && new Date(community.end_date) < now) {
    return {
      success: false,
      valid: false,
      error: "Esta comunidad ha expirado",
    };
  }

  // Verificar límite de redenciones
  if (community.max_redemptions && community.current_redemptions >= community.max_redemptions) {
    return {
      success: false,
      valid: false,
      error: "Esta comunidad ha alcanzado el límite de registros",
    };
  }

  return {
    success: true,
    valid: true,
    community: {
      id: community.id,
      slug: community.slug,
      name: community.name,
      target_types: community.target_types,
      spots_remaining: community.max_redemptions
        ? community.max_redemptions - community.current_redemptions
        : null,
    },
  };
}

// ============================================================================
// OBTENER INFO COMPLETA DE COMUNIDAD (público)
// ============================================================================

async function getCommunityInfo(supabase: any, slug: string) {
  if (!slug) {
    throw new Error("Se requiere el slug de la comunidad");
  }

  const { data: community, error } = await supabase
    .from("partner_communities")
    .select(`
      id, slug, name, description, logo_url,
      free_months, commission_discount_points, bonus_ai_tokens,
      custom_badge_text, custom_badge_color,
      target_types, max_redemptions, current_redemptions,
      is_active, start_date, end_date
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !community) {
    return {
      success: false,
      error: "Comunidad no encontrada",
    };
  }

  // Verificar fechas
  const now = new Date();
  if (community.start_date && new Date(community.start_date) > now) {
    return { success: false, error: "Esta comunidad aún no está disponible" };
  }
  if (community.end_date && new Date(community.end_date) < now) {
    return { success: false, error: "Esta comunidad ha expirado" };
  }

  return {
    success: true,
    community: {
      id: community.id,
      slug: community.slug,
      name: community.name,
      description: community.description,
      logo_url: community.logo_url,
      benefits: {
        free_months: community.free_months,
        commission_discount_points: community.commission_discount_points,
        bonus_ai_tokens: community.bonus_ai_tokens,
        custom_badge: community.custom_badge_text ? {
          text: community.custom_badge_text,
          color: community.custom_badge_color,
        } : null,
      },
      target_types: community.target_types,
      spots_remaining: community.max_redemptions
        ? community.max_redemptions - community.current_redemptions
        : null,
    },
  };
}

// ============================================================================
// APLICAR A COMUNIDAD (requiere auth)
// ============================================================================

async function applyToCommunity(supabase: any, userId: string, request: ApplyRequest) {
  const { community_slug, brand_id } = request;

  if (!community_slug) {
    throw new Error("Se requiere el slug de la comunidad");
  }

  // 1. Obtener comunidad
  const { data: community, error: communityError } = await supabase
    .from("partner_communities")
    .select("*")
    .eq("slug", community_slug)
    .eq("is_active", true)
    .single();

  if (communityError || !community) {
    throw new Error("Comunidad no encontrada o inactiva");
  }

  // 2. Verificar que no haya alcanzado el límite
  if (community.max_redemptions && community.current_redemptions >= community.max_redemptions) {
    throw new Error("Esta comunidad ha alcanzado el límite de registros");
  }

  // 3. Verificar que el usuario/marca no sea ya miembro
  const existingQuery = supabase
    .from("partner_community_memberships")
    .select("id")
    .eq("community_id", community.id);

  if (brand_id) {
    existingQuery.eq("brand_id", brand_id);
  } else {
    existingQuery.eq("user_id", userId);
  }

  const { data: existingMembership } = await existingQuery.limit(1).maybeSingle();

  if (existingMembership) {
    return {
      success: true,
      already_member: true,
      message: "Ya eres miembro de esta comunidad",
    };
  }

  // 3.5 Obtener el tipo de usuario (brand o talent) desde auth.users
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const userType = authUser?.user?.user_metadata?.user_type || null;
  const isBrand = userType === "brand";
  const isTalent = userType === "talent";

  // 4. Crear membership
  const membershipData: any = {
    community_id: community.id,
    user_id: userId,
    free_months_granted: community.free_months,
    // Solo brands reciben descuento en comisiones
    commission_discount_applied: isBrand ? community.commission_discount_points : 0,
    bonus_tokens_granted: community.bonus_ai_tokens,
    status: "active",
    metadata: {
      applied_via: "landing_page",
      applied_at_redemptions: community.current_redemptions,
      user_type: userType,
    },
  };

  if (brand_id) {
    membershipData.brand_id = brand_id;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("partner_community_memberships")
    .insert(membershipData)
    .select()
    .single();

  if (membershipError) {
    throw new Error(`Error al crear membresía: ${membershipError.message}`);
  }

  // 5. Crear custom_pricing_agreement si hay descuento en comisiones (SOLO PARA BRANDS)
  if (isBrand && community.commission_discount_points > 0) {
    // Comisión base marketplace: 30%, con descuento de 5 puntos = 25%
    const baseRate = 0.30;
    const discountedRate = Math.max(0.05, baseRate - (community.commission_discount_points / 100));

    await supabase
      .from("custom_pricing_agreements")
      .insert({
        user_id: userId,
        agreement_type: "partner_community",
        marketplace_fee_override: discountedRate,
        campaign_fee_override: discountedRate,
        is_active: true,
        notes: `Descuento de comunidad: ${community.name} (-${community.commission_discount_points} puntos)`,
        metadata: {
          community_id: community.id,
          community_slug: community.slug,
          membership_id: membership.id,
        },
      });
  }

  // 5.5 Desbloquear acceso sin llaves (SOLO PARA BRANDS)
  if (isBrand) {
    await supabase
      .from("profiles")
      .update({ platform_access_unlocked: true })
      .eq("id", userId);
  }

  // 6. Actualizar brand con comunidad y badge
  if (brand_id) {
    const brandUpdate: Record<string, any> = {
      partner_community_id: community.id,
    };

    // Agregar badge solo si está configurado
    if (community.custom_badge_text) {
      brandUpdate.community_badge_text = community.custom_badge_text;
      brandUpdate.community_badge_color = community.custom_badge_color;
    }

    const { error: brandError } = await supabase
      .from("brands")
      .update(brandUpdate)
      .eq("id", brand_id);

    if (brandError) {
      console.error("Error updating brand with community:", brandError);
    }
  }

  // 7. Incrementar contador de redenciones
  await supabase
    .from("partner_communities")
    .update({
      current_redemptions: community.current_redemptions + 1,
    })
    .eq("id", community.id);

  // 8. Otorgar tokens bonus si aplica
  if (community.bonus_ai_tokens > 0) {
    // Buscar balance existente
    const { data: tokenBalance } = await supabase
      .from("ai_token_balances")
      .select("id, bonus_tokens")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (tokenBalance) {
      await supabase
        .from("ai_token_balances")
        .update({
          bonus_tokens: (tokenBalance.bonus_tokens || 0) + community.bonus_ai_tokens,
        })
        .eq("id", tokenBalance.id);
    } else {
      await supabase
        .from("ai_token_balances")
        .insert({
          user_id: userId,
          bonus_tokens: community.bonus_ai_tokens,
          balance_total: community.bonus_ai_tokens,
        });
    }
  }

  // 9. Crear suscripción con meses gratis si aplica
  if (community.free_months > 0) {
    // Verificar si ya tiene suscripción
    const { data: existingSub } = await supabase
      .from("platform_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (!existingSub) {
      // Determinar el tier basado en el TIPO DE USUARIO (no el target de la comunidad)
      // - Brands/Clientes → brand_starter
      // - Freelancers/Talent → creator_pro
      const tier = isBrand ? "brand_starter" : "creator_pro";

      // Precios base según tier
      const pricing = tier === "brand_starter"
        ? { monthly: 39, annual: 390, limits: { users: 3, ai_tokens: 4000, storage_gb: 5, content_per_month: 30 } }
        : { monthly: 29, annual: 290, limits: { projects: 20, ai_tokens: 3000, storage_gb: 10 } };

      const trialEndDate = new Date();
      trialEndDate.setMonth(trialEndDate.getMonth() + community.free_months);

      const { error: subError } = await supabase
        .from("platform_subscriptions")
        .insert({
          user_id: userId,
          tier: tier,
          status: "trialing",
          billing_cycle: "community_benefit",
          price_monthly: pricing.monthly,
          price_annual: pricing.annual,
          current_price: 0, // Gratis durante el trial
          trial_ends_at: trialEndDate.toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndDate.toISOString(),
          plan_limits: pricing.limits,
          metadata: {
            source: "community_benefit",
            free_months: community.free_months,
            community_id: community.id,
            community_slug: community.slug,
            community_membership_id: membership.id,
            user_type: userType,
            activated_at: new Date().toISOString(),
          },
        });

      if (subError) {
        console.error("Error creating subscription:", subError);
      }
    }
  }

  return {
    success: true,
    membership_id: membership.id,
    user_type: userType,
    benefits_applied: {
      free_months: community.free_months,
      plan_tier: isBrand ? "brand_starter" : "creator_pro",
      // Solo brands reciben estos beneficios
      commission_discount: isBrand ? community.commission_discount_points : 0,
      platform_access_unlocked: isBrand,
      // Todos reciben tokens bonus
      bonus_tokens: community.bonus_ai_tokens,
      badge: community.custom_badge_text ? {
        text: community.custom_badge_text,
        color: community.custom_badge_color,
      } : null,
    },
    message: `¡Bienvenido a ${community.name}! Tus beneficios han sido aplicados.`,
  };
}

// ============================================================================
// VERIFICAR MEMBRESÍA (requiere auth)
// ============================================================================

async function checkMembership(supabase: any, userId: string, request: CheckMembershipRequest) {
  const { community_slug, brand_id } = request;

  let query = supabase
    .from("partner_community_memberships")
    .select(`
      id, status, applied_at, expires_at,
      free_months_granted, commission_discount_applied, bonus_tokens_granted,
      community:partner_communities(
        slug, name, custom_badge_text, custom_badge_color
      )
    `);

  if (brand_id) {
    query = query.eq("brand_id", brand_id);
  } else {
    query = query.eq("user_id", userId);
  }

  if (community_slug) {
    query = query.eq("community.slug", community_slug);
  }

  const { data: memberships, error } = await query;

  if (error) {
    throw new Error(`Error al verificar membresía: ${error.message}`);
  }

  // Filtrar membresías activas
  const activeMemberships = (memberships || []).filter((m: any) => {
    if (m.status !== "active") return false;
    if (m.expires_at && new Date(m.expires_at) < new Date()) return false;
    return true;
  });

  return {
    success: true,
    is_member: activeMemberships.length > 0,
    memberships: activeMemberships.map((m: any) => ({
      id: m.id,
      community: m.community,
      benefits: {
        free_months: m.free_months_granted,
        commission_discount: m.commission_discount_applied,
        bonus_tokens: m.bonus_tokens_granted,
      },
      applied_at: m.applied_at,
      expires_at: m.expires_at,
    })),
  };
}
