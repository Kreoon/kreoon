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

function normalizeTitle(title: unknown): string {
  return String(title ?? '')
    .trim()
    .toLowerCase()
    // normalize curly quotes and common punctuation differences
    .replace(/[“”"'`´]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ');
}

function toTime(value: unknown): number {
  const t = new Date(String(value ?? '')).getTime();
  return Number.isFinite(t) ? t : 0;
}

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
      .select('id, title, created_at, creator_id, editor_id, creator_assigned_at, editor_assigned_at')
      .or('creator_id.not.is.null,editor_id.not.is.null');

    if (kreoonError) {
      console.error('Kreoon content error:', kreoonError);
      throw new Error(`Kreoon content error: ${JSON.stringify(kreoonError)}`);
    }
    
    console.log(`Found ${kreoonContent?.length || 0} content items in Kreoon`);

    console.log('Fetching content index from Lovable (target)...');
    const { data: lovableContentIndex, error: lovableContentError } = await lovableClient
      .from('content')
      .select('id, title, created_at');

    if (lovableContentError) {
      console.error('Lovable content index error:', lovableContentError);
      throw new Error(`Lovable content index error: ${JSON.stringify(lovableContentError)}`);
    }

    // Build a title->candidates index for matching when IDs differ
    const targetByTitle = new Map<string, Array<{ id: string; created_at: string | null; title: string }>>();
    (lovableContentIndex || []).forEach((c: any) => {
      const key = normalizeTitle(c.title);
      if (!key) return;
      const list = targetByTitle.get(key) ?? [];
      list.push({ id: c.id, created_at: c.created_at ?? null, title: c.title });
      targetByTitle.set(key, list);
    });

    // 2. Get all profiles from Kreoon (old IDs -> email)
    const { data: kreoonProfiles, error: profilesError } = await kreoonClient
      .from('profiles')
      .select('id, email, full_name');

    if (profilesError) {
      console.error('Kreoon profiles error:', profilesError);
      throw new Error(`Kreoon profiles error: ${JSON.stringify(profilesError)}`);
    }
    
    console.log(`Found ${kreoonProfiles?.length || 0} profiles in Kreoon`);

    // IMPORTANT: Many historical creator/editor IDs may come from auth.users (not public.profiles).
    // With service role, we can read the auth user list to map id -> email.
    console.log('Fetching users from Kreoon auth to complete id->email map...');
    const authIdToEmail = new Map<string, string>();
    try {
      // paginate defensively
      let page = 1;
      const perPage = 1000;
      // deno-lint-ignore no-explicit-any
      while (page <= 10) {
        const { data, error } = await (kreoonClient as any).auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const users = data?.users ?? [];
        users.forEach((u: any) => {
          if (u?.id && u?.email) authIdToEmail.set(String(u.id), String(u.email).toLowerCase());
        });
        if (users.length < perPage) break;
        page++;
      }
    } catch (e) {
      console.error('Failed to fetch Kreoon auth users (continuing with profiles only):', e);
    }

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

    // Fill missing IDs from auth.users mapping
    authIdToEmail.forEach((email, id) => {
      if (!kreoonIdToEmail.has(id)) kreoonIdToEmail.set(id, email);
    });

    const emailToNewId = new Map<string, string>();
    lovableProfiles?.forEach((p: any) => {
      if (p.email) emailToNewId.set(p.email.toLowerCase(), p.id);
    });

    // 4. Process each content and update in Lovable
    const results = {
      processed: 0,
      updated: 0,
      not_found_in_target: 0,
      ambiguous: 0,
      skipped: 0,
      stats: {
        kreoon_profiles_total: kreoonProfiles?.length ?? 0,
        kreoon_profiles_missing_email: (kreoonProfiles || []).filter((p: any) => !p?.email).length,
        kreoon_auth_users_total: authIdToEmail.size,
        lovable_profiles_total: lovableProfiles?.length ?? 0,
        source_items_with_creator: (kreoonContent || []).filter((c: any) => !!c?.creator_id).length,
        source_items_with_editor: (kreoonContent || []).filter((c: any) => !!c?.editor_id).length,
        source_creator_missing_email: 0,
        source_editor_missing_email: 0,
        source_creator_email_not_in_target: 0,
        source_editor_email_not_in_target: 0,
      },
      errors: [] as string[],
      mappings: [] as any[],
      unmatched_samples: [] as any[],
    };

    for (const content of kreoonContent || []) {
      results.processed++;

      const updates: any = {};

      // Map creator
      if (content.creator_id) {
        const oldEmail = kreoonIdToEmail.get(content.creator_id);
        if (!oldEmail) {
          results.stats.source_creator_missing_email++;
        }
        if (oldEmail) {
          const newId = emailToNewId.get(oldEmail);
          if (!newId) {
            results.stats.source_creator_email_not_in_target++;
          }
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
        if (!oldEmail) {
          results.stats.source_editor_missing_email++;
        }
        if (oldEmail) {
          const newId = emailToNewId.get(oldEmail);
          if (!newId) {
            results.stats.source_editor_email_not_in_target++;
          }
          if (newId) {
            updates.editor_id = newId;
            if (content.editor_assigned_at) {
              updates.editor_assigned_at = content.editor_assigned_at;
            }
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        // Find the target content row.
        // 1) Try same ID
        let targetId: string | null = null;

        const { data: directHit, error: directHitError } = await lovableClient
          .from('content')
          .select('id, created_at')
          .eq('id', content.id)
          .maybeSingle();

        if (directHitError) {
          results.errors.push(`${content.id}: direct lookup failed: ${directHitError.message}`);
          continue;
        }

        if (directHit?.id) {
          targetId = directHit.id;
        } else {
          // 2) Fallback: match by normalized title (and closest created_at if multiple)
          const key = normalizeTitle(content.title);
          const candidates = targetByTitle.get(key) ?? [];

          if (candidates.length === 0) {
            results.not_found_in_target++;
            if (results.unmatched_samples.length < 25) {
              results.unmatched_samples.push({
                sourceContentId: content.id,
                title: content.title,
                reason: 'no_target_match_by_title',
              });
            }
            continue;
          }

          if (candidates.length === 1) {
            targetId = candidates[0].id;
          } else {
            // Choose closest created_at
            const srcTime = toTime((content as any).created_at);
            const sorted = [...candidates].sort((a, b) => {
              const da = Math.abs(toTime(a.created_at) - srcTime);
              const db = Math.abs(toTime(b.created_at) - srcTime);
              return da - db;
            });

            // If we can't meaningfully disambiguate (missing created_at), mark ambiguous
            const best = sorted[0];
            const second = sorted[1];
            const bestDelta = Math.abs(toTime(best.created_at) - srcTime);
            const secondDelta = Math.abs(toTime(second.created_at) - srcTime);

            // Require a clear winner if both deltas are small/close
            if (srcTime === 0 || (secondDelta - bestDelta) < 60_000) {
              results.ambiguous++;
              if (results.unmatched_samples.length < 25) {
                results.unmatched_samples.push({
                  sourceContentId: content.id,
                  title: content.title,
                  reason: 'ambiguous_target_match_by_title',
                  candidateCount: candidates.length,
                  candidateIds: candidates.slice(0, 5).map((c) => c.id),
                });
              }
              continue;
            }

            targetId = best.id;
          }
        }

        if (!targetId) {
          results.not_found_in_target++;
          continue;
        }

        const { data: updatedRows, error: updateError } = await lovableClient
          .from('content')
          .update(updates)
          .eq('id', targetId)
          .select('id');

        if (updateError) {
          results.errors.push(`${content.id} -> ${targetId}: ${updateError.message}`);
          continue;
        }

        if (!updatedRows || updatedRows.length === 0) {
          // No row matched (shouldn't happen, but keep accounting accurate)
          results.not_found_in_target++;
          continue;
        }

        results.updated++;
        results.mappings.push({
          sourceContentId: content.id,
          targetContentId: targetId,
          title: content.title,
          updates,
        });
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
