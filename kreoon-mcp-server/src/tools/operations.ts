import { createClient } from "@supabase/supabase-js";
import type { AuthContext, ToolResult } from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Tool definitions ────────────────────────────────────────────────────────

export const operationsToolDefinitions = [
  {
    name: "create_content_item",
    description:
      "Crea un nuevo ítem de contenido en el tablero de la organización. " +
      "Puede incluir asignación de creador, editor y fecha límite desde el inicio.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título del contenido" },
        description: { type: "string", description: "Descripción o brief del contenido" },
        target_platform: {
          type: "string",
          enum: ["instagram_reels", "tiktok", "youtube_shorts", "instagram_post", "other"],
          description: "Plataforma de destino",
        },
        content_type: {
          type: "string",
          enum: ["ugc", "review", "tutorial", "unboxing", "lifestyle", "other"],
          description: "Tipo de contenido",
        },
        product_id: { type: "string", description: "UUID del producto relacionado (opcional)" },
        creator_id: { type: "string", description: "UUID del creador asignado (opcional)" },
        editor_id: { type: "string", description: "UUID del editor asignado (opcional)" },
        deadline: { type: "string", format: "date-time", description: "Fecha límite ISO 8601 (opcional)" },
        creator_payment: { type: "number", description: "Pago al creador en la moneda de la org (opcional)" },
        editor_payment: { type: "number", description: "Pago al editor (opcional)" },
        notes: { type: "string", description: "Notas internas (opcional)" },
        funnel_stage: {
          type: "string",
          enum: ["tofu", "mofu", "bofu"],
          description: "Etapa del funnel (opcional)",
        },
      },
      required: ["title", "target_platform"],
    },
  },
  {
    name: "list_content_items",
    description:
      "Lista los ítems de contenido del tablero de la organización con filtros. " +
      "Ideal para obtener el pipeline actual antes de asignar nuevas tareas.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "Filtrar por estado: draft, script_pending, script_approved, assigned, recording, editing, review, approved, published, paid",
        },
        creator_id: { type: "string", description: "Filtrar por creador asignado" },
        editor_id: { type: "string", description: "Filtrar por editor asignado" },
        product_id: { type: "string", description: "Filtrar por producto" },
        target_platform: { type: "string", description: "Filtrar por plataforma" },
        limit: { type: "number", description: "Cantidad de resultados (default: 20, max: 100)", minimum: 1, maximum: 100 },
      },
      required: [],
    },
  },
  {
    name: "assign_content_team",
    description:
      "Asigna o reasigna el equipo de un ítem de contenido: creador, editor y/o estratega. " +
      "Actualiza automáticamente los timestamps de asignación.",
    inputSchema: {
      type: "object",
      properties: {
        content_id: { type: "string", description: "UUID del ítem de contenido" },
        creator_id: { type: "string", description: "UUID del nuevo creador (null para desasignar)" },
        editor_id: { type: "string", description: "UUID del nuevo editor (null para desasignar)" },
        strategist_id: { type: "string", description: "UUID del estratega (null para desasignar)" },
        creator_payment: { type: "number", description: "Actualizar pago al creador (opcional)" },
        editor_payment: { type: "number", description: "Actualizar pago al editor (opcional)" },
      },
      required: ["content_id"],
    },
  },
  {
    name: "update_content_status",
    description:
      "Actualiza el estado de un ítem de contenido en el tablero. " +
      "Estados disponibles: draft → script_pending → script_approved → assigned → recording → editing → review → approved → published → paid.",
    inputSchema: {
      type: "object",
      properties: {
        content_id: { type: "string", description: "UUID del ítem de contenido" },
        status: {
          type: "string",
          enum: ["draft", "script_pending", "script_approved", "assigned", "recording", "editing", "review", "approved", "published", "paid"],
          description: "Nuevo estado",
        },
        notes: { type: "string", description: "Notas del cambio de estado (opcional)" },
      },
      required: ["content_id", "status"],
    },
  },
];

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function handleOperationsTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult> {
  switch (toolName) {
    case "create_content_item":   return createContentItem(args, auth);
    case "list_content_items":    return listContentItems(args, auth);
    case "assign_content_team":   return assignContentTeam(args, auth);
    case "update_content_status": return updateContentStatus(args, auth);
    default: return { success: false, error: `Tool desconocida: ${toolName}` };
  }
}

