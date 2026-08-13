import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsHeaders, getAPIKey } from "../_shared/ai-providers.ts";
import {
  batchScrape,
  extractUrlsFromText,
  formatScrapeContextForLLM,
} from "../_shared/firecrawl-client.ts";

// ── JSON extraction and repair ─────────────────────────────────────────────
function extractJsonFromText(text: string): string | null {
  // Remove common prefixes that Perplexity might add
  const s = text
    .replace(/^[\s\S]*?(?=\{)/m, "") // Remove everything before first {
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .replace(/^Here is the .*?:\s*/i, "")
    .replace(/^Here's the .*?:\s*/i, "")
    .replace(/^Aqui esta el .*?:\s*/i, "")
    .replace(/^El JSON .*?:\s*/i, "")
    .trim();

  // Try to find JSON object in the text
  const jsonStart = s.indexOf("{");
  const jsonEnd = s.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return null;
  }

  return s.substring(jsonStart, jsonEnd + 1);
}

function repairJsonForParse(str: string): string {
  let s = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();

  // Remove markdown code blocks
  s = s.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
  s = s.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

  // Extract JSON if embedded in text
  const extracted = extractJsonFromText(s);
  if (extracted) {
    s = extracted;
  }

  try { JSON.parse(s); return s; } catch {
    // Fix unclosed strings
    let inString = false, escaped = false;
    for (let i = 0; i < s.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (s[i] === "\\" && inString) { escaped = true; continue; }
      if (s[i] === '"') inString = !inString;
    }
    if (inString) { while (s.endsWith("\\")) s = s.slice(0, -1); s += '"'; }

    // Remove trailing incomplete properties
    s = s.replace(/,\s*"[^"]*"\s*$/, "").replace(/,\s*"[^"]*"\s*:\s*$/, "").replace(/,\s*$/, "");

    // Balance brackets
    let open = 0, bracket = 0;
    inString = false; escaped = false;
    for (let i = 0; i < s.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (s[i] === "\\" && inString) { escaped = true; continue; }
      if (s[i] === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (s[i] === "{") open++; else if (s[i] === "}") open--;
      else if (s[i] === "[") bracket++; else if (s[i] === "]") bracket--;
    }
    while (bracket > 0) { s += "]"; bracket--; }
    while (open > 0) { s += "}"; open--; }
    return s;
  }
}

// ── Gemini audio transcription fallback ────────────────────────────────
async function transcribeWithGemini(audioBlob: Blob): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured for transcription fallback");

  console.log("[generate-product-dna] Transcribing audio with Gemini (fallback)...");
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const mimeType = audioBlob.type || "audio/webm";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Transcribe exactamente lo que dice este audio en español. Devuelve solo la transcripción, sin comentarios ni formato adicional." },
            { inline_data: { mime_type: mimeType, data: base64Audio } },
          ],
        }],
        generationConfig: { temperature: 0 },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-product-dna] Gemini transcription error:", errText);
    throw new Error(`Gemini transcription error: ${response.status}`);
  }

  const data = await response.json();
  const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log(`[generate-product-dna] Gemini transcription: ${transcription.length} chars`);
  return transcription.trim();
}

// ── Whisper transcription (with Gemini fallback) ────────────────────────
async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (apiKey) {
    console.log("[generate-product-dna] Transcribing audio with Whisper...");
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "es");
    formData.append("response_format", "text");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: formData,
    });

    if (response.ok) {
      const transcription = await response.text();
      console.log(`[generate-product-dna] Transcription: ${transcription.length} chars`);
      return transcription.trim();
    }

    const errText = await response.text();
    console.warn(`[generate-product-dna] Whisper failed (${response.status}), falling back to Gemini:`, errText);
  } else {
    console.warn("[generate-product-dna] No OPENAI_API_KEY, using Gemini for transcription");
  }

  return transcribeWithGemini(audioBlob);
}

// ── Emotional analysis with Gemini ──────────────────────────────────────
async function analyzeEmotions(transcription: string): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.warn("[generate-product-dna] No Gemini key for emotional analysis, skipping");
    return {};
  }

  console.log("[generate-product-dna] Analyzing emotions with Gemini...");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Analiza el siguiente texto transcrito de audio y genera un analisis emocional en JSON con esta estructura:
{
  "overall_mood": "estado emocional general",
  "confidence_level": 0-100,
  "passion_topics": ["temas donde muestra mas pasion"],
  "concern_areas": ["areas de preocupacion"],
  "communication_style": "estilo de comunicacion",
  "key_emotions": ["emocion1", "emocion2"]
}
Responde SOLO con el JSON.`,
          },
          { role: "user", content: transcription },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    }
  );

  if (!response.ok) {
    console.warn("[generate-product-dna] Emotional analysis failed, skipping");
    return {};
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(repairJsonForParse(raw));
  } catch {
    return {};
  }
}

// ── Extract structured data from audio transcription ─────────────────────
async function extractFromAudio(
  transcription: string,
  wizardResponses: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || !transcription || transcription.length < 20) {
    console.warn("[generate-product-dna] No Gemini key or transcription too short, using defaults");
    return getDefaultExtraction(wizardResponses);
  }

  const serviceTypes = (wizardResponses.service_types as string[]) || [];
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const audiences = (wizardResponses.audiences as string[]) || [];

  const offerType = (wizardResponses.offer_type as string) || "";

  // Contexto explícito del producto si el usuario lo proporcionó
  const pNameCtx = (wizardResponses.product_name as string | undefined)?.trim();
  const pContextCtx = (wizardResponses.product_context as string | undefined)?.trim();
  const productHint = pNameCtx
    ? `\n\nCONTEXTO EXPLÍCITO (prioridad sobre cualquier inferencia):\nNombre: ${pNameCtx}${pContextCtx ? `\nDescripción: ${pContextCtx}` : ""}`
    : "";

  // Campos adicionales según tipo de oferta
  const offerTypeFieldsMap: Record<string, string> = {
    event_webinar: `  "fecha_evento": "fecha o periodo del webinar/live si se menciona",
  "tema_principal_evento": "el tema central o revelacion principal del evento",
  "ponente_o_experto": "quien imparte el evento",
  "cupos_o_urgencia": "si menciona cupos limitados, fecha limite u otra urgencia",
  "que_aprenderan": "puntos clave que aprenderan los asistentes",
  "oferta_post_evento": "si menciona producto/servicio que venderan despues del evento",`,
    infoproduct: `  "nombre_programa": "nombre exacto del curso/programa",
  "modulos_o_temas": "modulos o temas principales que cubre",
  "duracion_programa": "cuanto dura el programa",
  "precio_o_inversion": "precio o inversion mencionada",
  "garantia": "si tiene garantia de resultados o devolucion",
  "resultados_alumnos": "resultados de alumnos anteriores si los menciona",`,
    service: `  "proceso_servicio": "como funciona el servicio paso a paso",
  "duracion_o_sesiones": "cuanto dura o cuantas sesiones incluye",
  "precio_o_rango": "precio o rango de precio mencionado",
  "garantia_o_resultados": "garantias o resultados prometidos",
  "diferenciador_clave": "que lo diferencia de otros proveedores del servicio",`,
    personal_brand: `  "especialidad_declarada": "en que se especializa o que lo hace experto",
  "historia_personal": "historia o experiencia personal clave mencionada",
  "perspectiva_unica": "punto de vista diferente al mainstream del nicho",
  "comunidad_o_audiencia": "descripcion de su comunidad o audiencia objetivo",`,
    saas_app: `  "problema_que_resuelve": "el problema especifico que soluciona la app",
  "funcionalidad_estrella": "la funcion principal o mas valorada",
  "modelo_precio": "free/freemium/trial/pago desde X",
  "integraciones": "con que otras herramientas se integra",`,
  };

  const extraFields = offerTypeFieldsMap[offerType] || `  "diferenciador_clave": "que hace unico este producto/servicio",`;

  const offerTypeContext = offerType
    ? `\nTIPO DE OFERTA SELECCIONADO: ${offerType} — enfoca la extraccion en informacion relevante para este tipo.`
    : "";

  const extractionPrompt = `Eres un estratega de contenido digital experto en briefing creativo.

Analiza esta transcripcion de audio donde un cliente describe su oferta:${productHint}${offerTypeContext}

TRANSCRIPCION:
${transcription}

SELECCIONES DEL WIZARD:
- Tipo de oferta: ${offerType || "No especificado"}
- Tipos de servicio de contenido: ${serviceTypes.join(", ") || "No especificado"}
- Objetivos: ${goals.join(", ") || "No especificado"}
- Plataformas: ${platforms.join(", ") || "No especificado"}
- Audiencias: ${audiences.join(", ") || "No especificado"}

Extrae SOLO este JSON (sin texto adicional, sin markdown):
{
  "servicio_exacto": "descripcion exacta de la oferta en las palabras del cliente",
  "objetivo_real": "objetivo declarado + objetivo implicito detectado",
  "palabras_clave_cliente": ["frase literal 1", "frase literal 2", "frase literal 3"],
  "restricciones_creativas": "lo que NO quiere en el contenido",
  "referentes_estilo": "estilos o ejemplos mencionados",
  "tono_emocional": "urgente|claro|apasionado|inseguro|neutral",
  "canal_primario": "el canal mas importante",
  "tipo_contenido_principal": "el tipo de contenido mas relevante para la oferta",
${extraFields}
}`;

  console.log("[generate-product-dna] Extracting data from audio with Gemini...");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: extractionPrompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2000 },
        }),
      }
    );

    if (!response.ok) {
      console.warn("[generate-product-dna] Extraction failed, using defaults");
      return getDefaultExtraction(wizardResponses);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(repairJsonForParse(content));
    console.log("[generate-product-dna] Extraction successful:", Object.keys(parsed).join(", "));
    return parsed;
  } catch (err) {
    console.error("[generate-product-dna] Extraction error:", err);
    return getDefaultExtraction(wizardResponses);
  }
}

function getDefaultExtraction(wizardResponses: Record<string, unknown>): Record<string, unknown> {
  return {
    servicio_exacto: "Servicio no especificado",
    objetivo_real: (wizardResponses.goals as string[])?.join(", ") || "Vender",
    palabras_clave_cliente: [],
    restricciones_creativas: "",
    referentes_estilo: "",
    tono_emocional: "neutral",
    canal_primario: (wizardResponses.platforms as string[])?.[0] || "instagram",
    tipo_contenido_principal: (wizardResponses.service_types as string[])?.[0] || "video_ugc",
  };
}

// ── Location mapping for market context ──────────────────────────────────
const LOCATION_NAMES: Record<string, string> = {
  // Regiones
  worldwide: "Todo el mundo",
  latam: "Latinoamérica",
  europe: "Europa",
  north_america: "Norteamérica",
  central_america: "Centroamérica",
  south_america: "Sudamérica",
  spanish_speaking: "Países hispanohablantes",
  // Países
  AR: "Argentina", BO: "Bolivia", BR: "Brasil", CL: "Chile", CO: "Colombia",
  CR: "Costa Rica", CU: "Cuba", DO: "República Dominicana", EC: "Ecuador",
  SV: "El Salvador", GT: "Guatemala", HN: "Honduras", MX: "México",
  NI: "Nicaragua", PA: "Panamá", PY: "Paraguay", PE: "Perú", PR: "Puerto Rico",
  UY: "Uruguay", VE: "Venezuela", ES: "España", PT: "Portugal", FR: "Francia",
  IT: "Italia", DE: "Alemania", GB: "Reino Unido", NL: "Países Bajos",
  US: "Estados Unidos", CA: "Canadá",
  // Ciudades
  "CO-BOG": "Bogotá, Colombia", "CO-MDE": "Medellín, Colombia", "CO-CLO": "Cali, Colombia",
  "CO-BAQ": "Barranquilla, Colombia", "CO-CTG": "Cartagena, Colombia",
  "MX-MEX": "Ciudad de México", "MX-GDL": "Guadalajara, México", "MX-MTY": "Monterrey, México",
  "MX-TIJ": "Tijuana, México", "MX-CUN": "Cancún, México",
  "AR-BUE": "Buenos Aires, Argentina", "AR-COR": "Córdoba, Argentina",
  "AR-ROS": "Rosario, Argentina", "AR-MZA": "Mendoza, Argentina",
  "CL-SCL": "Santiago, Chile", "CL-VAP": "Valparaíso, Chile", "CL-CCP": "Concepción, Chile",
  "PE-LIM": "Lima, Perú", "PE-AQP": "Arequipa, Perú", "PE-TRU": "Trujillo, Perú",
  "ES-MAD": "Madrid, España", "ES-BCN": "Barcelona, España",
  "ES-VLC": "Valencia, España", "ES-SEV": "Sevilla, España",
  "US-MIA": "Miami, USA", "US-LAX": "Los Ángeles, USA", "US-NYC": "Nueva York, USA",
  "US-HOU": "Houston, USA", "US-CHI": "Chicago, USA", "US-DFW": "Dallas, USA",
  "US-PHX": "Phoenix, USA", "US-SAN": "San Diego, USA",
  // Legacy single country IDs (backward compatibility)
  colombia: "Colombia", mexico: "México", argentina: "Argentina", chile: "Chile",
  peru: "Perú", ecuador: "Ecuador", spain: "España", usa: "Estados Unidos",
  usa_hispanic: "Estados Unidos (mercado hispano)",
};

function getMarketDescription(wizardResponses: Record<string, unknown>): string {
  // Support both new array format and legacy single string
  const locations = wizardResponses.target_locations as string[] | undefined;
  const legacyCountry = wizardResponses.target_country as string | undefined;

  if (locations && locations.length > 0) {
    const names = locations
      .map(id => LOCATION_NAMES[id] || id)
      .filter(Boolean);
    if (names.length === 1) return names[0];
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} y ${names.length - 3} más`;
  }

  if (legacyCountry) {
    return LOCATION_NAMES[legacyCountry] || legacyCountry;
  }

  return "Latinoamérica";
}

