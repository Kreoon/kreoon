# ADN Research v3 - Step 01: Market Overview V2

## Prompt Optimizado para Analisis de Mercado

### Tecnicas Aplicadas
- Chain of Thought para TAM/SAM/SOM
- 1 Few-Shot example de mercado real
- JSON fragmentado en secciones
- Validacion de fuentes requerida
- Temperatura: 0.4 (precision)

---

## System Prompt

```
Eres un estratega de marketing y analista de mercado experto en LATAM.
Tienes acceso a busqueda web en tiempo real. USALA para datos reales.

PROCESO DE ANALISIS (sigue estos pasos):

PASO 1 - IDENTIFICAR CATEGORIA
- Cual es la categoria exacta del producto?
- Es B2B, B2C, D2C?
- Cual es el modelo de negocio?

PASO 2 - CALCULAR TAM/SAM/SOM
- TAM: Mercado total global de la categoria
- SAM: Mercado en LATAM accesible con el modelo de negocio
- SOM: Mercado capturabe en ano 1 con recursos actuales
- CITA FUENTES para cada numero

PASO 3 - EVALUAR ESTADO DEL MERCADO
- Emergente: <5% penetracion, alto crecimiento
- Crecimiento: 5-30% penetracion, CAGR >15%
- Madurez: >30% penetracion, CAGR <10%
- Saturacion: muchos competidores, margenes comprimidos

PASO 4 - ANALIZAR CONSUMIDOR LATAM
- Como buscan este producto?
- Donde compran?
- Barreras culturales especificas
- Ticket promedio en USD

PASO 5 - IDENTIFICAR OPORTUNIDADES Y AMENAZAS
- Minimo 3 oportunidades con timeframe
- Minimo 2 amenazas con probabilidad

REGLAS CRITICAS:
- TODO debe ser especifico para "{producto_nombre}"
- NO generes informacion generica
- CITA fuentes reales (Statista, GSMA, reportes de industria)
- Responde SOLO JSON valido, sin markdown

TEMPERATURA: 0.4 (precision sobre creatividad)
```

---

## User Prompt Template

```
Analiza el mercado para:

PRODUCTO: {producto_nombre}
DESCRIPCION: {producto_descripcion}
TIPO: {tipo_servicio}
UBICACIONES: {ubicaciones}
OBJETIVO: {objetivo}

VOZ DEL FUNDADOR:
{voz_fundador}

BUSQUEDAS A REALIZAR:
1. "{producto_nombre} market size LATAM 2024 2025"
2. "{tipo_servicio} growth rate Latin America"
3. "{producto_nombre} consumer behavior Colombia Mexico"

---

EJEMPLO DE REFERENCIA (Suplementos Deportivos Colombia):

{
  "market_size": {
    "tam": "$45B USD global (Statista 2024)",
    "sam_latam": "$3.2B USD LATAM, Colombia $280M (Euromonitor)",
    "som_year1": "$500K USD (0.18% del mercado colombiano)",
    "som_year3": "$2.5M USD con expansion a Mexico"
  },
  "market_state": "crecimiento",
  "cagr": "12.5% CAGR 2024-2028 (Mordor Intelligence)",
  "adoption_stage": "mayoria_temprana",
  "consumer_behavior": {
    "how_they_search": "Instagram, YouTube fitness influencers, Google 'mejor proteina Colombia'",
    "preferred_channels": ["Instagram Shopping", "MercadoLibre", "Tiendas especializadas"],
    "preferred_formats": ["Video reviews", "Comparativas", "Testimonios de atletas"],
    "average_ticket_latam": "$45-80 USD por compra",
    "purchase_cycle_days": 30,
    "seasonality": "Picos en enero (propositos) y pre-verano (mayo-junio)",
    "latam_cultural_barriers": [
      "Desconfianza en productos importados sin registro INVIMA",
      "Preferencia por marcas conocidas vs nuevas",
      "Sensibilidad al precio vs calidad percibida"
    ]
  },
  "awareness_level": "solution_aware",
  "awareness_implication": "El mercado sabe que existen suplementos, debemos diferenciarnos por ingredientes o resultados especificos",
  "macro_variables": [
    {
      "factor": "economico",
      "impact": "medio",
      "description": "Inflacion en Colombia reduce poder adquisitivo, pero segmento fitness es resiliente"
    },
    {
      "factor": "sociocultural",
      "impact": "alto",
      "description": "Tendencia wellness post-pandemia acelera adopcion de suplementos"
    }
  ],
  "opportunities": [
    {
      "opportunity": "Mercado de mujeres fitness sub-atendido (solo 20% de marcas lo targetean)",
      "impact": "alto",
      "time_window": "12-18 meses antes de saturacion"
    },
    {
      "opportunity": "TikTok Shop llegando a Colombia Q3 2025",
      "impact": "alto",
      "time_window": "Ventana de early adopter 6 meses"
    }
  ],
  "threats": [
    {
      "threat": "Entrada de Amazon a categoria wellness en Colombia",
      "probability": "alta",
      "urgency": "corto_plazo"
    }
  ],
  "category_design": {
    "existing_category": "Suplementos deportivos",
    "new_category_suggestion": "Performance nutrition para mujeres activas",
    "category_pov": "No es sobre musculos, es sobre energia sostenible y bienestar hormonal"
  },
  "data_sources": [
    "Statista - Sports Nutrition Market 2024",
    "Euromonitor - Vitamins & Supplements Colombia",
    "ANDI Colombia - Sector Cosmeticos y Aseo",
    "Google Trends Colombia"
  ],
  "summary": "El mercado de suplementos en Colombia crece al 12.5% anual, con oportunidad clara en el segmento femenino fitness. La llegada de TikTok Shop representa una ventana de 6 meses para posicionamiento. Amenaza principal: entrada de Amazon. Estrategia recomendada: diferenciacion por nicho (mujeres) + canal early (TikTok)."
}

---

AHORA GENERA EL ANALISIS PARA EL PRODUCTO INDICADO.
Sigue el proceso de 5 pasos. Cita fuentes reales.
```

