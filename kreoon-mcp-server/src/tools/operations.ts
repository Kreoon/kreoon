import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { AuthContext, ToolResult } from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Tool definitions ────────────────────────────────────────────────────────

export const operationsToolDefinitions = [
  {
    name: "get_content_item",
    description:
      "📄 VER UN GUION/ITEM completo. " +
      "Cuándo usarla: el usuario dice 'muéstrame el guion v3', 'enséñame este ítem', 'qué tiene este contenido'. " +
      "Devuelve todos los bloques (script, director_output, broll_output, captions, marketing_output) + brief + equipo + pagos + fechas. " +
      "Úsalo SIEMPRE antes de update_content_item para editar quirúrgicamente: necesitás el HTML actual para reemplazar solo lo que cambia.",
    inputSchema: {
      type: "object",
      properties: {
        content_id: { type: "string", description: "UUID del ítem de contenido" },
      },
      required: ["content_id"],
    },
  },
  {
    name: "list_content_assets",
    description:
      "📦 LISTAR MATERIAL CRUDO de un ítem (pestaña Material de Kreoon). " +
      "Cuándo usarla: el usuario pide 'qué material subió el creador', 'qué tomas hay', 'archivos del guion X'. " +
      "Devuelve por archivo: nombre, tipo, tamaño, escena (scene_number), quién lo subió y la ruta de storage. " +
      "Es solo metadata: NO descarga el archivo (el storage de Bunny es privado).",
    inputSchema: {
      type: "object",
      properties: {
        content_id: { type: "string", description: "UUID del ítem de contenido" },
      },
      required: ["content_id"],
    },
  },
  {
    name: "get_content_asset_download",
    description:
      "⬇️ ENLACE DE DESCARGA de un archivo de Material Crudo (usa el asset id de list_content_assets). " +
      "Devuelve una URL firmada que vence en 10 minutos. Para descargarla hay que enviar el header " +
      "'Authorization: Bearer <anon key pública de Supabase>' (la función verifica además la firma del token).",
    inputSchema: {
      type: "object",
      properties: {
        asset_id: { type: "string", description: "UUID del archivo (campo id de list_content_assets)" },
      },
      required: ["asset_id"],
    },
  },
  {
    name: "get_content_video_upload",
    description:
      "⬆️ SUBIR VIDEOS FINALES de un ítem a Bunny Stream (pestaña Video de Kreoon). " +
      "Devuelve una URL firmada (30 min) de la función mcp-video-upload, atada a ESE contenido. Con ella: " +
      "POST {action:'create', title} -> credenciales TUS para subir el archivo directo a Bunny; " +
      "POST {action:'set-final-videos', urls:[embed_url,...]} -> guarda la lista de finales en content.video_urls. " +
      "Enviar header 'Authorization: Bearer <anon key pública de Supabase>'.",
    inputSchema: {
      type: "object",
      properties: {
        content_id: { type: "string", description: "UUID del ítem de contenido" },
      },
      required: ["content_id"],
    },
  },
  {
    name: "approve_content_script",
    description:
      "Aprueba o solicita cambios en el guión de un ítem de contenido. " +
      "Al aprobar, el estado pasa a 'script_approved' automáticamente.",
    inputSchema: {
      type: "object",
      properties: {
        content_id: { type: "string", description: "UUID del ítem de contenido" },
        action: {
          type: "string",
          enum: ["approve", "request_changes"],
          description: "Aprobar el guión o solicitar correcciones",
        },
        feedback: {
          type: "string",
          description: "Feedback o instrucciones de corrección (requerido si action=request_changes)",
        },
      },
      required: ["content_id", "action"],
    },
  },
  {
    name: "record_content_delivery",
    description:
      "Registra la entrega de un contenido terminado: guarda la URL del video y marca como entregado. " +
      "Mueve el estado a 'review' automáticamente.",
    inputSchema: {
      type: "object",
      properties: {
        content_id: { type: "string", description: "UUID del ítem de contenido" },
        video_url: { type: "string", description: "URL del video entregado (Bunny CDN, Drive, etc.)" },
        notes: { type: "string", description: "Notas de la entrega (opcional)" },
      },
      required: ["content_id", "video_url"],
    },
  },
  {
    name: "mark_content_payment",
    description:
      "Marca el pago al creador y/o editor de un ítem de contenido como realizado. " +
      "Úsalo después de transferir el pago para mantener el registro actualizado.",
    inputSchema: {
      type: "object",
      properties: {
        content_id: { type: "string", description: "UUID del ítem de contenido" },
        pay_creator: { type: "boolean", description: "Marcar pago al creador como realizado" },
        pay_editor: { type: "boolean", description: "Marcar pago al editor como realizado" },
      },
      required: ["content_id"],
    },
  },
  {
    name: "create_content_item",
    description:
      "➕ CREAR UN NUEVO ITEM DE CONTENIDO en el tablero. " +
      "Cuándo usarla: el usuario dice 'crea un guion para…', 'arma un nuevo ítem de…', 'necesito un anuncio para…'. " +
      "Después de crearlo, llamá generate_content_block con el content_id devuelto para producir los bloques. " +
      "⚠️ NO INVENTAR: si el usuario no especifica plataforma, funnel_stage o tipo de contenido, PREGUNTÁ antes de crear.",
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
        client_id: { type: "string", description: "UUID del cliente/marca asociada (opcional). Usar list_clients para obtener el UUID." },
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
    name: "update_content_item",
    description:
      "✏️ EDITAR UN ITEM EXISTENTE (edición quirúrgica). " +
      "Cuándo usarla: el usuario dice 'cambia esta frase', 'ajusta solo X', 'quita la mención a Y', 'corrige el componente Z'. " +
      "Permite reemplazar campos individuales: script, director_output, broll_output, captions, marketing_output, además del brief y la metadata. " +
      "⚠️ REGLA QUIRÚRGICA: leé el contenido actual con get_content_item, aplicá SOLO los cambios pedidos, conservá lo demás idéntico. " +
      "NO REGENERAR cuando el usuario solo pide ajustar. Si el usuario quiere algo nuevo desde cero, usá generate_content_block.",
    inputSchema: {
      type: "object",
      properties: {
        content_id: { type: "string", description: "UUID del ítem de contenido a actualizar" },
        client_id:       { type: "string", description: "UUID del cliente/marca a asignar (list_clients para obtenerlo)" },
        product_id:      { type: "string", description: "UUID del producto relacionado" },
        title:           { type: "string", description: "Nuevo título" },
        description:     { type: "string", description: "Nuevo brief o descripción" },
        target_platform: { type: "string", enum: ["instagram_reels", "tiktok", "youtube_shorts", "instagram_post", "other"], description: "Plataforma de destino" },
        content_type:    { type: "string", enum: ["ugc", "review", "tutorial", "unboxing", "lifestyle", "commercial", "other"], description: "Tipo de contenido" },
        funnel_stage:    { type: "string", enum: ["tofu", "mofu", "bofu"], description: "Etapa del funnel" },
        deadline:        { type: "string", format: "date-time", description: "Fecha límite ISO 8601" },
        notes:           { type: "string", description: "Notas internas" },
        script:          { type: "string", description: "Texto completo del guión (hook + cuerpo + CTA)." },
        director_output: { type: "string", description: "Instrucciones de dirección: encuadres, expresiones, movimientos de cámara, vestuario, locación." },
        broll_output:    { type: "string", description: "Lista de tomas B-roll: planos de apoyo, recursos visuales, textos en pantalla." },
        captions:        { type: "string", description: "Variaciones de captions para publicación: orgánicos (engagement) y ads (conversión)." },
      },
      required: ["content_id"],
    },
  },
  {
    name: "list_content_items",
    description:
      "📋 LISTAR ITEMS DEL TABLERO con filtros. " +
      "Cuándo usarla: el usuario dice 'muéstrame los guiones de X', 'qué hay en el pipeline', 'busca los items pendientes'. " +
      "Tip: si el usuario menciona una marca/producto específico, filtrá con product_id (obtenelo de list_products primero). " +
      "Estados típicos: draft → script_pending → script_approved → assigned → recording → editing → review → approved → published → paid.",
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
    case "get_content_item":       return getContentItem(args, auth);
    case "list_content_assets":    return listContentAssets(args, auth);
    case "get_content_asset_download": return getContentAssetDownload(args, auth);
    case "get_content_video_upload": return getContentVideoUpload(args, auth);
    case "approve_content_script": return approveContentScript(args, auth);
    case "record_content_delivery":return recordContentDelivery(args, auth);
    case "mark_content_payment":   return markContentPayment(args, auth);
    case "create_content_item":    return createContentItem(args, auth);
    case "update_content_item":    return updateContentItem(args, auth);
    case "list_content_items":     return listContentItems(args, auth);
    case "assign_content_team":    return assignContentTeam(args, auth);
    case "update_content_status":  return updateContentStatus(args, auth);
    default: return { success: false, error: `Tool desconocida: ${toolName}` };
  }
}

