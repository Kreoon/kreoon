import { createClient } from "@supabase/supabase-js";
import type { AuthContext, ToolResult } from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Tool definitions ────────────────────────────────────────────────────────

export const projectsToolDefinitions = [
  {
    name: "create_marketplace_project",
    description:
      "Crea un proyecto directo en el marketplace entre la organización y un creador específico. " +
      "Úsalo cuando ya tienes al creador elegido y quieres iniciar el proyecto sin pasar por una campaña pública.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título del proyecto" },
        creator_id: { type: "string", description: "UUID del creador asignado" },
        editor_id: { type: "string", description: "UUID del editor (opcional)" },
        project_type: {
          type: "string",
          enum: ["standard", "express", "package", "retainer"],
          description: "Tipo de proyecto",
        },
        brief: {
          type: "object",
          description: "Brief del proyecto: { description, deliverables, reference_urls, style_notes }",
          properties: {
            description: { type: "string" },
            deliverables: { type: "string" },
            reference_urls: { type: "array", items: { type: "string" } },
            style_notes: { type: "string" },
          },
        },
        total_price: { type: "number", description: "Precio total del proyecto en USD" },
        creator_payout: { type: "number", description: "Pago al creador en USD" },
        editor_payout: { type: "number", description: "Pago al editor en USD (si aplica)" },
        deliverables_count: { type: "number", description: "Número de entregables esperados", minimum: 1 },
        revisions_limit: { type: "number", description: "Número de revisiones incluidas (default: 2)", minimum: 0 },
        delivery_days: { type: "number", description: "Días de entrega desde hoy", minimum: 1 },
        requires_editor: { type: "boolean", description: "¿El proyecto requiere editor? (default: false)" },
        payment_method: {
          type: "string",
          enum: ["platform_escrow", "direct", "stripe"],
          description: "Método de pago",
        },
      },
      required: ["title", "creator_id", "project_type"],
    },
  },
  {
    name: "list_marketplace_projects",
    description:
      "Lista proyectos del marketplace de la organización con filtros. " +
      "Muestra estado, creador, editor, pagos y fechas de entrega.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "active", "in_review", "revision", "completed", "cancelled", "disputed"],
          description: "Filtrar por estado del proyecto",
        },
        creator_id: { type: "string", description: "Filtrar por creador" },
        editor_id: { type: "string", description: "Filtrar por editor" },
        project_type: { type: "string", description: "Filtrar por tipo de proyecto" },
        overdue_only: { type: "boolean", description: "Solo proyectos vencidos (default: false)" },
        limit: { type: "number", description: "Cantidad de resultados (default: 20, max: 100)", minimum: 1, maximum: 100 },
      },
      required: [],
    },
  },
  {
    name: "assign_editor_to_project",
    description:
      "Asigna o cambia el editor de un proyecto marketplace. " +
      "Actualiza el payout del editor y los timestamps de asignación.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID del proyecto marketplace" },
        editor_id: { type: "string", description: "UUID del editor a asignar (null para remover)" },
        editor_payout: { type: "number", description: "Pago al editor en USD" },
      },
      required: ["project_id", "editor_id"],
    },
  },
  {
    name: "update_project_status",
    description:
      "Actualiza el estado de un proyecto marketplace. " +
      "Úsalo para mover proyectos a lo largo del pipeline: pending → active → in_review → completed.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID del proyecto marketplace" },
        status: {
          type: "string",
          enum: ["pending", "active", "in_review", "revision", "completed", "cancelled", "disputed"],
          description: "Nuevo estado del proyecto",
        },
        notes: { type: "string", description: "Notas del cambio de estado (opcional)" },
        extend_deadline_days: { type: "number", description: "Extender deadline N días desde hoy (opcional)", minimum: 1 },
      },
      required: ["project_id", "status"],
    },
  },
];

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function handleProjectsTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult> {
  switch (toolName) {
    case "create_marketplace_project": return createMarketplaceProject(args, auth);
    case "list_marketplace_projects":  return listMarketplaceProjects(args, auth);
    case "assign_editor_to_project":   return assignEditorToProject(args, auth);
    case "update_project_status":      return updateProjectStatus(args, auth);
    default: return { success: false, error: `Tool desconocida: ${toolName}` };
  }
}

// ─── Implementations ─────────────────────────────────────────────────────────

