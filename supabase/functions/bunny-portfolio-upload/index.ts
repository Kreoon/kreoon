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
 * This edge function handles portfolio video uploads to Bunny Stream.
 *
 * Supports two modes:
 * 1. JSON mode (application/json): Creates video entry in Bunny and returns
 *    upload credentials so the CLIENT uploads directly to Bunny (avoids 546 memory crash).
 * 2. JSON "save-hash" action: Saves video hash for dedup after client-side upload completes.
 * 3. JSON "save-record" action: Creates DB record (post/story) after upload completes.
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

    const body = await req.json()
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

    // Return upload credentials - client will upload directly to Bunny
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
    console.error('[bunny-portfolio-upload] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
