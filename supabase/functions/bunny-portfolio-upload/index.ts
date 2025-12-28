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
 * This edge function uploads portfolio videos (posts/stories) to Bunny Stream
 * for automatic transcoding to MP4 H.264, ensuring playback in all browsers.
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const contentType = req.headers.get('content-type') || ''

    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Expected multipart/form-data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = formData.get('user_id') as string
    const type = formData.get('type') as string // 'post' or 'story'
    const caption = formData.get('caption') as string || null

    if (!file || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing file or user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[bunny-portfolio-upload] Uploading ${type} for user ${userId}, file: ${file.name}, size: ${file.size}`)

    // Step 1: Create video in Bunny Stream
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

    // Step 2: Upload the video file to Bunny
    const fileBuffer = await file.arrayBuffer()
    const uploadResponse = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoData.guid}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': bunnyApiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: fileBuffer,
      }
    )

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('[bunny-portfolio-upload] Bunny upload error:', errorText)
      throw new Error(`Failed to upload to Bunny: ${errorText}`)
    }

    // Generate URLs
    const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`
    // Direct MP4 URL (available after encoding completes)
    const mp4Url = `https://${bunnyCdnHostname}/${videoData.guid}/play_720p.mp4`
    // Thumbnail URL (available after encoding completes)
    const thumbnailUrl = `https://${bunnyCdnHostname}/${videoData.guid}/thumbnail.jpg`

    console.log(`[bunny-portfolio-upload] Video uploaded: ${embedUrl}`)

    // Step 3: Create database record
    const timestamp = Date.now()
    
    if (type === 'story') {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      
      const { data: storyData, error: dbError } = await supabase
        .from('portfolio_stories')
        .insert({
          user_id: userId,
          media_url: embedUrl, // Use Bunny embed URL
          media_type: 'video',
          thumbnail_url: thumbnailUrl,
          caption: caption,
          expires_at: expiresAt,
        })
        .select()
        .single()

      if (dbError) {
        console.error('[bunny-portfolio-upload] DB error:', dbError)
        throw dbError
      }

      console.log('[bunny-portfolio-upload] Story created:', storyData.id)

      return new Response(
        JSON.stringify({
          success: true,
          type: 'story',
          id: storyData.id,
          video_id: videoData.guid,
          embed_url: embedUrl,
          mp4_url: mp4Url,
          thumbnail_url: thumbnailUrl,
          message: 'Video uploaded successfully. Encoding in progress.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Post
      const { data: postData, error: dbError } = await supabase
        .from('portfolio_posts')
        .insert({
          user_id: userId,
          media_url: embedUrl, // Use Bunny embed URL
          media_type: 'video',
          caption: caption,
          thumbnail_url: thumbnailUrl,
        })
        .select()
        .single()

      if (dbError) {
        console.error('[bunny-portfolio-upload] DB error:', dbError)
        throw dbError
      }

      console.log('[bunny-portfolio-upload] Post created:', postData.id)

      return new Response(
        JSON.stringify({
          success: true,
          type: 'post',
          id: postData.id,
          video_id: videoData.guid,
          embed_url: embedUrl,
          mp4_url: mp4Url,
          thumbnail_url: thumbnailUrl,
          message: 'Video uploaded successfully. Encoding in progress.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('[bunny-portfolio-upload] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
