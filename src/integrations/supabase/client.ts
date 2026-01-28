// MIGRATED TO KREOON - Using external Supabase project
// Original Lovable Cloud client kept for reference

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Kreoon (External Supabase) - PRIMARY DATABASE
const KREOON_SUPABASE_URL = 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
const KREOON_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa2JxY3J4d3NtdnR4bXFnaXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDQwNTYsImV4cCI6MjA4NTAyMDA1Nn0.BorqcEBToDVeFBDQktZoCjCndYwB0bc6jlKmSJn-Wi8';

// Main client now points to Kreoon
export const supabase = createClient<Database>(KREOON_SUPABASE_URL, KREOON_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// IMPORTANT: We intentionally do NOT initialize a secondary client pointing to the legacy backend.
// Doing so would auto-refresh old sessions in the background and can break login/password recovery.