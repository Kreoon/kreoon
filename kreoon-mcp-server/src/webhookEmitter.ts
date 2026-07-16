import { createClient } from "@supabase/supabase-js";
import type { AuthContext } from "./types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Dispara un evento hacia los webhooks activos de la organización (fire and
 * forget). Un fallo de entrega NUNCA debe romper la respuesta de la tool que
 * lo dispara — por eso no se hace `await` en los callers, solo se loguea.
 */
export function emitWebhookEvent(auth: AuthContext, event: string, data: Record<string, unknown>): void {
  supabase.functions
    .invoke("mcp-webhook-dispatch", {
      body: { organization_id: auth.org_id, event, payload: data },
      headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    })
    .catch(e => console.error(`[emitWebhookEvent:${event}]`, e));
}
