import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Kreoon Supabase project - PRIMARY DATABASE
// IMPORTANT: Configure these in your .env file
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY_VALUE = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY_VALUE) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_VALUE;

// Edge Functions URL - must match DB project for auth to work
export const SUPABASE_FUNCTIONS_URL = SUPABASE_URL;

// Main client pointing to Kreoon
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Export project details for reference
export const SUPABASE_PROJECT_ID = 'wjkbqcrxwsmvtxmqgiqc';
export const SUPABASE_PROJECT_URL = SUPABASE_URL;
