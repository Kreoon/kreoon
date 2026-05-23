import type { VideoMetadata, KreoonProject, KreoonProduct, KreoonNotification, AuthSession } from './types'
import type { ViralAnalysis, ProductContext } from './gemini-api'

const SUPABASE_URL = 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err}`)
  }
  return res.json()
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthSession> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error_description || err.message || 'Error de autenticación')
  }
  const data = await res.json()

  // Step 1: get organization_id (simple query, no join)
  let organizationId: string | undefined
  let organizationName: string | undefined
  try {
    const membersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/organization_members?user_id=eq.${data.user.id}&select=organization_id&limit=1`,
      { headers: { 'Authorization': `Bearer ${data.access_token}`, 'apikey': SUPABASE_ANON_KEY } }
    )
    const members = await membersRes.json()
    organizationId = members?.[0]?.organization_id

    // Step 2: get org name separately
    if (organizationId) {
      const orgRes = await fetch(
        `${SUPABASE_URL}/rest/v1/organizations?id=eq.${organizationId}&select=name&limit=1`,
        { headers: { 'Authorization': `Bearer ${data.access_token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      const orgs = await orgRes.json()
      organizationName = orgs?.[0]?.name
    }
  } catch (e) {
    console.warn('[Kreoon] Could not fetch org:', e)
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: { id: data.user.id, email: data.user.email },
    organizationId,
    organizationName,
    expiresAt: Date.now() + (data.expires_in * 1000),
  }
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error('Sesión expirada')
  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: { id: data.user.id, email: data.user.email },
    expiresAt: Date.now() + (data.expires_in * 1000),
  }
}

export async function getProjects(token: string, orgId: string): Promise<KreoonProject[]> {
  const data = await apiFetch<any[]>(
    `/rest/v1/marketplace_projects?organization_id=eq.${orgId}&select=id,title,status&order=created_at.desc&limit=20`,
    token
  )
  return data.map(p => ({
    id: p.id,
    title: p.title,
    status: p.status,
  }))
}

export async function getProductDetails(token: string, productId: string): Promise<ProductContext | null> {
  try {
    const rows = await apiFetch<any[]>(
      `/rest/v1/products?id=eq.${productId}&select=id,name,client_id,description,strategy,ideal_avatar,sales_angles,clients(name)&limit=1`,
      token
    )
    const p = rows?.[0]
    if (!p) return null
    return {
      id: p.id,
      name: p.name,
      client_id: p.client_id,
      client_name: p.clients?.name,
      description: p.description,
      strategy: p.strategy,
      ideal_avatar: p.ideal_avatar,
      sales_angles: p.sales_angles,
    }
  } catch {
    return null
  }
}

export async function getProducts(token: string, orgId: string): Promise<KreoonProduct[]> {
  // Step 1: get client IDs for this org
  const clients = await apiFetch<Array<{ id: string; name: string }>>(
    `/rest/v1/clients?organization_id=eq.${orgId}&select=id,name&order=name.asc`,
    token
  )
  if (!clients.length) return []

  const clientIds = clients.map(c => c.id).join(',')
  const clientMap = new Map(clients.map(c => [c.id, c.name]))

  // Step 2: get products for those clients
  const products = await apiFetch<Array<{ id: string; name: string; client_id: string }>>(
    `/rest/v1/products?client_id=in.(${clientIds})&select=id,name,client_id&order=name.asc&limit=200`,
    token
  )
  return products.map(p => ({
    id: p.id,
    name: p.name,
    client_id: p.client_id,
    client_name: clientMap.get(p.client_id),
  }))
}

export async function fetchOrganizationId(token: string, userId: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/organization_members?user_id=eq.${userId}&select=organization_id&limit=1`,
      { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
    )
    const text = await res.text()
    console.log('[Kreoon] org query →', res.status, text.substring(0, 300))
    if (!res.ok) return undefined
    const data = JSON.parse(text)
    const orgId = Array.isArray(data) ? data[0]?.organization_id : undefined
    console.log('[Kreoon] orgId found:', orgId)

    // Also try org name
    if (orgId) {
      try {
        const nameRes = await fetch(
          `${SUPABASE_URL}/rest/v1/organizations?id=eq.${orgId}&select=name&limit=1`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        const nameData = await nameRes.json()
        const name = Array.isArray(nameData) ? nameData[0]?.name : undefined
        return orgId ? `${orgId}||${name || ''}` : undefined
      } catch {
        return orgId
      }
    }
    return undefined
  } catch (e) {
    console.error('[Kreoon] fetchOrganizationId error:', e)
    return undefined
  }
}

// Lightweight INSERT — no Edge Function, no heavy AI processing
// Analysis runs in the browser (gemini-api.ts), only the result is saved here
export async function saveContentItem(
  token: string,
  orgId: string,
  product: ProductContext,
  video: VideoMetadata,
  analysis: ViralAnalysis,
  script: string,
): Promise<{ id: string }> {
  const date = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  const title = video.author
    ? `Viral @${video.author} — ${video.platform.toUpperCase()} ${date}`
    : `Referencia viral ${video.platform.toUpperCase()} — ${date}`

  const description = buildViralReference(video.platform, video, analysis)

  return apiFetch<{ id: string }>(
    '/rest/v1/content?select=id',
    token,
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        organization_id: orgId,
        title,
        description,
        script,
        status: 'draft',
        creation_mode: 'manual',
        client_id: product.client_id,
        product_id: product.id,
      }),
    }
  ).then((rows: any) => Array.isArray(rows) ? rows[0] : rows)
}

