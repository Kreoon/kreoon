import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentAIRequest {
  action: "generate_script" | "analyze_content" | "chat" | "improve_script";
  ai_provider?: "lovable" | "openai" | "anthropic";
  ai_model?: string;
  data?: {
    client_name?: string;
    product?: string;
    objective?: string;
    duration?: string;
    tone?: string;
    script?: string;
    video_url?: string;
    messages?: Array<{ role: string; content: string }>;
    original_script?: string;
    feedback?: string;
  };
  prompt?: string;
  product?: any;
  script_params?: any;
  generation_type?: string;
}

// AI Provider configurations
type AIProvider = "lovable" | "openai" | "anthropic";

interface AIConfig {
  url: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  getBody: (model: string, systemPrompt: string, userPrompt: string) => any;
  extractContent: (data: any) => string;
}

const AI_PROVIDERS: Record<AIProvider, AIConfig> = {
  lovable: {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    getHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model, systemPrompt, userPrompt) => ({
      model: model || "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "",
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    getHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model, systemPrompt, userPrompt) => ({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "",
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    getHeaders: (apiKey) => ({
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    }),
    getBody: (model, systemPrompt, userPrompt) => ({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
    extractContent: (data) => data.content?.[0]?.text || "",
  },
};

// PROMPT MAESTRO - Sistema de generación de guiones profesionales
const MASTER_SYSTEM_PROMPT = `🎯 ROL DEL SISTEMA

Actúa como un estratega digital senior experto en UGC, storytelling, performance ads y producción de contenido, trabajando para marcas que buscan resultados reales.

Tu tarea NO es solo escribir guiones, sino pensar estratégicamente, estructurar el mensaje y entregar un guion listo para producción, claro para todos los roles del equipo.

⚠️ Reglas clave:
- Cada proyecto genera 1 SOLO GUION completo
- La cantidad de hooks debe respetar EXACTAMENTE el valor configurado por el usuario
- El guion debe alinearse al objetivo del producto y de la marca, no ser genérico
- Usa las expresiones y modismos del país objetivo cuando sea apropiado

⚙️ PASO 1 – AUTO-PROMPTING (OBLIGATORIO)
Antes de generar el guion final, construye internamente tu propio prompt de trabajo, asegurando:
- Claridad del objetivo del video
- Fase del embudo
- Ángulo principal
- Emoción a activar
- Tipo de contenido (UGC orgánico / Ads / Híbrido)

👉 Este prompt interno NO se muestra al usuario, solo se usa para mejorar la calidad del resultado.

🎨 REGLAS DE FORMATO VISUAL (MUY IMPORTANTE):
- Devuelve SOLO HTML (sin Markdown, sin backticks, sin texto fuera de etiquetas)
- Usa HTML semántico: <h2>, <h3>, <h4>, <p>, <ul>, <li>, <strong>, <em>
- Usar <strong> para ideas clave y frases importantes
- Usar <em> para intención emocional o tono
- Usar <u> SOLO para CTAs o frases accionables
- Emojis: máximo 1–2 por bloque, solo como guía visual (🎯🔥🚀🎥)
- Espaciado amplio entre secciones (cada bloque debe ser claro)
- Párrafos cortos (máx. 2–3 líneas por bloque)
- NO mostrar markdown crudo (##, **, \`\`\`)
- NO usar caracteres especiales innecesarios
- El resultado debe verse como una guía profesional lista para producción`;

const SYSTEM_PROMPTS = {
  generate_script: MASTER_SYSTEM_PROMPT,
  
  analyze_content: `Eres un experto en análisis de contenido de video y marketing digital.
Tu trabajo es analizar guiones y videos para dar feedback constructivo y específico.

Evalúa:
1. Enganche inicial (¿Captura atención en los primeros 3 segundos?)
2. Estructura narrativa
3. Claridad del mensaje
4. Llamada a la acción
5. Potencial viral
6. Áreas de mejora

Sé específico y da ejemplos concretos de cómo mejorar.`,

  chat: `Eres un asistente experto en producción de contenido de video y marketing digital.
Ayudas al equipo de Creartor Studio con:
- Ideas creativas para videos
- Estrategias de contenido
- Mejores prácticas de redes sociales
- Optimización de guiones
- Consejos de producción

Responde de manera profesional pero amigable, en español.`,

  improve_script: `Eres un editor experto de guiones para contenido de video.
Tu tarea es mejorar guiones existentes basándote en el feedback proporcionado.
Mantén la esencia del mensaje original mientras optimizas:
- Claridad
- Engagement
- Estructura
- Impacto emocional

Devuelve el guion mejorado en formato HTML estructurado.`,
};

function getApiKey(provider: AIProvider): string {
  switch (provider) {
    case "lovable":
      return Deno.env.get("LOVABLE_API_KEY") || "";
    case "openai":
      return Deno.env.get("OPENAI_API_KEY") || "";
    case "anthropic":
      return Deno.env.get("ANTHROPIC_API_KEY") || "";
    default:
      return "";
  }
}

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  provider: AIProvider = "lovable",
  model?: string
): Promise<string> {
  const apiKey = getApiKey(provider);

  if (!apiKey) {
    throw new Error(`API key for ${provider} not configured`);
  }

  const config = AI_PROVIDERS[provider];

  console.log(`Calling AI provider: ${provider}, model: ${model || "default"}`);

  const response = await fetch(config.url, {
    method: "POST",
    headers: config.getHeaders(apiKey),
    body: JSON.stringify(config.getBody(model || "", systemPrompt, userPrompt)),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded");
    }
    if (response.status === 402) {
      throw new Error("Payment required");
    }
    const errorText = await response.text();
    console.error(`AI Error (${provider}):`, errorText);
    throw new Error(`AI request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return config.extractContent(data);
}

// Genera el bloque HTML para cada rol
function getGenerationTypePrompt(generation_type?: string): string {
  switch (generation_type) {
    case "editor":
      return `
📦 GENERANDO: BLOQUE EDITOR ✂️
Pensado para edición fluida y rápida.

Devuelve HTML con esta estructura:

<div class="script-block editor-block">
  <h2>🎬 BLOQUE EDITOR ✂️</h2>
  
  <h3>📝 Notas Generales de Edición</h3>
  <ul>
    <li><strong>Ritmo general:</strong> [Dinámico/Lento/Variable...]</li>
    <li><strong>Duración objetivo:</strong> [XX segundos]</li>
    <li><strong>Estilo de corte:</strong> [Jump cuts/Transiciones suaves/...]</li>
    <li><strong>Energía:</strong> [Alta/Media/Baja]</li>
  </ul>
  
  <h3>🎥 Storyboard (4-6 Escenas)</h3>
  
  <h4>Escena 1 - Hook</h4>
  <ul>
    <li><strong>Tipo de plano:</strong> [Primer plano/Plano medio/...]</li>
    <li><strong>Movimiento de cámara:</strong> [Estático/Zoom in/Pan/...]</li>
    <li><strong>Elementos visuales:</strong> [Texto overlay, producto, persona...]</li>
    <li><strong>Emoción:</strong> [Sorpresa/Curiosidad/Urgencia/...]</li>
    <li><strong>Duración:</strong> [X segundos]</li>
  </ul>
  
  [Repetir para cada escena...]
  
  <h3>🎵 Música y Ambientación</h3>
  <ul>
    <li><strong>Género sugerido:</strong> [Trending TikTok/Lo-fi/Épico/...]</li>
    <li><strong>Momento de cambio musical:</strong> [En el desarrollo/CTA/...]</li>
    <li><strong>Efectos de sonido:</strong> [Whoosh, ding, pop...]</li>
  </ul>
  
  <h3>✨ Subtítulos y Efectos</h3>
  <ul>
    <li><strong>Estilo de subtítulos:</strong> [Bold centered/Karaoke/Minimal/...]</li>
    <li><strong>Color principal:</strong> [Blanco con sombra/Amarillo/...]</li>
    <li><strong>Efectos especiales:</strong> [Zoom en palabras clave/Shake/...]</li>
    <li><strong>Filtro/Color grading:</strong> [Cálido/Frío/Alto contraste/...]</li>
  </ul>
</div>`;

    case "strategist":
      return `
📦 GENERANDO: BLOQUE ESTRATEGA ♟️
Pensamiento de fondo y estrategia.

Devuelve HTML con esta estructura:

<div class="script-block strategist-block">
  <h2>🧠 BLOQUE ESTRATEGA ♟️</h2>
  
  <h3>📊 Análisis del Embudo</h3>
  <ul>
    <li><strong>Fase del embudo:</strong> [TOFU/MOFU/BOFU]</li>
    <li><strong>Objetivo estratégico:</strong> [Awareness/Consideración/Conversión]</li>
    <li><strong>Tipo de contenido:</strong> [UGC orgánico/Ads/Híbrido]</li>
  </ul>
  
  <h3>🎯 Hipótesis del Mensaje</h3>
  <p><em>[Describe la hipótesis principal que se está testeando con este video]</em></p>
  
  <h3>💡 Insight Principal</h3>
  <p><strong>[Insight emocional o racional que conecta con el avatar]</strong></p>
  
  <h3>📈 Métricas de Éxito</h3>
  <ul>
    <li><strong>Métrica primaria:</strong> [Retención 3s / CTR / Conversiones]</li>
    <li><strong>Métrica secundaria:</strong> [Engagement / Saves / Shares]</li>
    <li><strong>Benchmark esperado:</strong> [X%]</li>
  </ul>
  
  <h3>📅 Recomendación de Publicación</h3>
  <ul>
    <li><strong>Mejor horario:</strong> [Día y hora sugeridos]</li>
    <li><strong>Plataforma primaria:</strong> [TikTok/Instagram/YouTube]</li>
  </ul>
  
  <h3>#️⃣ Hashtags Sugeridos</h3>
  <p>[#hashtag1 #hashtag2 #hashtag3 ...]</p>
  
  <h3>📝 Caption Sugerido</h3>
  <p><em>[Caption optimizado para engagement]</em></p>
  
  <h3>🔄 Contenido Complementario</h3>
  <p>[Sugerencia de contenido que puede acompañar o seguir a este video]</p>
</div>`;

    case "trafficker":
      return `
📦 GENERANDO: BLOQUE TRAFFICKER 📊
Pensado para escalar en pauta.

Devuelve HTML con esta estructura:

<div class="script-block trafficker-block">
  <h2>💰 BLOQUE TRAFFICKER 📊</h2>
  
  <h3>🎯 Estrategia de Campaña</h3>
  <ul>
    <li><strong>Ángulo de venta principal:</strong> [Dolor/Beneficio/Social proof/...]</li>
    <li><strong>Objetivo de campaña:</strong> [Conversiones/Tráfico/Alcance]</li>
    <li><strong>Formato recomendado:</strong> [Video vertical 9:16 / Carrusel / ...]</li>
  </ul>
  
  <h3>👥 Público Objetivo</h3>
  <ul>
    <li><strong>Segmento primario:</strong> [Descripción del avatar]</li>
    <li><strong>Intereses:</strong> [Lista de intereses para segmentación]</li>
    <li><strong>Comportamientos:</strong> [Compradores online, viajeros, etc.]</li>
  </ul>
  
  <h3>📢 CTA Publicitario Principal</h3>
  <p><strong><u>"[CTA principal para ads]"</u></strong></p>
  
  <h3>🔥 Variaciones de Hooks + Copy Corto (3 versiones)</h3>
  
  <h4>Versión A - Emocional</h4>
  <p><strong>Hook:</strong> "[Hook emocional]"</p>
  <p><strong>Copy:</strong> [Copy corto emocional]</p>
  
  <h4>Versión B - Racional</h4>
  <p><strong>Hook:</strong> "[Hook con datos/lógica]"</p>
  <p><strong>Copy:</strong> [Copy corto racional]</p>
  
  <h4>Versión C - Urgencia</h4>
  <p><strong>Hook:</strong> "[Hook con urgencia/escasez]"</p>
  <p><strong>Copy:</strong> [Copy corto con urgencia]</p>
  
  <h3>📄 Copies Largos (4 versiones)</h3>
  
  <h4>Copy Emocional</h4>
  <p>[Copy largo enfocado en emociones y conexión]</p>
  
  <h4>Copy Educativo</h4>
  <p>[Copy largo con información y valor]</p>
  
  <h4>Copy Storytelling</h4>
  <p>[Copy largo con historia/testimonio]</p>
  
  <h4>Copy Directo</h4>
  <p>[Copy largo directo a la oferta]</p>
  
  <h3>📊 KPIs a Medir</h3>
  <ul>
    <li><strong>CTR esperado:</strong> [X%]</li>
    <li><strong>Retención objetivo:</strong> [X% en 3s]</li>
    <li><strong>CPL/ROAS objetivo:</strong> [Valor]</li>
    <li><strong>Engagement rate:</strong> [X%]</li>
  </ul>
  
  <h3>💵 Presupuesto Sugerido</h3>
  <ul>
    <li><strong>Test inicial:</strong> [$X - $Y]</li>
    <li><strong>Escalar si:</strong> [Condiciones para escalar]</li>
  </ul>
</div>`;

    case "designer":
      return `
📦 GENERANDO: BLOQUE DISEÑADOR 🎨
Guía visual clara.

Devuelve HTML con esta estructura:

<div class="script-block designer-block">
  <h2>🎨 BLOQUE DISEÑADOR</h2>
  
  <h3>🖼️ Lineamiento Gráfico</h3>
  <ul>
    <li><strong>Paleta de colores:</strong> [Colores principales y secundarios]</li>
    <li><strong>Tipografía:</strong> [Fuentes sugeridas]</li>
    <li><strong>Estilo visual:</strong> [Minimalista/Bold/Orgánico/...]</li>
  </ul>
  
  <h3>📱 Look & Feel UGC</h3>
  <p>[Descripción del estilo visual general que debe tener el contenido]</p>
  
  <h3>🔧 Elementos Reutilizables</h3>
  <ul>
    <li>[Elemento 1 - descripción]</li>
    <li>[Elemento 2 - descripción]</li>
    <li>[Elemento 3 - descripción]</li>
  </ul>
  
  <h3>🏷️ Branding en Pantalla</h3>
  <ul>
    <li><strong>Logo:</strong> [Cuándo y dónde aparece]</li>
    <li><strong>Colores de marca:</strong> [Uso sugerido]</li>
    <li><strong>Watermark:</strong> [Sí/No, ubicación]</li>
  </ul>
  
  <h3>📐 Jerarquía Visual</h3>
  <ul>
    <li><strong>Elemento principal:</strong> [Qué debe destacar más]</li>
    <li><strong>Elemento secundario:</strong> [Segundo nivel de importancia]</li>
    <li><strong>Elemento de apoyo:</strong> [Detalles menores]</li>
  </ul>
  
  <h3>📍 Ubicación del CTA Visual</h3>
  <p>[Dónde y cómo debe aparecer el CTA visualmente]</p>
</div>`;

    case "admin":
      return `
📦 GENERANDO: BLOQUE ADMIN / PROJECT MANAGER 📅
Control y ejecución.

Devuelve HTML con esta estructura:

<div class="script-block admin-block">
  <h2>📋 BLOQUE ADMIN / PROJECT MANAGER 📅</h2>
  
  <h3>📅 Cronograma Sugerido</h3>
  <ul>
    <li><strong>Día 1:</strong> [Tarea - Responsable]</li>
    <li><strong>Día 2:</strong> [Tarea - Responsable]</li>
    <li><strong>Día 3:</strong> [Tarea - Responsable]</li>
    <li><strong>Día 4:</strong> [Tarea - Responsable]</li>
    <li><strong>Día 5:</strong> [Entrega final]</li>
  </ul>
  
  <h3>👥 Responsables</h3>
  <ul>
    <li><strong>Creador:</strong> [Tareas específicas]</li>
    <li><strong>Editor:</strong> [Tareas específicas]</li>
    <li><strong>Estratega:</strong> [Tareas específicas]</li>
    <li><strong>Trafficker:</strong> [Tareas específicas]</li>
  </ul>
  
  <h3>📦 Entregables</h3>
  <ul>
    <li>☐ [Entregable 1]</li>
    <li>☐ [Entregable 2]</li>
    <li>☐ [Entregable 3]</li>
    <li>☐ [Entregable 4]</li>
  </ul>
  
  <h3>📆 Fecha Estimada de Entrega</h3>
  <p><strong>[Fecha sugerida basada en el cronograma]</strong></p>
  
  <h3>✅ Checklist de Revisión</h3>
  <ul>
    <li>☐ Hook validado por estratega</li>
    <li>☐ Grabación completa del creador</li>
    <li>☐ Primera versión de edición</li>
    <li>☐ Revisión de correcciones</li>
    <li>☐ Aprobación final</li>
    <li>☐ Assets de pauta listos</li>
    <li>☐ Programación de publicación</li>
  </ul>
</div>`;

    default:
      // Script completo para el CREADOR
      return `
📦 GENERANDO: BLOQUE CREADOR 🎥
Contenido claro para quien graba.

Devuelve HTML con esta estructura COMPLETA:

<div class="script-block creator-block">
  <h2>🧍‍♂️ BLOQUE CREADOR 🎥</h2>
  
  <h3>📋 Información del Video</h3>
  <ul>
    <li><strong>Título del video:</strong> [Título descriptivo]</li>
    <li><strong>Objetivo del video:</strong> [Qué debe lograr este contenido]</li>
    <li><strong>Duración sugerida:</strong> [XX-XX segundos]</li>
    <li><strong>Formato:</strong> [9:16 / 1:1 / 16:9]</li>
  </ul>
  
  <h3>👤 Avatar del Público</h3>
  <p>[Descripción del público objetivo al que le hablas]</p>
  
  <h3>🎭 Perfil de Quien Graba</h3>
  <ul>
    <li><strong>Tono de voz:</strong> [Cercano/Profesional/Energético/...]</li>
    <li><strong>Energía:</strong> [Alta/Media/Relajada]</li>
    <li><strong>Entorno sugerido:</strong> [Casa/Oficina/Exterior/...]</li>
    <li><strong>Outfit sugerido:</strong> [Casual/Formal/Deportivo/...]</li>
  </ul>
  
  <h3>🎯 Tono de Comunicación</h3>
  <p><em>[Ej: Cercano, tipo chisme / Educativo y claro / Inspirador y motivacional]</em></p>
  
  <h3>🔥 HOOKS</h3>
  <p><em>Los hooks están pensados como scroll stoppers, no frases genéricas.</em></p>
  
  <h4>Hook A</h4>
  <p><em>[Indicación de tono y energía]</em></p>
  <p><strong>"[Texto exacto del hook]"</strong></p>
  
  <h4>Hook B</h4>
  <p><em>[Indicación de tono y energía]</em></p>
  <p><strong>"[Texto exacto del hook]"</strong></p>
  
  <h4>Hook C</h4>
  <p><em>[Indicación de tono y energía]</em></p>
  <p><strong>"[Texto exacto del hook]"</strong></p>
  
  [Agregar más hooks según la cantidad configurada...]
  
  <h3>🎬 Guión Formato Director</h3>
  <p><em>Describe qué se ve, qué emoción transmitir, ritmo y energía por momento.</em></p>
  
  <h4>Apertura (0-3s)</h4>
  <p><strong>Visual:</strong> [Lo que se ve en cámara]</p>
  <p><strong>Emoción:</strong> [Lo que debe transmitir]</p>
  <p><strong>Ritmo:</strong> [Rápido/Medio/Lento]</p>
  
  <h4>Desarrollo (3-40s)</h4>
  <p><strong>Visual:</strong> [Lo que se ve en cámara]</p>
  <p><strong>Emoción:</strong> [Lo que debe transmitir]</p>
  <p><strong>Ritmo:</strong> [Rápido/Medio/Lento]</p>
  
  <h4>Cierre (40-60s)</h4>
  <p><strong>Visual:</strong> [Lo que se ve en cámara]</p>
  <p><strong>Emoción:</strong> [Lo que debe transmitir]</p>
  <p><strong>Ritmo:</strong> [Rápido/Medio/Lento]</p>
  
  <h3>🎙️ Guión para Teleprompter</h3>
  <p><em>Texto hablado, natural, conversacional, sin lenguaje publicitario forzado.</em></p>
  
  <div class="teleprompter-text">
    <p>[Texto completo que debe decir el creador, con pausas naturales indicadas con "..."]</p>
  </div>
  
  <h3>👉 CTA Sugerido</h3>
  
  <h4>Para Orgánico:</h4>
  <p><strong><u>"[CTA natural para contenido orgánico]"</u></strong></p>
  
  <h4>Para Ads:</h4>
  <p><strong><u>"[CTA directo para publicidad]"</u></strong></p>
</div>`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ContentAIRequest = await req.json();
    const { 
      action, 
      data, 
      prompt, 
      product, 
      script_params,
      ai_provider = "lovable",
      ai_model,
      generation_type
    } = body;

    console.log("Content AI Request:", { action, ai_provider, ai_model, generation_type });

    let result: string;

    switch (action) {
      case "generate_script": {
        // New strategist form script generation
        if (prompt && product) {
          const roleSpecificPrompt = getGenerationTypePrompt(generation_type);
          
          const fullSystemPrompt = `${MASTER_SYSTEM_PROMPT}

${roleSpecificPrompt}

IMPORTANTE:
- Analiza toda la información del producto proporcionada
- La cantidad de hooks debe ser EXACTAMENTE la que se indica en el prompt del usuario
- Usa expresiones y modismos del país objetivo cuando sea apropiado
- El resultado debe ser HTML limpio, sin markdown, listo para renderizar`;

          result = await callAI(fullSystemPrompt, prompt, ai_provider as AIProvider, ai_model);

          return new Response(
            JSON.stringify({ success: true, script: result }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Legacy format
        const legacyPrompt = `Genera un guion de video para:

CLIENTE: ${data?.client_name || "Cliente"}
PRODUCTO/SERVICIO: ${data?.product || "Producto"}
OBJETIVO: ${data?.objective || "Generar awareness"}
DURACIÓN: ${data?.duration || "60 segundos"}
TONO: ${data?.tone || "Profesional y dinámico"}

Genera un guion completo con timestamps, descripciones visuales y sugerencias de audio.`;

        result = await callAI(SYSTEM_PROMPTS.generate_script, legacyPrompt, ai_provider as AIProvider, ai_model);
        break;
      }

      case "analyze_content": {
        const analyzePrompt = `Analiza el siguiente contenido y proporciona feedback detallado:

${data?.script ? `GUION:\n${data.script}` : ""}
${data?.video_url ? `VIDEO URL: ${data.video_url}` : ""}

Proporciona un análisis completo con puntuación del 1-10 para cada aspecto y sugerencias específicas de mejora.`;

        result = await callAI(SYSTEM_PROMPTS.analyze_content, analyzePrompt, ai_provider as AIProvider, ai_model);
        break;
      }

      case "chat": {
        if (!data?.messages || data.messages.length === 0) {
          throw new Error("Messages are required for chat");
        }

        const apiKey = getApiKey(ai_provider as AIProvider);
        if (!apiKey) {
          throw new Error(`API key for ${ai_provider} not configured`);
        }

        const config = AI_PROVIDERS[ai_provider as AIProvider];

        // For chat, we need to handle the messages array differently
        let chatBody: any;
        if (ai_provider === "anthropic") {
          chatBody = {
            model: ai_model || "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: SYSTEM_PROMPTS.chat,
            messages: data.messages,
          };
        } else {
          chatBody = {
            model: ai_model || (ai_provider === "openai" ? "gpt-4o" : "google/gemini-2.5-flash"),
            messages: [
              { role: "system", content: SYSTEM_PROMPTS.chat },
              ...data.messages,
            ],
          };
        }

        const response = await fetch(config.url, {
          method: "POST",
          headers: config.getHeaders(apiKey),
          body: JSON.stringify(chatBody),
        });

        if (!response.ok) {
          throw new Error(`AI request failed: ${response.status}`);
        }

        const aiData = await response.json();
        result = config.extractContent(aiData);
        break;
      }

      case "improve_script": {
        const improvePrompt = `Mejora el siguiente guion basándote en el feedback proporcionado:

GUION ORIGINAL:
${data?.original_script || ""}

FEEDBACK:
${data?.feedback || "Hazlo más dinámico y atractivo"}

Devuelve el guion mejorado manteniendo el formato HTML estructurado.`;

        result = await callAI(SYSTEM_PROMPTS.improve_script, improvePrompt, ai_provider as AIProvider, ai_model);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in content-ai function:", error);

    let status = 500;
    if (errorMessage.includes("Rate limit")) status = 429;
    if (errorMessage.includes("Payment required")) status = 402;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
