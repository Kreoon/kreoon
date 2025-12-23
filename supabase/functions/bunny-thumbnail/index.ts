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

async function fetchFirstOk(urls: string[]): Promise<Response | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (res.ok) return res
    } catch {
      // ignore
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

    if (!contentId || !videoIdParam) {
      return new Response('Missing content_id or video_id', { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const bunnyCdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME')

    if (!bunnyCdnHostname) {
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
      return new Response('Content not found', { status: 404, headers: corsHeaders })
    }

    const urls: string[] = []
    if (content.video_url) urls.push(content.video_url)
    if (Array.isArray(content.video_urls)) urls.push(...content.video_urls)

    const allowedIds = new Set(urls.map((u) => extractVideoId(u)).filter(Boolean) as string[])

    if (!allowedIds.has(videoIdParam)) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    // Try common Bunny thumbnail paths
    const libraryId = urls.map((u) => extractLibraryId(u)).find(Boolean) as string | undefined

    const candidateUrls = [
      // Mediadelivery embed thumbnail (often available even when CDN preview isn't)
      ...(libraryId ? [`https://iframe.mediadelivery.net/embed/${libraryId}/${videoIdParam}/thumbnail.jpg`] : []),

      // Bunny Stream CDN variants
      `https://${bunnyCdnHostname}/${videoIdParam}/thumbnail.jpg`,
      `https://${bunnyCdnHostname}/${videoIdParam}/thumbnail_1.jpg`,
      `https://${bunnyCdnHostname}/${videoIdParam}/thumbnail_2.jpg`,
      `https://${bunnyCdnHostname}/${videoIdParam}/preview.jpg`,
      `https://${bunnyCdnHostname}/${videoIdParam}/preview.webp`,
    ]

    const upstream = await fetchFirstOk(candidateUrls)
    if (!upstream) {
      return new Response('Thumbnail not found', { status: 404, headers: corsHeaders })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=86400, stale-while-revalidate=604800'

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return new Response(message, { status: 500, headers: corsHeaders })
  }
})
