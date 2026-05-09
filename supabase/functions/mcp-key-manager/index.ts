import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCOPES = {
  client:       ["adn:read", "adn:write", "creators:read", "campaigns:read", "campaigns:write"],
  talent:       ["scripts:read", "scripts:write", "adn:read", "profiles:read", "profiles:write", "wallet:read", "wallet:write"],
  organization: ["scripts:read", "scripts:write", "adn:read", "adn:write", "profiles:read", "profiles:write", "creators:read", "creators:write", "campaigns:read", "campaigns:write", "social:read", "social:write", "wallet:read", "wallet:write", "analytics:read"],
};

const RATE   = { client: 500, talent: 300, organization: 1000 };
const LABELS = { client: "Cliente", talent: "Talento", organization: "Organización" };

function ok(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function err(status: number, msg: string) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return err(401, "No autorizado");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (authErr || !user) return err(401, "Token inválido");

    // Body
    const body = await req.json().catch(() => ({})) as Record<string, string>;
    const action      = body.action ?? "";
    const key_id      = body.key_id ?? "";
    const target_type = body.target_type as keyof typeof SCOPES | "" ?? "";

    // ── LIST ─────────────────────────────────────────────────────────────────
    if (action === "list") {
      const { data: keys, error: e } = await supabase
        .from("mcp_api_keys")
        .select("id, name, key_prefix, scopes, rate_limit_per_hour, is_revoked, expires_at, last_used_at, created_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (e) return err(500, `list: ${e.message}`);
      return ok({ keys: keys ?? [] });
    }

    // ── CREATE ───────────────────────────────────────────────────────────────
    if (action === "create") {
      // Perfil
      const { data: profile, error: pe } = await supabase
        .from("profiles")
        .select("user_type, current_organization_id, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (pe) return err(500, `profile: ${pe.message}`);
      if (!profile) return err(404, "Perfil no encontrado");

      // Org
      let orgId: string | null = profile.current_organization_id ?? null;
      if (!orgId) {
        const { data: m } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();
        orgId = m?.organization_id ?? null;
      }

      // Admin?
      let isAdmin = false;
      if (orgId) {
        const { data: m } = await supabase
          .from("organization_members")
          .select("role, is_owner")
          .eq("user_id", user.id)
          .eq("organization_id", orgId)
          .is("deleted_at", null)
          .maybeSingle();
        isAdmin = m?.role === "admin" || m?.is_owner === true;
      }

      // Admin sin tipo → pedir selección
      if (isAdmin && !target_type) {
        return ok({
          needs_target_selection: true,
          options: [
            { value: "organization", label: "Mi organización",   description: "Acceso completo — 15 scopes, 1000 req/hora" },
            { value: "client",       label: "Cliente o marca",   description: "ADN, campañas y búsqueda de creadores — 500 req/hora" },
            { value: "talent",       label: "Creador / Talento", description: "Guiones, perfil y billetera — 300 req/hora" },
          ],
        });
      }

      // Tipo resuelto
      const validTypes = ["organization", "client", "talent"] as const;
      const resolvedType: keyof typeof SCOPES =
        isAdmin && target_type && validTypes.includes(target_type as typeof validTypes[number])
          ? (target_type as keyof typeof SCOPES)
          : validTypes.includes((profile.user_type ?? "") as typeof validTypes[number])
            ? (profile.user_type as keyof typeof SCOPES)
            : "talent";

      const scopes    = SCOPES[resolvedType];
      const rateLimit = RATE[resolvedType];

      // Límite 3 keys
      const { count, error: ce } = await supabase
        .from("mcp_api_keys")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .eq("is_revoked", false)
        .gt("expires_at", new Date().toISOString());
      if (ce) return err(500, `count: ${ce.message}`);
      if ((count ?? 0) >= 3) return err(409, "Límite de 3 API keys activas. Revoca una antes de crear otra.");

      // Generar
      const uuid      = crypto.randomUUID();
      const rawKey    = `sk-kreoon-${uuid}`;
      const keyHash   = await sha256(rawKey);
      const keyPrefix = `sk-kreoon-${uuid.slice(0, 8)}`;
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { data: newKey, error: ie } = await supabase
        .from("mcp_api_keys")
        .insert({
          name: `API Key ${LABELS[resolvedType]} — ${profile.full_name ?? "Usuario"}`,
          key_hash: keyHash, key_prefix: keyPrefix, scopes,
          creator_id: user.id, organization_id: orgId,
          rate_limit_per_hour: rateLimit, expires_at: expiresAt.toISOString(),
        })
        .select("id, key_prefix, scopes, rate_limit_per_hour, expires_at")
        .single();
      if (ie) return err(500, `insert: ${ie.message}`);

      return ok({ key: rawKey, key_id: newKey.id, key_prefix: keyPrefix, scopes, rate_limit_per_hour: rateLimit, expires_at: expiresAt.toISOString(), account_type: resolvedType });
    }

    // ── REVOKE ───────────────────────────────────────────────────────────────
    if (action === "revoke") {
      if (!key_id) return err(400, "key_id requerido");
      const { error: re } = await supabase
        .from("mcp_api_keys")
        .update({ is_revoked: true, updated_at: new Date().toISOString() })
        .eq("id", key_id)
        .eq("creator_id", user.id);
      if (re) return err(500, `revoke: ${re.message}`);
      return ok({ revoked: true });
    }

    return err(400, `Acción desconocida: ${action}`);

  } catch (e: unknown) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
