import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is not configured');
    }

    // Build a detailed prompt for the icon based on rarity
    const rarityStyle: Record<string, string> = {
      common: 'simple design with bronze/copper metallic tones',
      uncommon: 'detailed with green emerald accents and nature energy',
      rare: 'glowing cyan/blue magical aura with mystical elements',
      legendary: 'epic golden divine light, flames, royal crown elements'
    };

    const styleDescription = rarityStyle[rarity] || rarityStyle.common;

    const prompt = `Create a game achievement badge icon for "${name}". ${description ? `For: ${description}.` : ''} 
Style: ${styleDescription}. 
Design: Circular badge or shield shape, centered, professional gaming UI style.
Dark gradient background, highly detailed digital illustration.
No text or letters in the image.`;

    console.log('Generating icon with Gemini, prompt:', prompt);

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-1.5-flash-exp-image-generation',
        messages: [
          { role: 'user', content: prompt }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response received');

    // Extract the image from Gemini's response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: imageData,
        model: 'gemini-1.5-flash-image'
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
