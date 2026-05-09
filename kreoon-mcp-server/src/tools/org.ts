import { createClient } from "@supabase/supabase-js";
import type { AuthContext, ToolResult } from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Tool definitions ────────────────────────────────────────────────────────

export const orgToolDefinitions = [
  {
    name: "get_org_dashboard",
    description:
      "Resumen operativo completo de la organización: contenido por estado, " +
      "ítems vencidos, pagos pendientes y pipeline del marketplace. " +
      "Ideal como primera llamada para entender el estado actual antes de tomar decisiones.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_org_members",
    description:
      "Lista todos los miembros activos de la organización con su rol, nombre y avatar. " +
      "Úsalo para obtener los UUIDs correctos antes de asignar creadores, editores o estrategas a contenido.",
    inputSchema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description: "Filtrar por rol: admin, creator, editor, strategist, trafficker, client, team_leader",
        },
        search: {
          type: "string",
          description: "Buscar miembro por nombre (búsqueda parcial, ej: 'Diana', 'Torres')",
        },
        include_clients: {
          type: "boolean",
          description: "Incluir miembros con rol client (default: false)",
        },
      },
      required: [],
    },
  },
  {
    name: "list_clients",
    description:
      "Lista los clientes/marcas registradas en la organización. " +
      "Retorna el UUID de cada cliente para usarlo en create_content_item.",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Buscar por nombre del cliente" },
        is_vip: { type: "boolean", description: "Solo clientes VIP (opcional)" },
        limit: { type: "number", description: "Cantidad de resultados (default: 30, max: 100)", minimum: 1, maximum: 100 },
      },
      required: [],
    },
  },
  {
    name: "create_client",
    description:
      "Crea un nuevo cliente o marca en la organización. " +
      "Retorna el UUID del cliente para usarlo inmediatamente en asignaciones de contenido.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre de la marca o cliente" },
        contact_email: { type: "string", description: "Email de contacto (opcional)" },
        contact_phone: { type: "string", description: "Teléfono de contacto (opcional)" },
        category: {
          type: "string",
          description: "Categoría: fashion, beauty, tech, food, fitness, lifestyle, education, health, finance, other",
        },
        website: { type: "string", description: "Sitio web (opcional)" },
        instagram: { type: "string", description: "Handle de Instagram sin @ (opcional)" },
        tiktok: { type: "string", description: "Handle de TikTok sin @ (opcional)" },
        notes: { type: "string", description: "Notas internas sobre el cliente (opcional)" },
        main_contact: { type: "string", description: "Nombre de la persona de contacto (opcional)" },
        city: { type: "string", description: "Ciudad (opcional)" },
        country: { type: "string", description: "País ISO 2 (ej: CO, MX, AR)" },
      },
      required: ["name"],
    },
  },
];

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function handleOrgTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult> {
  switch (toolName) {
    case "get_org_dashboard": return getOrgDashboard(auth);
    case "list_org_members":  return listOrgMembers(args, auth);
    case "list_clients":      return listClients(args, auth);
    case "create_client":     return createClient_(args, auth);
    default: return { success: false, error: `Tool desconocida: ${toolName}` };
  }
}

// ─── Implementations ─────────────────────────────────────────────────────────

