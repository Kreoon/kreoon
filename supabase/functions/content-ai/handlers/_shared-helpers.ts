import { callAIWithFallback } from "../../_shared/ai-providers.ts";
import { logAIUsage as sharedLogAIUsage } from "../../_shared/ai-usage-logger.ts";
import { MASTER_SCRIPT_PROMPT } from "../../_shared/prompts/scripts.ts";
import type { ContentAIRequest } from "./types.ts";

// Template variable definitions - all available placeholders
export const TEMPLATE_VARIABLES: Record<string, { description: string; category: string }> = {
  // Product variables
  '{producto_nombre}': { description: 'Nombre del producto', category: 'Producto' },
  '{producto_descripcion}': { description: 'Descripción detallada del producto', category: 'Producto' },
  '{producto_estrategia}': { description: 'Estrategia de marketing del producto', category: 'Producto' },
  '{producto_investigacion}': { description: 'Investigación de mercado', category: 'Producto' },
  '{producto_avatar}': { description: 'Avatar / Cliente ideal', category: 'Producto' },
  '{producto_angulos}': { description: 'Lista de ángulos de venta', category: 'Producto' },

  // Form/Script params variables
  '{cta}': { description: 'Llamado a la acción (CTA)', category: 'Formulario' },
  '{angulo_venta}': { description: 'Ángulo de venta seleccionado', category: 'Formulario' },
  '{cantidad_hooks}': { description: 'Cantidad de hooks solicitados', category: 'Formulario' },
  '{pais_objetivo}': { description: 'País objetivo del contenido', category: 'Formulario' },
  '{estructura_narrativa}': { description: 'Estructura narrativa seleccionada', category: 'Formulario' },
  '{avatar_ideal}': { description: 'Avatar ideal del formulario', category: 'Formulario' },
  '{estrategias_video}': { description: 'Estrategias/estructuras de video', category: 'Formulario' },
  '{transcripcion_referencia}': { description: 'Transcripción de video de referencia', category: 'Formulario' },
  '{hooks_sugeridos}': { description: 'Lista de hooks sugeridos por el usuario', category: 'Formulario' },
  '{instrucciones_adicionales}': { description: 'Instrucciones adicionales del usuario', category: 'Formulario' },

  // Document variables
  '{documento_brief}': { description: 'Contenido del brief del producto', category: 'Documentos' },
  '{documento_onboarding}': { description: 'Contenido del onboarding', category: 'Documentos' },
  '{documento_research}': { description: 'Contenido del research/investigación', category: 'Documentos' },
};

// Replace template variables in prompts
export function replaceTemplateVariables(
  text: string,
  product?: ContentAIRequest['product'],
  scriptParams?: any,
  documents?: { brief?: string; onboarding?: string; research?: string }
): string {
  if (!text) return text;

  let result = text;

  // Product variables
  result = result.replace(/\{producto_nombre\}/gi, product?.name || '');
  result = result.replace(/\{producto_descripcion\}/gi, product?.description || '');
  result = result.replace(/\{producto_estrategia\}/gi, product?.strategy || '');
  result = result.replace(/\{producto_investigacion\}/gi, product?.market_research || '');
  result = result.replace(/\{producto_avatar\}/gi, product?.ideal_avatar || '');
  result = result.replace(/\{producto_angulos\}/gi,
    product?.sales_angles?.map((a, i) => `${i + 1}. ${a}`).join('\n') || ''
  );

  // Form/Script params variables
  result = result.replace(/\{cta\}/gi, scriptParams?.cta || '');
  result = result.replace(/\{angulo_venta\}/gi, scriptParams?.sales_angle || '');
  result = result.replace(/\{cantidad_hooks\}/gi, scriptParams?.hooks_count || '');
  result = result.replace(/\{pais_objetivo\}/gi, scriptParams?.target_country || '');
  result = result.replace(/\{estructura_narrativa\}/gi, scriptParams?.narrative_structure || '');
  result = result.replace(/\{avatar_ideal\}/gi, scriptParams?.ideal_avatar || product?.ideal_avatar || '');
  result = result.replace(/\{estrategias_video\}/gi, scriptParams?.video_strategies || '');
  result = result.replace(/\{transcripcion_referencia\}/gi, scriptParams?.reference_transcription || '');
  result = result.replace(/\{hooks_sugeridos\}/gi,
    Array.isArray(scriptParams?.hooks) ? scriptParams.hooks.join('\n') : ''
  );
  result = result.replace(/\{instrucciones_adicionales\}/gi, scriptParams?.additional_instructions || '');

  // Document variables
  result = result.replace(/\{documento_brief\}/gi, documents?.brief || '');
  result = result.replace(/\{documento_onboarding\}/gi, documents?.onboarding || '');
  result = result.replace(/\{documento_research\}/gi, documents?.research || '');

  return result;
}

