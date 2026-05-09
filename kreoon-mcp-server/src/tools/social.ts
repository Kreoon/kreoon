import { createClient } from "@supabase/supabase-js";
import {
  AuthContext,
  ToolResult,
  PublishToSocialInput,
  SocialPostResult,
} from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const socialToolDefinitions = [
  {
    name: "publish_to_social",
    description:
      "Publica o programa contenido en múltiples redes sociales simultáneamente. " +
      "Soporta Instagram, TikTok, YouTube, Twitter y LinkedIn. " +
      "Si se proporciona scheduled_at, el post queda programado; de lo contrario se publica inmediatamente. " +
      "Costo: 40 tokens IA (para optimización de caption).",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Texto/caption del post (max 2200 caracteres)",
          maxLength: 2200,
        },
        platforms: {
          type: "array",
          items: {
            type: "string",
            enum: ["instagram", "tiktok", "youtube", "twitter", "linkedin"],
          },
          description: "Plataformas donde publicar",
          minItems: 1,
        },
        media_url: {
          type: "string",
          description:
            "URL del video/imagen en Bunny CDN o URL pública directa. " +
            "Obligatorio para Instagram y TikTok.",
        },
        scheduled_at: {
          type: "string",
          format: "date-time",
          description:
            "Fecha/hora de publicación en ISO 8601. Si se omite, publica ahora.",
        },
        hashtags: {
          type: "array",
          items: { type: "string" },
          description: "Hashtags a incluir (sin #). Max 30.",
          maxItems: 30,
        },
      },
      required: ["content", "platforms"],
    },
  },
];

export async function handleSocialTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult<SocialPostResult[]>> {
  if (toolName === "publish_to_social") {
    return publishToSocial(args as unknown as PublishToSocialInput, auth);
  }
  return { success: false, error: `Tool desconocida: ${toolName}` };
}

async function publishToSocial(
  input: PublishToSocialInput,
  auth: AuthContext
): Promise<ToolResult<SocialPostResult[]>> {
  const { content, platforms, media_url, scheduled_at, hashtags = [] } = input;

  // Verificar conexiones sociales del usuario
  const { data: connections, error: connError } = await supabase
    .from("social_connections")
    .select("platform, access_token, is_active")
    .eq("user_id", auth.user_id)
    .in("platform", platforms)
    .eq("is_active", true);

  if (connError) {
    return { success: false, error: `Error verificando conexiones: ${connError.message}` };
  }

  const connectedPlatforms = new Set(
    (connections ?? []).map((c: { platform: string }) => c.platform)
  );

  const results: SocialPostResult[] = [];
  const fullContent = hashtags.length > 0
    ? `${content}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`
    : content;

  for (const platform of platforms) {
    if (!connectedPlatforms.has(platform)) {
      results.push({
        platform,
        status: "failed",
        error: `No hay cuenta ${platform} conectada. Ve a Kreoon > Configuración > Redes Sociales.`,
      });
      continue;
    }

    if ((platform === "instagram" || platform === "tiktok") && !media_url) {
      results.push({
        platform,
        status: "failed",
        error: `${platform} requiere un video o imagen (media_url)`,
      });
      continue;
    }

    if (scheduled_at) {
      // Guardar post programado en BD
      const { data: scheduled, error: schedError } = await supabase
        .from("scheduled_posts")
        .insert({
          user_id: auth.user_id,
          organization_id: auth.org_id,
          platform,
          content: fullContent,
          media_url: media_url ?? null,
          scheduled_at,
          status: "scheduled",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      results.push({
        platform,
        status: schedError ? "failed" : "scheduled",
        scheduled_at,
        post_id: scheduled?.id,
        error: schedError?.message,
      });
    } else {
      // Publicar inmediatamente via Edge Function
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "restream-api",
        {
          body: {
            action: "publish",
            platform,
            content: fullContent,
            media_url,
            user_id: auth.user_id,
            organization_id: auth.org_id,
          },
        }
      );

      results.push({
        platform,
        status: fnError ? "failed" : "published",
        post_url: fnData?.post_url,
        post_id: fnData?.post_id,
        error: fnError?.message,
      });
    }
  }

  const anySuccess = results.some((r) => r.status !== "failed");

  return {
    success: anySuccess,
    data: results,
    tokens_used: 40,
  };
}