async function getOrgDashboard(auth: AuthContext): Promise<ToolResult> {
  const [overdueRes, pendingPayRes, marketplaceRes] = await Promise.all([
    // Ítems vencidos sin completar
    supabase
      .from("content")
      .select("id, title, status, deadline, creator_id, editor_id", { count: "exact", head: false })
      .eq("organization_id", auth.org_id)
      .is("deleted_at", null)
      .lt("deadline", new Date().toISOString())
      .not("status", "in", '("approved","published","paid")')
      .limit(5),

    // Pagos pendientes a creadores
    supabase
      .from("content")
      .select("id, title, creator_id, creator_payment, editor_id, editor_payment", { count: "exact", head: false })
      .eq("organization_id", auth.org_id)
      .is("deleted_at", null)
      .eq("status", "approved")
      .or("creator_paid.is.false,creator_paid.is.null")
      .limit(5),

    // Proyectos marketplace activos
    supabase
      .from("marketplace_projects")
      .select("id, title, status, creator_id, deadline", { count: "exact", head: false })
      .eq("organization_id", auth.org_id)
      .in("status", ["pending", "active", "in_review"])
      .limit(5),
  ]);

  // Conteo por estado
  const { data: allContent } = await supabase
    .from("content")
    .select("status")
    .eq("organization_id", auth.org_id)
    .is("deleted_at", null);

  const statusCounts: Record<string, number> = {};
  for (const row of allContent ?? []) {
    const s = row.status ?? "draft";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  // Resolver UUIDs de creators/editors a nombres reales
  const allUserIds = new Set<string>();
  for (const item of [...(overdueRes.data ?? []), ...(pendingPayRes.data ?? []), ...(marketplaceRes.data ?? [])] as Record<string, unknown>[]) {
    if (item.creator_id) allUserIds.add(item.creator_id as string);
    if (item.editor_id)  allUserIds.add(item.editor_id  as string);
  }

  const nameMap: Record<string, string> = {};
  if (allUserIds.size > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, display_name")
      .in("id", [...allUserIds]);

    for (const p of profileRows ?? []) {
      nameMap[p.id] = p.full_name ?? p.display_name ?? p.id;
    }
  }

  const resolveNames = (items: Record<string, unknown>[]) =>
    items.map(item => ({
      ...item,
      creator_name: item.creator_id ? (nameMap[item.creator_id as string] ?? item.creator_id) : null,
      editor_name:  item.editor_id  ? (nameMap[item.editor_id  as string] ?? item.editor_id)  : null,
    }));

  return {
    success: true,
    data: {
      content_pipeline: statusCounts,
      total_content: allContent?.length ?? 0,
      overdue_items: resolveNames(overdueRes.data ?? []),
      overdue_count: overdueRes.count ?? 0,
      pending_payments: resolveNames(pendingPayRes.data ?? []),
      pending_payments_count: pendingPayRes.count ?? 0,
      active_marketplace_projects: resolveNames(marketplaceRes.data ?? []),
      active_marketplace_count: marketplaceRes.count ?? 0,
    },
  };
}

async function listOrgMembers(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const includeClients = args.include_clients === true;
  const searchName = (args.search as string | undefined)?.trim();

  let membersQuery = supabase
    .from("organization_members")
    .select("user_id, role, is_owner, joined_at, is_ambassador, ambassador_level")
    .eq("organization_id", auth.org_id)
    .is("deleted_at", null);

  if (args.role) membersQuery = membersQuery.eq("role", args.role);
  if (!includeClients) membersQuery = membersQuery.neq("role", "client");

  const { data: members, error: membersErr } = await membersQuery;
  if (membersErr) return { success: false, error: `list_org_members: ${membersErr.message}` };
  if (!members?.length) return { success: true, data: { members: [], count: 0 } };

  const userIds = members.map(m => m.user_id);

  let profilesQuery = supabase
    .from("profiles")
    .select("id, full_name, display_name, avatar_url, user_type")
    .in("id", userIds);

  // Filtrar por nombre en la capa de perfiles
  if (searchName) {
    profilesQuery = profilesQuery.or(
      `full_name.ilike.%${searchName}%,display_name.ilike.%${searchName}%`
    );
  }

  const { data: profiles } = await profilesQuery;
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  // Si hay búsqueda por nombre, excluir miembros sin perfil coincidente
  const filteredMembers = searchName
    ? members.filter(m => profileMap[m.user_id])
    : members;

  const result = filteredMembers.map(m => ({
    user_id: m.user_id,
    role: m.role,
    is_owner: m.is_owner ?? false,
    full_name: profileMap[m.user_id]?.full_name ?? profileMap[m.user_id]?.display_name ?? "Sin nombre",
    avatar_url: profileMap[m.user_id]?.avatar_url ?? null,
    is_ambassador: m.is_ambassador ?? false,
    ambassador_level: m.ambassador_level ?? null,
    joined_at: m.joined_at,
  }));

  return { success: true, data: { members: result, count: result.length } };
}

async function listClients(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  let query = supabase
    .from("clients")
    .select("id, name, contact_email, contact_phone, category, city, country, instagram, tiktok, website, is_vip, main_contact, created_at")
    .eq("organization_id", auth.org_id)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit((args.limit as number) ?? 30);

  if (args.search) query = query.ilike("name", `%${args.search}%`);
  if (args.is_vip === true) query = query.eq("is_vip", true);

  const { data, error } = await query;
  if (error) return { success: false, error: `list_clients: ${error.message}` };
  return { success: true, data: { clients: data ?? [], count: data?.length ?? 0 } };
}

async function createClient_(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name:          args.name,
      contact_email: args.contact_email ?? null,
      contact_phone: args.contact_phone ?? null,
      category:      args.category ?? null,
      website:       args.website ?? null,
      instagram:     args.instagram ?? null,
      tiktok:        args.tiktok ?? null,
      notes:         args.notes ?? null,
      main_contact:  args.main_contact ?? null,
      city:          args.city ?? null,
      country:       args.country ?? null,
      organization_id: auth.org_id,
      created_by:    auth.user_id,
      created_at:    now,
      updated_at:    now,
    })
    .select("id, name, category, contact_email, city, country, created_at")
    .single();

  if (error) return { success: false, error: `create_client: ${error.message}` };
  return { success: true, data };
}