// ─── Implementations ─────────────────────────────────────────────────────────

// Valida que client_id/product_id (si vienen en args) pertenezcan a esta organización.
// Sin esto, cualquier key con campaigns:write podía colgar contenido de un
// client_id/product_id ajeno a la org.
async function validateContentFKs(args: Record<string, unknown>, auth: AuthContext): Promise<string | null> {
  if (args.client_id) {
    const { data: client } = await supabase
      .from("clients").select("id").eq("id", args.client_id as string)
      .eq("organization_id", auth.org_id).is("deleted_at", null).maybeSingle();
    if (!client) return "client_id no encontrado o sin acceso a esta organización";
  }
  if (args.product_id) {
    const { data: product } = await supabase
      .from("products").select("id, clients!inner(organization_id)")
      .eq("id", args.product_id as string)
      .eq("clients.organization_id", auth.org_id).maybeSingle();
    if (!product) return "product_id no encontrado o sin acceso a esta organización";
  }
  return null;
}

// Valida que un user_id sea miembro activo de esta organización (para creator_id/editor_id/strategist_id).
async function validateOrgMember(userId: string, auth: AuthContext, label: string): Promise<string | null> {
  const { data: member } = await supabase
    .from("organization_members").select("id")
    .eq("user_id", userId).eq("organization_id", auth.org_id)
    .is("deleted_at", null).maybeSingle();
  return member ? null : `${label} no es miembro de esta organización`;
}

