import { callAI, SYSTEM_PROMPTS } from "./_shared-helpers.ts";
import type { ContentAIContext } from "./types.ts";

// Caso "chat".
export async function handleChat(ctx: ContentAIContext): Promise<{ result: string }> {
  const { data, aiConfig, fallbacks } = ctx;

  if (!data?.messages || data.messages.length === 0) {
    throw new Error("Messages are required for chat");
  }

  // For chat, build the full conversation
  const userMessage = data.messages[data.messages.length - 1]?.content || "";
  const result = await callAI(aiConfig.provider, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.chat, userMessage, fallbacks);
  return { result };
}
