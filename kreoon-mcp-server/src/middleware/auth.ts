import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { MCPAPIKey, AuthContext, AuthScope } from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// In-memory rate limit store — reemplazar por Redis en producción
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function validateAPIKey(rawKey: string): Promise<AuthContext> {
  if (!rawKey.startsWith("sk-kreoon-")) {
    throw new Error("Formato de API key inválido");
  }

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const { data, error } = await supabase
    .from("mcp_api_keys")
    .select("id, creator_id, organization_id, scopes, expires_at, is_revoked, rate_limit_per_hour")
    .eq("key_hash", keyHash)
    .single();

  if (error || !data) {
    throw new Error("API key inválida o no encontrada");
  }

  const key = data as MCPAPIKey;

  if (key.is_revoked) {
    throw new Error("API key revocada");
  }

  if (new Date(key.expires_at) < new Date()) {
    throw new Error("API key expirada");
  }

  // Actualizar last_used_at de forma asíncrona (sin bloquear)
  supabase
    .from("mcp_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)
    .then(() => {});

  return {
    key_id: key.id,
    org_id: key.organization_id,
    user_id: key.creator_id,
    scopes: key.scopes,
  };
}

export function requireScope(scopes: AuthScope[], required: AuthScope): void {
  if (!scopes.includes(required)) {
    throw new Error(`Scope insuficiente. Se requiere: ${required}`);
  }
}

export function checkRateLimit(keyId: string, limitPerHour: number): void {
  const now = Date.now();
  const entry = rateLimitStore.get(keyId);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(keyId, { count: 1, resetAt: now + 3_600_000 });
    return;
  }

  if (entry.count >= limitPerHour) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    throw new Error(`Rate limit alcanzado. Reintentar en ${retryAfterSec} segundos`);
  }

  entry.count++;
}

export async function logAudit(params: {
  key_id: string;
  organization_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  response_status: number;
  response_time_ms?: number;
  ai_tokens_used?: number;
  error_code?: string;
}): Promise<void> {
  try {
    await supabase.from("mcp_audit_logs").insert({
      ...params,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Audit log never blocks the main response
  }
}
