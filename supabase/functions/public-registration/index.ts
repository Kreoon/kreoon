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
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// UGC Colombia slugs
const UGC_COLOMBIA_ORG_SLUG = "ugc-colombia";
const UGC_COLOMBIA_COMMUNITY_SLUG = "ugc-colombia";

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
let cachedCommunity: CommunityInfo | null = null;

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

    if (body.type === "creator") {
      return await registerCreator(supabase, body as CreatorRegistration, orgId, community, corsHeaders);
    } else {
      return await registerBrand(supabase, body as BrandRegistration, orgId, community, corsHeaders);
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
  corsHeaders: Record<string, string>
): Promise<Response> {
  console.log("[public-registration] Registering creator:", data.email);

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

  // 2. Create profile with community badge
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email: data.email.toLowerCase(),
    full_name: data.full_name,
    phone: data.phone || null,
    current_organization_id: orgId,
    partner_community_id: community?.id || null,
    community_badge_text: community?.custom_badge_text || "UGC Colombia",
    community_badge_color: community?.custom_badge_color || "#f97316",
    registration_source: "ugccolombia.co",
  });

  if (profileError) {
    console.error("[public-registration] Profile error:", profileError);
  }

  // 3. Add to organization as creator
  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: orgId,
    user_id: userId,
    is_owner: false,
  });

  if (memberError) {
    console.error("[public-registration] Member error:", memberError);
  }

  // 4. Assign creator role
  const { error: roleError } = await supabase.from("organization_member_roles").insert({
    organization_id: orgId,
    user_id: userId,
    role: "creator",
  });

  if (roleError) {
    console.error("[public-registration] Role error:", roleError);
  }

  // 5. Create creator profile for marketplace with community badge
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
    partner_community_id: community?.id || null,
    community_badge_text: community?.custom_badge_text || "UGC Colombia",
    community_badge_color: community?.custom_badge_color || "#f97316",
  });

  if (creatorProfileError) {
    console.error("[public-registration] Creator profile error:", creatorProfileError);
  }

  // 6. Create community membership
  if (community) {
    const { error: membershipError } = await supabase.from("partner_community_memberships").insert({
      community_id: community.id,
      user_id: userId,
      free_months_granted: community.free_months,
      commission_discount_applied: community.commission_discount_points,
      bonus_tokens_granted: community.bonus_ai_tokens,
      status: "active",
      metadata: {
        registration_source: "ugccolombia.co",
        registration_type: "creator",
        registered_at: new Date().toISOString(),
      },
    });

    if (membershipError) {
      console.error("[public-registration] Membership error:", membershipError);
    }

    // 7. Grant bonus AI tokens
    if (community.bonus_ai_tokens > 0) {
      const { error: tokensError } = await supabase.from("ai_usage_logs").insert({
        user_id: userId,
        organization_id: orgId,
        action: "community_bonus",
        tokens_used: -community.bonus_ai_tokens, // Negative = credit
        metadata: {
          community: community.name,
          reason: "Bono de bienvenida comunidad UGC Colombia",
        },
      });

      if (tokensError) {
        console.error("[public-registration] Tokens error:", tokensError);
      }
    }

    // Update community redemption count
    await supabase.rpc("increment_community_redemptions", { community_slug: UGC_COLOMBIA_COMMUNITY_SLUG }).catch(() => {});
  }

  // 8. Send verification email
  const { error: emailError } = await supabase.auth.admin.generateLink({
    type: "signup",
    email: data.email.toLowerCase(),
    options: {
      redirectTo: "https://kreoon.com/auth/callback?next=/onboarding",
    },
  });

  if (emailError) {
    console.error("[public-registration] Email link error:", emailError);
  }

  // 9. Send welcome email via Resend
  try {
    await resend.emails.send({
      from: "UGC Colombia <hola@ugccolombia.co>",
      to: [data.email],
      subject: "¡Bienvenido a la Comunidad UGC Colombia! 🎬",
      html: getCreatorWelcomeEmail(data.full_name, community),
    });
  } catch (e) {
    console.error("[public-registration] Resend error:", e);
  }

  console.log("[public-registration] Creator registered successfully:", userId, "Community:", community?.name);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Registro exitoso. Revisa tu email para verificar tu cuenta.",
      user_id: userId,
      login_url: "https://kreoon.com/auth",
      community: community?.name || "UGC Colombia",
      benefits: community ? {
        free_months: community.free_months,
        bonus_tokens: community.bonus_ai_tokens,
        badge: community.custom_badge_text,
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
  corsHeaders: Record<string, string>
): Promise<Response> {
  console.log("[public-registration] Registering brand:", data.email);

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

  // 2. Create profile with community badge
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email: data.email.toLowerCase(),
    full_name: data.contact_name,
    phone: data.phone || null,
    current_organization_id: orgId,
    partner_community_id: community?.id || null,
    community_badge_text: community?.custom_badge_text || "UGC Colombia",
    community_badge_color: community?.custom_badge_color || "#f97316",
    registration_source: "ugccolombia.co",
  });

  if (profileError) {
    console.error("[public-registration] Profile error:", profileError);
  }

  // 3. Add to organization as client
  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: orgId,
    user_id: userId,
    is_owner: false,
  });

  if (memberError) {
    console.error("[public-registration] Member error:", memberError);
  }

  // 4. Assign client role
  const { error: roleError } = await supabase.from("organization_member_roles").insert({
    organization_id: orgId,
    user_id: userId,
    role: "client",
  });

  if (roleError) {
    console.error("[public-registration] Role error:", roleError);
  }

  // 5. Create client record with community info
  const { data: clientData, error: clientError } = await supabase.from("clients").insert({
    name: data.company_name,
    contact_email: data.email.toLowerCase(),
    contact_phone: data.phone || null,
    notes: `Registrado desde ugccolombia.co - Comunidad UGC Colombia`,
    user_id: userId,
    organization_id: orgId,
    created_by: userId,
    partner_community_id: community?.id || null,
    community_badge_text: community?.custom_badge_text || "UGC Colombia",
    community_badge_color: community?.custom_badge_color || "#f97316",
  }).select("id").single();

  if (clientError) {
    console.error("[public-registration] Client error:", clientError);
  }

  // 6. Create community membership
  if (community) {
    const { error: membershipError } = await supabase.from("partner_community_memberships").insert({
      community_id: community.id,
      user_id: userId,
      brand_id: clientData?.id || null,
      free_months_granted: community.free_months,
      commission_discount_applied: community.commission_discount_points,
      bonus_tokens_granted: community.bonus_ai_tokens,
      status: "active",
      metadata: {
        registration_source: "ugccolombia.co",
        registration_type: "brand",
        company_name: data.company_name,
        registered_at: new Date().toISOString(),
      },
    });

    if (membershipError) {
      console.error("[public-registration] Membership error:", membershipError);
    }

    // 7. Grant bonus AI tokens
    if (community.bonus_ai_tokens > 0) {
      const { error: tokensError } = await supabase.from("ai_usage_logs").insert({
        user_id: userId,
        organization_id: orgId,
        action: "community_bonus",
        tokens_used: -community.bonus_ai_tokens,
        metadata: {
          community: community.name,
          reason: "Bono de bienvenida comunidad UGC Colombia",
        },
      });

      if (tokensError) {
        console.error("[public-registration] Tokens error:", tokensError);
      }
    }

    // Update community redemption count
    await supabase.rpc("increment_community_redemptions", { community_slug: UGC_COLOMBIA_COMMUNITY_SLUG }).catch(() => {});
  }

  // 8. Send verification email
  const { error: emailError } = await supabase.auth.admin.generateLink({
    type: "signup",
    email: data.email.toLowerCase(),
    options: {
      redirectTo: "https://kreoon.com/auth/callback?next=/onboarding",
    },
  });

  if (emailError) {
    console.error("[public-registration] Email link error:", emailError);
  }

  // 9. Send welcome email via Resend
  try {
    await resend.emails.send({
      from: "UGC Colombia <hola@ugccolombia.co>",
      to: [data.email],
      subject: "¡Bienvenido a la Comunidad UGC Colombia! 🚀",
      html: getBrandWelcomeEmail(data.contact_name, data.company_name, community),
    });
  } catch (e) {
    console.error("[public-registration] Resend error:", e);
  }

  console.log("[public-registration] Brand registered successfully:", userId, "Community:", community?.name);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Registro exitoso. Revisa tu email para verificar tu cuenta.",
      user_id: userId,
      login_url: "https://kreoon.com/auth",
      community: community?.name || "UGC Colombia",
      benefits: community ? {
        free_months: community.free_months,
        bonus_tokens: community.bonus_ai_tokens,
        badge: community.custom_badge_text,
      } : null,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function getCreatorWelcomeEmail(name: string, community: CommunityInfo | null): string {
  const benefits = community ? `
    <div class="benefits">
      <p style="color: #f97316; font-weight: 600; margin-bottom: 12px;">🎁 Tus beneficios de comunidad:</p>
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
    .badge { display: inline-block; background: #f97316; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 8px; }
    h1 { font-size: 28px; margin: 0 0 16px; }
    p { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin: 16px 0; }
    .highlight { color: #22c55e; }
    .button { display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
    .benefits { background: #1a1a1a; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #f9731633; }
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

    <h1>¡Bienvenido, ${name}! 🎬 <span class="badge">Comunidad UGC</span></h1>

    <p>Tu registro como <span class="highlight">Creador de Contenido</span> ha sido exitoso.</p>

    <p>Ahora eres parte oficial de la <strong style="color: #f97316;">Comunidad UGC Colombia</strong>, la red de creadores UGC mas grande del pais, potenciada por KREOON.</p>

    ${benefits}

    <div class="features">
      <div class="feature">
        <span class="feature-icon">📋</span>
        <span class="feature-text"><strong>Recibe briefs</strong> de marcas reconocidas</span>
      </div>
      <div class="feature">
        <span class="feature-icon">🎥</span>
        <span class="feature-text"><strong>Sube tu contenido</strong> y recibe feedback</span>
      </div>
      <div class="feature">
        <span class="feature-icon">💰</span>
        <span class="feature-text"><strong>Cobra por tu trabajo</strong> de forma segura</span>
      </div>
      <div class="feature">
        <span class="feature-icon">📈</span>
        <span class="feature-text"><strong>Crece tu portafolio</strong> profesional</span>
      </div>
    </div>

    <a href="https://kreoon.com/auth" class="button">Ingresar a la Plataforma</a>

    <p style="font-size: 14px;">Usa el mismo email y contraseña que registraste.</p>

    <div class="footer">
      <p>¿Preguntas? Escribenos a <a href="mailto:hola@ugccolombia.co" style="color: #f97316;">hola@ugccolombia.co</a></p>
      <p style="margin-top: 16px;">© 2026 UGC Colombia × KREOON</p>
    </div>
  </div>
</body>
</html>
  `;
}

