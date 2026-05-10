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
import { handleContentGenerationTool, contentGenerationToolDefinitions } from '../src/tools/content-generation.js';
import { handleProductDnaTool, productDnaToolDefinitions } from '../src/tools/product-dna.js';
import type { AuthContext, AuthScope } from '../src/types.js';

// ─── OAuth authorize page HTML ───────────────────────────────────────────────

function authorizeHtml(redirectUri: string, state: string, error?: string) {
  const errorBlock = error
    ? `<p class="error">${error}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Kreoon — Conectar con Claude</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .card{background:#13131a;border:1px solid #2a2a3a;border-radius:16px;padding:40px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
    .logo{font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;margin-bottom:8px}
    .logo span{color:#a855f7}
    .sub{color:#6b6b80;font-size:14px;margin-bottom:32px}
    label{display:block;font-size:13px;color:#9090a8;margin-bottom:8px}
    input{width:100%;padding:12px 16px;background:#1e1e2e;border:1px solid #2a2a3a;border-radius:10px;color:#fff;font-size:14px;font-family:monospace;outline:none;transition:border .2s}
    input:focus{border-color:#a855f7}
    button{width:100%;margin-top:20px;padding:13px;background:linear-gradient(135deg,#a855f7,#7c3aed);border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:opacity .2s}
    button:hover{opacity:.9}
    .error{color:#f87171;font-size:13px;margin-top:16px;text-align:center}
    .hint{color:#4a4a5a;font-size:12px;margin-top:16px;text-align:center}
    .hint a{color:#a855f7;text-decoration:none}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">KREOON <span>MCP</span></div>
    <p class="sub">Conecta Claude con tu cuenta de Kreoon</p>
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="redirect_uri" value="${redirectUri}"/>
      <input type="hidden" name="state" value="${state}"/>
      <label>Tu API Key de Kreoon</label>
      <input type="password" name="api_key" placeholder="sk-kreoon-..." autocomplete="off" required/>
      ${errorBlock}
      <button type="submit">Conectar</button>
      <p class="hint">Genera tu key en <a href="https://app.kreoon.com/settings" target="_blank">Settings → MCP</a></p>
    </form>
  </div>
</body>
</html>`;
}

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
  update_content_item: 'campaigns:write',
  list_content_items: 'campaigns:read',
  assign_content_team: 'campaigns:write',
  update_content_status: 'campaigns:write',
  // Content generation with KREOON Skills
  generate_content_block: 'campaigns:write',
  // Product DNA V1
  generate_product_dna_v1: 'campaigns:write',
  get_product_dna_status:  'campaigns:read',
  // Org management
  get_org_dashboard: 'campaigns:read',
  list_org_members:  'campaigns:read',
  list_clients:      'campaigns:read',
  create_client:     'campaigns:write',
  create_product:    'campaigns:write',
  list_products:     'campaigns:read',
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
  ...contentGenerationToolDefinitions,
  ...productDnaToolDefinitions,
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
  if (operationsToolDefinitions.some(t => t.name === name))          return handleOperationsTool(name, args, auth);
  if (contentGenerationToolDefinitions.some(t => t.name === name))   return handleContentGenerationTool(name, args, auth);
  if (productDnaToolDefinitions.some(t => t.name === name))          return handleProductDnaTool(name, args, auth);
  if (campaignsToolDefinitions.some(t => t.name === name))           return handleCampaignsTool(name, args, auth);
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

// ─── Body parsers ────────────────────────────────────────────────────────────

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

function readFormBody(req: IncomingMessage): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const params = new URLSearchParams(body);
        const result: Record<string, string> = {};
        params.forEach((v, k) => { result[k] = v; });
        resolve(result);
      } catch { reject(Object.assign(new Error('Form data inválido'), { status: 400 })); }
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

  // ── OAuth 2.0 — para Claude.ai web connector ─────────────────────────────

  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
  const host  = req.headers.host ?? 'mcp.kreoon.com';
  const base  = `${proto}://${host}`;

  // GET /.well-known/oauth-authorization-server — metadatos OAuth
  if (req.method === 'GET' && path === '/.well-known/oauth-authorization-server') {
    return json(response, 200, {
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: [],
    });
  }

  // GET /oauth/authorize — mostrar formulario HTML
  if (req.method === 'GET' && path === '/oauth/authorize') {
    const redirectUri = url.searchParams.get('redirect_uri') ?? '';
    const state       = url.searchParams.get('state') ?? '';
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.statusCode = 200;
    response.end(authorizeHtml(redirectUri, state));
    return;
  }

  // POST /oauth/authorize — validar key, redirigir con code
  if (req.method === 'POST' && path === '/oauth/authorize') {
    const form = await readFormBody(req);
    const { api_key, redirect_uri, state } = form;

    const showError = (msg: string) => {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.statusCode = 200;
      response.end(authorizeHtml(redirect_uri ?? '', state ?? '', msg));
    };

    if (!api_key?.startsWith('sk-kreoon-')) {
      return showError('API key inválida. Debe comenzar con sk-kreoon-');
    }

    const keyHash = crypto.createHash('sha256').update(api_key).digest('hex');
    const { data, error } = await supabase
      .from('mcp_api_keys')
      .select('id, is_revoked, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (error || !data || data.is_revoked || new Date(data.expires_at) < new Date()) {
      return showError('API key no encontrada o expirada');
    }

    // El code ES la api_key — redirigir de vuelta a Claude.ai
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', api_key);
    if (state) redirectUrl.searchParams.set('state', state);
    response.setHeader('Location', redirectUrl.toString());
    response.statusCode = 302;
    response.end();
    return;
  }

  // POST /oauth/token — intercambiar code por access_token
  if (req.method === 'POST' && path === '/oauth/token') {
    const contentType = (req.headers['content-type'] ?? '');
    let code: string;

    if (contentType.includes('application/json')) {
      const body = await readBody(req);
      code = (body.code as string) ?? '';
    } else {
      const form = await readFormBody(req);
      code = form.code ?? '';
    }

    if (!code.startsWith('sk-kreoon-')) {
      return json(response, 400, { error: 'invalid_grant', error_description: 'Code inválido' });
    }

    const keyHash = crypto.createHash('sha256').update(code).digest('hex');
    const { data, error } = await supabase
      .from('mcp_api_keys')
      .select('id, is_revoked, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (error || !data || data.is_revoked || new Date(data.expires_at) < new Date()) {
      return json(response, 400, { error: 'invalid_grant', error_description: 'API key inválida o expirada' });
    }

    return json(response, 200, {
      access_token: code,
      token_type: 'bearer',
      expires_in: 31_536_000, // 1 año
    });
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
