import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAIUsage, calculateCost } from "../_shared/ai-usage-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchingCriteria {
  industry?: string
  niche_tags?: string[]
  content_types?: string[]
  platforms?: string[]
  budget_range?: string
  min_rating?: number
  content_styles?: string[]
  audience_age?: string
  audience_gender?: string
  limit?: number
  use_ai_ranking?: boolean
  company_id?: string  // Para usar el perfil de empresa
}

interface CreatorScore {
  creator_id: string
  total_score: number
  reasons: Array<{ type: string; label: string; score: number }>
}

/**
 * AI-Powered Creator Matching
 *
 * Este endpoint encuentra los mejores creadores para una empresa/marca
 * basándose en múltiples factores:
 * - Industria y nicho
 * - Estilo de contenido
 * - Experiencia previa en la industria
 * - Ratings y métricas
 * - Disponibilidad
 * - Presupuesto
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extraer userId del auth header si existe
    const authHeader = req.headers.get('authorization')
    let userId = '00000000-0000-0000-0000-000000000000'
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) userId = user.id
    }

    const criteria: MatchingCriteria = await req.json()
    const limit = criteria.limit || 20

    console.log('[ai-creator-matching] Criteria:', JSON.stringify(criteria))

    // Si hay company_id, obtener el perfil de la empresa para enriquecer la búsqueda
    let companyProfile = null
    if (criteria.company_id) {
      const { data: company } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', criteria.company_id)
        .single()

      if (company) {
        companyProfile = company
        // Enriquecer criteria con datos de la empresa
        criteria.industry = criteria.industry || company.industry
        criteria.niche_tags = criteria.niche_tags || company.niche_tags
        criteria.content_types = criteria.content_types || company.preferred_content_types
        criteria.platforms = criteria.platforms || company.preferred_platforms
        criteria.budget_range = criteria.budget_range || company.typical_budget_range
        criteria.content_styles = criteria.content_styles || company.preferred_creator_styles
      }
    }

    // =========================================================
    // PASO 1: Obtener creadores base con filtros básicos
    // =========================================================

    let creatorsQuery = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        username,
        avatar_url,
        bio,
        avg_rating,
        total_contracts_completed,
        is_available_for_hire,
        marketplace_enabled,
        is_independent
      `)
      .eq('marketplace_enabled', true)
      .eq('is_available_for_hire', true)

    // Filtro por rating mínimo
    if (criteria.min_rating) {
      creatorsQuery = creatorsQuery.gte('avg_rating', criteria.min_rating)
    }

    const { data: baseCreators, error: creatorsError } = await creatorsQuery.limit(100)

    if (creatorsError) {
      console.error('[ai-creator-matching] Error fetching creators:', creatorsError)
      throw creatorsError
    }

    if (!baseCreators || baseCreators.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], total_found: 0, search_context: criteria }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const creatorIds = baseCreators.map(c => c.id)

    // =========================================================
    // PASO 2: Obtener perfiles extendidos de creadores
    // =========================================================

    const { data: creatorProfiles } = await supabase
      .from('creator_profiles')
      .select('*')
      .in('user_id', creatorIds)

    const profileMap = new Map(
      (creatorProfiles || []).map(p => [p.user_id, p])
    )

    // =========================================================
    // PASO 3: Obtener disponibilidad
    // =========================================================

    const { data: availabilities } = await supabase
      .from('creator_availability')
      .select('*')
      .in('user_id', creatorIds)

    const availabilityMap = new Map(
      (availabilities || []).map(a => [a.user_id, a])
    )

    // =========================================================
    // PASO 4: Obtener servicios (para precio)
    // =========================================================

    const { data: services } = await supabase
      .from('creator_services')
      .select('*')
      .in('user_id', creatorIds)
      .eq('is_active', true)
      .order('is_featured', { ascending: false })

    const serviceMap = new Map<string, any[]>()
    for (const service of (services || [])) {
      if (!serviceMap.has(service.user_id)) {
        serviceMap.set(service.user_id, [])
      }
      serviceMap.get(service.user_id)!.push(service)
    }

    // =========================================================
    // PASO 5: Obtener reviews count
    // =========================================================

    const { data: reviewCounts } = await supabase
      .from('marketplace_reviews')
      .select('reviewed_id')
      .in('reviewed_id', creatorIds)
      .eq('is_public', true)

    const reviewCountMap = new Map<string, number>()
    for (const review of (reviewCounts || [])) {
      reviewCountMap.set(
        review.reviewed_id,
        (reviewCountMap.get(review.reviewed_id) || 0) + 1
      )
    }

    // =========================================================
    // PASO 6: Calcular scores para cada creador
    // =========================================================

    const creatorScores: CreatorScore[] = []

    for (const creator of baseCreators) {
      const profile = profileMap.get(creator.id)
      const availability = availabilityMap.get(creator.id)
      const creatorServices = serviceMap.get(creator.id) || []

      let totalScore = 0
      const reasons: Array<{ type: string; label: string; score: number }> = []

      // ----- SCORE: Industria (0-25 puntos) -----
      if (criteria.industry && profile?.primary_category) {
        if (profile.primary_category === criteria.industry) {
          totalScore += 25
          reasons.push({ type: 'industry', label: 'Especialista en tu industria', score: 25 })
        } else if (profile.secondary_categories?.includes(criteria.industry)) {
          totalScore += 15
          reasons.push({ type: 'industry', label: 'Experiencia en tu industria', score: 15 })
        }
      }

      // ----- SCORE: Experiencia en industria (0-20 puntos) -----
      if (criteria.industry && profile?.industry_experience) {
        const exp = profile.industry_experience[criteria.industry]
        if (exp) {
          const expScore = Math.min(20, exp.projects * 2 + (exp.avg_rating >= 4.5 ? 10 : 5))
          totalScore += expScore
          reasons.push({
            type: 'experience',
            label: `${exp.projects} proyectos en ${criteria.industry}`,
            score: expScore
          })
        }
      }

      // ----- SCORE: Niche tags (0-15 puntos) -----
      if (criteria.niche_tags?.length && profile?.specialization_tags?.length) {
        const matchingTags = criteria.niche_tags.filter(t =>
          profile.specialization_tags.some((st: string) =>
            st.toLowerCase().includes(t.toLowerCase()) ||
            t.toLowerCase().includes(st.toLowerCase())
          )
        )
        if (matchingTags.length > 0) {
          const tagScore = Math.min(15, matchingTags.length * 5)
          totalScore += tagScore
          reasons.push({
            type: 'niche',
            label: `Especializado en ${matchingTags.slice(0, 2).join(', ')}`,
            score: tagScore
          })
        }
      }

      // ----- SCORE: Estilo de contenido (0-15 puntos) -----
      if (criteria.content_styles?.length && profile?.content_style?.length) {
        const matchingStyles = criteria.content_styles.filter(s =>
          profile.content_style.includes(s)
        )
        if (matchingStyles.length > 0) {
          const styleScore = Math.min(15, matchingStyles.length * 5)
          totalScore += styleScore
          reasons.push({
            type: 'style',
            label: `Estilo ${matchingStyles[0]}`,
            score: styleScore
          })
        }
      }

      // ----- SCORE: Rating (0-15 puntos) -----
      if (creator.avg_rating) {
        const ratingScore = Math.round((creator.avg_rating / 5) * 15)
        totalScore += ratingScore
        reasons.push({
          type: 'rating',
          label: `${creator.avg_rating} estrellas`,
          score: ratingScore
        })
      }

      // ----- SCORE: Disponibilidad (0-10 puntos) -----
      if (availability) {
        if (availability.status === 'available') {
          totalScore += 10
          reasons.push({ type: 'availability', label: 'Disponible ahora', score: 10 })
        } else if (availability.status === 'busy') {
          totalScore += 5
          reasons.push({ type: 'availability', label: 'Acepta proyectos', score: 5 })
        }
      } else {
        // Sin availability = asumimos disponible
        totalScore += 7
      }

      // ----- SCORE: Presupuesto (0-10 puntos) -----
      if (criteria.budget_range && creatorServices.length > 0) {
        const minPrice = Math.min(...creatorServices.map(s => s.price_amount || Infinity))
        const budgetMatch = checkBudgetMatch(criteria.budget_range, minPrice)
        if (budgetMatch.matches) {
          totalScore += budgetMatch.score
          reasons.push({
            type: 'budget',
            label: budgetMatch.label,
            score: budgetMatch.score
          })
        }
      }

      // ----- SCORE: Plataformas (0-10 puntos) -----
      if (criteria.platforms?.length && profile?.strong_platforms?.length) {
        const matchingPlatforms = criteria.platforms.filter(p =>
          profile.strong_platforms.includes(p)
        )
        if (matchingPlatforms.length > 0) {
          const platformScore = Math.min(10, matchingPlatforms.length * 4)
          totalScore += platformScore
          reasons.push({
            type: 'platform',
            label: `Fuerte en ${matchingPlatforms.join(', ')}`,
            score: platformScore
          })
        }
      }

      // ----- BONUS: Proyectos completados (0-5 puntos) -----
      if (creator.total_contracts_completed > 0) {
        const projectBonus = Math.min(5, Math.floor(creator.total_contracts_completed / 5))
        totalScore += projectBonus
      }

      creatorScores.push({
        creator_id: creator.id,
        total_score: totalScore,
        reasons: reasons.sort((a, b) => b.score - a.score)
      })
    }

    // =========================================================
    // PASO 7: Ordenar por score y limitar
    // =========================================================

    creatorScores.sort((a, b) => b.total_score - a.total_score)
    const topCreators = creatorScores.slice(0, limit)

    // =========================================================
    // PASO 8: Construir respuesta con datos completos
    // =========================================================

    const matches = topCreators.map((score, index) => {
      const creator = baseCreators.find(c => c.id === score.creator_id)!
      const profile = profileMap.get(score.creator_id)
      const creatorServices = serviceMap.get(score.creator_id) || []
      const topService = creatorServices[0] || null

      return {
        creator_id: score.creator_id,
        match_score: Math.min(100, score.total_score),
        match_reasons: score.reasons.slice(0, 4),
        position: index + 1,
        creator: {
          id: creator.id,
          full_name: creator.full_name,
          username: creator.username,
          avatar_url: creator.avatar_url,
          bio: creator.bio,
          avg_rating: creator.avg_rating,
          reviews_count: reviewCountMap.get(creator.id) || 0,
          total_projects: creator.total_contracts_completed || 0,
        },
        profile: {
          primary_category: profile?.primary_category || null,
          content_style: profile?.content_style || [],
          industry_experience: profile?.industry_experience || {},
        },
        top_service: topService ? {
          id: topService.id,
          title: topService.title,
          price_amount: topService.price_amount,
          price_type: topService.price_type,
        } : null,
      }
    })

    // =========================================================
    // PASO 9: Guardar historial de matches (para mejorar IA)
    // =========================================================

    if (criteria.company_id) {
      const historyEntries = matches.map((match, i) => ({
        searcher_id: criteria.company_id,
        searcher_type: 'company',
        creator_id: match.creator_id,
        search_context: criteria,
        match_score: match.match_score / 100,
        match_reason: match.match_reasons[0]?.label || '',
        position_shown: i + 1,
      }))

      await supabase
        .from('ai_match_history')
        .insert(historyEntries)
        .then(() => console.log('[ai-creator-matching] Saved match history'))
    }

    // =========================================================
    // PASO 10: Generar resumen con IA (opcional)
    // =========================================================

    let aiSummary: string | undefined
    if (criteria.use_ai_ranking && (openaiKey || geminiKey) && matches.length > 0) {
      try {
        aiSummary = await generateAISummary(
          criteria,
          matches.slice(0, 5),
          openaiKey,
          geminiKey,
          supabase,
          userId
        )
      } catch (e) {
        console.error('[ai-creator-matching] AI summary error:', e)
      }
    }

    const response = {
      matches,
      total_found: creatorScores.length,
      search_context: criteria,
      ai_summary: aiSummary,
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ai-creator-matching] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Verificar si el precio está en el rango de presupuesto
 */
