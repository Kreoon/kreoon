// ============================================================================
// client-portal-invite — da acceso al portal al contacto del onboarding
// ============================================================================
//
// verify_jwt = true: la llama un admin/estratega desde el panel. Además del
// JWT se valida server-side que el caller pertenezca a la organización DEL
// FORMULARIO con un rol habilitado — no alcanza con estar logueado.
//
// Recibe { form_id }. Toma correo_portal de form_data.equipo y:
//
//   Caso A — el correo ya tiene cuenta: asegura membresía en la organización
//     con rol 'client' y lo vincula en client_users como 'owner'.
//   Caso B — el correo no tiene cuenta: lo invita por email con la metadata
//     pending_org_id / pending_org_role / pending_client_id, que el flujo
//     post-confirmación consume para vincularlo ANTES de su onboarding.
//
// Idempotente: se puede reejecutar sin duplicar (ON CONFLICT sobre el UNIQUE
// (client_id, user_id) de client_users y sobre organization_members).
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

/**
 * Roles de la organización habilitados para invitar.
 *
 * Incluye los nombres legacy y los canónicos actuales por la misma razón que la
 * política RLS de client_onboarding_forms: en producción `organization_members`
 * NO tiene ninguna fila con 'team_leader' ni 'strategist'; los estrategas
 * reales son 'digital_strategist' (4) y 'creative_strategist' (5). Usar solo la
 * lista legacy dejaría la acción disponible únicamente para los 4 admins.
 */
const ROLES_HABILITADOS = [
  "admin",
  "team_leader",
  "strategist",
  "digital_strategist",
  "creative_strategist",
];

/** A dónde vuelve el invitado tras aceptar. Mismo dominio hardcodeado que usan
 *  send-invitation y admin-users (no existe env var de front en el proyecto). */
const REDIRECT_URL = "https://kreoon.com/auth?invitado=cliente";

function json(
  req: Request,
  body: unknown,
  status = 200,
): Response {
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

  // ── Cargar el formulario ─────────────────────────────────────────────────
  let body: { form_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }

  const formId = body?.form_id;
  if (typeof formId !== "string" || !formId) {
    return json(req, { error: "form_id es requerido" }, 400);
  }

  const { data: form, error: formError } = await admin
    .from("client_onboarding_forms")
    .select("id, organization_id, client_id, form_data")
    .eq("id", formId)
    .maybeSingle();

  if (formError || !form) {
    return json(req, { error: "form_not_found" }, 404);
  }

  // ── Autorización: el caller debe ser staff de la org DEL FORMULARIO ───────
  // Se comprueba contra organization_members y, como respaldo, contra
  // organization_member_roles (donde viven los roles múltiples por miembro).
  const [memberRes, rolesRes] = await Promise.all([
    admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", form.organization_id)
      .eq("user_id", caller.id)
      .maybeSingle(),
    admin
      .from("organization_member_roles")
      .select("role")
      .eq("organization_id", form.organization_id)
      .eq("user_id", caller.id),
  ]);

  const rolesDelCaller = [
    memberRes.data?.role,
    ...((rolesRes.data ?? []) as { role: string }[]).map((r) => r.role),
  ].filter(Boolean) as string[];

  const autorizado = rolesDelCaller.some((r) => ROLES_HABILITADOS.includes(r));
  if (!autorizado) {
    return json(
      req,
      { error: "forbidden: se requiere admin o estratega de esta organización" },
      403,
    );
  }

  // ── Correo del portal ────────────────────────────────────────────────────
  const formData = (form.form_data ?? {}) as Record<string, unknown>;
  const equipo = (formData.equipo ?? {}) as Record<string, unknown>;
  const correo = typeof equipo.correo_portal === "string"
    ? equipo.correo_portal.trim().toLowerCase()
    : "";

  if (!correo) {
    return json(
      req,
      {
        error: "sin_correo_portal",
        message: "El formulario no tiene correo para el portal.",
      },
      422,
    );
  }

  const registrar = async (
    estado: string,
    detalle: string,
    userId: string | null,
  ) => {
    await admin
      .from("client_onboarding_forms")
      .update({
        portal_invite: {
          estado,
          correo,
          user_id: userId,
          invitado_por: caller.id,
          invitado_en: new Date().toISOString(),
          detalle,
        },
      })
      .eq("id", form.id);
  };

  /** Vincula al usuario a la org (rol client) y a la empresa del formulario. */
  const vincular = async (userId: string) => {
    // NO se usa el RPC register_user_to_organization: desde 2026-07-07 exige
    // auth.uid() = p_user_id (fix de escalada de privilegios), y acá corremos
    // con service_role, donde auth.uid() es NULL. Se replican sus dos inserts.
    await admin
      .from("organization_members")
      .upsert(
        {
          organization_id: form.organization_id,
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
          organization_id: form.organization_id,
          user_id: userId,
          role: "client",
        },
        { onConflict: "organization_id,user_id,role", ignoreDuplicates: true },
      );

    // El vínculo que importa: sin esto el trigger de onboarding le crearía una
    // empresa duplicada a su nombre (ver migración 20260811200335).
    const { error } = await admin
      .from("client_users")
      .upsert(
        {
          client_id: form.client_id,
          user_id: userId,
          role: "owner",
          created_by: caller.id,
        },
        { onConflict: "client_id,user_id", ignoreDuplicates: true },
      );

    return error;
  };

  // ── Caso A: el correo ya tiene cuenta ────────────────────────────────────
  const { data: perfil } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", correo)
    .maybeSingle();

  if (perfil?.id) {
    const error = await vincular(perfil.id);
    if (error) {
      await registrar("error", error.message, perfil.id);
      return json(req, { error: "no_se_pudo_vincular", message: error.message }, 500);
    }

    await registrar("vinculado", "Ya tenía cuenta; se vinculó a la empresa.", perfil.id);
    return json(req, {
      ok: true,
      caso: "vinculado",
      user_id: perfil.id,
      correo,
      message: "Ya tenía cuenta en Kreoon. Le dimos acceso a la empresa.",
    });
  }

  // ── Caso B: no tiene cuenta, se invita por email ─────────────────────────
  const { data: invitado, error: inviteError } = await admin.auth.admin
    .inviteUserByEmail(correo, {
      redirectTo: REDIRECT_URL,
      data: {
        pending_org_id: form.organization_id,
        pending_org_role: "client",
        pending_client_id: form.client_id,
      },
    });

  if (inviteError) {
    // Si el usuario existe en auth pero no tenía fila en profiles, el invite
    // falla por duplicado. Se resuelve vinculando con el id que devuelve auth.
    const yaExiste = /already|registered|exists/i.test(inviteError.message);
    if (yaExiste) {
      await registrar(
        "error",
        `El correo ya existe en auth pero sin perfil: ${inviteError.message}`,
        null,
      );
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

    await registrar("error", inviteError.message, null);
    return json(
      req,
      { error: "no_se_pudo_invitar", message: inviteError.message },
      500,
    );
  }

  const nuevoUserId = invitado?.user?.id ?? null;

  // El invite ya creó el usuario en auth: se vincula de una vez para que el
  // vínculo exista aunque tarde en aceptar, y para que el guard del trigger
  // lo encuentre pase lo que pase.
  if (nuevoUserId) await vincular(nuevoUserId);

  await registrar("invitado", "Se envió invitación por correo.", nuevoUserId);

  return json(req, {
    ok: true,
    caso: "invitado",
    user_id: nuevoUserId,
    correo,
    message: `Le enviamos la invitación a ${correo}.`,
  });
});