async function createMarketplaceProject(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const now = new Date().toISOString();
  const deliveryDays = args.delivery_days as number | undefined;
  const deadline = deliveryDays
    ? new Date(Date.now() + deliveryDays * 86400000).toISOString()
    : null;

  const insert: Record<string, unknown> = {
    title:              args.title,
    creator_id:         args.creator_id,
    editor_id:          args.editor_id ?? null,
    project_type:       args.project_type,
    brief:              args.brief ?? null,
    total_price:        args.total_price ?? null,
    creator_payout:     args.creator_payout ?? null,
    editor_payout:      args.editor_payout ?? null,
    deliverables_count: args.deliverables_count ?? 1,
    revisions_limit:    args.revisions_limit ?? 2,
    delivery_days:      deliveryDays ?? null,
    deadline,
    requires_editor:    args.requires_editor ?? false,
    payment_method:     args.payment_method ?? "platform_escrow",
    currency:           "USD",
    organization_id:    auth.org_id,
    status:             "pending",
    created_at:         now,
    updated_at:         now,
  };

  if (args.editor_id) {
    insert.editor_assigned_at = now;
    insert.editor_assigned_by = auth.user_id;
  }

  const { data, error } = await supabase
    .from("marketplace_projects")
    .insert(insert)
    .select("id, title, status, creator_id, editor_id, total_price, creator_payout, deadline, project_type, created_at")
    .single();

  if (error) return { success: false, error: `create_marketplace_project: ${error.message}` };
  return { success: true, data };
}

async function listMarketplaceProjects(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  let query = supabase
    .from("marketplace_projects")
    .select("id, title, status, project_type, creator_id, editor_id, total_price, creator_payout, editor_payout, deadline, delivery_days, deliverables_count, deliverables_approved, created_at, updated_at, started_at, completed_at")
    .eq("organization_id", auth.org_id)
    .order("created_at", { ascending: false })
    .limit((args.limit as number) ?? 20);

  if (args.status)       query = query.eq("status", args.status);
  if (args.creator_id)   query = query.eq("creator_id", args.creator_id);
  if (args.editor_id)    query = query.eq("editor_id", args.editor_id);
  if (args.project_type) query = query.eq("project_type", args.project_type);
  if (args.overdue_only) query = query.lt("deadline", new Date().toISOString()).neq("status", "completed");

  const { data, error } = await query;
  if (error) return { success: false, error: `list_marketplace_projects: ${error.message}` };
  return { success: true, data: { projects: data ?? [], count: data?.length ?? 0 } };
}

async function assignEditorToProject(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const { project_id, editor_id, editor_payout } = args;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    editor_id,
    editor_assigned_at: editor_id ? now : null,
    editor_assigned_by: editor_id ? auth.user_id : null,
    requires_editor:    !!editor_id,
    updated_at:         now,
  };
  if (editor_payout !== undefined) updates.editor_payout = editor_payout;

  const { data, error } = await supabase
    .from("marketplace_projects")
    .update(updates)
    .eq("id", project_id)
    .eq("organization_id", auth.org_id)
    .select("id, title, editor_id, editor_payout, editor_assigned_at")
    .single();

  if (error) return { success: false, error: `assign_editor_to_project: ${error.message}` };
  if (!data)  return { success: false, error: "Proyecto no encontrado o sin acceso" };
  return { success: true, data };
}

async function updateProjectStatus(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const { project_id, status, notes, extend_deadline_days } = args;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { status, updated_at: now };
  if (notes) updates.overdue_notes = notes;

  if (status === "active" && !updates.started_at) updates.started_at = now;
  if (status === "completed") updates.completed_at = now;

  if (extend_deadline_days) {
    updates.deadline = new Date(Date.now() + (extend_deadline_days as number) * 86400000).toISOString();
    updates.deadline_extended_at = now;
    updates.deadline_extension_reason = notes ?? "Extendido vía MCP";
  }

  const { data, error } = await supabase
    .from("marketplace_projects")
    .update(updates)
    .eq("id", project_id)
    .eq("organization_id", auth.org_id)
    .select("id, title, status, deadline, updated_at")
    .single();

  if (error) return { success: false, error: `update_project_status: ${error.message}` };
  if (!data)  return { success: false, error: "Proyecto no encontrado o sin acceso" };
  return { success: true, data };
}
