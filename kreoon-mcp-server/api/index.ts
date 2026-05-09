import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { handleScriptTool, scriptToolDefinitions } from '../src/tools/scripts.js';
import { handleADNTool, adnToolDefinitions } from '../src/tools/adn.js';
import { handleCreatorTool, creatorToolDefinitions } from '../src/tools/creators.js';
import { handleProfileTool, profileToolDefinitions } from '../src/tools/profiles.js';
import { handleWalletTool, walletToolDefinitions } from '../src/tools/wallet.js';
import { handleSocialTool, socialToolDefinitions } from '../src/tools/social.js';
import { handleOperationsTool, operationsToolDefinitions } from '../src/tools/operations.js';
import { handleCampaignsTool, campaignsToolDefinitions } from '../src/tools/campaigns.js';
import { handleProjectsTool, projectsToolDefinitions } from '../src/tools/projects.js';
import { handleOrgTool, orgToolDefinitions } from '../src/tools/org.js';
import type { AuthContext, AuthScope } from '../src/types.js';

// ─── CORS helper ────────────────────────────────────────────────────────────

function setCORS(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

// ─── Auth ────────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// In-memory rate limit (per Vercel function instance — stateless across deploys)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

async function authenticate(req: IncomingMessage, res: ServerResponse): Promise<AuthContext> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer sk-kreoon-')) {
    throw Object.assign(new Error('API key requerida. Formato: Bearer sk-kreoon-...'), { status: 401 });
  }

  const rawKey = auth.replace('Bearer ', '');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data, error } = await supabase
    .from('mcp_api_keys')
    .select('id, creator_id, organization_id, scopes, expires_at, is_revoked, rate_limit_per_hour')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) throw Object.assign(new Error('API key inválida'), { status: 401 });
  if (data.is_revoked) throw Object.assign(new Error('API key revocada'), { status: 401 });
  if (new Date(data.expires_at) < new Date()) throw Object.assign(new Error('API key expirada'), { status: 401 });

  // Rate limiting
  const now = Date.now();
  const entry = rateLimitStore.get(data.id);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(data.id, { count: 1, resetAt: now + 3_600_000 });
  } else if (entry.count >= data.rate_limit_per_hour) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    throw Object.assign(new Error(`Rate limit. Reintentar en ${retryAfter}s`), { status: 429 });
  } else {
    entry.count++;
  }

  // Update last_used_at async
  supabase.from('mcp_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {});

  return { key_id: data.id, org_id: data.organization_id, user_id: data.creator_id, scopes: data.scopes };
}

// ─── Tool scope map ──────────────────────────────────────────────────────────

const TOOL_SCOPES: Record<string, AuthScope> = {
  // Scripts
  generate_script: 'scripts:write',
  improve_script: 'scripts:write',
  // ADN
  start_adn_research: 'adn:write',
  get_adn_status: 'adn:read',
  // Creators
  search_creators: 'creators:read',
  score_creator_for_campaign: 'creators:read',
  // Profiles
  optimize_creator_profile: 'profiles:write',
  // Wallet
  get_wallet_overview: 'wallet:read',
  request_withdrawal: 'wallet:write',
  // Social
  publish_to_social: 'social:write',
  // Operations (content board)
  get_content_item: 'campaigns:read',
  approve_content_script: 'campaigns:write',
  record_content_delivery: 'campaigns:write',
  mark_content_payment: 'campaigns:write',
  create_content_item: 'campaigns:write',
  list_content_items: 'campaigns:read',
  assign_content_team: 'campaigns:write',
  update_content_status: 'campaigns:write',
  // Org management
  get_org_dashboard: 'campaigns:read',
  list_org_members: 'campaigns:read',
  list_clients: 'campaigns:read',
  create_client: 'campaigns:write',
  // Campaigns (marketplace)
  create_marketplace_campaign: 'campaigns:write',
  list_marketplace_campaigns: 'campaigns:read',
  manage_campaign_application: 'campaigns:write',
  // Projects (marketplace)
  create_marketplace_project: 'campaigns:write',
  list_marketplace_projects: 'campaigns:read',
  assign_editor_to_project: 'campaigns:write',
  update_project_status: 'campaigns:write',
};

const ALL_TOOL_DEFS = [
  ...scriptToolDefinitions,
  ...adnToolDefinitions,
  ...creatorToolDefinitions,
  ...profileToolDefinitions,
  ...walletToolDefinitions,
  ...socialToolDefinitions,
  ...operationsToolDefinitions,
  ...campaignsToolDefinitions,
  ...projectsToolDefinitions,
  ...orgToolDefinitions,
];

// ─── Dispatcher ──────────────────────────────────────────────────────────────

async function dispatchTool(name: string, args: Record<string, unknown>, auth: AuthContext) {
  const allDefs = ALL_TOOL_DEFS;

  if (!allDefs.some(t => t.name === name)) {
    throw Object.assign(new Error(`Tool desconocida: ${name}`), { status: 404 });
  }

  const scope = TOOL_SCOPES[name];
  if (scope && !auth.scopes.includes(scope)) {
    throw Object.assign(new Error(`Scope insuficiente. Se requiere: ${scope}`), { status: 403 });
  }

  if (scriptToolDefinitions.some(t => t.name === name))     return handleScriptTool(name, args, auth);
  if (adnToolDefinitions.some(t => t.name === name))        return handleADNTool(name, args, auth);
  if (creatorToolDefinitions.some(t => t.name === name))    return handleCreatorTool(name, args, auth);
  if (profileToolDefinitions.some(t => t.name === name))    return handleProfileTool(name, args, auth);
  if (walletToolDefinitions.some(t => t.name === name))     return handleWalletTool(name, args, auth);
  if (socialToolDefinitions.some(t => t.name === name))     return handleSocialTool(name, args, auth);
  if (operationsToolDefinitions.some(t => t.name === name)) return handleOperationsTool(name, args, auth);
  if (campaignsToolDefinitions.some(t => t.name === name))  return handleCampaignsTool(name, args, auth);
  if (projectsToolDefinitions.some(t => t.name === name))   return handleProjectsTool(name, args, auth);
  if (orgToolDefinitions.some(t => t.name === name))         return handleOrgTool(name, args, auth);
  throw Object.assign(new Error(`Tool no manejada: ${name}`), { status: 500 });
}

