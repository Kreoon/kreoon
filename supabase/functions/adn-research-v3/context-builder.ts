import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AdnResearchV3Input {
  session_id: string
  product_id: string
  product_dna_id: string
  client_dna_id?: string
  organization_id: string
  include_client_dna: boolean
  include_social_intelligence: boolean
  include_ad_intelligence: boolean
}

export interface MasterContext {
  product: ProductContext
  brand?: BrandContext
  social?: SocialContext
  ads?: AdsContext
}

interface ProductContext {
  name: string
  description: string
  service_types: string[]
  goal: string
  platforms: string[]
  audience_ages: string[]
  urgency: string
  locations: string[]
  links: {
    product: string[]
    competitors: string[]
    inspiration: string[]
  }
  user_responses: {
    q1_product: string
    q2_ideal_client: string
    q3_problem: string
    q4_transformation: string
    q5_offer: string
  }
  emotional_analysis: {
    overall_mood: string
    confidence_level: number
    passion_topics: string[]
    concern_areas: string[]
    recommended_tone: string
  }
  basic_analysis: {
    executive_summary: string
    market_analysis: Record<string, unknown>
    target_audience: Record<string, unknown>
    creative_brief: Record<string, unknown>
    recommendations: Record<string, unknown>
    kiro_insights: string[]
  }
  completeness_score: number
  confidence_score: number
}

interface BrandContext {
  business_identity: Record<string, unknown>
  value_proposition: Record<string, unknown>
  ideal_customer: Record<string, unknown>
  flagship_offer: Record<string, unknown>
  brand_identity: Record<string, unknown>
  visual_identity: Record<string, unknown>
  marketing_strategy: Record<string, unknown>
  ads_targeting: Record<string, unknown>
  user_responses: Record<string, string>
}

interface SocialContext {
  pain_phrases: Record<string, unknown>[]
  desire_phrases: Record<string, unknown>[]
  real_objections: Record<string, unknown>[]
  common_vocabulary: Record<string, unknown>[]
  recommendation_reasons: string[]
  complaint_reasons: string[]
}

interface AdsContext {
  meta_ads: Record<string, unknown>
  tiktok_ads: Record<string, unknown>
  competitor_social: Record<string, unknown>[]
}

