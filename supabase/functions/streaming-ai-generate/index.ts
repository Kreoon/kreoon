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

    const typeDesc = EVENT_TYPE_PROMPTS[eventType] || 'un evento de streaming';

    let prompt = '';
    let result = {};

    switch (action) {
      case 'generate_event_content':
        prompt = `Genera un título atractivo y una descripción breve para ${typeDesc}.
${clientName ? `Cliente/Marca: ${clientName}` : ''}
${product ? `Producto/Tema: ${product}` : ''}
${keywords?.length ? `Palabras clave: ${keywords.join(', ')}` : ''}

Responde en formato JSON con las claves "title" y "description". El título debe ser máximo 60 caracteres y la descripción máximo 200 caracteres. Deben ser llamativos y orientados a captar audiencia.`;
        
        // Simulated AI response (in production, call actual AI API)
        const titles: Record<string, string[]> = {
          shopping: [
            `🛒 OFERTAS EN VIVO | ${clientName || 'Tienda'}`,
            `⚡ Flash Sale: ${product || 'Productos exclusivos'}`,
            `🔴 LIVE Shopping: Descuentos Únicos`,
          ],
          informative: [
            `📺 En Vivo: ${product || 'Novedades'}`,
            `🎯 Descubre ${product || 'más'} con ${clientName || 'nosotros'}`,
            `💡 Sesión informativa: ${product || 'Tendencias'}`,
          ],
          webinar: [
            `🎓 Webinar: ${product || 'Formación profesional'}`,
            `📚 Masterclass: ${product || 'Aprende con expertos'}`,
            `🎤 Webinar Exclusivo | ${clientName || 'Expertos'}`,
          ],
          interview: [
            `🎙️ Entrevista Exclusiva | ${clientName || 'Invitado especial'}`,
            `💬 Charla en Vivo: ${product || 'Conversación'}`,
            `🌟 En directo con ${clientName || 'nuestro invitado'}`,
          ],
        };
        
        const typeKey = eventType as keyof typeof titles;
        const titleOptions = titles[typeKey] || titles.informative;
        const selectedTitle = titleOptions[Math.floor(Math.random() * titleOptions.length)];
        
        result = {
          title: selectedTitle.substring(0, 60),
          description: `Únete a nuestra transmisión en vivo${clientName ? ` con ${clientName}` : ''}. ${product ? `Descubre todo sobre ${product}.` : ''} ¡No te lo pierdas!`.substring(0, 200),
        };
        break;

      case 'improve_title':
        prompt = `Mejora este título para ${typeDesc}: "${currentTitle}"
El nuevo título debe ser más atractivo, máximo 60 caracteres.`;
        
        result = {
          title: `🔴 ${currentTitle}`.substring(0, 60),
        };
        break;

      case 'improve_description':
        prompt = `Mejora esta descripción para ${typeDesc}: "${currentDescription}"
La nueva descripción debe ser más atractiva y orientada a conversión, máximo 200 caracteres.`;
        
        result = {
          description: `¡No te pierdas! ${currentDescription}`.substring(0, 200),
        };
        break;

      default:
        throw new Error('Invalid action');
    }

    console.log('AI Generation prompt:', prompt);
    console.log('AI Generation result:', result);

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
