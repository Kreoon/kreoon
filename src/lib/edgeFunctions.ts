/**
 * Edge Functions Helper
 *
 * All Edge Functions are hosted on Kreoon (wjkbqcrxwsmvtxmqgiqc)
 * This helper provides a unified interface to invoke edge functions.
 */
import { supabase } from '@/integrations/supabase/client';

interface InvokeOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface InvokeResult<T = unknown> {
  data: T | null;
  error: Error | null;
}

/**
 * Invoke a Kreoon edge function
 *
 * All Edge Functions are hosted on Kreoon Supabase project.
 * Use this helper for consistent error handling and typing.
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  options?: InvokeOptions
): Promise<InvokeResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: options?.body,
      headers: options?.headers,
    });

    if (error) {
      console.error(`[EdgeFunction:${functionName}] Error:`, error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as T, error: null };
  } catch (err) {
    console.error(`[EdgeFunction:${functionName}] Exception:`, err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err))
    };
  }
}

/**
 * Edge Functions Registry
 *
 * All edge functions are hosted on Kreoon Supabase (wjkbqcrxwsmvtxmqgiqc)
 */
export const EdgeFunctions = {
  // AI Functions
  CONTENT_AI: 'content-ai',
  AI_ASSISTANT: 'ai-assistant',
  STREAMING_AI: 'streaming-ai-generate',
  PORTFOLIO_AI: 'portfolio-ai',
  TALENT_AI: 'talent-ai',
  BOARD_AI: 'board-ai',
  MULTI_AI: 'multi-ai',

  // Script Functions
  GENERATE_SCRIPT: 'generate-script',
  SCRIPT_CHAT: 'script-chat',

  // Document Functions
  FETCH_DOCUMENT: 'fetch-document',

  // Bunny/Storage Functions
  BUNNY_UPLOAD: 'bunny-upload',
  BUNNY_DOWNLOAD: 'bunny-download',
  BUNNY_STATUS: 'bunny-status',
  BUNNY_DELETE: 'bunny-delete',
  BUNNY_THUMBNAIL: 'bunny-thumbnail',

  // Profile Functions
  EVALUATE_TOKENS: 'evaluate-profile-tokens',
  INTEREST_EXTRACTOR: 'interest-extractor',

  // Notification Functions
  NOTIFY_DRIVE_UPLOAD: 'notify-drive-upload',
  SEND_INVITATION: 'send-invitation',

  // Integration Functions
  N8N_PROXY: 'n8n-proxy',
  GHL_SYNC: 'ghl-sync',
  RESTREAM_API: 'restream-api',

  // Utility Functions
  GENERATE_ACHIEVEMENT_ICON: 'generate-achievement-icon',
  PRODUCT_RESEARCH: 'product-research',

  // Admin Functions
  ADMIN_USERS: 'admin-users',
  API: 'api',
} as const;

export type EdgeFunctionName = typeof EdgeFunctions[keyof typeof EdgeFunctions];
