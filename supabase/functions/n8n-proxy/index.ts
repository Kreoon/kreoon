import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookUrl, payload } = await req.json();

    console.log("=== n8n Proxy Request ===");
    console.log("Webhook URL:", webhookUrl);
    console.log("Payload:", JSON.stringify(payload).substring(0, 500));

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: "webhookUrl is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call n8n webhook from server (no CORS issues)
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("n8n response status:", n8nResponse.status);
    
    const responseText = await n8nResponse.text();
    console.log("n8n response length:", responseText.length);
    console.log("n8n response preview:", responseText.substring(0, 500));

    if (!n8nResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: `n8n returned ${n8nResponse.status}`, 
          details: responseText 
        }),
        { status: n8nResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!responseText || responseText.trim() === "") {
      return new Response(
        JSON.stringify({ error: "n8n returned empty response" }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log("Response is not JSON, wrapping as text result");
      // If not JSON, wrap the text response in a structured format
      // This allows n8n workflows to return plain text and still work
      data = {
        bloques_html: {
          guion: responseText.trim()
        },
        raw_text: responseText.trim(),
        is_text_response: true
      };
    }

    console.log("=== n8n Proxy Success ===");

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Proxy error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
