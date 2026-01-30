import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Source: Lovable Cloud
const LOVABLE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const LOVABLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Target: Kreoon
const KREOON_URL = Deno.env.get('KREOON_SUPABASE_URL') ?? 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
const KREOON_KEY = Deno.env.get('KREOON_SERVICE_ROLE_KEY') ?? '';

interface MigrationResult {
  table: string;
  source_count: number;
  target_before: number;
  upserted: number;
  target_after: number;
  errors: string[];
}

// Helper to get record timestamp for comparison
function getRecordTimestamp(record: Record<string, unknown>): number {
  const updated = record.updated_at as string | undefined;
  const created = record.created_at as string | undefined;
  const timestamp = updated || created;
  if (!timestamp) return 0;
  return new Date(timestamp).getTime();
}

// Merge two records, preferring the more recent one for each field
function mergeRecords(
  source: Record<string, unknown>,
  target: Record<string, unknown> | null
): Record<string, unknown> {
  if (!target) return source;
  
  const sourceTime = getRecordTimestamp(source);
  const targetTime = getRecordTimestamp(target);
  
  // If source is more recent, use source entirely
  if (sourceTime >= targetTime) {
    return source;
  }
  
  // If target is more recent, keep target but fill in nulls from source
  const merged = { ...target };
  for (const key of Object.keys(source)) {
    if (merged[key] === null || merged[key] === undefined) {
      merged[key] = source[key];
    }
  }
  return merged;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting full migration from Lovable Cloud to Kreoon...');
    
    const lovableClient = createClient(LOVABLE_URL, LOVABLE_KEY);
    const kreoonClient = createClient(KREOON_URL, KREOON_KEY);

    const results: MigrationResult[] = [];
    const globalErrors: string[] = [];

    // Tables to migrate in dependency order
    const tablesToMigrate = [
      'organizations',
      'profiles',
      'clients',
      'products',
      'client_packages',
      'content',
      'organization_members',
      'organization_member_roles',
      'organization_member_badges',
      'chat_conversations',
      'chat_participants',
      'chat_messages',
      'notifications',
      'payments',
      'content_history',
      'content_comments',
      'ai_assistant_config',
      'ai_assistant_knowledge',
      'board_settings',
      'board_permissions',
      'up_creadores',
      'up_creadores_totals',
      'up_editores',
      'up_editores_totals',
    ];

    for (const table of tablesToMigrate) {
      console.log(`\n=== Migrating table: ${table} ===`);
      const tableResult: MigrationResult = {
        table,
        source_count: 0,
        target_before: 0,
        upserted: 0,
        target_after: 0,
        errors: [],
      };

      try {
        // Get source data from Lovable
        const { data: sourceData, error: sourceError } = await lovableClient
          .from(table)
          .select('*');

        if (sourceError) {
          tableResult.errors.push(`Source read error: ${sourceError.message}`);
          results.push(tableResult);
          continue;
        }

        tableResult.source_count = sourceData?.length ?? 0;
        console.log(`  Source records: ${tableResult.source_count}`);

        if (!sourceData || sourceData.length === 0) {
          results.push(tableResult);
          continue;
        }

        // Get target data from Kreoon for comparison
        const { data: targetData, error: targetError } = await kreoonClient
          .from(table)
          .select('*');

        if (targetError) {
          tableResult.errors.push(`Target read error: ${targetError.message}`);
          results.push(tableResult);
          continue;
        }

        tableResult.target_before = targetData?.length ?? 0;
        console.log(`  Target records before: ${tableResult.target_before}`);

        // Create a map of target records by ID for quick lookup
        const targetMap = new Map<string, Record<string, unknown>>();
        (targetData || []).forEach((record: Record<string, unknown>) => {
          if (record.id) {
            targetMap.set(record.id as string, record);
          }
        });

        // Process records and merge
        const recordsToUpsert: Record<string, unknown>[] = [];
        
        for (const sourceRecord of sourceData) {
          const targetRecord = targetMap.get(sourceRecord.id as string) ?? null;
          const merged = mergeRecords(
            sourceRecord as Record<string, unknown>,
            targetRecord
          );
          
          // Replace Lovable storage URLs with Kreoon URLs
          for (const key of Object.keys(merged)) {
            if (typeof merged[key] === 'string') {
              merged[key] = (merged[key] as string).replace(
                /hfooshsteglylhvrpuka/g,
                'wjkbqcrxwsmvtxmqgiqc'
              );
            }
          }
          
          recordsToUpsert.push(merged);
        }

        // Upsert in batches
        const batchSize = 100;
        for (let i = 0; i < recordsToUpsert.length; i += batchSize) {
          const batch = recordsToUpsert.slice(i, i + batchSize);
          
          const { error: upsertError } = await kreoonClient
            .from(table)
            .upsert(batch, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            });

          if (upsertError) {
            tableResult.errors.push(`Upsert batch ${i}-${i + batch.length} error: ${upsertError.message}`);
          } else {
            tableResult.upserted += batch.length;
          }
        }

        console.log(`  Upserted: ${tableResult.upserted}`);

        // Get final count
        const { count: finalCount } = await kreoonClient
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        tableResult.target_after = finalCount ?? 0;
        console.log(`  Target records after: ${tableResult.target_after}`);

      } catch (tableError) {
        tableResult.errors.push(`Table error: ${String(tableError)}`);
      }

      results.push(tableResult);
    }

    // Summary
    const summary = {
      total_tables: results.length,
      successful: results.filter(r => r.errors.length === 0).length,
      with_errors: results.filter(r => r.errors.length > 0).length,
      total_records_migrated: results.reduce((sum, r) => sum + r.upserted, 0),
    };

    console.log('\n=== Migration Complete ===');
    console.log(`Tables processed: ${summary.total_tables}`);
    console.log(`Successful: ${summary.successful}`);
    console.log(`With errors: ${summary.with_errors}`);
    console.log(`Total records migrated: ${summary.total_records_migrated}`);

    return new Response(JSON.stringify({
      summary,
      results,
      global_errors: globalErrors,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Migration failed:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
