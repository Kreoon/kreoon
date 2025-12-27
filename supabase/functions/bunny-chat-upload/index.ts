import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-file-name, x-file-type, x-conversation-id',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY')!
    const bunnyStorageZone = Deno.env.get('BUNNY_STORAGE_ZONE')!
    const bunnyStoragePassword = Deno.env.get('BUNNY_STORAGE_PASSWORD')!
    const bunnyCdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME')!
    const bunnyStorageHostname = Deno.env.get('BUNNY_STORAGE_HOSTNAME') || 'storage.bunnycdn.com'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header to identify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    
    // ========== DELETE: Remove expired files ==========
    if (req.method === 'DELETE') {
      console.log('Cleanup request received')
      
      // Get expired attachments
      const { data: expired, error: fetchError } = await supabase
        .from('chat_attachment_metadata')
        .select('id, storage_path, message_id')
        .lt('expires_at', new Date().toISOString())
      
      if (fetchError) {
        console.error('Error fetching expired attachments:', fetchError)
        throw fetchError
      }

      if (!expired || expired.length === 0) {
        return new Response(
          JSON.stringify({ success: true, deleted: 0, message: 'No expired files found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Found ${expired.length} expired attachments to delete`)

      let deletedCount = 0
      for (const attachment of expired) {
        try {
          // Delete from Bunny Storage
          const deleteResponse = await fetch(
            `https://${bunnyStorageHostname}/${bunnyStorageZone}/${attachment.storage_path}`,
            {
              method: 'DELETE',
              headers: { 'AccessKey': bunnyStoragePassword }
            }
          )

          if (deleteResponse.ok || deleteResponse.status === 404) {
            // Clear attachment URL in message if exists
            if (attachment.message_id) {
              await supabase
                .from('chat_messages')
                .update({ 
                  attachment_url: null, 
                  attachment_type: null, 
                  attachment_name: null, 
                  attachment_size: null 
                })
                .eq('id', attachment.message_id)
            }

            // Delete metadata record
            await supabase
              .from('chat_attachment_metadata')
              .delete()
              .eq('id', attachment.id)
            
            deletedCount++
            console.log(`Deleted: ${attachment.storage_path}`)
          }
        } catch (err) {
          console.error(`Failed to delete ${attachment.storage_path}:`, err)
        }
      }

      return new Response(
        JSON.stringify({ success: true, deleted: deletedCount, total: expired.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== POST/PUT: Upload file ==========
    const conversationId = url.searchParams.get('conversation_id') || req.headers.get('x-conversation-id')
    const fileName = url.searchParams.get('file_name') || req.headers.get('x-file-name') || 'file'
    const fileType = url.searchParams.get('file_type') || req.headers.get('x-file-type') || 'application/octet-stream'

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'Missing conversation_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is participant in conversation
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (participantError || !participant) {
      return new Response(
        JSON.stringify({ error: 'Not a participant in this conversation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let fileData: ArrayBuffer
    let originalFileName = fileName
    let mimeType = fileType
    let fileSize = 0

    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'Missing file in form data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      fileData = await file.arrayBuffer()
      originalFileName = file.name
      mimeType = file.type
      fileSize = file.size
    } else {
      if (!req.body) {
        return new Response(
          JSON.stringify({ error: 'Missing request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      fileData = await req.arrayBuffer()
      fileSize = fileData.byteLength
    }

    // Check file size limit (200MB)
    const maxSize = 200 * 1024 * 1024
    if (fileSize > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 200MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Uploading chat attachment: ${originalFileName} (${fileSize} bytes) for conversation ${conversationId}`)

    // Generate unique path with user ID and conversation ID
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 9)
    const fileExtension = originalFileName.split('.').pop() || 'bin'
    const storagePath = `chat/${user.id}/${conversationId}/${timestamp}-${randomId}.${fileExtension}`

    // Upload to Bunny Storage (using regional hostname)
    const uploadResponse = await fetch(
      `https://${bunnyStorageHostname}/${bunnyStorageZone}/${storagePath}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': bunnyStoragePassword,
          'Content-Type': mimeType,
        },
        body: fileData,
      }
    )

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Bunny Storage upload error:', uploadResponse.status, errorText)

      if (uploadResponse.status === 401) {
        return new Response(
          JSON.stringify({
            error: 'Bunny Storage Unauthorized. Revisa credenciales de Bunny Storage.',
            details: {
              hint: 'Verifica que BUNNY_STORAGE_ZONE sea el nombre exacto de la Storage Zone y que BUNNY_STORAGE_PASSWORD sea la Storage Password (no la API Key general).'
            }
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      throw new Error(`Failed to upload to Bunny Storage: ${errorText}`)
    }

    // Generate CDN URL
    const cdnUrl = `https://${bunnyCdnHostname}/${storagePath}`
    console.log(`File uploaded successfully: ${cdnUrl}`)

    // Calculate expiration (8 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 8)

    // Store metadata for auto-cleanup
    const { error: metadataError } = await supabase
      .from('chat_attachment_metadata')
      .insert({
        storage_path: storagePath,
        uploaded_by: user.id,
        file_size: fileSize,
        file_type: mimeType,
        expires_at: expiresAt.toISOString()
      })

    if (metadataError) {
      console.error('Error storing metadata:', metadataError)
      // Continue anyway, file is uploaded
    }

    // Determine attachment type for message
    let attachmentType = 'file'
    if (mimeType.startsWith('image/')) attachmentType = 'image'
    else if (mimeType.startsWith('video/')) attachmentType = 'video'
    else if (mimeType.startsWith('audio/')) attachmentType = 'audio'

    return new Response(
      JSON.stringify({
        success: true,
        url: cdnUrl,
        name: originalFileName,
        type: attachmentType,
        mime_type: mimeType,
        size: fileSize,
        expires_at: expiresAt.toISOString(),
        storage_path: storagePath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Chat attachment error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
