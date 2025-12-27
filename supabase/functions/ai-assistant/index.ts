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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, organizationId, conversationId } = await req.json();

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

    // Get prompt config (personalidad, tono, etc.)
    const { data: promptConfig } = await supabase
      .from('ai_prompt_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    // Get knowledge base
    const { data: knowledge } = await supabase
      .from('ai_assistant_knowledge')
      .select('title, content, knowledge_type')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Get positive examples
    const { data: positiveExamples } = await supabase
      .from('ai_positive_examples')
      .select('category, user_question, ideal_response')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(20);

    // Get negative rules
    const { data: negativeRules } = await supabase
      .from('ai_negative_rules')
      .select('rule_type, pattern, reason, severity')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .eq('severity', 'block');

    // Get conversation flows that might match
    const { data: flows } = await supabase
      .from('ai_conversation_flows')
      .select('name, trigger_keywords, trigger_intent, flow_steps, priority')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    // Get user context
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, current_organization_id')
      .eq('id', user.id)
      .single();

    const { data: userRoles } = await supabase
      .from('organization_member_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId);

    // Build the system prompt with all training data
    let systemPrompt = '';

    // 1. Basic identity
    const assistantRole = promptConfig?.assistant_role || 'asistente virtual';
    const personality = promptConfig?.personality || 'profesional y amigable';
    const tone = promptConfig?.tone || 'formal pero cercano';
    const language = promptConfig?.language || 'español';

    systemPrompt = `Eres ${config.assistant_name}, ${assistantRole} de esta organización.

## Tu personalidad y tono
- Personalidad: ${personality}
- Tono de comunicación: ${tone}
- Idioma principal: ${language}
`;

    if (config.system_prompt) {
      systemPrompt += `\n## Instrucciones adicionales del administrador:\n${config.system_prompt}\n`;
    }

    if (promptConfig?.custom_instructions) {
      systemPrompt += `\n## Instrucciones personalizadas:\n${promptConfig.custom_instructions}\n`;
    }

    // 2. User context
    const userRolesList = userRoles?.map(r => r.role).join(', ') || 'usuario';
    systemPrompt += `\n## Contexto del usuario actual
- Nombre: ${userProfile?.full_name || 'Usuario'}
- Rol(es): ${userRolesList}
`;

    // 3. Knowledge base
    if (knowledge && knowledge.length > 0) {
      systemPrompt += '\n## Base de conocimiento de la organización:\n';
      for (const k of knowledge) {
        systemPrompt += `\n### ${k.title} (${k.knowledge_type})\n${k.content}\n`;
      }
    }

    // 4. Conversation flows
    if (flows && flows.length > 0) {
      systemPrompt += '\n## Flujos conversacionales disponibles:\n';
      systemPrompt += 'Cuando el usuario pregunte sobre estos temas, sigue el flujo indicado:\n';
      for (const flow of flows) {
        const keywords = flow.trigger_keywords?.join(', ') || '';
        systemPrompt += `\n### ${flow.name}\n`;
        if (keywords) systemPrompt += `- Palabras clave: ${keywords}\n`;
        if (flow.trigger_intent) systemPrompt += `- Intención: ${flow.trigger_intent}\n`;
        if (flow.flow_steps) {
          systemPrompt += `- Pasos del flujo: ${JSON.stringify(flow.flow_steps)}\n`;
        }
      }
    }

    // 5. Positive examples (how to respond)
    if (positiveExamples && positiveExamples.length > 0) {
      systemPrompt += '\n## Ejemplos de respuestas ideales:\n';
      systemPrompt += 'Aprende de estos ejemplos cómo debes responder:\n';
      for (const ex of positiveExamples) {
        systemPrompt += `\nCategoría: ${ex.category}\nUsuario: "${ex.user_question}"\nRespuesta ideal: "${ex.ideal_response}"\n`;
      }
    }

    // 6. Negative rules (what NOT to do) - CRITICAL
    if (negativeRules && negativeRules.length > 0) {
      systemPrompt += '\n## REGLAS CRÍTICAS - Respuestas prohibidas:\n';
      systemPrompt += '⚠️ NUNCA debes hacer o decir lo siguiente:\n';
      for (const rule of negativeRules) {
        systemPrompt += `\n- ${rule.rule_type.toUpperCase()}: "${rule.pattern}"`;
        if (rule.reason) systemPrompt += ` - Razón: ${rule.reason}`;
      }
      systemPrompt += '\n\nSi alguien te pide algo de lo anterior, declina amablemente sin dar la información.\n';
    }

    // 7. Capability restrictions
    if (promptConfig) {
      const restrictions = [];
      if (!promptConfig.can_discuss_pricing) restrictions.push('precios o tarifas');
      if (!promptConfig.can_share_user_data) restrictions.push('datos personales de usuarios');
      if (!promptConfig.can_discuss_competitors) restrictions.push('competidores o comparaciones');
      
      if (restrictions.length > 0) {
        systemPrompt += `\n## Temas restringidos:\nNo puedes discutir: ${restrictions.join(', ')}. Si te preguntan, sugiere contactar al equipo directamente.\n`;
      }
    }

    // 8. Fallback behavior
    const fallbackMessage = promptConfig?.fallback_message || 'Lo siento, no tengo información sobre eso. ¿Puedo ayudarte con algo más?';
    const maxLength = promptConfig?.max_response_length || 500;

    systemPrompt += `\n## Comportamiento general:
- Si no tienes información sobre algo, di: "${fallbackMessage}"
- Mantén tus respuestas concisas (máximo ~${maxLength} caracteres)
- Solo responde sobre temas de la organización
- Nunca inventes información que no está en tu base de conocimiento
`;

    // Check negative rules against user message
    const blockedPatterns = negativeRules?.filter(rule => {
      const pattern = rule.pattern.toLowerCase();
      const msg = message.toLowerCase();
      return msg.includes(pattern);
    });

    if (blockedPatterns && blockedPatterns.length > 0) {
      // Log the blocked attempt
      await supabase.from('ai_assistant_logs').insert({
        organization_id: organizationId,
        user_id: user.id,
        conversation_id: conversationId || null,
        user_message: message,
        assistant_response: '[BLOCKED BY NEGATIVE RULE]',
        tokens_used: 0,
      });

      return new Response(JSON.stringify({ 
        response: 'Lo siento, no puedo ayudarte con esa solicitud. ¿Hay algo más en lo que pueda asistirte?',
        assistant_name: config.assistant_name,
        blocked: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get conversation history for context
    const { data: history } = await supabase
      .from('ai_assistant_logs')
      .select('user_message, assistant_response')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build messages array with history
    const aiMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (reversed to be chronological)
    if (history && history.length > 0) {
      const reversedHistory = [...history].reverse();
      for (const h of reversedHistory) {
        aiMessages.push({ role: 'user', content: h.user_message });
        aiMessages.push({ role: 'assistant', content: h.assistant_response });
      }
    }

    aiMessages.push({ role: 'user', content: message });

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Calling AI with system prompt length:', systemPrompt.length);
    console.log('Message count:', aiMessages.length);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'google/gemini-2.5-flash',
        messages: aiMessages,
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
    const assistantResponse = aiData.choices?.[0]?.message?.content || fallbackMessage;

    // Log the conversation
    await supabase.from('ai_assistant_logs').insert({
      organization_id: organizationId,
      user_id: user.id,
      conversation_id: conversationId || null,
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
