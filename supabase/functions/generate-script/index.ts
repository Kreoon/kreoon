import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScriptRequest {
  product_name: string;
  strategy: string;
  market_research: string;
  ideal_avatar: string;
  sales_angle: string;
  additional_context: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      product_name, 
      strategy, 
      market_research, 
      ideal_avatar, 
      sales_angle, 
      additional_context 
    }: ScriptRequest = await req.json();

    console.log("Generating script for product:", product_name);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Eres un experto copywriter especializado en crear guiones para videos UGC (User Generated Content) y anuncios en redes sociales. Tu objetivo es crear guiones persuasivos, naturales y que conecten emocionalmente con la audiencia.

Reglas para el guión:
1. Usa un tono conversacional y natural, como si hablaras con un amigo
2. Incluye un hook poderoso en los primeros 3 segundos
3. Estructura: Hook → Problema → Solución → Beneficios → CTA
4. Mantén el guión entre 30-60 segundos de lectura
5. Incluye indicaciones entre corchetes [ACCIÓN] para el creador
6. Evita sonar como publicidad tradicional
7. Usa storytelling cuando sea posible
8. El idioma debe ser español latinoamericano`;

    const userPrompt = `Crea un guión de video UGC para el siguiente producto:

**Producto:** ${product_name}

**Estrategia del producto:** ${strategy || 'No especificada'}

**Investigación de mercado:** ${market_research || 'No especificada'}

**Avatar ideal (cliente objetivo):** ${ideal_avatar || 'No especificado'}

**Ángulo de venta a usar:** ${sales_angle || 'General'}

${additional_context ? `**Indicaciones adicionales:** ${additional_context}` : ''}

Genera un guión completo listo para grabar, con indicaciones de acción para el creador.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const script = data.choices?.[0]?.message?.content || "";

    console.log("Script generated successfully");

    return new Response(
      JSON.stringify({ script }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-script function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
