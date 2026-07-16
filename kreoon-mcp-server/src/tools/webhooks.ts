import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import type { AuthContext, ToolResult } from "../types.js";
import { isSafePublicHost } from "../ssrfGuard.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AVAILABLE_EVENTS = ["portfolio.published", "script.generated"] as const;

// ─── Tool definitions ────────────────────────────────────────────────────────

export const webhookToolDefinitions = [
  {
    name: "register_webhook",
    description:
      "🔔 Registra un webhook saliente para conectar n8n/Make/Zapier: KREOON hará un POST firmado " +
      "(HMAC-SHA256, header X-Kreoon-Signature) a esta URL cada vez que ocurra alguno de los eventos indicados. " +
      `Eventos disponibles: ${AVAILABLE_EVENTS.join(", ")}. ` +
      "El secreto para validar la firma se devuelve UNA sola vez al crear el webhook — no se puede recuperar después. " +
      "Solo admin.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre descriptivo, ej. 'n8n - notificar guiones nuevos'" },
        url: { type: "string", description: "URL HTTPS que recibirá el POST" },
        events: {
          type: "array",
          items: { type: "string", enum: [...AVAILABLE_EVENTS] },
          description: "Eventos a los que suscribirse",
        },
      },
      required: ["name", "url", "events"],
    },
  },
  {
    name: "list_webhooks",
    description: "📋 Lista los webhooks registrados en la organización (nunca expone el secreto).",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "revoke_webhook",
    description: "🔕 Desactiva un webhook — deja de recibir eventos.",
    inputSchema: {
      type: "object",
      properties: { webhook_id: { type: "string", description: "UUID del webhook" } },
      required: ["webhook_id"],
    },
  },
];

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function handleWebhookTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult> {
  switch (toolName) {
    case "register_webhook": return registerWebhook(args, auth);
    case "list_webhooks":    return listWebhooks(auth);
    case "revoke_webhook":   return revokeWebhook(args, auth);
    default: return { success: false, error: `Tool desconocida: ${toolName}` };
  }
}

// ─── Implementations ─────────────────────────────────────────────────────────

async function registerWebhook(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const url = args.url as string | undefined;
  const events = args.events as string[] | undefined;
  const name = args.name as string | undefined;

  if (!name) return { success: false, error: "name requerido" };
  if (!url?.startsWith("https://")) return { success: false, error: "La URL debe ser HTTPS" };
  if (!Array.isArray(events) || events.length === 0) return { success: false, error: "events requerido (al menos 1)" };

  const invalid = events.filter(e => !(AVAILABLE_EVENTS as readonly string[]).includes(e));
  if (invalid.length) return { success: false, error: `Eventos desconocidos: ${invalid.join(", ")}` };

  // Guard de SSRF: rechazar destinos que resuelvan a red interna. El
  // dispatcher (mcp-webhook-dispatch) re-valida esto en CADA entrega, porque
  // el DNS puede cambiar entre el registro y la entrega (rebinding) — este
  // chequeo acá es solo para dar feedback inmediato al admin al registrar.
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return { success: false, error: "URL inválida" };
  }
  if (!(await isSafePublicHost(hostname))) {
    return { success: false, error: "El destino no es un host público válido" };
  }

  const secret = crypto.randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("mcp_webhooks")
    .insert({
      user_id: auth.user_id,
      organization_id: auth.org_id,
      name,
      url,
      events,
      secret,
    })
    .select("id, name, url, events, created_at")
    .single();

  if (error) return { success: false, error: `register_webhook: ${error.message}` };

  return {
    success: true,
    data: {
      ...data,
      secret,
      warning: "Guardá este secreto AHORA — no se vuelve a mostrar. Usalo para validar la firma X-Kreoon-Signature (HMAC-SHA256) de cada entrega.",
    },
  };
}

async function listWebhooks(auth: AuthContext): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("mcp_webhooks")
    .select("id, name, url, events, is_active, delivery_failures, last_delivered_at, last_failure_at, last_failure_reason, created_at")
    .eq("organization_id", auth.org_id)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: `list_webhooks: ${error.message}` };
  return { success: true, data: { webhooks: data ?? [], count: data?.length ?? 0 } };
}

async function revokeWebhook(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const webhookId = args.webhook_id as string | undefined;
  if (!webhookId) return { success: false, error: "webhook_id requerido" };

  const { data, error } = await supabase
    .from("mcp_webhooks")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", webhookId)
    .eq("organization_id", auth.org_id) // no se puede desactivar un webhook de otra org
    .select("id")
    .maybeSingle();

  if (error) return { success: false, error: `revoke_webhook: ${error.message}` };
  if (!data) return { success: false, error: "Webhook no encontrado o no pertenece a esta organización" };
  return { success: true, data: { revoked: true } };
}
