import { createClient } from "@supabase/supabase-js";
import {
  AuthContext,
  ToolResult,
  StartADNResearchInput,
  ADNStatusOutput,
} from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const adnToolDefinitions = [
  {
    name: "start_adn_research",
    description:
      "Inicia un análisis ADN de 22 pasos para un producto. " +
      "Proceso asíncrono (~3-8 min) que extrae: USP, mercado objetivo, ángulos de venta, " +
      "competencia, hooks de contenido e inteligencia de anuncios. " +
      "Costo: 2400 tokens IA.",
    inputSchema: {
      type: "object",
      properties: {
        product_id: {
          type: "string",
          description: "UUID del producto a analizar",
        },
        config: {
          type: "object",
          description: "Configuración opcional del análisis",
          properties: {
            include_client_dna: {
              type: "boolean",
              description: "Incluir análisis del cliente (default: true)",
            },
            include_social_intelligence: {
              type: "boolean",
              description: "Incluir datos de redes sociales (default: true)",
            },
            include_ad_intelligence: {
              type: "boolean",
              description: "Incluir inteligencia de anuncios (default: false)",
            },
            locations: {
              type: "array",
              items: { type: "string" },
              description: "Códigos de países objetivo, ej: ['CO', 'MX', 'AR']",
            },
          },
        },
      },
      required: ["product_id"],
    },
  },
  {
    name: "get_adn_status",
    description:
      "Consulta el estado de una investigación ADN en curso. " +
      "Hacer polling cada 30 segundos hasta que status sea 'completed' o 'failed'. " +
      "Costo: 0 tokens (solo lectura).",
    inputSchema: {
      type: "object",
      properties: {
        research_id: {
          type: "string",
          description: "UUID de la sesión de investigación devuelto por start_adn_research",
        },
      },
      required: ["research_id"],
    },
  },
];

export async function handleADNTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult<ADNStatusOutput | { research_id: string; estimated_seconds: number }>> {
  if (toolName === "start_adn_research") {
    return startADNResearch(args as unknown as StartADNResearchInput, auth);
  }
  if (toolName === "get_adn_status") {
    return getADNStatus(args.research_id as string, auth);
  }
  return { success: false, error: `Tool desconocida: ${toolName}` };
}

async function startADNResearch(
  input: StartADNResearchInput,
  auth: AuthContext
): Promise<ToolResult<{ research_id: string; estimated_seconds: number }>> {
  const { product_id, config = {} } = input;

  // Verificar que el producto existe y su client pertenece a la organización
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, client_id")
    .eq("id", product_id)
    .single();

  if (productError || !product) {
    return { success: false, error: "Producto no encontrado" };
  }

  // Verificar que el cliente pertenece a esta organización
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", product.client_id)
    .eq("organization_id", auth.org_id)
    .single();

  if (clientError || !client) {
    return { success: false, error: "Sin acceso a este producto" };
  }

  // Verificar que no hay una investigación activa para este producto
  const { data: existing } = await supabase
    .from("adn_research_sessions")
    .select("id, status")
    .eq("product_id", product_id)
    .eq("organization_id", auth.org_id)
    .in("status", ["initializing", "gathering_intelligence", "researching"])
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: `Ya existe una investigación activa: ${existing.id}. Usa get_adn_status para consultar su progreso.`,
    };
  }

  // Buscar o crear un registro product_dna para el cliente del producto
  let productDnaId: string | null = null;

  const { data: existingDna } = await supabase
    .from("product_dna")
    .select("id")
    .eq("client_id", product.client_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingDna) {
    productDnaId = existingDna.id;
  } else {
    // Obtener datos completos del producto para poblar el wizard_responses
    const { data: fullProduct } = await supabase
      .from("products")
      .select("name, description, ideal_avatar, sales_angles, strategy")
      .eq("id", product_id)
      .single();

    const { data: newDna, error: dnaError } = await supabase
      .from("product_dna")
      .insert({
        client_id: product.client_id,
        service_group: "general",
        service_types: ["content_creation"],
        wizard_responses: {
          product_name: fullProduct?.name ?? product.name,
          product_description: fullProduct?.description ?? "",
          ideal_avatar: fullProduct?.ideal_avatar ?? "",
          sales_angles: fullProduct?.sales_angles ?? [],
          strategy: fullProduct?.strategy ?? "",
        },
        status: "draft",
      })
      .select("id")
      .single();

    if (dnaError || !newDna) {
      return { success: false, error: `Error creando product_dna: ${dnaError?.message}` };
    }
    productDnaId = newDna.id;
  }

  // Llamar al adn-orchestrator con action="start"
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "adn-orchestrator",
    {
      body: {
        action: "start",
        product_id,
        product_dna_id: productDnaId,
        organization_id: auth.org_id,
        user_id: auth.user_id,
        config: {
          include_client_dna: config.include_client_dna ?? true,
          include_social_intelligence: config.include_social_intelligence ?? true,
          include_ad_intelligence: config.include_ad_intelligence ?? false,
          locations: config.locations ?? ["CO"],
        },
      },
    }
  );

  if (fnError) {
    return { success: false, error: `Error iniciando ADN: ${fnError.message}` };
  }

  const sessionId = fnData?.session_id ?? fnData?.research_id;
  return {
    success: true,
    data: {
      research_id: sessionId,
      estimated_seconds: fnData?.estimated_time_seconds ?? 480,
    },
    tokens_used: 2400,
  };
}

async function getADNStatus(
  researchId: string,
  auth: AuthContext
): Promise<ToolResult<ADNStatusOutput>> {
  // Consulta directa a la tabla (más confiable que invocar el orquestador para status)
  const { data: session, error: dbError } = await supabase
    .from("adn_research_sessions")
    .select("id, status, progress, current_step, total_steps, tokens_consumed, error_message, completed_at, started_at")
    .eq("id", researchId)
    .eq("organization_id", auth.org_id)
    .single();

  if (dbError || !session) {
    return { success: false, error: "Sesión de investigación no encontrada" };
  }

  const progressPct = session.total_steps > 0
    ? Math.round((session.current_step / session.total_steps) * 100)
    : 0;

  return {
    success: true,
    data: {
      research_id: session.id,
      status: session.status,
      progress_percent: progressPct,
      current_step: `Paso ${session.current_step} de ${session.total_steps}`,
      result: undefined,
      error: session.error_message ?? undefined,
      estimated_completion_at: undefined,
    },
    tokens_used: 0,
  };
}
