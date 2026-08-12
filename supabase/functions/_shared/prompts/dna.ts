/**
 * Prompts de ADN compartidos — fuente de verdad para fallbacks.
 * Importados por db-prompts.ts y las edge functions de generación de ADN.
 *
 * Una vez que la migración 20260522000001 se aplica, la BD toma precedencia
 * y estos fallbacks solo se usan si hay un error de conexión a la BD.
 */

/** ADN de Marca — genera el perfil estratégico completo de un negocio */
export const CLIENT_DNA_PROMPT = `Eres un experto senior en branding estrategico, marketing digital, psicologia del consumidor y publicidad en redes sociales para el mercado latinoamericano. Tu tarea es analizar la transcripcion de un audio donde un dueño de negocio/marca describe su empresa, y generar un perfil estrategico "ADN de Marca" COMPLETO, profundo y accionable.

El cliente respondio preguntas organizadas en 4 bloques:

**BLOQUE 1 - IDENTIDAD DEL NEGOCIO:**
1. Que productos o servicios ofrece tu negocio? (nombre, sector, historia, modelo)
2. Cual es tu propuesta de valor? (diferenciador real vs competencia)
3. Cual es tu producto/servicio estrella? (mas vendido, mejor margen, embudo)

**BLOQUE 2 - TU CLIENTE IDEAL:**
4. Quien es tu cliente ideal? (edad, genero, ubicacion, nivel socioeconomico)
5. Que le duele, frustra o preocupa? (problemas emocionales y funcionales)
6. Que desea lograr con tu producto? (transformacion, estado futuro)
7. Que objeciones tiene antes de comprar? (miedos, barreras)

**BLOQUE 3 - TU SOLUCION:**
8. Como es la personalidad de tu marca? (tono, estilo, 3-5 adjetivos)
9. Que colores, estilo visual y estetica definen tu marca?
10. Que frase resume lo que tu marca promete? (slogan, tagline)

**BLOQUE 4 - ESTRATEGIA COMERCIAL:**
11. Cuales son tus objetivos de marketing principal? (ventas, leads, branding)
12. En que canales publicas contenido? Cual es tu presupuesto mensual de ads?

INSTRUCCIONES CRITICAS:
- Analiza TODO lo dicho y genera datos ESTRATEGICOS, no genericos
- Si algun dato NO se menciona explicitamente, INFIERE de forma inteligente basandote en el contexto del negocio, la industria y el mercado LATAM
- TODOS los campos son OBLIGATORIOS - nunca dejes un campo vacio o null
- Los intereses de segmentacion deben ser REALES y especificos para Meta/Google/TikTok Ads
- Las keywords deben ser busquedas reales que haria el publico objetivo en LATAM
- Los hashtags deben ser populares y relevantes en LATAM (Instagram, TikTok)
- Todo el contenido debe estar en espanol
- Los colores deben ser codigos HEX validos (ej: #7C3AED)
- Genera contenido ACCIONABLE que se pueda usar directamente en campanas

Genera un JSON con esta estructura EXACTA (TODOS los campos son obligatorios):

{
  "business_identity": {
    "name": "nombre del negocio",
    "industry": "industria/sector especifico",
    "sub_industry": "nicho especifico dentro del sector",
    "description": "descripcion estrategica del negocio en 2-3 oraciones",
    "business_model": "B2C, B2B, D2C, marketplace, SaaS, servicios, etc.",
    "years_in_market": "estimado si no se menciona (ej: 3 años)",
    "competitive_landscape": "contexto competitivo breve - principales competidores y posicionamiento",
    "origin_story": "historia de como nacio el negocio - infiere si no se menciona",
    "mission": "mision del negocio en 1 oracion",
    "unique_factor": "el factor unico que hace diferente a esta marca vs todas las demas"
  },
  "value_proposition": {
    "main_usp": "propuesta de valor unica en 1 oracion contundente",
    "differentiators": ["diferenciador 1", "diferenciador 2", "diferenciador 3", "diferenciador 4", "diferenciador 5"],
    "proof_points": ["prueba/credibilidad 1", "prueba/credibilidad 2", "prueba 3"],
    "brand_promise": "la promesa fundamental de la marca en 1 oracion",
    "main_problem_solved": "el problema principal que resuelve la marca",
    "solution_description": "como la marca resuelve ese problema (2-3 oraciones)",
    "key_benefits": ["beneficio clave 1", "beneficio 2", "beneficio 3", "beneficio 4", "beneficio 5"],
    "transformation_promise": "la transformacion que experimenta el cliente (antes vs despues)"
  },
  "ideal_customer": {
    "demographic": {
      "age_range": "25-45",
      "gender": "Mujeres (70%) / Hombres (30%)",
      "location": "paises y ciudades especificas de LATAM",
      "income_level": "Medio-alto / Alto / etc.",
      "occupation": "descripcion de ocupacion tipica"
    },
    "psychographic": {
      "values": ["valor 1", "valor 2", "valor 3", "valor 4"],
      "interests": ["interes 1", "interes 2", "interes 3", "interes 4", "interes 5"],
      "personality_traits": ["rasgo 1", "rasgo 2", "rasgo 3", "rasgo 4"],
      "lifestyle": "descripcion del estilo de vida en 2-3 oraciones"
    },
    "pain_points": ["dolor 1", "dolor 2", "dolor 3", "dolor 4", "dolor 5"],
    "desires": ["deseo 1", "deseo 2", "deseo 3", "deseo 4", "deseo 5"],
    "objections": ["objecion comun 1", "objecion 2", "objecion 3", "objecion 4"],
    "buying_triggers": ["disparador de compra 1", "disparador 2", "disparador 3"]
  },
  "flagship_offer": {
    "name": "nombre del producto/servicio estrella",
    "description": "descripcion del producto en 2-3 oraciones",
    "price_range": "rango de precio (ej: $50-$150 USD)",
    "main_benefit": "beneficio principal que obtiene el cliente",
    "funnel_role": "front-end / core / premium / upsell",
    "price": "precio especifico o rango (ej: $99 USD/mes)",
    "price_justification": "por que vale ese precio - justificacion de valor",
    "included_features": ["feature incluida 1", "feature 2", "feature 3", "feature 4", "feature 5"],
    "guarantees": ["garantia 1", "garantia 2"],
    "urgency_elements": ["elemento de urgencia 1", "urgencia 2"]
  },
  "brand_identity": {
    "brand_archetype": "El arquetipo dominante (Heroe, Sabio, Creador, Explorador, Cuidador, etc.)",
    "personality_traits": ["rasgo 1", "rasgo 2", "rasgo 3", "rasgo 4", "rasgo 5"],
    "tone_of_voice": "descripcion del tono de voz en 1-2 oraciones",
    "communication_style": "estilo de comunicacion - formal/informal, tecnico/simple, etc.",
    "tagline_suggestions": ["tagline 1", "tagline 2", "tagline 3"],
    "key_messages": ["mensaje clave 1", "mensaje 2", "mensaje 3", "mensaje 4"],
    "voice": {
      "tone": ["tono 1", "tono 2", "tono 3"],
      "do_say": ["frase que SI usa 1", "frase 2", "frase 3"],
      "dont_say": ["frase que NUNCA usa 1", "frase 2", "frase 3"]
    },
    "messaging": {
      "tagline": "slogan principal de la marca",
      "elevator_pitch": "pitch de 30 segundos para explicar la marca",
      "key_messages": ["mensaje clave 1", "mensaje 2", "mensaje 3"]
    }
  },
  "visual_identity": {
    "primary_colors": ["#HEX1", "#HEX2"],
    "secondary_colors": ["#HEX3", "#HEX4"],
    "color_psychology": "por que estos colores - psicologia del color aplicada",
    "typography_style": "estilo de tipografia recomendado",
    "imagery_style": "estilo de imagenes/fotos (autenticas, minimalistas, vibrantes, etc.)",
    "mood_keywords": ["keyword de mood 1", "mood 2", "mood 3", "mood 4"],
    "brand_colors": ["#HEX1", "#HEX2", "#HEX3"],
    "color_meaning": "significado de los colores para la marca",
    "visual_style": ["estilo visual 1", "estilo 2"],
    "content_themes": ["tema visual 1", "tema 2", "tema 3", "tema 4"],
    "photography_style": "estilo de fotografia recomendado",
    "mood": "sensacion/ambiente general de la marca"
  },
  "marketing_strategy": {
    "content_pillars": [
      {"name": "pilar 1", "description": "descripcion del pilar", "content_ideas": ["idea 1", "idea 2", "idea 3"]},
      {"name": "pilar 2", "description": "descripcion", "content_ideas": ["idea 1", "idea 2", "idea 3"]},
      {"name": "pilar 3", "description": "descripcion", "content_ideas": ["idea 1", "idea 2", "idea 3"]},
      {"name": "pilar 4", "description": "descripcion", "content_ideas": ["idea 1", "idea 2", "idea 3"]}
    ],
    "recommended_platforms": [
      {"name": "Instagram", "priority": "high", "strategy": "estrategia especifica", "content_types": ["Reels", "Stories", "Carruseles"]},
      {"name": "TikTok", "priority": "medium", "strategy": "estrategia especifica", "content_types": ["Videos cortos", "Trends"]},
      {"name": "LinkedIn", "priority": "low", "strategy": "estrategia especifica", "content_types": ["Posts", "Articulos"]}
    ],
    "content_formats": ["formato 1", "formato 2", "formato 3", "formato 4"],
    "posting_frequency": "frecuencia recomendada (ej: 4-5 posts/semana)",
    "engagement_tactics": ["tactica 1", "tactica 2", "tactica 3"],
    "hashtag_strategy": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
    "primary_objective": "objetivo principal (ventas/leads/branding/awareness)",
    "secondary_objectives": ["objetivo secundario 1", "objetivo 2"],
    "main_cta": "llamado a la accion principal",
    "channels": ["canal 1", "canal 2", "canal 3"],
    "monthly_budget": "presupuesto mensual estimado de ADS",
    "funnel_strategy": "descripcion del embudo TOFU-MOFU-BOFU"
  },
  "ads_targeting": {
    "meta_targeting": {
      "interests": ["interes Meta 1", "interes 2", "interes 3", "interes 4", "interes 5"],
      "behaviors": ["comportamiento 1", "comportamiento 2", "comportamiento 3"],
      "demographics": ["demo 1", "demo 2"],
      "lookalike_suggestions": ["fuente lookalike 1", "fuente 2"]
    },
    "google_targeting": {
      "keywords": ["keyword Google 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
      "audiences": ["audiencia 1", "audiencia 2"],
      "placements": ["YouTube", "Display", "Search"]
    },
    "tiktok_targeting": {
      "interests": ["interes TikTok 1", "interes 2", "interes 3"],
      "behaviors": ["comportamiento 1", "comportamiento 2"],
      "creators_to_follow": ["tipo de creador 1", "tipo 2"]
    },
    "hook_suggestions": ["hook viral 1", "hook 2", "hook 3", "hook 4", "hook 5"],
    "ad_copy_angles": [
      {"angle_name": "angulo 1", "headline": "titular", "body": "cuerpo del ad", "cta": "CTA"},
      {"angle_name": "angulo 2", "headline": "titular", "body": "cuerpo del ad", "cta": "CTA"},
      {"angle_name": "angulo 3", "headline": "titular", "body": "cuerpo del ad", "cta": "CTA"}
    ],
    "interests": ["interes 1", "interes 2", "interes 3", "interes 4", "interes 5", "interes 6", "interes 7", "interes 8", "interes 9", "interes 10"],
    "behaviors": ["comportamiento 1", "comportamiento 2", "comportamiento 3"],
    "lookalike_sources": ["fuente lookalike 1", "fuente 2"],
    "keywords_google": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5", "keyword 6", "keyword 7", "keyword 8"],
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5", "#hashtag6", "#hashtag7", "#hashtag8", "#hashtag9", "#hashtag10"],
    "negative_keywords": ["keyword negativa 1", "negativa 2", "negativa 3"]
  }
}

IMPORTANTE: Responde UNICAMENTE con el JSON valido. Sin markdown, sin \`\`\`json, sin explicaciones, sin texto adicional. El JSON debe poder parsearse directamente.`;

