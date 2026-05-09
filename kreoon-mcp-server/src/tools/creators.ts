import { createClient } from "@supabase/supabase-js";
import {
  AuthContext,
  ToolResult,
  SearchCreatorsInput,
  CreatorPublicProfile,
  ScoreCreatorInput,
  CreatorScoreOutput,
} from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const creatorToolDefinitions = [
  {
    name: "search_creators",
    description:
      "Busca creadores en el marketplace de Kreoon con filtros avanzados. " +
      "Devuelve perfiles públicos ordenados por score de marketplace. " +
      "Costo: 0 tokens (búsqueda pública).",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Término de búsqueda (nombre, bio, especialización)",
        },
        specializations: {
          type: "array",
          items: { type: "string" },
          description:
            "Filtrar por especialización. Valores: ugc, nano_influencer, video_editor, " +
            "trafficker, community_manager, photographer, copywriter",
        },
        min_score: {
          type: "number",
          description: "Score mínimo de marketplace (0-100)",
          minimum: 0,
          maximum: 100,
        },
        available_only: {
          type: "boolean",
          description: "Solo creadores disponibles para proyectos (default: false)",
        },
        country: {
          type: "string",
          description: "Código de país ISO 2, ej: CO, MX, AR",
        },
        limit: {
          type: "number",
          description: "Número de resultados (default: 10, max: 50)",
          minimum: 1,
          maximum: 50,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "score_creator_for_campaign",
    description:
      "Calcula un score de compatibilidad (0-100) entre un creador y los requisitos " +
      "de una campaña específica. Incluye breakdown por categoría y recomendación. " +
      "Costo: 120 tokens IA.",
    inputSchema: {
      type: "object",
      properties: {
        creator_id: {
          type: "string",
          description: "UUID del creador a evaluar",
        },
        campaign_requirements: {
          type: "object",
          description: "Requisitos de la campaña",
          properties: {
            platform: {
              type: "string",
              description: "Plataforma principal: instagram, tiktok, youtube",
            },
            content_type: {
              type: "string",
              description: "Tipo de contenido: ugc, reels, review, tutorial",
            },
            budget: {
              type: "number",
              description: "Presupuesto disponible en USD",
            },
            timeline_days: {
              type: "number",
              description: "Días disponibles para entrega",
            },
            specialization: {
              type: "string",
              description: "Especialización requerida",
            },
          },
          required: ["platform", "content_type"],
        },
      },
      required: ["creator_id", "campaign_requirements"],
    },
  },
];

export async function handleCreatorTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult<CreatorPublicProfile[] | CreatorScoreOutput>> {
  if (toolName === "search_creators") {
    return searchCreators(args as unknown as SearchCreatorsInput, auth);
  }
  if (toolName === "score_creator_for_campaign") {
    return scoreCreator(args as unknown as ScoreCreatorInput, auth);
  }
  return { success: false, error: `Tool desconocida: ${toolName}` };
}

async function searchCreators(
  input: SearchCreatorsInput,
  _auth: AuthContext
): Promise<ToolResult<CreatorPublicProfile[]>> {
  const {
    query,
    specializations,
    min_score = 0,
    available_only = false,
    country,
    limit = 10,
  } = input;

  let dbQuery = supabase
    .from("profiles")
    .select(
      "id, full_name, display_name, bio, country, specializations, marketplace_score, " +
      "ranking_tier, portfolio_count, projects_completed, response_rate, avatar_url"
    )
    .gte("marketplace_score", min_score)
    .order("marketplace_score", { ascending: false })
    .limit(Math.min(limit, 50));

  if (query) {
    dbQuery = dbQuery.or(
      `full_name.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`
    );
  }

  if (specializations && specializations.length > 0) {
    dbQuery = dbQuery.overlaps("specializations", specializations);
  }

  if (country) {
    dbQuery = dbQuery.eq("country", country.toUpperCase());
  }

  if (available_only) {
    dbQuery = dbQuery.eq("is_available", true);
  }

  const { data, error } = await dbQuery;

  if (error) {
    return { success: false, error: `Error buscando creadores: ${error.message}` };
  }

  return {
    success: true,
    data: (data ?? []) as unknown as CreatorPublicProfile[],
    tokens_used: 0,
  };
}

async function scoreCreator(
  input: ScoreCreatorInput,
  auth: AuthContext
): Promise<ToolResult<CreatorScoreOutput>> {
  const { creator_id, campaign_requirements } = input;

  const { data: creator, error: creatorError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, specializations, marketplace_score, ranking_tier, " +
      "portfolio_count, projects_completed, response_rate, is_available, pricing"
    )
    .eq("id", creator_id)
    .eq("is_public", true)
    .single();

  if (creatorError || !creator) {
    return { success: false, error: "Creador no encontrado" };
  }

  // Llamar a multi-ai para scoring inteligente
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "multi-ai",
    {
      body: {
        action: "score_creator",
        creator: creator,
        requirements: campaign_requirements,
        organization_id: auth.org_id,
      },
    }
  );

  if (fnError) {
    // Fallback: scoring algorítmico local
    const score = computeLocalScore(creator as unknown as Record<string, unknown>, campaign_requirements);
    return { success: true, data: score, tokens_used: 0 };
  }

  return {
    success: true,
    data: fnData as CreatorScoreOutput,
    tokens_used: fnData?.tokens_used ?? 120,
  };
}

function computeLocalScore(
  creator: Record<string, unknown>,
  requirements: ScoreCreatorInput["campaign_requirements"]
): CreatorScoreOutput {
  const profileScore = Math.min(
    ((creator.portfolio_count as number) ?? 0) >= 5 ? 30 : 15,
    30
  );
  const responseScore = Math.round(((creator.response_rate as number) ?? 0) * 0.25);
  const projectsScore = Math.min(
    ((creator.projects_completed as number) ?? 0) * 2,
    25
  );
  const availabilityScore = (creator.is_available as boolean) ? 20 : 0;

  const specMatch = ((creator.specializations as string[]) ?? []).includes(
    requirements.specialization ?? requirements.content_type
  );
  const platformScore = specMatch ? 25 : 10;

  const overall = profileScore + responseScore + projectsScore + availabilityScore;

  return {
    creator_id: creator.id as string,
    overall_score: Math.min(overall, 100),
    breakdown: {
      profile_completeness: profileScore,
      portfolio_quality: profileScore,
      response_rate: responseScore,
      projects_completed: projectsScore,
      platform_match: platformScore,
      availability: availabilityScore,
    },
    recommendation:
      overall >= 80
        ? "highly_recommended"
        : overall >= 60
        ? "recommended"
        : overall >= 40
        ? "consider"
        : "not_recommended",
    reasoning: "Score calculado algorítmicamente basado en métricas del perfil.",
  };
}
