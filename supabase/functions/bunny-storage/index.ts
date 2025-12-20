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
    const storageZone = Deno.env.get('BUNNY_STORAGE_ZONE')!
    const storagePassword = Deno.env.get('BUNNY_STORAGE_PASSWORD')!
    const cdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const contentType = req.headers.get('content-type') || ''
    
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Expected multipart/form-data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const contentId = formData.get('content_id') as string
    const fileType = formData.get('file_type') as string || 'raw_video' // raw_video, thumbnail, etc.

    if (!file || !contentId) {
      return new Response(
        JSON.stringify({ error: 'Missing file or content_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Uploading ${fileType} for content ${contentId}: ${file.name}`)

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'mp4'
    const fileName = `${contentId}/${fileType}_${timestamp}.${extension}`

    // Upload to Bunny Storage
    const fileBuffer = await file.arrayBuffer()
    const uploadResponse = await fetch(
      `https://storage.bunnycdn.com/${storageZone}/${fileName}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': storagePassword,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: fileBuffer,
      }
    )

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Bunny Storage upload error:', errorText)
      throw new Error(`Failed to upload to Bunny Storage: ${errorText}`)
    }

    // Generate CDN URL for the file
    const cdnUrl = `https://${cdnHostname}/${fileName}`
    console.log(`File uploaded successfully: ${cdnUrl}`)

    // Update content based on file type
    let updateData: Record<string, any> = {}
    
    if (fileType === 'raw_video') {
      updateData = {
        drive_url: cdnUrl, // Reuse drive_url field for raw video
        video_processing_status: 'uploaded',
      }
    } else if (fileType === 'thumbnail') {
      updateData = { thumbnail_url: cdnUrl }
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('content')
        .update(updateData)
        .eq('id', contentId)

      if (updateError) {
        console.error('Error updating content:', updateError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: cdnUrl,
        file_name: fileName,
        file_type: fileType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Storage upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