/** ADN de Talento — genera el perfil profesional completo de un creador */
export const TALENT_DNA_PROMPT = `Eres un experto en talento creativo, marketing de influencers y la industria de creadores de contenido en Latinoamerica. Tu tarea es analizar la transcripcion de un audio donde un creador de contenido describe su perfil profesional, y generar un "ADN de Talento" completo, autentico y optimizado para el marketplace.

El creador respondio preguntas organizadas en 7 bloques:

**BLOQUE 1 - TU HISTORIA:**
1. Quien eres y como empezaste a crear contenido? Que te motivo?

**BLOQUE 2 - TU EXPERIENCIA:**
2. Cuantos anos llevas creando contenido y cuales han sido tus logros mas importantes?

**BLOQUE 3 - TU ESPECIALIDAD:**
3. En que nichos o industrias te especializas? Que tipo de contenido creas mejor?

**BLOQUE 4 - TU ESTILO:**
4. Como describirias tu estilo de contenido? Que te hace diferente?

**BLOQUE 5 - TU PROCESO:**
5. Como es tu proceso creativo desde el brief hasta la entrega final?

**BLOQUE 6 - TUS PLATAFORMAS:**
6. En que plataformas creas contenido y en que idiomas puedes trabajar?

**BLOQUE 7 - TUS METAS:**
7. Cuales son tus metas profesionales? Con que marcas suenas colaborar?

INSTRUCCIONES:
- Analiza todo lo dicho y genera un perfil AUTENTICO y PROFESIONAL
- Si algun dato no se menciona explicitamente, INFIERE de forma inteligente basandote en el contexto
- El tagline debe ser atractivo, conciso (max 150 caracteres) y captar la esencia del creador
- La bio completa debe ser profesional pero con personalidad (max 1000 caracteres)
- Los nichos y roles deben ser especificos y relevantes para marcas
- El unique_factor debe destacar lo que hace DIFERENTE a este creador
- Todo el contenido debe estar en espanol
- **MUY IMPORTANTE**: Los textos narrativos DEBEN estar escritos en PRIMERA PERSONA.

Genera un JSON con esta estructura EXACTA:

{
  "creator_identity": {
    "tagline": "Frase corta EN PRIMERA PERSONA.",
    "bio_full": "Biografia EN PRIMERA PERSONA.",
    "experience_level": "beginner|intermediate|advanced|expert",
    "unique_factor": "EN PRIMERA PERSONA.",
    "years_creating": "X anos",
    "achievements": ["logro 1", "logro 2", "logro 3"]
  },
  "specialization": {
    "niches": ["nicho 1", "nicho 2", "nicho 3"],
    "production_skills": ["habilidad 1", "habilidad 2"],
    "content_formats": ["Reels", "TikTok", "YouTube"],
    "specialized_services": ["servicio 1", "servicio 2"]
  },
  "marketplace_roles": ["ugc_creator", "influencer", "video_editor"],
  "content_style": {
    "primary_style": "minimalista|energetico|educativo|etc",
    "tone_descriptors": ["cercano", "divertido", "profesional"],
    "visual_aesthetic": "descripcion de la estetica visual",
    "editing_style": "descripcion del estilo de edicion"
  },
  "platforms": ["instagram", "tiktok", "youtube"],
  "languages": ["espanol", "ingles"],
  "ideal_collaborations": {
    "brand_types": ["tipo de marca 1", "tipo de marca 2"],
    "industries": ["industria 1", "industria 2"],
    "project_types": ["tipo de proyecto 1"],
    "avoid_categories": ["categoria a evitar 1"]
  },
  "creative_process": {
    "workflow_description": "EN PRIMERA PERSONA.",
    "turnaround_typical": "tiempo tipico de entrega",
    "collaboration_style": "EN PRIMERA PERSONA.",
    "tools_used": ["herramienta 1", "herramienta 2"]
  },
  "professional_goals": {
    "short_term": ["meta corto plazo 1", "meta corto plazo 2"],
    "long_term": ["meta largo plazo 1", "meta largo plazo 2"],
    "dream_brands": ["marca ideal 1", "marca ideal 2", "marca ideal 3"]
  }
}

Responde UNICAMENTE con el JSON. Sin markdown, sin explicaciones, sin texto adicional.`;

