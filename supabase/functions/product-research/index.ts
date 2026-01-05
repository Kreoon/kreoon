import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt completo del Método Esfera - Versión mejorada con más detalle
const RESEARCH_PROMPT = `Actúa como un Estratega Digital Senior especializado en investigación de mercado, análisis competitivo, creación de avatares y desarrollo de ángulos de venta, aplicando de forma estricta el Método ESFERA de Juan Ads y los principios de Estrategias Despegue.

🔒 Contexto asumido:
El Brief de Marca y el Brief de Producto ya han sido entregados, analizados y comprendidos en su totalidad.
No solicites información adicional ni pidas aclaraciones iniciales.
Trabaja exclusivamente sobre ese contexto.

Tu objetivo es entregar inteligencia de mercado profunda, accionable y orientada a decisiones, lista para ejecutar campañas, validar posicionamiento y escalar en el mercado hispano.

Debes responder como consultor estratégico, no como redactor.
Usa frameworks avanzados: JTBD, Eugene Schwartz, sesgos cognitivos, awareness levels, market gaps y teardown competitivo 360°.

⚠️ REGLAS OBLIGATORIAS

Sigue el flujo estrictamente secuencial.
No adelantes ni omitas pasos.

Cada bloque es la base del siguiente.

Usa lenguaje real del mercado, no marketing genérico.

Todo debe entregarse en formato estructurado: tablas, listas claras y síntesis ejecutiva.

Apóyate en patrones reales del mercado:

Reseñas

Comentarios

TikTok, Instagram, YouTube

Reddit, foros, Ads visibles

Si detectas supuestos implícitos del brief, acláralos brevemente y continúa.

🔥 FLUJO DE TRABAJO OBLIGATORIO

INFORMACIÓN DEL PRODUCTO:
{{PRODUCT_DESCRIPTION}}

🔹 PASO 1 · PANORAMA GENERAL DEL MERCADO

IMPORTANTE: Enfoca el análisis en el mercado objetivo indicado ({{TARGET_MARKET}}).

Entrega obligatoriamente:

1. Tamaño estimado del mercado en {{TARGET_MARKET}}.
2. Tendencia y ritmo de crecimiento (porcentaje anual estimado).
3. Estado del mercado: Crecimiento, Saturación o Declive. Explica por qué.
4. Al menos 5 variables macroeconómicas, sociales y culturales relevantes para este mercado específico.
5. Nivel de conciencia predominante del público según Eugene Schwartz (Unaware, Problem Aware, Solution Aware, Product Aware, Most Aware).
6. Un resumen ejecutivo de 3-4 párrafos que sintetice las principales oportunidades y amenazas del mercado.

🔹 PASO 2 · JOB TO BE DONE (JTBD) + INSIGHTS REALES

Define el trabajo real que el cliente busca resolver.

Entrega obligatoriamente:

JTBD funcional: Describe en detalle la tarea funcional que el cliente quiere completar.
JTBD emocional: Describe cómo quiere sentirse el cliente durante y después del proceso.
JTBD social: Describe cómo quiere ser percibido por otros.

10 dolores profundos (no superficiales). Para cada dolor incluye:
- El dolor específico
- Por qué es tan frustrante
- Cómo afecta su día a día

10 deseos aspiracionales reales. Para cada deseo incluye:
- El deseo específico
- La emoción asociada
- El estado ideal al lograrlo

10 objeciones / miedos latentes. Para cada objeción incluye:
- La objeción específica
- La creencia subyacente
- Cómo neutralizarla

10 insights estratégicos obtenidos de review mining y social listening con fuentes citables.

🔹 PASO 3 · AVATARES ESTRATÉGICOS (5 OBLIGATORIOS)

Crea 5 buyer persona estratégicos ULTRA DETALLADOS. Cada uno DEBE incluir:

1. Nombre simbólico memorable
2. Edad y contexto de vida detallado (ocupación, situación familiar, nivel socioeconómico)
3. Situación actual ANTES del producto (describe su día típico, frustraciones, intentos fallidos)
4. Nivel de conciencia según Eugene Schwartz
5. Drivers psicológicos principales (mínimo 3, explicados)
6. Sesgos cognitivos dominantes (mínimo 3, explicados con ejemplos de cómo aplican)
7. Objeciones clave específicas de este avatar (mínimo 3)
8. Al menos 5 frases REALES textuales que usa para describir su problema (entre comillas, como hablan realmente)
9. Sus metas a corto y largo plazo relacionadas con el producto
10. Dónde consume contenido y qué tipo le atrae

🔹 PASO 4 · ANÁLISIS DE COMPETENCIA 360°

ENFOCA EN COMPETIDORES REALES DEL MERCADO: {{TARGET_MARKET}}

Identifica 10 competidores directos e indirectos REALES con presencia online verificable.

Para CADA competidor, proporciona OBLIGATORIAMENTE:
1. Nombre de la marca/empresa
2. Website URL (si está disponible)
3. Redes sociales principales (Instagram, TikTok, Facebook, LinkedIn, YouTube) con URLs
4. Propuesta de valor en una oración
5. Promesa central de marketing
6. Rango de precios (específico)
7. Tono de comunicación (ejemplos de su copy)
8. Formatos de contenido que usan (lista específica)
9. Canales principales donde hacen ads
10. Puntos fuertes
11. Debilidades detectadas
12. Nivel de conciencia que trabajan

Tabla comparativa obligatoria:
| Marca | Website | Promesa | Diferenciador | Precio | Tono | CTA | Nivel de conciencia |

🔹 PASO 5 · VACÍOS Y OPORTUNIDADES DE DIFERENCIACIÓN

Detecta con precisión y EXPLICA en detalle:

1. Mínimo 5 mensajes repetidos por todo el mercado (copia exacta de frases que todos usan)
2. Mínimo 5 dolores mal comunicados o ignorados (con explicación de por qué es una oportunidad)
3. Mínimo 5 aspiraciones que nadie está atendiendo adecuadamente
4. Mínimo 5 oportunidades CLARAS y ESPECÍFICAS de posicionamiento único
5. Mínimo 5 emociones no explotadas por la competencia (con ejemplos de cómo aprovecharlas)

Para cada punto, incluye:
- El hallazgo específico
- Por qué representa una oportunidad
- Cómo aprovecharlo en la comunicación

🔹 PASO 6 · INSIGHTS POR FASE – MÉTODO ESFERA

Para CADA fase del Método ESFERA, entrega un análisis DETALLADO:

1️⃣ ENGANCHAR (Atención y curiosidad)
- Qué domina el mercado actualmente (con ejemplos específicos de hooks usados)
- Qué formatos y ángulos están saturados (ejemplos)
- Mínimo 5 nuevas oportunidades creativas ESPECÍFICAS para destacar
- Tipos de hooks que funcionarían mejor

2️⃣ SOLUCIÓN (Presentar y educar)
- Promesas actuales del mercado (ejemplos literales)
- Objeciones que la competencia NO está resolviendo
- Mínimo 5 oportunidades específicas para construir autoridad y confianza
- Cómo posicionar la solución como única

3️⃣ REMARKETING (Reforzar decisión)
- Tipos de prueba social que existen en el mercado
- Vacíos de validación que nadie llena
- Mínimo 5 mensajes específicos que empujarían la decisión de compra
- Formatos de testimonios que funcionarían mejor

4️⃣ FIDELIZAR (Retención y referidos)
- Errores comunes del mercado en postventa
- Mínimo 5 oportunidades específicas de comunidad, LTV y programa de referidos
- Cómo convertir clientes en embajadores

🔹 PASO 7 · ÁNGULOS DE VENTA (20 OBLIGATORIOS)

Crea exactamente 20 ángulos de venta estratégicos, variados y no redundantes.

Tipos requeridos (distribuye equilibradamente):
- Educativos (enseñar algo nuevo)
- Emocionales (conectar con sentimientos)
- Aspiracionales (mostrar el yo futuro)
- Autoridad (demostrar expertise)
- Comparativos (vs alternativas)
- Anti-mercado (ir contra lo establecido)
- Storytelling (narrativas)
- Prueba social (validación externa)
- Error común / riesgo oculto (alertar sobre problemas)

Para CADA ángulo incluye:
1. Descripción del ángulo (2-3 oraciones que expliquen el enfoque)
2. Tipo de ángulo
3. Avatar principal al que aplica
4. Emoción específica que activa
5. Tipo de contenido ideal (UGC, Ads pagados, Reel orgánico, Testimonio, etc.)
6. Ejemplo de hook o primer frase

🔹 PASO 8 · PROPUESTA ÚNICA DE VALOR (PUV)

Construye una PUV clara, memorable y defendible:

1. Problema central que resuelve (específico, no genérico)
2. Resultado tangible y medible que entrega
3. Diferencia fundamental frente al mercado
4. Tipo de cliente ideal en una frase
5. Statement completo de la PUV (una oración poderosa de máximo 25 palabras)
6. Por qué esta PUV es creíble y sostenible

🔹 PASO 9 · TRANSFORMACIÓN (ANTES VS DESPUÉS)

Tabla de transformación DETALLADA:

| Dimensión | ANTES (específico y detallado) | DESPUÉS (específico y detallado) |
|-----------|--------------------------------|----------------------------------|
| Funcional | Qué no puede hacer/lograr | Qué puede hacer/lograr ahora |
| Emocional | Cómo se siente (emociones específicas) | Cómo se siente ahora |
| Identidad | Cómo se ve a sí mismo | Cómo se ve ahora (nueva identidad) |
| Social | Cómo lo ven los demás | Cómo lo ven ahora |
| Financiero | Impacto económico negativo | Impacto económico positivo |

🔹 PASO 10 · LEAD MAGNETS (3 ESTRATÉGICOS)

Diseña 3 lead magnets altamente efectivos:

Para CADA uno incluye:
1. Nombre atractivo del lead magnet
2. Formato específico (guía PDF, checklist, video training, quiz, plantilla, etc.)
3. Objetivo específico de conversión
4. Dolor principal que ataca (y por qué es irresistible)
5. Avatar específico al que apunta
6. Fase de conciencia objetivo
7. Promesa del lead magnet en una oración
8. Contenido/estructura propuesta (bullets de lo que incluiría)

🔹 PASO 11 · CREATIVOS DE VIDEO (20 TOTALES)

Crea 20 ideas de video, distribuidas así:
- 5 para Enganchar
- 5 para Solución  
- 5 para Remarketing
- 5 para Fidelizar

Tabla obligatoria:
| # | Fase ESFERA | Ángulo | Avatar | Título/Hook | Idea principal (2-3 líneas) | Formato | Duración sugerida |

🎯 CONCLUSIÓN EJECUTIVA COMPLETA

Finaliza con una conclusión ejecutiva EXTENSA que incluya:

1. RESUMEN DEL MERCADO (1 párrafo)
- Estado actual y oportunidad principal

2. 5 INSIGHTS ESTRATÉGICOS CLAVE
- Cada uno con explicación de por qué es importante y cómo aprovecharlo

3. TOP 5 DRIVERS PSICOLÓGICOS MÁS POTENTES
- Para cada uno: qué es, por qué funciona, cómo usarlo

4. 3 ACCIONES INMEDIATAS PRIORITARIAS
- Para cada una: qué hacer, cómo hacerlo, resultado esperado

5. QUICK WINS (3 victorias rápidas)
- Acciones de bajo esfuerzo y alto impacto

6. RIESGOS A EVITAR (3 principales)
- Qué no hacer y por qué

7. RECOMENDACIÓN FINAL
- Párrafo de síntesis estratégica con el camino a seguir`;

