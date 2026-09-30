// ============================================================================
// client-user-invite — invita a una persona a una empresa (cliente) y la deja
// vinculada desde el primer momento
// ============================================================================
//
// verify_jwt = true: la llama un admin/estratega desde el diálogo de personas de
// la empresa. Además del JWT se valida server-side que el caller sea staff de la
// organización DUEÑA de la empresa — no alcanza con estar logueado.
//
// Recibe { client_id, email, role?, full_name? }  (role: owner | admin | viewer).
//
//   Caso A — el correo ya tiene cuenta: asegura membresía en la organización
//     con rol 'client' y lo vincula en client_users con el rol pedido.
//   Caso B — el correo no tiene cuenta: lo invita por email (con metadata
//     pending_org_* para el flujo post-confirmación) y lo vincula de inmediato,
//     así el acceso existe aunque tarde en aceptar.
//
// Generaliza client-portal-invite (que solo invita al contacto del formulario
// de onboarding). Idempotente: no pisa roles ya existentes.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

/** Mismos roles de staff habilitados que client-portal-invite. */
const ROLES_HABILITADOS = [
  "admin",
  "team_leader",
  "strategist",
  "digital_strategist",
  "creative_strategist",
];

const ROLES_EMPRESA = ["owner", "admin", "viewer"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A dónde vuelve el invitado tras aceptar (mismo dominio que client-portal-invite). */
const REDIRECT_URL = "https://kreoon.com/auth?invitado=cliente";

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  if (req.method !== "POST") {
    return json(req, { error: "method_not_allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const admin = createClient(url, serviceKey);

  // ── Identificar al caller ────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(req, { error: "unauthorized" }, 401);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } = { user: null } } = await userClient.auth
    .getUser();
  if (!caller) return json(req, { error: "unauthorized" }, 401);

  // ── Validar el body ──────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }

  const clientId = typeof body.client_id === "string" ? body.client_id : "";
  const correo = typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";
  const rol = typeof body.role === "string" ? body.role : "viewer";
  const nombre = typeof body.full_name === "string"
    ? body.full_name.trim().slice(0, 120)
    : "";

  if (!clientId) return json(req, { error: "client_id es requerido" }, 400);
  if (!EMAIL_RE.test(correo)) {
    return json(req, { error: "email_invalido", message: "Correo no válido." }, 400);
  }
  if (!ROLES_EMPRESA.includes(rol)) {
    return json(req, { error: "rol_invalido", message: "Rol no válido." }, 400);
  }

  // ── Cargar la empresa (de ahí sale la organización) ──────────────────────
  const { data: empresa } = await admin
    .from("clients")
    .select("id, name, organization_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!empresa || !empresa.organization_id) {
    return json(req, { error: "client_not_found" }, 404);
  }

  // ── Autorización: el caller debe ser staff de la org DE LA EMPRESA ────────
  const [memberRes, rolesRes] = await Promise.all([
    admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", empresa.organization_id)
      .eq("user_id", caller.id)
      .maybeSingle(),
    admin
      .from("organization_member_roles")
      .select("role")
      .eq("organization_id", empresa.organization_id)
      .eq("user_id", caller.id),
  ]);

  const rolesDelCaller = [
    memberRes.data?.role,
    ...((rolesRes.data ?? []) as { role: string }[]).map((r) => r.role),
  ].filter(Boolean) as string[];

  if (!rolesDelCaller.some((r) => ROLES_HABILITADOS.includes(r))) {
    return json(
      req,
      { error: "forbidden: se requiere admin o estratega de esta organización" },
      403,
    );
  }

  /** Vincula al usuario a la org (rol client) y a la empresa con el rol pedido.
   *  No usa el RPC register_user_to_organization: exige auth.uid() = p_user_id
   *  y acá corremos con service_role (auth.uid() es NULL). */
  const vincular = async (userId: string) => {
    await admin
      .from("organization_members")
      .upsert(
        {
          organization_id: empresa.organization_id,
          user_id: userId,
          role: "client",
          is_owner: false,
        },
        { onConflict: "organization_id,user_id", ignoreDuplicates: true },
      );

    await admin
      .from("organization_member_roles")
      .upsert(
        {
          organization_id: empresa.organization_id,
          user_id: userId,
          role: "client",
        },
        { onConflict: "organization_id,user_id,role", ignoreDuplicates: true },
      );

    const { error } = await admin
      .from("client_users")
      .upsert(
        {
          client_id: empresa.id,
          user_id: userId,
          role: rol,
          created_by: caller.id,
        },
        { onConflict: "client_id,user_id", ignoreDuplicates: true },
      );

    return error;
  };

  // ── Caso A: el correo ya tiene cuenta ────────────────────────────────────
  // Se escapan los comodines de ILIKE (_ y %) para que el correo sea literal.
  const { data: perfil } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", correo.replace(/[\\%_]/g, "\\$&"))
    .maybeSingle();

  if (perfil?.id) {
    const error = await vincular(perfil.id);
    if (error) {
      return json(req, { error: "no_se_pudo_vincular", message: error.message }, 500);
    }
    return json(req, {
      ok: true,
      caso: "vinculado",
      user_id: perfil.id,
      correo,
      message: `${correo} ya tenía cuenta. Le dimos acceso a ${empresa.name}.`,
    });
  }

  // ── Caso B: no tiene cuenta, se invita por email ─────────────────────────
  const { data: invitado, error: inviteError } = await admin.auth.admin
    .inviteUserByEmail(correo, {
      redirectTo: REDIRECT_URL,
      data: {
        ...(nombre ? { full_name: nombre } : {}),
        pending_org_id: empresa.organization_id,
        pending_org_role: "client",
        pending_client_id: empresa.id,
      },
    });

  if (inviteError) {
    if (/already|registered|exists/i.test(inviteError.message)) {
      return json(
        req,
        {
          error: "correo_ya_registrado",
          message:
            "Ese correo ya tiene cuenta pero sin perfil completo. Pídele que inicie sesión una vez y reintenta.",
        },
        409,
      );
    }
    return json(
      req,
      { error: "no_se_pudo_invitar", message: inviteError.message },
      500,
    );
  }

  const nuevoUserId = invitado?.user?.id ?? null;

  // El invite ya creó el usuario en auth: se vincula de una vez para que el
  // acceso exista aunque tarde en aceptar y para que el guard del trigger
  // auto_create_client_from_profile no le cree una empresa duplicada.
  if (nuevoUserId) {
    const error = await vincular(nuevoUserId);
    if (error) {
      return json(req, { error: "no_se_pudo_vincular", message: error.message }, 500);
    }
  }

  return json(req, {
    ok: true,
    caso: "invitado",
    user_id: nuevoUserId,
    correo,
    message: `Le enviamos la invitación a ${correo}. Ya quedó asociado a ${empresa.name}.`,
  });
});
