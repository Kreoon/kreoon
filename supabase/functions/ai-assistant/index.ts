import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getKreoonClient, isKreoonConfigured, validateKreoonAuth } from "../_shared/kreoon-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Role-based access levels for information
const ROLE_ACCESS_LEVELS: Record<string, string[]> = {
  admin: ['all', 'financials', 'team_management', 'client_details', 'payments', 'analytics', 'settings'],
  strategist: ['content_strategy', 'clients', 'creators', 'scripts', 'products', 'analytics', 'team_management', 'settings'], // Enhanced strategist access
  editor: ['content_editing', 'assigned_content', 'scripts', 'video_guidelines'],
  creator: ['own_content', 'own_assignments', 'own_scripts', 'own_payments'],
  client: ['own_brand_content', 'own_packages', 'own_products'],
  ambassador: ['referrals', 'own_network', 'commissions', 'own_content'],
  viewer: ['public_content', 'basic_info'],
};

// Base knowledge that ALL organizations share - platform capabilities
const PLATFORM_BASE_KNOWLEDGE = `
## 🎯 Acerca de la Plataforma UGC Colombia

### ¿Qué es esta plataforma?
Es un sistema integral de gestión de contenido UGC (User Generated Content) que permite:
- Gestión completa del ciclo de vida del contenido (desde idea hasta publicación)
- Colaboración entre equipos: creadores, editores, estrategas, clientes
- Sistema de recompensas y puntos (UP - Universal Points)
- Programa de embajadores para crecimiento orgánico
- Chat interno con soporte de archivos multimedia
- Portfolios públicos para creadores y marcas
- Tablero Kanban personalizable por organización

### Roles disponibles en la plataforma:
- **Admin**: Control total de la organización, finanzas, equipo y configuraciones
- **Strategist (Estratega)**: Planifica contenido, gestiona clientes y productos, asigna equipo, aprueba contenido
- **Creator (Creador)**: Genera contenido, graba videos, escribe guiones
- **Editor**: Post-producción de videos, edición según lineamientos
- **Client (Cliente)**: Revisa y aprueba contenido de su marca
- **Ambassador (Embajador)**: Atrae nuevos usuarios, gana comisiones
- **Viewer**: Solo visualización de contenido público

### Flujo típico de un contenido:
1. Estratega crea el brief y asigna creador
2. Creador desarrolla guión y graba
3. Editor realiza post-producción
4. Cliente revisa y solicita cambios si es necesario
5. Admin aprueba final y publica

### Sistema UP (Universal Points):
- Los usuarios ganan puntos por acciones: completar contenido, puntualidad, calidad
- Niveles y logros desbloqueables
- Tabla de clasificación competitiva
- Los embajadores ganan puntos adicionales por referidos activos

### Características del Chat:
- Mensajes directos y grupos
- Soporte para imágenes, videos, PDFs y audio
- Indicadores de escritura y presencia
- Menciones con @usuario
- Búsqueda de mensajes

### Ayuda General:
- Para cambiar configuraciones: Settings / Ajustes
- Para ver contenidos: Content Board / Tablero
- Para gestionar equipo: Team / Equipo (solo admins/estrategas)
- Para ver estadísticas: Dashboard
`;


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

    // Use Kreoon (external) database if configured
    let supabase;
    let user;
    
    if (isKreoonConfigured()) {
      console.log("[ai-assistant] Using Kreoon database");
      supabase = getKreoonClient();
      
      // Validate user with Kreoon auth
      try {
        const auth = await validateKreoonAuth(authHeader);
        user = auth.user;
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      supabase = createClient(supabaseUrl, supabaseKey);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !authUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user = authUser;
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

    // Get user profile and roles
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, current_organization_id, username')
      .eq('id', user.id)
      .single();

    const { data: userRoles } = await supabase
      .from('organization_member_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId);

    const { data: memberInfo } = await supabase
      .from('organization_members')
      .select('is_owner, ambassador_level')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    const userRolesList = userRoles?.map(r => r.role) || ['viewer'];
    const isOwner = memberInfo?.is_owner || false;
    const isAdmin = userRolesList.includes('admin') || isOwner;
    const ambassadorLevel = memberInfo?.ambassador_level;

    // Determine user's access level
    const userAccessLevels = new Set<string>();
    for (const role of userRolesList) {
      const levels = ROLE_ACCESS_LEVELS[role] || ROLE_ACCESS_LEVELS.viewer;
      levels.forEach(l => userAccessLevels.add(l));
    }
    if (isOwner || isAdmin) {
      ROLE_ACCESS_LEVELS.admin.forEach(l => userAccessLevels.add(l));
    }

    // Fetch all training data in parallel
    const [
      promptConfigRes,
      knowledgeRes,
      positiveExamplesRes,
      negativeRulesRes,
      flowsRes,
      orgInfoRes,
      statusesRes,
      contentStatsRes,
    ] = await Promise.all([
      supabase.from('ai_prompt_config').select('*').eq('organization_id', organizationId).single(),
      supabase.from('ai_assistant_knowledge').select('title, content, knowledge_type, metadata').eq('organization_id', organizationId).eq('is_active', true),
      supabase.from('ai_positive_examples').select('category, user_question, ideal_response').eq('organization_id', organizationId).eq('is_active', true).limit(30),
      supabase.from('ai_negative_rules').select('rule_type, pattern, reason, severity').eq('organization_id', organizationId).eq('is_active', true),
      supabase.from('ai_conversation_flows').select('name, trigger_keywords, trigger_intent, flow_steps, priority').eq('organization_id', organizationId).eq('is_active', true).order('priority', { ascending: false }),
      supabase.from('organizations').select('name, logo_url').eq('id', organizationId).single(),
      supabase.from('organization_statuses').select('name, color, sort_order, description').eq('organization_id', organizationId).order('sort_order'),
      supabase.from('content').select('id, status, custom_status_id').eq('organization_id', organizationId),
    ]);

    const promptConfig = promptConfigRes.data;
    const knowledge = knowledgeRes.data || [];
    const positiveExamples = positiveExamplesRes.data || [];
    const negativeRules = negativeRulesRes.data || [];
    const flows = flowsRes.data || [];
    const orgInfo = orgInfoRes.data;
    const statuses = statusesRes.data || [];
    const allContent = contentStatsRes.data || [];

    // Fetch role-specific platform data
    let platformContext = '';
    
    // Always include basic org info
    platformContext += `\n## Información de la Organización
- Nombre: ${orgInfo?.name || 'Organización'}
- Estados de contenido disponibles: ${statuses.map(s => s.name).join(', ')}
`;

    // Content statistics (visible to most roles)
    const contentStats = {
      total: allContent.length,
      byStatus: {} as Record<string, number>,
    };
    for (const c of allContent) {
      const statusId = c.custom_status_id || c.status || 'unknown';
      contentStats.byStatus[statusId] = (contentStats.byStatus[statusId] || 0) + 1;
    }
    platformContext += `\n## Estadísticas de Contenido
- Total de contenidos: ${contentStats.total}
`;

    // Role-specific data
    if (userAccessLevels.has('all') || userAccessLevels.has('client_details')) {
      // Admin/Strategist can see client info
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, category, is_vip')
        .eq('organization_id', organizationId)
        .limit(50);
      
      if (clients && clients.length > 0) {
        platformContext += `\n## Clientes de la organización (${clients.length} total)
${clients.slice(0, 20).map(c => `- ${c.name}${c.is_vip ? ' (VIP)' : ''}${c.category ? ` - ${c.category}` : ''}`).join('\n')}
`;
      }
    }

    if (userAccessLevels.has('all') || userAccessLevels.has('team_management')) {
      // Admin can see team info
      const { data: team } = await supabase
        .from('organization_members')
        .select('user_id, profiles!inner(full_name)')
        .eq('organization_id', organizationId)
        .limit(30);
      
      const { data: teamRoles } = await supabase
        .from('organization_member_roles')
        .select('user_id, role')
        .eq('organization_id', organizationId);

      const rolesByUser: Record<string, string[]> = {};
      for (const r of (teamRoles || [])) {
        if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
        rolesByUser[r.user_id].push(r.role);
      }

      if (team && team.length > 0) {
        platformContext += `\n## Equipo de la organización (${team.length} miembros)
${team.slice(0, 15).map((m: any) => `- ${m.profiles?.full_name || 'Usuario'}: ${(rolesByUser[m.user_id] || ['miembro']).join(', ')}`).join('\n')}
`;
      }
    }

    if (userAccessLevels.has('own_content') || userAccessLevels.has('assigned_content')) {
      // Creators/Editors see their assigned content
      const { data: myContent } = await supabase
        .from('content')
        .select('id, title, status, custom_status_id, deadline')
        .eq('organization_id', organizationId)
        .or(`creator_id.eq.${user.id},editor_id.eq.${user.id}`)
        .limit(20);
      
      if (myContent && myContent.length > 0) {
        platformContext += `\n## Tus contenidos asignados (${myContent.length})
${myContent.map(c => `- "${c.title}" - Estado: ${c.status}${c.deadline ? ` - Deadline: ${c.deadline}` : ''}`).join('\n')}
`;
      }
    }

    if (userAccessLevels.has('referrals') || ambassadorLevel) {
      // Ambassadors see their network
      const { data: referrals } = await supabase
        .from('ambassador_referrals')
        .select('id, referred_email, status, referred_type')
        .eq('ambassador_id', user.id)
        .eq('organization_id', organizationId);
      
      if (referrals && referrals.length > 0) {
        const pending = referrals.filter(r => r.status === 'pending').length;
        const active = referrals.filter(r => r.status === 'active').length;
        platformContext += `\n## Tu red de embajador
- Nivel: ${ambassadorLevel || 'Básico'}
- Referidos totales: ${referrals.length}
- Pendientes: ${pending}
- Activos: ${active}
`;
      }
    }

    if (userAccessLevels.has('own_brand_content')) {
      // Clients see their brand content
      const { data: clientAssoc } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user.id);
      
      if (clientAssoc && clientAssoc.length > 0) {
        const clientIds = clientAssoc.map(c => c.client_id);
        const { data: brandContent } = await supabase
          .from('content')
          .select('id, title, status')
          .in('client_id', clientIds)
          .limit(20);
        
        if (brandContent && brandContent.length > 0) {
          platformContext += `\n## Contenido de tu marca (${brandContent.length})
${brandContent.map(c => `- "${c.title}" - ${c.status}`).join('\n')}
`;
        }
      }
    }

    // Build the system prompt
    let systemPrompt = '';
    
    const assistantRole = promptConfig?.assistant_role || 'asistente virtual';
    const personality = promptConfig?.personality || 'profesional y amigable';
    const tone = promptConfig?.tone || 'formal pero cercano';
    const language = promptConfig?.language || 'español';
    const greeting = promptConfig?.greeting || 'Hola, ¿en qué puedo ayudarte?';
    const fallbackMessage = promptConfig?.fallback_message || 'Lo siento, no tengo información sobre eso. ¿Puedo ayudarte con algo más?';
    const maxLength = promptConfig?.max_response_length || 500;

    systemPrompt = `Eres ${config.assistant_name}, ${assistantRole} de la organización "${orgInfo?.name || 'esta organización'}".

## Tu personalidad y comportamiento
- Personalidad: ${personality}
- Tono de comunicación: ${tone}
- Idioma principal: ${language}
- Saludo inicial: "${greeting}"

## Contexto del usuario actual
- Nombre: ${userProfile?.full_name || 'Usuario'}
- Usuario: @${userProfile?.username || user.id.slice(0, 8)}
- Rol(es): ${userRolesList.join(', ')}${isOwner ? ' (Propietario)' : ''}${ambassadorLevel ? ` - Embajador ${ambassadorLevel}` : ''}
- Permisos de información: ${Array.from(userAccessLevels).join(', ')}

## IMPORTANTE - Restricciones por rol
⚠️ Este usuario tiene rol "${userRolesList.join('/')}" y SOLO puede acceder a información relacionada con:
${Array.from(userAccessLevels).map(a => `- ${a}`).join('\n')}

NO debes revelar información sobre:
${!userAccessLevels.has('financials') ? '- Información financiera detallada, pagos de otros usuarios, tarifas internas\n' : ''}${!userAccessLevels.has('team_management') ? '- Gestión de equipo, roles de otros, configuraciones administrativas\n' : ''}${!userAccessLevels.has('all') ? '- Configuraciones de seguridad, API keys, datos sensibles del sistema\n' : ''}
`;

    // Add custom instructions
    if (config.system_prompt) {
      systemPrompt += `\n## Instrucciones del administrador:\n${config.system_prompt}\n`;
    }
    if (promptConfig?.custom_instructions) {
      systemPrompt += `\n## Instrucciones personalizadas:\n${promptConfig.custom_instructions}\n`;
    }

    // Add platform context
    systemPrompt += platformContext;

    // Add PLATFORM BASE KNOWLEDGE (same for all organizations)
    systemPrompt += PLATFORM_BASE_KNOWLEDGE;

    // Add organization-specific knowledge base
    if (knowledge.length > 0) {
      systemPrompt += '\n## Base de conocimiento específica de esta organización:\n';
      for (const k of knowledge) {
        systemPrompt += `\n### ${k.title} (${k.knowledge_type})\n${k.content}\n`;
      }
    }

    // Add conversation flows
    if (flows.length > 0) {
      systemPrompt += '\n## Flujos conversacionales:\nCuando detectes estas intenciones, sigue el flujo:\n';
      for (const flow of flows) {
        const keywords = flow.trigger_keywords?.join(', ') || '';
        systemPrompt += `\n### ${flow.name}`;
        if (keywords) systemPrompt += `\n- Palabras clave: ${keywords}`;
        if (flow.trigger_intent) systemPrompt += `\n- Intención: ${flow.trigger_intent}`;
        if (flow.flow_steps && Array.isArray(flow.flow_steps) && flow.flow_steps.length > 0) {
          systemPrompt += `\n- Pasos: ${JSON.stringify(flow.flow_steps)}`;
        }
      }
    }

    // Add positive examples
    if (positiveExamples.length > 0) {
      systemPrompt += '\n\n## Ejemplos de respuestas ideales (aprende de estos):\n';
      for (const ex of positiveExamples) {
        systemPrompt += `\n[${ex.category}]\nUsuario: "${ex.user_question}"\nResponde así: "${ex.ideal_response}"\n`;
      }
    }

    // Add negative rules - CRITICAL
    const blockingRules = negativeRules.filter(r => r.severity === 'critical' || r.severity === 'high');
    const warningRules = negativeRules.filter(r => r.severity === 'medium' || r.severity === 'low');

    if (blockingRules.length > 0) {
      systemPrompt += '\n## ⛔ REGLAS CRÍTICAS - NUNCA hagas esto:\n';
      for (const rule of blockingRules) {
        systemPrompt += `- ${rule.rule_type}: "${rule.pattern}"${rule.reason ? ` (${rule.reason})` : ''}\n`;
      }
    }

    if (warningRules.length > 0) {
      systemPrompt += '\n## ⚠️ Advertencias - Evita estos temas:\n';
      for (const rule of warningRules) {
        systemPrompt += `- ${rule.pattern}${rule.reason ? `: ${rule.reason}` : ''}\n`;
      }
    }

    // Capability restrictions from prompt config
    if (promptConfig) {
      const restrictions = [];
      if (!promptConfig.can_discuss_pricing) restrictions.push('precios internos o tarifas');
      if (!promptConfig.can_share_user_data) restrictions.push('datos personales de otros usuarios');
      if (!promptConfig.can_discuss_competitors) restrictions.push('competidores o comparaciones');
      
      if (restrictions.length > 0) {
        systemPrompt += `\n## Temas que NO puedes discutir:\n${restrictions.map(r => `- ${r}`).join('\n')}\nSi preguntan, sugiere contactar al equipo.\n`;
      }
    }

    // Final behavior rules
    systemPrompt += `
## Comportamiento general
- Si no tienes información, responde: "${fallbackMessage}"
- Mantén respuestas concisas (~${maxLength} caracteres máximo)
- Solo responde sobre temas de la organización y lo que el usuario puede ver según su rol
- NUNCA inventes datos, cifras o información que no esté en tu contexto
- Si el usuario pregunta por algo que no puede ver por su rol, indica amablemente que no tienes acceso a esa información
- Recuerda: la información base de la plataforma es pública, pero los datos específicos de la organización son privados según el rol
`;

    // Check if message matches any blocking rules
    const blockedPatterns = blockingRules.filter(rule => {
      const pattern = rule.pattern.toLowerCase();
      const msg = message.toLowerCase();
      return msg.includes(pattern);
    });

    if (blockedPatterns.length > 0) {
      await supabase.from('ai_assistant_logs').insert({
        organization_id: organizationId,
        user_id: user.id,
        conversation_id: conversationId || null,
        user_message: message,
        assistant_response: '[BLOCKED BY RULE]',
      });

      return new Response(JSON.stringify({ 
        response: 'Lo siento, no puedo ayudarte con esa solicitud específica. ¿Hay algo más en lo que pueda asistirte?',
        assistant_name: config.assistant_name,
        blocked: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get conversation history
    const { data: history } = await supabase
      .from('ai_assistant_logs')
      .select('user_message, assistant_response')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8);

    // Build messages array
    const aiMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (history && history.length > 0) {
      const reversedHistory = [...history].reverse();
      for (const h of reversedHistory) {
        if (h.assistant_response !== '[BLOCKED BY RULE]') {
          aiMessages.push({ role: 'user', content: h.user_message });
          aiMessages.push({ role: 'assistant', content: h.assistant_response });
        }
      }
    }

    aiMessages.push({ role: 'user', content: message });

    // Determine API configuration
    const provider = config.provider || 'lovable';
    let apiUrl = '';
    let apiKey = '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (provider === 'lovable') {
      apiKey = Deno.env.get('LOVABLE_API_KEY') || '';
      apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'openai') {
      const { data: providerConfig } = await supabase
        .from('organization_ai_providers')
        .select('api_key_encrypted')
        .eq('organization_id', organizationId)
        .eq('provider_key', 'openai')
        .single();
      
      apiKey = providerConfig?.api_key_encrypted || '';
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'gemini') {
      const { data: providerConfig } = await supabase
        .from('organization_ai_providers')
        .select('api_key_encrypted')
        .eq('organization_id', organizationId)
        .eq('provider_key', 'gemini')
        .single();
      
      apiKey = providerConfig?.api_key_encrypted || '';
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`;
    } else if (provider === 'anthropic') {
      const { data: providerConfig } = await supabase
        .from('organization_ai_providers')
        .select('api_key_encrypted')
        .eq('organization_id', organizationId)
        .eq('provider_key', 'anthropic')
        .single();
      
      apiKey = providerConfig?.api_key_encrypted || '';
      apiUrl = 'https://api.anthropic.com/v1/messages';
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: `API key not configured for provider: ${provider}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('AI Request - Provider:', provider, 'Model:', config.model, 'User role:', userRolesList.join(','));
    console.log('System prompt length:', systemPrompt.length, 'chars');

    let aiResponse: Response;
    let assistantResponse = '';

    if (provider === 'gemini') {
      const geminiMessages = aiMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      aiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 2000 }
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        assistantResponse = aiData.candidates?.[0]?.content?.parts?.[0]?.text || fallbackMessage;
      }
    } else if (provider === 'anthropic') {
      const systemContent = aiMessages.find(m => m.role === 'system')?.content || '';
      const userMessages = aiMessages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content
      }));

      aiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          max_tokens: 2000,
          system: systemContent,
          messages: userMessages,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        assistantResponse = aiData.content?.[0]?.text || fallbackMessage;
      }
    } else {
      aiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model || 'google/gemini-2.5-flash',
          messages: aiMessages,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        assistantResponse = aiData.choices?.[0]?.message?.content || fallbackMessage;
      }
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Límite de solicitudes excedido. Intenta de nuevo en unos momentos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA agotados. Contacta al administrador.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Error en el servicio de IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the conversation
    await supabase.from('ai_assistant_logs').insert({
      organization_id: organizationId,
      user_id: user.id,
      conversation_id: conversationId || null,
      user_message: message,
      assistant_response: assistantResponse,
    });

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      assistant_name: config.assistant_name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('AI assistant error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
