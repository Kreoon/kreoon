import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    console.log(`Deleting video from content ${content_id}: ${video_url}`)

    // Check permissions
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const roles = userRoles?.map(r => r.role) || []
    const isAdmin = roles.includes('admin')
    const isEditor = roles.includes('editor')
    const isCreator = roles.includes('creator')

    if (!isAdmin && !isEditor && !isCreator) {
      return new Response(
        JSON.stringify({ error: 'No tiene permiso para eliminar videos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract video ID from URL
    let videoId = ''
    const embedMatch = video_url.match(/\/embed\/[^/]+\/([^/?]+)/)
    if (embedMatch) {
      videoId = embedMatch[1]
    } else {
      const cdnMatch = video_url.match(/b-cdn\.net\/([a-f0-9-]+)/i)
      if (cdnMatch) {
        videoId = cdnMatch[1]
      }
    }

    if (!videoId) {
      console.error('Could not extract video ID from URL:', video_url)
      return new Response(
        JSON.stringify({ error: 'Invalid video URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Extracted video ID: ${videoId}`)

    // Delete from Bunny
    const deleteResponse = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoId}`,
      {
        method: 'DELETE',
        headers: {
          'AccessKey': bunnyApiKey,
        },
      }
    )

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const errorText = await deleteResponse.text()
      console.error('Bunny delete error:', errorText)
      // Continue anyway to remove from database
    } else {
      console.log(`Video ${videoId} deleted from Bunny`)
    }

    // Get current raw_video_urls
    const { data: content, error: fetchError } = await supabase
      .from('content')
      .select('raw_video_urls')
      .eq('id', content_id)
      .single()

    if (fetchError) {
      console.error('Error fetching content:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove the URL from the array
    const currentUrls = content.raw_video_urls || []
    const updatedUrls = currentUrls.filter((url: string) => url !== video_url)

    console.log(`Updating raw_video_urls: ${currentUrls.length} -> ${updatedUrls.length}`)

    // Update the database
    const { error: updateError } = await supabase
      .from('content')
      .update({ 
        raw_video_urls: updatedUrls,
        updated_at: new Date().toISOString()
      })
      .eq('id', content_id)

    if (updateError) {
      console.error('Error updating content:', updateError)
      return new Response(
        JSON.stringify({ error: 'Error updating content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Video deleted successfully. Remaining URLs: ${updatedUrls.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        deleted_video_id: videoId,
        remaining_urls: updatedUrls
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Delete error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