// ─── Audit logging ───────────────────────────────────────────────────────────

function audit(auth: AuthContext, action: string, status: number, ms: number, tokens = 0) {
  supabase.from('mcp_audit_logs').insert({
    key_id: auth.key_id, organization_id: auth.org_id,
    action, response_status: status, response_time_ms: ms,
    ai_tokens_used: tokens, created_at: new Date().toISOString(),
  }).then(() => {});
}

// ─── Body parser ─────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(Object.assign(new Error('JSON inválido en el body'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

// ─── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req: IncomingMessage, response: ServerResponse) {
  setCORS(response);

  if (req.method === 'OPTIONS') return json(response, 200, {});

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/\/$/, '');

  // GET /health (también acepta /api/index.ts como ruta raíz de Vercel)
  const isHealthPath = path === '/health' || path === '' || path === '/api/index.ts' || path === '/api';
  if (req.method === 'GET' && isHealthPath) {
    return json(response, 200, { status: 'ok', version: '3.0.0', tools: ALL_TOOL_DEFS.length });
  }

  // ── POST /mcp — MCP Streamable HTTP (protocolo nativo para Claude.ai web) ──
  if (req.method === 'POST' && path === '/mcp') {
    // Auth: header Authorization o query param ?key=
    const rawKey =
      (req.headers.authorization ?? '').replace('Bearer ', '') ||
      (url.searchParams.get('key') ?? '');

    if (!rawKey.startsWith('sk-kreoon-')) {
      return json(response, 401, { jsonrpc: '2.0', error: { code: -32600, message: 'API key requerida' }, id: null });
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const { data: keyData, error: keyErr } = await supabase
      .from('mcp_api_keys')
      .select('id, creator_id, organization_id, scopes, expires_at, is_revoked, rate_limit_per_hour')
      .eq('key_hash', keyHash)
      .single();

    if (keyErr || !keyData || keyData.is_revoked || new Date(keyData.expires_at) < new Date()) {
      return json(response, 401, { jsonrpc: '2.0', error: { code: -32600, message: 'API key inválida o expirada' }, id: null });
    }

    const auth: AuthContext = { key_id: keyData.id, org_id: keyData.organization_id, user_id: keyData.creator_id, scopes: keyData.scopes };
    const msg = await readBody(req) as { jsonrpc: string; method: string; params?: Record<string, unknown>; id: unknown };
    const { method, params, id } = msg;

    const rpc = (result: unknown) => json(response, 200, { jsonrpc: '2.0', result, id });
    const rpcErr = (code: number, message: string) => json(response, 200, { jsonrpc: '2.0', error: { code, message }, id });

    // initialize
    if (method === 'initialize') {
      return rpc({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'kreoon', version: '3.0.0' } });
    }
    // notifications/initialized (no respuesta requerida)
    if (method === 'notifications/initialized') {
      return json(response, 200, {});
    }
    // tools/list
    if (method === 'tools/list') {
      const available = ALL_TOOL_DEFS.filter(t => {
        const scope = TOOL_SCOPES[t.name];
        return !scope || auth.scopes.includes(scope as AuthScope);
      });
      return rpc({ tools: available });
    }
    // tools/call
    if (method === 'tools/call') {
      const toolName = (params?.name ?? '') as string;
      const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const t0 = Date.now();
        const result = await dispatchTool(toolName, toolArgs, auth);
        audit(auth, toolName, result?.success ? 200 : 400, Date.now() - t0, result?.tokens_used ?? 0);
        return rpc({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (e) {
        const msg2 = e instanceof Error ? e.message : String(e);
        return rpc({ content: [{ type: 'text', text: `Error: ${msg2}` }], isError: true });
      }
    }

    return rpcErr(-32601, `Método no soportado: ${method}`);
  }

  try {
    const auth = await authenticate(req, response);

    // GET /v1/tools — lista de tools disponibles para este key
    if (req.method === 'GET' && path === '/v1/tools') {
      const available = ALL_TOOL_DEFS.filter(t => {
        const scope = TOOL_SCOPES[t.name];
        return !scope || auth.scopes.includes(scope);
      });
      return json(response, 200, { tools: available, total: available.length });
    }

    // POST /v1/tools/{name}
    const toolMatch = path.match(/^\/v1\/tools\/(.+)$/);
    if (req.method === 'POST' && toolMatch) {
      const toolName = toolMatch[1];
      const t0 = Date.now();
      const body = await readBody(req);
      const result = await dispatchTool(toolName, body, auth);
      const ms = Date.now() - t0;
      audit(auth, toolName, result?.success ? 200 : 400, ms, result?.tokens_used ?? 0);
      return json(response, result?.success ? 200 : 400, result);
    }

    return json(response, 404, { error: 'Ruta no encontrada', hint: 'POST /v1/tools/{tool_name}' });

  } catch (err) {
    const e = err as Error & { status?: number };
    const status = e.status ?? 500;
    return json(response, status, { error: e.message, code: status });
  }
}
