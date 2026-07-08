// ============================================================================
// KREOON — Helper compartido de validación de membresía de organización
//
// Uso desde un edge function:
//
//   const authHeader = req.headers.get("Authorization");
//   const { data: { user } } = await supabaseUser.auth.getUser(token);
//   const rejection = await assertOrgMembership(req, supabaseAdmin, user.id, organizationId);
//   if (rejection) return rejection;
//
// Devuelve `null` si el usuario pertenece a la organización (continuar).
// Devuelve un `Response` 401/403 con headers CORS correctos si no —
// el caller solo necesita `if (rejection) return rejection;`.
//
// FASE 1 (docs/AUDITORIA-MODULOS-2026-07-04.md §0/§8/§9): mata la clase de
// IDOR/quema de tokens cross-org donde una edge function toma
// `organizationId` del body sin validar que el caller sea miembro.
// ============================================================================

import { corsJsonResponse } from "./cors.ts";

// deno-lint-ignore no-explicit-any
type SupabaseClientLike = any;

export async function assertOrgMembership(
  req: Request,
  supabase: SupabaseClientLike,
  userId: string | null | undefined,
  organizationId: string | null | undefined,
): Promise<Response | null> {
  if (!userId) {
    return corsJsonResponse(req, { error: "unauthorized" }, 401);
  }

  if (!organizationId) {
    return corsJsonResponse(req, { error: "organizationId is required" }, 400);
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return corsJsonResponse(
      req,
      { error: "forbidden: not a member of this organization" },
      403,
    );
  }

  return null;
}

/**
 * Variante que además exige que el rol del miembro esté en `allowedRoles`.
 * Útil para acciones que requieren admin/team_leader/strategist, etc.
 */
export async function assertOrgRole(
  req: Request,
  supabase: SupabaseClientLike,
  userId: string | null | undefined,
  organizationId: string | null | undefined,
  allowedRoles: string[],
): Promise<Response | null> {
  if (!userId) {
    return corsJsonResponse(req, { error: "unauthorized" }, 401);
  }

  if (!organizationId) {
    return corsJsonResponse(req, { error: "organizationId is required" }, 400);
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || !allowedRoles.includes(data.role)) {
    return corsJsonResponse(
      req,
      { error: "forbidden: insufficient role for this action" },
      403,
    );
  }

  return null;
}
