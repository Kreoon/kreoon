import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, organizationId } = await req.json();

    if (!message || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing message or organizationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get AI config for the organization
    const { data: config, error: configError } = await supabase
      .from('ai_assistant_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: 'AI assistant not configured for this organization' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!config.is_enabled) {
      return new Response(JSON.stringify({ error: 'AI assistant is disabled for this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get knowledge base
    const { data: knowledge } = await supabase
      .from('ai_assistant_knowledge')
      .select('title, content, knowledge_type')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Build system prompt
    let systemPrompt = config.system_prompt || `Eres ${config.assistant_name}, un asistente útil para esta organización.`;
    
    if (config.tone) {
      systemPrompt += `\n\nTono de comunicación: ${config.tone}`;
    }

    if (knowledge && knowledge.length > 0) {
      systemPrompt += '\n\n## Base de conocimiento de la organización:\n';
      for (const k of knowledge) {
        systemPrompt += `\n### ${k.title} (${k.knowledge_type})\n${k.content}\n`;
      }
    }

    systemPrompt += '\n\nResponde solo con información relevante a la organización. Si no sabes algo, di que no tienes esa información.';

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const assistantResponse = aiData.choices?.[0]?.message?.content || 'No pude generar una respuesta.';

    // Log the conversation
    await supabase.from('ai_assistant_logs').insert({
      organization_id: organizationId,
      user_id: user.id,
      user_message: message,
      assistant_response: assistantResponse,
      tokens_used: aiData.usage?.total_tokens || null,
    });

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      assistant_name: config.assistant_name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('AI assistant error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