function checkBudgetMatch(
  budgetRange: string,
  minPrice: number
): { matches: boolean; score: number; label: string } {
  if (!minPrice || minPrice === Infinity) {
    return { matches: true, score: 5, label: 'Precio a convenir' }
  }

  switch (budgetRange) {
    case 'low':
      if (minPrice <= 200) {
        return { matches: true, score: 10, label: 'Dentro de tu presupuesto' }
      }
      return { matches: false, score: 0, label: '' }

    case 'medium':
      if (minPrice <= 1000) {
        return { matches: true, score: 10, label: 'Dentro de tu presupuesto' }
      }
      return { matches: false, score: 0, label: '' }

    case 'high':
      return { matches: true, score: 10, label: 'Dentro de tu presupuesto' }

    default:
      return { matches: true, score: 5, label: '' }
  }
}

/**
 * Generar resumen con IA
 */
async function generateAISummary(
  criteria: MatchingCriteria,
  topMatches: any[],
  openaiKey?: string,
  geminiKey?: string,
  supabase?: any,
  userId?: string
): Promise<string> {
  const prompt = `
Eres un asistente de Kreoon, una plataforma que conecta marcas con creadores de contenido UGC.

Basándote en estos criterios de búsqueda:
- Industria: ${criteria.industry || 'no especificada'}
- Tags: ${criteria.niche_tags?.join(', ') || 'no especificados'}
- Estilo buscado: ${criteria.content_styles?.join(', ') || 'no especificado'}
- Presupuesto: ${criteria.budget_range || 'no especificado'}

Y estos top 5 creadores encontrados:
${topMatches.map((m, i) => `${i + 1}. ${m.creator.full_name} (${m.match_score}% match) - ${m.match_reasons[0]?.label || 'buen match'}`).join('\n')}

Genera un resumen breve (2-3 oraciones en español) explicando por qué estos creadores son buenos para la marca. Sé específico y profesional.
`

  // Intentar con OpenAI primero
  if (openaiKey) {
    try {
      const startTime = Date.now()
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.7,
        }),
      })

      const response_time_ms = Date.now() - startTime
      const data = await response.json()

      if (supabase) {
        logAIUsage(supabase, {
          organization_id: "00000000-0000-0000-0000-000000000000",
          user_id: userId || "00000000-0000-0000-0000-000000000000",
          module: "talent.ambassador.ai",
          provider: "openai",
          model: "gpt-4o-mini",
          tokens_input: data.usage?.prompt_tokens || 0,
          tokens_output: data.usage?.completion_tokens || 0,
          success: true,
          edge_function: "ai-creator-matching",
          response_time_ms,
        }).catch(console.error)
      }

      return data.choices?.[0]?.message?.content || ''
    } catch (e) {
      console.error('[ai-creator-matching] OpenAI error:', e)
    }
  }

  // Fallback a Gemini
  if (geminiKey) {
    try {
      const startTime = Date.now()
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
          }),
        }
      )

      const response_time_ms = Date.now() - startTime
      const data = await response.json()

      if (supabase) {
        logAIUsage(supabase, {
          organization_id: "00000000-0000-0000-0000-000000000000",
          user_id: userId || "00000000-0000-0000-0000-000000000000",
          module: "talent.ambassador.ai",
          provider: "gemini",
          model: "gemini-1.5-flash",
          tokens_input: data.usageMetadata?.promptTokenCount || 0,
          tokens_output: data.usageMetadata?.candidatesTokenCount || 0,
          success: true,
          edge_function: "ai-creator-matching",
          response_time_ms,
        }).catch(console.error)
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } catch (e) {
      console.error('[ai-creator-matching] Gemini error:', e)
    }
  }

  return ''
}
