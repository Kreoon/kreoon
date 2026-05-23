// ============================================================================
// KREOON STRIPE CAMPAIGN CHECKOUT
// Crea una sesión de Stripe Checkout para contratar un plan de campaña gestionada
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Precios base mensuales (igual que el frontend)
const PLAN_PRICES: Record<string, Record<string, number>> = {
  inicio:      { usd: 590,   cop: 1_590_000 },
  crecimiento: { usd: 890,   cop: 2_590_000 },
  escala:      { usd: 1_890, cop: 5_890_000 },
};

const PLAN_NAMES: Record<string, string> = {
  inicio:      "KREOON · Plan INICIO — 6 videos UGC/mes",
  crecimiento: "KREOON · Plan CRECIMIENTO — 10 videos UGC/mes",
  escala:      "KREOON · Plan ESCALA — 30 videos UGC/mes",
};

const PLAN_DETAILS: Record<string, string[]> = {
  inicio: [
    "6 videos UGC × 2 variantes = 12 entregables",
    "Hasta 2 creadores verificados",
    "Guiones escritos por nuestro equipo",
    "Edición profesional lista para publicar",
    "1 ronda de revisión por video",
    "Entrega en 7 días",
    "Garantía CTR ≥ 1.5% / Hook Rate ≥ 25%",
    "Licencia de publicidad 12 meses",
  ],
  crecimiento: [
    "10 videos UGC × 3 variantes = 30 entregables",
    "Hasta 5 creadores nivel premium",
    "Parrilla de contenido mensual planificada",
    "Análisis de competencia trimestral",
    "Edición profesional + gráficos animados",
    "2 rondas de revisión por video",
    "Asesora de cuenta dedicada · Reporte mensual",
    "Garantía CTR ≥ 1.5% / Hook Rate ≥ 25%",
    "Licencia de publicidad 12 meses",
  ],
  escala: [
    "30 videos UGC × 3 variantes = 90 entregables",
    "Hasta 10 creadores premium exclusivos",
    "Estrategia omnicanal + embudos de venta",
    "Edición cinematográfica + subtítulos animados",
    "Revisiones ilimitadas",
    "Reportes semanales + consultoría con Alexander Cast",
    "Asesora de cuenta senior dedicada",
    "Garantía CTR ≥ 1.5% / Hook Rate ≥ 25%",
    "Licencia de publicidad 12 meses",
  ],
};

const DURATION_DISCOUNT: Record<number, number> = { 1: 0, 3: 0.20, 6: 0.30, 12: 0.40 };
const DURATION_LABEL: Record<number, string> = { 1: "mensual", 3: "trimestral", 6: "semestral", 12: "anual" };

// COP no es zero-decimal, se multiplica por 100 igual que USD
function toStripeAmount(amount: number): number {
  return Math.round(amount * 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = getCorsHeaders(req);

  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) throw new Error("Token inválido");

    const body = await req.json();
    const { plan, currency, duration } = body as {
      plan: string;
      currency: string;
      duration: number;
    };

    if (!plan || !currency || !duration) throw new Error("Faltan parámetros: plan, currency, duration");

    const planKey = plan.toLowerCase();
    const currencyKey = currency.toLowerCase();

    const planPrices = PLAN_PRICES[planKey];
    if (!planPrices) throw new Error(`Plan no válido: ${plan}`);

    const monthlyBase = planPrices[currencyKey];
    if (!monthlyBase) throw new Error(`Moneda no válida: ${currency}`);

    const discount = DURATION_DISCOUNT[duration] ?? 0;
    const cycleTotal = Math.round(monthlyBase * duration * (1 - discount));
    const monthlyEquiv = duration > 1 ? Math.round(cycleTotal / duration) : monthlyBase;

    const stripeAmount = toStripeAmount(cycleTotal);
    const stripeCurrency = currencyKey; // "usd" o "cop"

    const planLabel = PLAN_NAMES[planKey] || plan.toUpperCase();
    const durationLabel = DURATION_LABEL[duration] || `${duration} mes(es)`;
    const discountPct = Math.round(discount * 100);
    const planFeatures = PLAN_DETAILS[planKey] || [];

    const appUrl = Deno.env.get("APP_URL") || "https://www.kreoon.com";

    // Obtener perfil del usuario para el email
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();

    const customerEmail = user.email || undefined;
    const customerName = profile?.full_name || undefined;

    console.log(`[stripe-campaign-checkout] ${planLabel} · ${durationLabel} · ${cycleTotal} ${currency.toUpperCase()} · user=${user.id}`);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: stripeCurrency,
            unit_amount: stripeAmount,
            product_data: {
              name: planLabel,
              description: [
                `Plan ${durationLabel}${discountPct > 0 ? ` · -${discountPct}% prepago` : ""}`,
                duration > 1
                  ? `Equivale a ${Math.round(monthlyEquiv).toLocaleString()} ${currency.toUpperCase()}/mes`
                  : null,
                "—",
                ...planFeatures,
              ].filter(Boolean).join(" · "),
            },
          },
        },
      ],
      metadata: {
        type: "managed_campaign_payment",
        plan: planKey,
        currency: currencyKey,
        duration: String(duration),
        monthly_base: String(monthlyBase),
        cycle_total: String(cycleTotal),
        user_id: user.id,
        user_email: customerEmail || "",
        user_name: customerName || "",
      },
      success_url: `${appUrl}/campanas-gestionadas?payment=success`,
      cancel_url: `${appUrl}/campanas-gestionadas?payment=cancelled`,
    });

    return respond({ url: session.url });
  } catch (err) {
    console.error("[stripe-campaign-checkout] Error:", (err as Error).message);
    return respond({ error: (err as Error).message });
  }
});
