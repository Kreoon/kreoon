import { createClient } from "@supabase/supabase-js";
import { AuthContext, ToolResult } from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mapea cada tipo de bloque a la columna correcta en la tabla content
const BLOCK_TO_COLUMN: Record<string, string> = {
  script:    "script",
  director:  "director_output",
  broll:     "broll_output",
  captions:  "captions",
  marketing: "marketing_output",
};

const BLOCK_LABELS: Record<string, string> = {
  script:    "guión UGC teleprompter con hooks, escenas y CTA",
  director:  "tabla de producción (planos, ángulos, iluminación, equipo)",
  broll:     "lista de tomas B-roll y textos en pantalla",
  captions:  "4 variaciones de captions (2 orgánicas + 2 ads)",
  marketing: "estrategia de pauta: segmentación, copies y distribución",
};

export const contentGenerationToolDefinitions = [
  {
    name: "generate_content_block",
    description:
      "Genera un bloque de producción UGC usando las Skills de IA de KREOON: " +
      "guión, director, B-roll, captions o marketing. " +
      "El output es HTML estructurado listo para renderizar en la app — no texto plano. " +
      "Si se provee content_id, guarda automáticamente en el campo correcto del ítem.",
    inputSchema: {
      type: "object",
      properties: {
        block_type: {
          type: "string",
          enum: ["script", "director", "broll", "captions", "marketing"],
          description:
            "Tipo de bloque: 'script' (guión), 'director' (tabla de producción), " +
            "'broll' (tomas de apoyo), 'captions' (textos para publicar), 'marketing' (estrategia de pauta)",
        },
        content_id: {
          type: "string",
          description:
            "UUID del ítem de contenido donde guardar el resultado. " +
            "Si se provee, el bloque se guarda automáticamente y se extrae contexto del ítem.",
        },
        brand_name: {
          type: "string",
          description: "Nombre de la marca o producto (requerido si no hay content_id)",
        },
        brand_description: {
          type: "string",
          description: "Descripción, propuesta de valor y beneficios del producto/servicio",
        },
        target_audience: {
          type: "string",
          description: "Audiencia objetivo: quiénes son, sus dolores y deseos",
        },
        key_benefits: {
          type: "string",
          description: "Ángulos de venta y beneficios clave (se convierten en sales_angles)",
        },
        platform: {
          type: "string",
          enum: ["tiktok", "instagram_reels", "youtube_shorts"],
          description: "Plataforma de destino (default: tiktok)",
        },
        hooks_count: {
          type: "number",
          description: "Cantidad de hooks a generar (solo para block_type=script, default: 3)",
          minimum: 1,
          maximum: 5,
        },
        funnel_stage: {
          type: "string",
          enum: ["tofu", "mofu", "bofu"],
          description: "Etapa del funnel de ventas (default: mofu)",
        },
        additional_instructions: {
          type: "string",
          description: "Instrucciones adicionales o contexto específico para la generación",
        },
      },
      required: ["block_type"],
    },
  },
];

export async function handleContentGenerationTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult> {
  if (toolName === "generate_content_block") {
    return generateContentBlock(args, auth);
  }
  return { success: false, error: `Tool desconocida: ${toolName}` };
}