async function createContentItem(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const fkError = await validateContentFKs(args, auth);
  if (fkError) return { success: false, error: fkError };

  for (const field of ["creator_id", "editor_id"] as const) {
    if (!args[field]) continue;
    const err = await validateOrgMember(args[field] as string, auth, field);
    if (err) return { success: false, error: err };
  }

  const now = new Date().toISOString();
  const insert: Record<string, unknown> = {
    title:           args.title,
    description:     args.description ?? null,
    target_platform: args.target_platform,
    content_type:    args.content_type ?? null,
    client_id:       args.client_id ?? null,
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
    .select("id, title, status, target_platform, content_type, funnel_stage, client_id, creator_id, editor_id, deadline, created_at")
    .single();

  if (error) return { success: false, error: `create_content_item: ${error.message}` };
  return { success: true, data };
}

async function updateContentItem(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const { content_id, ...fields } = args;
  const allowed = ["client_id", "product_id", "title", "description", "target_platform", "content_type", "funnel_stage", "deadline", "notes", "script", "director_output", "broll_output", "captions"];

  const fkError = await validateContentFKs(fields, auth);
  if (fkError) return { success: false, error: fkError };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key];
  }

  if (Object.keys(updates).length === 1) {
    return { success: false, error: "No se proporcionaron campos a actualizar" };
  }

  const { data, error } = await supabase
    .from("content")
    .update(updates)
    .eq("id", content_id)
    .eq("organization_id", auth.org_id)
    .select("id, title, status, client_id, product_id, target_platform, content_type, funnel_stage, script, notes, director_output, broll_output, captions, updated_at")
    .single();

  if (error) return { success: false, error: `update_content_item: ${error.message}` };
  if (!data)  return { success: false, error: "Contenido no encontrado o sin acceso" };
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

  for (const [field, value] of Object.entries({ creator_id, editor_id, strategist_id })) {
    if (!value) continue;
    const err = await validateOrgMember(value as string, auth, field);
    if (err) return { success: false, error: err };
  }

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

async function getContentItem(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("content")
    .select("id, title, description, status, target_platform, content_type, product_id, client_id, creator_id, editor_id, strategist_id, script, deadline, creator_payment, editor_payment, creator_paid, editor_paid, video_url, video_urls, raw_video_urls, bunny_embed_url, drive_url, thumbnail_url, reference_url, video_duration, video_processing_status, director_output, broll_output, captions, caption, marketing_output, editor_guidelines, creator_type, target_country, change_requests, notes, funnel_stage, hook, cta, created_at, updated_at, recorded_at, delivered_at, approved_at_v2, published_at")
    .eq("id", args.content_id)
    .eq("organization_id", auth.org_id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return { success: false, error: "Contenido no encontrado o sin acceso" };
  return { success: true, data };
}

async function listContentAssets(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  // Verifica primero que el ítem pertenezca a la organización del caller.
  const { data: item, error: itemError } = await supabase
    .from("content")
    .select("id, title")
    .eq("id", args.content_id)
    .eq("organization_id", auth.org_id)
    .is("deleted_at", null)
    .single();

  if (itemError || !item) return { success: false, error: "Contenido no encontrado o sin acceso" };

  const { data, error } = await supabase
    .from("project_raw_assets")
    .select("id, original_filename, custom_filename, file_type, file_size, scene_number, storage_path, uploaded_by, created_at")
    .eq("project_id", item.id)
    .eq("organization_id", auth.org_id)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: `list_content_assets: ${error.message}` };
  return { success: true, data: { content_id: item.id, title: item.title, count: data?.length ?? 0, assets: data ?? [] } };
}

