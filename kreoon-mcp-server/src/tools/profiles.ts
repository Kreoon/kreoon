import { createClient } from "@supabase/supabase-js";
import {
  AuthContext,
  ToolResult,
  OptimizeProfileInput,
  OptimizeProfileOutput,
  ProfileImprovement,
} from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const profileToolDefinitions = [
  {
    name: "optimize_creator_profile",
    description:
      "Analiza un perfil de creador y genera recomendaciones priorizadas para " +
      "mejorar su score en el marketplace. Incluye sugerencias concretas para " +
      "bio, portfolio, pricing y visibilidad. " +
      "Costo: 200 tokens IA.",
    inputSchema: {
      type: "object",
      properties: {
        creator_id: {
          type: "string",
          description:
            "UUID del creador. Debe pertenecer a la organización del API key.",
        },
        focus: {
          type: "string",
          enum: ["visibility", "conversions", "leads"],
          description:
            "Objetivo de optimización: visibility (aparecer más), " +
            "conversions (cerrar más proyectos), leads (atraer más contactos). " +
            "Default: visibility",
        },
      },
      required: ["creator_id"],
    },
  },
];

export async function handleProfileTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult<OptimizeProfileOutput>> {
  if (toolName === "optimize_creator_profile") {
    return optimizeCreatorProfile(args as unknown as OptimizeProfileInput, auth);
  }
  return { success: false, error: `Tool desconocida: ${toolName}` };
}

async function optimizeCreatorProfile(
  input: OptimizeProfileInput,
  auth: AuthContext
): Promise<ToolResult<OptimizeProfileOutput>> {
  const { creator_id, focus = "visibility" } = input;

  // El creador debe pertenecer a la org del API key
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, bio, avatar_url, banner_url, country, location, " +
      "social_links, pricing, specializations, marketplace_score, portfolio_count, " +
      "projects_completed, response_rate, is_available"
    )
    .eq("id", creator_id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "Perfil no encontrado" };
  }

  // Verificar que el creador pertenece a la organización
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", creator_id)
    .eq("organization_id", auth.org_id)
    .single();

  if (!membership) {
    return { success: false, error: "El creador no pertenece a esta organización" };
  }

  // Intentar análisis IA via portfolio-ai
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "portfolio-ai",
    {
      body: {
        action: "optimize_profile",
        profile,
        focus,
        organization_id: auth.org_id,
      },
    }
  );

  if (fnError) {
    // Fallback: análisis algorítmico
    const result = computeProfileOptimizations(profile as unknown as Record<string, unknown>, focus);
    return { success: true, data: result, tokens_used: 0 };
  }

  return {
    success: true,
    data: fnData as OptimizeProfileOutput,
    tokens_used: fnData?.tokens_used ?? 200,
  };
}

function computeProfileOptimizations(
  profile: Record<string, unknown>,
  focus: string
): OptimizeProfileOutput {
  const improvements: ProfileImprovement[] = [];
  let currentScore = (profile.marketplace_score as number) ?? 0;

  if (!profile.avatar_url) {
    improvements.push({
      field: "avatar_url",
      current_value: null,
      suggested_value: "Sube una foto profesional de alta calidad (mínimo 400×400px)",
      impact: "high",
      reason: "Perfiles sin foto reciben 60% menos contactos",
    });
  }

  if (!profile.bio || (profile.bio as string).length < 100) {
    improvements.push({
      field: "bio",
      current_value: (profile.bio as string) ?? null,
      suggested_value:
        "Bio descriptiva de 150-300 caracteres con especialización, resultados y propuesta de valor única",
      impact: "high",
      reason: "La bio es el primer filtro de potenciales clientes",
    });
  }

  if (!profile.banner_url) {
    improvements.push({
      field: "banner_url",
      current_value: null,
      suggested_value: "Agrega un banner que muestre tu trabajo o estilo visual (1200×400px)",
      impact: "medium",
      reason: "Los banners aumentan el tiempo de visita al perfil en un 40%",
    });
  }

  if ((profile.portfolio_count as number) < 5) {
    improvements.push({
      field: "portfolio_videos",
      current_value: String(profile.portfolio_count ?? 0),
      suggested_value: "Agrega al menos 5 videos de portfolio con variedad de estilos",
      impact: "high",
      reason:
        "El portfolio es el principal criterio de selección para el 78% de los clientes",
    });
  }

  const socialLinks = (profile.social_links as Record<string, string>) ?? {};
  if (Object.keys(socialLinks).length < 2) {
    improvements.push({
      field: "social_links",
      current_value: JSON.stringify(socialLinks),
      suggested_value: "Vincula al menos Instagram y TikTok para aumentar credibilidad",
      impact: "medium",
      reason: "Los perfiles con redes vinculadas generan 2x más confianza",
    });
  }

  if (!profile.pricing) {
    improvements.push({
      field: "pricing",
      current_value: null,
      suggested_value:
        "Define una tarifa base clara. Los clientes prefieren perfiles con precios visibles",
      impact: focus === "conversions" ? "high" : "medium",
      reason: "Los perfiles sin pricing reciben 35% menos propuestas directas",
    });
  }

  const projectedScore = Math.min(
    currentScore + improvements.filter((i) => i.impact === "high").length * 8,
    100
  );

  return {
    creator_id: profile.id as string,
    current_score: currentScore,
    projected_score: projectedScore,
    improvements: improvements.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.impact] - order[b.impact];
    }),
  };
}