// ── Builder de prompts Perplexity según tipo de oferta ───────────────────────
function buildPerplexityPrompts(
  offerType: string,
  productLabel: string,
  platforms: string[],
  audiences: string[],
  goals: string[],
  mercado: string,
  canal: string,
): { system: string; user: string } {
  const canales = platforms.join("/") || "Instagram, TikTok";
  const audienciaStr = audiences.join(", ") || "25-40";

  // Secciones base que comparten todos los tipos
  const seccionCompetencia = `
2. COMPETIDORES DIRECTOS (5 reales y activos en ${mercado})
   Para cada uno: nombre completo, URL si la conoces, promesa principal, precio referencial,
   fortaleza en contenido, debilidad explotable, plataformas que usa

3. GAP COMPETITIVO
   - Que angulo o promesa NO esta usando nadie en ${mercado}
   - La oportunidad real de diferenciacion para este tipo de oferta`;

  const seccionAudiencia = `
4. COMPORTAMIENTO DE LA AUDIENCIA EN ${canales} (${mercado})
   - Como consume contenido esta audiencia (${audienciaStr} anos)
   - Que formatos generan mas engagement y registros/ventas
   - Que tipo de hooks los detienen en el scroll
   - Palabras, frases y emociones que resuenan con ellos`;

  // Prompts específicos por tipo de oferta
  if (offerType === "event_webinar") {
    return {
      system: `Eres un investigador de mercado digital especializado en webinars y eventos en vivo en ${mercado}.
Tu tarea es BUSCAR Y ENCONTRAR información real y actual usando búsqueda web.
Busca activamente: nombres reales de competidores, sus URLs, lo que publican, cómo promocionan sus eventos.
NO digas que no tienes acceso — simplemente busca y reporta lo que encuentras.
Mercado: ${mercado}. Idioma: español.`,
      user: `BUSCA EN LA WEB información real y actual sobre este nicho para crear contenido efectivo:

EVENTO A PROMOVER: ${productLabel}
CANAL: ${canales} | AUDIENCIA: ${audienciaStr} años | MERCADO: ${mercado}

BUSCA Y REPORTA (con URLs cuando las encuentres):

1. COMPETIDORES REALES — Encuentra 4-5 creadores, coaches, marcas o empresas que hagan webinars gratuitos sobre temas similares en ${mercado}. Para cada uno: nombre, URL o red social, qué prometen en sus eventos, cómo los promocionan en ${canales}.

2. CONTENIDO QUE FUNCIONA — Busca ejemplos reales de publicaciones o videos en ${canales} que promocionen webinars en este nicho en ${mercado}. ¿Qué hooks usan? ¿Qué ángulos de contenido generan registros?

3. GAP DE MERCADO — ¿Qué promesa, ángulo o tema NO está usando nadie en ${mercado} para webinars de este nicho? ¿Cuál es la oportunidad de diferenciación?

4. AUDIENCIA Y COMPORTAMIENTO — ¿Cómo busca y consume contenido esta audiencia (${audienciaStr} años) en ${mercado}? ¿Qué palabras y frases usan cuando buscan soluciones como esta? ¿Qué objeciones tienen para registrarse?

5. HOOKS Y COPY QUE CONVIERTEN — Encuentra ejemplos reales de hooks, CTAs y textos que usen eventos similares en ${canales} para generar registros. Incluye frases específicas que funcionan en este nicho en ${mercado}.

Incluye URLs reales de ejemplos que encuentres. Reporta solo datos verificables.`,
    };
  }

  if (offerType === "infoproduct") {
    return {
      system: `Eres un investigador de mercado especializado en infoproductos y educación digital en ${mercado}.
Tu tarea es BUSCAR y reportar información real y actual usando búsqueda web.
Encuentra nombres reales de competidores, sus URLs, precios y estrategias de contenido.
NO digas que no tienes acceso — simplemente busca y reporta lo que encuentras.
Mercado: ${mercado}. Idioma: español.`,
      user: `BUSCA EN LA WEB información real sobre este mercado de cursos y programas digitales:

PROGRAMA: ${productLabel}
CANAL: ${canales} | AUDIENCIA: ${audienciaStr} años | MERCADO: ${mercado}

1. COMPETIDORES REALES — Encuentra 4-5 cursos, programas o infoproductos sobre temas similares en ${mercado}. Para cada uno: nombre, URL/plataforma, precio aproximado, promesa de transformación, cómo lo promocionan en ${canales}.

2. CONTENIDO QUE VENDE CURSOS — Busca ejemplos reales de publicaciones o videos que vendan programas similares en ${mercado}. ¿Qué hooks usan? ¿Qué ángulos convierten más?

3. GAP Y OPORTUNIDAD — ¿Qué promesa, módulo o transformación NO está ofreciendo nadie en este nicho en ${mercado}?

4. AUDIENCIA — ¿Qué objeciones tiene esta audiencia para comprar cursos? ("no tengo tiempo", "muy caro", "¿funcionará para mí?") ¿Qué testimonios y prueba social los convence?

5. HOOKS Y COPY — Encuentra frases y hooks reales que usen los competidores para atraer estudiantes en ${canales} en ${mercado}.

Incluye URLs de ejemplos reales que encuentres.`,
    };
  }

  if (offerType === "service") {
    return {
      system: `Eres un investigador de mercado especializado en servicios profesionales en ${mercado}.
Tu tarea es BUSCAR y reportar información real y actual usando búsqueda web.
Encuentra proveedores reales, sus perfiles en redes, precios y estrategias de contenido.
NO digas que no tienes acceso — simplemente busca y reporta lo que encuentras.
Mercado: ${mercado}. Idioma: español.`,
      user: `BUSCA EN LA WEB información real sobre este mercado de servicios profesionales:

SERVICIO: ${productLabel}
CANAL: ${canales} | AUDIENCIA: ${audienciaStr} años | MERCADO: ${mercado}

1. PROVEEDORES REALES — Encuentra 4-5 personas, clínicas o empresas que ofrezcan servicios similares en ${mercado}. Para cada uno: nombre, URL o red social, cómo se posicionan, qué resultados muestran, cómo generan confianza.

2. CONTENIDO QUE GENERA CONSULTAS — Busca ejemplos reales de publicaciones o videos de proveedores similares en ${mercado}. ¿Qué hooks usan? ¿Qué formatos generan más solicitudes?

3. GAP Y DIFERENCIACIÓN — ¿Qué ángulo, garantía o promesa NO está usando nadie en ${mercado} para este servicio?

4. AUDIENCIA Y DECISIÓN — ¿Qué busca esta audiencia antes de contratar? ¿Qué miedos tiene (precio, resultados, confianza)? ¿Qué los convence de contactar?

5. HOOKS Y CTA — Encuentra frases reales que usen para atraer clientes en ${canales} en ${mercado}. ¿Qué palabras generan confianza y urgencia?

Incluye URLs de perfiles o publicaciones reales que encuentres.`,
    };
  }

  if (offerType === "saas_app") {
    return {
      system: `Eres un experto en go-to-market para SaaS y aplicaciones digitales en ${mercado}.
Especialista en contenido que convierte usuarios a trials gratuitos y demos.
Mercado: ${mercado}. Datos actuales.`,
      user: `Investigacion para crear contenido que lleve usuarios a probar este SaaS/app:

PRODUCTO: ${productLabel}
CANAL: ${canales} | AUDIENCIA: ${audienciaStr} anos | MERCADO: ${mercado}

1. MERCADO SAAS EN ESTE NICHO (${mercado})
   - Principales jugadores en ${mercado} y sus estrategias de contenido
   - Modelos de precio: freemium, trial, demo requerido
   - Principales pain points que el software resuelve en ${mercado}
${seccionCompetencia}
   - Funcionalidades que promocionan, precio mensual/anual, propuesta de valor
   - Que tipo de contenido usan para adquirir usuarios
${seccionAudiencia}
   - Objeciones tipicas: costo, migracion de herramienta actual, curva de aprendizaje
   - Que tipo de demostracion los convence de hacer el trial

5. CONTENIDO QUE CONVIERTE EN TRIALS/DEMOS (${mercado})
   - Formatos mas efectivos para demos de software en ${canales}
   - Como mostrar ROI de forma convincente
   - Comparativas que funcionan sin atacar directamente a competidores

Datos reales. URLs cuando las conozcas.`,
    };
  }

  if (offerType === "personal_brand") {
    return {
      system: `Eres un experto en construccion de marca personal y crecimiento de audiencia en ${mercado}.
Especialista en posicionamiento de thought leaders y creadores en ${canales}.
Mercado: ${mercado}. Datos actuales.`,
      user: `Investigacion para posicionar esta marca personal y hacer crecer la audiencia:

MARCA PERSONAL: ${productLabel}
CANAL: ${canales} | AUDIENCIA: ${audienciaStr} anos | MERCADO: ${mercado}

1. PANORAMA DE MARCAS PERSONALES EN ESTE NICHO (${mercado})
   - Principales referentes y creadores en este nicho en ${mercado}
   - Que tipo de contenido domina el nicho actualmente
   - Que perspectivas o angulos estan SOBRE-explotados y cuales faltan
${seccionCompetencia}
   - Cuantos seguidores tienen, engagement rate, como monetizan
   - Su estilo de contenido, frecuencia, formatos principales
${seccionAudiencia}
   - Que tipo de creador sigue esta audiencia y por que
   - Que los hace dejar de seguir a alguien
   - Que temas generan mas guardados/compartidos en este nicho

5. ESTRATEGIA DE CONTENIDO PARA CRECIMIENTO DE MARCA PERSONAL (${mercado})
   - Pilares de contenido que funcionan para construir autoridad en este nicho
   - Formatos de mayor alcance organico actual en ${canales}
   - Como hacer crecer la audiencia de forma organica en este nicho
   - Que tipo de colaboraciones o apariciones aceleran el crecimiento

Datos reales. URLs cuando las conozcas.`,
    };
  }

  if (offerType === "product_physical" || offerType === "ecommerce") {
    return {
      system: `Eres un experto en marketing de productos fisicos y e-commerce en ${mercado}.
Especialista en contenido UGC, reviews y demostraciones de producto que convierten.
Mercado: ${mercado}. Datos actuales.`,
      user: `Investigacion para crear contenido que venda este producto fisico/e-commerce:

PRODUCTO: ${productLabel}
CANAL: ${canales} | AUDIENCIA: ${audienciaStr} anos | MERCADO: ${mercado}

1. MERCADO DE ESTE TIPO DE PRODUCTO EN ${mercado}
   - Estado del mercado y tendencias de compra online en ${mercado}
   - Precios tipicos y competidores principales en ${mercado}
   - Canales de venta mas usados: Instagram Shop, TikTok Shop, Mercado Libre, etc.
${seccionCompetencia}
   - Sus precios, que muestran en redes, tipo de contenido, reviews que generan
${seccionAudiencia}
   - Como decide esta audiencia una compra online en ${mercado}
   - Que dudas y miedos tiene antes de comprar (calidad, envio, garantia)
   - Que tipo de contenido los convence: reviews, unboxing, antes/despues

5. CONTENIDO QUE VENDE PRODUCTOS FISICOS EN ${mercado}
   - Formatos UGC que mas convierten para este tipo de producto en ${canales}
   - Hooks de apertura que detienen el scroll para productos similares
   - Como mostrar el producto de forma autentica y confiable
   - Urgencia que funciona: stock limitado, descuentos, envio gratis

Datos reales. URLs cuando las conozcas.`,
    };
  }

  if (offerType === "consulting") {
    return {
      system: `Eres un experto en marketing de agencias y firmas de consultoría en ${mercado}.
Especialista en generar leads calificados y posicionar el expertise de la agencia.
Mercado: ${mercado}. Datos actuales.`,
      user: `Investigacion para crear contenido que genere leads para esta agencia/consultoria:

AGENCIA/CONSULTORIA: ${productLabel}
CANAL: ${canales} | AUDIENCIA: ${audienciaStr} anos | MERCADO: ${mercado}

1. MERCADO DE CONSULTORIA/AGENCIAS EN ESTE NICHO (${mercado})
   - Principales agencias y consultoras en ${mercado}
   - Rangos de honorarios tipicos en ${mercado}
   - Como se diferencia una agencia premium de una economica en ${mercado}
${seccionCompetencia}
   - Sus propuestas de valor, casos de exito que muestran, precios si son publicos
   - Como generan confianza y credibilidad en redes
${seccionAudiencia}
   - Que tipo de empresa/persona busca este servicio en ${mercado}
   - Que los hace elegir una agencia sobre hacerlo internamente
   - Sus principales miedos al contratar una agencia

5. CONTENIDO QUE GENERA LEADS B2B/PREMIUM EN ${mercado}
   - Formatos que posicionan expertise y generan solicitudes de propuesta
   - Como mostrar casos de exito sin revelar datos confidenciales
   - Thought leadership: que temas generan autoridad en este nicho
   - Hooks para audiencias de decision-makers en ${canales}

Datos reales. URLs cuando las conozcas.`,
    };
  }

  // Fallback genérico mejorado
  return {
    system: `Eres un estratega digital especialista en contenido para ${canal}.
Tu investigacion debe ayudar a crear contenido con objetivo de ${goals.join(" y ") || "vender"}.
MERCADO OBJETIVO: ${mercado}. Usa datos reales y actuales.`,
    user: `Investigacion de mercado completa para crear contenido:

OFERTA: ${productLabel}
CANAL: ${canales} | AUDIENCIA: ${audienciaStr} anos | OBJETIVO: ${goals.join(", ")} | MERCADO: ${mercado}

1. PANORAMA DEL MERCADO en ${mercado} (tamaño, tendencias, oportunidades)
${seccionCompetencia}
${seccionAudiencia}

5. CONTENIDO QUE CONVIERTE EN ${mercado}
   - Formatos y hooks que generan resultados en ${canales} para esta categoria
   - Tendencias actuales de contenido en este nicho
   - CTAs que mas convierten

Datos reales y actuales. URLs cuando las conozcas.`,
  };
}

