// Exporta a disco todas las tablas de los modulos a eliminar (simplificacion 2026).
// Uso: node backups/pre-simplificacion/tools/export-modules.mjs
// Lee SUPABASE_ACCESS_TOKEN de .env, obtiene la service_role key via Management API
// y descarga cada tabla vía PostgREST paginando de 1000 en 1000.
// Salida: <modulo>/<tabla>.json  +  <modulo>/<tabla>.csv  +  manifest.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..');
const REPO = join(HERE, '..', '..', '..');
const PROJECT_REF = 'wjkbqcrxwsmvtxmqgiqc';
const PAGE = 1000;

const MODULES = {
  'live-streaming': [
    'creator_live_streams', 'live_client_settings', 'live_event_creators', 'live_event_monitoring',
    'live_feature_flags', 'live_hosting_hosts', 'live_hosting_requests', 'live_hosting_status_history',
    'live_hosting_templates', 'live_hour_assignments', 'live_hour_purchases', 'live_hour_wallets',
    'live_org_oauth_tokens', 'live_packages', 'live_platform_config', 'live_stream_comments',
    'live_stream_history', 'live_stream_products', 'live_stream_reactions', 'live_stream_viewers',
    'live_streaming_channels', 'live_usage_logs', 'organization_streaming_config', 'streaming_accounts',
    'streaming_analytics_v2', 'streaming_channels_v2', 'streaming_chat_messages_v2', 'streaming_event_products',
    'streaming_events', 'streaming_guests_v2', 'streaming_logs', 'streaming_overlays_v2',
    'streaming_products_v2', 'streaming_providers_config', 'streaming_sales', 'streaming_session_channels_v2',
    'streaming_sessions_v2',
  ],
  'social-feed': [
    'company_followers', 'content_likes', 'favorites', 'feed_reactions', 'followers', 'hashtags',
    'kreadores_content_likes', 'link_previews', 'portfolio_post_comments', 'portfolio_post_likes',
    'portfolio_posts', 'portfolio_stories', 'post_hashtags', 'post_metrics', 'profile_views',
    'saved_collections', 'saved_creators', 'saved_items', 'saved_searches', 'social_notifications',
    'story_views', 'suggested_profiles_cache', 'user_feed_events', 'user_interest_profile',
  ],
  'up-reputacion': [
    'achievements', 'chronometer_pauses', 'global_badges', 'mission_templates', 'point_transactions',
    'reputation_configs', 'reputation_events', 'reputation_global', 'reputation_seasons',
    'role_multipliers', 'role_points_config', 'role_weight_config', 'season_goals', 'season_reward_claims',
    'season_rewards', 'unified_reputation_config', 'user_achievements', 'user_daily_missions',
    'user_global_badges', 'user_global_stats', 'user_points', 'user_reputation_totals', 'user_streaks',
    'up_ai_config', 'up_arbiter_log', 'up_chronometer_pauses', 'up_client_trust_scores', 'up_creadores',
    'up_creadores_totals', 'up_currency_conversions', 'up_editores', 'up_editores_totals', 'up_event_types',
    'up_events', 'up_fraud_alerts', 'up_permissions', 'up_quality_scores', 'up_quest_progress', 'up_quests',
    'up_rules', 'up_season_snapshots', 'up_seasons', 'up_settings', 'up_user_scores',
  ],
  'marketplace-campanas': [
    'marketplace_campaigns', 'campaign_applications', 'campaign_case_studies', 'campaign_deliverables',
    'campaign_invitations', 'campaign_mappings', 'campaign_media', 'campaign_metrics',
    'campaign_notifications', 'campaign_redemptions', 'campaign_templates', 'activation_publications',
    'publication_verification_queue', 'promotional_campaigns', 'managed_campaign_subscriptions',
  ],
  'booking': [
    'bookings', 'booking_availability', 'booking_branding', 'booking_custom_questions', 'booking_event_types',
    'booking_exceptions', 'booking_question_answers', 'booking_reminder_logs', 'booking_reminder_settings',
    'booking_webhook_logs', 'booking_webhooks', 'calendar_blocked_events', 'calendar_event_mappings',
    'calendar_integrations', 'creator_availability',
  ],
};

function readEnv() {
  const raw = readFileSync(join(REPO, '.env'), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

async function getServiceKey(accessToken) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  const keys = await res.json();
  const sr = keys.find((k) => k.name === 'service_role' || k.type === 'legacy' && k.name === 'service_role');
  if (!sr?.api_key) throw new Error('No se encontro service_role key en la respuesta');
  return sr.api_key;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

async function fetchTable(base, key, table) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${base}/rest/v1/${table}?select=*`, {
      headers: { ...headers, Range: `${from}-${from + PAGE - 1}`, Prefer: 'count=exact' },
    });
    if (!res.ok) throw new Error(`${table} -> ${res.status}: ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

const env = readEnv();
const base = env.VITE_SUPABASE_URL;
const key = await getServiceKey(env.SUPABASE_ACCESS_TOKEN);
const manifest = { project_ref: PROJECT_REF, exported_at: new Date().toISOString(), modules: {} };

for (const [mod, tables] of Object.entries(MODULES)) {
  mkdirSync(join(OUT, mod), { recursive: true });
  manifest.modules[mod] = {};
  for (const t of tables) {
    try {
      const rows = await fetchTable(base, key, t);
      writeFileSync(join(OUT, mod, `${t}.json`), JSON.stringify(rows, null, 0), 'utf8');
      writeFileSync(join(OUT, mod, `${t}.csv`), toCsv(rows), 'utf8');
      manifest.modules[mod][t] = { rows: rows.length };
      console.log(`OK   ${mod}/${t}: ${rows.length}`);
    } catch (e) {
      manifest.modules[mod][t] = { rows: null, error: String(e.message).slice(0, 300) };
      console.log(`FAIL ${mod}/${t}: ${String(e.message).slice(0, 200)}`);
    }
  }
}

const total = Object.values(manifest.modules).flatMap((m) => Object.values(m)).reduce((a, b) => a + (b.rows || 0), 0);
manifest.total_rows = total;
manifest.total_tables = Object.values(manifest.modules).reduce((a, m) => a + Object.keys(m).length, 0);
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\nTOTAL: ${manifest.total_tables} tablas, ${total} filas`);