const ASSET_TOKEN_TTL_SECONDS = 600;

async function getContentAssetDownload(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const secret = process.env.MCP_ASSET_SIGNING_SECRET;
  if (!secret) return { success: false, error: "MCP_ASSET_SIGNING_SECRET no está configurado en el servidor" };

  // El asset debe pertenecer a la organización del caller y a un contenido no borrado.
  const { data: asset, error } = await supabase
    .from("project_raw_assets")
    .select("id, project_id, custom_filename, original_filename, file_type, file_size")
    .eq("id", args.asset_id)
    .eq("organization_id", auth.org_id)
    .single();
  if (error || !asset) return { success: false, error: "Archivo no encontrado o sin acceso" };

  const { data: item } = await supabase
    .from("content")
    .select("id")
    .eq("id", asset.project_id)
    .eq("organization_id", auth.org_id)
    .is("deleted_at", null)
    .single();
  if (!item) return { success: false, error: "Archivo no encontrado o sin acceso" };

  const expiresAt = Math.floor(Date.now() / 1000) + ASSET_TOKEN_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ a: asset.id, o: auth.org_id, e: expiresAt })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");

  return {
    success: true,
    data: {
      filename: asset.custom_filename || asset.original_filename,
      file_type: asset.file_type,
      file_size: asset.file_size,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      download_url: `${process.env.SUPABASE_URL}/functions/v1/mcp-asset-download?t=${payload}.${signature}`,
    },
  };
}

async function getContentVideoUpload(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const secret = process.env.MCP_ASSET_SIGNING_SECRET;
  if (!secret) return { success: false, error: "MCP_ASSET_SIGNING_SECRET no está configurado en el servidor" };

  const { data: item } = await supabase
    .from("content")
    .select("id, title")
    .eq("id", args.content_id)
    .eq("organization_id", auth.org_id)
    .is("deleted_at", null)
    .single();
  if (!item) return { success: false, error: "Contenido no encontrado o sin acceso" };

  const expiresAt = Math.floor(Date.now() / 1000) + 1800;
  const payload = Buffer.from(JSON.stringify({ k: "vu", c: item.id, o: auth.org_id, e: expiresAt })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return {
    success: true,
    data: {
      content_id: item.id,
      title: item.title,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      upload_api_url: `${process.env.SUPABASE_URL}/functions/v1/mcp-video-upload?t=${payload}.${signature}`,
    },
  };
}

async function approveContentScript(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const { content_id, action, feedback } = args;
  const now = new Date().toISOString();

  if (action === "request_changes" && !feedback) {
    return { success: false, error: "feedback es requerido cuando action=request_changes" };
  }

  const updates: Record<string, unknown> = { updated_at: now };

  if (action === "approve") {
    updates.status = "script_approved";
    updates.script_approved_at_v2 = now;
    updates.script_approved_by = auth.user_id;
    updates.change_request_status = null;
  } else {
    updates.status = "script_pending";
    updates.change_request_status = "requested";
    updates.change_requests = { feedback, requested_at: now, requested_by: auth.user_id };
  }

  const { data, error } = await supabase
    .from("content")
    .update(updates)
    .eq("id", content_id)
    .eq("organization_id", auth.org_id)
    .select("id, title, status, script_approved_at_v2, change_request_status")
    .single();

  if (error) return { success: false, error: `approve_content_script: ${error.message}` };
  if (!data)  return { success: false, error: "Contenido no encontrado o sin acceso" };
  return { success: true, data };
}

async function recordContentDelivery(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const { content_id, video_url, notes } = args;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    video_url,
    delivered_at: now,
    status: "review",
    review_at: now,
    updated_at: now,
  };
  if (notes) updates.notes = notes;

  const { data, error } = await supabase
    .from("content")
    .update(updates)
    .eq("id", content_id)
    .eq("organization_id", auth.org_id)
    .select("id, title, status, video_url, delivered_at")
    .single();

  if (error) return { success: false, error: `record_content_delivery: ${error.message}` };
  if (!data)  return { success: false, error: "Contenido no encontrado o sin acceso" };
  return { success: true, data };
}

async function markContentPayment(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const { content_id, pay_creator, pay_editor } = args;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };
  if (pay_creator) updates.creator_paid = true;
  if (pay_editor)  updates.editor_paid  = true;

  const { data, error } = await supabase
    .from("content")
    .update(updates)
    .eq("id", content_id)
    .eq("organization_id", auth.org_id)
    .select("id, title, creator_paid, editor_paid, updated_at")
    .single();

  if (error) return { success: false, error: `mark_content_payment: ${error.message}` };
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