// ─── Implementations ─────────────────────────────────────────────────────────

async function createContentItem(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const now = new Date().toISOString();
  const insert: Record<string, unknown> = {
    title:           args.title,
    description:     args.description ?? null,
    target_platform: args.target_platform,
    content_type:    args.content_type ?? null,
    product_id:      args.product_id ?? null,
    creator_id:      args.creator_id ?? null,
    editor_id:       args.editor_id ?? null,
    deadline:        args.deadline ?? null,
    creator_payment: args.creator_payment ?? null,
    editor_payment:  args.editor_payment ?? null,
    notes:           args.notes ?? null,
    funnel_stage:    args.funnel_stage ?? null,
    organization_id: auth.org_id,
    status:          "draft",
    created_at:      now,
    updated_at:      now,
  };

  if (args.creator_id) insert.creator_assigned_at = now;
  if (args.editor_id)  insert.editor_assigned_at  = now;

  const { data, error } = await supabase
    .from("content")
    .insert(insert)
    .select("id, title, status, target_platform, creator_id, editor_id, deadline, created_at")
    .single();

  if (error) return { success: false, error: `create_content_item: ${error.message}` };
  return { success: true, data };
}

async function listContentItems(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  let query = supabase
    .from("content")
    .select("id, title, status, target_platform, content_type, creator_id, editor_id, deadline, created_at, updated_at, product_id, funnel_stage, notes")
    .eq("organization_id", auth.org_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit((args.limit as number) ?? 20);

  if (args.status)          query = query.eq("status", args.status);
  if (args.creator_id)      query = query.eq("creator_id", args.creator_id);
  if (args.editor_id)       query = query.eq("editor_id", args.editor_id);
  if (args.product_id)      query = query.eq("product_id", args.product_id);
  if (args.target_platform) query = query.eq("target_platform", args.target_platform);

  const { data, error } = await query;
  if (error) return { success: false, error: `list_content_items: ${error.message}` };
  return { success: true, data: { items: data ?? [], count: data?.length ?? 0 } };
}

async function assignContentTeam(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const { content_id, creator_id, editor_id, strategist_id, creator_payment, editor_payment } = args;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };
  if (creator_id !== undefined)    { updates.creator_id = creator_id; updates.creator_assigned_at = creator_id ? now : null; }
  if (editor_id !== undefined)     { updates.editor_id = editor_id;   updates.editor_assigned_at  = editor_id  ? now : null; }
  if (strategist_id !== undefined)   updates.strategist_id = strategist_id;
  if (creator_payment !== undefined) updates.creator_payment = creator_payment;
  if (editor_payment !== undefined)  updates.editor_payment  = editor_payment;

  const { data, error } = await supabase
    .from("content")
    .update(updates)
    .eq("id", content_id)
    .eq("organization_id", auth.org_id)
    .select("id, title, creator_id, editor_id, strategist_id, creator_payment, editor_payment, updated_at")
    .single();

  if (error) return { success: false, error: `assign_content_team: ${error.message}` };
  if (!data)  return { success: false, error: "Contenido no encontrado o sin acceso" };
  return { success: true, data };
}

async function updateContentStatus(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const { content_id, status, notes } = args;
  const now = new Date().toISOString();

  const statusTimestamps: Record<string, string> = {
    draft:            "draft_at",
    script_pending:   "script_pending_at",
    assigned:         "assigned_at",
    recording:        "recording_at",
    editing:          "editing_at",
    review:           "review_at",
    approved:         "approved_at_v2",
    published:        "published_at",
    paid:             "paid_at_v2",
  };

  const updates: Record<string, unknown> = { status, updated_at: now };
  if (notes) updates.notes = notes;
  const tsField = statusTimestamps[status as string];
  if (tsField) updates[tsField] = now;

  const { data, error } = await supabase
    .from("content")
    .update(updates)
    .eq("id", content_id)
    .eq("organization_id", auth.org_id)
    .select("id, title, status, updated_at")
    .single();

  if (error) return { success: false, error: `update_content_status: ${error.message}` };
  if (!data)  return { success: false, error: "Contenido no encontrado o sin acceso" };
  return { success: true, data };
}
