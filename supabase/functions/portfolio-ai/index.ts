import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIRequest {
  action: 'search' | 'caption' | 'bio' | 'recommendations' | 'moderation' | 'blocks';
  payload: Record<string, unknown>;
  organizationId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, payload, organizationId } = await req.json() as AIRequest;

    console.log(`[portfolio-ai] Action: ${action}, Org: ${organizationId}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'search':
        systemPrompt = `You are an intelligent search assistant for a creative portfolio platform. 
Parse the user's search query and extract structured search parameters.
Return JSON with: entities (array), keywords (array), location (string|null), categories (array), skills (array).`;
        userPrompt = `Search query: "${payload.query}"
Extract search parameters from this query. Return valid JSON only.`;
        break;

      case 'caption':
        systemPrompt = `You are a creative caption writer for social media content.
Generate engaging, authentic captions that drive engagement.
Your style is conversational, trendy, and adapted to Instagram/TikTok style.`;
        userPrompt = `Content type: ${payload.content_type}
Context: ${payload.context}
Tone: ${payload.tone || 'casual'}
Language: ${payload.language || 'es'}

Generate 3 caption options. Return JSON with captions array containing objects with text and hashtags.`;
        break;

      case 'bio':
        systemPrompt = `You are a professional bio writer specialized in creative portfolios.
Craft compelling, professional bios that highlight unique value.
Keep bios concise, impactful, and optimized for discoverability.`;
        userPrompt = `Current bio: "${payload.current_bio || ''}"
Role/Profession: ${payload.profession || 'Creator'}
Key skills: ${payload.skills || ''}
Tone: ${payload.tone || 'professional'}
Language: ${payload.language || 'es'}

Improve this bio. Return JSON with improved_bio (string) and key_changes (array).`;
        break;

      case 'recommendations':
        systemPrompt = `You are a recommendation engine for a creative portfolio platform.
Suggest creators and content based on user interests and engagement patterns.`;
        userPrompt = `User interests: ${JSON.stringify(payload.interests || [])}
Recently viewed categories: ${JSON.stringify(payload.categories || [])}

Generate recommendation reasoning. Return JSON with creator_recommendations and content_recommendations arrays.`;
        break;

      case 'moderation':
        systemPrompt = `You are a content moderation assistant for a professional creative platform.
Identify potentially problematic content while respecting creative expression.
Be lenient with creative content but strict with clear violations.`;
        userPrompt = `Content type: ${payload.content_type}
Text content: "${payload.text || ''}"
Has media: ${payload.has_media || false}

Analyze for violations. Return JSON with is_flagged (boolean), severity (none|low|medium|high|critical), reasons (array), action_recommended (approve|review|hide|remove).`;
        break;

      case 'blocks':
        systemPrompt = `You are a profile optimization assistant for creative portfolios.
Suggest profile block structure for maximum impact.`;
        userPrompt = `Profession: ${payload.profession || 'Creator'}
Available content types: ${JSON.stringify(payload.content_types || [])}
Goals: ${payload.goals || 'showcase work'}

Suggest optimal profile blocks. Return JSON with suggested_blocks array containing objects with block_key, title, reason, priority.`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[portfolio-ai] AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      console.error('[portfolio-ai] Failed to parse AI response:', content);
      result = { raw: content };
    }

    console.log(`[portfolio-ai] Success for action: ${action}`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[portfolio-ai] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
