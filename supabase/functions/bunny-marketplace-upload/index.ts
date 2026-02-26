import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
}

interface BunnyVideoResponse {
  guid: string;
  title: string;
  status: number;
}

/**
 * Marketplace upload edge function for:
 * - Project deliverables (creator uploads video for a project)
 * - Portfolio items (creator uploads to their portfolio)
 *
 * Supports:
 * - POST JSON: Create video slot + get upload URL (for direct browser upload)
 * - PUT JSON: Confirm upload completion
 * - POST multipart: Legacy direct file upload
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY')
    const bunnyLibraryId = Deno.env.get('BUNNY_LIBRARY_ID')
    const bunnyCdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME') || ''

    // Validate required env vars
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[bunny-marketplace-upload] Missing Supabase env vars')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!bunnyApiKey || !bunnyLibraryId) {
      console.error('[bunny-marketplace-upload] Missing Bunny env vars:', {
        hasBunnyApiKey: !!bunnyApiKey,
        hasBunnyLibraryId: !!bunnyLibraryId
      })
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Bunny CDN credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const contentType = req.headers.get('content-type') || ''

    // Validate user is authenticated (since verify_jwt = false)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[bunny-marketplace-upload] No Authorization header')
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the JWT token using anon key client
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseAnonKey) {
      console.error('[bunny-marketplace-upload] Missing SUPABASE_ANON_KEY')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      console.error('[bunny-marketplace-upload] Invalid token:', authError?.message)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[bunny-marketplace-upload] Authenticated user:', user.id)

    // ========== PATH A: Create video slot + get upload URL ==========
    if (req.method === 'POST' && contentType.includes('application/json')) {
      const body = await req.json()
      const { upload_type, project_id, portfolio_item_id, title, creator_id } = body

      if (!upload_type || !['delivery', 'portfolio'].includes(upload_type)) {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid upload_type (delivery|portfolio)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const videoTitle = title || `marketplace-${upload_type}-${Date.now()}`
      console.log(`[bunny-marketplace-upload] Creating video slot: ${upload_type}, title: ${videoTitle}`)

      // Create video in Bunny Stream
      const createResponse = await fetch(
        `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`,
        {
          method: 'POST',
          headers: {
            'AccessKey': bunnyApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: videoTitle }),
        }
      )

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error('[bunny-marketplace-upload] Bunny create error:', errorText)
        throw new Error(`Failed to create video in Bunny: ${errorText}`)
      }

      const videoData: BunnyVideoResponse = await createResponse.json()
      const uploadUrl = `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoData.guid}`
      const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`

      // Record in marketplace_media
      const { data: mediaRecord, error: mediaError } = await supabase
        .from('marketplace_media')
        .insert({
          uploaded_by: creator_id,
          project_id: upload_type === 'delivery' ? project_id : null,
          portfolio_item_id: upload_type === 'portfolio' ? portfolio_item_id : null,
          file_name: videoTitle,
          file_url: embedUrl,
          file_type: 'video',
          bunny_video_id: videoData.guid,
          bunny_library_id: bunnyLibraryId,
          cdn_url: bunnyCdnHostname ? `https://${bunnyCdnHostname}/${videoData.guid}/play_1080p.mp4` : null,
          encoding_status: 'pending',
          is_public: upload_type === 'portfolio',
        })
        .select('id')
        .single()

      if (mediaError) {
        console.error('[bunny-marketplace-upload] Media record error:', mediaError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          upload_url: uploadUrl,
          access_key: bunnyApiKey,
          video_id: videoData.guid,
          embed_url: embedUrl,
          media_id: mediaRecord?.id || null,
          library_id: bunnyLibraryId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== PATH B: Confirm upload + create delivery/portfolio record ==========
    if (req.method === 'PUT') {
      const body = await req.json()
      const {
        upload_type, video_id, embed_url, media_id,
        // Delivery fields
        project_id, creator_id, file_name,
        // Portfolio fields
        portfolio_creator_id, portfolio_title, portfolio_description, portfolio_category, portfolio_tags, portfolio_brand_name,
      } = body

      if (!video_id || !embed_url || !upload_type) {
        return new Response(
          JSON.stringify({ error: 'Missing video_id, embed_url, or upload_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[bunny-marketplace-upload] Confirming ${upload_type} upload: ${video_id}`)

      const mp4Url = bunnyCdnHostname ? `https://${bunnyCdnHostname}/${video_id}/play_1080p.mp4` : embed_url
      const thumbnailUrl = bunnyCdnHostname ? `https://${bunnyCdnHostname}/${video_id}/thumbnail.jpg` : null

      // Update media record encoding status
      if (media_id) {
        await supabase
          .from('marketplace_media')
          .update({ encoding_status: 'processing', thumbnail_url: thumbnailUrl })
          .eq('id', media_id)
      }

      if (upload_type === 'delivery' && project_id && creator_id) {
        // Create delivery record
        const { data: delivery, error: deliveryError } = await supabase
          .from('project_deliveries')
          .insert({
            project_id,
            creator_id,
            file_name: file_name || `delivery-${video_id}.mp4`,
            file_url: mp4Url,
            file_type: 'video',
            thumbnail_url: thumbnailUrl,
            bunny_video_id: video_id,
            status: 'uploaded',
            version: 1,
          })
          .select('id')
          .single()

        if (deliveryError) {
          console.error('[bunny-marketplace-upload] Delivery insert error:', deliveryError)
          throw deliveryError
        }

        // Link media to delivery
        if (media_id && delivery?.id) {
          await supabase
            .from('marketplace_media')
            .update({ delivery_id: delivery.id })
            .eq('id', media_id)
        }

        return new Response(
          JSON.stringify({
            success: true,
            type: 'delivery',
            delivery_id: delivery?.id,
            video_id,
            embed_url,
            mp4_url: mp4Url,
            thumbnail_url: thumbnailUrl,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (upload_type === 'portfolio' && portfolio_creator_id) {
        // Verify creator profile exists before inserting
        const { data: creatorCheck, error: creatorCheckError } = await supabase
          .from('creator_profiles')
          .select('id, user_id')
          .eq('id', portfolio_creator_id)
          .single()

        if (creatorCheckError || !creatorCheck) {
          console.error('[bunny-marketplace-upload] Creator profile not found:', portfolio_creator_id, creatorCheckError)
          return new Response(
            JSON.stringify({
              error: 'Creator profile not found. Please refresh the page and try again.',
              details: { portfolio_creator_id, errorCode: creatorCheckError?.code }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('[bunny-marketplace-upload] Creating portfolio item for creator:', portfolio_creator_id)

        // Create portfolio item - use embed_url for reliable iframe playback
        const { data: portfolioItem, error: portfolioError } = await supabase
          .from('portfolio_items')
          .insert({
            creator_id: portfolio_creator_id,
            title: portfolio_title || null,
            description: portfolio_description || null,
            media_type: 'video',
            media_url: embed_url,  // Use embed URL for iframe playback
            thumbnail_url: thumbnailUrl,
            bunny_video_id: video_id,
            category: portfolio_category || null,
            tags: portfolio_tags || [],
            brand_name: portfolio_brand_name || null,
            is_public: true,
          })
          .select('id')
          .single()

        if (portfolioError) {
          console.error('[bunny-marketplace-upload] Portfolio insert error:', portfolioError)
          return new Response(
            JSON.stringify({
              error: 'Failed to create portfolio item',
              details: { code: portfolioError.code, message: portfolioError.message }
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Link media to portfolio item
        if (media_id && portfolioItem?.id) {
          await supabase
            .from('marketplace_media')
            .update({ portfolio_item_id: portfolioItem.id })
            .eq('id', media_id)
        }

        return new Response(
          JSON.stringify({
            success: true,
            type: 'portfolio',
            portfolio_item_id: portfolioItem?.id,
            video_id,
            embed_url,
            mp4_url: mp4Url,
            thumbnail_url: thumbnailUrl,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, video_id, embed_url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== PATH C: Direct multipart upload (legacy) ==========
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File
      const uploadType = formData.get('upload_type') as string
      const creatorId = formData.get('creator_id') as string
      const projectId = formData.get('project_id') as string | null
      const title = formData.get('title') as string || `marketplace-${Date.now()}`

      if (!file || !creatorId) {
        return new Response(
          JSON.stringify({ error: 'Missing file or creator_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[bunny-marketplace-upload] Direct upload: ${file.name}, size: ${file.size}`)

      // Create video in Bunny Stream
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
        throw new Error(`Failed to create video: ${await createResponse.text()}`)
      }

      const videoData: BunnyVideoResponse = await createResponse.json()

      // Stream upload to Bunny
      const uploadResponse = await fetch(
        `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoData.guid}`,
        {
          method: 'PUT',
          headers: {
            'AccessKey': bunnyApiKey,
            'Content-Type': 'application/octet-stream',
          },
          // @ts-ignore
          body: file.stream(),
          // @ts-ignore
          duplex: 'half',
        }
      )

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload: ${await uploadResponse.text()}`)
      }

      const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`
      const mp4Url = bunnyCdnHostname ? `https://${bunnyCdnHostname}/${videoData.guid}/play_1080p.mp4` : embedUrl
      const thumbnailUrl = bunnyCdnHostname ? `https://${bunnyCdnHostname}/${videoData.guid}/thumbnail.jpg` : null

      // Create media record
      await supabase
        .from('marketplace_media')
        .insert({
          uploaded_by: creatorId,
          project_id: projectId || null,
          file_name: file.name,
          file_url: mp4Url,
          file_type: 'video',
          file_size_bytes: file.size,
          bunny_video_id: videoData.guid,
          bunny_library_id: bunnyLibraryId,
          cdn_url: mp4Url,
          thumbnail_url: thumbnailUrl,
          encoding_status: 'processing',
          is_public: uploadType === 'portfolio',
        })

      return new Response(
        JSON.stringify({
          success: true,
          video_id: videoData.guid,
          embed_url: embedUrl,
          mp4_url: mp4Url,
          thumbnail_url: thumbnailUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request method or content type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[bunny-marketplace-upload] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
