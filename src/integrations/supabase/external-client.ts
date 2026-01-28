/**
 * External Supabase Client for Kreoon
 * This client connects to the external Supabase project (Kreoon)
 * Use this for all database operations going forward
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// External Supabase project credentials (Kreoon)
const EXTERNAL_SUPABASE_URL = 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa2JxY3J4d3NtdnR4bXFnaXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDQwNTYsImV4cCI6MjA4NTAyMDA1Nn0.BorqcEBToDVeFBDQktZoCjCndYwB0bc6jlKmSJn-Wi8';

// Create the external Supabase client
export const supabaseExternal = createClient<Database>(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Export the project details for reference
export const EXTERNAL_PROJECT_ID = 'wjkbqcrxwsmvtxmqgiqc';
export const EXTERNAL_PROJECT_URL = EXTERNAL_SUPABASE_URL;
