import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All tables to sync in dependency order
const TABLES_TO_SYNC = [
  // Core tables (no dependencies)
  'organizations',
  'app_settings',
  'achievements',
  'ai_tokenization_config',
  
  // Profiles and users
  'profiles',
  'user_roles',
  
  // Organization related
  'organization_members',
  'organization_member_roles',
  'organization_statuses',
  
  // Clients
  'clients',
  'client_users',
  'client_strategists',
  'client_packages',
  
  // Products
  'products',
  
  // Content and related
  'content',
  'content_collaborators',
  'content_comments',
  'content_likes',
  'content_views',
  
  // Chat system
  'chat_conversations',
  'chat_participants',
  'chat_messages',
  'chat_message_reads',
  'chat_typing_indicators',
  'chat_rbac_rules',
  
  // Social features
  'followers',
  'portfolio_posts',
  'portfolio_post_likes',
  'portfolio_post_comments',
  'portfolio_stories',
  'story_views',
  'saved_collections',
  'saved_items',
  'social_notifications',
  
  // Ambassador system
  'ambassador_referrals',
  'ambassador_network_stats',
  'ambassador_commission_config',
  'ambassador_up_config',
  'ambassador_ai_evaluations',
  
  // UP/Points system
  'up_creadores',
  'up_creadores_totals',
  'up_editores',
  'up_editores_totals',
  'user_achievements',
  
  // AI system
  'ai_assistant_config',
  'ai_assistant_knowledge',
  'ai_assistant_logs',
  'ai_chat_feedback',
  'ai_conversation_flows',
  'ai_negative_rules',
  'ai_positive_examples',
  'ai_prompt_config',
  'ai_usage_logs',
  
  // Board/Kanban
  'board_custom_fields',
  'board_permissions',
  'board_settings',
  'board_status_rules',
  
  // Notifications and tracking
  'notifications',
  'tracking_events',
  'user_activity',
  'user_presence',
  
  // Marketing
  'marketing_campaigns',
  'marketing_campaign_content',
  'client_marketing_ai_insights',
  
  // Payments
  'payments',
  'payment_requests',
  'currency_balances',
  'exchange_rates',
  
  // Misc
  'audit_logs',
  'blocked_ips',
  'company_followers',
  'contact_reveals',
  'registration_codes',
  'registration_settings',
  'api_keys',
  'webhook_configs',
  'user_interests',
  'user_referral_tracking',
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Lovable Cloud (source)
    const sourceUrl = Deno.env.get('SUPABASE_URL');
    const sourceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Kreoon (destination)
    const kreoonUrl = Deno.env.get('KREOON_SUPABASE_URL');
    const kreoonServiceKey = Deno.env.get('KREOON_SERVICE_ROLE_KEY');

    if (!kreoonUrl || !kreoonServiceKey) {
      return new Response(JSON.stringify({ error: 'Kreoon credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!sourceUrl || !sourceKey) {
      return new Response(JSON.stringify({ error: 'Lovable Cloud credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sourceClient = createClient(sourceUrl, sourceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const kreoonClient = createClient(kreoonUrl, kreoonServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { action, tables, secret } = await req.json();

    // Simple auth check
    if (secret !== 'kreoon-sync-2026') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: list_tables - Show available tables
    if (action === 'list_tables') {
      return new Response(JSON.stringify({ 
        tables: TABLES_TO_SYNC,
        total: TABLES_TO_SYNC.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: check_counts - Compare row counts between databases
    if (action === 'check_counts') {
      const counts: Record<string, { source: number; dest: number; diff: number }> = {};
      
      for (const table of TABLES_TO_SYNC) {
        try {
          const { count: sourceCount } = await sourceClient
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          const { count: destCount } = await kreoonClient
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          counts[table] = {
            source: sourceCount || 0,
            dest: destCount || 0,
            diff: (sourceCount || 0) - (destCount || 0)
          };
        } catch (e) {
          counts[table] = { source: -1, dest: -1, diff: 0 };
        }
      }
      
      return new Response(JSON.stringify({ counts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: sync_table - Sync a specific table
    if (action === 'sync_table') {
      const tableName = tables?.[0];
      if (!tableName) {
        return new Response(JSON.stringify({ error: 'Table name required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[sync_table] Starting sync for: ${tableName}`);
      
      // Read all data from source
      const { data: sourceData, error: readError } = await sourceClient
        .from(tableName)
        .select('*');

      if (readError) {
        return new Response(JSON.stringify({ 
          error: `Failed to read from source: ${readError.message}`,
          table: tableName
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!sourceData || sourceData.length === 0) {
        return new Response(JSON.stringify({ 
          success: true,
          table: tableName,
          count: 0,
          message: 'No data to sync'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Upsert to destination in batches of 100
      const batchSize = 100;
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < sourceData.length; i += batchSize) {
        const batch = sourceData.slice(i, i + batchSize);
        
        const { error: writeError } = await kreoonClient
          .from(tableName)
          .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

        if (writeError) {
          errorCount += batch.length;
          errors.push(`Batch ${i / batchSize}: ${writeError.message}`);
        } else {
          successCount += batch.length;
        }
      }

      return new Response(JSON.stringify({ 
        success: errorCount === 0,
        table: tableName,
        total: sourceData.length,
        synced: successCount,
        failed: errorCount,
        errors: errors.length > 0 ? errors : undefined
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: sync_all - Sync all tables
    if (action === 'sync_all') {
      const results: Record<string, { success: boolean; count: number; error?: string }> = {};
      
      for (const tableName of TABLES_TO_SYNC) {
        console.log(`[sync_all] Processing: ${tableName}`);
        
        try {
          // Read from source
          const { data: sourceData, error: readError } = await sourceClient
            .from(tableName)
            .select('*');

          if (readError) {
            results[tableName] = { success: false, count: 0, error: readError.message };
            continue;
          }

          if (!sourceData || sourceData.length === 0) {
            results[tableName] = { success: true, count: 0 };
            continue;
          }

          // Upsert to destination
          const { error: writeError } = await kreoonClient
            .from(tableName)
            .upsert(sourceData, { onConflict: 'id', ignoreDuplicates: false });

          if (writeError) {
            results[tableName] = { success: false, count: sourceData.length, error: writeError.message };
          } else {
            results[tableName] = { success: true, count: sourceData.length };
          }
        } catch (e) {
          results[tableName] = { success: false, count: 0, error: String(e) };
        }
      }

      const successCount = Object.values(results).filter(r => r.success).length;
      const failCount = Object.values(results).filter(r => !r.success).length;

      return new Response(JSON.stringify({ 
        success: failCount === 0,
        summary: {
          total: TABLES_TO_SYNC.length,
          synced: successCount,
          failed: failCount
        },
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Invalid action',
      validActions: ['list_tables', 'check_counts', 'sync_table', 'sync_all']
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