// ── Perplexity AI call (research adaptado por tipo de oferta) ─────────────
async function callPerplexityResearch(
  extractedData: Record<string, unknown>,
  wizardResponses: Record<string, unknown>
): Promise<{ content: string; citations: string[] }> {
  const apiKey = getAPIKey("perplexity");
  if (!apiKey) {
    console.error("[generate-product-dna] PERPLEXITY_API_KEY not found");
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const offerType = (wizardResponses.offer_type as string) || "";
  const platforms = (wizardResponses.platforms as string[]) || [];
  const audiences = (wizardResponses.audiences as string[]) || [];
  const goals = (wizardResponses.goals as string[]) || [];
  const mercadoNombre = getMarketDescription(wizardResponses);
  const canalPrimario = (extractedData.canal_primario as string) || platforms[0] || "instagram";

  // product_name/context del wizard son más confiables que la extracción
  const productNameDirect = (wizardResponses.product_name as string | undefined)?.trim();
  const productContextDirect = (wizardResponses.product_context as string | undefined)?.trim();
  const servicioExacto = (extractedData.servicio_exacto as string) || "producto/servicio";
  const productLabel = productNameDirect
    ? (productContextDirect ? `${productNameDirect} — ${productContextDirect}` : productNameDirect)
    : servicioExacto;

  // Construir prompts específicos según el tipo de oferta
  const { system: systemPrompt, user: userPrompt } = buildPerplexityPrompts(
    offerType, productLabel, platforms, audiences, goals, mercadoNombre, canalPrimario,
  );

  console.log(`[generate-product-dna] Perplexity research: offer_type="${offerType}", mercado="${mercadoNombre}", producto="${productLabel.substring(0, 60)}"`);


  console.log("[generate-product-dna] Step 2: Perplexity research (content-focused)...");

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 6000,
      temperature: 0.3,
      return_citations: true,
      search_recency_filter: "month",
    }),
  });

  console.log(`[generate-product-dna] Perplexity response status: ${response.status}`);

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-product-dna] Perplexity error:", errText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  if (!content) {
    throw new Error("Perplexity returned empty response");
  }

  // Extraer citations (URLs fuente que Perplexity consultó)
  const citations: string[] = Array.isArray(data.citations)
    ? data.citations.filter((u: unknown) => typeof u === "string")
    : [];

  console.log(`[generate-product-dna] Perplexity research: ${content.length} chars, ${citations.length} citations`);
  return { content, citations };
}

