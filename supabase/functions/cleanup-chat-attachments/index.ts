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
    const bunnyStorageZone = Deno.env.get('BUNNY_STORAGE_ZONE')
    const bunnyStoragePassword = Deno.env.get('BUNNY_STORAGE_PASSWORD')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting chat attachment cleanup...')

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
      console.log('No expired attachments found')
      return new Response(
        JSON.stringify({ success: true, deleted: 0, message: 'No expired files found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${expired.length} expired attachments to delete`)

    let deletedCount = 0
    let failedCount = 0

    for (const attachment of expired) {
      try {
        // Determine storage type from path
        const isBunnyStorage = attachment.storage_path.startsWith('chat/')

        if (isBunnyStorage && bunnyStorageZone && bunnyStoragePassword) {
          // Delete from Bunny Storage
          const deleteResponse = await fetch(
            `https://storage.bunnycdn.com/${bunnyStorageZone}/${attachment.storage_path}`,
            {
              method: 'DELETE',
              headers: { 'AccessKey': bunnyStoragePassword }
            }
          )

          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            console.error(`Failed to delete from Bunny: ${attachment.storage_path}`)
            failedCount++
            continue
          }
        } else {
          // Delete from Supabase Storage (legacy)
          const { error: storageError } = await supabase.storage
            .from('chat-attachments')
            .remove([attachment.storage_path])

          if (storageError) {
            console.error(`Failed to delete from Supabase Storage: ${attachment.storage_path}`, storageError)
            // Continue anyway to clean up metadata
          }
        }

        // Clear attachment URL in message if exists
        if (attachment.message_id) {
          const { error: updateError } = await supabase
            .from('chat_messages')
            .update({ 
              attachment_url: null, 
              attachment_type: null, 
              attachment_name: '[Archivo expirado]', 
              attachment_size: null 
            })
            .eq('id', attachment.message_id)

          if (updateError) {
            console.error(`Failed to update message ${attachment.message_id}:`, updateError)
          }
        }

        // Delete metadata record
        const { error: deleteError } = await supabase
          .from('chat_attachment_metadata')
          .delete()
          .eq('id', attachment.id)

        if (deleteError) {
          console.error(`Failed to delete metadata for ${attachment.id}:`, deleteError)
          failedCount++
        } else {
          deletedCount++
          console.log(`Deleted: ${attachment.storage_path}`)
        }
      } catch (err) {
        console.error(`Error processing ${attachment.storage_path}:`, err)
        failedCount++
      }
    }

    console.log(`Cleanup complete: ${deletedCount} deleted, ${failedCount} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: deletedCount, 
        failed: failedCount,
        total: expired.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Cleanup error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})