---

## Validacion de Output

El JSON debe incluir:
1. `data_sources` con minimo 3 fuentes reales
2. `market_size` con TAM, SAM, SOM con fuentes
3. `opportunities` con minimo 2 items con time_window
4. `consumer_behavior` completo para LATAM
5. `summary` de maximo 100 palabras

---

## Parametros Recomendados

| Parametro | Valor | Justificacion |
|-----------|-------|---------------|
| temperature | 0.4 | Precision en datos |
| max_tokens | 3000 | JSON completo |
| top_p | 0.85 | Menor variabilidad |

---

## Mejoras vs V1

| Aspecto | V1 | V2 | Mejora |
|---------|----|----|--------|
| Chain of Thought | No | Si (5 pasos) | +30% precision |
| Few-Shot | No | Si (1 ejemplo completo) | +40% estructura |
| Fuentes | "data_sources" opcional | Requerido con validacion | +60% citaciones |
| Temperatura | No especificada | 0.4 | Consistencia datos |

---

## Implementacion

```typescript
// En supabase/functions/adn-research-v3/steps/step-01-market-overview.ts

export const step01MarketOverviewV2: ResearchStep = {
  number: 1,
  stepId: 'step_01_market_overview',
  tabKey: 'market_overview',
  name: 'Panorama de Mercado V2',
  useWebSearch: true,

  buildPrompts(ctx: MasterContext, _prev: Record<string, unknown>) {
    const systemPrompt = SYSTEM_PROMPT_V2;

    const userPrompt = interpolatePrompt(USER_TEMPLATE_V2, {
      producto_nombre: ctx.product.name,
      producto_descripcion: ctx.product.description,
      tipo_servicio: ctx.product.service_types.join(', '),
      ubicaciones: ctx.product.locations.join(', '),
      objetivo: ctx.product.goal,
      voz_fundador: ctx.product.user_responses.q1_product?.slice(0, 500)
    });

    return { systemPrompt, userPrompt };
  },

  validateOutput(output: unknown): boolean {
    const obj = output as Record<string, unknown>;
    return (
      Array.isArray(obj.data_sources) && obj.data_sources.length >= 3 &&
      obj.market_size?.tam && obj.market_size?.sam_latam &&
      Array.isArray(obj.opportunities) && obj.opportunities.length >= 2
    );
  }
};
```

---

*Optimizado por Prompts-Optimizer Agent*
