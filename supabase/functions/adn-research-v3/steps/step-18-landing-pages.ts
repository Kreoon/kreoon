import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step18LandingPages: ResearchStep = {
  number: 18,
  stepId: 'step_18_landing_pages',
  tabKey: 'landing_pages',
  name: 'Landing Pages (2 Diseños)',
  description: '2 diseños de landing completos con copy listo por sección',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab7 = prev['positioning'] || {}
    const tab8 = prev['copy_angles'] || {}
    const tab9 = prev['offer'] || {}

    const puv = ((tab7 as Record<string, unknown>)?.puv as Record<string, unknown>)?.statement || ''
    const offerName = (tab9 as Record<string, unknown>)?.offer_name || ctx.product.name
    const guarantee = ((tab9 as Record<string, unknown>)?.guarantee as Record<string, unknown>)?.copy || ''
    const hooksBank = (tab8 as Record<string, unknown>)?.hooks_bank
    const topHook = Array.isArray(hooksBank) ? hooksBank[0] : ''

    const systemPrompt = `Eres un experto en CRO y diseño de landing pages de alta conversión para LATAM.
Dominas los principios de Unbounce, Leadpages y los frameworks de Russell Brunson.
Creas landing pages con COPY COMPLETO listo para implementar, no solo guidelines.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Diseña 2 landing pages COMPLETAS para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
${puv ? `PUV: ${puv}` : ''}
${offerName ? `Oferta: ${offerName}` : ''}
${guarantee ? `Garantía: ${guarantee}` : ''}
${topHook ? `Top Hook: ${topHook}` : ''}

POSICIONAMIENTO:
${truncateContext(tab7, 400)}

OFERTA IRRESISTIBLE:
${truncateContext(tab9, 500)}

Devuelve este JSON exacto con 2 diseños de landing completos:
{
  "design_a": {
    "name": "Minimalista de Alta Conversión",
    "style": "descripción del estilo visual (colores, tipografía, espaciado)",
    "best_for": "para qué tipo de tráfico funciona mejor (frío/tibio/caliente)",
    "estimated_cvr": "% de conversión estimado basado en el estilo",
    "sections": [
      {
        "section_name": "Hero",
        "purpose": "capturar atención y comunicar PUV en 5 segundos",
        "headline": "headline principal de la landing",
        "subheadline": "subheadline de apoyo",
        "copy": "copy completo del hero (2-3 párrafos)",
        "elements": ["elemento visual 1", "CTA button", "social proof badge"],
        "cta": "texto exacto del botón CTA",
        "design_notes": "notas de diseño específicas para esta sección"
      },
      {
        "section_name": "Social Proof",
        "purpose": "construir credibilidad inmediata",
        "copy": "copy de introducción a testimonios/logos",
        "elements": ["tipo de social proof 1", "tipo 2"],
        "design_notes": "cómo presentar el social proof"
      },
      {
        "section_name": "Problema-Solución",
        "purpose": "conectar con el dolor y presentar la solución",
        "copy": "COPY COMPLETO de esta sección (mínimo 3 párrafos describiendo el problema y transición a la solución)",
        "design_notes": "notas visuales"
      },
      {
        "section_name": "Beneficios",
        "purpose": "comunicar los beneficios principales",
        "copy": "lista de beneficios con copy completo",
        "elements": ["iconos", "bullets", "imágenes"],
        "design_notes": "cómo presentar los beneficios"
      },
      {
        "section_name": "Oferta + Precio",
        "purpose": "presentar la oferta irresistible",
        "copy": "COPY COMPLETO del value stack, precio, comparación con alternativas",
        "cta": "texto del CTA de compra",
        "design_notes": "cómo presentar el precio vs valor"
      },
      {
        "section_name": "Garantía",
        "purpose": "eliminar riesgo percibido",
        "copy": "copy completo de la garantía",
        "design_notes": "cómo hacer la garantía visualmente prominente"
      },
      {
        "section_name": "FAQ",
        "purpose": "manejar objeciones restantes",
        "copy": "5-7 preguntas frecuentes con respuestas completas",
        "design_notes": "formato accordion o lista"
      },
      {
        "section_name": "CTA Final",
        "purpose": "última oportunidad de conversión",
        "copy": "copy de cierre urgente",
        "cta": "texto del CTA final",
        "design_notes": "urgencia visual"
      }
    ],
    "tool_recommendation": "herramienta recomendada para construirla (Webflow/Framer/Carrd/WordPress)"
  },
  "design_b": {
    "name": "Story-Driven Emocional",
    "style": "descripción del estilo visual más emocional/narrativo",
    "best_for": "para qué tipo de tráfico",
    "estimated_cvr": "% estimado",
    "sections": [
      {
        "section_name": "Hook Emocional",
        "purpose": "capturar atención con emoción",
        "headline": "headline emocional",
        "subheadline": "subheadline",
        "copy": "copy emocional completo del hook",
        "cta": "CTA inicial",
        "design_notes": "notas"
      },
      {
        "section_name": "Identificación con el Problema",
        "purpose": "hacer que se sientan comprendidos",
        "copy": "COPY COMPLETO describiendo el problema desde su perspectiva emocional",
        "design_notes": "usar imágenes relatable"
      },
      {
        "section_name": "Historia de Transformación",
        "purpose": "mostrar el viaje del antes al después",
        "copy": "historia de transformación completa (puede ser del fundador o cliente)",
        "design_notes": "fotos del antes/después si aplica"
      },
      {
        "section_name": "La Solución Revelada",
        "purpose": "presentar el producto como la solución",
        "copy": "copy de revelación del producto",
        "design_notes": "momento de revelación visual"
      },
      {
        "section_name": "Prueba Social Narrativa",
        "purpose": "testimonios en formato historia",
        "copy": "testimonios completos en formato narrativo",
        "design_notes": "video testimonios o quotes largos"
      },
      {
        "section_name": "Oferta con Urgencia",
        "purpose": "presentar oferta con elemento temporal",
        "copy": "copy de oferta con urgencia",
        "cta": "CTA urgente",
        "design_notes": "countdown timer, badges de escasez"
      },
      {
        "section_name": "Garantía con Confianza",
        "purpose": "eliminar el último obstáculo",
        "copy": "garantía presentada como gesto de confianza",
        "design_notes": "badges de seguridad, sellos"
      },
      {
        "section_name": "CTA Emocional Final",
        "purpose": "cierre emocional",
        "copy": "copy de cierre emocional conectando con su deseo profundo",
        "cta": "CTA emocional",
        "design_notes": "imagen aspiracional"
      }
    ],
    "tool_recommendation": "herramienta recomendada"
  },
  "comparison": {
    "winner_recommendation": "A|B|A/B_test",
    "justification": "por qué recomiendas esa opción basado en el tipo de producto y audiencia",
    "ab_test_hypothesis": "hipótesis para el A/B test: 'Creo que X va a ganar porque...'"
  }
}

IMPORTANTE: El "copy" de cada sección debe ser TEXTO COMPLETO listo para usar, NO un placeholder.
Cada sección debe tener suficiente contenido para implementarse directamente.`

    return { systemPrompt, userPrompt }
  },
}
