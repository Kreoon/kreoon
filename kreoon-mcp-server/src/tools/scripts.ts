import { createClient } from "@supabase/supabase-js";
import {
  AuthContext,
  ToolResult,
  GenerateScriptInput,
  GenerateScriptOutput,
  ImproveScriptInput,
} from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const scriptToolDefinitions = [
  {
    name: "generate_script",
    description:
      "Genera guiones UGC optimizados para una plataforma específica usando el ADN del producto. " +
      "Devuelve múltiples variantes con hook, cuerpo y CTA.",
    inputSchema: {
      type: "object",
      properties: {
        product_id: {
          type: "string",
          description: "UUID del producto en Kreoon",
        },
        platform: {
          type: "string",
          enum: ["instagram_reels", "tiktok", "youtube_shorts"],
          description: "Plataforma de destino",
        },
        style: {
          type: "string",
          enum: ["viral", "professional", "funny", "educational"],
          description: "Estilo narrativo del guión (default: viral)",
        },
        hooks_count: {
          type: "number",
          description: "Número de variantes de hook a generar (default: 3, max: 5)",
          minimum: 1,
          maximum: 5,
        },
      },
      required: ["product_id", "platform"],
    },
  },
  {
    name: "improve_script",
    description:
      "Mejora un guión existente basado en feedback específico. " +
      "Útil para iterar sobre guiones después de revisión del cliente.",
    inputSchema: {
      type: "object",
      properties: {
        script_id: {
          type: "string",
          description: "UUID del guión a mejorar",
        },
        feedback: {
          type: "string",
          description: "Feedback o instrucciones de mejora",
        },
        focus: {
          type: "string",
          enum: ["hook", "cta", "body", "all"],
          description: "Sección del guión a enfocar (default: all)",
        },
      },
      required: ["script_id", "feedback"],
    },
  },
];

export async function handleScriptTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult> {
  if (toolName === "generate_script") {
    return generateScript(args as unknown as GenerateScriptInput, auth);
  }
  if (toolName === "improve_script") {
    return improveScript(args as unknown as ImproveScriptInput, auth);
  }
  return { success: false, error: `Tool desconocida: ${toolName}` };
}

async function generateScript(
  input: GenerateScriptInput,
  auth: AuthContext
): Promise<ToolResult<GenerateScriptOutput>> {
  const { product_id, platform, style = "viral", hooks_count = 3 } = input;

  // Obtener datos del producto para el prompt
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, description, target_audience, key_benefits")
    .eq("id", product_id)
    .eq("organization_id", auth.org_id)
    .single();

  if (productError || !product) {
    return { success: false, error: "Producto no encontrado o sin acceso" };
  }

  // Llamar a la Edge Function generate-script existente
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "generate-script",
    {
      body: {
        product_id,
        organization_id: auth.org_id,
        platform,
        style,
        hooks_count,
        user_id: auth.user_id,
      },
    }
  );

  if (fnError) {
    return { success: false, error: `Error generando guión: ${fnError.message}` };
  }

  return {
    success: true,
    data: fnData as GenerateScriptOutput,
    tokens_used: fnData?.tokens_used ?? 150,
  };
}

async function improveScript(
  input: ImproveScriptInput,
  auth: AuthContext
): Promise<ToolResult> {
  const { script_id, feedback, focus = "all" } = input;

  const { data: script, error: scriptError } = await supabase
    .from("scripts")
    .select("id, content, platform, product_id")
    .eq("id", script_id)
    .eq("organization_id", auth.org_id)
    .single();

  if (scriptError || !script) {
    return { success: false, error: "Guión no encontrado o sin acceso" };
  }

  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "content-ai",
    {
      body: {
        action: "improve_script",
        script_id,
        original_content: script.content,
        feedback,
        focus,
        platform: script.platform,
        organization_id: auth.org_id,
      },
    }
  );

  if (fnError) {
    return { success: false, error: `Error mejorando guión: ${fnError.message}` };
  }

  return {
    success: true,
    data: fnData,
    tokens_used: fnData?.tokens_used ?? 120,
  };
}
