import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Kreoon (source - old IDs) - use service role for full access
const KREOON_URL = Deno.env.get('KREOON_SUPABASE_URL') ?? 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
const KREOON_SERVICE_KEY = Deno.env.get('KREOON_SERVICE_ROLE_KEY') ?? '';

// Lovable Cloud (target - new IDs)  
const LOVABLE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const LOVABLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Connecting to Kreoon with service role key...');
    const kreoonClient = createClient(KREOON_URL, KREOON_SERVICE_KEY);
    const lovableClient = createClient(LOVABLE_URL, LOVABLE_KEY);

    console.log('Fetching content from Kreoon...');
    
    // 1. Get all content from Kreoon with assignments
    const { data: kreoonContent, error: kreoonError } = await kreoonClient
      .from('content')
      .select('id, title, creator_id, editor_id, creator_assigned_at, editor_assigned_at')
      .or('creator_id.not.is.null,editor_id.not.is.null');

    if (kreoonError) {
      console.error('Kreoon content error:', kreoonError);
      throw new Error(`Kreoon content error: ${JSON.stringify(kreoonError)}`);
    }
    
    console.log(`Found ${kreoonContent?.length || 0} content items in Kreoon`);

    // 2. Get all profiles from Kreoon (old IDs -> email)
    const { data: kreoonProfiles, error: profilesError } = await kreoonClient
      .from('profiles')
      .select('id, email, full_name');

    if (profilesError) {
      console.error('Kreoon profiles error:', profilesError);
      throw new Error(`Kreoon profiles error: ${JSON.stringify(profilesError)}`);
    }
    
    console.log(`Found ${kreoonProfiles?.length || 0} profiles in Kreoon`);

    // 3. Get all profiles from Lovable (email -> new IDs)
    const { data: lovableProfiles, error: lovableProfilesError } = await lovableClient
      .from('profiles')
      .select('id, email, full_name');

    if (lovableProfilesError) {
      console.error('Lovable profiles error:', lovableProfilesError);
      throw new Error(`Lovable profiles error: ${JSON.stringify(lovableProfilesError)}`);
    }
    
    console.log(`Found ${lovableProfiles?.length || 0} profiles in Lovable`);

    // Build maps
    const kreoonIdToEmail = new Map<string, string>();
    kreoonProfiles?.forEach((p: any) => {
      if (p.email) kreoonIdToEmail.set(p.id, p.email.toLowerCase());
    });

    const emailToNewId = new Map<string, string>();
    lovableProfiles?.forEach((p: any) => {
      if (p.email) emailToNewId.set(p.email.toLowerCase(), p.id);
    });

    // 4. Process each content and update in Lovable
    const results = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      mappings: [] as any[],
    };

    for (const content of kreoonContent || []) {
      results.processed++;

      const updates: any = {};

      // Map creator
      if (content.creator_id) {
        const oldEmail = kreoonIdToEmail.get(content.creator_id);
        if (oldEmail) {
          const newId = emailToNewId.get(oldEmail);
          if (newId) {
            updates.creator_id = newId;
            if (content.creator_assigned_at) {
              updates.creator_assigned_at = content.creator_assigned_at;
            }
          }
        }
      }

      // Map editor
      if (content.editor_id) {
        const oldEmail = kreoonIdToEmail.get(content.editor_id);
        if (oldEmail) {
          const newId = emailToNewId.get(oldEmail);
          if (newId) {
            updates.editor_id = newId;
            if (content.editor_assigned_at) {
              updates.editor_assigned_at = content.editor_assigned_at;
            }
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await lovableClient
          .from('content')
          .update(updates)
          .eq('id', content.id);

        if (updateError) {
          results.errors.push(`${content.id}: ${updateError.message}`);
        } else {
          results.updated++;
          results.mappings.push({
            contentId: content.id,
            title: content.title,
            updates
          });
        }
      } else {
        results.skipped++;
      }
    }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
