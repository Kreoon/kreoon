import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface BunnyVideoStatus {
  guid: string;
  title: string;
  status: number; // 0: created, 1: uploaded, 2: processing, 3: transcoding, 4: finished, 5: error
  encodeProgress: number;
}

const STATUS_MAP: Record<number, string> = {
  0: 'pending',
  1: 'processing',
  2: 'processing',
  3: 'processing',
  4: 'completed',
  5: 'failed',
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

    const body = await req.json().catch(() => ({}))
    const { content_id, video_id } = body

    if (!video_id) {
      return new Response(
        JSON.stringify({ error: 'Missing video_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[bunny-status] Checking status for video:', video_id, 'content:', content_id || 'n/a')

    // Get video status from Bunny
    const statusResponse = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${video_id}`,
      {
        method: 'GET',
        headers: {
          'AccessKey': bunnyApiKey,
        },
      }
    )

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text().catch(() => '')
      console.error('[bunny-status] Bunny status error:', statusResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: `Bunny status error ${statusResponse.status}`, details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const videoData: BunnyVideoStatus = await statusResponse.json()

    // Bunny API can return different casing depending on SDKs; be defensive
    const encodeProgress = (videoData as any).encodeProgress ?? (videoData as any).EncodeProgress ?? 0
    const processingStatus = STATUS_MAP[videoData.status] || 'processing'

    console.log('[bunny-status] Bunny status:', videoData.status, 'mapped:', processingStatus, 'progress:', encodeProgress)

    // Update content status if content_id provided
    if (content_id && (processingStatus === 'completed' || processingStatus === 'failed')) {
      await supabase
        .from('content')
        .update({
          video_processing_status: processingStatus,
        })
        .eq('id', content_id)
    }

    return new Response(
      JSON.stringify({
        video_id: videoData.guid,
        title: videoData.title,
        status: processingStatus,
        bunny_status: videoData.status,
        encode_progress: encodeProgress,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[bunny-status] Status check error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

