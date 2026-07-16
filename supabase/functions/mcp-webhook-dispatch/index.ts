import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dispatcher de eventos hacia webhooks registrados en mcp_webhooks (Fase 2
// del roadmap de expansión del MCP: la tabla existía sin ninguna lógica de
// entrega). Server-to-server únicamente — lo invoca el MCP server (o futuras
// edge functions) cuando ocurre un evento (portfolio.published,
// script.generated, etc.), nunca el navegador.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_FAILURES_BEFORE_DISABLE = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function signPayload(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth: coincidencia exacta con el secreto de service role (nunca
    // expuesto a clientes) — mismo patrón que el bypass de portfolio-ai.
    // Esta función solo la llaman otros servicios internos, nunca un usuario.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token || token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return json({ error: "forbidden" }, 403);
    }

    const { organization_id, event, payload } = (await req.json()) as {
      organization_id?: string;
      event?: string;
      payload?: Record<string, unknown>;
    };

    if (!organization_id || !event) {
      return json({ error: "organization_id y event son requeridos" }, 400);
    }

    const { data: webhooks, error } = await supabase
      .from("mcp_webhooks")
      .select("id, url, secret, delivery_failures")
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .contains("events", [event]);

    if (error) return json({ error: error.message }, 500);
    if (!webhooks?.length) return json({ success: true, matched: 0, delivered: 0 });

    const body = JSON.stringify({ event, data: payload ?? {}, timestamp: new Date().toISOString() });
    let delivered = 0;

    for (const webhook of webhooks) {
      try {
        const signature = await signPayload(webhook.secret, body);
        const res = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Kreoon-Event": event,
            "X-Kreoon-Signature": `sha256=${signature}`,
          },
          body,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        delivered++;
        await supabase
          .from("mcp_webhooks")
          .update({ last_delivered_at: new Date().toISOString(), delivery_failures: 0 })
          .eq("id", webhook.id);
      } catch (deliveryError) {
        const failures = (webhook.delivery_failures ?? 0) + 1;
        const reason = deliveryError instanceof Error ? deliveryError.message : String(deliveryError);
        await supabase
          .from("mcp_webhooks")
          .update({
            delivery_failures: failures,
            last_failure_at: new Date().toISOString(),
            last_failure_reason: reason,
            // Auto-desactivar tras fallos repetidos — evita reintentos
            // infinitos contra un endpoint muerto (mismo criterio que Stripe).
            is_active: failures < MAX_FAILURES_BEFORE_DISABLE,
          })
          .eq("id", webhook.id);
      }
    }

    return json({ success: true, matched: webhooks.length, delivered });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
