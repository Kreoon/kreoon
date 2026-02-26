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
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Webhook secret validation — n8n must send ?secret=<BUNNY_WEBHOOK_SECRET> or
    // the X-Webhook-Secret header. This prevents unauthorized callers from updating
    // arbitrary content records via this public endpoint.
    const webhookSecret = Deno.env.get('BUNNY_WEBHOOK_SECRET')
    if (webhookSecret) {
      const url = new URL(req.url)
      const providedSecret = url.searchParams.get('secret') || req.headers.get('x-webhook-secret')
      if (providedSecret !== webhookSecret) {
        console.error('[bunny-webhook] Invalid or missing webhook secret')
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const body = await req.json()
    console.log('Received webhook from n8n:', body)

    const { content_id, bunny_embed_url, status, error_message } = body

    if (!content_id) {
      console.error('Missing content_id in webhook payload')
      return new Response(
        JSON.stringify({ error: 'Missing content_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate bunny_embed_url is actually a Bunny CDN URL to prevent URL injection
    if (bunny_embed_url && !bunny_embed_url.includes('mediadelivery.net') && !bunny_embed_url.includes('bunnycdn.com')) {
      console.error('[bunny-webhook] Rejected non-Bunny URL:', bunny_embed_url)
      return new Response(
        JSON.stringify({ error: 'Invalid embed URL — must be a Bunny CDN URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (status === 'completed' && bunny_embed_url) {
      // Actualizar con el embed de Bunny
      const { error } = await supabase
        .from('content')
        .update({
          bunny_embed_url: bunny_embed_url,
          video_processing_status: 'completed',
          video_url: bunny_embed_url, // También actualizar video_url para compatibilidad
        })
        .eq('id', content_id)

      if (error) {
        console.error('Error updating content:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update content' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Content ${content_id} updated with Bunny embed: ${bunny_embed_url}`)
    } else if (status === 'failed') {
      // Marcar como fallido
      const { error } = await supabase
        .from('content')
        .update({
          video_processing_status: 'failed',
        })
        .eq('id', content_id)

      if (error) {
        console.error('Error updating content status:', error)
      }

      console.error(`Video processing failed for ${content_id}: ${error_message}`)
    } else if (status === 'processing') {
      // Actualizar estado a procesando
      const { error } = await supabase
        .from('content')
        .update({
          video_processing_status: 'processing',
        })
        .eq('id', content_id)

      if (error) {
        console.error('Error updating content status:', error)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
