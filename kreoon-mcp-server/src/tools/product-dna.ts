import { createClient } from "@supabase/supabase-js";
import { AuthContext, ToolResult } from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const productDnaToolDefinitions = [
  {
    name: "generate_product_dna_v1",
    description:
      "Crea el ADN V1 de un producto/servicio. " +
      "Equivale al wizard del cliente: recoge los datos del producto (sin audio), " +
      "crea el registro product_dna y ejecuta el análisis IA completo: " +
      "market_research, competitor_analysis, strategy_recommendations y content_brief. " +
      "El proceso tarda ~2-3 minutos. Costo: ~600 tokens IA.",
    inputSchema: {
      type: "object",
      properties: {
        client_id: {
          type: "string",
          description: "UUID del cliente al que pertenece el producto",
        },
        product_dna_id: {
          type: "string",
          description: "UUID de un product_dna existente a actualizar (opcional). Si no se provee, se crea uno nuevo.",
        },
        service_group: {
          type: "string",
          enum: ["content_creation", "post_production", "strategy_marketing", "technology", "education", "general"],
          description: "Categoría principal del producto/servicio",
        },
        service_types: {
          type: "array",
          items: { type: "string" },
          description: "Tipos de servicio específicos (máximo 3), ej: ['ugc', 'reels', 'ads']",
        },
        product_description: {
          type: "string",
          description: "Descripción completa del producto/servicio. Reemplaza el audio del wizard — incluir: qué es, para quién, beneficios clave, dolores que resuelve, propuesta de valor.",
        },
        target_audience: {
          type: "string",
          description: "Descripción del cliente ideal: edad, intereses, dolores, deseos",
        },
        competitor_links: {
          type: "array",
          items: { type: "string" },
          description: "URLs de competidores directos para análisis",
        },
        reference_links: {
          type: "array",
          items: { type: "string" },
          description: "URLs de referencia o inspiración del producto",
        },
        locations: {
          type: "array",
          items: { type: "string" },
          description: "Países objetivo, ej: ['CO', 'MX', 'US']",
        },
      },
      required: ["client_id", "product_description"],
    },
  },
  {
    name: "get_product_dna_status",
    description:
      "Consulta el estado y resultado del ADN V1 de un producto. " +
      "Retorna market_research, competitor_analysis, strategy_recommendations y content_brief cuando está listo. " +
      "Costo: 0 tokens.",
    inputSchema: {
      type: "object",
      properties: {
        product_dna_id: {
          type: "string",
          description: "UUID del registro product_dna",
        },
      },
      required: ["product_dna_id"],
    },
  },
];

export async function handleProductDnaTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult> {
  if (toolName === "generate_product_dna_v1") {
    return generateProductDnaV1(args, auth);
  }
  if (toolName === "get_product_dna_status") {
    return getProductDnaStatus(args.product_dna_id as string, auth);
  }
  return { success: false, error: `Tool desconocida: ${toolName}` };
}

async function generateProductDnaV1(
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult> {
  const {
    client_id,
    product_dna_id,
    service_group = "general",
    service_types = ["content_creation"],
    product_description,
    target_audience,
    competitor_links = [],
    reference_links = [],
    locations = ["CO"],
  } = args as {
    client_id: string;
    product_dna_id?: string;
    service_group?: string;
    service_types?: string[];
    product_description: string;
    target_audience?: string;
    competitor_links?: string[];
    reference_links?: string[];
    locations?: string[];
  };

  // Verificar que el cliente pertenece a la organización
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", client_id)
    .eq("organization_id", auth.org_id)
    .single();

  if (clientError || !client) {
    return { success: false, error: "Cliente no encontrado o sin acceso" };
  }

  // Construir wizard_responses equivalentes al formulario del wizard
  const wizardResponses = {
    product_name: client.name,
    product_description,
    ideal_avatar: target_audience ?? "",
    transcription: product_description, // sin audio, usamos la descripción como transcripción
    locations: locations,
    source: "mcp_tool",
  };

  const competitorLinksFormatted = (competitor_links as string[]).map((url) => ({
    url,
    type: "competitor",
    notes: "",
  }));

  const referenceLinksFormatted = (reference_links as string[]).map((url) => ({
    url,
    type: "reference",
    notes: "",
  }));

  let dnaId: string;

  if (product_dna_id) {
    // Actualizar registro existente
    const { error: updateErr } = await supabase
      .from("product_dna")
      .update({
        service_group,
        service_types,
        wizard_responses: wizardResponses,
        competitor_links: competitorLinksFormatted,
        reference_links: referenceLinksFormatted,
        status: "draft",
      })
      .eq("id", product_dna_id)
      .eq("client_id", client_id);

    if (updateErr) {
      return { success: false, error: `Error actualizando product_dna: ${updateErr.message}` };
    }
    dnaId = product_dna_id;
  } else {
    // Crear nuevo registro
    const { data: newDna, error: insertErr } = await supabase
      .from("product_dna")
      .insert({
        client_id,
        service_group,
        service_types,
        wizard_responses: wizardResponses,
        competitor_links: competitorLinksFormatted,
        reference_links: referenceLinksFormatted,
        status: "analyzing",
      })
      .select("id")
      .single();

    if (insertErr || !newDna) {
      return { success: false, error: `Error creando product_dna: ${insertErr?.message}` };
    }
    dnaId = newDna.id;
  }

  // Llamar a generate-product-dna para ejecutar el análisis IA
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "generate-product-dna",
    {
      body: {
        productDnaId: dnaId,
        product_dna_id: dnaId,
      },
    }
  );

  if (fnError) {
    return {
      success: false,
      error: `Error ejecutando análisis ADN V1: ${fnError.message}`,
      data: { product_dna_id: dnaId, status: "error" } as Record<string, unknown>,
    };
  }

  return {
    success: true,
    data: {
      product_dna_id: dnaId,
      client_id,
      client_name: client.name,
      status: fnData?.status ?? "ready",
      confidence_score: fnData?.ai_confidence_score,
      message: "ADN V1 generado. Usa get_product_dna_status para ver el análisis completo.",
    },
    tokens_used: 600,
  };
}

async function getProductDnaStatus(
  productDnaId: string,
  auth: AuthContext
): Promise<ToolResult> {
  // Verificar pertenencia via clients
  const { data: dna, error } = await supabase
    .from("product_dna")
    .select(`
      id, status, ai_confidence_score, estimated_complexity,
      market_research, competitor_analysis, strategy_recommendations, content_brief,
      wizard_responses, service_group, service_types, created_at, updated_at,
      clients!inner(organization_id)
    `)
    .eq("id", productDnaId)
    .eq("clients.organization_id", auth.org_id)
    .single();

  if (error || !dna) {
    return { success: false, error: "product_dna no encontrado o sin acceso" };
  }

  const isReady = dna.status === "ready";

  return {
    success: true,
    data: {
      product_dna_id: dna.id,
      status: dna.status,
      ai_confidence_score: dna.ai_confidence_score,
      service_group: dna.service_group,
      service_types: dna.service_types,
      ...(isReady
        ? {
            market_research: dna.market_research,
            competitor_analysis: dna.competitor_analysis,
            strategy_recommendations: dna.strategy_recommendations,
            content_brief: dna.content_brief,
          }
        : { message: "Análisis aún no completado. Intenta en 30 segundos." }),
    },
    tokens_used: 0,
  };
}
