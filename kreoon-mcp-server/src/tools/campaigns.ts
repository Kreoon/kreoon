import { createClient } from "@supabase/supabase-js";
import type { AuthContext, ToolResult } from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Tool definitions ────────────────────────────────────────────────────────

export const campaignsToolDefinitions = [
  {
    name: "create_marketplace_campaign",
    description:
      "Crea una campaña en el marketplace de Kreoon para que creadores puedan aplicar. " +
      "Soporta campañas de pago, canje de producto o mixtas.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Nombre de la campaña" },
        description: { type: "string", description: "Descripción detallada de la campaña" },
        category: {
          type: "string",
          description: "Categoría: fashion, beauty, tech, food, fitness, lifestyle, entertainment, education, travel, other",
        },
        campaign_type: {
          type: "string",
          enum: ["paid", "exchange", "hybrid"],
          description: "Modelo económico de la campaña: paid (pago monetario), exchange (canje de producto), hybrid (mixto)",
        },
        campaign_purpose: {
          type: "string",
          enum: ["content", "activation", "talent"],
          description: "Propósito de la campaña: content (UGC/contenido), activation (activaciones de marca), talent (búsqueda de talento)",
        },
        compensation_type: {
          type: "string",
          enum: ["paid", "product_exchange", "hybrid", "credits"],
          description: "Tipo de compensación para creadores: paid (USD), product_exchange (canje), hybrid (mixto), credits (créditos plataforma)",
        },
        budget_per_video: { type: "number", description: "Pago por video en USD (para campañas paid/mixed)" },
        total_budget: { type: "number", description: "Presupuesto total en USD" },
        max_creators: { type: "number", description: "Máximo de creadores a aceptar", minimum: 1 },
        deadline: { type: "string", format: "date-time", description: "Fecha límite para entrega de contenido" },
        application_deadline: { type: "string", format: "date-time", description: "Fecha límite para aplicaciones" },
        visibility: {
          type: "string",
          enum: ["public", "internal", "selective"],
          description: "Visibilidad: public (marketplace abierto), internal (solo organización), selective (solo creadores invitados). Default: public",
        },
        content_guidelines: { type: "string", description: "Guía de contenido y requisitos específicos" },
        desired_roles: {
          type: "array",
          items: { type: "string", enum: ["ugc", "nano_influencer", "video_editor", "trafficker", "community_manager", "photographer", "copywriter"] },
          description: "Roles de creador deseados",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags para búsqueda (máx 10)",
          maxItems: 10,
        },
      },
      required: ["title", "description", "category", "campaign_type", "campaign_purpose", "compensation_type"],
    },
  },
  {
    name: "list_marketplace_campaigns",
    description:
      "Lista campañas del marketplace. Puede filtrar por estado, tipo y fecha. " +
      "Útil para revisar el pipeline de campañas activas.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["draft", "active", "paused", "completed", "cancelled"],
          description: "Filtrar por estado de campaña",
        },
        campaign_type: { type: "string", description: "Filtrar por tipo de contenido" },
        mine_only: { type: "boolean", description: "Solo campañas creadas por esta organización (default: true)" },
        limit: { type: "number", description: "Cantidad de resultados (default: 20, max: 50)", minimum: 1, maximum: 50 },
      },
      required: [],
    },
  },
  {
    name: "manage_campaign_application",
    description:
      "Aprueba o rechaza una aplicación de creador a una campaña. " +
      "Al aprobar, opcionalmente crea un proyecto marketplace automáticamente.",
    inputSchema: {
      type: "object",
      properties: {
        application_id: { type: "string", description: "UUID de la aplicación" },
        action: {
          type: "string",
          enum: ["approve", "reject"],
          description: "Acción a tomar sobre la aplicación",
        },
        rejection_reason: { type: "string", description: "Motivo del rechazo (requerido si action=reject)" },
        auto_create_project: {
          type: "boolean",
          description: "Crear automáticamente un proyecto marketplace al aprobar (default: true)",
        },
        delivery_days: { type: "number", description: "Días para entrega si se crea proyecto automáticamente", minimum: 1 },
      },
      required: ["application_id", "action"],
    },
  },
];

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function handleCampaignsTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult> {
  switch (toolName) {
    case "create_marketplace_campaign":  return createMarketplaceCampaign(args, auth);
    case "list_marketplace_campaigns":   return listMarketplaceCampaigns(args, auth);
    case "manage_campaign_application":  return manageCampaignApplication(args, auth);
    default: return { success: false, error: `Tool desconocida: ${toolName}` };
  }
}