// ── Firecrawl enrichment: scrapea URLs reales de competidores ───────────────
async function callFirecrawlEnrichment(
  perplexityContent: string,
  citations: string[],
): Promise<string> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    console.log("[generate-product-dna] FIRECRAWL_API_KEY no configurada — saltando enriquecimiento");
    return "";
  }

  // Combinar URLs del cuerpo del texto + citations de Perplexity, deduplicadas
  const fromText = extractUrlsFromText(perplexityContent, 10);
  const allUrls = Array.from(new Set([...citations, ...fromText]))
    // Filtrar redes sociales y dominios genéricos que no aportan contexto de competidores
    .filter(u => !u.includes("instagram.com") && !u.includes("tiktok.com") &&
                 !u.includes("facebook.com") && !u.includes("twitter.com") &&
                 !u.includes("wikipedia.org") && !u.includes("youtube.com") &&
                 !u.includes("google.com") && !u.includes("linkedin.com/in/"))
    .slice(0, 4); // Máximo 4 URLs para controlar tiempo y costo

  if (allUrls.length === 0) {
    console.log("[generate-product-dna] Firecrawl: no hay URLs candidatas para scrapear");
    return "";
  }

  console.log(`[generate-product-dna] Firecrawl: scrapeando ${allUrls.length} URLs de competidores...`);
  console.log(`[generate-product-dna] Firecrawl URLs: ${allUrls.join(", ")}`);

  try {
    const results = await batchScrape(allUrls, firecrawlKey, {
      concurrency: 4,
      timeoutMs: 20000,
      onlyMainContent: true,
      maxCharsPerUrl: 4000,
    });

    const okCount = results.filter(r => r.ok).length;
    console.log(`[generate-product-dna] Firecrawl: ${okCount}/${allUrls.length} URLs scrapeadas OK`);

    if (okCount === 0) return "";

    return formatScrapeContextForLLM(results, "Datos reales de competidores (Firecrawl)");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[generate-product-dna] Firecrawl falló, continuando sin scraping: ${msg}`);
    return "";
  }
}

// ── Execute 4 AI calls for 8 sections ────────────────────────────────────
async function generateAllSections(
  extractedData: Record<string, unknown>,
  perplexityResearch: string,
  wizardResponses: Record<string, unknown>,
  firecrawlContext: string = "",
): Promise<{
  market_research: Record<string, unknown>;
  competitor_analysis: Record<string, unknown>;
  strategy_recommendations: Record<string, unknown>;
  content_brief: Record<string, unknown>;
}> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY") || "";

  console.log(`[generate-product-dna] Step 2: Generating 8 sections via Mistral/GPT/Gemini... (firecrawl=${firecrawlContext.length > 0 ? firecrawlContext.length + "chars" : "none"})`);

  // Call 1: Contexto + Mercado (+ datos reales de Firecrawl si están disponibles)
  const call1Promise = callGeminiWithPrompt(apiKey, buildCall1Prompt(extractedData, perplexityResearch, wizardResponses, firecrawlContext), "call1_contexto_mercado");

  // Call 2: Avatares (independiente)
  const call2Promise = callGeminiWithPrompt(apiKey, buildCall2Prompt(extractedData, perplexityResearch, wizardResponses), "call2_avatares");

  // Wait for call1 and call2 to complete
  const [call1Result, call2Result] = await Promise.all([call1Promise, call2Promise]);

  // Validate that calls produced real content
  if (!call1Result?.seccion_1_contexto && !call1Result?.seccion_2_mercado) {
    throw new Error("call1_contexto_mercado: resultado vacío — Gemini no generó las secciones de contexto/mercado");
  }
  const avataresResult = (call2Result?.seccion_3_avatares as unknown[]) || [];
  if (avataresResult.length === 0) {
    console.warn("[generate-product-dna] call2_avatares: resultado vacío, se usarán avatares por defecto en call3");
  }

  // Extract avatares for call3
  const avatares = call2Result?.seccion_3_avatares || [];

  // Call 3: Angulos + Ideas (needs avatares)
  const call3Promise = callGeminiWithPrompt(apiKey, buildCall3Prompt(extractedData, perplexityResearch, avatares, wizardResponses), "call3_angulos_ideas");

  // Wait for call3
  const call3Result = await call3Promise;

  // Extract angulos for call4
  const angulos = call3Result?.seccion_4_angulos || [];

  // Call 4: Estrategia + Brief (needs angulos)
  const call4Result = await callGeminiWithPrompt(apiKey, buildCall4Prompt(extractedData, perplexityResearch, angulos, wizardResponses), "call4_estrategia_brief");

  // Default values for call4 sections when Gemini fails
  const goals = (wizardResponses.goals as string[]) || [];
  const defaultOrganico = {
    objetivo_organico: "Construir autoridad y comunidad",
    distribucion_contenido: { viral: 25, valor: 40, venta: 25, personal: 10, justificacion: "Balance entre engagement y conversion" },
    frecuencia_publicacion: "5 veces por semana",
    tipo_contenido_organico: "Reels, carruseles educativos, stories interactivos",
    pilares_tematicos: ["Educacion", "Casos de exito", "Detras de camaras"],
    tono_organico: "Cercano y profesional",
    metricas_organico: { retencion_objetivo: "50-70%", interacciones_clave: "Guardados > Compartidos > Comentarios", frecuencia_revision: "Semanal" },
    errores_comunes_organico: ["Publicar sin estrategia", "Ignorar metricas", "No responder comentarios"],
  };
  const defaultAds = {
    objetivo_campana: "conversiones",
    estructura_campana: { frio: "Contenido educativo de valor", tibio: "Casos de exito y testimoniales", remarketing: "Oferta directa con urgencia" },
    publico_frio: { intereses: ["Marketing digital", "Emprendimiento", "E-commerce"], comportamientos: ["Compradores online", "Duenos de paginas"], caracteristicas: "25-45 anos, interes en negocios" },
    publico_remarketing: "Visitantes web ultimos 30 dias, engagement en redes",
    presupuesto_minimo_sugerido: "$300-500 USD/mes para empezar",
    ideas_para_ads: "Ideas 2 y 3 son ideales para pauta por su enfoque en resultados",
    estructura_creativo_ad: { hook: "0-3 seg: Pregunta o dato impactante", problema: "3-10 seg: Identificar el dolor", solucion: "10-25 seg: Mostrar la solucion", cta: "25-30 seg: Llamada clara a la accion" },
    variaciones_recomendadas: "3-5 variaciones de hook por creativo",
    ctr_objetivo: "Meta Ads >1%, TikTok Ads >1.5%",
    senales_de_escalar: "CTR >2%, CPA bajo objetivo, ROAS >2x",
    senales_de_pausar: "CTR <0.5% despues de 1000 impresiones, CPA 2x objetivo",
  };
  const offerCtxDefault = getOfferTypeContext((wizardResponses.offer_type as string) || "");
  const ctaDefault = offerCtxDefault.cta_primario.split("/")[0].trim();
  const defaultBrief = {
    tono_de_voz: "Cercano, confiable, experto pero accesible",
    palabras_usar: ["Resultados", "Facil", "Rapido", "Comprobado", "Autentico"],
    palabras_evitar: ["Barato", "Gratis", "Garantizado", "Milagroso"],
    indicaciones_visuales: "Luz natural, fondo limpio, ropa casual-profesional, encuadre vertical 9:16",
    especificaciones_tecnicas: "Video vertical 9:16, minimo 1080p, audio claro sin eco",
    cta_recomendado: ctaDefault,
    restricciones_del_cliente: (extractedData.restricciones_creativas as string) || "Ninguna especificada",
  };

  // Check if call4Result has valid data
  const hasCall4Data = call4Result && Object.keys(call4Result).length > 0;
  const sec6 = hasCall4Data && call4Result?.seccion_6_estrategia_organica && Object.keys(call4Result.seccion_6_estrategia_organica as object).length > 0
    ? call4Result.seccion_6_estrategia_organica
    : defaultOrganico;
  const sec7 = hasCall4Data && call4Result?.seccion_7_estrategia_ads && Object.keys(call4Result.seccion_7_estrategia_ads as object).length > 0
    ? call4Result.seccion_7_estrategia_ads
    : defaultAds;
  const sec8 = hasCall4Data && call4Result?.seccion_8_brief_creador && Object.keys(call4Result.seccion_8_brief_creador as object).length > 0
    ? call4Result.seccion_8_brief_creador
    : defaultBrief;

  console.log(`[generate-product-dna] Call4 status: hasData=${hasCall4Data}, sec6=${Object.keys(sec6 as object).length}, sec7=${Object.keys(sec7 as object).length}, sec8=${Object.keys(sec8 as object).length}`);

  // Assemble final result mapping to existing DB columns
  return {
    market_research: {
      seccion_1_contexto: call1Result?.seccion_1_contexto || extractedData,
      seccion_2_mercado: call1Result?.seccion_2_mercado || {},
    },
    competitor_analysis: {
      competidores: call1Result?.seccion_2_mercado?.competidores || [],
      gap_competitivo: call1Result?.seccion_2_mercado?.gap_competitivo || "",
      posicionamiento: call1Result?.seccion_2_mercado?.posicionamiento_sugerido || "",
    },
    strategy_recommendations: {
      seccion_3_avatares: call2Result?.seccion_3_avatares || [],
      seccion_4_angulos: call3Result?.seccion_4_angulos || [],
      seccion_6_organico: sec6,
      seccion_7_ads: sec7,
    },
    content_brief: {
      seccion_5_ideas: call3Result?.seccion_5_ideas_contenido || [],
      seccion_8_brief_creador: sec8,
    },
  };
}

// ── Single AI call helper (Mistral → GPT-4o-mini → Gemini) ──────────────────
async function callGeminiWithPrompt(
  apiKey: string,
  prompt: string,
  callName: string
): Promise<Record<string, unknown>> {
  console.log(`[generate-product-dna] ${callName}: starting AI call chain...`);

  function parseJsonFromText(text: string, label: string): Record<string, unknown> {
    if (!text) throw new Error(`${label}: contenido vacío`);
    console.log(`[generate-product-dna] ${callName} [${label}] raw length=${text.length}, preview: ${text.substring(0, 200).replace(/\n/g, " ")}`);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`[generate-product-dna] ${callName} [${label}] no JSON found. Full preview: ${text.substring(0, 400)}`);
      throw new Error(`${label}: no se encontró JSON en la respuesta`);
    }
    try {
      const parsed = JSON.parse(repairJsonForParse(jsonMatch[0]));
      console.log(`[generate-product-dna] ${callName} [${label}] ✓ top-level keys: ${Object.keys(parsed).join(", ")}`);
      return parsed;
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error(`[generate-product-dna] ${callName} [${label}] JSON parse error: ${msg}. Fragment (first 400): ${jsonMatch[0].substring(0, 400)}`);
      throw new Error(`${label}: JSON parse failed — ${msg}`);
    }
  }

  // Attempt 1: Mistral AI — rápido, excelente en JSON estructurado, costo bajo
  const mistralKey = Deno.env.get("MISTRAL_API_KEY");
  if (mistralKey) {
    try {
      console.log(`[generate-product-dna] ${callName}: trying mistral-small-latest...`);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 35000);
      const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${mistralKey}`,
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            {
              role: "system",
              content: "Eres un estratega de marketing digital experto en LATAM. Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional. No incluyas explicaciones, solo el objeto JSON.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 4096,
          temperature: 0.4,
          response_format: { type: "json_object" },
        }),
      });
      clearTimeout(t);
      if (!r.ok) {
        const errText = await r.text();
        throw new Error(`Mistral HTTP ${r.status}: ${errText.substring(0, 200)}`);
      }
      const d = await r.json();
      const text = d.choices?.[0]?.message?.content || "";
      const finishReason = d.choices?.[0]?.finish_reason || "unknown";
      const promptTokens = d.usage?.prompt_tokens || 0;
      const completionTokens = d.usage?.completion_tokens || 0;
      console.log(`[generate-product-dna] ${callName} mistral finish_reason=${finishReason} tokens=${promptTokens}+${completionTokens}`);
      if (finishReason === "length") {
        console.warn(`[generate-product-dna] ${callName} mistral TRUNCATED at ${completionTokens} tokens — increasing max_tokens or shortening prompt`);
      }
      return parseJsonFromText(text, "mistral-small-latest");
    } catch (e) {
      const msg = e instanceof Error ? e.message.substring(0, 150) : String(e).substring(0, 150);
      console.warn(`[generate-product-dna] ${callName} attempt-1 (mistral) failed: ${msg}`);
    }
  } else {
    console.warn(`[generate-product-dna] ${callName}: MISTRAL_API_KEY not set, skipping`);
  }

  // Attempt 2: GPT-4o-mini (OpenAI) — respaldo secundario
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    try {
      console.log(`[generate-product-dna] ${callName}: trying gpt-4o-mini...`);
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 30000);
      const r2 = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        signal: ctrl2.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Eres un estratega de marketing digital experto en LATAM. Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional." },
            { role: "user", content: prompt },
          ],
          max_tokens: 4000,
          temperature: 0.4,
          response_format: { type: "json_object" },
        }),
      });
      clearTimeout(t2);
      if (!r2.ok) {
        const errText = await r2.text();
        throw new Error(`OpenAI HTTP ${r2.status}: ${errText.substring(0, 200)}`);
      }
      const d2 = await r2.json();
      const text2 = d2.choices?.[0]?.message?.content || "";
      const finishReason2 = d2.choices?.[0]?.finish_reason || "unknown";
      const pt2 = d2.usage?.prompt_tokens || 0;
      const ct2 = d2.usage?.completion_tokens || 0;
      console.log(`[generate-product-dna] ${callName} gpt-4o-mini finish_reason=${finishReason2} tokens=${pt2}+${ct2}`);
      return parseJsonFromText(text2, "gpt-4o-mini");
    } catch (e2) {
      const msg2 = e2 instanceof Error ? e2.message.substring(0, 150) : String(e2).substring(0, 150);
      console.warn(`[generate-product-dna] ${callName} attempt-2 (gpt-4o-mini) failed: ${msg2}`);
    }
  }

  // Attempt 3: Gemini 1.5 Flash — último recurso
  console.log(`[generate-product-dna] ${callName}: trying gemini-1.5-flash (last resort)...`);
  const ctrl3 = new AbortController();
  const t3 = setTimeout(() => ctrl3.abort(), 30000);
  const r3 = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl3.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 4000 },
      }),
    }
  );
  clearTimeout(t3);
  if (!r3.ok) {
    const err3 = await r3.text();
    console.error(`[generate-product-dna] ${callName} attempt-3 (gemini) failed HTTP ${r3.status}: ${err3.substring(0, 300)}`);
    throw new Error(`${callName}: todos los modelos fallaron (Mistral, GPT-4o-mini, Gemini). Último error HTTP ${r3.status}: ${err3.substring(0, 100)}`);
  }
  const d3 = await r3.json();
  const text3 = d3.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseJsonFromText(text3, "gemini-1.5-flash");
}

