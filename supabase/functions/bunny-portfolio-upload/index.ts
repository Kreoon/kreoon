import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BunnyVideoResponse {
  guid: string;
  title: string;
  status: number;
}

/**
 * This edge function handles video uploads to Bunny Stream.
 *
 * Actions supported:
 * 1. "create" (default): Creates video entry in Bunny and returns upload credentials
 *    so the CLIENT uploads directly to Bunny (avoids 546 memory crash).
 * 2. "save-hash": Saves video hash for dedup after client-side upload completes.
 * 3. "save-record": Creates DB record (post/story) after upload completes.
 * 4. "save-raw-video": Appends raw video URL to content.raw_video_urls array.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY')!
    const bunnyLibraryId = Deno.env.get('BUNNY_LIBRARY_ID')!
    const bunnyCdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME') || ''

    // Parse aparte del resto: si el body llega truncado (conexion inestable
    // durante una subida larga), antes esto caia al catch generico de abajo
    // y devolvia un 500 sin contexto -- imposible de diagnosticar desde los
    // logs. Ahora es un 400 explicito que el cliente puede reintentar.
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('[bunny-portfolio-upload] Invalid/truncated request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'invalid_body: request payload was empty or malformed (possibly a dropped connection) — retry' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const action = body.action || 'create' // 'create', 'save-hash', 'save-record'

    // === Action: save-hash (after client-side upload completes) ===
    if (action === 'save-hash') {
      const { file_hash, file_size, bunny_video_id, embed_url, thumbnail_url, mp4_url, user_id } = body

      if (!file_hash || !bunny_video_id) {
        return new Response(
          JSON.stringify({ error: 'Missing file_hash or bunny_video_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const { error: hashError } = await supabase
        .from('video_hashes')
        .upsert({
          file_hash,
          file_size: parseInt(file_size || '0'),
          bunny_video_id,
          embed_url,
          thumbnail_url,
          mp4_url,
          created_by: user_id,
        }, { onConflict: 'file_hash' })

      if (hashError) {
        console.error('[bunny-portfolio-upload] Error saving video hash:', hashError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to save hash' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[bunny-portfolio-upload] Video hash saved for dedup:', file_hash.substring(0, 16) + '...')
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // === Action: save-record (create DB record after upload) ===
    if (action === 'save-record') {
      const { type, user_id, embed_url, thumbnail_url, caption } = body
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      if (type === 'story') {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        const { data: storyData, error: dbError } = await supabase
          .from('portfolio_stories')
          .insert({
            user_id,
            media_url: embed_url,
            media_type: 'video',
            thumbnail_url,
            caption,
            expires_at: expiresAt,
          })
          .select()
          .single()

        if (dbError) {
          console.error('[bunny-portfolio-upload] DB error:', dbError)
          throw dbError
        }

        return new Response(
          JSON.stringify({ success: true, id: storyData.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else if (type === 'post') {
        const { data: postData, error: dbError } = await supabase
          .from('portfolio_posts')
          .insert({
            user_id,
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

        return new Response(
          JSON.stringify({ success: true, id: postData.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // featured type: no DB record needed
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // === Action: save-raw-video (append URL to content.raw_video_urls) ===
    if (action === 'save-raw-video') {
      const { content_id, embed_url } = body

      if (!content_id || !embed_url) {
        return new Response(
          JSON.stringify({ error: 'Missing content_id or embed_url' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Use atomic append function to avoid race conditions
      const { data: allUrls, error: appendError } = await supabase.rpc('append_raw_video_url', {
        _content_id: content_id,
        _url: embed_url
      })

      if (appendError) {
        console.error('[bunny-portfolio-upload] Error appending raw video URL:', appendError)
        return new Response(
          JSON.stringify({ success: false, error: appendError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[bunny-portfolio-upload] Raw video URL appended to content ${content_id}`)
      return new Response(
        JSON.stringify({ success: true, all_urls: allUrls || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // === Action: set-final-videos (overwrite content.video_urls) ===
    // Persiste los videos finales replicando la autorizacion del RPC update_content_by_id
    // PERO sin depender del auto-refresh de token en background (que Safari estrangula durante
    // subidas largas). El cliente envia un token fresco (obtenido on-demand via getSession justo
    // antes de llamar); aqui validamos identidad + permiso y recien entonces escribimos.
    // Seguridad: NO se confia en el anon key ni en el content_id solos -> se exige JWT valido
    // del usuario y membresia en la organizacion del contenido antes del write con service_role.
    if (action === 'set-final-videos') {
      const { content_id, urls } = body

      if (!content_id || !Array.isArray(urls)) {
        return new Response(
          JSON.stringify({ error: 'Missing content_id or urls[]' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 1) Autenticar al llamante por su JWT (no por el anon key, que es publico)
      const authHeader = req.headers.get('Authorization') || ''
      const token = authHeader.replace('Bearer ', '').trim()
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const admin = createClient(supabaseUrl, supabaseServiceKey)
      const { data: { user }, error: authError } = await admin.auth.getUser(token)
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 2) Resolver la organizacion del contenido
      const { data: contentRow, error: contentErr } = await admin
        .from('content')
        .select('organization_id, editor_id, creator_id, strategist_id')
        .eq('id', content_id)
        .maybeSingle()
      if (contentErr || !contentRow?.organization_id) {
        return new Response(
          JSON.stringify({ error: 'Content not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 3) Autorizar: asignado al contenido (editor/creator/strategist) o miembro de la org
      //    (mismo criterio que el RPC update_content_by_id que reemplaza este flujo)
      let allowed =
        contentRow.editor_id === user.id ||
        contentRow.creator_id === user.id ||
        contentRow.strategist_id === user.id
      if (!allowed) {
        const { data: member } = await admin
          .from('organization_member_roles')
          .select('user_id')
          .eq('organization_id', contentRow.organization_id)
          .eq('user_id', user.id)
          .maybeSingle()
        allowed = !!member
      }
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 4) Escribir con service_role (ya autorizado)
      const cleaned = (urls as unknown[])
        .filter((u): u is string => typeof u === 'string' && u.trim() !== '')

      const { error: updateError } = await admin
        .from('content')
        .update({ video_urls: cleaned })
        .eq('id', content_id)

      if (updateError) {
        console.error('[bunny-portfolio-upload] Error setting final videos:', updateError)
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[bunny-portfolio-upload] Final videos set for content ${content_id}: ${cleaned.length} url(s)`)
      return new Response(
        JSON.stringify({ success: true, video_urls: cleaned }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // === Action: create (default) - Create video in Bunny and return upload credentials ===
    const userId = body.user_id
    const type = body.type || 'featured'
    const fileName = body.file_name || 'video'

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[bunny-portfolio-upload] Creating video entry for ${type}, user: ${userId}`)

    // Create video in Bunny Stream (lightweight JSON call, no file data)
    const title = `portfolio-${type}-${userId}-${Date.now()}`
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
      throw new Error(`Failed to create video in Bunny: ${errorText}`)
    }

    const videoData: BunnyVideoResponse = await createResponse.json()
    console.log('[bunny-portfolio-upload] Created Bunny video:', videoData.guid)

    // Generate URLs
    const uploadUrl = `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoData.guid}`
    const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`
    const mp4Url = `https://${bunnyCdnHostname}/${videoData.guid}/play_1080p.mp4`
    const thumbnailUrl = `https://${bunnyCdnHostname}/${videoData.guid}/thumbnail.jpg`

    return new Response(
      JSON.stringify({
        success: true,
        video_id: videoData.guid,
        upload_url: uploadUrl,
        access_key: bunnyApiKey,
        embed_url: embedUrl,
        mp4_url: mp4Url,
        thumbnail_url: thumbnailUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // Log con stack completo -- el mensaje solo (como antes) no alcanzaba
    // para diagnosticar un 500 despues del hecho.
    console.error('[bunny-portfolio-upload] Unhandled error:', error instanceof Error ? error.stack || error.message : error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