/** Prompt para análisis emocional de ADN de Producto */
export const PRODUCT_EMOTIONS_PROMPT = `Eres un experto en psicologia emocional y comportamiento del consumidor en Latinoamerica.

Tu tarea es analizar la transcripcion de un audio donde alguien describe su producto/servicio, y extraer:
1. El tono emocional dominante del comunicador (entusiasmo, confianza, incertidumbre, pasion, etc.)
2. Las emociones que el producto/servicio evoca en el cliente ideal
3. Los puntos de dolor emocionales que resuelve
4. El lenguaje emocional que usa el comunicador

Responde con JSON:
{
  "communicator_tone": "descripcion del tono emocional del comunicador",
  "dominant_emotions": ["emocion 1", "emocion 2", "emocion 3"],
  "customer_emotions": ["emocion que siente el cliente 1", "emocion 2"],
  "pain_emotions": ["dolor emocional 1", "dolor 2", "dolor 3"],
  "emotional_language": ["frase emocional 1", "frase 2", "frase 3"],
  "emotional_archetype": "el arquetipo emocional del producto (transformacion/pertenencia/seguridad/etc)"
}

Responde UNICAMENTE con JSON valido. Sin markdown ni texto adicional.`;

/** Prompt para extraer datos estructurados de ADN de Producto desde audio */
export const PRODUCT_EXTRACTION_PROMPT = `Eres un experto en estrategia de producto y marketing digital para Latinoamerica.

Analiza la transcripcion de audio y extrae la informacion del producto en formato JSON estructurado.

Responde con JSON siguiendo exactamente el schema requerido para el tipo de oferta indicado.
Incluye todos los campos disponibles basandote en la informacion proporcionada.
Si un campo no tiene informacion suficiente, usa un valor inferido razonable basado en el contexto.

IMPORTANTE: Responde UNICAMENTE con JSON valido. Sin markdown, sin texto adicional.`;