// ── Extract data from Perplexity research text ──────────────────────────
function extractFromResearch(research: string): Record<string, unknown> {
  // Extract competitors mentioned in text
  const competitorPatterns = [
    /(?:competidores?|competitors?|empresas? como|herramientas? como|apps? como|plataformas? como)[:\s]+([^.]+)/gi,
    /(?:CapCut|Canva|Freepeek|Adobe|Figma|ChatGPT|Midjourney|DALL-E|Runway|Picsart|InShot|VN Editor|Premiere|Final Cut|DaVinci)/gi,
  ];

  const competitors: string[] = [];
  for (const pattern of competitorPatterns) {
    const matches = research.match(pattern);
    if (matches) {
      competitors.push(...matches.map(m => m.trim()));
    }
  }

  // Extract hashtags mentioned
  const hashtagMatch = research.match(/#\w+/g) || [];
  const hashtags = [...new Set(hashtagMatch)].slice(0, 15);

  // Extract percentages and stats for market data
  const statsMatch = research.match(/\d+(?:\.\d+)?%/g) || [];
  const moneyMatch = research.match(/USD?\s*[\d,.]+\s*(?:mil(?:lones)?|billones?|MM|M|K)?/gi) || [];

  // Extract pain points (phrases after "dolor", "problema", "dificultad")
  const painPatterns = research.match(/(?:dolor|problema|dificultad|frustración|reto)[:\s]+([^.]+)/gi) || [];
  const painPoints = painPatterns.map(p => p.replace(/^[^:]+:\s*/, '').trim()).slice(0, 5);

  // Extract opportunities
  const oppPatterns = research.match(/(?:oportunidad|potencial|crecimiento)[:\s]+([^.]+)/gi) || [];
  const opportunities = oppPatterns.map(p => p.replace(/^[^:]+:\s*/, '').trim()).slice(0, 5);

  // Extract market size
  const marketSizeMatch = research.match(/(?:mercado|market).*?(USD?\s*[\d,.]+\s*(?:mil(?:lones)?|billones?|MM|M|K)?)/i);
  const marketSize = marketSizeMatch ? marketSizeMatch[1] : (moneyMatch[0] || "Por determinar");

  // Extract growth rate
  const growthMatch = research.match(/(?:crecimiento|CAGR|growth).*?(\d+(?:\.\d+)?%)/i);
  const growthRate = growthMatch ? growthMatch[1] : (statsMatch[0] || "25%");

  // Extract audience demographics
  const ageMatch = research.match(/(\d{2})\s*[-–]\s*(\d{2})\s*años/);
  const demographics = ageMatch ? `${ageMatch[1]}-${ageMatch[2]} años` : "18-34 años";

  // Build extracted data
  return {
    competitors: [...new Set(competitors)].slice(0, 8),
    hashtags: hashtags.length > 0 ? hashtags : ["#ugc", "#contenido", "#marketing", "#creadores", "#redes"],
    marketSize,
    growthRate,
    demographics,
    painPoints: painPoints.length > 0 ? painPoints : ["Falta de tiempo", "Alto costo de producción", "Baja visibilidad"],
    opportunities: opportunities.length > 0 ? opportunities : ["Crecimiento digital", "Demanda de autenticidad"],
    stats: [...new Set([...statsMatch, ...moneyMatch])].slice(0, 10),
  };
}

// ── Generate fallback analysis — usa datos reales del producto ────────────
function generateEnrichedAnalysis(
  wizardResponses: Record<string, unknown>,
  extractedData: Record<string, unknown>,
  research: string
): {
  market_research: Record<string, unknown>;
  competitor_analysis: Record<string, unknown>;
  strategy_recommendations: Record<string, unknown>;
  content_brief: Record<string, unknown>;
} {
  const extracted = extractFromResearch(research);
  const goals = (wizardResponses.goals as string[]) || ["sales"];
  const platforms = (wizardResponses.platforms as string[]) || ["instagram"];
  const serviceTypes = (wizardResponses.service_types as string[]) || ["video_ugc"];
  const mercado = getMarketDescription(wizardResponses);

  // ── Datos reales del producto (SIEMPRE usar extractedData, nunca hardcodear) ──
  const servicioExacto = (extractedData.servicio_exacto as string)
    || (wizardResponses.product_name as string | undefined)?.trim()
    || serviceTypes.join(", ");
  const pContext = (wizardResponses.product_context as string | undefined)?.trim() || "";
  const objetivoReal = (extractedData.objetivo_real as string) || goals.join(", ");
  const palabrasClave = (extractedData.palabras_clave_cliente as string[]) || [];
  const restricciones = (extractedData.restricciones_creativas as string) || "Ninguna especificada";
  const referentes = (extractedData.referentes_estilo as string) || "";
  const tono = (extractedData.tono_emocional as string) || "neutral";
  const p50 = servicioExacto.substring(0, 50);
  const p35 = servicioExacto.substring(0, 35);

  // ── CTA y objetivo usando getOfferTypeContext (SIEMPRE basado en offer_type) ──
  const offerTypeStr = (wizardResponses.offer_type as string) || "";
  const offerCtx = getOfferTypeContext(offerTypeStr);
  const ctaPrincipal = offerCtx.cta_primario.split("/")[0].trim(); // Tomar la primera variante del CTA
  const objetivoContenido = offerCtx.objetivo_contenido;
  const esWebinar = offerTypeStr === "event_webinar";
  const tonoVoz = tono === "apasionado" ? "Apasionado, experto y cercano" : tono === "urgente" ? "Urgente y directo" : "Cercano, confiable y profesional";

  // ── Competidores desde investigación de Perplexity (si la hay) ───────────
  const competidoresRaw = (extracted.competitors as string[]).filter(c =>
    c.length > 3 && c.length < 80 && !c.includes("\n") && !c.toLowerCase().includes("competidor")
  ).slice(0, 5);
  const competidores = competidoresRaw.length > 0
    ? competidoresRaw.map((name) => ({
        nombre: String(name).replace(/[,;:\-–]/g, "").trim(),
        promesa_principal: `Solución alternativa en el mercado de ${p35}`,
        precio_referencial: "Variable según mercado",
        fortaleza: "Presencia establecida en el sector",
        debilidad: "No combina eficacia clínica + rentabilidad + seguridad en un solo mensaje",
        plataformas: platforms,
      }))
    : [{
        nombre: "Competidores del sector",
        promesa_principal: `Alternativas similares a ${p35} sin diferenciación clara`,
        precio_referencial: "Variable",
        fortaleza: "Reconocimiento de marca por tiempo en el mercado",
        debilidad: "No articulan el beneficio completo: resultado clínico + negocio + experiencia del paciente",
        plataformas: platforms,
      }];

  // ── Avatares derivados del producto real (NO hardcodear María/Carlos/Ana) ──
  const frase1 = palabrasClave[0] ? `"${palabrasClave[0]}"` : `¿${p35} realmente funciona?`;
  const frase2 = palabrasClave[1] ? `"${palabrasClave[1]}"` : `¿Vale la pena la inversión?`;
  const frase3 = palabrasClave[2] ? `"${palabrasClave[2]}"` : `¿Hay respaldo científico y resultados comprobados?`;

  const avatarDefaults = [
    {
      id: "avatar_1",
      nombre_edad: "Perfil A — Buscador activo, 30-42 años",
      situacion_actual: `Profesional que busca activamente una solución como ${p50}`,
      dolor_principal: palabrasClave.length > 0
        ? `Necesita validar: ${frase1} — tiene dudas sobre resultados reales`
        : `Incertidumbre sobre la calidad y resultados reales de ${p35}`,
      deseo_principal: `Obtener ${objetivoReal.replace("sales", "ventas sólidas").replace("leads", "clientes potenciales calificados")} con ${p35}`,
      objecion_principal: `¿${p35} funciona para mi caso específico? ¿Hay casos de éxito comprobados?`,
      como_habla: [frase1, `¿Qué diferencia a ${p35} de otras opciones?`, "Necesito ver resultados reales antes de decidirme"],
      trigger_de_compra: "Testimonios reales de pares + demostración en vivo + garantía de resultados",
      nivel_consciencia: "consciente_de_la_solucion",
    },
    {
      id: "avatar_2",
      nombre_edad: "Perfil B — Decisor experimentado, 35-50 años",
      situacion_actual: `Profesional con experiencia que evalúa ${p50} como ventaja competitiva frente a colegas`,
      dolor_principal: palabrasClave.length > 1
        ? `${frase2} — compite con rivales que ofrecen lo mismo a menor precio`
        : `Todos sus competidores ofrecen productos similares y la guerra de precios erosiona su margen`,
      deseo_principal: `Diferenciarse claramente del mercado usando ${p35} como su propuesta única de valor`,
      objecion_principal: `Ya intenté otras soluciones y no cumplieron las expectativas. ¿${p35} es realmente diferente?`,
      como_habla: [frase2, "Necesito algo que me diferencie de verdad", "¿Qué resultados concretos y medibles ofrece?"],
      trigger_de_compra: "Comparativa directa con competidores + ROI calculado + cases de diferenciación real",
      nivel_consciencia: "consciente_del_producto",
    },
    {
      id: "avatar_3",
      nombre_edad: "Perfil C — Investigador cauteloso, 28-40 años",
      situacion_actual: `Conoce el mercado, está evaluando ${p50} pero necesita certeza antes de comprometerse`,
      dolor_principal: palabrasClave.length > 2
        ? `${frase3} — no quiere cometer errores costosos en la adopción de nuevas soluciones`
        : `Tiene miedo a tomar la decisión incorrecta: invertir tiempo y dinero en algo que no funcione`,
      deseo_principal: `Tomar la decisión correcta con información completa sobre ${p35} y su viabilidad real`,
      objecion_principal: `No tengo tiempo para probar algo nuevo. ¿Cuánto tiempo realista para ver resultados con ${p35}?`,
      como_habla: [frase3, "Muéstrame datos concretos y casos reales", "¿Cuánto tiempo y recursos requiere implementarlo?"],
      trigger_de_compra: "Webinar o demo en vivo + datos técnicos + ROI proyectado para su caso específico",
      nivel_consciencia: "consciente_del_problema",
    },
  ];

  // ── Ángulos de contenido usando las palabras clave reales del cliente ────
  const palabraPoderosa1 = palabrasClave[0] || (pContext ? pContext.split(" ")[0] : "los resultados");
  const palabraPoderosa2 = palabrasClave[1] || "diferenciarte";
  const beneficioClave = pContext
    ? pContext.substring(0, 60)
    : `los beneficios reales de ${p35}`;

  const angulosDefault = [
    {
      id: 1, tipo: "educativo",
      hook_apertura: `Lo que el 90% NO sabe sobre ${palabraPoderosa1} — y está perdiendo dinero por eso`,
      desarrollo: `Revelar el error más costoso del mercado relacionado con ${p50} y por qué los líderes del sector ya lo están evitando. Demostrar autoridad técnica.`,
      cta: esWebinar ? "Regístrate gratis y aprende la solución completa" : "Guarda este video y compártelo con tu equipo",
      avatar_objetivo: "avatar_1",
      fase_esfera: "enganche",
      uso_recomendado: "organico",
    },
    {
      id: 2, tipo: "transformacion",
      hook_apertura: `Antes no podía ${palabraPoderosa2}. Después de conocer ${p35}, todo cambió`,
      desarrollo: `Mostrar el contraste real: situación problemática del mercado vs solución con ${p50}. Usar datos concretos del antes/después de un caso real.`,
      cta: esWebinar ? "Aprende cómo en el webinar gratuito — link en bio" : `Descubre ${p35} — link en bio`,
      avatar_objetivo: "avatar_1",
      fase_esfera: "solucion",
      uso_recomendado: "ambos",
    },
    {
      id: 3, tipo: "prueba_social",
      hook_apertura: `Profesionales en ${mercado} ya están usando ${p35} — esto dijeron`,
      desarrollo: `Testimoniales reales de clientes que adoptaron ${p50}: qué problema resolvieron, qué resultados obtuvieron, por qué lo recomiendan. Incluir datos medibles.`,
      cta: ctaPrincipal + " — link en bio",
      avatar_objetivo: "avatar_2",
      fase_esfera: "remarketing",
      uso_recomendado: "ads",
    },
    {
      id: 4, tipo: "anti_objecion",
      hook_apertura: `"¿Pero funciona realmente?" — Respondemos las 3 dudas más grandes sobre ${p35}`,
      desarrollo: `Abordar directamente las objeciones más comunes: seguridad, resultados, inversión, tiempo. Usar datos, certificaciones y testimonios para derribar cada barrera.`,
      cta: `Resuelve todas tus dudas en el ${esWebinar ? "webinar gratuito" : "call de descubrimiento"} — agenda ya`,
      avatar_objetivo: "avatar_3",
      fase_esfera: "solucion",
      uso_recomendado: "ambos",
    },
    {
      id: 5, tipo: "educativo",
      hook_apertura: `3 razones por las que ${beneficioClave.substring(0, 45)} es el futuro del sector`,
      desarrollo: `Contenido educativo de alto valor: contexto del mercado, por qué la demanda crece, y cómo ${p35} está posicionado para liderar. Cifras y tendencias reales.`,
      cta: "Guárdalo para compartirlo con tu equipo",
      avatar_objetivo: "avatar_2",
      fase_esfera: "enganche",
      uso_recomendado: "organico",
    },
  ];

  // ── Distribución 4V según objetivo ───────────────────────────────────────
  const dist4V = goals.includes("leads") || esWebinar
    ? { viral: 20, valor: 45, venta: 25, personal: 10, justificacion: `Para ${p35} con objetivo leads/webinar: más contenido de valor educativo que convierte orgánicamente` }
    : goals.includes("brand_awareness")
    ? { viral: 35, valor: 40, venta: 15, personal: 10, justificacion: `Fase de reconocimiento: priorizar contenido viral y de valor para generar awareness de ${p35}` }
    : { viral: 25, valor: 35, venta: 30, personal: 10, justificacion: `Balance entre educación de mercado y conversión directa para ${p35}` };

  // ── Intereses de audiencia basados en el tipo de servicio ─────────────────
  const interesesFrio = palabrasClave.slice(0, 2).length > 0
    ? [...palabrasClave.slice(0, 2).map(p => p.charAt(0).toUpperCase() + p.slice(1)), "Negocios y emprendimiento"]
    : ["Profesionales del sector", "Educación y capacitación", "Negocios B2B"];

  return {
    market_research: {
      seccion_1_contexto: {
        servicio_exacto: servicioExacto,
        objetivo_real: objetivoReal,
        palabras_clave_cliente: palabrasClave,
        restricciones_creativas: restricciones,
        referentes_estilo: referentes,
        tono_emocional_audio: tono,
      },
      seccion_2_mercado: {
        panorama_mercado: research.length > 300
          ? research.substring(0, 700).trim() + "..."
          : `El mercado de ${p50} en ${mercado} muestra crecimiento sostenido impulsado por la búsqueda de soluciones especializadas y diferenciación competitiva. La demanda de contenido auténtico con resultados comprobados es la principal tendencia.`,
        tendencias_actuales: extracted.opportunities.length > 0
          ? extracted.opportunities.slice(0, 2).join(" | ")
          : `Contenido basado en prueba social y resultados reales genera 3x más conversión que contenido corporativo. Los profesionales de ${mercado} responden mejor a testimonios de pares que a publicidad tradicional.`,
        competidores: competidores,
        gap_competitivo: `Oportunidad en ${mercado}: la mayoría de competidores habla de características del producto pero NO articula el beneficio completo (resultado clínico + rentabilidad + experiencia del cliente). ${p35} puede apropiarse de ese posicionamiento.`,
        posicionamiento_sugerido: `${servicioExacto.substring(0, 70)}: el único que combina ${objetivoReal.substring(0, 40)} con resultados comprobados desde la primera sesión`,
      },
    },
    competitor_analysis: {
      competidores,
      gap_competitivo: `El gap en ${mercado}: nadie está comunicando bien el triple beneficio (eficacia + seguridad + rentabilidad) que ${p35} ofrece`,
      posicionamiento: `${p35} = Resultados comprobados + Diferenciación real + Confianza del mercado`,
    },
    strategy_recommendations: {
      seccion_3_avatares: avatarDefaults,
      seccion_4_angulos: angulosDefault,
      seccion_6_organico: {
        objetivo_organico: `${objetivoContenido} — posicionar ${p35} como referente en ${mercado}`,
        distribucion_contenido: dist4V,
        frecuencia_publicacion: "4-5 veces por semana en horario de mayor actividad profesional",
        tipo_contenido_organico: `Reels educativos de 30-60 seg, carruseles con datos del sector, testimoniales de clientes reales, stories de preguntas frecuentes`,
        pilares_tematicos: [
          `Resultados comprobados con ${p35}`,
          "Educación del mercado y tendencias del sector",
          "Casos de éxito y testimoniales reales",
          "Diferenciación vs alternativas del mercado",
        ],
        tono_organico: tonoVoz,
        metricas_organico: {
          retencion_objetivo: "55-75% del video (alto — audiencia profesional comprometida)",
          interacciones_clave: "Guardados > Compartidos con colegas > Comentarios con preguntas > Likes",
          frecuencia_revision: "Semanal — ajustar según tasa de retención y comentarios",
        },
        errores_comunes_organico: [
          "Hablar solo de características técnicas sin mostrar el beneficio para el negocio",
          "No usar testimoniales reales de clientes del mismo perfil que la audiencia",
          `Ignorar objeciones frecuentes sobre ${p35} sin responderlas en el contenido`,
        ],
      },
      seccion_7_ads: {
        objetivo_campana: goals.includes("leads") || esWebinar ? "trafico" : "conversiones",
        estructura_campana: {
          frio: `Contenido educativo de alto valor: el problema que resuelve ${p35} y por qué es diferente. Hook de dato impactante + beneficio clave`,
          tibio: `Casos de éxito y testimoniales de ${p35} para reforzar la decisión. Audiencia que ya interactuó con contenido orgánico`,
          remarketing: `Urgencia real: cupos limitados al ${esWebinar ? "webinar" : "evento"} + oferta directa + prueba social concentrada. Máxima especificidad`,
        },
        publico_frio: {
          intereses: interesesFrio,
          comportamientos: ["Compradores B2B recientes", "Seguidores de páginas del sector", "Asistentes a eventos de la industria"],
          caracteristicas: `Profesionales 28-50 años en ${mercado} con interés en ${p35}`,
        },
        publico_remarketing: `Visitantes web 30 días + Engagement con videos > 50% + Interacciones con página ${esWebinar ? "+ Inscriptos anteriores" : ""}`,
        presupuesto_minimo_sugerido: `$200-400 USD/mes para testear creativos en ${mercado}. Escalar lo que funcione semana 3-4`,
        ideas_para_ads: `Los ángulos 2 (transformación) y 3 (prueba social) son los más recomendados para pauta de ${p35}. El ángulo 4 (anti-objeción) es excelente para remarketing`,
        estructura_creativo_ad: {
          hook: `0-3 seg: Dato impactante o resultado real de ${p35} que detiene el scroll`,
          problema: `3-10 seg: El dolor específico del cliente ideal — hablar SU idioma`,
          solucion: `10-25 seg: Cómo ${p35} lo resuelve mejor que cualquier alternativa — prueba concreta`,
          cta: `25-30 seg: ${ctaPrincipal} — urgencia real o razón para actuar ahora`,
        },
        variaciones_recomendadas: "3-5 variaciones de hook para testear. Ganador se escala semana 2",
        ctr_objetivo: `Meta Ads >1.2%, TikTok Ads >1.5% para audiencia profesional de ${mercado}`,
        senales_de_escalar: "CTR >2%, CPA bajo objetivo de conversión, ROAS >2.5x por 3 días consecutivos",
        senales_de_pausar: "CTR <0.8% después de 2000 impresiones, o CPA 2x por encima del objetivo",
      },
    },
    content_brief: {
      seccion_5_ideas: [
        {
          id: 1,
          titulo: `La verdad que nadie dice sobre ${palabraPoderosa1} en ${mercado}`,
          formato: "educativo",
          hook_variacion_1: `Lo que los líderes del sector ya saben sobre ${palabraPoderosa1} (y tú deberías saber)`,
          hook_variacion_2: `Por qué el 80% en ${mercado} está abordando esto de forma equivocada`,
          hook_variacion_3: `El error más costoso sobre ${palabraPoderosa1} — y cómo evitarlo`,
          desarrollo: `Revelar insight de alto valor: el enfoque incorrecto del mercado vs. la solución correcta con ${p50}. Datos reales + demostración de autoridad`,
          cta: esWebinar ? "Regístrate gratis al webinar — aprende la solución completa" : "Guárdalo y síguenos para más",
          duracion_recomendada: "30-60 seg",
          fase_esfera: "enganche",
          uso_recomendado: "organico",
        },
        {
          id: 2,
          titulo: `Resultados reales de ${p35}: antes vs. después`,
          formato: "antes_despues",
          hook_variacion_1: `De [problema] a [resultado] con ${p35} — historia real de un cliente`,
          hook_variacion_2: `Esto pasó cuando usamos ${p35} por primera vez — los números hablan`,
          hook_variacion_3: `¿Increíble o real? Lo que lograron nuestros clientes con ${p35}`,
          desarrollo: "Caso real con datos medibles: situación inicial → proceso → resultado obtenido → impacto en negocio. Sin exageraciones, todo verificable",
          cta: ctaPrincipal + " y obtén los mismos resultados",
          duracion_recomendada: "15-45 seg",
          fase_esfera: "solucion",
          uso_recomendado: "ambos",
        },
      ],
      seccion_8_brief_creador: {
        tono_de_voz: "Cercano, confiable, experto pero accesible",
        palabras_usar: ["Resultados", "Facil", "Rapido", "Comprobado", "Autentico"],
        palabras_evitar: ["Barato", "Gratis", "Garantizado", "Milagroso"],
        indicaciones_visuales: "Luz natural, fondo limpio, ropa casual-profesional, encuadre vertical 9:16",
        especificaciones_tecnicas: "Video vertical 9:16, minimo 1080p, audio claro sin eco",
        cta_recomendado: ctaPrincipal,
        restricciones_del_cliente: (extractedData.restricciones_creativas as string) || "Ninguna especificada",
      },
    },
  };
}

// ── Prompt Builders for 8 Sections (compactos para evitar timeout) ──────────

// Helpers para construir contexto compacto
function buildProductContext(extractedData: Record<string, unknown>, wizardResponses: Record<string, unknown>): string {
  const pName = (wizardResponses.product_name as string | undefined)?.trim();
  const pCtx = (wizardResponses.product_context as string | undefined)?.trim();
  if (pName) return pCtx ? `${pName} — ${pCtx}` : pName;
  return (extractedData.servicio_exacto as string) || "No especificado";
}

function buildResearchSummary(research: string, maxChars: number): string {
  if (!research || research.length < 50) return "Sin investigacion disponible.";
  // Tomar solo el fragmento más relevante evitando listas de referencias
  const clean = research.replace(/\[\d+\]/g, "").replace(/https?:\/\/\S+/g, "").trim();
  return clean.substring(0, maxChars);
}

// ── Helper: contexto estratégico según tipo de oferta ───────────────────────
function getOfferTypeContext(offerType: string): {
  label: string;
  cta_primario: string;
  objetivo_contenido: string;
  metricas_exito: string;
  instrucciones_especiales: string;
} {
  const map: Record<string, ReturnType<typeof getOfferTypeContext>> = {
    event_webinar: {
      label: "Webinar / Live / Clase gratuita",
      cta_primario: "Regístrate gratis / Reserva tu lugar / Únete al live",
      objetivo_contenido: "ATRAER REGISTROS al evento, NO vender directamente. El contenido debe generar FOMO y curiosidad sobre lo que aprenderán",
      metricas_exito: "Tasa de registro, asistencia, retención en el evento",
      instrucciones_especiales: "Los ángulos deben crear urgencia de cupos limitados y revelar UN insight del webinar sin spoilear todo. Los hooks deben hacer la pregunta que el avatar se hace antes de registrarse. El CTA siempre es registro gratuito.",
    },
    service: {
      label: "Servicio profesional",
      cta_primario: "Agenda tu consulta / Solicita más info / Reserva tu cita",
      objetivo_contenido: "Generar confianza, mostrar resultados reales y posicionarse como experto para que el avatar dé el paso de contactar",
      metricas_exito: "Solicitudes de consulta, mensajes recibidos, agendamiento",
      instrucciones_especiales: "Los ángulos deben mostrar resultados concretos (antes/después), casos reales y expertise. Usar formatos testimonial y POV del cliente. El contenido debe reducir la percepción de riesgo.",
    },
    product_physical: {
      label: "Producto físico",
      cta_primario: "Compra ahora / Pide el tuyo / Envíos a todo el país",
      objetivo_contenido: "Mostrar el producto en uso, demostrar beneficios tangibles y crear deseo de compra inmediata",
      metricas_exito: "Clicks en link, mensajes de compra, conversión en tienda",
      instrucciones_especiales: "Priorizar formatos unboxing, demostración de uso y reviews. Los hooks deben sorprender con un beneficio inesperado del producto. Urgencia por stock limitado cuando aplique.",
    },
    infoproduct: {
      label: "Infoproducto / Curso online",
      cta_primario: "Inscríbete ahora / Accede al programa / Empieza hoy",
      objetivo_contenido: "Mostrar la transformación que logran y reducir el escepticismo ('¿Funcionará para mí?')",
      metricas_exito: "Inscripciones, ventas del programa, tasa de completación",
      instrucciones_especiales: "Los ángulos deben mezclar aspiración (lo que lograrán) con validación social (resultados de otros estudiantes). Usar formato 'Lo que nadie te enseña sobre X'. Manejar la objeción 'no tengo tiempo/dinero/experiencia'.",
    },
    saas_app: {
      label: "SaaS / Aplicación digital",
      cta_primario: "Pruébalo gratis / Regístrate gratis / Ver demo",
      objetivo_contenido: "Demostrar el problema que resuelve, mostrar cómo funciona y generar pruebas gratuitas o demos",
      metricas_exito: "Trials iniciados, demos solicitados, activación de usuarios",
      instrucciones_especiales: "Los ángulos deben mostrar el 'antes sin la app vs después con la app'. Priorizar demos cortos en pantalla (screen recording). Comparar con método manual para mostrar el ahorro de tiempo.",
    },
    personal_brand: {
      label: "Marca personal",
      cta_primario: "Sígueme / Únete a mi comunidad / Descarga gratis",
      objetivo_contenido: "Construir autoridad, generar confianza y hacer crecer la audiencia comprometida",
      metricas_exito: "Seguidores, engagement, comunidad activa, leads calificados",
      instrucciones_especiales: "Los ángulos deben mezclar contenido de valor (posicionamiento experto) con historia personal (humanización). Usar perspectivas contrarias al mainstream del nicho. El CTA principal es seguir / guardar / compartir.",
    },
    ecommerce: {
      label: "E-commerce / Tienda online",
      cta_primario: "Compra aquí / Envío gratis / Ver catálogo",
      objetivo_contenido: "Mostrar productos en contexto real, generar deseo de compra y manejar objeciones de compra online",
      metricas_exito: "Clicks en link de tienda, conversión, carrito promedio",
      instrucciones_especiales: "Priorizar formatos 'haul', 'lo que compré' y 'review honesto'. Los hooks deben mostrar el producto en situaciones reales de uso. Incluir urgencia por descuentos temporales o stock limitado.",
    },
    consulting: {
      label: "Agencia / Consultoría",
      cta_primario: "Solicita tu diagnóstico gratuito / Agenda una llamada / Cotiza con nosotros",
      objetivo_contenido: "Demostrar expertise con casos reales, resultados de clientes y metodología propia",
      metricas_exito: "Solicitudes de propuesta, llamadas agendadas, clientes cerrados",
      instrucciones_especiales: "Los ángulos deben mostrar el error que cometen solos vs los resultados con tu consultoría. Usar formatos de case study y behind-the-scenes. Posicionar el costo como inversión con ROI claro.",
    },
  };

  return map[offerType] || {
    label: "Producto/Servicio",
    cta_primario: "Contáctanos / Compra ahora / Solicita info",
    objetivo_contenido: "Generar interés, mostrar valor y convertir a compradores o leads",
    metricas_exito: "Ventas, leads, contactos recibidos",
    instrucciones_especiales: "Adaptar el contenido al funnel: TOFU para awareness, MOFU para consideración, BOFU para conversión.",
  };
}

// Call 1: Seccion 1 (Contexto) + Seccion 2 (Mercado) — incluye datos reales de Firecrawl si están disponibles
function buildCall1Prompt(
  extractedData: Record<string, unknown>,
  perplexityResearch: string,
  wizardResponses: Record<string, unknown>,
  firecrawlContext: string = "",
): string {
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const mercado = getMarketDescription(wizardResponses);
  const producto = buildProductContext(extractedData, wizardResponses);
  const research = buildResearchSummary(perplexityResearch, 4000);

  // Si hay datos de Firecrawl, reducir el research de Perplexity para compensar
  const researchSection = firecrawlContext
    ? `INVESTIGACION DE MERCADO (Perplexity):\n${buildResearchSummary(perplexityResearch, 2500)}\n\nDATOS REALES DE COMPETIDORES (scraping directo):\n${firecrawlContext.substring(0, 4000)}`
    : `RESUMEN DE INVESTIGACION:\n${research}`;

  const offerCtx = getOfferTypeContext((wizardResponses.offer_type as string) || "");

  return `Estratega de marketing en ${mercado}. Responde SOLO JSON válido.

TIPO DE OFERTA: ${offerCtx.label}
OBJETIVO DEL CONTENIDO: ${offerCtx.objetivo_contenido}
CTA PRINCIPAL: ${offerCtx.cta_primario}
PRODUCTO/OFERTA: ${producto}
METAS: ${goals.join(", ")}
CANAL: ${platforms.join(", ")}
MERCADO: ${mercado}
PALABRAS CLAVE: ${((extractedData.palabras_clave_cliente as string[]) || []).join(", ")}
RESTRICCIONES: ${extractedData.restricciones_creativas || "ninguna"}
TONO: ${extractedData.tono_emocional || "neutral"}

${researchSection}

JSON exacto (sin texto extra):
{"seccion_1_contexto":{"servicio_exacto":"string","tipo_oferta":"${(wizardResponses.offer_type as string) || "service"}","objetivo_real":"string","cta_principal":"${offerCtx.cta_primario}","palabras_clave_cliente":["string"],"restricciones_creativas":"string","referentes_estilo":"string","tono_emocional_audio":"string"},"seccion_2_mercado":{"panorama_mercado":"2-3 oraciones con datos del mercado","tendencias_actuales":"que funciona HOY en el canal","competidores":[{"nombre":"string","promesa_principal":"string","precio_referencial":"string","fortaleza":"string","debilidad":"string","plataformas":["string"]}],"gap_competitivo":"la oportunidad real de diferenciacion","posicionamiento_sugerido":"como diferenciarse en ese canal"}}`;
}

// Call 2: Seccion 3 (3 Avatares)
function buildCall2Prompt(
  extractedData: Record<string, unknown>,
  perplexityResearch: string,
  wizardResponses: Record<string, unknown>
): string {
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const audiences = (wizardResponses.audiences as string[]) || [];
  const mercado = getMarketDescription(wizardResponses);
  const producto = buildProductContext(extractedData, wizardResponses);
  const palabrasClave = (extractedData.palabras_clave_cliente as string[]) || [];
  const research = buildResearchSummary(perplexityResearch, 3000);

  const offerCtx = getOfferTypeContext((wizardResponses.offer_type as string) || "");

  return `Experto en psicologia del consumidor y audiencias digitales en ${mercado}. Responde SOLO JSON válido.

TIPO DE OFERTA: ${offerCtx.label}
LO QUE QUIEREN LOGRAR CON EL CONTENIDO: ${offerCtx.objetivo_contenido}
PRODUCTO/OFERTA: ${producto}
CANAL: ${platforms.join(", ")} | AUDIENCIA: ${audiences.join(", ")} anos | OBJETIVO: ${goals.join(", ")}
MERCADO: ${mercado} | PALABRAS DEL CLIENTE: ${palabrasClave.join(", ")}

CONTEXTO DE MERCADO:
${research}

Crea 3 avatares del cliente ideal, ESPECIFICOS para ${producto} (tipo: ${offerCtx.label}). NO genéricos.
Usa nombres reales de personas (no "Perfil A"). El trigger_de_compra debe ser especifico para "${offerCtx.cta_primario}".

JSON exacto (sin texto extra):
{"seccion_3_avatares":[{"id":"avatar_1","nombre_edad":"Nombre real, edad ej: Carlos Ruiz, 38 anos","situacion_actual":"string","dolor_principal":"string","deseo_principal":"string","objecion_principal":"string","como_habla":["frase 1","frase 2","frase 3"],"trigger_de_compra":"string","nivel_consciencia":"consciente_de_la_solucion"},{"id":"avatar_2","nombre_edad":"string","situacion_actual":"string","dolor_principal":"string","deseo_principal":"string","objecion_principal":"string","como_habla":["string"],"trigger_de_compra":"string","nivel_consciencia":"string"},{"id":"avatar_3","nombre_edad":"string","situacion_actual":"string","dolor_principal":"string","deseo_principal":"string","objecion_principal":"string","como_habla":["string"],"trigger_de_compra":"string","nivel_consciencia":"string"}]}`;
}

// Call 3: Seccion 4 (7 Angulos) + Seccion 5 (7 Ideas)
function buildCall3Prompt(
  extractedData: Record<string, unknown>,
  perplexityResearch: string,
  avatares: unknown[],
  wizardResponses: Record<string, unknown>
): string {
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const mercado = getMarketDescription(wizardResponses);
  const producto = buildProductContext(extractedData, wizardResponses);
  const research = buildResearchSummary(perplexityResearch, 2500);

  // Compact avatar summary (just nombre + dolor)
  const avatarSummary = (avatares as Array<Record<string, unknown>>)
    .map((a, i) => `Avatar ${i+1}: ${a.nombre_edad} | Dolor: ${a.dolor_principal}`)
    .join("\n");

  const offerCtx = getOfferTypeContext((wizardResponses.offer_type as string) || "");

  return `Estratega creativo UGC y copywriting para ${platforms.join("/")} en ${mercado}. Responde SOLO JSON válido.

TIPO DE OFERTA: ${offerCtx.label}
OBJETIVO PRINCIPAL DEL CONTENIDO: ${offerCtx.objetivo_contenido}
CTA OBLIGATORIO EN TODOS LOS ANGULOS: "${offerCtx.cta_primario}"
INSTRUCCIONES ESPECIALES: ${offerCtx.instrucciones_especiales}

PRODUCTO/OFERTA: ${producto}
METAS: ${goals.join(", ")} | MERCADO: ${mercado} | TONO: ${extractedData.tono_emocional || "neutral"}
AVATARES:
${avatarSummary}
RESTRICCIONES: ${extractedData.restricciones_creativas || "ninguna"}

CONTEXTO DE MERCADO:
${research}

Genera 7 angulos creativos + 7 ideas de contenido 100% especificas para "${producto}" (${offerCtx.label}).
Todos los CTAs deben ser variaciones de "${offerCtx.cta_primario}". NO uses CTAs genéricos.

JSON exacto (sin texto extra):
{"seccion_4_angulos":[{"id":1,"tipo":"educativo|emocional|aspiracional|prueba_social|anti_objecion|transformacion|urgencia","hook_apertura":"string","desarrollo":"string","cta":"${offerCtx.cta_primario}","avatar_objetivo":"avatar_1|avatar_2|avatar_3","fase_esfera":"enganche|solucion|remarketing|fidelizacion","uso_recomendado":"organico|ads|ambos"}],"seccion_5_ideas_contenido":[{"id":1,"titulo":"string","formato":"testimonial_selfie|antes_despues|tutorial|educativo|reto|pov","hook_variacion_1":"string","hook_variacion_2":"string","hook_variacion_3":"string","desarrollo":"string","cta":"string","duracion_recomendada":"string","fase_esfera":"string","uso_recomendado":"string"}]}

Genera EXACTAMENTE 7 angulos y 7 ideas.`;
}

// Call 4: Seccion 6 (Organico) + Seccion 7 (Ads) + Seccion 8 (Brief)
function buildCall4Prompt(
  extractedData: Record<string, unknown>,
  perplexityResearch: string,
  angulos: unknown[],
  wizardResponses: Record<string, unknown>
): string {
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const audiences = (wizardResponses.audiences as string[]) || [];
  const mercado = getMarketDescription(wizardResponses);
  const producto = buildProductContext(extractedData, wizardResponses);
  const research = buildResearchSummary(perplexityResearch, 2000);

  // Compact angulos summary (solo hooks para referencia)
  const angulosSummary = (angulos as Array<Record<string, unknown>>)
    .slice(0, 5)
    .map((a, i) => `${i+1}. ${a.hook_apertura} [${a.uso_recomendado}]`)
    .join("\n");

  const offerCtx = getOfferTypeContext((wizardResponses.offer_type as string) || "");

  return `Estratega digital growth en ${platforms.join("/")} para ${mercado}. Responde SOLO JSON válido.

TIPO DE OFERTA: ${offerCtx.label}
METRICA DE EXITO PRINCIPAL: ${offerCtx.metricas_exito}
CTA PRINCIPAL: ${offerCtx.cta_primario}
INSTRUCCIONES ESPECIALES: ${offerCtx.instrucciones_especiales}

PRODUCTO/OFERTA: ${producto}
OBJETIVO: ${goals.join(", ")} | CANAL: ${platforms.join(", ")} | AUDIENCIA: ${audiences.join(", ")} anos
MERCADO: ${mercado} | RESTRICCIONES: ${extractedData.restricciones_creativas || "ninguna"}

ANGULOS GENERADOS:
${angulosSummary}

CONTEXTO DE MERCADO:
${research}

La estrategia organica y de ads debe estar 100% orientada a lograr: "${offerCtx.objetivo_contenido}".
El cta_recomendado en el brief siempre debe ser una variacion de "${offerCtx.cta_primario}".

JSON exacto (sin texto extra):
{"seccion_6_estrategia_organica":{"objetivo_organico":"string","distribucion_contenido":{"viral":25,"valor":40,"venta":25,"personal":10,"justificacion":"string"},"frecuencia_publicacion":"string","tipo_contenido_organico":"string","pilares_tematicos":["pilar1","pilar2","pilar3"],"tono_organico":"string","metricas_organico":{"retencion_objetivo":"string","interacciones_clave":"string","frecuencia_revision":"string"},"errores_comunes_organico":["error1","error2","error3"]},"seccion_7_estrategia_ads":{"objetivo_campana":"conversiones|trafico|reconocimiento","estructura_campana":{"frio":"string","tibio":"string","remarketing":"string"},"publico_frio":{"intereses":["interes1","interes2","interes3"],"comportamientos":["comportamiento1","comportamiento2"],"caracteristicas":"string"},"publico_remarketing":"string","presupuesto_minimo_sugerido":"string","ideas_para_ads":"string","estructura_creativo_ad":{"hook":"string","problema":"string","solucion":"string","cta":"${offerCtx.cta_primario}"},"variaciones_recomendadas":"string","ctr_objetivo":"string","senales_de_escalar":"string","senales_de_pausar":"string"},"seccion_8_brief_creador":{"tono_de_voz":"string","palabras_usar":["p1","p2","p3","p4","p5"],"palabras_evitar":["p1","p2","p3"],"indicaciones_visuales":"string","especificaciones_tecnicas":"string","cta_recomendado":"${offerCtx.cta_primario}","restricciones_del_cliente":"string"}}`;
}

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let productDnaId: string | null = null;

  try {
    const body = await req.json();
    // Soportar ambos formatos: productDnaId y product_dna_id
    productDnaId = body.productDnaId || body.product_dna_id;

    if (!productDnaId) {
      return new Response(
        JSON.stringify({ success: false, error: "productDnaId es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-product-dna] Starting for record: ${productDnaId}`);

    // ── 1. Read the product_dna record ──────────────────────────────────
    const { data: record, error: fetchError } = await supabase
      .from("product_dna")
      .select("*")
      .eq("id", productDnaId)
      .single();

    if (fetchError || !record) {
      throw new Error(`Record not found: ${fetchError?.message || "unknown"}`);
    }

    console.log(`[generate-product-dna] Record loaded - client: ${record.client_id}, group: ${record.service_group}, services: ${record.service_types?.join(",")}`);
    console.log(`[generate-product-dna] wizard_responses keys: ${Object.keys(record.wizard_responses || {}).join(",")}`);
    console.log(`[generate-product-dna] wizard_responses raw: ${JSON.stringify(record.wizard_responses || {}).substring(0, 500)}`);

    // ── 2. Get transcription (check wizard_responses first, then record field) ───
    const wizardResponses = record.wizard_responses || {};
    let transcription = record.transcription || wizardResponses.transcription || "";
    let emotionalAnalysis: Record<string, unknown> = wizardResponses.emotional_analysis || {};

    console.log(`[generate-product-dna] Transcription source: ${
      record.transcription ? 'record.transcription' :
      wizardResponses.transcription ? 'wizard_responses.transcription' :
      'none'
    }, length: ${transcription.length}`);

    // Only transcribe if we don't have one already
    if (record.audio_url && !transcription) {
      try {
        console.log(`[generate-product-dna] Downloading audio from: ${record.audio_url}`);

        // Download audio using service role client (works for both public and private buckets)
        let audioBlob: Blob;
        const storagePath = record.audio_url.replace(/^.*\/audio-recordings\//, "").replace(/^.*\/object\/public\/audio-recordings\//, "");
        const { data: audioData, error: audioError } = await supabase.storage
          .from("audio-recordings")
          .download(storagePath);
        if (audioError || !audioData) throw new Error(`Storage download error: ${audioError?.message}`);
        audioBlob = audioData;

        console.log(`[generate-product-dna] Audio downloaded: ${audioBlob.size} bytes`);

        // Transcribe with Whisper
        transcription = await transcribeWithWhisper(audioBlob);

        // Emotional analysis with Gemini
        if (transcription.length > 50) {
          emotionalAnalysis = await analyzeEmotions(transcription);
        }
      } catch (audioErr) {
        console.error("[generate-product-dna] Audio processing failed, continuing without:", audioErr);
        // Non-fatal: continue with wizard responses only
      }
    }

    // ── 3. Extract data from audio ─────────────────────────────────────────
    console.log("[generate-product-dna] Step 1: Extracting data from audio...");
    const extractedData = await extractFromAudio(transcription, wizardResponses);
    console.log(`[generate-product-dna] Extracted data keys: ${Object.keys(extractedData).join(", ")}`);

    // Prioridad: product_name y product_context del wizard > extracción de Gemini
    const pName = (wizardResponses.product_name as string | undefined)?.trim();
    const pContext = (wizardResponses.product_context as string | undefined)?.trim();
    if (pName) {
      extractedData.servicio_exacto = pContext
        ? `${pName} — ${pContext}`
        : pName;
      console.log(`[generate-product-dna] product_name override: "${extractedData.servicio_exacto}"`);
    } else {
      console.log(`[generate-product-dna] No product_name, using extracted: "${extractedData.servicio_exacto}"`);
    }

    // ── 4a. Research con Perplexity sonar-pro ────────────────────────────────
    let perplexityResearch = "";
    let perplexityCitations: string[] = [];

    try {
      const perplexityResult = await callPerplexityResearch(extractedData, wizardResponses);
      perplexityResearch = perplexityResult.content;
      perplexityCitations = perplexityResult.citations;
      console.log(`[generate-product-dna] Perplexity: ${perplexityResearch.length} chars, ${perplexityCitations.length} citations`);
    } catch (researchError) {
      console.error("[generate-product-dna] Perplexity research failed:", researchError);
      // Continue with fallback - will use extractedData + defaults
    }

    // ── 4b. Firecrawl: enriquecimiento con datos reales de competidores ──────
    let firecrawlContext = "";

    if (perplexityResearch.length > 100) {
      try {
        firecrawlContext = await callFirecrawlEnrichment(perplexityResearch, perplexityCitations);
        if (firecrawlContext) {
          console.log(`[generate-product-dna] Firecrawl enriquecimiento: ${firecrawlContext.length} chars`);
        }
      } catch (fcErr) {
        const msg = fcErr instanceof Error ? fcErr.message : String(fcErr);
        console.warn(`[generate-product-dna] Firecrawl enrichment failed (non-fatal): ${msg}`);
      }
    }

    // ── 5. Generate 8 sections con Mistral/GPT/Gemini ────────────────────────
    let analysisResult: {
      market_research: Record<string, unknown>;
      competitor_analysis: Record<string, unknown>;
      strategy_recommendations: Record<string, unknown>;
      content_brief: Record<string, unknown>;
    };

    let usedFallback = false;
    let generationErrorMsg: string | null = null;

    if (perplexityResearch.length > 100) {
      try {
        analysisResult = await generateAllSections(extractedData, perplexityResearch, wizardResponses, firecrawlContext);
        console.log("[generate-product-dna] ✅ All sections generated successfully via AI");
        // Validate that the result has real content
        const compAnalysis = analysisResult.competitor_analysis as Record<string, unknown>;
        const strat = analysisResult.strategy_recommendations as Record<string, unknown>;
        const compArray = compAnalysis?.competidores as unknown[] || [];
        const avArray = strat?.seccion_3_avatares as unknown[] || [];
        console.log(`[generate-product-dna] Result validation: competitors=${compArray.length}, avatares=${avArray.length}`);
      } catch (genError) {
        generationErrorMsg = genError instanceof Error ? genError.message : String(genError);
        console.error("[generate-product-dna] ⚠️ Section generation FAILED:", generationErrorMsg);
        console.log("[generate-product-dna] Falling back with Perplexity research available:", perplexityResearch.length, "chars");
        usedFallback = true;
        analysisResult = generateEnrichedAnalysis(wizardResponses, extractedData, perplexityResearch);
      }
    } else {
      console.log("[generate-product-dna] Using fallback analysis (no research available)");
      usedFallback = true;
      analysisResult = generateEnrichedAnalysis(wizardResponses, extractedData, "");
    }

    // ── 6. Calculate confidence score ──────────────────────────────────────
    let confidenceScore = 85;
    if (!perplexityResearch || perplexityResearch.length < 500) confidenceScore -= 20;
    if (!transcription || transcription.length < 100) confidenceScore -= 15;
    const angulos = (analysisResult.strategy_recommendations as Record<string, unknown>)?.seccion_4_angulos;
    if (!angulos || !Array.isArray(angulos) || angulos.length === 0) confidenceScore -= 10;
    confidenceScore = Math.max(50, Math.min(100, confidenceScore));

    // ── 7. Update product_dna record ───────────────────────────────────────
    const updatePayload: Record<string, unknown> = {
      market_research: analysisResult.market_research,
      competitor_analysis: analysisResult.competitor_analysis,
      strategy_recommendations: analysisResult.strategy_recommendations,
      content_brief: analysisResult.content_brief,
      ai_confidence_score: confidenceScore,
      estimated_complexity: "moderate",
      status: "ready",
    };

    // Save transcription if we generated it
    if (transcription && !record.transcription) {
      updatePayload.transcription = transcription;
    }

    // Store emotional analysis in wizard_responses
    if (Object.keys(emotionalAnalysis).length > 0) {
      updatePayload.wizard_responses = {
        ...(record.wizard_responses || {}),
        emotional_analysis: emotionalAnalysis,
      };
    }

    console.log("[generate-product-dna] Updating record with analysis...");

    const { error: updateError } = await supabase
      .from("product_dna")
      .update(updatePayload)
      .eq("id", productDnaId);

    if (updateError) {
      throw new Error(`Error updating product DNA: ${updateError.message}`);
    }

    // ── 8. Consume tokens ──────────────────────────────────────────────────
    // Firma real de consume_ai_tokens (verificada contra pg_proc / baseline.sql):
    //   consume_ai_tokens(p_user_id uuid, p_org_id uuid, p_action_type text, p_tokens integer, p_metadata jsonb)
    // La llamada anterior usaba p_organization_id/p_feature/p_model, que NO existen en la
    // firma real -> PostgREST no resolvia la funcion y el cobro fallaba en silencio (el
    // try/catch solo hacia console.warn). 600 tokens: cubre 1 research de Perplexity +
    // 1 enriquecimiento Firecrawl + 4 llamadas a Gemini (call1..call4 en generateAllSections).
    try {
      // product_dna no tiene organization_id propio; se deriva desde clients.organization_id
      // (join por client_id, ya presente en record). No hay usuario final en este flujo
      // (se dispara desde el wizard sin pasar user_id), asi que se cobra a la organizacion.
      const { data: clientRow, error: clientLookupError } = await supabase
        .from("clients")
        .select("organization_id")
        .eq("id", record.client_id)
        .maybeSingle();

      if (clientLookupError || !clientRow?.organization_id) {
        console.error(
          `[generate-product-dna] Cobro de tokens: no se pudo resolver organization_id (product_dna_id=${productDnaId}, client_id=${record.client_id}):`,
          clientLookupError?.message || "clients.organization_id vacio"
        );
      } else {
        const { data: tokenResult, error: tokenError } = await supabase.rpc("consume_ai_tokens", {
          p_user_id: null,
          p_org_id: clientRow.organization_id,
          p_action_type: "product_dna",
          p_tokens: 600,
          p_metadata: { product_dna_id: productDnaId, model: "gemini-2.5-flash" },
        });

        if (tokenError || !tokenResult?.success) {
          console.error(
            `[generate-product-dna] Cobro de tokens FALLO (product_dna_id=${productDnaId}, org=${clientRow.organization_id}):`,
            tokenError?.message || tokenResult?.error || "razon desconocida"
          );
        } else {
          console.log("[generate-product-dna] Tokens consumidos OK (600)");
        }
      }
    } catch (tokenErr) {
      // No tumbar la generacion por un fallo de contabilidad (el usuario ya tiene su
      // Product DNA listo) pero que quede visible en logs, no un console.warn silencioso.
      console.error(`[generate-product-dna] Cobro de tokens lanzo excepcion (product_dna_id=${productDnaId}):`, tokenErr);
    }

    console.log(`[generate-product-dna] Product DNA updated: ${productDnaId} → status=ready`);

    // ── 9. CREATE a products record so it shows in the Products tab ──────
    let productId: string | null = null;
    try {
      const sr = analysisResult.strategy_recommendations as Record<string, unknown> || {};
      const mr = analysisResult.market_research as Record<string, unknown> || {};
      const cb = analysisResult.content_brief as Record<string, unknown> || {};
      const ca = analysisResult.competitor_analysis || {};

      // New structure fields
      const contexto = (mr.seccion_1_contexto as Record<string, unknown>) || {};
      const mercado = (mr.seccion_2_mercado as Record<string, unknown>) || {};
      const avatares = (sr.seccion_3_avatares as unknown[]) || [];
      const angulos = (sr.seccion_4_angulos as Array<{ hook_apertura?: string }>) || [];
      const briefCreador = (cb.seccion_8_brief_creador as Record<string, unknown>) || {};

      // Build a product name from extracted service or service group
      const groupLabels: Record<string, string> = {
        content_creation: "Creación de Contenido",
        post_production: "Post Producción",
        strategy_marketing: "Estrategia de Marketing",
        technology: "Tecnología",
        education_training: "Educación",
        general_services: "Servicios Generales",
      };
      const groupName = groupLabels[record.service_group] || record.service_group;
      const servicioExacto = (contexto.servicio_exacto as string) || "";
      const productName = servicioExacto
        ? servicioExacto.substring(0, 80)
        : `${groupName} - ${(record.service_types || []).join(", ")}`;

      // Extract sales angle hooks as text array
      const salesAngles = angulos
        .map((a) => a.hook_apertura)
        .filter(Boolean);

      // Build ideal avatar summary from first avatar
      const firstAvatar = avatares[0] as Record<string, unknown> | undefined;
      const idealAvatar = firstAvatar ? [
        firstAvatar.nombre_edad,
        firstAvatar.situacion_actual,
        firstAvatar.dolor_principal ? `Dolor: ${firstAvatar.dolor_principal}` : null,
        firstAvatar.deseo_principal ? `Deseo: ${firstAvatar.deseo_principal}` : null,
      ].filter(Boolean).join("\n") : null;

      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          client_id: record.client_id,
          name: productName,
          description: (contexto.objetivo_real as string) || null,
          strategy: (briefCreador.tono_de_voz as string) || null,
          market_research: (mercado.panorama_mercado as string) || null,
          ideal_avatar: idealAvatar || null,
          sales_angles: salesAngles.length > 0 ? salesAngles : null,
          competitor_analysis: ca,
          sales_angles_data: angulos || null,
          content_strategy: cb,
          brief_data: {
            product_dna_id: productDnaId,
            service_group: record.service_group,
            service_types: record.service_types,
            wizard_responses: record.wizard_responses,
            transcription: transcription || null,
          },
          brief_status: "completed",
          brief_completed_at: new Date().toISOString(),
          research_generated_at: new Date().toISOString(),
          business_type: "product_service",
        })
        .select("id")
        .single();

      if (productError) {
        console.error("[generate-product-dna] Error creating product:", productError.message);
      } else {
        productId = newProduct?.id || null;
        console.log(`[generate-product-dna] Product created: ${productId}`);
      }
    } catch (prodErr) {
      console.error("[generate-product-dna] Product creation failed (non-fatal):", prodErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        product_dna_id: productDnaId,
        product_id: productId,
        has_transcription: !!transcription,
        confidence_score: confidenceScore,
        sections: Object.keys(analysisResult),
        fallback_used: usedFallback,
        generation_error: generationErrorMsg,
        research_sources: {
          perplexity_chars: perplexityResearch.length,
          perplexity_citations: perplexityCitations.length,
          firecrawl_chars: firecrawlContext.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error procesando producto";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[generate-product-dna] Error:", message);
    console.error("[generate-product-dna] Stack:", stack);

    // Reset status to draft on failure
    if (productDnaId) {
      try {
        await supabase
          .from("product_dna")
          .update({ status: "draft" })
          .eq("id", productDnaId);
        console.log(`[generate-product-dna] Reset status to draft for: ${productDnaId}`);
      } catch (resetErr) {
        console.error("[generate-product-dna] Failed to reset status:", resetErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        debug: {
          productDnaId,
          errorType: error instanceof Error ? error.name : typeof error,
          timestamp: new Date().toISOString()
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function estimateComplexity(content: string, serviceTypes: string[]): string {
  const length = content.length;
  const typeCount = serviceTypes.length;
  if (length > 3000 && typeCount >= 3) return "enterprise";
  if (length > 2000 || typeCount >= 2) return "complex";
  if (length > 1000) return "moderate";
  return "simple";
}
