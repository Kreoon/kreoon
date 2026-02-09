import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Check Bunny encoding status for marketplace videos and update records.
 * Called periodically or after upload to check if video is ready.
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

    const body = await req.json()
    const { video_id, media_id } = body

    if (!video_id) {
      return new Response(
        JSON.stringify({ error: 'Missing video_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check Bunny status
    const statusResponse = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${video_id}`,
      {
        headers: { 'AccessKey': bunnyApiKey },
      }
    )

    if (!statusResponse.ok) {
      throw new Error(`Bunny status check failed: ${await statusResponse.text()}`)
    }

    const videoInfo = await statusResponse.json()

    // Bunny status codes: 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error
    const isFinished = videoInfo.status === 4
    const isFailed = videoInfo.status === 5 || videoInfo.status === 6
    const encodingStatus = isFinished ? 'completed' : isFailed ? 'failed' : 'processing'

    const thumbnailUrl = isFinished && bunnyCdnHostname
      ? `https://${bunnyCdnHostname}/${video_id}/thumbnail.jpg`
      : null

    // Update marketplace_media record
    if (media_id) {
      const updateData: Record<string, unknown> = {
        encoding_status: encodingStatus,
        duration_seconds: videoInfo.length ? Math.round(videoInfo.length) : null,
        width: videoInfo.width || null,
        height: videoInfo.height || null,
      }
      if (thumbnailUrl) updateData.thumbnail_url = thumbnailUrl

      await supabase
        .from('marketplace_media')
        .update(updateData)
        .eq('id', media_id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        video_id,
        status: encodingStatus,
        bunny_status: videoInfo.status,
        duration_seconds: videoInfo.length ? Math.round(videoInfo.length) : null,
        width: videoInfo.width,
        height: videoInfo.height,
        thumbnail_url: thumbnailUrl,
        is_ready: isFinished,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[bunny-marketplace-status] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
