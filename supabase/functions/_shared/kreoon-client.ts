/**
 * Kreoon Supabase Client for Edge Functions
 *
 * This shared module provides a Supabase client that connects to the
 * Kreoon database for Edge Functions.
 *
 * Usage in Edge Functions:
 * import { createKreoonClient, getKreoonClient } from "../_shared/kreoon-client.ts";
 * 
 * For authenticated operations (with user token):
 *   const client = createKreoonClient(authToken);
 * 
 * For service role operations (admin):
 *   const client = getKreoonClient();
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Kreoon database credentials - fetched from environment
const KREOON_URL = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("EXTERNAL_SUPABASE_URL");
const KREOON_SERVICE_KEY = Deno.env.get("KREOON_SERVICE_ROLE_KEY");
const KREOON_ANON_KEY = Deno.env.get("EXTERNAL_SUPABASE_ANON_KEY");

/**
 * Get a Supabase client connected to Kreoon with service role (admin) permissions
 * Use this for operations that require elevated privileges
 */
export function getKreoonClient(): SupabaseClient {
  if (!KREOON_URL) {
    throw new Error("KREOON_SUPABASE_URL or EXTERNAL_SUPABASE_URL not configured");
  }
  
  const key = KREOON_SERVICE_KEY || KREOON_ANON_KEY;
  if (!key) {
    throw new Error("KREOON_SERVICE_ROLE_KEY or EXTERNAL_SUPABASE_ANON_KEY not configured");
  }
  
  return createClient(KREOON_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client connected to Kreoon that respects user auth
 * Use this for operations that should respect RLS policies
 * 
 * @param authToken - The user's JWT token from the Authorization header
 */
export function createKreoonClient(authToken?: string): SupabaseClient {
  if (!KREOON_URL) {
    throw new Error("KREOON_SUPABASE_URL or EXTERNAL_SUPABASE_URL not configured");
  }
  
  const key = KREOON_SERVICE_KEY || KREOON_ANON_KEY;
  if (!key) {
    throw new Error("No Kreoon API key configured");
  }
  
  const options: any = {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  };
  
  // If auth token provided, add it to global headers
  if (authToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    };
  }
  
  return createClient(KREOON_URL, key, options);
}

/**
 * Helper to validate a user's JWT against Kreoon
 * Returns user data if valid, throws if invalid
 */
export async function validateKreoonAuth(authHeader: string | null): Promise<{
  user: { id: string; email?: string };
  token: string;
}> {
  if (!authHeader) {
    throw new Error("No authorization header");
  }
  
  const token = authHeader.replace("Bearer ", "");
  const client = getKreoonClient();
  
  // Use getClaims for JWT validation (faster than getUser)
  const { data, error } = await client.auth.getClaims(token);
  
  if (error || !data?.claims) {
    throw new Error("Invalid or expired token");
  }
  
  return {
    user: {
      id: data.claims.sub as string,
      email: data.claims.email as string | undefined,
    },
    token,
  };
}

/**
 * Get the Kreoon database URL (for reference/logging)
 */
export function getKreoonUrl(): string {
  return KREOON_URL || "";
}

/**
 * Check if Kreoon is properly configured
 */
export function isKreoonConfigured(): boolean {
  return !!(KREOON_URL && (KREOON_SERVICE_KEY || KREOON_ANON_KEY));
}

// Export constants for reference
export const KREOON_PROJECT_ID = "wjkbqcrxwsmvtxmqgiqc";
