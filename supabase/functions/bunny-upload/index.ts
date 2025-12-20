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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY')!
    const bunnyLibraryId = Deno.env.get('BUNNY_LIBRARY_ID')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const contentType = req.headers.get('content-type') || ''
    
    // Handle direct video upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File
      const contentId = formData.get('content_id') as string
      const title = formData.get('title') as string || 'Video'
      const variantIndex = parseInt(formData.get('variant_index') as string || '0', 10)

      if (!file || !contentId) {
        return new Response(
          JSON.stringify({ error: 'Missing file or content_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update status to processing
      await supabase
        .from('content')
        .update({
          video_processing_status: 'processing',
          video_processing_started_at: new Date().toISOString(),
        })
        .eq('id', contentId)

      // Step 1: Create video in Bunny Stream
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
        console.error('Bunny create video error:', errorText)
        throw new Error(`Failed to create video in Bunny: ${errorText}`)
      }

      const videoData: BunnyVideoResponse = await createResponse.json()
      console.log('Created Bunny video:', videoData.guid)

      // Step 2: Upload the video file
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
        console.error('Bunny upload error:', errorText)
        throw new Error(`Failed to upload to Bunny: ${errorText}`)
      }

      // Generate embed URL
      const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`

      // Fetch current video_urls array
      const { data: currentContent } = await supabase
        .from('content')
        .select('video_urls, hooks_count')
        .eq('id', contentId)
        .single()

      // Update video_urls array at the specific variant index
      const currentUrls = currentContent?.video_urls || []
      const hooksCount = currentContent?.hooks_count || 1
      const newUrls = Array.from({ length: Math.max(hooksCount, variantIndex + 1) }, (_, i) => 
        i === variantIndex ? embedUrl : (currentUrls[i] || '')
      )

      // Update content with Bunny embed URL in video_urls array
      const { error: updateError } = await supabase
        .from('content')
        .update({
          bunny_embed_url: embedUrl,
          video_url: newUrls[0] || embedUrl, // Keep video_url as first video for backward compatibility
          video_urls: newUrls,
          video_processing_status: 'completed',
        })
        .eq('id', contentId)

      if (updateError) {
        console.error('Error updating content:', updateError)
      }

      console.log(`Video uploaded successfully: ${embedUrl} at index ${variantIndex}`)

      return new Response(
        JSON.stringify({
          success: true,
          video_id: videoData.guid,
          embed_url: embedUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle URL-based upload (from Google Drive or direct URL)
    const body = await req.json()
    const { content_id, video_url, title } = body

    if (!content_id) {
      return new Response(
        JSON.stringify({ error: 'Missing content_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update status to processing
    await supabase
      .from('content')
      .update({
        video_processing_status: 'processing',
        video_processing_started_at: new Date().toISOString(),
      })
      .eq('id', content_id)

    // If video_url is provided, fetch and upload
    if (video_url) {
      // Create video in Bunny Stream with fetch URL
      const createResponse = await fetch(
        `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/fetch`,
        {
          method: 'POST',
          headers: {
            'AccessKey': bunnyApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: video_url,
            title: title || 'Video',
          }),
        }
      )

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error('Bunny fetch video error:', errorText)
        
        await supabase
          .from('content')
          .update({ video_processing_status: 'failed' })
          .eq('id', content_id)
          
        throw new Error(`Failed to fetch video in Bunny: ${errorText}`)
      }

      const videoData: BunnyVideoResponse = await createResponse.json()
      const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`

      // Update content - status will be pending as Bunny is processing
      await supabase
        .from('content')
        .update({
          bunny_embed_url: embedUrl,
          video_url: embedUrl,
          video_processing_status: 'processing', // Bunny is still processing
        })
        .eq('id', content_id)

      return new Response(
        JSON.stringify({
          success: true,
          video_id: videoData.guid,
          embed_url: embedUrl,
          status: 'processing',
          message: 'Video is being processed by Bunny.net'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'No video provided' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
