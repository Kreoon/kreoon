import type { AuthScope } from "./types.js";

// Espejo de src/lib/permissionGroups.ts (paquete separado, no puede importar de la app).
// Cualquier cambio en el modelo de 8 roles → 4 grupos debe reflejarse en ambos lados.
export type PermissionGroup = "admin" | "talent" | "client";

const ROLE_TO_GROUP: Record<string, PermissionGroup> = {
  admin: "admin",
  team_leader: "admin",

  content_creator: "talent",
  editor: "talent",
  digital_strategist: "talent",
  creative_strategist: "talent",
  community_manager: "talent",
  creator: "talent",
  ambassador: "talent",
  strategist: "talent",
  trafficker: "talent",
  developer: "talent",
  educator: "talent",

  client: "client",
  brand_manager: "client",
  marketing_director: "client",
};

/**
 * Deriva el grupo de permisos desde el rol REAL de organization_members,
 * no desde un valor congelado al crear la API key. is_owner siempre es admin.
 */
export function resolveGroup(role: string | null | undefined, isOwner: boolean): PermissionGroup {
  if (isOwner) return "admin";
  if (!role) return "talent";
  return ROLE_TO_GROUP[role] ?? "talent";
}

// Los 6 scopes realmente usados por TOOL_SCOPES en api/index.ts.
export const GROUP_SCOPES: Record<PermissionGroup, AuthScope[]> = {
  admin: ["scripts:write", "creators:read", "profiles:write", "social:write", "campaigns:read", "campaigns:write"],
  talent: ["scripts:write", "creators:read", "profiles:write", "social:write", "campaigns:read", "campaigns:write"],
  client: ["creators:read", "campaigns:read", "campaigns:write"],
};

export const GROUP_RATE_LIMIT: Record<PermissionGroup, number> = {
  admin: 1000,
  talent: 500,
  client: 300,
};

// Segunda capa de autorización, más fina que los scopes: qué tool puede
// invocar cada grupo. Existe porque "campaigns:write" agrupa acciones de
// privilegio muy distinto (crear item de contenido vs. aprobar guión vs.
// crear cliente/campaña) — el scope solo no alcanza para separarlas por rol.
const ADMIN_ONLY_TOOLS = new Set<string>([
  "create_client",
  "create_product",
  "create_marketplace_campaign",
  "manage_campaign_application",
  "assign_content_team",
  "assign_editor_to_project",
  "mark_content_payment",
  "generate_brand_dna",
  "generate_product_dna_v1",
  "get_org_dashboard",
  "list_org_members",
  // Webhooks salientes: definen a dónde fluye información de la org hacia
  // afuera (n8n/Make) — decisión de integración a nivel organización, no
  // de un talento individual.
  "register_webhook",
  "list_webhooks",
  "revoke_webhook",
]);

// Tools que un cliente (rol "client") puede usar: solo lectura + aprobación/feedback
// sobre contenido de su propia organización. Nada de creación, generación IA,
// asignación de equipo, ni operaciones de marketplace/talento.
const CLIENT_ALLOWED_TOOLS = new Set<string>([
  "list_content_items",
  "get_content_item",
  "approve_content_script",
  "list_clients",
  "list_products",
  "get_brand_dna",
  "get_product_dna_status",
  "list_marketplace_campaigns",
  "list_marketplace_projects",
  "search_creators",
  "score_creator_for_campaign",
]);

export function isToolAllowedForGroup(toolName: string, group: PermissionGroup): boolean {
  if (group === "admin") return true;
  if (ADMIN_ONLY_TOOLS.has(toolName)) return false;
  if (group === "client") return CLIENT_ALLOWED_TOOLS.has(toolName);
  // talent: todo lo que no sea admin-only
  return true;
}
