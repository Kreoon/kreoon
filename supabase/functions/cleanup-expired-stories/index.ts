import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Edge function to cleanup expired stories (older than 24 hours)
 * - Deletes the video from Bunny.net
 * - Removes the story record from the database
 * 
 * Can be called:
 * 1. Via cron job (scheduled)
 * 2. Manually by an admin
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY')
    const bunnyLibraryId = Deno.env.get('BUNNY_LIBRARY_ID')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('[cleanup-expired-stories] Starting cleanup...')

    // Find all expired stories
    const now = new Date().toISOString()
    const { data: expiredStories, error: fetchError } = await supabase
      .from('portfolio_stories')
      .select('id, user_id, media_url, media_type')
      .lt('expires_at', now)

    if (fetchError) {
      console.error('[cleanup-expired-stories] Error fetching expired stories:', fetchError)
      throw fetchError
    }

    if (!expiredStories || expiredStories.length === 0) {
      console.log('[cleanup-expired-stories] No expired stories found')
      return new Response(
        JSON.stringify({ success: true, deleted: 0, message: 'No expired stories' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[cleanup-expired-stories] Found ${expiredStories.length} expired stories`)

    let deletedFromBunny = 0
    let deletedFromDB = 0
    const errors: string[] = []

    for (const story of expiredStories) {
      try {
        // Extract video ID from Bunny URL
        const videoId = extractVideoId(story.media_url)
        
        // Delete from Bunny if it's a Bunny video
        if (videoId && bunnyApiKey && bunnyLibraryId) {
          console.log(`[cleanup-expired-stories] Deleting video ${videoId} from Bunny...`)
          
          const deleteResponse = await fetch(
            `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoId}`,
            {
              method: 'DELETE',
              headers: {
                'AccessKey': bunnyApiKey,
              },
            }
          )

          if (deleteResponse.ok || deleteResponse.status === 404) {
            deletedFromBunny++
            console.log(`[cleanup-expired-stories] Video ${videoId} deleted from Bunny`)
          } else {
            const errorText = await deleteResponse.text()
            console.error(`[cleanup-expired-stories] Bunny delete error for ${videoId}:`, errorText)
            errors.push(`Bunny delete failed for ${videoId}: ${errorText}`)
          }
        }

        // Delete from database
        const { error: deleteError } = await supabase
          .from('portfolio_stories')
          .delete()
          .eq('id', story.id)

        if (deleteError) {
          console.error(`[cleanup-expired-stories] DB delete error for story ${story.id}:`, deleteError)
          errors.push(`DB delete failed for ${story.id}: ${deleteError.message}`)
        } else {
          deletedFromDB++
          console.log(`[cleanup-expired-stories] Story ${story.id} deleted from DB`)
        }

      } catch (storyError) {
        const errorMsg = storyError instanceof Error ? storyError.message : 'Unknown error'
        console.error(`[cleanup-expired-stories] Error processing story ${story.id}:`, errorMsg)
        errors.push(`Error processing ${story.id}: ${errorMsg}`)
      }
    }

    console.log(`[cleanup-expired-stories] Cleanup complete. Bunny: ${deletedFromBunny}, DB: ${deletedFromDB}`)

    return new Response(
      JSON.stringify({
        success: true,
        total_expired: expiredStories.length,
        deleted_from_bunny: deletedFromBunny,
        deleted_from_db: deletedFromDB,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[cleanup-expired-stories] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Extract video ID from various Bunny URL formats
 */
function extractVideoId(url: string): string | null {
  if (!url) return null

  // Format: iframe.mediadelivery.net/embed/{libraryId}/{videoId}
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/\d+\/([a-f0-9-]+)/i)
  if (embedMatch) return embedMatch[1]

  // Format: vz-{hash}.b-cdn.net/{videoId}/...
  const cdnMatch = url.match(/b-cdn\.net\/([a-f0-9-]+)/i)
  if (cdnMatch) return cdnMatch[1]

  return null
}
