// ============================================================================
// KREOON STRIPE CREATOR HIRE CHECKOUT
// service_id es obligatorio: precio/título SIEMPRE se leen de
// creator_services en el servidor (nunca del body del request).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Monedas sin decimales (amount NO se multiplica por 100)
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW",
  "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

function toStripeAmount(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase())
    ? Math.round(amount)
    : Math.round(amount * 100);
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
    const {
      service_id,
      creator_id,
      brief_title,
    } = body as {
      service_id?: string;
      creator_id: string;
      brief_title?: string;
    };

    if (!creator_id) throw new Error("Falta parámetro: creator_id");

    // Modo directo (precio/título confiado del body) eliminado: permitía
    // contratar por céntimos enviando cualquier `price`. El precio SIEMPRE
    // se lee de creator_services en el servidor.
    if (!service_id) throw new Error("Falta parámetro: service_id");

    // No puede contratarse a sí mismo
    if (user.id === creator_id) throw new Error("No puedes contratar tu propio servicio");

    // Obtener perfil del creador
    const { data: creatorProfile } = await adminClient
      .from("profiles")
      .select("full_name, username")
      .eq("id", creator_id)
      .single();

    const creatorName = creatorProfile?.full_name || creatorProfile?.username || "Creador";

    // Obtener perfil del comprador (para email en Stripe)
    const { data: buyerProfile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // ─── Precio/título SIEMPRE leídos de creator_services en el servidor ───
    const { data: service, error: svcError } = await adminClient
      .from("creator_services")
      .select("id, user_id, title, description, price_amount, price_currency, price_type, delivery_days, revisions_included, deliverables, is_active")
      .eq("id", service_id)
      .eq("user_id", creator_id)
      .eq("is_active", true)
      .single();

    if (svcError || !service) throw new Error("Servicio no encontrado o no disponible");
    if (service.price_type === "custom" || !service.price_amount || service.price_amount <= 0) {
      throw new Error("Este servicio tiene precio a convenir — contacta al creador directamente");
    }

    // Construir descripción del servicio
    const deliverables: { quantity: number; item: string }[] = service.deliverables || [];
    const featureLines: string[] = [];
    for (const d of deliverables) {
      featureLines.push(d.quantity > 1 ? `${d.quantity}x ${d.item}` : d.item);
    }
    if (service.revisions_included > 0) {
      featureLines.push(`${service.revisions_included} revisión${service.revisions_included > 1 ? "es" : ""}`);
    }
    if (service.delivery_days) {
      featureLines.push(`Entrega en ${service.delivery_days} días`);
    }

    const productName = `${service.title} · @${creatorProfile?.username || creatorName}`;
    const productDescription = featureLines.length > 0
      ? featureLines.join(" · ")
      : service.description || `Servicio de ${creatorName}`;
    const sessionAmount = Number(service.price_amount);
    const sessionCurrency = (service.price_currency || "USD").toLowerCase();
    const sessionMetadata = {
      type: "creator_hire_payment",
      mode: "service",
      service_id: service.id,
      creator_id,
      buyer_id: user.id,
      buyer_name: buyerProfile?.full_name || user.email || "",
      currency: sessionCurrency,
      amount: String(sessionAmount),
      brief_title: brief_title || service.title,
    };

    const appUrl = Deno.env.get("APP_URL") || "https://app.kreoon.com";

    console.log(`[stripe-creator-hire] ${productName} · ${sessionAmount} ${sessionCurrency.toUpperCase()} · buyer=${user.id} · creator=${creator_id} · service=${service_id}`);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: sessionCurrency,
            unit_amount: toStripeAmount(sessionAmount, sessionCurrency),
            product_data: {
              name: productName,
              description: productDescription,
            },
          },
        },
      ],
      metadata: sessionMetadata,
      success_url: `${appUrl}/marketplace/creator/${creator_id}?payment=success`,
      cancel_url: `${appUrl}/marketplace/creator/${creator_id}?payment=cancelled`,
    });

    return respond({ url: session.url });
  } catch (err) {
    console.error("[stripe-creator-hire] Error:", (err as Error).message);
    return respond({ error: (err as Error).message }, 400);
  }
});