// Build product context for AI prompts (legacy support)
export function buildProductContext(product?: ContentAIRequest['product']): string {
  if (!product) return "";

  const sections: string[] = [];

  sections.push("📦 INFORMACIÓN COMPLETA DEL PRODUCTO:");

  if (product.name) {
    sections.push(`\n🏷️ NOMBRE: ${product.name}`);
  }

  if (product.description) {
    sections.push(`\n📝 DESCRIPCIÓN:\n${product.description}`);
  }

  if (product.strategy) {
    sections.push(`\n🎯 ESTRATEGIA DE PRODUCTO:\n${product.strategy}`);
  }

  if (product.market_research) {
    sections.push(`\n📊 INVESTIGACIÓN DE MERCADO:\n${product.market_research}`);
  }

  if (product.ideal_avatar) {
    sections.push(`\n👤 AVATAR / CLIENTE IDEAL:\n${product.ideal_avatar}`);
  }

  if (product.sales_angles && product.sales_angles.length > 0) {
    sections.push(`\n💡 ÁNGULOS DE VENTA DISPONIBLES:\n${product.sales_angles.map((a, i) => `${i + 1}. ${a}`).join('\n')}`);
  }

  return sections.join('\n');
}

// Map action to module key
export const ACTION_TO_MODULE: Record<string, string> = {
  generate_script: "scripts",
  research_and_generate: "scripts",
  generate_with_skills: "scripts",
  analyze_content: "content_detail",
  chat: "content_detail",
  improve_script: "scripts",
};

// Get all available fallback providers (excludes primary)
export function getAllAvailableFallbacks(primaryProvider: string): Array<{ provider: string; model: string; apiKey: string }> {
  const fallbacks: Array<{ provider: string; model: string; apiKey: string }> = [];

  const providers: Array<{ key: string; envVar: string; model: string }> = [
    { key: "gemini", envVar: "GOOGLE_AI_API_KEY", model: "gemini-2.5-flash" },
    { key: "openai", envVar: "OPENAI_API_KEY", model: "gpt-4o-mini" },
    { key: "anthropic", envVar: "ANTHROPIC_API_KEY", model: "claude-sonnet-4-20250514" },
  ];

  for (const p of providers) {
    if (p.key !== primaryProvider) {
      const apiKey = Deno.env.get(p.envVar);
      if (apiKey) {
        fallbacks.push({ provider: p.key, model: p.model, apiKey });
      }
    }
  }

  return fallbacks;
}

// Log AI usage via shared logger; returns execution id for feedback loop
export async function logAIUsage(supabase: any, params: {
  organizationId: string;
  userId: string;
  provider: string;
  model: string;
  action: string;
  success: boolean;
  errorMessage?: string;
  tokens_input?: number;
  tokens_output?: number;
  response_time_ms?: number;
}): Promise<string | null> {
  return sharedLogAIUsage(supabase, {
    organization_id: params.organizationId,
    user_id: params.userId,
    module: "content-ai",
    action: params.action,
    provider: params.provider,
    model: params.model,
    tokens_input: params.tokens_input || 0,
    tokens_output: params.tokens_output || 0,
    success: params.success,
    error_message: params.errorMessage,
    edge_function: "content-ai",
    response_time_ms: params.response_time_ms,
  });
}

