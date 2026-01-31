/**
 * Lovable Cloud Client - For Edge Functions ONLY
 * 
 * ARCHITECTURE:
 * ┌─────────────────────┐     ┌─────────────────────────────────────────────┐
 * │    Frontend App     │     │           Lovable Cloud                     │
 * │                     │     │  ┌─────────────────────────────────────────┐│
 * │  supabase (Kreoon)  │────▶│  │         Edge Functions                  ││
 * │  - Database ops     │     │  │  ┌─────────────────────────────────────┐││
 * │  - Auth             │     │  │  │ content-ai, board-ai, etc.         │││
 * │                     │     │  │  │ ──────────────────────────────────  │││
 * │  supabaseLovable    │────▶│  │  │ Uses KREOON_SUPABASE_URL for DB    │││
 * │  - Edge Functions   │     │  │  │ Uses direct AI APIs (Gemini, etc.) │││
 * │                     │     │  │  └─────────────────────────────────────┘││
 * └─────────────────────┘     │  └─────────────────────────────────────────┘│
 *                             └─────────────────────────────────────────────┘
 *                                                 │
 *                                                 ▼
 *                             ┌─────────────────────────────────────────────┐
 *                             │           Kreoon Supabase                   │
 *                             │  (wjkbqcrxwsmvtxmqgiqc)                     │
 *                             │  - All database tables                      │
 *                             │  - Auth users                               │
 *                             │  - Storage                                  │
 *                             └─────────────────────────────────────────────┘
 * 
 * Use supabaseLovable ONLY for invoking edge functions.
 * For database operations, use the main client from ./client.ts
 */
import { createClient } from '@supabase/supabase-js';

// Lovable Cloud project - EDGE FUNCTIONS ONLY
const LOVABLE_URL = 'https://hfooshsteglylhvrpuka.supabase.co';
const LOVABLE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmb29zaHN0ZWdseWxodnJwdWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwODMzNjMsImV4cCI6MjA4MTY1OTM2M30.b87cwW8Bu3_kHE_WUw4Izf-3zppHavlYkygeowj4404';

// Client for Lovable Cloud edge functions
export const supabaseLovable = createClient(LOVABLE_URL, LOVABLE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: false, // Don't persist auth - we only use this for functions
    autoRefreshToken: false,
  }
});

// Export project details
export const LOVABLE_PROJECT_ID = 'hfooshsteglylhvrpuka';
export const LOVABLE_PROJECT_URL = LOVABLE_URL;

/**
 * Helper to invoke Lovable Cloud edge functions
 * This ensures we always use the correct client for edge functions
 */
export async function invokeLovableFunction<T = unknown>(
  functionName: string,
  options?: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await supabaseLovable.functions.invoke(functionName, {
      body: options?.body,
      headers: options?.headers,
    });
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    return { data: data as T, error: null };
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error(String(err)) 
    };
  }
}
