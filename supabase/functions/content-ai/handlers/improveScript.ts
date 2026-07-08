import { callAI, SYSTEM_PROMPTS } from "./_shared-helpers.ts";
import type { ContentAIContext } from "./types.ts";

// Caso "improve_script".
export async function handleImproveScript(ctx: ContentAIContext): Promise<{ result: string }> {
  const { data, aiConfig, fallbacks } = ctx;

  const improvePrompt = `Mejora el siguiente guion basándote en el feedback proporcionado:

GUION ORIGINAL:
${data?.original_script || ""}

FEEDBACK:
${data?.feedback || "Hazlo más dinámico y atractivo"}

Devuelve el guion mejorado manteniendo el formato HTML estructurado.`;

  const result = await callAI(aiConfig.provider, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.improve_script, improvePrompt, fallbacks);
  return { result };
}