async function generateContentBlock(
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult> {
  const {
    block_type,
    content_id,
    platform = "tiktok",
    hooks_count = 3,
    funnel_stage = "mofu",
    additional_instructions,
  } = args as Record<string, unknown>;

  let brandName      = args.brand_name as string | undefined;
  let brandDesc      = args.brand_description as string | undefined;
  let targetAudience = args.target_audience as string | undefined;
  let keyBenefits    = args.key_benefits as string | undefined;
  let existingScript = "";

  // Si se provee content_id, enriquecer contexto con datos del ítem
  if (content_id) {
    const { data: content } = await supabase
      .from("content")
      .select("id, title, target_platform, funnel_stage, script, description, client_id")
      .eq("id", content_id as string)
      .eq("organization_id", auth.org_id)
      .single();

    if (content) {
      if (!brandName) brandName = content.title as string;
      if (!brandDesc && content.description) brandDesc = content.description as string;
      if (content.script) existingScript = (content.script as string).substring(0, 2000);
    }
  }

  if (!brandName) {
    return { success: false, error: "Se requiere brand_name o content_id con título para generar el bloque" };
  }

  const platformLabels: Record<string, string> = {
    tiktok:           "TikTok",
    instagram_reels:  "Instagram Reels",
    youtube_shorts:   "YouTube Shorts",
  };

  const prompt = buildPrompt({
    block_type: block_type as string,
    brandName,
    brandDesc,
    targetAudience,
    keyBenefits,
    platform:     platformLabels[platform as string] ?? "TikTok",
    hooks_count:  hooks_count as number,
    funnel_stage: funnel_stage as string,
    additional_instructions: additional_instructions as string | undefined,
    existingScript,
  });

  // Llamar a la Edge Function content-ai de KREOON
  const { data: fnData, error: fnError } = await supabase.functions.invoke("content-ai", {
    body: {
      action:          "generate_script",
      generation_type: block_type,
      organizationId:  auth.org_id,
      product: {
        name:         brandName,
        description:  brandDesc   ?? "",
        ideal_avatar: targetAudience ?? "",
        sales_angles: keyBenefits ? [keyBenefits] : [],
      },
      prompt,
      script_params: {
        hooks_count,
        platform:            platformLabels[platform as string] ?? "TikTok",
        target_country:      "Colombia",
        narrative_structure: "problema-solución",
        sphere_phase:        funnel_stage === "tofu" ? "awareness" : funnel_stage === "bofu" ? "decision" : "solution",
        consciousness_level: funnel_stage === "tofu" ? "unaware" : funnel_stage === "bofu" ? "most_aware" : "problem_aware",
      },
    },
  });

  if (fnError) {
    return { success: false, error: `Error generando ${block_type} con Skills de KREOON: ${fnError.message}` };
  }

  const output: string = fnData?.script ?? fnData?.result ?? "";
  if (!output) {
    return { success: false, error: "La Edge Function no devolvió contenido" };
  }

  // Guardar en el ítem de contenido si se especificó
  if (content_id) {
    const column = BLOCK_TO_COLUMN[block_type as string];
    if (column) {
      const { error: saveError } = await supabase
        .from("content")
        .update({ [column]: output, updated_at: new Date().toISOString() })
        .eq("id", content_id as string)
        .eq("organization_id", auth.org_id);

      return {
        success: true,
        data: {
          content_id,
          block_type,
          column_saved:   saveError ? null : column,
          saved:          !saveError,
          save_error:     saveError?.message ?? null,
          output_length:  output.length,
          output_preview: output.substring(0, 400) + (output.length > 400 ? "…" : ""),
        },
        tokens_used: fnData?.tokens_used ?? 200,
      };
    }
  }

  return {
    success: true,
    data: {
      block_type,
      output_length: output.length,
      output,
    },
    tokens_used: fnData?.tokens_used ?? 200,
  };
}

function buildPrompt(params: {
  block_type: string;
  brandName: string;
  brandDesc?: string;
  targetAudience?: string;
  keyBenefits?: string;
  platform: string;
  hooks_count: number;
  funnel_stage: string;
  additional_instructions?: string;
  existingScript?: string;
}): string {
  const lines = [
    `Genera ${BLOCK_LABELS[params.block_type] ?? params.block_type} para:`,
    "",
    `MARCA/PRODUCTO: ${params.brandName}`,
    params.brandDesc      ? `DESCRIPCIÓN: ${params.brandDesc}`           : "",
    params.targetAudience ? `AUDIENCIA: ${params.targetAudience}`         : "",
    params.keyBenefits    ? `BENEFICIOS / ÁNGULOS: ${params.keyBenefits}` : "",
    `PLATAFORMA: ${params.platform}`,
    `ETAPA DE FUNNEL: ${params.funnel_stage.toUpperCase()}`,
    params.block_type === "script" ? `CANTIDAD DE HOOKS: ${params.hooks_count}` : "",
    params.additional_instructions ? `INSTRUCCIONES ADICIONALES: ${params.additional_instructions}` : "",
    params.existingScript && params.block_type !== "script"
      ? `\nGUIÓN BASE (úsalo como referencia):\n${params.existingScript}`
      : "",
  ];

  return lines.filter(Boolean).join("\n");
}
