import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { resolveGroup, GROUP_SCOPES, GROUP_RATE_LIMIT, isToolAllowedForGroup } from '../src/permissions.js';
import { handleScriptTool, scriptToolDefinitions } from '../src/tools/scripts.js';
import { handleCreatorTool, creatorToolDefinitions } from '../src/tools/creators.js';
import { handleProfileTool, profileToolDefinitions } from '../src/tools/profiles.js';
import { handlePortfolioTool, portfolioToolDefinitions } from '../src/tools/portfolio.js';
import { handleSocialTool, socialToolDefinitions } from '../src/tools/social.js';
import { handleOperationsTool, operationsToolDefinitions } from '../src/tools/operations.js';
import { handleCampaignsTool, campaignsToolDefinitions } from '../src/tools/campaigns.js';
import { handleProjectsTool, projectsToolDefinitions } from '../src/tools/projects.js';
import { handleOrgTool, orgToolDefinitions } from '../src/tools/org.js';
import { handleContentGenerationTool, contentGenerationToolDefinitions } from '../src/tools/content-generation.js';
import { handleProductDnaTool, productDnaToolDefinitions } from '../src/tools/product-dna.js';
import type { AuthContext, AuthScope } from '../src/types.js';

// ─── Instrucciones globales del MCP para el LLM cliente ──────────────────────
// Estas instrucciones se envían en el initialize del protocolo MCP.
// El LLM cliente DEBE seguirlas siempre que opere contra este servidor.

const MCP_INSTRUCTIONS = `Este es el MCP de KREOON: la plataforma para gestionar contenido UGC, marcas, productos, creadores y campañas.

🎯 CÓMO USARME EN LENGUAJE NATURAL

Cuando el usuario te diga cosas como…
- "Hazme un guion para X marca" → usa generate_content_block con block_type=script
- "Genera la dirección/B-roll/captions/marketing del item Y" → generate_content_block con block_type=director|broll|captions|marketing
- "Crea un item de contenido para venta directa" → create_content_item primero, luego generate_content_block
- "Muéstrame los guiones de la marca X" → list_clients (para el id) + list_content_items (filtra por product_id si lo tienen)
- "Cambia esta frase del guion" → get_content_item + update_content_item (edición quirúrgica del campo script)
- "Genera el ADN de la marca" → generate_brand_dna · "Consúltame el ADN" → get_brand_dna
- "Genera el ADN del producto" → generate_product_dna_v1 · "Consúltame el estado" → get_product_dna_status
- "Lista las marcas/productos/clientes" → list_clients · list_products
- "Asígnale un creador/editor a este contenido" → assign_content_team
- "Aprueba el guion / Pídele cambios" → approve_content_script

⚠️ REGLA DE ORO — NUNCA INVENTAR

Si el usuario pide algo y NO está claro:
- Qué cliente/marca específico (cuando hay varios)
- Qué producto (si el cliente tiene más de uno)
- Qué item específico de contenido
- Qué tipo de bloque generar (script / director / broll / captions / marketing)
- Qué plataforma de destino (instagram_reels / tiktok / youtube_shorts)
- Qué etapa del funnel (tofu / mofu / bofu)
- Datos del producto (componentes, ingredientes, precios, garantías)
- Posicionamiento o ángulos específicos

→ PREGUNTAR PRIMERO. No deducir. No asumir. No inventar datos del producto.
→ Si necesitas un UUID, llama list_clients / list_products / list_content_items para obtenerlo. NO inventes IDs.

📝 REGLAS DE EDICIÓN DE GUIONES

- Si el usuario dice "ajusta esta frase" o "cambia X por Y" → edición quirúrgica con update_content_item, NO regenerar.
- Si el usuario dice "rediseña" o "regenera con otro estilo" → generate_content_block (reemplaza el campo completo).
- Si modificás contenido (script, director_output, broll_output, captions, marketing_output), conservá lo demás idéntico.
- Para guiones realistas: hablar humano = ~150 palabras/minuto = ~2.5 palabras/segundo. Un Reel de 30s tiene MAX ~75 palabras de diálogo.

🔒 SCOPES Y AUTORIZACIÓN

Cada API key tiene scopes específicos (campaigns:read, campaigns:write, scripts:write, etc.). Si recibes un error 403 "scope insuficiente", explícalo al usuario, no intentes otra tool.

🧠 SKILLS INTERNAS DE KREOON

Las tools generate_script, generate_content_block, generate_brand_dna y generate_product_dna_v1 disparan las skills de IA internas de KREOON (Edge Functions con prompts blindados, método CAST, formato HTML estructurado). El parámetro additional_instructions del LLM cliente se AÑADE al prompt base, no lo reemplaza.

📦 OUTPUT TÍPICO

Los outputs de generate_content_block son HTML estructurado (no markdown) listo para renderizar en la app KREOON. Si content_id está presente, el bloque se guarda automáticamente en la columna correcta (script, director_output, broll_output, captions, marketing_output).`;