export async function buildMasterContext(
  input: AdnResearchV3Input,
  supabase: ReturnType<typeof createClient>
): Promise<MasterContext> {
  console.log('🏗 Construyendo master context...')

  // ── Cargar product_dna completo ───────────────────────
  const { data: productDna, error: dnaError } = await supabase
    .from('product_dna')
    .select('*')
    .eq('id', input.product_dna_id)
    .single()

  if (dnaError || !productDna) {
    throw new Error(`No se pudo cargar product_dna: ${dnaError?.message}`)
  }

  // Construir contexto del producto
  // Soportamos distintas estructuras de columnas según la versión del ADN básico
  const wizardData = (productDna.wizard_data as Record<string, unknown>) || {}
  const aiAnalysis = (productDna.ai_analysis as Record<string, unknown>) || {}
  const emotionalAnalysis = (productDna.emotional_analysis as Record<string, unknown>) || {}
  const transcription = (productDna.transcription as Record<string, unknown>) || {}
  const userResponses = (productDna.user_responses as Record<string, unknown>) ||
    (wizardData.responses as Record<string, unknown>) || {}

  const productContext: ProductContext = {
    name: (productDna.product_name as string) ||
      (wizardData.product_name as string) ||
      'Producto sin nombre',
    description: (productDna.product_description as string) ||
      (wizardData.description as string) || '',
    service_types: (wizardData.selected_services as string[]) ||
      (wizardData.service_types as string[]) || [],
    goal: (wizardData.selected_goal as string) ||
      (wizardData.goal as string) || '',
    platforms: (wizardData.platforms as string[]) || [],
    audience_ages: (wizardData.audience_ages as string[]) ||
      (wizardData.target_ages as string[]) || [],
    urgency: (wizardData.urgency as string) || 'normal',
    locations: (productDna.locations as string[]) ||
      (wizardData.locations as string[]) || ['LATAM'],
    links: {
      product: (productDna.product_links as string[]) ||
        (wizardData.product_links as string[]) || [],
      competitors: (productDna.competitor_links as string[]) ||
        (wizardData.competitor_links as string[]) || [],
      inspiration: (productDna.inspiration_links as string[]) ||
        (wizardData.inspiration_links as string[]) || [],
    },
    user_responses: {
      q1_product: extractResponse(userResponses, transcription, ['q1', 'q1_product', '0']),
      q2_ideal_client: extractResponse(userResponses, transcription, ['q2', 'q2_ideal_client', '1']),
      q3_problem: extractResponse(userResponses, transcription, ['q3', 'q3_problem', '2']),
      q4_transformation: extractResponse(userResponses, transcription, ['q4', 'q4_transformation', '3']),
      q5_offer: extractResponse(userResponses, transcription, ['q5', 'q5_offer', '4']),
    },
    emotional_analysis: {
      overall_mood: (emotionalAnalysis.overall_mood as string) || 'neutro',
      confidence_level: (emotionalAnalysis.confidence_level as number) || 5,
      passion_topics: (emotionalAnalysis.passion_topics as string[]) || [],
      concern_areas: (emotionalAnalysis.concern_areas as string[]) || [],
      recommended_tone: (emotionalAnalysis.recommended_tone as string) || 'profesional y cercano',
    },
    basic_analysis: {
      executive_summary: (aiAnalysis.executive_summary as string) || '',
      market_analysis: (aiAnalysis.market_analysis as Record<string, unknown>) || {},
      target_audience: (aiAnalysis.target_audience as Record<string, unknown>) || {},
      creative_brief: (aiAnalysis.creative_brief as Record<string, unknown>) || {},
      recommendations: (aiAnalysis.recommendations as Record<string, unknown>) || {},
      kiro_insights: (aiAnalysis.kiro_insights as string[]) || [],
    },
    completeness_score: (productDna.completeness_score as number) || 0,
    confidence_score: (productDna.confidence_score as number) || 0,
  }

  // ── Construir master context base ─────────────────────
  const masterContext: MasterContext = { product: productContext }

  // ── Cargar ADN de Marca (si aplica) ───────────────────
  if (input.include_client_dna && input.client_dna_id) {
    const { data: clientDna } = await supabase
      .from('client_dna')
      .select('*')
      .eq('id', input.client_dna_id)
      .single()

    if (clientDna) {
      const dnaData = (clientDna.dna_data as Record<string, unknown>) || {}
      const brandTranscription = (clientDna.transcription as Record<string, unknown>) || {}
      const brandUserResponses = (clientDna.user_responses as Record<string, unknown>) ||
        (brandTranscription.responses as Record<string, unknown>) || {}

      masterContext.brand = {
        business_identity: (dnaData.business_identity as Record<string, unknown>) || {},
        value_proposition: (dnaData.value_proposition as Record<string, unknown>) || {},
        ideal_customer: (dnaData.ideal_customer as Record<string, unknown>) || {},
        flagship_offer: (dnaData.flagship_offer as Record<string, unknown>) || {},
        brand_identity: (dnaData.brand_identity as Record<string, unknown>) || {},
        visual_identity: (dnaData.visual_identity as Record<string, unknown>) || {},
        marketing_strategy: (dnaData.marketing_strategy as Record<string, unknown>) || {},
        ads_targeting: (dnaData.ads_targeting as Record<string, unknown>) || {},
        user_responses: {
          q1_negocio: extractResponse(brandUserResponses, brandTranscription, ['q1', 'q1_negocio', '0']),
          q2_cliente: extractResponse(brandUserResponses, brandTranscription, ['q2', 'q2_cliente', '1']),
          q3_problema: extractResponse(brandUserResponses, brandTranscription, ['q3', 'q3_problema', '2']),
          q4_solucion: extractResponse(brandUserResponses, brandTranscription, ['q4', 'q4_solucion', '3']),
          q5_oferta: extractResponse(brandUserResponses, brandTranscription, ['q5', 'q5_oferta', '4']),
          q6_canales: extractResponse(brandUserResponses, brandTranscription, ['q6', 'q6_canales', '5']),
          q7_dudas: extractResponse(brandUserResponses, brandTranscription, ['q7', 'q7_dudas', '6']),
        },
      }
      console.log('✅ ADN de Marca cargado')
    }
  }

  // ── Cargar Social Intelligence (si aplica) ────────────
  if (input.include_social_intelligence) {
    const socialData = productDna.social_intelligence as Record<string, unknown>
    if (socialData && Object.keys(socialData).length > 0) {
      masterContext.social = {
        pain_phrases: (socialData.pain_phrases as Record<string, unknown>[]) || [],
        desire_phrases: (socialData.desire_phrases as Record<string, unknown>[]) || [],
        real_objections: (socialData.real_objections as Record<string, unknown>[]) || [],
        common_vocabulary: (socialData.common_vocabulary as Record<string, unknown>[]) || [],
        recommendation_reasons: (socialData.recommendation_reasons as string[]) || [],
        complaint_reasons: (socialData.complaint_reasons as string[]) || [],
      }
      console.log(`✅ Social Intelligence cargada (${masterContext.social.pain_phrases.length} pain phrases)`)
    }
  }

  // ── Cargar Ad Intelligence (si aplica) ────────────────
  if (input.include_ad_intelligence) {
    const adsData = productDna.ad_intelligence as Record<string, unknown>
    if (adsData && Object.keys(adsData).length > 0) {
      masterContext.ads = {
        meta_ads: (adsData.meta_ads as Record<string, unknown>) || {},
        tiktok_ads: (adsData.tiktok_ads as Record<string, unknown>) || {},
        competitor_social: (adsData.competitor_social as Record<string, unknown>[]) || [],
      }
      console.log(`✅ Ad Intelligence cargada (${masterContext.ads.competitor_social.length} competidores)`)
    }
  }

  // Guardar snapshot del cliente_dna en product_dna para coherencia histórica
  if (masterContext.brand && input.client_dna_id) {
    await supabase
      .from('product_dna')
      .update({
        client_dna_snapshot: {
          dna_id: input.client_dna_id,
          snapshot_at: new Date().toISOString(),
          brand_context: masterContext.brand,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.product_dna_id)
  }

  console.log('✅ Master context construido exitosamente')
  return masterContext
}

// Helper para extraer respuesta de usuario de múltiples estructuras posibles
function extractResponse(
  responses: Record<string, unknown>,
  transcription: Record<string, unknown>,
  keys: string[]
): string {
  // Buscar en responses primero
  for (const key of keys) {
    if (responses[key]) return String(responses[key])
    if (responses[`answer_${key}`]) return String(responses[`answer_${key}`])
  }
  // Buscar en transcription
  for (const key of keys) {
    if (transcription[key]) return String(transcription[key])
    const answers = transcription.answers as Record<string, unknown>
    if (answers?.[key]) return String(answers[key])
  }
  return ''
}
