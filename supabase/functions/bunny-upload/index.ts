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

// ---------- THUMBNAIL HELPERS ----------

async function generateFallbackThumbnail(): Promise<Uint8Array> {
  // Simple 640x360 white/gray placeholder image (JPEG) created on-the-fly
  const tinyJpeg = new Uint8Array([
    255,216,255,224,0,16,74,70,73,70,0,1,1,0,0,1,0,1,0,0,
    255,219,0,67,0,8,6,6,7,6,5,8,7,7,7,9,9,8,10,12,20,13,
    12,11,11,12,25,18,19,15,20,29,26,31,30,29,26,28,28,32,
    36,46,39,32,34,44,35,28,28,40,55,41,44,48,49,52,52,52,
    31,39,57,61,56,50,60,46,51,52,50,255,192,0,11,8,0,1,0,
    1,1,1,17,0,255,196,0,31,0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,1,2,3,4,5,6,7,8,9,10,11,255,196,0,181,16,0,2,1,
    3,3,2,4,3,5,5,4,4,0,0,1,125,1,2,3,0,4,17,5,18,33,49,
    65,6,19,81,97,7,34,113,20,50,129,145,161,8,35,66,177,
    193,21,82,209,240,36,51,98,114,130,9,10,22,23,24,25,
    26,37,38,39,40,41,42,52,53,54,55,56,57,58,67,68,69,70,
    71,72,73,74,83,84,85,86,87,88,89,90,99,100,101,102,103,
    104,105,106,115,116,117,118,119,120,121,122,131,132,133,
    134,135,136,137,138,146,147,148,149,150,151,152,153,154,
    162,163,164,165,166,167,168,169,170,178,179,180,181,182,
    183,184,185,186,194,195,196,197,198,199,200,201,202,210,
    211,212,213,214,215,216,217,218,225,226,227,228,229,230,
    231,232,233,234,241,242,243,244,245,246,247,248,249,250,
    255,218,0,8,1,1,0,0,63,0,253,252,0,0,0,255,217
  ]);

  return tinyJpeg;
}

async function uploadThumbnailToStorage(
  supabaseUrl: string,
  supabaseKey: string,
  contentId: string,
  imageData: Uint8Array
): Promise<string | null> {
  try {
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const fileName = `${contentId}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabaseClient.storage
      .from('content-thumbnails')
      .upload(fileName, imageData, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('[bunny-upload] Failed to upload thumbnail to storage:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('content-thumbnails')
      .getPublicUrl(fileName);

    // Update content record via raw fetch to avoid type issues
    const res = await fetch(`${supabaseUrl}/rest/v1/content?id=eq.${contentId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ thumbnail_url: publicUrl })
    });

    if (!res.ok) {
      console.error('[bunny-upload] Failed to update content thumbnail_url:', await res.text());
    }

    console.log('[bunny-upload] Thumbnail saved:', publicUrl);
    return publicUrl;
  } catch (err) {
    console.error('[bunny-upload] Error in uploadThumbnailToStorage:', err);
    return null;
  }
}

async function tryFetchBunnyThumbnail(
  bunnyApiKey: string,
  libraryId: string,
  videoId: string,
  cdnHostname: string
): Promise<Uint8Array | null> {
  const candidates = [
    `https://${cdnHostname}/${videoId}/thumbnail.jpg`,
    `https://vz-${cdnHostname.split('.')[0].replace('vz-', '')}.b-cdn.net/${videoId}/thumbnail.jpg`,
    `https://video.bunnycdn.com/play/${libraryId}/${videoId}/thumbnail.jpg`,
  ];

  for (const url of candidates) {
    try {
      console.log('[bunny-upload] Trying thumbnail URL:', url);
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        console.log('[bunny-upload] Thumbnail fetched from:', url);
        return new Uint8Array(arrayBuffer);
      }
    } catch {
      // ignore, try next
    }
  }

  return null;
}

