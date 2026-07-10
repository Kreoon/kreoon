import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ZipWriter, BlobWriter, Uint8ArrayReader } from 'https://esm.sh/@zip.js/zip.js@2.7.32'

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
    const bunnyCdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME') || ''
    
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
    const { items } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing items array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating ZIP with ${items.length} videos`)

    // Check user roles from organization_member_roles
    const { data: userRoles } = await supabase
      .from('organization_member_roles')
      .select('role')
      .eq('user_id', user.id)

    const roles = userRoles?.map(r => r.role) || []
    const isAdmin = roles.includes('admin')
    const isEditor = roles.includes('editor')
    const isCreator = roles.includes('creator')

    // Check if user is a client via client_users
    const { data: clientUserData } = await supabase
      .from('client_users')
      .select('client_id')
      .eq('user_id', user.id)

    const clientIds = new Set((clientUserData || []).map(c => c.client_id))
    const isClient = clientIds.size > 0

    if (!isAdmin && !isEditor && !isCreator && !isClient) {
      return new Response(
        JSON.stringify({ error: 'No tiene permiso para descargar estos videos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Un cliente solo puede descargar contenido propio en estados aprobados/pagados
    const approvedStatuses = ['approved', 'paid', 'delivered', 'corrected', 'archived']

    // Create ZIP file
    const blobWriter = new BlobWriter('application/zip')
    const zipWriter = new ZipWriter(blobWriter)

    let successCount = 0
    const errors: string[] = []

    for (let i = 0; i < items.length; i++) {
      const { content_id, video_url: videoUrl, title: itemTitle } = items[i] || {}

      if (!content_id || !videoUrl) {
        errors.push(`Video ${i + 1}: falta content_id o video_url`)
        continue
      }

      try {
        // Check permissions per item
        const { data: content, error: contentError } = await supabase
          .from('content')
          .select('id, status, client_id, title')
          .eq('id', content_id)
          .single()

        if (contentError || !content) {
          errors.push(`Video ${i + 1}: contenido no encontrado`)
          continue
        }

        const canAccessItem = isAdmin || isEditor || isCreator ||
          (isClient && content.client_id && clientIds.has(content.client_id) && approvedStatuses.includes(content.status))

        if (!canAccessItem) {
          errors.push(`Video ${i + 1}: sin permiso para descargar`)
          continue
        }

        // Extract video ID from URL
        let videoId = ''
        const embedMatch = videoUrl.match(/\/embed\/[^/]+\/([^/?]+)/)
        if (embedMatch) {
          videoId = embedMatch[1]
        } else {
          const cdnMatch = videoUrl.match(/b-cdn\.net\/([a-f0-9-]+)/i)
          if (cdnMatch) {
            videoId = cdnMatch[1]
          }
        }

        if (!videoId) {
          console.log(`Could not extract video ID from: ${videoUrl}`)
          errors.push(`Video ${i + 1}: formato de URL no válido`)
          continue
        }

        // Get video info from Bunny
        const videoResponse = await fetch(
          `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoId}`,
          { headers: { 'AccessKey': bunnyApiKey } }
        )

        if (!videoResponse.ok) {
          console.log(`Bunny API error for video ${videoId}: ${videoResponse.status}`)
          errors.push(`Video ${i + 1}: error al obtener información`)
          continue
        }

        const videoData = await videoResponse.json()
        
        // Build download URL
        let downloadUrl = ''
        if (bunnyCdnHostname && bunnyCdnHostname !== 'vz-f0f0f0f0-f0f.b-cdn.net') {
          downloadUrl = `https://${bunnyCdnHostname}/${videoId}/play_720p.mp4`
        } else {
          downloadUrl = `https://vz-${bunnyLibraryId}.b-cdn.net/${videoId}/play_720p.mp4`
        }

        console.log(`Downloading video ${i + 1}: ${downloadUrl}`)

        // Download video content
        const videoContentResponse = await fetch(downloadUrl)
        if (!videoContentResponse.ok) {
          // Try original quality
          const originalUrl = downloadUrl.replace('play_720p.mp4', 'original')
          const originalResponse = await fetch(originalUrl)
          if (!originalResponse.ok) {
            console.log(`Failed to download video ${videoId}`)
            errors.push(`Video ${i + 1}: error al descargar`)
            continue
          }
          
          const videoBytes = new Uint8Array(await originalResponse.arrayBuffer())
          const fileName = `${itemTitle || videoData.title || `video_${i + 1}`}.mp4`
          await zipWriter.add(fileName, new Uint8ArrayReader(videoBytes))
          successCount++
        } else {
          const videoBytes = new Uint8Array(await videoContentResponse.arrayBuffer())
          const fileName = `${itemTitle || videoData.title || `video_${i + 1}`}.mp4`
          await zipWriter.add(fileName, new Uint8ArrayReader(videoBytes))
          successCount++
        }

        console.log(`Added video ${i + 1} to ZIP: ${itemTitle || videoData.title || `video_${i + 1}`}`)

      } catch (error) {
        console.error(`Error processing video ${i + 1}:`, error)
        errors.push(`Video ${i + 1}: ${error instanceof Error ? error.message : 'error desconocido'}`)
      }
    }

    if (successCount === 0) {
      return new Response(
        JSON.stringify({ error: 'No se pudo descargar ningún video', details: errors }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await zipWriter.close()
    const zipBlob = await blobWriter.getData()
    const zipArrayBuffer = await zipBlob.arrayBuffer()
    const zipBase64 = btoa(String.fromCharCode(...new Uint8Array(zipArrayBuffer)))

    console.log(`ZIP created successfully: ${successCount}/${items.length} videos, size: ${zipArrayBuffer.byteLength} bytes`)

    return new Response(
      JSON.stringify({
        success: true,
        zip_data: zipBase64,
        filename: `videos_${new Date().toISOString().split('T')[0]}.zip`,
        videos_included: successCount,
        total_videos: items.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('ZIP creation error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