// Usa prompt maestro centralizado desde _shared/prompts/scripts.ts
export const SYSTEM_PROMPTS = {
  generate_script: MASTER_SCRIPT_PROMPT,

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

// ============= IMPROVED HTML BLOCK FORMAT =============
export const BLOCK_FORMAT_INSTRUCTIONS = `
🎨 FORMATO DE BLOQUES HTML (OBLIGATORIO):

Estructura cada bloque con estas clases CSS para mejor organización:

<div class="script-block" data-type="{tipo}">
  <div class="block-header">
    <h2 class="block-title">{Emoji} {Título del Bloque}</h2>
    <span class="block-badge">{Tipo}</span>
  </div>
  <div class="block-content">
    {Contenido estructurado}
  </div>
</div>

TIPOS DE BLOQUE:
- hooks: Para los ganchos/hooks del video
- script: Para el guion principal
- visuals: Para indicaciones visuales
- audio: Para indicaciones de audio/música
- cta: Para el llamado a la acción
- notes: Para notas adicionales

ESTRUCTURA INTERNA:
- Usa <ul class="hook-list"> para listas de hooks
- Usa <div class="scene"> para separar escenas
- Usa <p class="dialogue"> para diálogos
- Usa <p class="action"> para acciones/visuales
- Usa <blockquote class="cta-text"> para el CTA destacado
- Usa <div class="timestamp">[00:00]</div> para marcas de tiempo

EJEMPLO:
<div class="script-block" data-type="hooks">
  <div class="block-header">
    <h2 class="block-title">🎣 HOOKS</h2>
    <span class="block-badge">Ganchos Iniciales</span>
  </div>
  <div class="block-content">
    <ul class="hook-list">
      <li><strong>Hook 1:</strong> "¿Sabías que el 80% de las personas...?"</li>
      <li><strong>Hook 2:</strong> "Esto me cambió la vida..."</li>
    </ul>
  </div>
</div>
`;

// Helper function to sleep for a given number of milliseconds
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Wrapper para content-ai que usa callAIWithFallback del shared */
export async function callAI(
  provider: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  fallbacks?: Array<{ provider: string; model: string; apiKey: string }>
): Promise<string> {
  const configs = [
    { provider, model, apiKey },
    ...(fallbacks || []),
  ];
  console.log("[content-ai] AI chain:", configs.map(c => `${c.provider}/${c.model}`).join(" → "));
  const { result } = await callAIWithFallback(configs, systemPrompt, userPrompt);
  return typeof result === "string" ? result : String(result ?? "");
}

// Genera el bloque HTML para cada rol - Nueva estructura 4 bloques
// OPTIMIZADO: Prompts concisos con instrucciones de completar TODO
export function getGenerationTypePrompt(generation_type?: string, customRolePrompts?: any): string {
  // Prompts específicos para la nueva estructura de 4 bloques
  const NEW_BLOCK_PROMPTS: Record<string, string> = {
    script: `🎬 GUIÓN TELEPROMPTER UGC

⚠️ OBLIGATORIO: Genera el guión COMPLETO. NO te detengas hasta terminar TODAS las escenas incluyendo el CTA final.

FORMATO HTML requerido:
<h2>🎥 GUION DE VIDEO UGC</h2>
<h3>Fase ENGANCHAR</h3>
[Escenas 1A, 1B, 1C - Hooks alternativos]

<h3>Fase DESARROLLO</h3>
[Escenas 2, 3 - Problema y agitación]

<h3>Fase SOLUCIÓN</h3>
[Escenas 4, 5 - Producto como solución]

<h3>Fase CTA</h3>
[Escena final con llamado a la acción]

<h3>📝 NOTAS PARA EL CREADOR</h3>
[Vestuario, props, locación, tips]

Cada escena debe tener: Número, Tiempo, Acción visual, Diálogo exacto.
Genera EXACTAMENTE la cantidad de hooks solicitada (1A, 1B, 1C, etc.).
COMPLETA TODO EL GUIÓN hasta la última escena.`,

    director: `🎥 TABLA DE PRODUCCIÓN - DIRECTOR

⚠️ OBLIGATORIO: Genera la tabla COMPLETA para TODAS las escenas del guión.

FORMATO HTML requerido:
<h2>🎬 TABLA DE PRODUCCIÓN</h2>
<table>
<tr><th>#</th><th>ESCENA</th><th>PLANO</th><th>ÁNGULO</th><th>LUZ</th><th>AUDIO</th><th>NOTAS</th></tr>
[Una fila por CADA escena del guión: 1A, 1B, 1C, 2, 3, 4, CTA]
</table>

<h3>📋 CHECKLIST PRE-PRODUCCIÓN</h3>
<h3>🎬 EQUIPO NECESARIO</h3>
<h3>⏱️ TIEMPO ESTIMADO</h3>

Planos: PP (primer plano), PM (plano medio), PE (plano entero), PD (detalle)
COMPLETA TODAS las escenas sin omitir ninguna.`,

    marketing: `📊 ESTRATEGIA DE MARKETING Y PAUTA

⚠️ OBLIGATORIO: Genera las 3 tablas COMPLETAS.

FORMATO HTML:
<h2>📊 ESTRATEGIA DE MARKETING</h2>

<h3>🎯 SEGMENTACIÓN</h3>
<table>
<tr><th>Audiencia</th><th>Intereses</th><th>Comportamiento</th><th>Exclusiones</th></tr>
<tr><td>Cold</td><td>...</td><td>...</td><td>...</td></tr>
<tr><td>Warm</td><td>...</td><td>...</td><td>...</td></tr>
<tr><td>Hot</td><td>...</td><td>...</td><td>...</td></tr>
</table>

<h3>✍️ COPIES PARA ADS</h3>
<table>
<tr><th>Variante</th><th>Primary Text</th><th>Headline</th><th>Description</th></tr>
[3-4 variantes completas]
</table>

<h3>📱 DISTRIBUCIÓN</h3>
<table>
<tr><th>Plataforma</th><th>Formato</th><th>Budget %</th><th>Objetivo</th></tr>
[Meta, TikTok, YouTube Shorts]
</table>

<h3>📈 KPIs Y RECOMENDACIONES</h3>
COMPLETA todas las secciones.`,

    captions: `📱 CAPTIONS PARA REDES SOCIALES

⚠️ OBLIGATORIO: Genera los 4 captions COMPLETOS con todos sus elementos.

FORMATO HTML:
<h2>📱 CAPTIONS GENERADOS</h2>

<h3>📱 ORGÁNICO #1: Hook + Storytelling</h3>
[Caption completo 150-200 caracteres + 8-10 hashtags relevantes]

<h3>📱 ORGÁNICO #2: Trend/Humor</h3>
[Caption completo con referencia cultural + hashtags trending]

<h3>💰 ADS #1: Conversión Directa</h3>
[Caption con beneficio + CTA claro, SIN hashtags]

<h3>💰 ADS #2: FOMO/Urgencia</h3>
[Caption con escasez/urgencia + CTA, SIN hashtags]

Cada caption debe incluir: emoji al inicio, texto completo, hashtags (solo orgánicos).
COMPLETA los 4 captions sin truncar ninguno.`,

    broll: `🎬 IDEAS DE B-ROLL

⚠️ OBLIGATORIO: Genera las tablas COMPLETAS con 10-14 B-Rolls totales.

FORMATO HTML (usa color:#1f2937 en todas las celdas):
<h2 style="color:#1a1a1a;">🎬 IDEAS DE B-ROLL</h2>

<h3 style="color:#059669;">📋 B-ROLLS ESENCIALES (6-8 tomas)</h3>
<table style="width:100%; border-collapse:collapse;">
<tr style="background:#d1fae5;"><th style="color:#065f46;">#</th><th style="color:#065f46;">TOMA</th><th style="color:#065f46;">ESCENA</th><th style="color:#065f46;">QUÉ FILMAR</th><th style="color:#065f46;">PLANO</th><th style="color:#065f46;">DUR</th></tr>
[6-8 filas con descripciones MUY específicas, color:#1f2937 en cada td]
</table>

<h3 style="color:#f59e0b;">⭐ B-ROLLS OPCIONALES (4-6 tomas)</h3>
<table>[4-6 filas adicionales]</table>

<h3 style="color:#3b82f6;">🎯 SECUENCIA DE GRABACIÓN</h3>
[Setup 1: Cenital, Setup 2: Lateral, Setup 3: En uso]

<h3 style="color:#8b5cf6;">💡 TIPS</h3>
[Iluminación, Configuración, Cantidad]

Cada B-Roll debe ser ESPECÍFICO ("Close-up de pipeta dispensando 3 gotas sobre la palma").
COMPLETA todas las secciones.`,
  };

  // Si hay prompts personalizados de la organización, usarlos
  if (customRolePrompts) {
    const customPrompt = customRolePrompts[generation_type || "script"];
    if (customPrompt) return customPrompt;
  }

  // Usar los nuevos prompts para la estructura de 4 bloques
  if (generation_type && NEW_BLOCK_PROMPTS[generation_type]) {
    return NEW_BLOCK_PROMPTS[generation_type];
  }

  // Fallback para tipos legacy
  switch (generation_type) {
    case "editor":
      return `📦 GENERANDO: BLOQUE EDITOR ✂️ - Pensado para edición fluida y rápida.`;
    case "strategist":
      return `📦 GENERANDO: BLOQUE ESTRATEGA ♟️ - Pensamiento de fondo y estrategia.`;
    case "trafficker":
      return `📦 GENERANDO: BLOQUE TRAFFICKER 📊 - Pensado para escalar en pauta.`;
    case "designer":
      return `📦 GENERANDO: BLOQUE DISEÑADOR 🎨 - Guía visual clara.`;
    case "admin":
      return `📦 GENERANDO: BLOQUE ADMIN / PROJECT MANAGER 📅 - Control y ejecución.`;
    default:
      return NEW_BLOCK_PROMPTS.script;
  }
}

// Get custom prompts from organization
export async function getOrganizationPrompts(supabase: any, organizationId: string) {
  try {
    const { data } = await supabase
      .from("organization_ai_prompts")
      .select("prompt_config, is_active")
      .eq("organization_id", organizationId)
      .eq("module_key", "scripts")
      .eq("is_active", true)
      .maybeSingle();

    if (data?.prompt_config && data.is_active) {
      return data.prompt_config;
    }
  } catch (e) {
    console.error("Error fetching organization prompts:", e);
  }
  return null;
}
