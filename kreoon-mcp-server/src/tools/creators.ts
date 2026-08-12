import { createClient } from "@supabase/supabase-js";
import {
  AuthContext,
  ToolResult,
  SearchCreatorsInput,
  CreatorPublicProfile,
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
];

export async function handleCreatorTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult<CreatorPublicProfile[]>> {
  if (toolName === "search_creators") {
    return searchCreators(args as unknown as SearchCreatorsInput, auth);
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
