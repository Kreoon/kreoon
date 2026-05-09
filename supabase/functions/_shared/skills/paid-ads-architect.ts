import { Skill } from './types.ts';

/**
 * Paid Ads Architect — Estructura de Campañas Meta + TikTok
 * Método CONVERT de Kreoon — Capa E (Engagement) + Capa T (Tracción)
 */
export const paidAdsArchitect: Skill = {
  id: 'paid_ads_architect',
  name: 'Arquitecto de Paid Ads',
  description: 'Estructura de campanas Meta y TikTok por temperatura (frio/tibio/caliente)',
  priority: 8.3,

  triggers: {
    sphere_phase: ['engage', 'solution', 'remarketing'],
  },

  systemPrompt: `
# SKILL: Paid Ads Architect — Estructura de Campañas que Convierten

FILOSOFIA (Meta + TikTok LATAM 2025):
El error #1 de los anunciantes LATAM es tener una sola campana intentando
hacer todo. La estructura correcta replica el journey del consumidor:
frio → tibio → caliente — con mensajes, audiencias y objetivos distintos.

## ESTRUCTURA DE CAMPANAS POR TEMPERATURA

### NIVEL FRIO — Audiencia que NO te conoce (Niveles 1-2 de conciencia)
- Objetivo: Alcance / Video Views / Brand Awareness
- Presupuesto: 20-30% del total
- Audiencias: Intereses amplios + Look-alike 5-10% de clientes
- Creative: Hook de identificacion, sin mencionar el producto en los primeros 5s
- Copy: Problema + curiosidad, sin CTA agresivo
- Duracion antes de evaluar: 7 dias minimo
- KPI para escalar: CPM <$5 USD, Completion rate >40%

### NIVEL TIBIO — Audiencia que interactuo pero no compro (Niveles 3-4)
- Objetivo: Trafico / Conversiones / Lead Generation
- Presupuesto: 40-50% del total
- Audiencias: Retargeting 30 dias + Look-alike 1-3% de compradores
- Creative: Educativo + prueba social especifica + comparativa
- Copy: Beneficio especifico + objecion neutralizada + CTA suave
- Duracion antes de evaluar: 5 dias
- KPI para escalar: CTR >2%, Costo por lead <30% del ticket

### NIVEL CALIENTE — Interesados activos (Niveles 4-5)
- Objetivo: Conversiones / Mensajes / Llamadas
- Presupuesto: 30-40% del total
- Audiencias: Retargeting 7 dias + visitantes de landing + lista propia
- Creative: Testimonial + oferta + urgencia real
- Copy: Oferta directa + garantia + friccion minima
- Duracion antes de evaluar: 3 dias
- KPI para escalar: ROAS >2.5x, CPA <40% del ticket

## REGLAS DE CREATIVOS POR PLATAFORMA

### META (Facebook/Instagram)
- Imagen: Ratio 1:1 para feed, 9:16 para stories/reels
- Video: 15-30s para feeds, 6-15s para reels
- Texto headline: ≤27 caracteres (lo que no se corta)
- Copy principal: Primeras 125 caracteres son los mas importantes
- CTA: Elegir el mas especifico disponible (Learn More para frio, Shop Now para caliente)

### TIKTOK
- Solo video vertical 9:16, minimo 720p
- Los primeros 3 segundos determinan todo
- Texto en pantalla: OBLIGATORIO (muchos ven sin sonido)
- UGC nativo > produccion pulida (el algoritmo favorece lo autentico)
- Trending sounds: aumentan alcance organico en Spark Ads

## PRESUPUESTO MINIMO POR PLATAFORMA (LATAM)

- Meta: $10 USD/dia por ad set para tener datos significativos en 7 dias
- TikTok: $20 USD/dia por ad group (CPMs mas altos pero volumen mayor)
- Google Search: $15 USD/dia para terminos de compra (bottom funnel)

## REGLAS DE ESCALAMIENTO (Hopkins aplicado a paid)

1. Nunca escalar mas del 20% del presupuesto por dia
2. Escalar solo cuando ROAS > target por 3 dias consecutivos
3. Matar ad sets con CPA > 2x target despues de 3 dias y $30+ gastados
4. Testear 1 variable a la vez: headline O imagen O audiencia (nunca todo a la vez)
5. El creative ganador organico → testear en paid (ya tiene prueba social)

## SENALES DE ALERTA EN LATAM

- CPM muy alto (>$15 USD): Audiencia muy pequena o senal de baja relevancia
- CTR <0.5%: El creative no engancha — cambiar hook
- CPC alto pero buena tasa de conversion: Problema de volumen, no de calidad
- Frequency >3 en 7 dias: Audiencia quemada — rotar creativos o ampliar audiencia
`,
};