// ─── OAuth authorize page HTML ───────────────────────────────────────────────

// Escapa valores antes de interpolarlos en atributos/HTML — redirect_uri, state,
// client_id y code_challenge vienen de query params / form body controlados por
// quien inicia el flujo OAuth (potencialmente un atacante), no son valores server-side.
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function authorizeHtml(
  redirectUri: string,
  state: string,
  clientId: string,
  codeChallenge: string,
  codeChallengeMethod: string,
  error?: string
) {
  redirectUri = escHtml(redirectUri);
  state = escHtml(state);
  clientId = escHtml(clientId);
  codeChallenge = escHtml(codeChallenge);
  codeChallengeMethod = escHtml(codeChallengeMethod);
  const errorBlock = error
    ? `<p class="error">${escHtml(error)}</p>`
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
      <input type="hidden" name="client_id" value="${clientId}"/>
      <input type="hidden" name="code_challenge" value="${codeChallenge}"/>
      <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}"/>
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

// ─── Validación de /oauth/authorize ─────────────────────────────────────────
// Cierra dos huecos: (1) redirect_uri no se validaba contra lo registrado
// para el client_id — cualquiera podía armar un link a este dominio legítimo
// con redirect_uri=https://evil.com, la víctima entraba su API key real
// pensando que hablaba con Kreoon, y el code terminaba en el sitio atacante
// (authorization code interception). (2) PKCE era opcional — un cliente
// atacante podía simplemente omitir code_challenge y saltarse esa defensa.
// Ahora client_id + redirect_uri exacto contra lo registrado en DCR, y PKCE
// (S256) son OBLIGATORIOS para emitir un code.
async function validateAuthorizeRequest(
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  codeChallengeMethod: string
): Promise<string | null> {
  if (!clientId) return 'client_id requerido. Registra tu cliente vía POST /oauth/register primero.';
  if (!redirectUri) return 'redirect_uri requerido.';
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    return 'PKCE requerido: code_challenge y code_challenge_method=S256 son obligatorios.';
  }

  const { data: client, error } = await supabase
    .from('mcp_oauth_clients')
    .select('redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error || !client) return 'client_id no registrado.';
  if (!client.redirect_uris.includes(redirectUri)) {
    return 'redirect_uri no coincide con ninguno registrado para este client_id.';
  }

  return null;
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

// Wrapper para promesas "fire and forget" (audit log, last_used_at) — evita
// que un fallo silencioso quede como unhandled rejection sin traza.
function fireAndForget(p: PromiseLike<{ error: unknown } | unknown>, label: string) {
  Promise.resolve(p).catch(e => console.error(`[fire-and-forget:${label}]`, e));
}

/**
 * Resuelve la key + el rol REAL del usuario en la organización, en cada request.
 * A diferencia del modelo anterior (scopes congelados al crear la key), esto
 * cierra dos gaps: (1) si al usuario le bajan el rol o lo sacan de la org, la
 * key deja de tener esos permisos en la siguiente llamada, no cuando alguien
 * la revoque a mano; (2) los scopes/rate-limit salen del rol actual, no de un
 * valor elegido a mano al momento de generar la key.
 */
async function resolveAuthContext(rawKey: string): Promise<AuthContext> {
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data, error } = await supabase
    .from('mcp_api_keys')
    .select('id, creator_id, organization_id, expires_at, is_revoked')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) throw Object.assign(new Error('API key inválida'), { status: 401 });
  if (data.is_revoked) throw Object.assign(new Error('API key revocada'), { status: 401 });
  if (new Date(data.expires_at) < new Date()) throw Object.assign(new Error('API key expirada'), { status: 401 });

  const { data: membership, error: memErr } = await supabase
    .from('organization_members')
    .select('role, is_owner')
    .eq('user_id', data.creator_id)
    .eq('organization_id', data.organization_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (memErr || !membership) {
    throw Object.assign(new Error('Ya no perteneces a esta organización. La key fue invalidada.'), { status: 401 });
  }

  const group = resolveGroup(membership.role, membership.is_owner === true);
  const scopes = GROUP_SCOPES[group];
  const rateLimitPerHour = GROUP_RATE_LIMIT[group];

  const { data: rl, error: rlErr } = await supabase.rpc('mcp_check_rate_limit', {
    p_key_id: data.id,
    p_limit_per_hour: rateLimitPerHour,
  }).single<{ allowed: boolean; retry_after_seconds: number }>();

  if (rlErr) throw Object.assign(new Error(`Rate limit check falló: ${rlErr.message}`), { status: 500 });
  if (!rl?.allowed) {
    throw Object.assign(new Error(`Rate limit. Reintentar en ${rl?.retry_after_seconds ?? 3600}s`), {
      status: 429,
      retryAfter: rl?.retry_after_seconds ?? 3600,
    });
  }

  fireAndForget(
    supabase.from('mcp_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id),
    'last_used_at'
  );

  return { key_id: data.id, org_id: data.organization_id, user_id: data.creator_id, scopes, group };
}

async function authenticate(req: IncomingMessage, res: ServerResponse): Promise<AuthContext> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer sk-kreoon-')) {
    throw Object.assign(new Error('API key requerida. Formato: Bearer sk-kreoon-...'), { status: 401 });
  }
  try {
    return await resolveAuthContext(auth.replace('Bearer ', ''));
  } catch (e) {
    const err = e as Error & { status?: number; retryAfter?: number };
    if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
    throw err;
  }
}