function buildViralReference(platform: string, video: VideoMetadata, a: ViralAnalysis): string {
  const lines: string[] = [
    `📊 REFERENCIA VIRAL — ${platform.toUpperCase()}`,
    `Fuente: ${video.author ? `@${video.author}` : 'Desconocido'} · Score viral: ${a.viral_score}/100`,
  ]
  const metrics: string[] = []
  if (video.views) metrics.push(`${fmtNum(video.views)} vistas`)
  if (video.likes) metrics.push(`${fmtNum(video.likes)} likes`)
  if (video.comments) metrics.push(`${fmtNum(video.comments)} comentarios`)
  if (metrics.length) lines.push(`Métricas: ${metrics.join(' · ')}`)

  if (a.narrative_formula) lines.push(`\n🎯 FÓRMULA NARRATIVA\n${a.narrative_formula}`)
  if (a.structure) lines.push(`\n🏗️ ESTRUCTURA\n${a.structure}`)
  if (a.hooks.length) { lines.push(`\n🪝 HOOKS`); a.hooks.forEach(h => lines.push(`• ${h}`)) }
  if (a.emotion_triggers.length) { lines.push(`\n💡 TRIGGERS`); a.emotion_triggers.forEach(t => lines.push(`• ${t}`)) }
  if (a.cta_type) lines.push(`\n📣 CTA\n${a.cta_type}`)
  if (a.whats_working?.length) { lines.push(`\n✅ QUÉ FUNCIONA`); a.whats_working.slice(0, 3).forEach(w => lines.push(`• ${w}`)) }
  if (a.replication_guide?.length) { lines.push(`\n🔁 REPLICACIÓN`); a.replication_guide.slice(0, 3).forEach(r => lines.push(`• ${r}`)) }
  if (a.transcription) lines.push(`\n📝 TRANSCRIPCIÓN\n${a.transcription.substring(0, 800)}`)
  lines.push(`\n---\n⚡ Referencia capturada con Kreoon Capture. Usa el Guionizador para adaptar la fórmula.`)
  return lines.join('\n')
}

function fmtNum(n?: number): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export async function getNotifications(
  token: string,
  userId: string
): Promise<KreoonNotification[]> {
  try {
    const data = await apiFetch<any[]>(
      `/rest/v1/notifications?user_id=eq.${userId}&read=eq.false&order=created_at.desc&limit=10`,
      token
    )
    return data.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title || n.type,
      body: n.body || n.message || '',
      read: n.read,
      created_at: n.created_at,
      link: n.link,
    }))
  } catch {
    return []
  }
}

export async function markNotificationRead(token: string, notifId: string): Promise<void> {
  await apiFetch(
    `/rest/v1/notifications?id=eq.${notifId}`,
    token,
    { method: 'PATCH', body: JSON.stringify({ read: true }) }
  )
}
