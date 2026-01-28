// Using Lovable Cloud as primary database while Kreoon migration is organized
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Lovable Cloud - PRIMARY DATABASE (stable, with all data and permissions)
const SUPABASE_URL = 'https://hfooshsteglylhvrpuka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmb29zaHN0ZWdseWxodnJwdWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwODMzNjMsImV4cCI6MjA4MTY1OTM2M30.b87cwW8Bu3_kHE_WUw4Izf-3zppHavlYkygeowj4404';

// Main client pointing to Lovable Cloud
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
