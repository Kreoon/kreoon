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

// ─── SSRF guard ──────────────────────────────────────────────────────────────
// webhook.url la eligió un admin de una org al registrar el webhook — no es
// input confiable a nivel de infraestructura. Sin esto, este dispatcher es un
// proxy para sondear red interna (IPs privadas, metadata de la nube en
// 169.254.169.254, etc.) usando nuestra infra como origen. Se re-valida en
// CADA entrega (no solo al registrar) porque el DNS puede cambiar entre el
// registro y la entrega (rebinding).
const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],  // CGNAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local / metadata de nube
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
];

function ipv4ToLong(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const long = ipv4ToLong(ip);
  return PRIVATE_IPV4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (long & mask) === (ipv4ToLong(base) & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

async function isSafePublicHost(hostname: string): Promise<boolean> {
  try {
    const [aRes, aaaaRes] = await Promise.allSettled([
      Deno.resolveDns(hostname, "A"),
      Deno.resolveDns(hostname, "AAAA"),
    ]);
    const addresses: string[] = [
      ...(aRes.status === "fulfilled" ? aRes.value : []),
      ...(aaaaRes.status === "fulfilled" ? aaaaRes.value : []),
    ];
    if (addresses.length === 0) return false;
    return addresses.every((addr) => (addr.includes(":") ? !isPrivateIPv6(addr) : !isPrivateIPv4(addr)));
  } catch {
    return false;
  }
}

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
        const parsedUrl = new URL(webhook.url);
        if (parsedUrl.protocol !== "https:" || !(await isSafePublicHost(parsedUrl.hostname))) {
          throw new Error("Destino no permitido (guard SSRF)");
        }

        const signature = await signPayload(webhook.secret, body);
        const res = await fetch(webhook.url, {
          method: "POST",
          redirect: "manual", // no seguir redirects — podrían reapuntar a un destino interno no validado
          headers: {
            "Content-Type": "application/json",
            "X-Kreoon-Event": event,
            "X-Kreoon-Signature": `sha256=${signature}`,
          },
          body,
        });

        if (res.status >= 300 && res.status < 400) throw new Error(`Redirect rechazado (HTTP ${res.status})`);
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
