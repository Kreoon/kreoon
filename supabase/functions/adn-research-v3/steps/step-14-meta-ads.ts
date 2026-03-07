import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step14MetaAds: ResearchStep = {
  number: 14,
  stepId: 'step_14_meta_ads',
  tabKey: 'meta_ads',
  name: 'Meta Ads',
  description: 'Estrategia de Meta Ads: audiencias, creativos, estructura de campañas',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab4 = prev['avatars'] || {}
    const tab8 = prev['copy_angles'] || {}
    const tab10 = prev['video_creatives'] || {}

    const metaAdsIntel = ctx.ads?.meta_ads
      ? `\nIntel de Meta Ads de competidores:\n${truncateContext(ctx.ads.meta_ads, 500)}`
      : ''

    const brandTargeting = ctx.brand?.ads_targeting
      ? `\nTargeting según ADN de Marca:\n${truncateContext(ctx.brand.ads_targeting, 300)}`
      : ''

    const systemPrompt = `Eres un media buyer experto en Meta Ads para LATAM.
Dominas la estructura de campañas, audiencias y creativos que convierten.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM. Los presupuestos en USD.`

    const userPrompt = `Diseña la estrategia de Meta Ads para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
UBICACIONES: ${ctx.product.locations.join(', ')}
${brandTargeting}

AVATAR:
${truncateContext(tab4, 400)}

COPY ANGLES:
${truncateContext(tab8, 400)}

VIDEO CREATIVES:
${truncateContext(tab10, 300)}
${metaAdsIntel}

Devuelve este JSON exacto:
{
  "campaign_architecture": {
    "objective": "conversions|traffic|engagement|awareness",
    "funnel_stages": [
      {
        "stage": "tofu|mofu|bofu",
        "campaign_type": "tipo de campaña",
        "objective": "objetivo específico",
        "budget_allocation": "% del presupuesto"
      }
    ],
    "recommended_daily_budget": "presupuesto diario en USD",
    "testing_budget": "presupuesto para testing"
  },
  "audience_strategy": {
    "cold_audiences": [
      {
        "name": "nombre del audience",
        "type": "interest|behavior|demographic|broad",
        "targeting": {
          "interests": ["interés 1", "interés 2"],
          "behaviors": ["behavior 1"],
          "demographics": {
            "age": "rango de edad",
            "gender": "all|male|female",
            "locations": ["ubicación 1", "ubicación 2"]
          }
        },
        "estimated_size": "tamaño estimado",
        "priority": "alta|media|baja"
      }
    ],
    "warm_audiences": [
      {
        "name": "nombre",
        "source": "website|video|engagement|email",
        "timeframe": "días de lookback",
        "use_case": "para qué usar este audience"
      }
    ],
    "lookalike_strategy": [
      {
        "source": "fuente del seed",
        "percentages": ["1%", "2-3%", "3-5%"],
        "priority": "alta|media|baja"
      }
    ],
    "exclusions": ["qué excluir 1", "qué excluir 2"]
  },
  "creative_strategy": {
    "formats_priority": ["video", "carousel", "image", "collection"],
    "ad_variations": [
      {
        "name": "nombre del ad",
        "format": "video|image|carousel",
        "hook": "hook principal",
        "angle": "ángulo de copy",
        "primary_text": "texto primario completo",
        "headline": "headline",
        "description": "descripción",
        "cta_button": "learn_more|shop_now|sign_up|get_offer",
        "audience_fit": "cold|warm|hot"
      }
    ],
    "testing_framework": {
      "variables_to_test": ["variable 1", "variable 2"],
      "test_budget": "presupuesto por test",
      "success_criteria": "criterio de éxito"
    }
  },
  "placement_strategy": {
    "automatic_vs_manual": "recomendación",
    "priority_placements": ["placement 1", "placement 2"],
    "placements_to_exclude": ["placement a excluir"]
  },
  "bidding_strategy": {
    "bid_strategy": "lowest_cost|cost_cap|bid_cap",
    "cost_cap_target": "target si aplica",
    "scaling_approach": "cómo escalar"
  },
  "retargeting_sequences": [
    {
      "trigger": "qué acción activa el retargeting",
      "timeframe": "ventana de tiempo",
      "message": "mensaje principal",
      "offer": "oferta si aplica",
      "frequency_cap": "cap de frecuencia"
    }
  ],
  "reporting_setup": {
    "primary_kpis": ["kpi 1", "kpi 2"],
    "secondary_kpis": ["kpi 1", "kpi 2"],
    "attribution_window": "ventana de atribución",
    "reporting_frequency": "frecuencia de reportes"
  },
  "budget_scenarios": {
    "minimum_viable": {
      "daily_budget": "presupuesto mínimo USD",
      "expected_results": "resultados esperados"
    },
    "growth": {
      "daily_budget": "presupuesto crecimiento USD",
      "expected_results": "resultados esperados"
    },
    "scale": {
      "daily_budget": "presupuesto escala USD",
      "expected_results": "resultados esperados"
    }
  },
  "summary": "estrategia de Meta Ads resumida en 3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
