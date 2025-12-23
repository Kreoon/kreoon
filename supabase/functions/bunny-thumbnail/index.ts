import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
}

function extractVideoId(videoUrl: string): string | null {
  if (!videoUrl) return null
  // Embed: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
  const embedMatch = videoUrl.match(/iframe\.mediadelivery\.net\/embed\/\d+\/([a-f0-9-]+)/i)
  if (embedMatch) return embedMatch[1]

  // CDN: https://vz-xxxx.b-cdn.net/{videoId}/...
  const cdnMatch = videoUrl.match(/b-cdn\.net\/([a-f0-9-]+)/i)
  if (cdnMatch) return cdnMatch[1]

  return null
}

function extractLibraryId(videoUrl: string): string | null {
  if (!videoUrl) return null
  const match = videoUrl.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/[a-f0-9-]+/i)
  return match?.[1] ?? null
}

async function fetchFirstOk(urls: string[]): Promise<{ response: Response; url: string } | null> {
  for (const url of urls) {
    try {
      console.log(`[bunny-thumbnail] Trying: ${url}`)
      const res = await fetch(url, { redirect: 'follow' })
      console.log(`[bunny-thumbnail] Response status for ${url}: ${res.status}`)
      if (res.ok) {
        console.log(`[bunny-thumbnail] Success: ${url}`)
        return { response: res, url }
      }
    } catch (err) {
      console.log(`[bunny-thumbnail] Error fetching ${url}:`, err)
    }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const contentId = url.searchParams.get('content_id')
    const videoIdParam = url.searchParams.get('video_id')

    console.log(`[bunny-thumbnail] Request: content_id=${contentId}, video_id=${videoIdParam}`)

    if (!contentId || !videoIdParam) {
      return new Response('Missing content_id or video_id', { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const bunnyCdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME')
    const bunnyLibraryId = Deno.env.get('BUNNY_LIBRARY_ID')

    console.log(`[bunny-thumbnail] CDN hostname: ${bunnyCdnHostname}, Library ID: ${bunnyLibraryId}`)

    if (!bunnyCdnHostname) {
      console.error('[bunny-thumbnail] BUNNY_CDN_HOSTNAME not configured')
      return new Response('Bunny CDN not configured', { status: 500, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Ensure the requested video_id actually belongs to the requested content
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('video_url, video_urls')
      .eq('id', contentId)
      .single()

    if (contentError || !content) {
      console.error('[bunny-thumbnail] Content not found:', contentError)
      return new Response('Content not found', { status: 404, headers: corsHeaders })
    }

    const urls: string[] = []
    if (content.video_url) urls.push(content.video_url)
    if (Array.isArray(content.video_urls)) urls.push(...content.video_urls)

    console.log(`[bunny-thumbnail] Found ${urls.length} video URLs in content`)

    const allowedIds = new Set(urls.map((u) => extractVideoId(u)).filter(Boolean) as string[])
    console.log(`[bunny-thumbnail] Allowed video IDs:`, Array.from(allowedIds))

    if (!allowedIds.has(videoIdParam)) {
      console.error(`[bunny-thumbnail] Video ID ${videoIdParam} not in allowed list`)
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    // Extract library ID from URLs or use env var
    const libraryIdFromUrl = urls.map((u) => extractLibraryId(u)).find(Boolean) as string | undefined
    const libraryId = libraryIdFromUrl || bunnyLibraryId

    console.log(`[bunny-thumbnail] Using library ID: ${libraryId}`)

    // Build candidate URLs - try multiple patterns
    const candidateUrls: string[] = []

    // Pattern 1: Mediadelivery embed thumbnail (most reliable)
    if (libraryId) {
      candidateUrls.push(`https://vz-${bunnyCdnHostname.split('.')[0].replace('vz-', '')}.b-cdn.net/${videoIdParam}/thumbnail.jpg`)
    }

    // Pattern 2: CDN hostname variants
    candidateUrls.push(
      `https://${bunnyCdnHostname}/${videoIdParam}/thumbnail.jpg`,
      `https://${bunnyCdnHostname}/${videoIdParam}/thumbnail_1.jpg`,
      `https://${bunnyCdnHostname}/${videoIdParam}/thumbnail_2.jpg`,
      `https://${bunnyCdnHostname}/${videoIdParam}/preview.jpg`,
      `https://${bunnyCdnHostname}/${videoIdParam}/preview.webp`,
    )

    // Pattern 3: Direct video.bunnycdn.com pattern
    candidateUrls.push(
      `https://video.bunnycdn.com/play/${libraryId || '568434'}/${videoIdParam}/thumbnail.jpg`,
    )

    console.log(`[bunny-thumbnail] Trying ${candidateUrls.length} candidate URLs`)

    const result = await fetchFirstOk(candidateUrls)
    if (!result) {
      console.error('[bunny-thumbnail] No thumbnail found from any candidate URL')
      return new Response('Thumbnail not found - video may still be processing', { status: 404, headers: corsHeaders })
    }

    const contentType = result.response.headers.get('content-type') || 'image/jpeg'
    const cacheControl = result.response.headers.get('cache-control') || 'public, max-age=86400, stale-while-revalidate=604800'

    console.log(`[bunny-thumbnail] Returning thumbnail from: ${result.url}`)

    return new Response(result.response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[bunny-thumbnail] Error:', message)
    return new Response(message, { status: 500, headers: corsHeaders })
  }
})
