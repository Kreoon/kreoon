/**
 * Metodologia ESFERA - Framework de contenido por fases de embudo
 */

export const ESFERA_CONTEXT = `METODO ESFERA - Fases de Contenido:

ENGANCHAR (TOFU - Top of Funnel)
- Objetivo: Captar atencion, generar curiosidad
- Audiencia: Fria, no conoce la marca
- Tono: Disruptivo, viral, emocional
- Tecnicas: Hooks potentes, pattern interrupt, controversia constructiva

SOLUCION (MOFU - Middle of Funnel)
- Objetivo: Educar, demostrar valor, generar confianza
- Audiencia: Tibia, tiene el problema, busca soluciones
- Tono: Experto, empatico, demostrativo
- Tecnicas: Testimonios, demos, comparativas, responder objeciones

REMARKETING (BOFU - Bottom of Funnel)
- Objetivo: Convertir, superar objeciones finales
- Audiencia: Caliente, considerando compra
- Tono: Urgente, especifico, de cierre
- Tecnicas: Escasez, garantias, ofertas, casos de exito especificos

FIDELIZAR (Post-venta)
- Objetivo: Retener, generar recompra y referidos
- Audiencia: Clientes actuales
- Tono: Cercano, exclusivo, de comunidad
- Tecnicas: Tutoriales, unboxing, UGC de clientes, programas de lealtad`;

/**
 * Contexto corto de ESFERA para prompts con limite de tokens
 */
export const ESFERA_CONTEXT_SHORT = `Fases ESFERA:
- ENGANCHAR: Atencion, audiencia fria, hooks virales
- SOLUCION: Educar, audiencia tibia, demos y testimonios
- REMARKETING: Convertir, audiencia caliente, urgencia
- FIDELIZAR: Retener, clientes actuales, comunidad`;

/**
 * Mapeo de fases ESFERA a temperaturas de audiencia
 */
export const ESFERA_PHASE_MAP = {
  enganchar: { temperature: 'fria', funnel: 'TOFU', objective: 'awareness' },
  solucion: { temperature: 'tibia', funnel: 'MOFU', objective: 'consideration' },
  remarketing: { temperature: 'caliente', funnel: 'BOFU', objective: 'conversion' },
  fidelizar: { temperature: 'cliente', funnel: 'retention', objective: 'loyalty' },
} as const;

export type EsferaPhase = keyof typeof ESFERA_PHASE_MAP;
