import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GHLSyncPayload {
  event_type: 'new_client' | 'new_lead' | 'content_approved' | 'payment_created' | 'content_delivered' | 'custom';
  data: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GHL_WEBHOOK_URL = Deno.env.get('GHL_WEBHOOK_URL');
    const GHL_LOCATION_ID = Deno.env.get('GHL_LOCATION_ID');

    if (!GHL_WEBHOOK_URL) {
      console.error('GHL_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ error: 'GHL webhook URL not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: GHLSyncPayload = await req.json();
    console.log('Received sync request:', payload.event_type);
    console.log('Data:', JSON.stringify(payload.data));

    // Map the event to GHL format
    let ghlPayload: Record<string, any> = {
      locationId: GHL_LOCATION_ID,
      source: 'UGC Platform',
      timestamp: new Date().toISOString(),
    };

    switch (payload.event_type) {
      case 'new_client':
        ghlPayload = {
          ...ghlPayload,
          type: 'contact',
          firstName: payload.data.name?.split(' ')[0] || payload.data.name,
          lastName: payload.data.name?.split(' ').slice(1).join(' ') || '',
          email: payload.data.contact_email,
          phone: payload.data.contact_phone,
          companyName: payload.data.name,
          tags: ['Cliente UGC', 'Nuevo Cliente'],
          customField: {
            client_id: payload.data.id,
            instagram: payload.data.instagram,
            tiktok: payload.data.tiktok,
            is_vip: payload.data.is_vip,
          },
        };
        break;

      case 'new_lead':
        ghlPayload = {
          ...ghlPayload,
          type: 'contact',
          firstName: payload.data.full_name?.split(' ')[0] || payload.data.full_name,
          lastName: payload.data.full_name?.split(' ').slice(1).join(' ') || '',
          email: payload.data.email,
          phone: payload.data.phone,
          tags: ['Lead UGC', payload.data.role || 'Prospecto'],
          customField: {
            user_id: payload.data.id,
            city: payload.data.city,
            instagram: payload.data.instagram,
          },
        };
        break;

      case 'content_approved':
        ghlPayload = {
          ...ghlPayload,
          type: 'note',
          contactId: payload.data.client_id,
          title: `Contenido Aprobado: ${payload.data.title}`,
          body: `El contenido "${payload.data.title}" ha sido aprobado.\n\nDetalles:\n- Estado: ${payload.data.status}\n- Creador: ${payload.data.creator_name || 'N/A'}\n- Producto: ${payload.data.product || 'N/A'}`,
          tags: ['Contenido Aprobado'],
          customField: {
            content_id: payload.data.id,
            content_title: payload.data.title,
            approved_at: payload.data.approved_at,
          },
        };
        break;

      case 'content_delivered':
        ghlPayload = {
          ...ghlPayload,
          type: 'note',
          contactId: payload.data.client_id,
          title: `Contenido Entregado: ${payload.data.title}`,
          body: `El contenido "${payload.data.title}" ha sido entregado.\n\nDetalles:\n- Creador: ${payload.data.creator_name || 'N/A'}\n- Producto: ${payload.data.product || 'N/A'}\n- URL: ${payload.data.video_url || 'N/A'}`,
          tags: ['Contenido Entregado'],
          customField: {
            content_id: payload.data.id,
            delivered_at: payload.data.delivered_at,
          },
        };
        break;

      case 'payment_created':
        ghlPayload = {
          ...ghlPayload,
          type: 'opportunity',
          title: `Pago: ${payload.data.payment_type}`,
          monetaryValue: payload.data.amount,
          currency: payload.data.currency || 'COP',
          status: payload.data.status === 'paid' ? 'won' : 'open',
          tags: ['Pago UGC'],
          customField: {
            payment_id: payload.data.id,
            payment_type: payload.data.payment_type,
            user_id: payload.data.user_id,
            content_id: payload.data.content_id,
          },
        };
        break;

      case 'custom':
        ghlPayload = {
          ...ghlPayload,
          ...payload.data,
        };
        break;

      default:
        ghlPayload = {
          ...ghlPayload,
          type: 'custom',
          data: payload.data,
        };
    }

    console.log('Sending to GHL:', JSON.stringify(ghlPayload));

    // Send to GHL webhook
    const ghlResponse = await fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ghlPayload),
    });

    const responseText = await ghlResponse.text();
    console.log('GHL Response:', ghlResponse.status, responseText);

    if (!ghlResponse.ok) {
      console.error('GHL webhook error:', responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'GHL webhook failed',
          status: ghlResponse.status,
          details: responseText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_type: payload.event_type,
        message: 'Data synced to GHL successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in GHL sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
