/**
 * Supabase Client - Now pointing to Kreoon
 * Migrated from Lovable Cloud to external Supabase project
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Kreoon Supabase project - PRIMARY DATABASE
const SUPABASE_URL = 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa2JxY3J4d3NtdnR4bXFnaXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDQwNTYsImV4cCI6MjA4NTAyMDA1Nn0.BorqcEBToDVeFBDQktZoCjCndYwB0bc6jlKmSJn-Wi8';

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
