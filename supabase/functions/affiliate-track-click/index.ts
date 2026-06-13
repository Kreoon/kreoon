// ============================================================================
// AFFILIATE TRACK CLICK
// Endpoint público para registrar un click en un link de afiliado.
// Hace lo que el cliente NO debe hacer:
//  - Valida que Origin/Referer sean dominios KREOON conocidos.
//  - Hashea la IP del visitante con SHA-256 antes de pasarla al RPC.
//  - Llama track_affiliate_click() con service_role.
//  - La dedup por (link_id, ip_hash, día) la hace el RPC.
// ============================================================================

const ALLOWED_HOSTS = new Set([
  'localhost', '127.0.0.1',
  'kreoon.com', 'www.kreoon.com',
]);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const IP_HASH_SALT = Deno.env.get('IP_HASH_SALT') ?? '';

if (!SUPABASE_URL) throw new Error('SUPABASE_URL required');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY required');
if (!IP_HASH_SALT || IP_HASH_SALT.length < 16) {
  throw new Error('IP_HASH_SALT must be at least 16 chars');
}

function checkOrigin(req: Request): boolean {
  const candidates = [req.headers.get('Origin'), req.headers.get('Referer')];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (ALLOWED_HOSTS.has(host)) return true;
    } catch { /* ignore */ }
  }
  return false;
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });
  }

  if (!checkOrigin(req)) {
    return new Response(JSON.stringify({ error: 'invalid_origin' }), { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'bad_body' }), { status: 400 }); }
  const code = String(body?.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  const spaceId = String(body?.space_id ?? '');
  if (!code || !/^[0-9a-f-]{36}$/i.test(spaceId)) {
    return new Response(JSON.stringify({ error: 'bad_input' }), { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('cf-connecting-ip')
    ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? '';
  const ipHash = await sha256(`${IP_HASH_SALT}:${ip}`);
  const uaHash = ua ? await sha256(`${IP_HASH_SALT}:${ua}`) : null;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/track_affiliate_click`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_code: code,
      p_space_id: spaceId,
      p_ip_hash: ipHash,
      p_user_agent_hash: uaHash,
    }),
  });
  const ok = res.ok;
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
