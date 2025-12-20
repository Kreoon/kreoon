import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-file-name, x-file-type, x-content-id',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
}

interface BunnyVideoResponse {
  guid: string;
  title: string;
  status: number;
}

Deno.serve(async (req) => {
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

    // ========== Path A: streaming upload (for large files) ==========
    if (req.method === 'PUT' && !contentType.includes('multipart/form-data')) {
      const url = new URL(req.url)
      const contentId = url.searchParams.get('content_id') || req.headers.get('x-content-id')
      const fileType = url.searchParams.get('file_type') || req.headers.get('x-file-type') || 'raw_video'
      const originalFileName = url.searchParams.get('file_name') || req.headers.get('x-file-name') || 'upload.mp4'

      if (!contentId) {
        return new Response(
          JSON.stringify({ error: 'Missing content_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (!req.body) {
        return new Response(
          JSON.stringify({ error: 'Missing request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      console.log(`Streaming upload ${fileType} for content ${contentId}: ${originalFileName}`)

      // Step 1: Create video in Bunny Stream
      const videoTitle = `raw_${contentId}_${Date.now()}`
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
        console.error('Bunny create video error:', errorText)
        throw new Error(`Failed to create video in Bunny: ${errorText}`)
      }

      const videoData: BunnyVideoResponse = await createResponse.json()
      console.log('Created Bunny video for raw upload:', videoData.guid)

      // Step 2: Upload the video file (streaming)
      const uploadResponse = await fetch(
        `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoData.guid}`,
        {
          method: 'PUT',
          headers: {
            'AccessKey': bunnyApiKey,
            'Content-Type': contentType || 'application/octet-stream',
            ...(req.headers.get('content-length')
              ? { 'Content-Length': req.headers.get('content-length') as string }
              : {}),
          },
          body: req.body,
        },
      )

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('Bunny Stream upload error:', errorText)
        throw new Error(`Failed to upload to Bunny Stream: ${errorText}`)
      }

      // Generate embed URL (same format as final videos)
      const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`
      console.log(`Raw video uploaded successfully: ${embedUrl}`)

      // Update content based on file type
      let allUrls: string[] = []

      if (fileType === 'raw_video') {
        // Use atomic append function to avoid race conditions
        const { data: appendResult, error: appendError } = await supabase.rpc('append_raw_video_url', {
          _content_id: contentId,
          _url: embedUrl
        })

        if (appendError) {
          console.error('Error appending raw video url:', appendError)
          throw new Error(`Error updating content: ${appendError.message}`)
        }

        allUrls = appendResult || [embedUrl]
        console.log(`All raw_video_urls after append: ${JSON.stringify(allUrls)}`)
      } else if (fileType === 'thumbnail') {
        const { error: updateError } = await supabase
          .from('content')
          .update({ thumbnail_url: embedUrl })
          .eq('id', contentId)

        if (updateError) {
          console.error('Error updating content:', updateError)
          throw new Error(`Error updating content: ${updateError.message}`)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          url: embedUrl,
          video_id: videoData.guid,
          file_type: fileType,
          all_urls: allUrls,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ========== Path B: multipart/form-data (for smaller files) ==========
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Expected multipart/form-data or PUT streaming upload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const contentId = formData.get('content_id') as string
    const fileType = (formData.get('file_type') as string) || 'raw_video'

    if (!file || !contentId) {
      return new Response(
        JSON.stringify({ error: 'Missing file or content_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`Uploading ${fileType} for content ${contentId}: ${file.name}`)

    // Step 1: Create video in Bunny Stream
    const videoTitle = `raw_${contentId}_${Date.now()}`
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
      console.error('Bunny create video error:', errorText)
      throw new Error(`Failed to create video in Bunny: ${errorText}`)
    }

    const videoData: BunnyVideoResponse = await createResponse.json()
    console.log('Created Bunny video for raw upload:', videoData.guid)

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
      },
    )

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Bunny Stream upload error:', errorText)
      throw new Error(`Failed to upload to Bunny Stream: ${errorText}`)
    }

    // Generate embed URL
    const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`
    console.log(`Raw video uploaded successfully: ${embedUrl}`)

    // Update content based on file type
    let allUrls: string[] = []

    if (fileType === 'raw_video') {
      // Use atomic append function to avoid race conditions
      const { data: appendResult, error: appendError } = await supabase.rpc('append_raw_video_url', {
        _content_id: contentId,
        _url: embedUrl
      })

      if (appendError) {
        console.error('Error appending raw video url:', appendError)
        throw new Error(`Error updating content: ${appendError.message}`)
      }

      allUrls = appendResult || [embedUrl]
      console.log(`All raw_video_urls after append: ${JSON.stringify(allUrls)}`)
    } else if (fileType === 'thumbnail') {
      const { error: updateError } = await supabase
        .from('content')
        .update({ thumbnail_url: embedUrl })
        .eq('id', contentId)

      if (updateError) {
        console.error('Error updating content:', updateError)
        throw new Error(`Error updating content: ${updateError.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: embedUrl,
        video_id: videoData.guid,
        file_type: fileType,
        all_urls: allUrls,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Storage upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
