// ============================================================================
// KREOON STRIPE CLIENT CHECKOUT
// Crea una sesión de Stripe Checkout para que un cliente pague su paquete
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Stripe zero-decimal currencies (amount NOT multiplied by 100)
const ZERO_DECIMAL = new Set(["BIF","CLP","DJF","GNF","JPY","KMF","KRW","MGA","PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF"]);

function toStripeAmount(amount: number, currency: string): number {
  const code = currency.toUpperCase();
  return ZERO_DECIMAL.has(code) ? Math.round(amount) : Math.round(amount * 100);
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

    // Cliente con servicio para verificar el token
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) throw new Error("Token inválido");

    // Soporta pago individual (package_id) o múltiple (package_ids: string[])
    const body = await req.json();
    const packageIds: string[] = body.package_ids
      ? body.package_ids
      : body.package_id
      ? [body.package_id]
      : [];

    if (packageIds.length === 0) throw new Error("Falta package_id o package_ids");

    // ── Autorización: usar JWT del usuario para que RLS valide automáticamente ──
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: packages, error: pkgError } = await userClient
      .from("client_packages")
      .select("id, name, total_value, paid_amount, payment_status, currency, client_id")
      .in("id", packageIds);

    if (pkgError || !packages || packages.length === 0) {
      console.error("[stripe-client-checkout] Package query error:", pkgError);
      throw new Error("Paquetes no encontrados o no autorizados");
    }

    // Verificar que todos los paquetes sean de la misma moneda
    const currencies = [...new Set(packages.map(p => (p.currency || "USD").toLowerCase()))];
    if (currencies.length > 1) throw new Error("No se pueden pagar paquetes de distintas monedas en una sola transacción");

    const currency = currencies[0];

    // Obtener datos del cliente para el email
    const firstClientId = packages[0].client_id;
    const { data: clientData } = await adminClient
      .from("clients")
      .select("name, contact_email")
      .eq("id", firstClientId)
      .single();

    const appUrl = Deno.env.get("APP_URL") || "https://app.kreoon.com";
    const customerEmail = clientData?.contact_email || user.email || undefined;

    // Construir line_items: uno por paquete
    const lineItems = packages
      .map(pkg => {
        const pending = Math.max(0, Number(pkg.total_value) - Number(pkg.paid_amount));
        if (pending <= 0) return null;
        return {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: toStripeAmount(pending, currency),
            product_data: {
              name: `${clientData?.name ? `${clientData.name} — ` : ""}${pkg.name}`,
              description: `Abono al paquete "${pkg.name}"`,
            },
          },
        };
      })
      .filter(Boolean) as any[];

    if (lineItems.length === 0) throw new Error("No hay montos pendientes en los paquetes seleccionados");

    const totalAmount = packages.reduce((sum, p) => sum + Math.max(0, Number(p.total_value) - Number(p.paid_amount)), 0);

    console.log(`[stripe-client-checkout] Creating session: ${lineItems.length} packages, total=${totalAmount} ${currency}, user=${user.id}`);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: lineItems,
      metadata: {
        type: "client_package_payment",
        // Para múltiples paquetes, guardar IDs separados por coma
        package_ids: packageIds.join(","),
        package_id: packageIds[0], // compatibilidad con handler existente
        client_id: firstClientId,
        user_id: user.id,
        // Guardar el monto pendiente de cada paquete en orden
        amounts: packages.map(p => Math.max(0, Number(p.total_value) - Number(p.paid_amount))).join(","),
        currency,
      },
      success_url: `${appUrl}/client-dashboard?payment=success`,
      cancel_url: `${appUrl}/client-dashboard?payment=cancelled`,
    });

    return respond({ url: session.url });
  } catch (err) {
    console.error("[stripe-client-checkout] Error:", (err as Error).message);
    return respond({ error: (err as Error).message });
  }
});
