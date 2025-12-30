import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVENT_TYPE_PROMPTS: Record<string, string> = {
  informative: 'un evento informativo/educativo de streaming',
  shopping: 'un evento de live shopping/venta en directo',
  webinar: 'un webinar profesional',
  interview: 'una entrevista en vivo',
  entertainment: 'un evento de entretenimiento en vivo',
  educational: 'un evento educativo/formativo',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, eventType, clientName, product, keywords, currentTitle, currentDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const typeDesc = EVENT_TYPE_PROMPTS[eventType] || 'un evento de streaming';
    let prompt = '';

    switch (action) {
      case 'generate_event_content':
        prompt = `Genera un título atractivo y una descripción breve para ${typeDesc}.
${clientName ? `Cliente/Marca: ${clientName}` : ''}
${product ? `Producto/Tema: ${product}` : ''}
${keywords?.length ? `Palabras clave: ${keywords.join(', ')}` : ''}

Responde SOLO con un JSON válido con las claves "title" y "description". El título debe ser máximo 60 caracteres y la descripción máximo 200 caracteres. Deben ser llamativos y orientados a captar audiencia en español.

Ejemplo de respuesta:
{"title": "🔴 Ofertas Exclusivas en VIVO", "description": "Únete a nuestra transmisión y descubre productos increíbles con descuentos únicos. ¡No te lo pierdas!"}`;
        break;

      case 'improve_title':
        prompt = `Mejora este título para ${typeDesc}: "${currentTitle}"

El nuevo título debe ser más atractivo y llamativo, máximo 60 caracteres, en español.
Responde SOLO con un JSON válido: {"title": "tu título mejorado aquí"}`;
        break;

      case 'improve_description':
        prompt = `Mejora esta descripción para ${typeDesc}: "${currentDescription}"

La nueva descripción debe ser más atractiva y orientada a conversión, máximo 200 caracteres, en español.
Responde SOLO con un JSON válido: {"description": "tu descripción mejorada aquí"}`;
        break;

      default:
        throw new Error('Invalid action');
    }

    console.log('Sending prompt to Lovable AI:', prompt);

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Eres un experto en marketing digital y creación de contenido para streaming en vivo. Siempre respondes en español con contenido atractivo y profesional. SOLO respondes con JSON válido, sin texto adicional.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        console.error('Payment required');
        return new Response(JSON.stringify({ error: 'Payment required, please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI Response content:', content);

    // Parse JSON from response
    let result = {};
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback to basic content
      if (action === 'generate_event_content') {
        result = {
          title: `🔴 Live: ${clientName || eventType}`.substring(0, 60),
          description: `Únete a nuestra transmisión en vivo. ¡No te lo pierdas!`,
        };
      } else if (action === 'improve_title') {
        result = { title: `🔴 ${currentTitle}`.substring(0, 60) };
      } else {
        result = { description: `¡No te pierdas! ${currentDescription}`.substring(0, 200) };
      }
    }

    console.log('Final result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in streaming-ai-generate:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
