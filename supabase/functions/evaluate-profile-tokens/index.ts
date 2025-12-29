import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileData {
  id: string;
  full_name: string;
  username: string | null;
  bio: string | null;
  tagline: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  city: string | null;
  country: string | null;
  best_at: string | null;
  specialties_tags: string[] | null;
  content_categories: string[] | null;
  industries: string[] | null;
  experience_level: string | null;
  instagram: string | null;
  tiktok: string | null;
  portfolio_url: string | null;
}

interface ProfileStats {
  posts_count: number;
  portfolio_count: number;
  followers_count: number;
  following_count: number;
  views_count: number;
  likes_count: number;
  achievements_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profile_id, force_recalculate = false } = await req.json();
    
    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tokenization config
    const { data: config } = await supabase
      .from('ai_tokenization_config')
      .select('*')
      .limit(1)
      .single();

    if (!config?.is_enabled) {
      console.log('AI tokenization is disabled');
      return new Response(
        JSON.stringify({ error: 'AI tokenization is currently disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile_id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get profile stats
    const [postsRes, portfolioRes, followersRes, followingRes, achievementsRes] = await Promise.all([
      supabase
        .from('portfolio_posts')
        .select('id, views_count, likes_count', { count: 'exact' })
        .eq('user_id', profile_id)
        .eq('post_type', 'personal'),
      supabase
        .from('portfolio_posts')
        .select('id', { count: 'exact' })
        .eq('user_id', profile_id)
        .eq('post_type', 'portfolio'),
      supabase
        .from('followers')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', profile_id),
      supabase
        .from('followers')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', profile_id),
      supabase
        .from('user_achievements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile_id),
    ]);

    const totalViews = postsRes.data?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
    const totalLikes = postsRes.data?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;

    const stats: ProfileStats = {
      posts_count: postsRes.count || 0,
      portfolio_count: portfolioRes.count || 0,
      followers_count: followersRes.count || 0,
      following_count: followingRes.count || 0,
      views_count: totalViews,
      likes_count: totalLikes,
      achievements_count: achievementsRes.count || 0,
    };

    // Calculate profile completeness
    const profileFields = [
      profile.full_name,
      profile.username,
      profile.bio,
      profile.tagline,
      profile.avatar_url,
      profile.cover_url,
      profile.city,
      profile.country,
      profile.best_at,
      profile.specialties_tags?.length > 0,
      profile.content_categories?.length > 0,
      profile.experience_level,
      profile.instagram || profile.tiktok || profile.portfolio_url,
    ];
    const completedFields = profileFields.filter(Boolean).length;
    const completenessScore = Math.round((completedFields / profileFields.length) * 100);

    // Build prompt for AI
    const systemPrompt = `Eres un evaluador de perfiles de creadores de contenido. Tu trabajo es asignar un costo de tokens (1-5) basado en la calidad y completitud del perfil.

Criterios de evaluación (pesos configurados):
- Completitud del perfil: ${config.weight_profile_completeness}%
- Logros obtenidos: ${config.weight_achievements}%
- Experiencia: ${config.weight_experience}%
- Engagement (seguidores, likes, vistas): ${config.weight_engagement}%

Escala de tokens:
1 = Perfil básico, recién empezando
2 = Perfil en desarrollo, algo de actividad
3 = Perfil intermedio, buen engagement
4 = Perfil avanzado, muy activo y completo
5 = Creador élite, máximo engagement y completitud

DEBES responder SOLO con un JSON válido con esta estructura exacta:
{
  "token_cost": <número del 1 al 5>,
  "reason": "<explicación breve de máximo 100 caracteres>",
  "factors": {
    "profile_completeness": <puntuación 0-100>,
    "achievements": <puntuación 0-100>,
    "experience": <puntuación 0-100>,
    "engagement": <puntuación 0-100>
  }
}`;

    const userPrompt = `Evalúa este perfil de creador:

PERFIL:
- Nombre: ${profile.full_name || 'No especificado'}
- Usuario: ${profile.username ? '@' + profile.username : 'No especificado'}
- Bio: ${profile.bio || 'Sin bio'}
- Tagline: ${profile.tagline || 'Sin tagline'}
- Ubicación: ${[profile.city, profile.country].filter(Boolean).join(', ') || 'No especificada'}
- Nivel de experiencia: ${profile.experience_level || 'No especificado'}
- Especialidades: ${profile.specialties_tags?.join(', ') || 'No especificadas'}
- Categorías: ${profile.content_categories?.join(', ') || 'No especificadas'}
- Tiene avatar: ${profile.avatar_url ? 'Sí' : 'No'}
- Tiene portada: ${profile.cover_url ? 'Sí' : 'No'}
- Redes sociales: ${[profile.instagram && 'Instagram', profile.tiktok && 'TikTok', profile.portfolio_url && 'Portfolio'].filter(Boolean).join(', ') || 'Ninguna'}

ESTADÍSTICAS:
- Posts personales: ${stats.posts_count}
- Trabajos en portafolio: ${stats.portfolio_count}
- Seguidores: ${stats.followers_count}
- Siguiendo: ${stats.following_count}
- Vistas totales: ${stats.views_count}
- Likes totales: ${stats.likes_count}
- Logros obtenidos: ${stats.achievements_count}

COMPLETITUD DEL PERFIL: ${completenessScore}%

${config.evaluation_prompt || ''}`;

    console.log('Calling Lovable AI for profile evaluation...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ai_model || 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI evaluation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response:', aiContent);

    // Parse AI response
    let evaluation;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to a default evaluation
      evaluation = {
        token_cost: 3,
        reason: 'Evaluación automática basada en completitud del perfil',
        factors: {
          profile_completeness: completenessScore,
          achievements: stats.achievements_count > 0 ? 50 : 0,
          experience: profile.experience_level ? 50 : 25,
          engagement: Math.min(100, (stats.followers_count + stats.likes_count) / 10),
        }
      };
    }

    // Validate and clamp token cost
    const tokenCost = Math.max(config.min_token_cost, Math.min(config.max_token_cost, evaluation.token_cost || 3));

    // Save evaluation to history
    const { error: insertError } = await supabase
      .from('profile_token_evaluations')
      .insert({
        profile_id,
        token_cost: tokenCost,
        evaluation_reason: evaluation.reason || 'Evaluación automática por IA',
        evaluation_factors: evaluation.factors || {},
        evaluated_by: 'ai',
      });

    if (insertError) {
      console.error('Failed to save evaluation:', insertError);
    }

    // Update profile with new token cost
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ai_token_cost: tokenCost,
        ai_token_cost_updated_at: new Date().toISOString(),
        ai_token_cost_reason: evaluation.reason,
      })
      .eq('id', profile_id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
    }

    console.log(`Profile ${profile_id} evaluated: ${tokenCost} tokens - ${evaluation.reason}`);

    return new Response(
      JSON.stringify({
        success: true,
        token_cost: tokenCost,
        reason: evaluation.reason,
        factors: evaluation.factors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-profile-tokens:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
