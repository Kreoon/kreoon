import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  canWriteContent,
  createProxyToken,
  forwardPutToBunny,
  functionUrl,
  getRequestUser,
  jsonResponse,
  legacyCompatEnabled,
  signTusUpload,
  uploadCorsHeaders,
  verifyProxyToken,
} from '../_shared/bunnyUploadSecurity.ts'

const FN = 'bunny-portfolio-upload'
// Proxy legado (solo frontend antiguo): sin límite artificial; el límite real es
// el idle timeout de Edge Functions (~150s). El frontend nuevo usa TUS directo.
const LEGACY_STREAM_MAX_BYTES = 5 * 1024 * 1024 * 1024

interface BunnyVideoResponse {
  guid: string;
  title: string;
  status: number;
}

/**
 * Subidas de video a Bunny Stream.
 *
 * Acciones:
 * 1. "create" (default): crea el video en Bunny y devuelve credenciales TUS FIRMADAS
 *    (`tus`) para que el navegador suba directo a Bunny. NUNCA devuelve la API key.
 * 2. "save-hash": guarda el hash del archivo para deduplicación.
 * 3. "save-record": crea el registro en DB (post) tras la subida.
 * 4. "save-raw-video": agrega la URL a content.raw_video_urls.
 * 5. "set-final-videos": sobrescribe content.video_urls.
 * PUT (sin action): proxy legado — el frontend antiguo hace PUT a `upload_url` con
 *    `AccessKey: access_key`; ahora `access_key` es un token de un solo video y la
 *    función reenvía el archivo a Bunny con la clave real.
 *
 * Seguridad: todas las acciones exigen JWT de usuario válido. Mientras
 * BUNNY_UPLOAD_LEGACY_COMPAT no esté en "off", se aceptan llamadas anónimas del
 * frontend antiguo (create/save-*), pero sin entregar claves.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: uploadCorsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY')!
    const bunnyLibraryId = Deno.env.get('BUNNY_LIBRARY_ID')!
    const bunnyCdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME') || ''
    const admin = createClient(supabaseUrl, supabaseServiceKey)

    // === PUT: proxy legado de subida (token de un solo video, nunca la API key) ===
    if (req.method === 'PUT') {
      const token = req.headers.get('AccessKey') || req.headers.get('accesskey') || ''
      const payload = await verifyProxyToken(token, FN)
      if (!payload || payload.kind !== 'stream') {
        return jsonResponse({ success: false, error: 'Token de subida inválido o vencido' }, 401)
      }
      return await forwardPutToBunny(
        req,
        `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${payload.target}`,
        bunnyApiKey,
        payload.max,
        'application/octet-stream',
      )
    }

    // Parse aparte del resto: si el body llega truncado (conexion inestable
    // durante una subida larga), antes esto caia al catch generico de abajo
    // y devolvia un 500 sin contexto -- imposible de diagnosticar desde los
    // logs. Ahora es un 400 explicito que el cliente puede reintentar.
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('[bunny-portfolio-upload] Invalid/truncated request body:', parseError)
      return jsonResponse({ error: 'invalid_body: request payload was empty or malformed (possibly a dropped connection) — retry' }, 400)
    }
    const action = (body.action as string) || 'create'

    // Identidad: JWT de usuario. Sin JWT solo se tolera en modo compatibilidad.
    const user = await getRequestUser(req, admin)
    const legacy = !user && legacyCompatEnabled() && action !== 'set-final-videos'
    if (!user && !legacy) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }
    if (legacy) {
      console.warn(`[bunny-portfolio-upload] Llamada anónima legada (action=${action}) aceptada por BUNNY_UPLOAD_LEGACY_COMPAT`)
    }

    // === Action: save-hash (after client-side upload completes) ===
    if (action === 'save-hash') {
      const { file_hash, file_size, bunny_video_id, embed_url, thumbnail_url, mp4_url } = body as Record<string, string>

      if (!file_hash || !bunny_video_id) {
        return jsonResponse({ error: 'Missing file_hash or bunny_video_id' }, 400)
      }

      const { error: hashError } = await admin
        .from('video_hashes')
        .upsert({
          file_hash,
          file_size: parseInt(file_size || '0'),
          bunny_video_id,
          embed_url,
          thumbnail_url,
          mp4_url,
          // El dueño es el usuario autenticado, nunca un user_id del body.
          created_by: user ? user.id : (body.user_id ?? null),
        }, { onConflict: 'file_hash' })

      if (hashError) {
        console.error('[bunny-portfolio-upload] Error saving video hash:', hashError)
        return jsonResponse({ success: false, error: 'Failed to save hash' }, 500)
      }

      console.log('[bunny-portfolio-upload] Video hash saved for dedup:', String(file_hash).substring(0, 16) + '...')
      return jsonResponse({ success: true })
    }

    // === Action: save-record (create DB record after upload) ===
    if (action === 'save-record') {
      const { type, embed_url, thumbnail_url, caption } = body

      if (type === 'story') {
        // Simplificación 2026: las historias (portfolio_stories) se eliminaron con
        // el feed social. Se responde con error explícito en vez de fallar contra
        // una tabla inexistente.
        return jsonResponse({ success: false, error: 'Las historias ya no están disponibles' }, 410)
      } else if (type === 'post') {
        if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)
        const { data: postData, error: dbError } = await admin
          .from('portfolio_posts')
          .insert({
            user_id: user.id,
            media_url: embed_url,
            media_type: 'video',
            caption,
            thumbnail_url,
          })
          .select()
          .single()

        if (dbError) {
          console.error('[bunny-portfolio-upload] DB error:', dbError)
          throw dbError
        }

        return jsonResponse({ success: true, id: postData.id })
      }

      // featured type: no DB record needed
      return jsonResponse({ success: true })
    }

    // === Action: save-raw-video (append URL to content.raw_video_urls) ===
    if (action === 'save-raw-video') {
      const { content_id, embed_url } = body as Record<string, string>

      if (!content_id || !embed_url) {
        return jsonResponse({ error: 'Missing content_id or embed_url' }, 400)
      }
      // Solo se aceptan URLs de la librería propia de Bunny.
      if (!String(embed_url).startsWith(`https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/`)) {
        return jsonResponse({ error: 'embed_url inválida' }, 400)
      }

      if (user) {
        const access = await canWriteContent(admin, user.id, content_id)
        if (!access.ok) {
          return jsonResponse({ error: access.status === 404 ? 'Content not found' : 'Forbidden' }, access.status)
        }
      }

      // Use atomic append function to avoid race conditions
      const { data: allUrls, error: appendError } = await admin.rpc('append_raw_video_url', {
        _content_id: content_id,
        _url: embed_url
      })

      if (appendError) {
        console.error('[bunny-portfolio-upload] Error appending raw video URL:', appendError)
        return jsonResponse({ success: false, error: appendError.message }, 500)
      }

      console.log(`[bunny-portfolio-upload] Raw video URL appended to content ${content_id}`)
      return jsonResponse({ success: true, all_urls: allUrls || [] })
    }

    // === Action: set-final-videos (overwrite content.video_urls) ===
    // Persiste los videos finales replicando la autorizacion del RPC update_content_by_id
    // PERO sin depender del auto-refresh de token en background (que Safari estrangula durante
    // subidas largas). El cliente envia un token fresco (obtenido on-demand via getSession justo
    // antes de llamar); aqui validamos identidad + permiso y recien entonces escribimos.
    if (action === 'set-final-videos') {
      const { content_id, urls } = body as { content_id?: string; urls?: unknown }

      if (!content_id || !Array.isArray(urls)) {
        return jsonResponse({ error: 'Missing content_id or urls[]' }, 400)
      }
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

      const access = await canWriteContent(admin, user.id, content_id)
      if (!access.ok) {
        return jsonResponse({ error: access.status === 404 ? 'Content not found' : 'Forbidden' }, access.status)
      }

      const cleaned = (urls as unknown[])
        .filter((u): u is string => typeof u === 'string' && u.trim() !== '')

      const { error: updateError } = await admin
        .from('content')
        .update({ video_urls: cleaned })
        .eq('id', content_id)

      if (updateError) {
        console.error('[bunny-portfolio-upload] Error setting final videos:', updateError)
        return jsonResponse({ success: false, error: updateError.message }, 500)
      }

      console.log(`[bunny-portfolio-upload] Final videos set for content ${content_id}: ${cleaned.length} url(s)`)
      return jsonResponse({ success: true, video_urls: cleaned })
    }

    // === Action: create (default) ===
    // El dueño del video es el usuario autenticado; user_id del body solo se usa
    // (para el título) en modo legado.
    const ownerId = user ? user.id : String(body.user_id || '')
    const type = String(body.type || 'featured').replace(/[^a-z0-9_-]/gi, '').slice(0, 30) || 'featured'

    if (!ownerId) {
      return jsonResponse({ error: 'Missing user_id' }, 400)
    }

    console.log(`[bunny-portfolio-upload] Creating video entry for ${type}, user: ${ownerId}${legacy ? ' (legacy)' : ''}`)

    // Create video in Bunny Stream (lightweight JSON call, no file data)
    const title = `portfolio-${type}-${ownerId}-${Date.now()}`
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': bunnyApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    )

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('[bunny-portfolio-upload] Bunny create video error:', errorText)
      return jsonResponse({ success: false, error: 'No se pudo crear el video en Bunny' }, 502)
    }

    const videoData: BunnyVideoResponse = await createResponse.json()
    console.log('[bunny-portfolio-upload] Created Bunny video:', videoData.guid)

    const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`
    const mp4Url = `https://${bunnyCdnHostname}/${videoData.guid}/play_1080p.mp4`
    const thumbnailUrl = `https://${bunnyCdnHostname}/${videoData.guid}/thumbnail.jpg`

    const tus = await signTusUpload(bunnyLibraryId, bunnyApiKey, videoData.guid)

    const response: Record<string, unknown> = {
      success: true,
      video_id: videoData.guid,
      embed_url: embedUrl,
      mp4_url: mp4Url,
      thumbnail_url: thumbnailUrl,
      tus,
    }

    // Compatibilidad con el frontend antiguo: `upload_url` apunta a esta misma
    // función y `access_key` es un token de un solo video (NO la API key).
    if (legacyCompatEnabled()) {
      response.upload_url = functionUrl(FN)
      response.access_key = await createProxyToken({
        fn: FN,
        kind: 'stream',
        target: videoData.guid,
        max: LEGACY_STREAM_MAX_BYTES,
        uid: user?.id ?? null,
      })
    }

    return jsonResponse(response)

  } catch (error) {
    // Log con stack completo -- el mensaje solo (como antes) no alcanzaba
    // para diagnosticar un 500 despues del hecho.
    console.error('[bunny-portfolio-upload] Unhandled error:', error instanceof Error ? error.stack || error.message : error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ error: errorMessage }, 500)
  }
})