function getBrandWelcomeEmail(contactName: string, companyName: string, community: CommunityInfo | null): string {
  const benefits = community ? `
    <div class="benefits">
      <p style="color: #f97316; font-weight: 600; margin-bottom: 12px;">🎁 Beneficios de la Comunidad UGC Colombia:</p>
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
    .badge { display: inline-block; background: #f97316; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 8px; }
    h1 { font-size: 28px; margin: 0 0 16px; }
    p { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin: 16px 0; }
    .highlight { color: #f97316; }
    .button { display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
    .benefits { background: #1a1a1a; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #f9731633; }
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

    <h1>¡Bienvenido, ${contactName}! 🚀 <span class="badge">Comunidad UGC</span></h1>

    <p>El registro de <span class="highlight">${companyName}</span> ha sido exitoso.</p>

    <p>Ahora eres parte oficial de la <strong style="color: #f97316;">Comunidad UGC Colombia</strong>, con acceso a la red de creadores UGC mas talentosos del pais.</p>

    ${benefits}

    <div class="features">
      <div class="feature">
        <span class="feature-icon">🎯</span>
        <span class="feature-text"><strong>Crea campañas</strong> y define briefs</span>
      </div>
      <div class="feature">
        <span class="feature-icon">👥</span>
        <span class="feature-text"><strong>Accede a +200 creadores</strong> verificados</span>
      </div>
      <div class="feature">
        <span class="feature-icon">✅</span>
        <span class="feature-text"><strong>Aprueba contenido</strong> en tiempo real</span>
      </div>
      <div class="feature">
        <span class="feature-icon">📊</span>
        <span class="feature-text"><strong>Mide resultados</strong> de tus campañas</span>
      </div>
    </div>

    <a href="https://kreoon.com/auth" class="button">Ingresar a la Plataforma</a>

    <p style="font-size: 14px;">Usa el mismo email y contraseña que registraste.</p>

    <div class="footer">
      <p>¿Preguntas? Escribenos a <a href="mailto:hola@ugccolombia.co" style="color: #f97316;">hola@ugccolombia.co</a></p>
      <p style="margin-top: 16px;">© 2026 UGC Colombia × KREOON</p>
    </div>
  </div>
</body>
</html>
  `;
}
