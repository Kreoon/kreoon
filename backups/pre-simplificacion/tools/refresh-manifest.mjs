// Reconstruye manifest.json leyendo los archivos ya escritos en disco.
// Uso: node backups/pre-simplificacion/tools/refresh-manifest.mjs
// Cuenta filas reales por archivo .json y marca la vía de export usada.

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = ['live-streaming', 'social-feed', 'up-reputacion', 'marketplace-campanas', 'booking'];
// Tablas sin GRANT para service_role: se exportaron por MCP (rol postgres), no por PostgREST.
const VIA_MCP = new Set([
  'hashtags', 'post_hashtags', 'profile_views', 'saved_searches', 'reputation_configs', 'reputation_global',
  'role_multipliers', 'role_points_config', 'role_weight_config', 'season_goals', 'season_reward_claims',
  'season_rewards', 'up_arbiter_log', 'up_chronometer_pauses', 'up_client_trust_scores', 'up_creadores',
  'up_creadores_totals', 'up_editores', 'up_editores_totals', 'up_user_scores', 'campaign_deliverables',
  'campaign_invitations', 'campaign_media', 'campaign_notifications', 'activation_publications',
  'publication_verification_queue', 'managed_campaign_subscriptions', 'creator_availability',
]);

const manifest = {
  project_ref: 'wjkbqcrxwsmvtxmqgiqc',
  refreshed_at: new Date().toISOString(),
  modules: {},
};
let totalRows = 0;
let totalTables = 0;
let totalBytes = 0;

for (const mod of MODULES) {
  manifest.modules[mod] = {};
  for (const f of readdirSync(join(ROOT, mod)).filter((f) => f.endsWith('.json')).sort()) {
    const table = f.replace(/\.json$/, '');
    const path = join(ROOT, mod, f);
    const rows = JSON.parse(readFileSync(path, 'utf8')).length;
    const bytes = statSync(path).size + statSync(join(ROOT, mod, `${table}.csv`)).size;
    manifest.modules[mod][table] = { rows, bytes, via: VIA_MCP.has(table) ? 'mcp-postgres' : 'postgrest-service-role' };
    totalRows += rows;
    totalBytes += bytes;
    totalTables++;
  }
}

manifest.total_tables = totalTables;
manifest.total_rows = totalRows;
manifest.total_bytes = totalBytes;
writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(`${totalTables} tablas · ${totalRows} filas · ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
