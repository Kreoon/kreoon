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
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    console.log('Received drive upload notification:', body)

    const { content_id, drive_url } = body

    if (!content_id || !drive_url) {
      return new Response(
        JSON.stringify({ error: 'Missing content_id or drive_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Actualizar estado a pending
    const { error: updateError } = await supabase
      .from('content')
      .update({
        video_processing_status: 'pending',
        video_processing_started_at: new Date().toISOString(),
      })
      .eq('id', content_id)

    if (updateError) {
      console.error('Error updating content status:', updateError)
    }

    // Obtener información del contenido para enviar a n8n
    const { data: content, error: fetchError } = await supabase
      .from('content')
      .select('id, title, drive_url, client_id')
      .eq('id', content_id)
      .single()

    if (fetchError || !content) {
      console.error('Error fetching content:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enviar a n8n si está configurado
    if (n8nWebhookUrl) {
      try {
        const n8nPayload = {
          content_id: content.id,
          title: content.title,
          drive_url: drive_url,
          client_id: content.client_id,
          callback_url: `${supabaseUrl}/functions/v1/bunny-webhook`,
          timestamp: new Date().toISOString(),
        }

        console.log('Sending to n8n:', n8nPayload)

        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(n8nPayload),
        })

        if (!n8nResponse.ok) {
          console.error('n8n webhook failed:', await n8nResponse.text())
        } else {
          console.log('Successfully notified n8n')
        }
      } catch (n8nError) {
        console.error('Error calling n8n webhook:', n8nError)
        // No fallar la request, solo loguear el error
      }
    } else {
      console.log('N8N_WEBHOOK_URL not configured, skipping n8n notification')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Drive upload notification processed',
        n8n_configured: !!n8nWebhookUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in notify-drive-upload:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
