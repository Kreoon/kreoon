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
      "Genera guiones UGC optimizados para una plataforma. " +
      "Modo 1: con product_id (producto registrado en Kreoon). " +
      "Modo 2: sin product_id — usa brand_name + brand_description para generar directamente. " +
      "Devuelve múltiples variantes con hook, cuerpo y CTA.",
    inputSchema: {
      type: "object",
      properties: {
        product_id: {
          type: "string",
          description: "UUID del producto registrado en Kreoon (opcional si se provee brand_name)",
        },
        brand_name: {
          type: "string",
          description: "Nombre de la marca o producto (requerido si no hay product_id)",
        },
        brand_description: {
          type: "string",
          description: "Descripción del producto/servicio, propuesta de valor, beneficios clave",
        },
        target_audience: {
          type: "string",
          description: "Audiencia objetivo: quiénes son, sus dolores, deseos",
        },
        key_benefits: {
          type: "string",
          description: "Beneficios principales o USPs del producto",
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
      required: ["platform"],
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
  const { product_id, brand_name, brand_description, target_audience, key_benefits, platform, style = "viral", hooks_count = 3 } = input as GenerateScriptInput & {
    brand_name?: string;
    brand_description?: string;
    target_audience?: string;
    key_benefits?: string;
  };

  if (!product_id && !brand_name) {
    return { success: false, error: "Se requiere product_id o brand_name para generar el guión" };
  }

  // Modo 1: producto registrado en Kreoon
  if (product_id) {
    // products.client_id no tiene FK declarada hacia clients, así que PostgREST
    // no puede resolver embeds. Resolvemos el aislamiento multi-tenant en dos pasos
    // y a la vez traemos los campos que la edge function generate-script necesita.
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, client_id, name, description, ideal_avatar, sales_angles, market_research, strategy")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      return { success: false, error: "Producto no encontrado" };
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", product.client_id)
      .eq("organization_id", auth.org_id)
      .maybeSingle();

    if (clientError || !client) {
      return { success: false, error: "Producto sin acceso para esta organización" };
    }

    // La edge function generate-script usa camelCase y nombres específicos.
    // platform/style/hooks_count no son parámetros nativos: los pasamos como contexto.
    const platformLabel: Record<string, string> = {
      tiktok: "TikTok",
      instagram_reels: "Instagram Reels",
      youtube_shorts: "YouTube Shorts",
    };
    const salesAngleStr = Array.isArray(product.sales_angles)
      ? product.sales_angles.join(" | ")
      : (product.sales_angles ?? "");
    const marketResearchStr = typeof product.market_research === "string"
      ? product.market_research
      : product.market_research ? JSON.stringify(product.market_research) : "";

    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "generate-script",
      {
        body: {
          organizationId: auth.org_id,
          product_name: product.name ?? "Producto",
          strategy: product.strategy ?? product.description ?? "",
          market_research: marketResearchStr,
          ideal_avatar: product.ideal_avatar ?? "",
          sales_angle: salesAngleStr || style,
          additional_context:
            `Plataforma: ${platformLabel[platform] ?? platform}. ` +
            `Estilo: ${style}. Generar ${hooks_count} variantes de hook.`,
          sphere_phase: "engage",
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

  // Modo 2: sin product_id — generar directamente con brand context
  const platformLabel: Record<string, string> = {
    tiktok: "TikTok",
    instagram_reels: "Instagram Reels",
    youtube_shorts: "YouTube Shorts",
  };

  const prompt = `Eres un experto en guiones UGC para ${platformLabel[platform] ?? platform}.

MARCA/PRODUCTO: ${brand_name}
${brand_description ? `DESCRIPCIÓN: ${brand_description}` : ""}
${target_audience  ? `AUDIENCIA: ${target_audience}` : ""}
${key_benefits     ? `BENEFICIOS CLAVE: ${key_benefits}` : ""}

TAREA: Genera ${hooks_count} variantes de guión UGC en español con estilo "${style}" para ${platformLabel[platform] ?? platform}.

Cada variante debe incluir:
- HOOK (primeros 3 segundos, texto para pantalla o frase de apertura)
- CUERPO (desarrollo del mensaje, 30-45 segundos)
- CTA (llamada a la acción final)
- DURACIÓN ESTIMADA (segundos)

Formato de respuesta JSON:
{
  "scripts": [
    {
      "variant": 1,
      "hook": "...",
      "body": "...",
      "cta": "...",
      "duration_seconds": 30,
      "style_notes": "..."
    }
  ],
  "platform": "${platform}",
  "brand": "${brand_name}"
}`;

  // multi-ai espera { messages: Message[], mode, models } y devuelve { response, ... }
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "multi-ai",
    {
      body: {
        messages: [
          {
            role: "system",
            content: "Eres un experto en guiones UGC. Responde SOLO con JSON válido siguiendo el formato pedido por el usuario.",
          },
          { role: "user", content: prompt },
        ],
        mode: "first",
      },
    }
  );

  if (fnError) {
    return { success: false, error: `Error generando guión: ${fnError.message}` };
  }

  // Intentar parsear JSON de la respuesta — multi-ai devuelve .response
  let parsed: GenerateScriptOutput;
  try {
    const text = fnData?.response ?? fnData?.content ?? fnData?.result ?? JSON.stringify(fnData);
    parsed = typeof text === "string" ? JSON.parse(text) : text;
  } catch {
    parsed = fnData as GenerateScriptOutput;
  }

  return {
    success: true,
    data: parsed,
    tokens_used: fnData?.tokens_used ?? 150,
  };
}

async function improveScript(
  input: ImproveScriptInput,
  auth: AuthContext
): Promise<ToolResult> {
  const { script_id, feedback, focus = "all" } = input;

  // Los guiones viven en content.script (no existe tabla scripts)
  const { data: script, error: scriptError } = await supabase
    .from("content")
    .select("id, script, platform, product_id")
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
        original_content: script.script,
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