// ─── Implementations ─────────────────────────────────────────────────────────

async function createMarketplaceCampaign(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const now = new Date().toISOString();

  const insert: Record<string, unknown> = {
    title:                args.title,
    description:          args.description,
    category:             args.category,
    campaign_type:        args.campaign_type,
    campaign_purpose:     args.campaign_purpose,
    compensation_type:    args.compensation_type,
    budget_per_video:     args.budget_per_video ?? null,
    total_budget:         args.total_budget ?? null,
    currency:             "USD",
    max_creators:         args.max_creators ?? null,
    deadline:             args.deadline ?? null,
    application_deadline: args.application_deadline ?? null,
    visibility:           args.visibility ?? "public",
    content_guidelines:   args.content_guidelines ?? null,
    desired_roles:        args.desired_roles ?? null,
    tags:                 args.tags ?? null,
    organization_id:      auth.org_id,
    created_by:           auth.user_id,
    status:               "draft",
    is_quick_campaign:    false,
    created_at:           now,
    updated_at:           now,
  };

  const { data, error } = await supabase
    .from("marketplace_campaigns")
    .insert(insert)
    .select("id, title, status, campaign_type, compensation_type, visibility, created_at")
    .single();

  if (error) return { success: false, error: `create_marketplace_campaign: ${error.message}` };
  return {
    success: true,
    data: {
      ...data,
      next_steps: "La campaña está en borrador. Usa update_project_status o actualiza el estado a 'active' para publicarla.",
    },
  };
}

async function listMarketplaceCampaigns(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const mineOnly = args.mine_only !== false;

  let query = supabase
    .from("marketplace_campaigns")
    .select("id, title, status, campaign_type, compensation_type, budget_per_video, total_budget, max_creators, applications_count, approved_count, deadline, visibility, created_at")
    .order("created_at", { ascending: false })
    .limit((args.limit as number) ?? 20);

  if (mineOnly) query = query.eq("organization_id", auth.org_id);
  if (args.status)        query = query.eq("status", args.status);
  if (args.campaign_type) query = query.eq("campaign_type", args.campaign_type);

  const { data, error } = await query;
  if (error) return { success: false, error: `list_marketplace_campaigns: ${error.message}` };
  return { success: true, data: { campaigns: data ?? [], count: data?.length ?? 0 } };
}

async function manageCampaignApplication(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const { application_id, action, rejection_reason, auto_create_project = true, delivery_days } = args;
  const now = new Date().toISOString();

  const { data: app, error: appErr } = await supabase
    .from("campaign_applications")
    .select("id, creator_id, campaign_id, proposed_price, currency")
    .eq("id", application_id)
    .single();

  if (appErr || !app) return { success: false, error: "Aplicación no encontrada" };

  const newStatus = action === "approve" ? "approved" : "rejected";
  const updates: Record<string, unknown> = { status: newStatus, updated_at: now };
  if (action === "reject" && rejection_reason) updates.rejection_reason = rejection_reason;

  const { error: updateErr } = await supabase
    .from("campaign_applications")
    .update(updates)
    .eq("id", application_id);

  if (updateErr) return { success: false, error: `manage_campaign_application: ${updateErr.message}` };

  let projectCreated = null;
  if (action === "approve" && auto_create_project) {
    const deadline = delivery_days
      ? new Date(Date.now() + (delivery_days as number) * 86400000).toISOString()
      : null;

    const { data: project, error: projErr } = await supabase
      .from("marketplace_projects")
      .insert({
        creator_id:       app.creator_id,
        campaign_id:      app.campaign_id,
        application_id:   application_id,
        organization_id:  auth.org_id,
        title:            `Proyecto campaña`,
        project_type:     "standard",
        total_price:      app.proposed_price ?? null,
        creator_payout:   app.proposed_price ?? null,
        currency:         app.currency ?? "USD",
        deadline,
        delivery_days:    delivery_days ?? null,
        created_at:       now,
        updated_at:       now,
      })
      .select("id, title, status, creator_id, deadline")
      .single();

    if (!projErr) projectCreated = project;
  }

  return {
    success: true,
    data: { application_id, action, status: newStatus, project_created: projectCreated },
  };
}
