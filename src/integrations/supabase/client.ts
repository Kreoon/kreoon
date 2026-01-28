// MIGRATED TO KREOON - Using external Supabase project
// Original Lovable Cloud client kept for reference

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Kreoon (External Supabase) - PRIMARY DATABASE
const KREOON_SUPABASE_URL = 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
const KREOON_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa2JxY3J4d3NtdnR4bXFnaXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDQwNTYsImV4cCI6MjA4NTAyMDA1Nn0.wEuXMmCR9f4o3VFVlXNXn62qcMFnLgLVvSF_rBvSN3w';

// Main client now points to Kreoon
export const supabase = createClient<Database>(KREOON_SUPABASE_URL, KREOON_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Legacy Lovable Cloud client (for edge functions that still need it)
const LOVABLE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const LOVABLE_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseLovable = createClient<Database>(LOVABLE_SUPABASE_URL, LOVABLE_SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});