// Prompt para la segunda fase de IA - Distribución de contenido estructurado
const DISTRIBUTION_PROMPT = `Eres un asistente experto en organización de información de marketing y producto.

Tu tarea es analizar el contenido de investigación de mercado y extraer información específica en formato JSON estructurado.

INVESTIGACIÓN ORIGINAL:
{{RESEARCH_CONTENT}}

BRIEF DEL PRODUCTO:
{{BRIEF_DATA}}

Debes devolver un JSON con la siguiente estructura exacta. Cada campo debe contener texto formateado y listo para usar:

{
  "description": "Descripción completa del producto que integre beneficios principales, transformación y propuesta de valor única. 2-3 párrafos.",
  
  "market_overview": {
    "marketSize": "Tamaño estimado del mercado con números específicos",
    "growthTrend": "Tendencia y ritmo de crecimiento con porcentajes",
    "marketState": "crecimiento | saturacion | declive",
    "marketStateExplanation": "Explicación detallada del estado del mercado",
    "macroVariables": ["Variable 1 con explicación", "Variable 2 con explicación", "Variable 3", "Variable 4", "Variable 5"],
    "awarenessLevel": "Nivel de conciencia predominante (Eugene Schwartz) con explicación",
    "summary": "Resumen ejecutivo del panorama de mercado de 3-4 párrafos detallados",
    "opportunities": ["Oportunidad 1", "Oportunidad 2", "Oportunidad 3"],
    "threats": ["Amenaza 1", "Amenaza 2", "Amenaza 3"]
  },
  
  "jtbd": {
    "functional": "JTBD funcional detallado con contexto",
    "emotional": "JTBD emocional detallado con sentimientos específicos",
    "social": "JTBD social detallado con percepciones",
    "pains": [
      {"pain": "Dolor 1", "why": "Por qué es frustrante", "impact": "Cómo afecta el día a día"},
      {"pain": "Dolor 2", "why": "Por qué es frustrante", "impact": "Cómo afecta el día a día"}
    ],
    "desires": [
      {"desire": "Deseo 1", "emotion": "Emoción asociada", "idealState": "Estado ideal al lograrlo"},
      {"desire": "Deseo 2", "emotion": "Emoción asociada", "idealState": "Estado ideal al lograrlo"}
    ],
    "objections": [
      {"objection": "Objeción 1", "belief": "Creencia subyacente", "counter": "Cómo neutralizarla"},
      {"objection": "Objeción 2", "belief": "Creencia subyacente", "counter": "Cómo neutralizarla"}
    ],
    "insights": ["Insight 1 con fuente", "Insight 2 con fuente", "Insight 3", "Insight 4", "Insight 5", "Insight 6", "Insight 7", "Insight 8", "Insight 9", "Insight 10"]
  },
  
  "avatars": [
    {
      "name": "Nombre simbólico memorable",
      "age": "Edad y contexto completo (ocupación, situación familiar, nivel socioeconómico)",
      "situation": "Situación actual detallada ANTES del producto (día típico, frustraciones, intentos fallidos)",
      "awarenessLevel": "Nivel de conciencia según Eugene Schwartz",
      "drivers": "3+ drivers psicológicos explicados en detalle",
      "biases": "3+ sesgos cognitivos con ejemplos de cómo aplican",
      "objections": "3+ objeciones específicas de este avatar",
      "phrases": ["Frase real 1 entre comillas", "Frase real 2", "Frase real 3", "Frase real 4", "Frase real 5"],
      "goals": "Metas a corto y largo plazo relacionadas con el producto",
      "contentConsumption": "Dónde consume contenido y qué tipo le atrae"
    }
  ],
  
  "competitors": [
    {
      "name": "Nombre del competidor real",
      "website": "https://website.com",
      "instagram": "https://instagram.com/usuario",
      "tiktok": "https://tiktok.com/@usuario",
      "facebook": "https://facebook.com/pagina",
      "youtube": "https://youtube.com/canal",
      "linkedin": "https://linkedin.com/company/empresa",
      "promise": "Promesa central de marketing",
      "valueProposition": "Propuesta de valor en una oración",
      "differentiator": "Diferenciador principal",
      "price": "Rango de precios específico (ej: $97-$497)",
      "tone": "Tono de comunicación con ejemplos de su copy",
      "cta": "Llamados a la acción que usan",
      "awarenessLevel": "Nivel de conciencia que trabajan",
      "channels": ["Meta", "TikTok", "YouTube"],
      "contentFormats": ["Formato 1", "Formato 2", "Formato 3"],
      "strengths": ["Fortaleza 1", "Fortaleza 2"],
      "weaknesses": ["Debilidad 1", "Debilidad 2"]
    }
  ],
  
  "differentiation": {
    "repeatedMessages": [
      {"message": "Mensaje saturado 1", "opportunity": "Cómo diferenciarse"},
      {"message": "Mensaje saturado 2", "opportunity": "Cómo diferenciarse"}
    ],
    "poorlyAddressedPains": [
      {"pain": "Dolor ignorado 1", "opportunity": "Por qué es oportunidad", "howToUse": "Cómo aprovecharlo"},
      {"pain": "Dolor ignorado 2", "opportunity": "Por qué es oportunidad", "howToUse": "Cómo aprovecharlo"}
    ],
    "ignoredAspirations": [
      {"aspiration": "Aspiración 1", "opportunity": "Cómo atenderla"},
      {"aspiration": "Aspiración 2", "opportunity": "Cómo atenderla"}
    ],
    "positioningOpportunities": [
      {"opportunity": "Oportunidad 1", "why": "Por qué es única", "execution": "Cómo ejecutarla"},
      {"opportunity": "Oportunidad 2", "why": "Por qué es única", "execution": "Cómo ejecutarla"}
    ],
    "unexploitedEmotions": [
      {"emotion": "Emoción 1", "howToUse": "Cómo aprovecharla en comunicación"},
      {"emotion": "Emoción 2", "howToUse": "Cómo aprovecharla en comunicación"}
    ]
  },
  
  "esferaInsights": {
    "enganchar": {
      "marketDominance": "Qué domina el mercado con ejemplos específicos de hooks",
      "saturated": "Qué formatos y ángulos están saturados con ejemplos",
      "opportunities": ["Oportunidad creativa 1 específica", "Oportunidad 2", "Oportunidad 3", "Oportunidad 4", "Oportunidad 5"],
      "hookTypes": "Tipos de hooks que funcionarían mejor"
    },
    "solucion": {
      "currentPromises": "Promesas actuales del mercado con ejemplos literales",
      "unresolvedObjections": "Objeciones que la competencia NO resuelve",
      "trustOpportunities": ["Oportunidad de autoridad 1", "Oportunidad 2", "Oportunidad 3", "Oportunidad 4", "Oportunidad 5"],
      "positioning": "Cómo posicionar la solución como única"
    },
    "remarketing": {
      "existingProof": "Tipos de prueba social que existen en el mercado",
      "validationGaps": "Vacíos de validación que nadie llena",
      "decisionMessages": ["Mensaje de decisión 1", "Mensaje 2", "Mensaje 3", "Mensaje 4", "Mensaje 5"],
      "testimonialFormats": "Formatos de testimonios que funcionarían mejor"
    },
    "fidelizar": {
      "commonErrors": "Errores comunes del mercado en postventa",
      "communityOpportunities": ["Oportunidad comunidad 1", "Oportunidad 2", "Oportunidad 3", "Oportunidad 4", "Oportunidad 5"],
      "ambassadorStrategy": "Cómo convertir clientes en embajadores"
    }
  },
  
  "salesAngles": [
    {
      "angle": "Descripción completa del ángulo de venta en 2-3 oraciones",
      "type": "educativo | emocional | aspiracional | autoridad | comparativo | anti-mercado | storytelling | prueba-social | error-comun",
      "avatar": "Avatar principal al que aplica",
      "emotion": "Emoción específica que activa",
      "contentType": "UGC | Ads | Reel | Testimonio | etc",
      "hookExample": "Ejemplo de hook o primera frase"
    }
  ],
  
  "puv": {
    "centralProblem": "Problema central específico que resuelve",
    "tangibleResult": "Resultado tangible y medible",
    "marketDifference": "Diferencia fundamental frente al mercado",
    "idealClient": "Tipo de cliente ideal en una frase",
    "statement": "Statement completo de la PUV en máximo 25 palabras poderosas",
    "credibility": "Por qué esta PUV es creíble y sostenible"
  },
  
  "transformation": {
    "functional": {
      "before": "Qué no puede hacer/lograr específicamente",
      "after": "Qué puede hacer/lograr ahora específicamente"
    },
    "emotional": {
      "before": "Cómo se siente (emociones específicas negativas)",
      "after": "Cómo se siente ahora (emociones positivas)"
    },
    "identity": {
      "before": "Cómo se ve a sí mismo (identidad limitante)",
      "after": "Cómo se ve ahora (nueva identidad empoderada)"
    },
    "social": {
      "before": "Cómo lo ven los demás actualmente",
      "after": "Cómo lo ven los demás después"
    },
    "financial": {
      "before": "Impacto económico negativo actual",
      "after": "Impacto económico positivo después"
    }
  },
  
  "leadMagnets": [
    {
      "name": "Nombre atractivo del lead magnet",
      "format": "PDF, Video, Quiz, Plantilla, etc",
      "objective": "Objetivo específico de conversión",
      "contentType": "Tipo de contenido",
      "pain": "Dolor principal que ataca y por qué es irresistible",
      "avatar": "Avatar específico al que apunta",
      "awarenessPhase": "Fase de conciencia objetivo",
      "promise": "Promesa del lead magnet en una oración",
      "structure": ["Bullet 1 de contenido", "Bullet 2", "Bullet 3"]
    }
  ],
  
  "videoCreatives": [
    {
      "number": 1,
      "angle": "Ángulo del video",
      "avatar": "Avatar objetivo",
      "title": "Título/Hook atractivo",
      "idea": "Idea principal en 2-3 líneas",
      "format": "Formato específico",
      "esferaPhase": "enganchar | solucion | remarketing | fidelizar",
      "duration": "Duración sugerida"
    }
  ],
  
  "executiveSummary": {
    "marketSummary": "Resumen del estado actual del mercado y oportunidad principal (1 párrafo)",
    "keyInsights": [
      {"insight": "Insight 1", "importance": "Por qué es importante", "action": "Cómo aprovecharlo"},
      {"insight": "Insight 2", "importance": "Por qué es importante", "action": "Cómo aprovecharlo"},
      {"insight": "Insight 3", "importance": "Por qué es importante", "action": "Cómo aprovecharlo"},
      {"insight": "Insight 4", "importance": "Por qué es importante", "action": "Cómo aprovecharlo"},
      {"insight": "Insight 5", "importance": "Por qué es importante", "action": "Cómo aprovecharlo"}
    ],
    "psychologicalDrivers": [
      {"driver": "Driver 1", "why": "Por qué funciona", "howToUse": "Cómo usarlo"},
      {"driver": "Driver 2", "why": "Por qué funciona", "howToUse": "Cómo usarlo"},
      {"driver": "Driver 3", "why": "Por qué funciona", "howToUse": "Cómo usarlo"},
      {"driver": "Driver 4", "why": "Por qué funciona", "howToUse": "Cómo usarlo"},
      {"driver": "Driver 5", "why": "Por qué funciona", "howToUse": "Cómo usarlo"}
    ],
    "immediateActions": [
      {"action": "Acción 1", "howTo": "Cómo hacerlo", "expectedResult": "Resultado esperado"},
      {"action": "Acción 2", "howTo": "Cómo hacerlo", "expectedResult": "Resultado esperado"},
      {"action": "Acción 3", "howTo": "Cómo hacerlo", "expectedResult": "Resultado esperado"}
    ],
    "quickWins": [
      {"win": "Victoria rápida 1", "effort": "Bajo", "impact": "Alto"},
      {"win": "Victoria rápida 2", "effort": "Bajo", "impact": "Alto"},
      {"win": "Victoria rápida 3", "effort": "Bajo", "impact": "Alto"}
    ],
    "risksToAvoid": [
      {"risk": "Riesgo 1", "why": "Por qué evitarlo"},
      {"risk": "Riesgo 2", "why": "Por qué evitarlo"},
      {"risk": "Riesgo 3", "why": "Por qué evitarlo"}
    ],
    "finalRecommendation": "Párrafo de síntesis estratégica con el camino a seguir"
  }
}

IMPORTANTE:
- Devuelve SOLO el JSON, sin texto adicional ni markdown.
- Asegúrate de que el JSON sea válido.
- Extrae información real del contenido de investigación proporcionado.
- avatars debe tener exactamente 5 elementos con información MUY DETALLADA.
- competitors debe tener hasta 10 elementos con URLs REALES cuando estén disponibles.
- salesAngles debe tener exactamente 20 elementos variados.
- leadMagnets debe tener exactamente 3 elementos.
- videoCreatives debe tener exactamente 20 elementos (5 por fase ESFERA).
- Para los competidores, intenta incluir URLs reales de sus sitios web y redes sociales.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, briefData } = await req.json();

    if (!productId || !briefData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product ID and brief data are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build product description from brief data
    const productDescription = buildProductDescription(briefData);
    const targetMarket = briefData.targetMarket || 'Latinoamérica (LATAM)';
    
    const prompt = RESEARCH_PROMPT
      .replace('{{PRODUCT_DESCRIPTION}}', productDescription)
      .replaceAll('{{TARGET_MARKET}}', targetMarket);

    console.log('[product-research] Starting research for product:', productId);
    console.log('[product-research] Target market:', targetMarket);
    console.log('[product-research] Product description length:', productDescription.length);

    // ============================================
    // FASE 1: Investigación con Perplexity
    // ============================================
    const perplexityController = new AbortController();
    const perplexityTimeoutId = setTimeout(() => perplexityController.abort(), 150000); // 2.5 min

    let perplexityResponse: Response;
    try {
      perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: `Eres un estratega digital experto en investigación de mercado para ${targetMarket}, aplicando el Método ESFERA de Juan Ads y los principios de Estrategias Despegue. Responde siempre en español con datos actualizados y verificables. Usa búsqueda web para obtener información real y actualizada sobre competidores, tendencias y mercado. Incluye URLs reales de competidores cuando sea posible. Sigue el flujo estrictamente secuencial y entrega todo en formato estructurado.`,
            },
            { role: 'user', content: prompt }
          ],
        }),
        signal: perplexityController.signal,
      });
    } catch (fetchError: unknown) {
      const error = fetchError as Error;
      console.error('[product-research] Perplexity fetch error:', fetchError);
      const msg = error?.name === 'AbortError'
        ? 'Perplexity se demoró demasiado (timeout)'
        : 'No se pudo conectar con Perplexity';
      return new Response(
        JSON.stringify({ success: false, error: msg }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      clearTimeout(perplexityTimeoutId);
    }

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('[product-research] Perplexity API error:', perplexityResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Perplexity API error: ${perplexityResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perplexityData = await perplexityResponse.json();
    const researchContent = perplexityData.choices?.[0]?.message?.content;
    const citations = perplexityData.citations || [];

    if (!researchContent) {
      console.error('[product-research] No content in Perplexity response');
      return new Response(
        JSON.stringify({ success: false, error: 'No research content generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[product-research] Perplexity research generated, length:', researchContent.length);

    // Supabase client (para guardar progreso entre fases)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const savePartial = async (partialUpdate: Record<string, unknown>) => {
      const { error: partialError } = await supabase
        .from('products')
        .update({
          ...partialUpdate,
          brief_status: 'in_progress',
          research_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (partialError) {
        console.error('[product-research] Partial DB update error:', partialError);
      }
    };

    const callLovableJson = async (
      label: string,
      userPrompt: string,
      timeoutMs: number,
    ): Promise<any> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        console.log(`[product-research] Starting Lovable AI phase: ${label}`);
        console.log(`[product-research] ${label} prompt length:`, userPrompt.length);

        const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'Devuelve SOLO JSON válido (sin markdown ni texto extra). Si no sabes un dato, deja el campo vacío o null. Prioriza información accionable y concreta.'
              },
              { role: 'user', content: userPrompt }
            ],
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Lovable AI HTTP ${res.status}: ${errorText}`);
        }

        const aiData = await res.json();
        const aiContent = (aiData.choices?.[0]?.message?.content || '').toString();
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in AI response');

        return JSON.parse(jsonMatch[0]);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // ============================================
    // FASE 2A: Distribución (mercado + JTBD + competencia)
    // ============================================
    const researchA = researchContent.length > 18000
      ? researchContent.substring(0, 18000) + '\n\n[... contenido truncado por longitud ...]'
      : researchContent;

    const phaseAPrompt = `Analiza la INVESTIGACIÓN ORIGINAL y devuelve SOLO JSON con esta estructura exacta.

INVESTIGACIÓN ORIGINAL:\n${researchA}\n\nBRIEF DEL PRODUCTO:\n${JSON.stringify(briefData, null, 2)}\n\nEstructura JSON:\n{
  "market_overview": {
    "marketSize": "",
    "growthTrend": "",
    "marketState": "crecimiento | saturacion | declive",
    "marketStateExplanation": "",
    "macroVariables": [""],
    "awarenessLevel": "",
    "summary": "",
    "opportunities": [""],
    "threats": [""]
  },
  "jtbd": {
    "functional": "",
    "emotional": "",
    "social": "",
    "pains": [{"pain":"","why":"","impact":""}],
    "desires": [{"desire":"","emotion":"","idealState":""}],
    "objections": [{"objection":"","belief":"","counter":""}],
    "insights": ["" ]
  },
  "competitors": [{
    "name": "",
    "website": "",
    "instagram": "",
    "tiktok": "",
    "facebook": "",
    "youtube": "",
    "linkedin": "",
    "promise": "",
    "valueProposition": "",
    "differentiator": "",
    "price": "",
    "tone": "",
    "cta": "",
    "awarenessLevel": "",
    "channels": [""],
    "contentFormats": [""],
    "strengths": [""],
    "weaknesses": [""]
  }]
}`;

    let phaseAData: any = null;
    try {
      phaseAData = await callLovableJson('2A', phaseAPrompt, 90000);
    } catch (e) {
      console.error('[product-research] Phase 2A failed:', e);
      phaseAData = null;
    }

    if (phaseAData) {
      await savePartial({
        market_research: {
          ...(phaseAData.market_overview || {}),
          rawContent: researchContent,
          citations,
          generatedAt: new Date().toISOString(),
        },
        ideal_avatar: phaseAData.jtbd ? JSON.stringify({ jtbd: phaseAData.jtbd, summary: phaseAData.jtbd.functional }) : null,
        competitor_analysis: {
          competitors: phaseAData.competitors || [],
          differentiation: {},
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // ============================================
    // FASE 2B: Distribución (avatares + ángulos + ESFERA + PUV + assets)
    // ============================================
    const researchB = researchContent.length > 22000
      ? researchContent.substring(researchContent.length - 22000) + '\n\n[... contenido truncado por longitud ...]'
      : researchContent;

    const phaseBPrompt = `Analiza la INVESTIGACIÓN ORIGINAL y devuelve SOLO JSON con esta estructura exacta.

INVESTIGACIÓN ORIGINAL:\n${researchB}\n\nBRIEF DEL PRODUCTO:\n${JSON.stringify(briefData, null, 2)}\n\nEstructura JSON:\n{
  "description": "",
  "avatars": [{
    "name": "",
    "age": "",
    "situation": "",
    "awarenessLevel": "",
    "drivers": "",
    "biases": "",
    "objections": "",
    "phrases": [""],
    "goals": "",
    "contentConsumption": ""
  }],
  "differentiation": {
    "repeatedMessages": [{"message":"","opportunity":""}],
    "poorlyAddressedPains": [{"pain":"","opportunity":"","howToUse":""}],
    "ignoredAspirations": [{"aspiration":"","opportunity":""}],
    "positioningOpportunities": [{"opportunity":"","why":"","execution":""}],
    "unexploitedEmotions": [{"emotion":"","howToUse":""}]
  },
  "esferaInsights": {
    "enganchar": {"marketDominance":"","saturated":"","opportunities":[""],"hookTypes":""},
    "solucion": {"currentPromises":"","unresolvedObjections":"","trustOpportunities":[""],"positioning":""},
    "remarketing": {"existingProof":"","validationGaps":"","decisionMessages":[""],"testimonialFormats":""},
    "fidelizar": {"commonErrors":"","communityOpportunities":[""],"ambassadorStrategy":""}
  },
  "salesAngles": [{"angle":"","type":"","avatar":"","emotion":"","contentType":"","hookExample":""}],
  "puv": {"centralProblem":"","tangibleResult":"","marketDifference":"","idealClient":"","statement":"","credibility":""},
  "transformation": {
    "functional": {"before":"","after":""},
    "emotional": {"before":"","after":""},
    "identity": {"before":"","after":""},
    "social": {"before":"","after":""},
    "financial": {"before":"","after":""}
  },
  "leadMagnets": [{"name":"","format":"","objective":"","contentType":"","pain":"","avatar":"","awarenessPhase":"","promise":"","structure":[""]}],
  "videoCreatives": [{"number":1,"angle":"","avatar":"","title":"","idea":"","format":"","esferaPhase":"","duration":""}],
  "executiveSummary": {
    "marketSummary": "",
    "keyInsights": [{"insight":"","importance":"","action":""}],
    "psychologicalDrivers": [{"driver":"","why":"","howToUse":""}],
    "immediateActions": [{"action":"","howTo":"","expectedResult":""}],
    "quickWins": [{"win":"","effort":"","impact":""}],
    "risksToAvoid": [{"risk":"","why":""}],
    "finalRecommendation": ""
  }
}`;

    let phaseBData: any = null;
    try {
      phaseBData = await callLovableJson('2B', phaseBPrompt, 90000);
    } catch (e) {
      console.error('[product-research] Phase 2B failed:', e);
      phaseBData = null;
    }

    // Merge final structured data (A tiene mercado/JTBD/competencia; B tiene el resto)
    let structuredData: any = {
      ...(phaseAData || {}),
      ...(phaseBData || {}),
    };

    if (!phaseAData && !phaseBData) {
      // Fallback total
      structuredData = parseResearchContentFallback(researchContent, citations, briefData);
    }

    // ============================================
    // FASE 3: Guardar en base de datos (final)
    // ============================================
    const updateData: any = {
      brief_status: 'completed',
      brief_completed_at: new Date().toISOString(),
      brief_data: briefData,
      research_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Distribute AI-analyzed content to product fields
    if (structuredData) {
      if (structuredData.description) {
        updateData.description = structuredData.description;
      }
      // Store market research data
      updateData.market_research = {
        ...structuredData.market_overview,
        rawContent: researchContent,
        citations: citations,
        generatedAt: new Date().toISOString()
      };

      // Store JTBD and customer analysis
      updateData.ideal_avatar = structuredData.jtbd ? JSON.stringify({
        jtbd: structuredData.jtbd,
        summary: structuredData.jtbd.functional
      }) : null;

      // Store competitor analysis
      updateData.competitor_analysis = {
        competitors: structuredData.competitors || [],
        differentiation: structuredData.differentiation || {},
        generatedAt: new Date().toISOString()
      };

      // Store avatar profiles
      updateData.avatar_profiles = {
        profiles: structuredData.avatars || [],
        generatedAt: new Date().toISOString()
      };

      // Store sales angles and content strategy - ALL 20 angles
      updateData.sales_angles_data = {
        angles: structuredData.salesAngles || [],
        puv: structuredData.puv || {},
        transformation: structuredData.transformation || {},
        leadMagnets: structuredData.leadMagnets || [],
        videoCreatives: structuredData.videoCreatives || [],
        generatedAt: new Date().toISOString()
      };

      // Store ESFERA insights and content strategy
      updateData.content_strategy = {
        esferaInsights: structuredData.esferaInsights || {},
        executiveSummary: structuredData.executiveSummary || {},
        generatedAt: new Date().toISOString()
      };

      // Extract ALL sales angles for the simple array field (not just 10)
      if (structuredData.salesAngles && Array.isArray(structuredData.salesAngles)) {
        updateData.sales_angles = structuredData.salesAngles.map((a: any) => 
          typeof a === 'string' ? a : a.angle
        );
      }

      // Build strategy summary
      if (structuredData.executiveSummary) {
        const summary = structuredData.executiveSummary;
        const keyInsights = Array.isArray(summary.keyInsights) 
          ? summary.keyInsights.map((i: any) => typeof i === 'string' ? i : i.insight)
          : [];
        const drivers = Array.isArray(summary.psychologicalDrivers)
          ? summary.psychologicalDrivers.map((d: any) => typeof d === 'string' ? d : d.driver)
          : [];
        const actions = Array.isArray(summary.immediateActions)
          ? summary.immediateActions.map((a: any) => typeof a === 'string' ? a : a.action)
          : [];
        
        updateData.strategy = `
RESUMEN DEL MERCADO:
${summary.marketSummary || ''}

INSIGHTS CLAVE:
${keyInsights.map((i: string, idx: number) => `${idx + 1}. ${i}`).join('\n')}

DRIVERS PSICOLÓGICOS:
${drivers.map((d: string) => `• ${d}`).join('\n')}

ACCIONES INMEDIATAS:
${actions.map((a: string, idx: number) => `${idx + 1}. ${a}`).join('\n')}

VICTORIAS RÁPIDAS:
${(summary.quickWins || []).map((w: any) => `• ${typeof w === 'string' ? w : w.win}`).join('\n')}

RECOMENDACIÓN FINAL:
${summary.finalRecommendation || ''}
        `.trim();
      }
    }

    const { error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId);

    if (updateError) {
      console.error('[product-research] Database update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save research to database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[product-research] Research saved successfully for product:', productId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          ...structuredData,
          rawContent: researchContent,
          citations
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[product-research] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildProductDescription(briefData: any): string {
  const parts = [];

  // Basic info
  if (briefData.productName) {
    parts.push(`**Nombre del producto:** ${briefData.productName}`);
  }
  if (briefData.category) {
    parts.push(`**Categoría:** ${briefData.category}${briefData.customCategory ? ` - ${briefData.customCategory}` : ''}`);
  }
  if (briefData.currentObjective) {
    parts.push(`**Objetivo actual:** ${briefData.currentObjective}`);
  }
  if (briefData.slogan) {
    parts.push(`**Slogan:** ${briefData.slogan}`);
  }

  // Target Market
  if (briefData.targetMarket) {
    parts.push(`**Mercado objetivo:** ${briefData.targetMarket}`);
  }

  // Value & Transformation
  if (briefData.mainBenefit) {
    parts.push(`**Beneficio principal:** ${briefData.mainBenefit}`);
  }
  if (briefData.transformation) {
    parts.push(`**Transformación que produce:** ${briefData.transformation}`);
  }
  if (briefData.differentiator) {
    parts.push(`**Diferenciador:** ${briefData.differentiator}`);
  }
  if (briefData.keyIngredients) {
    parts.push(`**Ingredientes/Componentes clave:** ${briefData.keyIngredients}`);
  }
  if (briefData.mustCommunicate) {
    parts.push(`**Lo que debe comunicarse:** ${briefData.mustCommunicate}`);
  }

  // Problem & Desire
  if (briefData.problemSolved) {
    parts.push(`**Problema que resuelve:** ${briefData.problemSolved}`);
  }
  if (briefData.mainDesire) {
    parts.push(`**Deseo principal que satisface:** ${briefData.mainDesire}`);
  }
  if (briefData.consequenceOfNotBuying) {
    parts.push(`**Consecuencia de no comprar:** ${briefData.consequenceOfNotBuying}`);
  }
  if (briefData.competitiveAdvantage) {
    parts.push(`**Ventaja competitiva:** ${briefData.competitiveAdvantage}`);
  }

  // Neuromarketing
  if (briefData.reptileBrain?.length > 0) {
    parts.push(`**Gatillos reptilianos:** ${briefData.reptileBrain.join(', ')}`);
  }
  if (briefData.limbicBrain?.length > 0) {
    parts.push(`**Emociones objetivo:** ${briefData.limbicBrain.join(', ')}`);
  }
  if (briefData.cortexBrain) {
    parts.push(`**Justificación racional:** ${briefData.cortexBrain}`);
  }

  // Target Audience
  const audienceParts = [];
  if (briefData.targetGender) audienceParts.push(`Género: ${briefData.targetGender}`);
  if (briefData.targetAgeRange) audienceParts.push(`Edad: ${briefData.targetAgeRange}`);
  if (briefData.targetOccupation) audienceParts.push(`Ocupación: ${briefData.targetOccupation}`);
  if (audienceParts.length > 0) {
    parts.push(`**Público objetivo:** ${audienceParts.join(', ')}`);
  }
  if (briefData.targetInterests?.length > 0) {
    parts.push(`**Intereses:** ${briefData.targetInterests.join(', ')}`);
  }
  if (briefData.targetHabits) {
    parts.push(`**Hábitos:** ${briefData.targetHabits}`);
  }
  if (briefData.commonObjections?.length > 0) {
    parts.push(`**Objeciones comunes:** ${briefData.commonObjections.join(', ')}`);
  }
  if (briefData.idealScenario) {
    parts.push(`**Escenario ideal post-compra:** ${briefData.idealScenario}`);
  }

  // Content Strategy
  if (briefData.contentTypes?.length > 0) {
    parts.push(`**Tipos de contenido:** ${briefData.contentTypes.join(', ')}`);
  }
  if (briefData.platforms?.length > 0) {
    parts.push(`**Plataformas:** ${briefData.platforms.join(', ')}`);
  }
  if (briefData.useForAds) {
    parts.push(`**Uso en Ads:** ${briefData.useForAds}`);
  }
  if (briefData.referenceContent) {
    parts.push(`**Contenido de referencia:** ${briefData.referenceContent}`);
  }
  if (briefData.brandStrengths) {
    parts.push(`**Puntos fuertes a comunicar:** ${briefData.brandStrengths}`);
  }
  if (briefData.brandRestrictions) {
    parts.push(`**Restricciones de marca:** ${briefData.brandRestrictions}`);
  }
  if (briefData.expectedResult) {
    parts.push(`**Resultado esperado:** ${briefData.expectedResult}`);
  }
  if (briefData.additionalNotes) {
    parts.push(`**Notas adicionales:** ${briefData.additionalNotes}`);
  }

  return parts.join('\n\n');
}

// Fallback parser if AI distribution fails
function parseResearchContentFallback(content: string, citations: string[], briefData: any): any {
  const extractSection = (startMarker: string, endMarker: string | null): string => {
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';
    
    let endIndex = content.length;
    if (endMarker) {
      const foundEnd = content.indexOf(endMarker, startIndex + startMarker.length);
      if (foundEnd !== -1) {
        endIndex = foundEnd;
      }
    }
    
    return content.substring(startIndex, endIndex).trim();
  };

  return {
    description: `${briefData.mainBenefit || ''}\n\n${briefData.transformation || ''}\n\n${briefData.differentiator || ''}`.trim(),
    market_overview: {
      summary: extractSection('PASO 1', 'PASO 2'),
      marketState: 'crecimiento',
      macroVariables: [],
      awarenessLevel: ''
    },
    jtbd: {
      functional: extractSection('PASO 2', 'PASO 3'),
      emotional: '',
      social: '',
      pains: [],
      desires: [],
      objections: [],
      insights: []
    },
    avatars: [],
    competitors: [],
    differentiation: {
      repeatedMessages: [],
      poorlyAddressedPains: [],
      ignoredAspirations: [],
      positioningOpportunities: [],
      unexploitedEmotions: []
    },
    esferaInsights: {
      enganchar: { marketDominance: '', saturated: '', opportunities: [] },
      solucion: { currentPromises: '', unresolvedObjections: '', trustOpportunities: [] },
      remarketing: { existingProof: '', validationGaps: '', decisionMessages: [] },
      fidelizar: { commonErrors: '', communityOpportunities: [] }
    },
    salesAngles: [],
    puv: {
      centralProblem: briefData.problemSolved || '',
      tangibleResult: briefData.transformation || '',
      marketDifference: briefData.differentiator || '',
      idealClient: '',
      statement: ''
    },
    transformation: {
      functional: { before: '', after: '' },
      emotional: { before: '', after: '' },
      identity: { before: '', after: '' }
    },
    leadMagnets: [],
    videoCreatives: [],
    executiveSummary: {
      keyInsights: [],
      psychologicalDrivers: [],
      immediateActions: []
    }
  };
}
