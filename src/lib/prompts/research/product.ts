/**
 * PRODUCT RESEARCH - Prompts para investigacion de productos
 *
 * Usado por: product-research edge function
 * Variables: {producto_nombre}, {producto_url}, {categoria}, {pais}
 */

import { KREOON_IDENTITY_SHORT } from '../base/identity';

/**
 * Pasos de investigacion de producto (10 pasos)
 */
export const PRODUCT_RESEARCH_STEPS = {
  step1_overview: {
    name: 'Vision General',
    prompt: `${KREOON_IDENTITY_SHORT}

Analiza el producto "{producto_nombre}" y proporciona:

1. DESCRIPCION GENERAL (2-3 parrafos)
2. CATEGORIA Y NICHO
3. PRECIO APROXIMADO
4. PUBLICO OBJETIVO INICIAL

Responde en formato JSON:
{
  "descripcion": "...",
  "categoria": "...",
  "nicho": "...",
  "precio_rango": "...",
  "publico_inicial": "..."
}`,
  },

  step2_competitors: {
    name: 'Competidores',
    prompt: `${KREOON_IDENTITY_SHORT}

Lista los 5 principales competidores de "{producto_nombre}" en {pais}:

Para cada competidor incluye:
- Nombre
- Precio
- Diferenciador principal
- Debilidad

Responde en JSON:
{
  "competidores": [
    {"nombre": "...", "precio": "...", "diferenciador": "...", "debilidad": "..."}
  ]
}`,
  },

  step3_pain_points: {
    name: 'Puntos de Dolor',
    prompt: `${KREOON_IDENTITY_SHORT}

Identifica los 5 principales puntos de dolor que resuelve "{producto_nombre}":

Para cada punto de dolor:
- Descripcion del problema
- Intensidad (1-10)
- Frecuencia (diaria/semanal/mensual)
- Alternativas actuales

Responde en JSON:
{
  "pain_points": [
    {"problema": "...", "intensidad": 8, "frecuencia": "...", "alternativas": "..."}
  ]
}`,
  },

  step4_benefits: {
    name: 'Beneficios',
    prompt: `${KREOON_IDENTITY_SHORT}

Lista los beneficios principales de "{producto_nombre}":

Categoriza en:
- FUNCIONALES (que hace)
- EMOCIONALES (como hace sentir)
- SOCIALES (como te perciben otros)

Responde en JSON:
{
  "funcionales": ["..."],
  "emocionales": ["..."],
  "sociales": ["..."]
}`,
  },

  step5_objections: {
    name: 'Objeciones',
    prompt: `${KREOON_IDENTITY_SHORT}

Lista las 5 objeciones mas comunes para "{producto_nombre}":

Para cada objecion:
- Objecion
- Tipo (precio/confianza/necesidad/tiempo)
- Respuesta sugerida

Responde en JSON:
{
  "objeciones": [
    {"objecion": "...", "tipo": "...", "respuesta": "..."}
  ]
}`,
  },

  step6_hooks: {
    name: 'Hooks',
    prompt: `${KREOON_IDENTITY_SHORT}

Genera 10 hooks virales para "{producto_nombre}":

Tipos de hooks:
- CURIOSIDAD (genera intriga)
- CONTROVERSIA (opinion fuerte)
- TRANSFORMACION (antes/despues)
- AUTORIDAD (dato o experto)
- EMPATIA (conexion emocional)

Responde en JSON:
{
  "hooks": [
    {"texto": "...", "tipo": "...", "emocion": "..."}
  ]
}`,
  },

  step7_angles: {
    name: 'Angulos de Venta',
    prompt: `${KREOON_IDENTITY_SHORT}

Genera 5 angulos de venta unicos para "{producto_nombre}":

Para cada angulo:
- Nombre del angulo
- Descripcion
- Avatar ideal
- Emocion principal
- CTA sugerido

Responde en JSON:
{
  "angulos": [
    {"nombre": "...", "descripcion": "...", "avatar": "...", "emocion": "...", "cta": "..."}
  ]
}`,
  },

  step8_ctas: {
    name: 'CTAs',
    prompt: `${KREOON_IDENTITY_SHORT}

Genera 10 CTAs efectivos para "{producto_nombre}":

Categorias:
- URGENCIA (ahora o nunca)
- CURIOSIDAD (descubre mas)
- BENEFICIO (obtiene X)
- SOCIAL PROOF (unete a miles)

Responde en JSON:
{
  "ctas": [
    {"texto": "...", "categoria": "...", "uso_ideal": "..."}
  ]
}`,
  },

  step9_content_ideas: {
    name: 'Ideas de Contenido',
    prompt: `${KREOON_IDENTITY_SHORT}

Genera 15 ideas de contenido para "{producto_nombre}":

Por fase ESFERA:
- ENGANCHAR (5 ideas)
- SOLUCION (5 ideas)
- REMARKETING (3 ideas)
- FIDELIZAR (2 ideas)

Responde en JSON:
{
  "enganchar": [{"idea": "...", "formato": "...", "hook": "..."}],
  "solucion": [...],
  "remarketing": [...],
  "fidelizar": [...]
}`,
  },

  step10_summary: {
    name: 'Resumen Ejecutivo',
    prompt: `${KREOON_IDENTITY_SHORT}

Genera un resumen ejecutivo de la investigacion de "{producto_nombre}":

Incluye:
- OPORTUNIDAD DE MERCADO (1 parrafo)
- AVATAR IDEAL (demografico + psicografico)
- MENSAJE CENTRAL (1 frase)
- TOP 3 ANGULOS RECOMENDADOS
- SIGUIENTES PASOS

Responde en JSON:
{
  "oportunidad": "...",
  "avatar": {"demografico": "...", "psicografico": "..."},
  "mensaje_central": "...",
  "top_angulos": ["...", "...", "..."],
  "siguientes_pasos": ["...", "...", "..."]
}`,
  },
};

export const PRODUCT_RESEARCH_CONFIG = {
  id: 'research.product',
  name: 'Product Research',
  description: 'Investigacion completa de producto en 10 pasos',
  temperature: 0.7,
  maxTokens: 2000,
  totalSteps: 10,
};
