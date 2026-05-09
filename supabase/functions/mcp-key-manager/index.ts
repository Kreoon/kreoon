import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Scopes por tipo de cuenta
const ACCOUNT_SCOPES: Record<string, string[]> = {
  // Solo clientes: investigan productos, buscan creadores
  client: ["adn:read", "adn:write", "creators:read", "campaigns:read", "campaigns:write"],
  // Creadores: generan guiones, optimizan perfil, gestionan wallet
  talent: ["scripts:read", "scripts:write", "adn:read", "profiles:read", "profiles:write", "wallet:read", "wallet:write"],
  // Agencias/admin: acceso completo
  organization: [
    "scripts:read", "scripts:write",
    "adn:read", "adn:write",
    "profiles:read", "profiles:write",
    "creators:read", "creators:write",
    "campaigns:read", "campaigns:write",
    "social:read", "social:write",
    "wallet:read", "wallet:write",
    "analytics:read",
  ],
};

const RATE_LIMITS: Record<string, number> = {
  client: 500,
  talent: 300,
  organization: 1000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verificar JWT del usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorRes(401, "No autorizado");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return errorRes(401, "Token inválido");

    const { action } = await req.json();

    // ── Acción: crear key ────────────────────────────────────────────────
    if (action === "create") {
      // Obtener perfil y organización del usuario
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, organization_id, display_name")
        .eq("id", user.id)
        .single();

      if (!profile) return errorRes(404, "Perfil no encontrado");

      // Admins de la org también obtienen scopes de organización
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      const accountType = adminRole ? "organization" : (profile.account_type ?? "talent");
      const scopes = ACCOUNT_SCOPES[accountType] ?? ACCOUNT_SCOPES["talent"];
      const rateLimit = RATE_LIMITS[accountType] ?? 300;

      // Verificar si ya tiene una key activa (máx 3 keys por usuario)
      const { count } = await supabase
        .from("mcp_api_keys")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .eq("is_revoked", false)
        .gt("expires_at", new Date().toISOString());

      if ((count ?? 0) >= 3) {
        return errorRes(409, "Límite de 3 API keys activas alcanzado. Revoca una antes de crear otra.");
      }

      // Generar key única
      const uuid = crypto.randomUUID();
      const rawKey = `sk-kreoon-${uuid}`;
      const keyHash = await sha256(rawKey);
      const keyPrefix = `sk-kreoon-${uuid.slice(0, 8)}`;

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { data: newKey, error: insertError } = await supabase
        .from("mcp_api_keys")
        .insert({
          name: `API Key — ${profile.display_name ?? "Usuario"}`,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          scopes,
          creator_id: user.id,
          organization_id: profile.organization_id,
          rate_limit_per_hour: rateLimit,
          expires_at: expiresAt.toISOString(),
        })
        .select("id, key_prefix, scopes, rate_limit_per_hour, expires_at")
        .single();

      if (insertError) return errorRes(500, insertError.message);

      return okRes({
        key: rawKey,        // Solo se muestra UNA VEZ
        key_id: newKey.id,
        key_prefix: keyPrefix,
        scopes,
        rate_limit_per_hour: rateLimit,
        expires_at: expiresAt.toISOString(),
        account_type: accountType,
      });
    }

    // ── Acción: listar keys ──────────────────────────────────────────────
    if (action === "list") {
      const { data: keys } = await supabase
        .from("mcp_api_keys")
        .select("id, name, key_prefix, scopes, rate_limit_per_hour, is_revoked, expires_at, last_used_at, created_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      return okRes({ keys: keys ?? [] });
    }

    // ── Acción: revocar key ──────────────────────────────────────────────
    if (action === "revoke") {
      const { key_id } = await req.json().catch(() => ({}));
      if (!key_id) return errorRes(400, "key_id requerido");

      const { error } = await supabase
        .from("mcp_api_keys")
        .update({ is_revoked: true, updated_at: new Date().toISOString() })
        .eq("id", key_id)
        .eq("creator_id", user.id); // Solo puede revocar sus propias keys

      if (error) return errorRes(500, error.message);
      return okRes({ revoked: true });
    }

    return errorRes(400, `Acción desconocida: ${action}`);

  } catch (err) {
    return errorRes(500, (err as Error).message);
  }
});

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function okRes(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorRes(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
