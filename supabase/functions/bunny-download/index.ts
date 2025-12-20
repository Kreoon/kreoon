import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const bunnyCdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME') || 'vz-f0f0f0f0-f0f.b-cdn.net'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get authorization header to verify user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { content_id, video_url } = body

    if (!content_id || !video_url) {
      return new Response(
        JSON.stringify({ error: 'Missing content_id or video_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch content to check permissions
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id, status, client_id')
      .eq('id', content_id)
      .single()

    if (contentError || !content) {
      return new Response(
        JSON.stringify({ error: 'Content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check user roles
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const roles = userRoles?.map(r => r.role) || []
    const isAdmin = roles.includes('admin')
    const isEditor = roles.includes('editor')
    const isCreator = roles.includes('creator')
    const isClient = roles.includes('client')

    // Check if user is the client associated with this content
    let isContentClient = false
    if (isClient && content.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', content.client_id)
        .single()
      
      isContentClient = clientData?.user_id === user.id
    }

    // Permission check:
    // - Admins can download anytime
    // - Editors can download anytime (to work on raw videos)
    // - Creators can download anytime (their own content)
    // - Clients can only download when status is approved, paid, or delivered
    const approvedStatuses = ['approved', 'paid', 'delivered']
    const canDownload = isAdmin || isEditor || isCreator || (isContentClient && approvedStatuses.includes(content.status))

    if (!canDownload) {
      return new Response(
        JSON.stringify({ error: 'No tiene permiso para descargar este video' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract video ID from Bunny URL
    // Formats:
    // - Embed: https://iframe.mediadelivery.net/embed/{library_id}/{video_id}
    // - CDN: https://vz-{hash}.b-cdn.net/{video_id}/...
    let videoId = ''
    
    // Try embed format first
    const embedMatch = video_url.match(/\/embed\/[^/]+\/([^/?]+)/)
    if (embedMatch) {
      videoId = embedMatch[1]
    } else {
      // Try CDN format: https://vz-xxxxx.b-cdn.net/{video_id}/...
      const cdnMatch = video_url.match(/b-cdn\.net\/([a-f0-9-]+)/i)
      if (cdnMatch) {
        videoId = cdnMatch[1]
      }
    }
    
    if (!videoId) {
      console.error('Could not extract video ID from URL:', video_url)
      return new Response(
        JSON.stringify({ error: 'Invalid video URL format', url: video_url }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`Extracted video ID: ${videoId} from URL: ${video_url}`)

    // Get video details from Bunny API
    const videoResponse = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoId}`,
      {
        headers: {
          'AccessKey': bunnyApiKey,
        },
      }
    )

    if (!videoResponse.ok) {
      console.error('Bunny API error:', await videoResponse.text())
      return new Response(
        JSON.stringify({ error: 'Error fetching video info' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const videoData = await videoResponse.json()
    
    // For Bunny Stream, we need to use the pull zone CDN URL
    // Format: https://vz-{hash}.b-cdn.net/{video_id}/play_720p.mp4
    // Or use the direct video URL from Bunny API if available
    
    // Try to get the direct download URL from Bunny's CDN
    // The CDN hostname should be in format: vz-xxxxxxxx-xxx.b-cdn.net
    let downloadUrl = ''
    
    // Check if we have a configured CDN hostname
    if (bunnyCdnHostname && bunnyCdnHostname !== 'vz-f0f0f0f0-f0f.b-cdn.net') {
      downloadUrl = `https://${bunnyCdnHostname}/${videoId}/play_720p.mp4`
    } else {
      // Fallback: construct from library ID pattern
      // Bunny Stream CDN format: https://vz-{library_id_hash}.b-cdn.net/{video_id}/play_720p.mp4
      downloadUrl = `https://vz-${bunnyLibraryId}.b-cdn.net/${videoId}/play_720p.mp4`
    }

    console.log(`Download URL generated for video ${videoId}: ${downloadUrl}`)
    console.log(`Video data from Bunny:`, JSON.stringify(videoData))

    return new Response(
      JSON.stringify({
        success: true,
        download_url: downloadUrl,
        title: videoData.title || 'video',
        size: videoData.storageSize || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Download error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
