import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GHLSyncPayload {
  event_type: 'new_client' | 'new_lead' | 'content_approved' | 'payment_created' | 'content_delivered' | 'custom' | 'test';
  data: Record<string, any>;
  webhook_url?: string;
  location_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: GHLSyncPayload = await req.json();
    console.log('[ghl-sync] Received sync request:', payload.event_type);

    // Get webhook URL and location ID from payload or environment
    let webhookUrl = payload.webhook_url || Deno.env.get('GHL_WEBHOOK_URL');
    let locationId = payload.location_id || Deno.env.get('GHL_LOCATION_ID');

    // If not in payload or env, try to get from app_settings
    if (!webhookUrl || !locationId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: settings } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['ghl_webhook_url', 'ghl_location_id']);

      if (settings) {
        settings.forEach((s: { key: string; value: string }) => {
          if (s.key === 'ghl_webhook_url' && !webhookUrl) webhookUrl = s.value;
          if (s.key === 'ghl_location_id' && !locationId) locationId = s.value;
        });
      }
    }

    if (!webhookUrl) {
      console.error('[ghl-sync] GHL_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'URL del webhook no configurada. Por favor ingresa la URL en Configuración → Integraciones → Funnel ROI.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ghl-sync] Using webhook URL:', webhookUrl);
    console.log('[ghl-sync] Using location ID:', locationId || '(not set)');

    // Handle test connection request
    if (payload.event_type === 'test') {
      console.log('[ghl-sync] Sending test connection to GHL');
      
      // Send a complete test payload with all fields that GHL can map
      const testPayload = {
        // Location identifier
        locationId: locationId,
        
        // Contact fields - these are the main fields GHL uses for mapping
        firstName: 'Test',
        lastName: 'CreartorStudio',
        name: 'Test CreartorStudio',
        email: 'test@creartorstudio.ugc.com',
        phone: '+573001234567',
        companyName: 'Creartor Studio Test',
        
        // Source tracking
        source: 'Creartor Studio',
        type: 'contact',
        
        // Tags for segmentation
        tags: ['Test Connection', 'Creartor Studio'],
        
        // Timestamp
        timestamp: new Date().toISOString(),
        dateAdded: new Date().toISOString(),
        
        // Custom fields that can be mapped
        customField: {
          platform: 'Creartor Studio',
          client_id: 'test-client-123',
          user_id: 'test-user-456',
          content_id: 'test-content-789',
          test_connection: true,
          instagram: '@test_creartor',
          tiktok: '@test_creartor',
          city: 'Bogotá',
          country: 'Colombia'
        },
        
        // Additional fields for different event types
        monetaryValue: 1000000,
        currency: 'COP',
        status: 'open',
        title: 'Test Contenido',
        body: 'Este es un mensaje de prueba desde Creartor Studio para verificar la conexión con Funnel ROI.',
        notes: 'Conexión de prueba exitosa desde Creartor Studio'
      };

      console.log('[ghl-sync] Test payload:', JSON.stringify(testPayload));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      const responseText = await response.text();
      console.log('[ghl-sync] Test response status:', response.status);
      console.log('[ghl-sync] Test response body:', responseText);

      // GHL webhooks often return empty response on success
      if (response.ok || response.status === 200) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Datos de prueba enviados a Funnel ROI. Ahora puedes mapear los campos en tu workflow.',
            status: response.status,
            fields_sent: [
              'firstName', 'lastName', 'name', 'email', 'phone', 'companyName',
              'tags', 'customField.*', 'monetaryValue', 'currency', 'title', 'body'
            ]
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `GHL respondió con error ${response.status}`,
          details: responseText 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ghl-sync] Data:', JSON.stringify(payload.data));

    // Map the event to GHL format
    let ghlPayload: Record<string, any> = {
      locationId: locationId,
      source: 'Creartor Studio',
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

    console.log('[ghl-sync] Sending to GHL:', JSON.stringify(ghlPayload));

    // Send to GHL webhook
    const ghlResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ghlPayload),
    });

    const responseText = await ghlResponse.text();
    console.log('[ghl-sync] GHL Response:', ghlResponse.status, responseText);

    if (!ghlResponse.ok) {
      console.error('[ghl-sync] GHL webhook error:', responseText);
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
    console.error('[ghl-sync] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
