import { callAI, SYSTEM_PROMPTS } from "./_shared-helpers.ts";
import type { ContentAIContext } from "./types.ts";

// Caso "analyze_content".
export async function handleAnalyzeContent(ctx: ContentAIContext): Promise<{ result: string }> {
  const { data, aiConfig, fallbacks } = ctx;

  const analyzePrompt = `Analiza el siguiente contenido y proporciona feedback detallado:

${data?.script ? `GUION:\n${data.script}` : ""}
${data?.video_url ? `VIDEO URL: ${data.video_url}` : ""}

Proporciona un análisis completo con puntuación del 1-10 para cada aspecto y sugerencias específicas de mejora.`;

  const result = await callAI(aiConfig.provider, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.analyze_content, analyzePrompt, fallbacks);
  return { result };
}
