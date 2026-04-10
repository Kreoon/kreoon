/**
 * Public Registration API - Widget de registro para ugccolombia.co
 *
 * Permite registrar creadores y marcas directamente en KREOON
 * desde sitios externos como ugccolombia.co
 *
 * ENDPOINTS:
 * - POST /public-registration { type: 'creator' | 'brand', ... }
 *
 * El usuario se registra en KREOON, se asigna a la organizacion UGC Colombia,
 * y queda como miembro de la comunidad partner "UGC Colombia" con beneficios:
 * - 1 mes gratis de suscripcion
 * - 500 tokens AI de bienvenida
 * - Descuento en comisiones del marketplace
 * - Badge "UGC Colombia" en su perfil
 * - Queda como referido del owner de UGC Colombia (sistema de comisiones)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// UGC Colombia slugs
const UGC_COLOMBIA_ORG_SLUG = "ugc-colombia";
const UGC_COLOMBIA_COMMUNITY_SLUG = "ugc-colombia";

// UGC Colombia referral code (auto-generated for the org owner)
const UGC_COLOMBIA_REFERRAL_CODE = "UGCCOLOMBIA2026";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://ugccolombia.co",
  "https://www.ugccolombia.co",
  "http://localhost:3000",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  let allowedOrigin = "https://ugccolombia.co";

  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) {
      allowedOrigin = origin;
    } else if (origin.endsWith(".vercel.app")) {
      allowedOrigin = origin;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface CreatorRegistration {
  type: "creator";
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  legal_accepted: boolean;
}

interface BrandRegistration {
  type: "brand";
  email: string;
  password: string;
  company_name: string;
  contact_name: string;
  phone?: string;
  legal_accepted: boolean;
}

type RegistrationRequest = CreatorRegistration | BrandRegistration;

interface CommunityInfo {
  id: string;
  name: string;
  custom_badge_text: string;
  custom_badge_color: string;
  bonus_ai_tokens: number;
  free_months: number;
  commission_discount_points: number;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://wjkbqcrxwsmvtxmqgiqc.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Cache IDs
let cachedOrgId: string | null = null;
let cachedOrgOwnerId: string | null = null;
let cachedCommunity: CommunityInfo | null = null;
let cachedReferralId: string | null = null;

async function getUgcColombiaOrgId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", UGC_COLOMBIA_ORG_SLUG)
    .single();

  if (error || !data) {
    console.error("[public-registration] Error finding UGC Colombia org:", error);
    return null;
  }

  cachedOrgId = data.id;
  return cachedOrgId;
}

async function getUgcColombiaCommunity(supabase: ReturnType<typeof createClient>): Promise<CommunityInfo | null> {
  if (cachedCommunity) return cachedCommunity;

  const { data, error } = await supabase
    .from("partner_communities")
    .select("id, name, custom_badge_text, custom_badge_color, bonus_ai_tokens, free_months, commission_discount_points")
    .eq("slug", UGC_COLOMBIA_COMMUNITY_SLUG)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    console.error("[public-registration] Error finding UGC Colombia community:", error);
    return null;
  }

  cachedCommunity = data as CommunityInfo;
  return cachedCommunity;
}

async function getUgcColombiaOwnerId(supabase: ReturnType<typeof createClient>, orgId: string): Promise<string | null> {
  if (cachedOrgOwnerId) return cachedOrgOwnerId;

  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("is_owner", true)
    .single();

  if (error || !data) {
    console.error("[public-registration] Error finding UGC Colombia owner:", error);
    return null;
  }

  cachedOrgOwnerId = data.user_id;
  return cachedOrgOwnerId;
}

async function getOrCreateReferral(
  supabase: ReturnType<typeof createClient>,
  referrerId: string,
  referredEmail: string
): Promise<string | null> {
  // Check if referrer already has a referral code entry
  const { data: existingReferral } = await supabase
    .from("referrals")
    .select("id")
    .eq("referrer_id", referrerId)
    .eq("referral_code", UGC_COLOMBIA_REFERRAL_CODE)
    .single();

  if (existingReferral) {
    // Create new referral for this specific user
    const { data: newReferral, error } = await supabase
      .from("referrals")
      .insert({
        referrer_id: referrerId,
        referred_email: referredEmail,
        referral_code: `${UGC_COLOMBIA_REFERRAL_CODE}-${Date.now().toString(36)}`,
        commission_percentage: 10,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[public-registration] Error creating referral:", error);
      return null;
    }
    return newReferral?.id || null;
  }

  // Create the initial referral code for UGC Colombia
  const { data: newReferral, error } = await supabase
    .from("referrals")
    .insert({
      referrer_id: referrerId,
      referred_email: referredEmail,
      referral_code: `${UGC_COLOMBIA_REFERRAL_CODE}-${Date.now().toString(36)}`,
      commission_percentage: 10,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[public-registration] Error creating referral:", error);
    return null;
  }

  return newReferral?.id || null;
}

async function activateReferral(
  supabase: ReturnType<typeof createClient>,
  referralId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("referrals")
    .update({
      referred_user_id: userId,
      status: "registered",
      registered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", referralId);

  if (error) {
    console.error("[public-registration] Error activating referral:", error);
  }
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: RegistrationRequest = await req.json();

    // Validate required fields
    if (!body.type || !["creator", "brand"].includes(body.type)) {
      return new Response(
        JSON.stringify({ error: "Tipo de registro invalido. Use 'creator' o 'brand'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({ error: "Email y password son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.password.length < 8) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener al menos 8 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.legal_accepted) {
      return new Response(
        JSON.stringify({ error: "Debes aceptar los términos y condiciones" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get UGC Colombia organization ID
    const orgId = await getUgcColombiaOrgId(supabase);
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "Error de configuracion. Contacte soporte." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get UGC Colombia community info
    const community = await getUgcColombiaCommunity(supabase);
    if (!community) {
      console.warn("[public-registration] Community not found, continuing without community benefits");
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", body.email.toLowerCase())
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Este email ya esta registrado. Intenta iniciar sesion." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get UGC Colombia owner for referral system
    const ownerId = await getUgcColombiaOwnerId(supabase, orgId);
    if (!ownerId) {
      console.warn("[public-registration] Owner not found, continuing without referral");
    }

    if (body.type === "creator") {
      return await registerCreator(supabase, body as CreatorRegistration, orgId, community, ownerId, corsHeaders);
    } else {
      return await registerBrand(supabase, body as BrandRegistration, orgId, community, ownerId, corsHeaders);
    }
  } catch (error) {
    console.error("[public-registration] Error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno. Intenta de nuevo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function registerCreator(
  supabase: ReturnType<typeof createClient>,
  data: CreatorRegistration,
  orgId: string,
  community: CommunityInfo | null,
  ownerId: string | null,
  corsHeaders: Record<string, string>
): Promise<Response> {
  console.log("[public-registration] Registering creator:", data.email);

  // Create referral entry (before user creation to have the referral ID)
  let referralId: string | null = null;
  if (ownerId) {
    referralId = await getOrCreateReferral(supabase, ownerId, data.email.toLowerCase());
    console.log("[public-registration] Created referral:", referralId);
  }

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email.toLowerCase(),
    password: data.password,
    email_confirm: false,
    user_metadata: {
      full_name: data.full_name,
      registration_source: "ugccolombia.co",
      registration_type: "creator",
      partner_community: community?.name || "UGC Colombia",
      legal_accepted_at: new Date().toISOString(),
      legal_accepted_from: "ugccolombia.co",
    },
  });

  if (authError || !authData.user) {
    console.error("[public-registration] Auth error:", authError);
    if (authError?.message?.includes("already registered")) {
      return new Response(
        JSON.stringify({ error: "Este email ya esta registrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Error al crear la cuenta. Intenta de nuevo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = authData.user.id;

  // 2. Create profile as freelance (no organization, no badge yet)
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email: data.email.toLowerCase(),
    full_name: data.full_name,
    phone: data.phone || null,
    registration_source: "ugccolombia.co",
    // No current_organization_id - queda como freelance
    // No badge - se asigna cuando sea aprobado
  });

  if (profileError) {
    console.error("[public-registration] Profile error:", profileError);
  }

  // 3. Activate referral (link user to UGC Colombia owner for commissions)
  if (referralId) {
    await activateReferral(supabase, referralId, userId);
    console.log("[public-registration] Activated referral for user:", userId);
  }

  // 4. Create join request for UGC Colombia (pending approval)
  const { error: joinRequestError } = await supabase.from("organization_join_requests").insert({
    organization_id: orgId,
    user_id: userId,
    requested_role: "creator",
    status: "pending",
    source: "ugccolombia.co",
    message: `Registro automatico desde ugccolombia.co - ${data.full_name}`,
  });

  if (joinRequestError) {
    console.error("[public-registration] Join request error:", joinRequestError);
  }

  // 5. Create creator profile for marketplace (freelance, active)
  const slug = data.full_name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { error: creatorProfileError } = await supabase.from("creator_profiles").insert({
    user_id: userId,
    display_name: data.full_name,
    slug: `${slug}-${Date.now().toString(36)}`,
    is_active: true,
    is_available: true,
    // No badge - se asigna cuando sea aprobado en la organizacion
  });

  if (creatorProfileError) {
    console.error("[public-registration] Creator profile error:", creatorProfileError);
  }

  // 6. Track pending membership (benefits activate on approval)
  if (community) {
    const { error: trackingError } = await supabase.from("partner_community_memberships").insert({
      community_id: community.id,
      user_id: userId,
      status: "pending",
      free_months_granted: 0,
      commission_discount_applied: 0,
      bonus_tokens_granted: 0,
      metadata: {
        registration_source: "ugccolombia.co",
        registration_type: "creator",
        registered_at: new Date().toISOString(),
        pending_benefits: {
          free_months: community.free_months,
          bonus_tokens: community.bonus_ai_tokens,
          commission_discount: community.commission_discount_points,
          badge_text: community.custom_badge_text,
          badge_color: community.custom_badge_color,
        },
      },
    });

    if (trackingError) {
      console.error("[public-registration] Tracking error:", trackingError);
    }
  }

  // 7. Send magic link email (auto-login on click)
  const { data: linkData, error: emailError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: data.email.toLowerCase(),
    options: {
      redirectTo: "https://kreoon.com/welcome/ugc-colombia",
    },
  });

  if (emailError) {
    console.error("[public-registration] Email link error:", emailError);
  }

  // 9. Send welcome email via Resend with magic link
  const magicLink = linkData?.properties?.action_link || "https://kreoon.com/auth";
  try {
    await resend.emails.send({
      from: "KREOON <noreply@kreoon.com>",
      to: [data.email],
      subject: "¡Bienvenido a la Comunidad UGC Colombia! 🎬",
      html: getCreatorWelcomeEmail(data.full_name, community, magicLink),
    });
  } catch (e) {
    console.error("[public-registration] Resend error:", e);
  }

  console.log("[public-registration] Creator registered successfully:", userId, "Pending approval for:", community?.name);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Registro exitoso. Ya puedes usar KREOON como freelance. Tu solicitud para unirte a UGC Colombia esta en revision.",
      user_id: userId,
      login_url: "https://kreoon.com/auth",
      status: "pending_approval",
      referral_active: !!referralId,
      pending_benefits: community ? {
        free_months: community.free_months,
        bonus_tokens: community.bonus_ai_tokens,
        badge: community.custom_badge_text,
        commission_discount: community.commission_discount_points,
      } : null,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function registerBrand(
  supabase: ReturnType<typeof createClient>,
  data: BrandRegistration,
  orgId: string,
  community: CommunityInfo | null,
  ownerId: string | null,
  corsHeaders: Record<string, string>
): Promise<Response> {
  console.log("[public-registration] Registering brand:", data.email);

  // Create referral entry (before user creation to have the referral ID)
  let referralId: string | null = null;
  if (ownerId) {
    referralId = await getOrCreateReferral(supabase, ownerId, data.email.toLowerCase());
    console.log("[public-registration] Created referral:", referralId);
  }

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email.toLowerCase(),
    password: data.password,
    email_confirm: false,
    user_metadata: {
      full_name: data.contact_name,
      company_name: data.company_name,
      registration_source: "ugccolombia.co",
      registration_type: "brand",
      partner_community: community?.name || "UGC Colombia",
      legal_accepted_at: new Date().toISOString(),
      legal_accepted_from: "ugccolombia.co",
    },
  });

  if (authError || !authData.user) {
    console.error("[public-registration] Auth error:", authError);
    if (authError?.message?.includes("already registered")) {
      return new Response(
        JSON.stringify({ error: "Este email ya esta registrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Error al crear la cuenta. Intenta de nuevo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = authData.user.id;

  // 2. Create profile as independent (no organization, no badge yet)
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email: data.email.toLowerCase(),
    full_name: data.contact_name,
    phone: data.phone || null,
    registration_source: "ugccolombia.co",
    // No current_organization_id - queda como independiente
    // No badge - se asigna cuando sea aprobado
  });

  if (profileError) {
    console.error("[public-registration] Profile error:", profileError);
  }

  // 3. Activate referral (link user to UGC Colombia owner for commissions)
  if (referralId) {
    await activateReferral(supabase, referralId, userId);
    console.log("[public-registration] Activated referral for user:", userId);
  }

  // 4. Create join request for UGC Colombia (pending approval)
  const { error: joinRequestError } = await supabase.from("organization_join_requests").insert({
    organization_id: orgId,
    user_id: userId,
    requested_role: "client",
    status: "pending",
    source: "ugccolombia.co",
    message: `Marca: ${data.company_name} - Contacto: ${data.contact_name} - Registro desde ugccolombia.co`,
  });

  if (joinRequestError) {
    console.error("[public-registration] Join request error:", joinRequestError);
  }

  // 5. Track pending membership (benefits activate on approval)
  if (community) {
    const { error: trackingError } = await supabase.from("partner_community_memberships").insert({
      community_id: community.id,
      user_id: userId,
      status: "pending",
      free_months_granted: 0,
      commission_discount_applied: 0,
      bonus_tokens_granted: 0,
      metadata: {
        registration_source: "ugccolombia.co",
        registration_type: "brand",
        company_name: data.company_name,
        registered_at: new Date().toISOString(),
        pending_benefits: {
          free_months: community.free_months,
          bonus_tokens: community.bonus_ai_tokens,
          commission_discount: community.commission_discount_points,
          badge_text: community.custom_badge_text,
          badge_color: community.custom_badge_color,
        },
      },
    });

    if (trackingError) {
      console.error("[public-registration] Tracking error:", trackingError);
    }
  }

  // 6. Send magic link email (auto-login on click)
  const { data: linkData, error: emailError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: data.email.toLowerCase(),
    options: {
      redirectTo: "https://kreoon.com/welcome/ugc-colombia",
    },
  });

  if (emailError) {
    console.error("[public-registration] Email link error:", emailError);
  }

  // 9. Send welcome email via Resend with magic link
  const magicLink = linkData?.properties?.action_link || "https://kreoon.com/auth";
  try {
    await resend.emails.send({
      from: "KREOON <noreply@kreoon.com>",
      to: [data.email],
      subject: "¡Bienvenido a la Comunidad UGC Colombia! 🚀",
      html: getBrandWelcomeEmail(data.contact_name, data.company_name, community, magicLink),
    });
  } catch (e) {
    console.error("[public-registration] Resend error:", e);
  }

  console.log("[public-registration] Brand registered successfully:", userId, "Pending approval for:", community?.name);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Registro exitoso. Ya puedes explorar KREOON. Tu solicitud para unirte a UGC Colombia esta en revision.",
      user_id: userId,
      login_url: "https://kreoon.com/auth",
      status: "pending_approval",
      referral_active: !!referralId,
      pending_benefits: community ? {
        free_months: community.free_months,
        bonus_tokens: community.bonus_ai_tokens,
        badge: community.custom_badge_text,
        commission_discount: community.commission_discount_points,
      } : null,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function getCreatorWelcomeEmail(name: string, community: CommunityInfo | null, loginUrl: string): string {
  const pendingBenefits = community ? `
    <div class="benefits">
      <p style="color: #fbbf24; font-weight: 600; margin-bottom: 12px;">⏳ Beneficios pendientes (se activan al aprobar tu solicitud):</p>
      <ul style="color: #d4d4d8; margin: 0; padding-left: 20px;">
        ${community.free_months > 0 ? `<li>${community.free_months} mes${community.free_months > 1 ? 'es' : ''} gratis de suscripcion</li>` : ''}
        ${community.bonus_ai_tokens > 0 ? `<li>${community.bonus_ai_tokens} tokens AI de bienvenida</li>` : ''}
        ${community.commission_discount_points > 0 ? `<li>Descuento en comisiones del marketplace</li>` : ''}
        <li>Badge exclusivo "${community.custom_badge_text}" en tu perfil</li>
      </ul>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 40px; }
    .container { max-width: 560px; margin: 0 auto; background: #111; border-radius: 16px; padding: 40px; border: 1px solid #222; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: bold; }
    .logo-ugc { color: #f97316; }
    .logo-x { color: #666; margin: 0 4px; }
    .logo-kreoon { color: #22c55e; }
    .badge { display: inline-block; background: #fbbf24; color: #0a0a0a; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 8px; }
    h1 { font-size: 28px; margin: 0 0 16px; }
    p { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin: 16px 0; }
    .highlight { color: #22c55e; }
    .pending { color: #fbbf24; }
    .button { display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
    .benefits { background: #1a1a1a; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #fbbf2433; }
    .status-box { background: #1a1a1a; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #22c55e33; }
    .features { background: #1a1a1a; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .feature { display: flex; align-items: flex-start; gap: 12px; margin: 16px 0; }
    .feature-icon { font-size: 20px; }
    .feature-text { color: #d4d4d8; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #222; font-size: 14px; color: #71717a; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">
        <span class="logo-ugc">UGC Colombia</span>
        <span class="logo-x">×</span>
        <span class="logo-kreoon">KREOON</span>
      </span>
    </div>

    <h1>¡Bienvenido, ${name}! 🎬 <span class="badge">En revision</span></h1>

    <p>Tu registro como <span class="highlight">Creador de Contenido</span> ha sido exitoso.</p>

    <div class="status-box">
      <p style="color: #22c55e; font-weight: 600; margin: 0 0 8px;">✅ Ya puedes usar KREOON como freelance</p>
      <p style="color: #a1a1aa; margin: 0; font-size: 14px;">Tu cuenta esta activa. Puedes crear tu portafolio y recibir proyectos.</p>
    </div>

    <p>Tu solicitud para unirte a la <strong style="color: #f97316;">Comunidad UGC Colombia</strong> esta en revision. Te notificaremos cuando sea aprobada.</p>

    ${pendingBenefits}

    <div class="features">
      <p style="color: #22c55e; font-weight: 600; margin: 0 0 16px;">Mientras tanto puedes:</p>
      <div class="feature">
        <span class="feature-icon">📋</span>
        <span class="feature-text"><strong>Completar tu perfil</strong> de creador</span>
      </div>
      <div class="feature">
        <span class="feature-icon">🎥</span>
        <span class="feature-text"><strong>Subir tu portafolio</strong> de trabajos</span>
      </div>
      <div class="feature">
        <span class="feature-icon">💼</span>
        <span class="feature-text"><strong>Explorar proyectos</strong> disponibles</span>
      </div>
      <div class="feature">
        <span class="feature-icon">📈</span>
        <span class="feature-text"><strong>Conectar</strong> con marcas y agencias</span>
      </div>
    </div>

    <a href="${loginUrl}" class="button">Ingresar a la Plataforma</a>

    <p style="font-size: 14px;">Haz click en el boton para acceder automaticamente (link valido por 24h).</p>

    <div class="footer">
      <p>¿Preguntas? Escribenos a <a href="mailto:hola@ugccolombia.co" style="color: #f97316;">hola@ugccolombia.co</a></p>
      <p style="margin-top: 16px;">© 2026 UGC Colombia × KREOON</p>
    </div>
  </div>
</body>
</html>
  `;
}

function getBrandWelcomeEmail(contactName: string, companyName: string, community: CommunityInfo | null, loginUrl: string): string {
  const pendingBenefits = community ? `
    <div class="benefits">
      <p style="color: #fbbf24; font-weight: 600; margin-bottom: 12px;">⏳ Beneficios pendientes (se activan al aprobar tu solicitud):</p>
      <ul style="color: #d4d4d8; margin: 0; padding-left: 20px;">
        ${community.free_months > 0 ? `<li>${community.free_months} mes${community.free_months > 1 ? 'es' : ''} gratis de suscripcion</li>` : ''}
        ${community.bonus_ai_tokens > 0 ? `<li>${community.bonus_ai_tokens} tokens AI de bienvenida</li>` : ''}
        ${community.commission_discount_points > 0 ? `<li>Descuento en comisiones del marketplace</li>` : ''}
        <li>Badge exclusivo "${community.custom_badge_text}" en tu perfil</li>
        <li>Acceso prioritario a creadores verificados</li>
      </ul>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 40px; }
    .container { max-width: 560px; margin: 0 auto; background: #111; border-radius: 16px; padding: 40px; border: 1px solid #222; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: bold; }
    .logo-ugc { color: #f97316; }
    .logo-x { color: #666; margin: 0 4px; }
    .logo-kreoon { color: #22c55e; }
    .badge { display: inline-block; background: #fbbf24; color: #0a0a0a; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 8px; }
    h1 { font-size: 28px; margin: 0 0 16px; }
    p { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin: 16px 0; }
    .highlight { color: #f97316; }
    .button { display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
    .benefits { background: #1a1a1a; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #fbbf2433; }
    .status-box { background: #1a1a1a; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #22c55e33; }
    .features { background: #1a1a1a; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .feature { display: flex; align-items: flex-start; gap: 12px; margin: 16px 0; }
    .feature-icon { font-size: 20px; }
    .feature-text { color: #d4d4d8; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #222; font-size: 14px; color: #71717a; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">
        <span class="logo-ugc">UGC Colombia</span>
        <span class="logo-x">×</span>
        <span class="logo-kreoon">KREOON</span>
      </span>
    </div>

    <h1>¡Bienvenido, ${contactName}! 🚀 <span class="badge">En revision</span></h1>

    <p>El registro de <span class="highlight">${companyName}</span> ha sido exitoso.</p>

    <div class="status-box">
      <p style="color: #22c55e; font-weight: 600; margin: 0 0 8px;">✅ Ya puedes explorar KREOON</p>
      <p style="color: #a1a1aa; margin: 0; font-size: 14px;">Tu cuenta esta activa. Puedes ver creadores y explorar la plataforma.</p>
    </div>

    <p>Tu solicitud para unirte a la <strong style="color: #f97316;">Comunidad UGC Colombia</strong> esta en revision. Te notificaremos cuando sea aprobada.</p>

    ${pendingBenefits}

    <div class="features">
      <p style="color: #22c55e; font-weight: 600; margin: 0 0 16px;">Mientras tanto puedes:</p>
      <div class="feature">
        <span class="feature-icon">🔍</span>
        <span class="feature-text"><strong>Explorar creadores</strong> disponibles</span>
      </div>
      <div class="feature">
        <span class="feature-icon">📋</span>
        <span class="feature-text"><strong>Conocer la plataforma</strong> y sus funciones</span>
      </div>
      <div class="feature">
        <span class="feature-icon">💼</span>
        <span class="feature-text"><strong>Completar tu perfil</strong> de marca</span>
      </div>
      <div class="feature">
        <span class="feature-icon">📈</span>
        <span class="feature-text"><strong>Planear tu estrategia</strong> de contenido UGC</span>
      </div>
    </div>

    <a href="${loginUrl}" class="button">Ingresar a la Plataforma</a>

    <p style="font-size: 14px;">Haz click en el boton para acceder automaticamente (link valido por 24h).</p>

    <div class="footer">
      <p>¿Preguntas? Escribenos a <a href="mailto:hola@ugccolombia.co" style="color: #f97316;">hola@ugccolombia.co</a></p>
      <p style="margin-top: 16px;">© 2026 UGC Colombia × KREOON</p>
    </div>
  </div>
</body>
</html>
  `;
}
