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

  // Verificar que el producto pertenece a la organización
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", product_id)
    .eq("organization_id", auth.org_id)
    .single();

  if (productError || !product) {
    return { success: false, error: "Producto no encontrado o sin acceso" };
  }

  // Verificar que no hay una investigación activa para este producto
  const { data: existing } = await supabase
    .from("adn_research_sessions")
    .select("id, status")
    .eq("product_id", product_id)
    .eq("organization_id", auth.org_id)
    .in("status", ["pending", "running"])
    .single();

  if (existing) {
    return {
      success: false,
      error: `Ya existe una investigación activa: ${existing.id}. Usa get_adn_status para consultar su progreso.`,
    };
  }

  // Llamar al adn-orchestrator con action="start"
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "adn-orchestrator",
    {
      body: {
        action: "start",
        product_id,
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

  return {
    success: true,
    data: {
      research_id: fnData.research_id,
      estimated_seconds: fnData.estimated_time_seconds ?? 240,
    },
    tokens_used: 2400,
  };
}

async function getADNStatus(
  researchId: string,
  auth: AuthContext
): Promise<ToolResult<ADNStatusOutput>> {
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "adn-orchestrator",
    {
      body: {
        action: "get_status",
        research_id: researchId,
        organization_id: auth.org_id,
      },
    }
  );

  if (fnError) {
    // Fallback: consulta directa a la tabla
    const { data: session, error: dbError } = await supabase
      .from("adn_research_sessions")
      .select("id, status, progress, current_step, result, error_message, estimated_completion_at")
      .eq("id", researchId)
      .eq("organization_id", auth.org_id)
      .single();

    if (dbError || !session) {
      return { success: false, error: "Sesión de investigación no encontrada" };
    }

    return {
      success: true,
      data: {
        research_id: session.id,
        status: session.status,
        progress_percent: session.progress ?? 0,
        current_step: session.current_step ?? "Procesando...",
        result: session.result,
        error: session.error_message,
        estimated_completion_at: session.estimated_completion_at,
      },
      tokens_used: 0,
    };
  }

  return {
    success: true,
    data: fnData as ADNStatusOutput,
    tokens_used: 0,
  };
}