async function generateAndSaveThumbnail(
  supabaseUrl: string,
  supabaseKey: string,
  contentId: string,
  videoId: string,
  bunnyApiKey: string,
  libraryId: string,
  cdnHostname: string
): Promise<void> {
  // Try to fetch from Bunny first
  let imageData = await tryFetchBunnyThumbnail(bunnyApiKey, libraryId, videoId, cdnHostname);

  if (!imageData) {
    console.log('[bunny-upload] Bunny thumbnail not ready, using fallback');
    imageData = await generateFallbackThumbnail();
  }

  await uploadThumbnailToStorage(supabaseUrl, supabaseKey, contentId, imageData);
}

// ---------- MAIN HANDLER ----------

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

      const fileSize = file.size;
      console.log(`[bunny-upload] Received file: ${file.name}, size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

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

      // Step 2: Upload the video file using STREAMING to avoid memory issues
      // Use file.stream() to stream directly without loading entire file in memory
      const uploadResponse = await fetch(
        `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoData.guid}`,
        {
          method: 'PUT',
          headers: {
            'AccessKey': bunnyApiKey,
            'Content-Type': 'application/octet-stream',
          },
          // @ts-ignore - Deno supports ReadableStream as body
          body: file.stream(),
          // @ts-ignore - duplex required for streaming body in Deno
          duplex: 'half',
        }
      )

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('Bunny upload error:', errorText)
        throw new Error(`Failed to upload to Bunny: ${errorText}`)
      }

      console.log(`[bunny-upload] Video streamed successfully to Bunny`);

      // Generate embed URL
      const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`

      // Use a retry mechanism to handle race conditions when multiple videos upload simultaneously
      let retryCount = 0;
      const maxRetries = 5;
      let updateSuccess = false;

      while (!updateSuccess && retryCount < maxRetries) {
        // Fetch current video_urls array
        const { data: currentContent, error: fetchError } = await supabase
          .from('content')
          .select('video_urls, hooks_count')
          .eq('id', contentId)
          .single()

        if (fetchError) {
          console.error('Error fetching current content:', fetchError)
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 200 * retryCount)); // Exponential backoff
          continue;
        }

        // Update video_urls array at the specific variant index
        const currentUrls = currentContent?.video_urls || []
        const hooksCount = currentContent?.hooks_count || 1
        const arrayLength = Math.max(hooksCount, variantIndex + 1, currentUrls.length)
        
        // Create new array preserving existing URLs
        const newUrls = Array.from({ length: arrayLength }, (_, i) => {
          if (i === variantIndex) return embedUrl;
          return currentUrls[i] || '';
        });

        console.log(`Updating video_urls for content ${contentId}, index ${variantIndex}:`, {
          currentUrls,
          newUrls,
          embedUrl
        });

        // Update content with Bunny embed URL in video_urls array
        const { error: updateError } = await supabase
          .from('content')
          .update({
            bunny_embed_url: variantIndex === 0 ? embedUrl : currentContent?.video_urls?.[0] || embedUrl,
            video_url: newUrls[0] || embedUrl, // Keep video_url as first video for backward compatibility
            video_urls: newUrls,
            video_processing_status: 'completed',
          })
          .eq('id', contentId)

        if (updateError) {
          console.error('Error updating content (attempt', retryCount + 1, '):', updateError)
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 200 * retryCount)); // Exponential backoff
        } else {
          updateSuccess = true;
          console.log(`Successfully updated video_urls at index ${variantIndex}`);
        }
      }

      if (!updateSuccess) {
        console.error('Failed to update content after', maxRetries, 'attempts');
      }

      console.log(`Video uploaded successfully: ${embedUrl} at index ${variantIndex}`)

      // Generate and save thumbnail automatically (don't await - let it run in background)
      const bunnyCdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME') || '';
      generateAndSaveThumbnail(
        supabaseUrl,
        supabaseServiceKey,
        contentId,
        videoData.guid,
        bunnyApiKey,
        bunnyLibraryId,
        bunnyCdnHostname
      ).catch(err => console.error('[bunny-upload] Thumbnail generation failed:', err));

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

      // Generate and save thumbnail automatically (don't await - let it run in background)
      const bunnyCdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME') || '';
      generateAndSaveThumbnail(
        supabaseUrl,
        supabaseServiceKey,
        content_id,
        videoData.guid,
        bunnyApiKey,
        bunnyLibraryId,
        bunnyCdnHostname
      ).catch(err => console.error('[bunny-upload] Thumbnail generation failed:', err));

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