// ─── Tool scope map ──────────────────────────────────────────────────────────

const TOOL_SCOPES: Record<string, AuthScope> = {
  // Scripts
  generate_script: 'scripts:write',
  improve_script: 'scripts:write',
  // Creators
  search_creators: 'creators:read',
  score_creator_for_campaign: 'creators:read',
  // Profiles
  optimize_creator_profile: 'profiles:write',
  // Portfolio del marketplace (talento + admin)
  get_my_portfolio: 'profiles:write',
  generate_portfolio: 'profiles:write',
  update_portfolio_block: 'profiles:write',
  publish_portfolio: 'profiles:write',
  add_portfolio_item: 'profiles:write',
  list_portfolio_items: 'profiles:write',
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
  // ADN de marca (client DNA)
  generate_brand_dna: 'campaigns:write',
  get_brand_dna:      'campaigns:read',
  // ADN de producto V1
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
  ...creatorToolDefinitions,
  ...profileToolDefinitions,
  ...portfolioToolDefinitions,
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

  if (!isToolAllowedForGroup(name, auth.group)) {
    throw Object.assign(
      new Error(`Tu rol (${auth.group}) no tiene permiso para usar "${name}".`),
      { status: 403 }
    );
  }

  if (scriptToolDefinitions.some(t => t.name === name))     return handleScriptTool(name, args, auth);
  if (creatorToolDefinitions.some(t => t.name === name))    return handleCreatorTool(name, args, auth);
  if (profileToolDefinitions.some(t => t.name === name))    return handleProfileTool(name, args, auth);
  if (portfolioToolDefinitions.some(t => t.name === name))  return handlePortfolioTool(name, args, auth);
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
  fireAndForget(
    supabase.from('mcp_audit_logs').insert({
      key_id: auth.key_id, organization_id: auth.org_id,
      action, response_status: status, response_time_ms: ms,
      ai_tokens_used: tokens, created_at: new Date().toISOString(),
    }),
    'audit_log'
  );
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
    return json(response, 200, { status: 'ok', version: '3.2.0', tools: ALL_TOOL_DEFS.length });
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
      registration_endpoint: `${base}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
    });
  }

  // POST /oauth/register — Dynamic Client Registration (RFC 7591).
  // Sin esto, claude.ai no puede auto-registrar el conector y pide un
  // Client ID a mano. El server no valida client_secret (cliente público):
  // solo guarda el registro para trazabilidad.
  if (req.method === 'POST' && path === '/oauth/register') {
    const body = await readBody(req).catch(() => ({} as Record<string, unknown>));
    const clientName   = (body.client_name as string | undefined) ?? 'Cliente MCP';
    const redirectUris = Array.isArray(body.redirect_uris) ? (body.redirect_uris as string[]) : [];
    const clientId = `client_${crypto.randomUUID()}`;

    const { error } = await supabase
      .from('mcp_oauth_clients')
      .insert({ client_id: clientId, client_name: clientName, redirect_uris: redirectUris });
    if (error) return json(response, 500, { error: 'server_error', error_description: error.message });

    return json(response, 201, {
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
    });
  }

  // GET /oauth/authorize — mostrar formulario HTML
  if (req.method === 'GET' && path === '/oauth/authorize') {
    const redirectUri          = url.searchParams.get('redirect_uri') ?? '';
    const state                = url.searchParams.get('state') ?? '';
    const clientId              = url.searchParams.get('client_id') ?? '';
    const codeChallenge        = url.searchParams.get('code_challenge') ?? '';
    const codeChallengeMethodRaw = url.searchParams.get('code_challenge_method') ?? '';

    const validationError = await validateAuthorizeRequest(clientId, redirectUri, codeChallenge, codeChallengeMethodRaw);
    if (validationError) {
      return json(response, 400, { error: 'invalid_request', error_description: validationError });
    }

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.statusCode = 200;
    response.end(authorizeHtml(redirectUri, state, clientId, codeChallenge, codeChallengeMethodRaw));
    return;
  }

  // POST /oauth/authorize — validar key, emitir code de un solo uso y redirigir
  if (req.method === 'POST' && path === '/oauth/authorize') {
    const form = await readFormBody(req);
    const { api_key, redirect_uri, state, client_id, code_challenge, code_challenge_method } = form;

    const showError = (msg: string) => {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.statusCode = 200;
      response.end(authorizeHtml(
        redirect_uri ?? '', state ?? '', client_id ?? '',
        code_challenge ?? '', code_challenge_method ?? '', msg
      ));
    };

    const validationError = await validateAuthorizeRequest(
      client_id ?? '', redirect_uri ?? '', code_challenge ?? '', code_challenge_method ?? ''
    );
    if (validationError) return showError(validationError);

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

    // El code es un valor opaco de un solo uso — la api_key nunca viaja en la URL.
    const code = crypto.randomBytes(32).toString('base64url');
    const { error: codeErr } = await supabase.from('mcp_oauth_codes').insert({
      code, raw_key: api_key,
      client_id: client_id || null,
      code_challenge: code_challenge || null,
      code_challenge_method: code_challenge_method || null,
    });
    if (codeErr) return showError(`Error generando code: ${codeErr.message}`);

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);
    response.setHeader('Location', redirectUrl.toString());
    response.statusCode = 302;
    response.end();
    return;
  }

  // POST /oauth/token — canjear code de un solo uso por access_token (con verificación PKCE)
  if (req.method === 'POST' && path === '/oauth/token') {
    const contentType = (req.headers['content-type'] ?? '');
    let code: string;
    let codeVerifier: string | undefined;

    if (contentType.includes('application/json')) {
      const body = await readBody(req);
      code = (body.code as string) ?? '';
      codeVerifier = body.code_verifier as string | undefined;
    } else {
      const form = await readFormBody(req);
      code = form.code ?? '';
      codeVerifier = form.code_verifier;
    }

    if (!code) {
      return json(response, 400, { error: 'invalid_grant', error_description: 'Code requerido' });
    }

    const { data: codeRow, error: codeErr } = await supabase
      .from('mcp_oauth_codes')
      .select('raw_key, expires_at, used_at, code_challenge, code_challenge_method')
      .eq('code', code)
      .single();

    if (codeErr || !codeRow || codeRow.used_at || new Date(codeRow.expires_at) < new Date()) {
      return json(response, 400, { error: 'invalid_grant', error_description: 'Code inválido, usado o expirado' });
    }

    // PKCE es obligatorio (validado también al emitir el code en /oauth/authorize) —
    // sin este chequeo, un atacante que intercepte el code podría canjearlo sin
    // conocer el code_verifier original.
    if (!codeRow.code_challenge || !codeVerifier) {
      return json(response, 400, { error: 'invalid_grant', error_description: 'code_verifier requerido (PKCE)' });
    }
    const computed = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    if (computed !== codeRow.code_challenge) {
      return json(response, 400, { error: 'invalid_grant', error_description: 'code_verifier inválido' });
    }

    // Marcar el code como usado (un solo canje posible)
    await supabase.from('mcp_oauth_codes').update({ used_at: new Date().toISOString() }).eq('code', code);

    const rawKey = codeRow.raw_key as string;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const { data: keyData, error: keyErr } = await supabase
      .from('mcp_api_keys')
      .select('id, is_revoked, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (keyErr || !keyData || keyData.is_revoked || new Date(keyData.expires_at) < new Date()) {
      return json(response, 400, { error: 'invalid_grant', error_description: 'API key inválida o expirada' });
    }

    return json(response, 200, {
      access_token: rawKey,
      token_type: 'bearer',
      expires_in: 31_536_000, // 1 año
    });
  }

  // ── POST /mcp (o raíz) — MCP Streamable HTTP (protocolo nativo para Claude.ai web) ──
  // La raíz también responde este protocolo porque el conector de Claude.ai
  // postea el handshake JSON-RPC exactamente a la URL que el usuario pega en
  // "Agregar conector personalizado" (https://mcp.kreoon.com, sin /mcp). Antes
  // esa ruta solo servía REST (/v1/tools), con forma de respuesta distinta a
  // JSON-RPC — el cliente de Claude.ai lo interpretaba como "no es un servidor
  // MCP válido" y fallaba la conexión antes de siquiera llegar a OAuth.
  if (req.method === 'POST' && (path === '/mcp' || path === '')) {
    // Auth: header Authorization o query param ?key=
    const rawKey =
      (req.headers.authorization ?? '').replace('Bearer ', '') ||
      (url.searchParams.get('key') ?? '');

    if (!rawKey.startsWith('sk-kreoon-')) {
      return json(response, 401, { jsonrpc: '2.0', error: { code: -32600, message: 'API key requerida' }, id: null });
    }

    let auth: AuthContext;
    try {
      auth = await resolveAuthContext(rawKey);
    } catch (e) {
      const err = e as Error & { status?: number; retryAfter?: number };
      if (err.retryAfter) response.setHeader('Retry-After', String(err.retryAfter));
      return json(response, err.status ?? 401, { jsonrpc: '2.0', error: { code: -32600, message: err.message }, id: null });
    }

    const msg = await readBody(req) as { jsonrpc: string; method: string; params?: Record<string, unknown>; id: unknown };
    const { method, params, id } = msg;

    const rpc = (result: unknown) => json(response, 200, { jsonrpc: '2.0', result, id });
    const rpcErr = (code: number, message: string) => json(response, 200, { jsonrpc: '2.0', error: { code, message }, id });

    // initialize
    if (method === 'initialize') {
      return rpc({
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'kreoon', version: '3.2.0' },
        instructions: MCP_INSTRUCTIONS,
      });
    }
    // notifications/initialized (no respuesta requerida)
    if (method === 'notifications/initialized') {
      return json(response, 200, {});
    }
    // tools/list
    if (method === 'tools/list') {
      const available = ALL_TOOL_DEFS.filter(t => {
        const scope = TOOL_SCOPES[t.name];
        const scopeOk = !scope || auth.scopes.includes(scope as AuthScope);
        return scopeOk && isToolAllowedForGroup(t.name, auth.group);
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
        const scopeOk = !scope || auth.scopes.includes(scope);
        return scopeOk && isToolAllowedForGroup(t.name, auth.group);
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
