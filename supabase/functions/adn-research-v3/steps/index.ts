import { MasterContext } from '../context-builder.ts'

// Interfaz que todos los pasos deben implementar
export interface ResearchStep {
  number: number
  stepId: string
  tabKey: string
  name: string
  description: string
  useWebSearch: boolean
  buildPrompts: (
    masterContext: MasterContext,
    previousResults: Record<string, unknown>
  ) => { systemPrompt: string; userPrompt: string }
}

// Importar todos los pasos
import { step01MarketOverview } from './step-01-market-overview.ts'
import { step02Competition } from './step-02-competition.ts'
import { step03JTBD } from './step-03-jtbd.ts'
import { step04Avatars } from './step-04-avatars.ts'
import { step05Psychology } from './step-05-psychology.ts'
import { step06Neuromarketing } from './step-06-neuromarketing.ts'
import { step07Positioning } from './step-07-positioning.ts'
import { step08Copywriting } from './step-08-copywriting.ts'
import { step09PUVOffer } from './step-09-puv-offer.ts'
import { step10VideoCreatives } from './step-10-video-creatives.ts'
import { step11ContentCalendar } from './step-11-content-calendar.ts'
import { step12LeadMagnets } from './step-12-lead-magnets.ts'
import { step13SocialMedia } from './step-13-social-media.ts'
import { step14MetaAds } from './step-14-meta-ads.ts'
import { step15TikTokAds } from './step-15-tiktok-ads.ts'
import { step16GoogleAds } from './step-16-google-ads.ts'
import { step17EmailMarketing } from './step-17-email-marketing.ts'
import { step18LandingPages } from './step-18-landing-pages.ts'
import { step19LaunchStrategy } from './step-19-launch-strategy.ts'
import { step20Metrics } from './step-20-metrics.ts'
import { step21OrganicContent } from './step-21-organic-content.ts'
import { step22ExecutiveSummary } from './step-22-executive-summary.ts'

// Array ordenado — NO cambiar el orden
export const RESEARCH_STEPS: ResearchStep[] = [
  step01MarketOverview,
  step02Competition,
  step03JTBD,
  step04Avatars,
  step05Psychology,
  step06Neuromarketing,
  step07Positioning,
  step08Copywriting,
  step09PUVOffer,
  step10VideoCreatives,
  step11ContentCalendar,
  step12LeadMagnets,
  step13SocialMedia,
  step14MetaAds,
  step15TikTokAds,
  step16GoogleAds,
  step17EmailMarketing,
  step18LandingPages,
  step19LaunchStrategy,
  step20Metrics,
  step21OrganicContent,
  step22ExecutiveSummary,
]

// Helper: truncar contexto grande para no exceder límites de tokens
export function truncateContext(obj: unknown, maxChars = 2000): string {
  const str = JSON.stringify(obj)
  if (str.length <= maxChars) return str
  return str.slice(0, maxChars) + '...[truncado]'
}

// Helper: extraer frases de pain/desire para inyectar en prompts
export function extractTopPhrases(
  phrases: Record<string, unknown>[],
  limit = 8
): string {
  return phrases
    .slice(0, limit)
    .map((p, i) => `${i + 1}. "${p.phrase}" (${p.source})`)
    .join('\n')
}

// Helper: extraer vocabulario del mercado
export function extractVocabulary(
  vocab: Record<string, unknown>[],
  limit = 12
): string {
  return vocab
    .slice(0, limit)
    .map(v => `"${v.word}" — ${v.context}`)
    .join('\n')
}

// Helper: extraer objeciones reales
export function extractObjections(
  objections: Record<string, unknown>[],
  limit = 8
): string {
  return objections
    .slice(0, limit)
    .map((o, i) => `${i + 1}. "${o.objection}" (${o.type})`)
    .join('\n')
}

// Helper: parseo seguro de JSON con 3 niveles de fallback
export function safeParseJSON(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    // Nivel 2: Intentar limpiar markdown
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    try {
      return JSON.parse(cleaned)
    } catch {
      // Nivel 3: Buscar primer { y último }
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1))
        } catch {
          return { _parse_error: true, _raw: cleaned.slice(0, 500) }
        }
      }
      return { _parse_error: true, _raw: cleaned.slice(0, 500) }
    }
  }
}
