import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { name, description, rarity } = await req.json();
    
    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Achievement name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Build a detailed prompt for the icon
    const rarityStyle: Record<string, string> = {
      common: 'simple, clean, minimal design with subtle gray and white colors',
      uncommon: 'slightly detailed with green accents, emerald glow, and nature themes',
      rare: 'detailed with cyan/blue glowing effects, magical aura, and mystical elements',
      legendary: 'highly detailed with golden glow, epic flames, royal crown elements, and divine light'
    };

    const styleDescription = rarityStyle[rarity] || rarityStyle.common;

    const prompt = `A game achievement badge icon for "${name}". ${description ? `Achievement for: ${description}.` : ''} 
Style: ${styleDescription}. 
Design: Circular badge or shield shape, centered composition, suitable for gaming UI.
Background: Dark gradient or transparent.
The icon should be clear and detailed, professional game art style, digital illustration.
No text, no letters, no words in the image.`;

    console.log('Generating icon with OpenAI DALL-E, prompt:', prompt);

    // Use OpenAI's gpt-image-1 model for image generation
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402 || response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'OpenAI API key issue. Please check your API key.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    // Extract the image URL or base64 from the response
    const imageData = data.data?.[0];
    
    if (!imageData) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    // OpenAI returns either url or b64_json depending on response_format
    const imageUrl = imageData.url || (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : null);

    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl,
        model: 'gpt-image-1'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating achievement icon:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate icon';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
