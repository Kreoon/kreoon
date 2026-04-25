import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY no configurada");
    }

    const { prompt, duration = 5 } = await req.json();

    const defaultPrompt = `A cute purple robot mascot named Kiro with a TV-shaped body and camera lens on head.
The robot has WiFi signal waves emanating from its antenna.
Create a smooth looping animation where Kiro:
- Gently bounces up and down with a floating effect
- Has glowing purple eyes that pulse softly
- WiFi waves animate outward rhythmically
- Subtle purple particle effects around the body
- Background is pure black (#0a0a0f) with soft purple glow
Style: Modern 3D render, glossy purple material, tech aesthetic, premium quality.
Loop seamlessly for loading screen usage.`;

    const finalPrompt = prompt || defaultPrompt;

    // Veo 3 usa el endpoint de generación de video de Gemini
    // POST https://generativelanguage.googleapis.com/v1beta/models/veo-3:generateVideo
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-2:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate a short looping animation video: ${finalPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["VIDEO"],
            videoDuration: duration,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);

      // Si Veo no está disponible, intentamos con imagen animada
      const imageResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Create an image generation prompt for: ${finalPrompt}.
                    Output only the prompt, nothing else.`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const imagePrompt = imageData.candidates?.[0]?.content?.parts?.[0]?.text;

        return new Response(
          JSON.stringify({
            success: false,
            fallback: "image_prompt",
            prompt: imagePrompt,
            message: "Veo API no disponible, usa este prompt para generar imagen",
            originalError: errorText,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`Gemini API error: ${errorText}`);
    }

    const data = await response.json();

    // Extraer URL del video generado
    const videoData = data.candidates?.[0]?.content?.parts?.find(
      (p: { video?: unknown }) => p.video
    );

    if (videoData?.video) {
      return new Response(
        JSON.stringify({
          success: true,
          video: videoData.video,
          mimeType: videoData.video.mimeType,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Si no hay video, devolver la respuesta completa para debug
    return new Response(
      JSON.stringify({
        success: false,
        message: "No video generated",
        response: data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
