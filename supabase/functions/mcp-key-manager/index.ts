import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Espejo de kreoon-mcp-server/src/permissions.ts. El MCP server vuelve a
// derivar el grupo desde organization_members.role EN CADA REQUEST — lo que
// se guarda acá es solo un snapshot inicial para mostrar en la UI de Settings,
// nunca la fuente de autoridad de scopes.
const ROLE_TO_GROUP: Record<string, "admin" | "talent" | "client"> = {
  admin: "admin", team_leader: "admin",
  content_creator: "talent", editor: "talent", digital_strategist: "talent",
  creative_strategist: "talent", community_manager: "talent",
  creator: "talent", ambassador: "talent", strategist: "talent", trafficker: "talent",
  developer: "talent", educator: "talent",
  client: "client", brand_manager: "client", marketing_director: "client",
};

const SCOPES = {
  client:       ["creators:read", "campaigns:read", "campaigns:write"],
  talent:       ["scripts:write", "creators:read", "profiles:write", "social:write", "campaigns:read", "campaigns:write"],
  admin:        ["scripts:write", "creators:read", "profiles:write", "social:write", "campaigns:read", "campaigns:write"],
};

const RATE   = { client: 300, talent: 500, admin: 1000 };
const LABELS = { client: "Cliente", talent: "Talento", admin: "Administrador" };

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
    const action = body.action ?? "";
    const key_id = body.key_id ?? "";

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
    // Cualquier miembro activo de una organización puede crear su propia key —
    // el grupo de permisos (y por lo tanto los scopes) sale de su ROL REAL en
    // organization_members, no de una elección manual. El MCP server además
    // re-deriva el grupo en cada request, así que esto es solo el snapshot
    // inicial mostrado en Settings.
    if (action === "create") {
      const { data: profile, error: pe } = await supabase
        .from("profiles")
        .select("current_organization_id, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (pe) return err(500, `profile: ${pe.message}`);
      if (!profile) return err(404, "Perfil no encontrado");

      let orgId: string | null = profile.current_organization_id ?? null;
      let membershipRole: string | null = null;
      let isOwner = false;

      if (orgId) {
        const { data: m } = await supabase
          .from("organization_members")
          .select("role, is_owner")
          .eq("user_id", user.id)
          .eq("organization_id", orgId)
          .is("deleted_at", null)
          .maybeSingle();
        membershipRole = m?.role ?? null;
        isOwner = m?.is_owner === true;
      }

      if (!orgId || !membershipRole) {
        // Sin membresía activa: buscar cualquier org donde sí sea miembro
        // (current_organization_id puede estar desactualizado).
        const { data: m } = await supabase
          .from("organization_members")
          .select("organization_id, role, is_owner")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();
        if (!m) return err(403, "No perteneces a ninguna organización. El MCP requiere una membresía activa.");
        orgId = m.organization_id;
        membershipRole = m.role;
        isOwner = m.is_owner === true;
      }

      const resolvedType: keyof typeof SCOPES = isOwner ? "admin" : (ROLE_TO_GROUP[membershipRole] ?? "talent");
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
