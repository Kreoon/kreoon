import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getModuleAIConfig } from "../_shared/get-module-ai-config.ts";
import {
  checkAndDeductTokens,
  corsHeaders,
  insufficientTokensResponse,
} from "../_shared/ai-token-guard.ts";

// ═══════════════════════════════════════════════════════════════
// Legacy support: Copy generation for "generate-copy-only" action
// ═══════════════════════════════════════════════════════════════

/** Copy angles for standalone copy generation */
const COPY_ANGLES = [
  "Enfócate en el BENEFICIO PRINCIPAL del producto. ¿Qué problema resuelve? ¿Qué resultado obtiene el consumidor?",
  "Enfócate en los INGREDIENTES o COMPONENTES clave del producto. ¿Qué lo hace especial o diferente de la competencia?",
  "Enfócate en la EXPERIENCIA del usuario. ¿Cómo se siente usar el producto? Apela a las emociones y al estilo de vida.",
];

function buildCopyPrompt(params: {
  name: string;
  description?: string;
  language: string;
  customization?: string;
  copyAngle?: string;
  researchContext?: string;
  researchVariables?: Record<string, string | undefined>;
  brandDNA?: Record<string, unknown>;
}): string {
  const { name, description, language, customization, copyAngle, researchContext, researchVariables, brandDNA } = params;
  const langMap: Record<string, string> = { es: "español", en: "inglés", pt: "portugués" };
  const lang = langMap[language] || "español";

  let prompt = `Eres un experto en marketing y copywriting publicitario. Crea copy para un banner publicitario.

ANÁLISIS (razona internamente):
- Producto: "${name}"
${description ? `- Descripción: "${description}"` : "- Sin descripción, analiza por el nombre."}
- Identifica: tipo de producto, ingredientes/componentes, para qué sirve, beneficios, público objetivo.`;

  if (researchContext) {
    prompt += `\n\nINVESTIGACIÓN DE MERCADO Y MARCA:\n${researchContext}`;
    prompt += `\n\nUSA esta investigación para crear copy ultra-relevante. Los dolores, deseos, ángulos de venta y avatares son REALES — basados en investigación profunda.`;
  }

  if (researchVariables) {
    const rv = researchVariables;
    const hasAny = Object.values(rv).some(Boolean);
    if (hasAny) {
      prompt += `\n\nVARIABLES SELECCIONADAS POR EL USUARIO (prioriza estos elementos ESPECÍFICOS):`;
      if (rv.selectedAvatar) prompt += `\nAVATAR OBJETIVO: ${rv.selectedAvatar}`;
      const angleOrHook = rv.selectedAngleOrHook || rv.selectedSalesAngle || rv.selectedHook;
      if (angleOrHook) prompt += `\nÁNGULO / HOOK: ${angleOrHook}`;
      if (rv.selectedPain) prompt += `\nDOLOR PRINCIPAL A ATACAR: ${rv.selectedPain}`;
      if (rv.selectedDesire) prompt += `\nDESEO A APELAR: ${rv.selectedDesire}`;
      if (rv.selectedObjection) prompt += `\nOBJECIÓN A ROMPER: ${rv.selectedObjection}`;
      if (rv.selectedJTBD) prompt += `\nJOB TO BE DONE: ${rv.selectedJTBD}`;
      prompt += `\n\nUsa estos elementos ESPECÍFICOS como base para el copy. El headline y body deben reflejar directamente estas selecciones.`;
    }
  }

  const adsTargeting = (brandDNA?.ads_targeting as Record<string, unknown>) || {};
  const hookSuggestions = adsTargeting.hook_suggestions as string[] | undefined;
  const adCopyAngles = adsTargeting.ad_copy_angles as string[] | undefined;

  if (hookSuggestions?.length) {
    prompt += `\n\nHOOKS SUGERIDOS POR INVESTIGACIÓN: ${hookSuggestions.join(', ')}`;
  }
  if (adCopyAngles?.length) {
    prompt += `\nÁNGULOS PUBLICITARIOS: ${adCopyAngles.join(', ')}`;
  }

  prompt += `\n\nÁNGULO DE ESTE COPY: ${copyAngle || "Destaca el beneficio principal del producto."}

GENERA COPY en ${lang} siguiendo ese ángulo específico.
${customization ? `INSTRUCCIONES EXTRA: ${customization}` : ""}

Responde SOLO con JSON (sin markdown, sin backticks):
{
  "headline": "Título impactante según el ángulo indicado (máx 8 palabras)",
  "subheadline": "Subtítulo que refuerce el ángulo (máx 15 palabras)",
  "cta": "Llamada a la acción (máx 4 palabras)",
  "body": "Descripción persuasiva según el ángulo (máx 30 palabras)"
}`;

  return prompt;
}

/** Generate copy via Gemini (kept for generate-copy-only action) */
async function generateCopy(params: {
  apiKey: string;
  model: string;
  productName: string;
  productDescription?: string | null;
  language: string;
  customization?: string;
  copyAngle?: string;
  researchContext?: string;
  researchVariables?: Record<string, string | undefined>;
  brandDNA?: Record<string, unknown>;
}): Promise<string> {
  const { apiKey, model, productName, productDescription, language, customization, copyAngle, researchContext, researchVariables, brandDNA } = params;

  const copyPrompt = buildCopyPrompt({
    name: productName,
    description: productDescription || undefined,
    language,
    customization,
    copyAngle,
    researchContext,
    researchVariables,
    brandDNA,
  });

  const geminiModel = model.startsWith("gemini") ? model : "gemini-2.0-flash";

  console.log(`[copy] Calling Gemini model=${geminiModel}, product="${productName}"`);

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: geminiModel,
        messages: [{ role: "user", content: copyPrompt }],
        temperature: 0.7,
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[copy] Gemini error ${response.status}:`, errText.slice(0, 300));
    throw new Error(`Gemini ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  console.log(`[copy] Generated (${content.length} chars):`, content.slice(0, 150));
  return content;
}

// ═══════════════════════════════════════════════════════════════
// Nano Banana Pro — Image generation with text rendered IN image
// ═══════════════════════════════════════════════════════════════

/** Converts legacy pixel sizes to aspect ratios, passes through new format */
function resolveAspectRatio(input: string): string {
  const pixelMap: Record<string, string> = {
    "1080x1080": "1:1",
    "800x800": "1:1",
    "1080x1920": "9:16",
    "1920x1080": "16:9",
    "1200x628": "3:2",
    "1080x1350": "4:5",
  };
  if (pixelMap[input]) return pixelMap[input];
  // Already aspect ratio format (e.g. "1:1", "9:16")
  if (/^\d+:\d+$/.test(input)) return input;
  return "1:1";
}

/** Mode-specific context for Nano Banana Pro prompt generation */
const MODE_CONTEXT: Record<string, string> = {
  product_only: `MODO: PRODUCTO VISIBLE — creativos con las fotos del producto.

IMÁGENES DE ENTRADA (image_urls): Fotos del producto/logo del usuario.
REGLAS:
- El producto de las fotos DEBE APARECER VISIBLE e IDÉNTICO en cada variación (misma forma, colores, empaque).
- Mezclar estilos: producto hero, UGC con persona real usando el producto, lifestyle, before/after.
- El producto se integra en escenas naturales — NO flotando sobre fondos vacíos.
El modelo RENDERIZA TEXTO en la imagen — cada fal_prompt DEBE incluir instrucciones de tipografía exactas.`,

  reference_and_product: `MODO: REFERENCIA + PRODUCTO — La imagen de referencia es INSPIRACIÓN visual.

⚠️ IMPORTANTÍSIMO — ESTÁS VIENDO LA REFERENCIA:
Te estoy mostrando la imagen de referencia real. ANALÍZALA DETALLADAMENTE y describe en cada fal_prompt:
1. Los COLORES EXACTOS que ves (paleta, tonos dominantes, contraste)
2. El ESTILO FOTOGRÁFICO (UGC/casual, editorial, minimalista, dark/premium, lifestyle, etc.)
3. La COMPOSICIÓN (centrada, rule-of-thirds, diagonal, split, etc.)
4. La ILUMINACIÓN (natural, ring light, golden hour, studio, etc.)
5. El MOOD/ENERGÍA (relajado, urgente, aspiracional, divertido, serio, etc.)
6. Si hay PERSONA: describe su apariencia CONCRETA (complexión, tono de piel, tipo de cabello, género, edad aprox, expresión facial)

CÓMO TRADUCIR LA REFERENCIA A CADA fal_prompt:
- NO digas "use the reference image" — el modelo de generación NO puede ver la referencia.
- EN SU LUGAR, describe TEXTUALMENTE todos los elementos visuales que captaste de la referencia.
- Ejemplo: en vez de "match the reference style", escribe "warm golden hour lighting, desaturated earth tones, casual bohemian aesthetic, iPhone selfie quality, natural skin texture"
- CADA fal_prompt debe INCORPORAR estos detalles visuales CONCRETOS basados en lo que VES.

REFERENCIA COMO INSPIRACIÓN (NO COPIA):
- Capturar la vibra general, paleta, mood y nivel de calidad.
- VARIAR libremente: layout, composición, ángulos y fondos cambian según cada ángulo de venta.
- La referencia marca la ESTÉTICA GENERAL, no la composición exacta.

SI LA REFERENCIA TIENE UNA PERSONA:
- Describe su apariencia CONCRETA en cada fal_prompt (ej: "a latina woman in her late 20s, medium brown skin, dark wavy shoulder-length hair, athletic build")
- MANTENER: rostro, complexión, tono de piel, género y rango de edad.
- VARIAR: ropa, entorno, pose y expresión se ADAPTAN al ángulo de venta de cada variación.
- El personaje es CONSISTENTE en apariencia física, el contexto es VARIABLE.

PRODUCTO: Las fotos del producto también se te muestran — describe el producto exactamente (forma, colores, empaque) en cada fal_prompt.
El modelo RENDERIZA TEXTO en la imagen — cada fal_prompt DEBE incluir instrucciones de tipografía exactas.`,

  reference_only: `MODO: SOLO REFERENCIA — Inspiración visual sin fotos de producto.

⚠️ IMPORTANTÍSIMO — ESTÁS VIENDO LA REFERENCIA:
Te estoy mostrando la imagen de referencia real. ANALÍZALA y describe CONCRETAMENTE en cada fal_prompt:
- Colores exactos, estilo fotográfico, composición, iluminación, mood/energía
- Si hay persona: describe su apariencia CONCRETA (complexión, tono de piel, cabello, género, edad, expresión)

NO digas "use the reference" — el modelo de generación NO puede verla. Traduce TODO a instrucciones textuales.

REFERENCIA COMO INSPIRACIÓN: Capturar vibra, paleta, mood y nivel de calidad. Variar composición y layout según cada ángulo de venta.

SI HAY PERSONA:
- Describe su apariencia CONCRETA en cada fal_prompt.
- MANTENER: rostro, complexión, tono de piel. VARIAR: ropa, entorno, pose y expresión según cada variación.

Como no hay fotos del producto, GENERAR una representación visual que encaje con la estética descrita.
El modelo RENDERIZA TEXTO en la imagen — cada fal_prompt DEBE incluir instrucciones de tipografía exactas.`,

  no_images: `MODO: SIN IMÁGENES — Crear creativos desde cero basándose en la descripción.

SIN IMÁGENES DE ENTRADA — generar todo desde el texto.
REGLAS:
- Crear representación visual del producto/servicio basada en nombre y descripción.
- Mezclar estilos: UGC con persona real, lifestyle candid, tipográfico bold, urgencia visual.
- Las personas deben verse AUTÉNTICAS y representar al buyer persona del producto.
- Look de contenido orgánico de redes sociales, NO publicidad corporativa.
El modelo RENDERIZA TEXTO en la imagen — cada fal_prompt DEBE incluir instrucciones de tipografía exactas.`,
};

interface ImageDirectorResult {
  fal_prompt: string;
  copy_used: {
    headline: string;
    subheadline: string;
    badge: string | null;
    cta: string;
    // Meta Ads Manager copy fields
    primary_text: string;
    meta_headline: string;
    meta_description: string;
    meta_cta: string;
  };
  variation_name: string;
  variation_strategy: string;
  recommended_for: string;
}

/**
 * All available variation strategies.
 * Intercala variaciones product-centric y person-centric para máxima diversidad.
 * Orden: 1=producto, 2=persona UGC, 3=producto+persona, 4=producto, 5=persona lifestyle
 */
const VARIATION_POOL = [
  {
    name: "Scroll-Stopper UGC",
    framework: "PAS",
    frameworkDesc: "Problem → Agitate → Solution",
    personRequired: true,
    layout: "ugc_raw — Persona REAL filmándose tipo selfie/TikTok sosteniendo o usando el producto. Look 100% orgánico, cero producción.",
    headline: "PROVOCADOR y disruptivo — una frase corta tipo meme/tweet que genere curiosidad inmediata. Ejemplo: 'Nadie te dice esto', 'Lo que NO quieren que sepas', 'Dejé de [dolor] en 7 días'",
    badge: 'tipo "Probado ✓", "Real ★★★★★", "Funciona" o null — look orgánico, NO corporativo',
    arrow: "flecha ↓ apuntando hacia abajo con texto como 'Info aquí ↓' o 'Ver más ↓' — posición bottom-center",
    bestFor: "cold audience, scroll-stopping, romper el patrón del feed, generar curiosidad",
    personInstructions: `PERSONA 100% NATURAL — ANTI-MODELO:
   - Persona COMÚN, REAL, que parezca un usuario GENUINO — NO modelos, NO stock photos, NO gente perfecta.
   - Piel real con textura, ropa casual del día a día, cabello normal sin peinar perfectamente.
   - Pose: selfie sosteniendo el producto, foto tipo espejo, tomándose video con el celular.
   - Expresión: sorpresa genuina, emoción real, como si estuviera contándole a un amigo.
   - ILUMINACIÓN: Ring light casero, luz de ventana, flash de celular — NADA de estudio.
   - Fondo: cuarto desordenado, baño, cocina, auto, oficina real — IMPERFECTO y AUTÉNTICO.
   - El look debe parecer un screenshot de un TikTok/Story/Reel REAL, no una producción.
   - CRÍTICO: La imperfección ES el atractivo — una imagen demasiado producida mata la conversión.`,
    example: '"😤 Probé LITERALMENTE todo 💸 $500+ tirados a la basura hasta que encontré esto 🤯 Mi vida cambió en 2 semanas ⬇️ Info abajo"',
  },
  {
    name: "Problema-Solución Directo",
    framework: "AIDA",
    frameworkDesc: "Attention → Interest → Desire → Action",
    personRequired: false,
    layout: "dynamic_impact — Producto como héroe visual con texto GIGANTE y disruptivo que ocupe 40%+ del frame. Composición diagonal o asimétrica con energía visual.",
    headline: "DIRECTO AL DOLOR — frase corta que golpee emocionalmente al avatar. Tipo: '¿Todavía con [problema]?', '[Resultado] garantizado', 'Deja de [dolor]'",
    badge: 'de prueba social: "+10K vendidos", "98% lo recomiendan", "Agotado 3 veces" o de oferta: "-40% HOY"',
    arrow: "flecha grande ↓ o ▼ vibrante apuntando abajo con micro-texto 'Descúbrelo ↓' — bottom-center, color que contraste",
    bestFor: "retargeting, conversión directa, decisión rápida",
    personInstructions: "",
    example: '"🔥 ¿Sigues aguantando [dolor]? 💡 Existe una solución que ya usan +10,000 personas ✨ Resultados desde el día 1 ⬇️ Descúbrelo"',
  },
  {
    name: "Lifestyle Real",
    framework: "PASTOR",
    frameworkDesc: "Problem → Amplify → Story → Transformation → Offer → Response",
    personRequired: true,
    layout: "lifestyle_candid — Persona REAL en su ambiente natural usando el producto de forma orgánica. Foto tipo 'me la tomó un amigo'. NO editorial.",
    headline: "ASPIRACIONAL pero ALCANZABLE — no 'perfección de revista' sino 'la mejor versión de tu día a día'. Tipo: 'Tu rutina mejorada', 'Así se siente [resultado]', 'Mi secreto de cada día'",
    badge: 'sutil tipo handwritten: "Mi favorito", "Game changer", "Worth it" o null',
    arrow: "indicador visual ↓ sutil y elegante apuntando abajo — puede ser texto pequeño 'Más info ↓' o icono flecha",
    bestFor: "brand awareness, crear deseo, identificación aspiracional, TOFU",
    personInstructions: `PERSONA REAL EN CONTEXTO NATURAL:
   - Persona atractiva pero NATURAL — no modelo de agencia, sino alguien que podrías seguir en Instagram.
   - Escena REAL pero aspiracional: desayunando en su depto, trabajando en un café, haciendo ejercicio al aire libre, caminando por la calle.
   - El producto aparece INTEGRADO naturalmente — en la mano, sobre la mesa, en uso.
   - Iluminación: golden hour natural, luz de ventana, exterior con sol — NUNCA flash directo.
   - Ropa actual y trendy pero accesible — no haute couture sino fast fashion o streetwear.
   - La persona transmite BIENESTAR y CONFIANZA, no perfección artificial.
   - Color grading: tonos cálidos, ligeramente desaturados, estilo VSCO/Instagram feed real.
   - La foto debe parecer sacada de un feed de Instagram real, NO de una campaña de marca.`,
    example: '"😩 Estaba harta de [problema] 📉 Cada día era igual hasta que probé [producto] 💫 30 días después no puedo creer el cambio ✅ 100% real ⬇️ Te cuento"',
  },
  {
    name: "Urgencia Cruda",
    framework: "FAB",
    frameworkDesc: "Feature → Advantage → Benefit con escasez",
    personRequired: false,
    layout: "bold_urgency — Texto DOMINANTE ocupando 50%+ del frame. Colores de alto contraste (rojo/amarillo/negro). Elementos de urgencia visual: timer, starburst, líneas de movimiento.",
    headline: "URGENTE y ESCASO — tipo: 'ÚLTIMO DÍA', '70% OFF solo hoy', 'Se acaba en horas', 'Ya casi no quedan' — texto GRANDE y ROJO/BOLD que genere FOMO",
    badge: 'OBLIGATORIO de escasez agresiva: "⚡FLASH SALE", "Últimas 23 unidades", "SOLO HOY -50%", countdown visual',
    arrow: "flecha ↓ GRANDE y llamativa tipo 'APROVECHA ↓' o '👇 AHORA' — colores de alto contraste, bottom-center",
    bestFor: "flash sales, cierre de ventas, retargeting caliente, FOMO, decisión inmediata",
    personInstructions: "",
    example: '"⏰ ÚLTIMAS HORAS 🔥 [Producto] con -50% que NUNCA se repite 🚨 Solo quedan 23 unidades ⚡ No lo pienses más ⬇️ Aprovecha YA"',
  },
  {
    name: "Antes / Después Raw",
    framework: "BAB",
    frameworkDesc: "Before → After → Bridge",
    personRequired: true,
    layout: "split_transformation — Dividido en dos: izquierda = ANTES (problema, frustración), derecha = DESPUÉS (resultado, felicidad). Estilo screenshot de review/reseña real.",
    headline: "TRANSFORMACIÓN EMOCIONAL — tipo: 'De [antes] a [después]', '30 días después...', 'El antes y después que nadie esperaba', 'Mira la diferencia'",
    badge: 'de resultado: "30 días", "Resultado real", "Sin filtros" — look orgánico y creíble',
    arrow: "flecha ↓ con texto 'Conoce el secreto ↓' o 'Cómo lo logré ↓' — bottom-center",
    bestFor: "awareness emocional, demostración de resultados, prueba social visual, storytelling",
    personInstructions: `PERSONA REAL MOSTRANDO TRANSFORMACIÓN AUTÉNTICA:
   - La MISMA persona en dos estados: ANTES frustrada/cansada/insatisfecha → DESPUÉS feliz/segura/radiante.
   - ANTES: iluminación fría, expresión desanimada, ropa descuidada, fondo más oscuro/apagado.
   - DESPUÉS: iluminación cálida, sonrisa genuina, arreglada pero natural, fondo más brillante.
   - El cambio debe ser CREÍBLE — no de "persona destruida" a "supermodelo". Sutil pero notorio.
   - El producto visible en el lado "DESPUÉS" como el puente entre ambos estados.
   - Puede ser formato de screenshot de story/post con la típica barra de "ANTES | DESPUÉS".
   - PROHIBIDO: transformaciones irreales, photoshop obvio, cambios exagerados.
   - La autenticidad de la transformación ES lo que vende — debe parecer una review real.`,
    example: '"😔 ANTES: frustración total, nada funcionaba ✨ DESPUÉS: resultados increíbles en 30 días 🌟 El secreto fue [producto] 💫 Mi historia es real ⬇️ Descúbrela"',
  },
];

/** Build the variation instructions section of the prompt dynamically based on count */
function buildVariationInstructions(count: number): string {
  const variations = VARIATION_POOL.slice(0, count);
  const personCount = variations.filter(v => v.personRequired).length;

  let instructions = variations.map((v, i) => {
    let text = `${i + 1}. ${v.name} (${v.framework}) — Framework ${v.frameworkDesc} para primary_text:
   - Layout: ${v.layout}
   - Headline: ${v.headline}
   - Badge: ${v.badge}
   - ⬇️ FLECHA ABAJO (reemplaza CTA): ${v.arrow}
   - Mejor para: ${v.bestFor}
   ${v.personRequired ? `- ⚠️ PERSONA REAL OBLIGATORIA en esta variación (ver instrucciones abajo)` : `- Persona: no requerida pero el texto y diseño deben compensar con IMPACTO VISUAL`}
   - primary_text: Usar framework ${v.framework} (${v.frameworkDesc})
     Ejemplo: ${v.example}`;
    if (v.personInstructions) {
      text += `\n   ${v.personInstructions}`;
    }
    return text;
  }).join('\n\n');

  instructions += `\n\n⚠️ REGLAS CRÍTICAS PARA TODAS LAS VARIACIONES:

🚫 PROHIBIDO: Botones CTA tipo "Comprar ahora" en la imagen. El botón real está DEBAJO de la imagen en Meta Ads.
✅ REEMPLAZAR CTA CON: Flechas ↓ ▼ ⬇️ apuntando hacia abajo con micro-texto invitando a ver más.
   La flecha debe ser visualmente llamativa, posicionada bottom-center, e invitar a clickear.
   Ejemplos: "Info aquí ↓", "Ver más ↓", "Descúbrelo ⬇️", "👇 Aprovecha", "↓ Más detalles"

📸 ESTÉTICA ANTI-PRODUCCIÓN (aplica a TODAS las variaciones):
- PRIORIZAR look natural, orgánico, tipo contenido de redes sociales reales.
- EVITAR: fotos de stock genéricas, iluminación de estudio perfecta, fondos blancos puros, poses de catálogo.
- Las imágenes con personas deben parecer tomadas con celular, NO con cámara profesional.
- Los textos deben verse BOLD, DISRUPTIVOS, como memes/tweets virales — NO como publicidad corporativa.
- El objetivo es DETENER EL SCROLL — la imagen debe generar curiosidad inmediata.`;

  if (personCount > 0) {
    instructions += `\n\n👤 REGLA DE PERSONAS (${personCount} de ${count} variaciones):
- Las personas deben verse como GENTE COMÚN que usa el producto — NO modelos perfectos.
- Piel real con textura, ropa casual, cabello natural — la imperfección genera CONFIANZA.
- Expresiones GENUINAS: sorpresa, emoción, satisfacción real — no sonrisas de stock.
- Diversidad natural en edad, tono de piel y estilo coherente con el buyer persona.`;
  }

  return instructions;
}

/**
 * Builds the complete Gemini prompt to generate N Nano Banana Pro prompts
 * with text rendering instructions (headline, subheadline, CTA, badges).
 */
function buildImageDirectorPrompt(params: {
  name: string;
  description?: string;
  stylePreset: string;
  aspectRatio: string;
  mode: string;
  language: string;
  hasReferenceImage: boolean;
  numProductImages: number;
  numVariations: number;
  customization?: string;
  brandDNA?: Record<string, unknown>;
  researchVariables?: Record<string, string | undefined>;
  researchContext?: string;
  briefData?: Record<string, unknown>;
}): string {
  const { name, description, stylePreset, aspectRatio, mode, language, hasReferenceImage, numProductImages, numVariations, customization, brandDNA, researchVariables, researchContext, briefData } = params;
  const langMap: Record<string, string> = { es: "español", en: "inglés", pt: "portugués" };
  const lang = langMap[language] || "español";

  let prompt = `Eres un growth hacker creativo experto en performance marketing y ads que VENDEN. Especialista en contenido UGC, scroll-stopping y conversión directa en Meta Ads, TikTok Ads e Instagram.

Tu tarea: Generar ${numVariations} prompts distintos para crear CREATIVOS PUBLICITARIOS de ALTA CONVERSIÓN que parezcan contenido ORGÁNICO/UGC en el feed, NO publicidad tradicional.

IMPORTANTE: Nano Banana Pro RENDERIZA TEXTO PERFECTO en la imagen. Cada prompt DEBE incluir instrucciones exactas de tipografía.

🚫 PROHIBIDO EN TODAS LAS VARIACIONES:
- Botones CTA tipo "Comprar ahora", "Shop now", etc. — El botón REAL está DEBAJO de la imagen en Meta Ads.
- Look de stock photo o catálogo corporativo.
- Fondos blancos puros y estériles.
- Modelos perfectos tipo agencia o fotos de banco de imágenes.
- Composiciones que griten "esto es un anuncio" — el usuario debe confundirlo con contenido real.

✅ REEMPLAZAR CTA CON FLECHAS ↓:
- En lugar de un botón CTA, poner una FLECHA VISUAL ↓ ▼ ⬇️ apuntando hacia abajo.
- La flecha debe estar en la parte inferior central de la imagen.
- Con micro-texto tipo: "Info ↓", "Ver más ↓", "Descúbrelo ⬇️", "👇 Aquí", "↓ Detalles"
- La flecha debe ser llamativa y contrastar con el fondo — es lo que invita al click.

${MODE_CONTEXT[mode] || MODE_CONTEXT.product_only}

Todo el copy/texto debe estar en ${lang}.

═══════════════════════════════════════════════════════════
SECCIONES OBLIGATORIAS EN CADA PROMPT:
═══════════════════════════════════════════════════════════

1. TECHNICAL SPECS:
   - Resolution: 2K high-resolution image
   - Aspect ratio: ${aspectRatio}
   - Output format: PNG
   - Anti-artifacts: No AI distortions, anatomically correct if humans present

2. COMPOSITION & LAYOUT (VARIAR entre variaciones):
   • ugc_raw: Selfie/TikTok — persona filmándose con celular, ring light, look casual. Texto superpuesto tipo story.
   • dynamic_impact: Producto como héroe con texto GIGANTE y BOLD ocupando 40%+ del frame. Composición diagonal.
   • lifestyle_candid: Persona real en contexto natural usando el producto. Foto tipo "amigo te tomó la foto".
   • bold_urgency: Texto DOMINA la imagen (50%+). Colores alto contraste. Urgencia visual.
   • split_transformation: Dividido antes/después. Contraste visual entre problema y solución.
   • social_native: Parece un post orgánico con engagement (likes, comments) superpuestos.

3. BACKGROUND & SCENE — SIEMPRE REAL Y NATURAL:
   - Ambientes REALES: habitaciones, cafés, calles, oficinas, cocinas, gimnasios, parques.
   - NUNCA fondos de estudio puros. Si no hay personas, usar texturas, gradientes urbanos o ambientales.
   - Colores de marca como acentos SUTILES integrados en la escena, NO como fondo monocolor.
   - El escenario debe coincidir con el ESTILO DE VIDA del buyer persona/avatar.

4. PRODUCTO + PERSONAS + ILUMINACIÓN:
   - Producto integrado naturalmente (en mano, sobre mesa, en uso) — NO flotando en el vacío.
   - Si hay personas: GENTE REAL, no modelos. Piel con textura, ropa casual, expresiones genuinas.
   - Iluminación NATURAL: luz de ventana, golden hour, ring light casero, luz de exterior.
   - PROHIBIDO: flash de estudio, iluminación 3-point perfecta, soft boxes visibles.
   - Las personas deben parecer CONTENT CREATORS comunes, no influencers de alto perfil.

5. HEADLINE — TEXTO DISRUPTIVO Y SCROLL-STOPPING:
   - Máx 6 palabras, en ${lang}. IMPACTO INMEDIATO.
   - Debe provocar curiosidad, sorpresa o emoción — como un tweet viral o meme.
   - Font style: BOLD, condensed, impactante. Puede ser handwritten para look UGC.
   - Tamaño: GRANDE — debe leerse en thumbnail del celular.
   - Color: alto contraste con el fondo (blanco sobre oscuro, negro sobre claro, color vibrante).
   - Posición: donde genere más impacto (top-center, center, overlapping la imagen).
   - Efectos: drop shadow fuerte para legibilidad, outline, o highlight/subrayado tipo marker.
   - ESTILO: Como si alguien lo escribiera en un story de Instagram — no como headline corporativo.

6. SUBHEADLINE — COMPLEMENTO BREVE:
   - Máx 10 palabras, en ${lang}. Complementa el headline con contexto.
   - Font: más delgada/ligera que el headline.
   - Tamaño: medium, legible pero secundario.
   - Posición: debajo del headline.

7. BADGES — PRUEBA SOCIAL Y URGENCIA:
   - RECOMENDADO en toda variación. Tipo: pill, tag, sticker, handwritten circle.
   - Textos: "★★★★★", "+10K clientes", "Probado ✓", "Agotado 2 veces", "-40%", "Real", "Funciona"
   - Look: orgánico como sticker puesto a mano, NO corporativo.
   - Posición: esquina o sobre la imagen de forma natural.

8. FLECHA ↓ HACIA ABAJO (REEMPLAZA EL CTA):
   - En lugar de botón CTA, incluir una FLECHA VISUAL apuntando hacia abajo.
   - Puede ser: ↓ ▼ ⬇️ 👇 o flecha gráfica diseñada.
   - Con micro-texto invitando a clickear: "Ver más ↓", "Info aquí ↓", "Descúbrelo ⬇️"
   - Color: vibrante, que contraste. Puede tener glow o animación visual.
   - Posición: BOTTOM-CENTER siempre.
   - Tamaño: mediano — visible pero no dominante.

9. TRUST ELEMENTS (opcionales pero potentes):
   - Estrellas ★★★★★, checkmarks ✓, sellos de garantía
   - Números reales: "+10K vendidos", "98% satisfacción", "3 años de garantía"
   - Screenshots de reviews/testimonios tipo overlay

10. MOOD & CONVERSIÓN:
   - Cada imagen debe generar UNA emoción dominante: curiosidad, FOMO, deseo, identificación, sorpresa.
   - La imagen debe hacer que el usuario piense "esto me habla a MÍ" — no "esto es un anuncio".
   - PRIORIZAR autenticidad sobre producción. La imperfección VENDE en redes sociales.

11. CALIDAD TÉCNICA:
   - Texto 100% legible, sin artefactos, letras nítidas.
   - Si hay personas: anatomía correcta, expresiones naturales, sin distorsiones.
   - Calidad de imagen: smartphone de gama alta (iPhone 15 Pro), NO cámara DSLR de estudio.

═══════════════════════════════════════════════════════════
LAS ${numVariations} VARIACIONES OBLIGATORIAS:
═══════════════════════════════════════════════════════════

${buildVariationInstructions(numVariations)}

REGLAS PARA primary_text (Meta Ads):
- OBLIGATORIO: Incluir 3-5 emojis relevantes distribuidos en el texto
- OBLIGATORIO: Cada variación usa su framework correspondiente
- Enfoque 100% en VENTA y CONVERSIÓN
- Máximo 125 caracteres
- Los emojis deben ser relevantes al contexto (🔥💡✨👉🎁⭐🏆💪❤️🚀💰✅ etc.)
- NO usar emojis genéricos sin contexto

═══════════════════════════════════════════════════════════
ESTILOS VISUALES:
═══════════════════════════════════════════════════════════
- professional: Studio lighting, clean composition, corporate trust. Text: clean sans-serif, white/dark on neutral.
- minimal: Even soft lighting, solid backgrounds. Text: thin elegant fonts, lots of white space.
- vibrant: Bold colors, energetic. Text: bold condensed, bright colors, playful.
- luxury: Dramatic lighting, dark/gold. Text: serif or thin sans-serif, gold/white accents.
- organic: Natural lighting, earth tones. Text: warm, handwritten or rounded fonts, natural colors.
- custom: Follow user instructions.`;

  // ═══════════════════════════════════════
  // Inject actual variables — ALL CRM data
  // ═══════════════════════════════════════
  prompt += `\n\n${"═".repeat(55)}\nVARIABLES DE ENTRADA PARA ESTA GENERACIÓN:\n${"═".repeat(55)}`;

  prompt += `\n\nPRODUCTO: "${name}"`;
  if (description) prompt += `\nDESCRIPCIÓN: ${description}`;
  prompt += `\nASPECT RATIO: ${aspectRatio}`;
  prompt += `\nESTILO SELECCIONADO: ${stylePreset}`;
  prompt += `\nIDIOMA DEL COPY: ${lang}`;

  // ═══════════════════════════════════════
  // Full Brand DNA Injection (all 8 sections)
  // ═══════════════════════════════════════
  if (brandDNA) {
    // Helper to safely access nested objects
    const s = (obj: unknown) => obj as Record<string, unknown> | undefined;

    // ── 1. Business Identity ──
    const biz = s(brandDNA.business_identity);
    if (biz) {
      prompt += `\n\n🏢 IDENTIDAD DEL NEGOCIO:`;
      if (biz.name) prompt += `\n- Nombre: ${biz.name}`;
      if (biz.industry) prompt += `\n- Industria: ${biz.industry}`;
      if (biz.sub_industry) prompt += `\n- Sub-industria: ${biz.sub_industry}`;
      if (biz.description) prompt += `\n- Descripción: ${biz.description}`;
      if (biz.business_model) prompt += `\n- Modelo de negocio: ${biz.business_model}`;
      if (biz.years_in_market) prompt += `\n- Años en mercado: ${biz.years_in_market}`;
      if (biz.mission) prompt += `\n- Misión: ${biz.mission}`;
      if (biz.unique_factor) prompt += `\n- Factor único: ${biz.unique_factor}`;
      if (biz.competitive_landscape) prompt += `\n- Paisaje competitivo: ${biz.competitive_landscape}`;
      if (biz.origin_story) prompt += `\n- Historia de origen: ${biz.origin_story}`;
    }

    // ── 2. Value Proposition ──
    const vp = s(brandDNA.value_proposition);
    if (vp) {
      prompt += `\n\n💎 PROPUESTA DE VALOR:`;
      if (vp.main_usp) prompt += `\n- USP principal: ${vp.main_usp}`;
      if (vp.brand_promise) prompt += `\n- Promesa de marca: ${vp.brand_promise}`;
      if (vp.main_problem_solved) prompt += `\n- Problema principal que resuelve: ${vp.main_problem_solved}`;
      if (vp.solution_description) prompt += `\n- Descripción de la solución: ${vp.solution_description}`;
      if (vp.transformation_promise) prompt += `\n- Promesa de transformación: ${vp.transformation_promise}`;
      const diffs = vp.differentiators as string[] | undefined;
      if (diffs?.length) prompt += `\n- Diferenciadores: ${diffs.join(' | ')}`;
      const benefits = vp.key_benefits as string[] | undefined;
      if (benefits?.length) prompt += `\n- Beneficios clave: ${benefits.join(' | ')}`;
      const proofs = vp.proof_points as string[] | undefined;
      if (proofs?.length) prompt += `\n- Puntos de prueba: ${proofs.join(' | ')}`;
    }

    // ── 3. Ideal Customer ──
    const ic = s(brandDNA.ideal_customer);
    if (ic) {
      prompt += `\n\n👤 CLIENTE IDEAL:`;
      const demo = s(ic.demographic);
      if (demo) {
        const parts: string[] = [];
        if (demo.age_range) parts.push(`Edad: ${demo.age_range}`);
        if (demo.gender) parts.push(`Género: ${demo.gender}`);
        if (demo.location) parts.push(`Ubicación: ${demo.location}`);
        if (demo.income_level) parts.push(`Nivel de ingreso: ${demo.income_level}`);
        if (demo.occupation) parts.push(`Ocupación: ${demo.occupation}`);
        if (parts.length) prompt += `\n- Demografía: ${parts.join(', ')}`;
      }
      const psycho = s(ic.psychographic);
      if (psycho) {
        const vals = psycho.values as string[] | undefined;
        if (vals?.length) prompt += `\n- Valores: ${vals.join(', ')}`;
        const ints = psycho.interests as string[] | undefined;
        if (ints?.length) prompt += `\n- Intereses: ${ints.join(', ')}`;
        const traits = psycho.personality_traits as string[] | undefined;
        if (traits?.length) prompt += `\n- Rasgos de personalidad: ${traits.join(', ')}`;
        if (psycho.lifestyle) prompt += `\n- Estilo de vida: ${psycho.lifestyle}`;
      }
      const painPts = ic.pain_points as string[] | undefined;
      if (painPts?.length) prompt += `\n- Puntos de dolor: ${painPts.slice(0, 5).join(' | ')}`;
      const desires = ic.desires as string[] | undefined;
      if (desires?.length) prompt += `\n- Deseos: ${desires.slice(0, 5).join(' | ')}`;
      const objections = ic.objections as string[] | undefined;
      if (objections?.length) prompt += `\n- Objeciones: ${objections.slice(0, 5).join(' | ')}`;
      const triggers = ic.buying_triggers as string[] | undefined;
      if (triggers?.length) prompt += `\n- Detonantes de compra: ${triggers.join(' | ')}`;
    }

    // ── 4. Flagship Offer ──
    const fo = s(brandDNA.flagship_offer);
    if (fo) {
      prompt += `\n\n🎁 OFERTA ESTRELLA:`;
      if (fo.name) prompt += `\n- Nombre: ${fo.name}`;
      if (fo.description) prompt += `\n- Descripción: ${fo.description}`;
      if (fo.price_range || fo.price) prompt += `\n- Precio: ${fo.price || fo.price_range}`;
      if (fo.main_benefit) prompt += `\n- Beneficio principal: ${fo.main_benefit}`;
      if (fo.price_justification) prompt += `\n- Justificación de precio: ${fo.price_justification}`;
      const features = fo.included_features as string[] | undefined;
      if (features?.length) prompt += `\n- Features incluidas: ${features.slice(0, 5).join(' | ')}`;
      const guarantees = fo.guarantees as string[] | undefined;
      if (guarantees?.length) prompt += `\n- Garantías: ${guarantees.join(' | ')}`;
      const urgency = fo.urgency_elements as string[] | undefined;
      if (urgency?.length) prompt += `\n- Elementos de urgencia: ${urgency.join(' | ')}`;
    }

    // ── 5. Brand Identity ──
    const bi = s(brandDNA.brand_identity);
    if (bi) {
      prompt += `\n\n🎭 IDENTIDAD DE MARCA:`;
      if (bi.brand_archetype) prompt += `\n- Arquetipo: ${bi.brand_archetype}`;
      const personalityTraits = bi.personality_traits as string[] | undefined;
      if (personalityTraits?.length) prompt += `\n- Rasgos de personalidad: ${personalityTraits.join(', ')}`;
      if (bi.tone_of_voice) prompt += `\n- Tono de voz: ${bi.tone_of_voice}`;
      if (bi.communication_style) prompt += `\n- Estilo de comunicación: ${bi.communication_style}`;
      const messages = bi.key_messages as string[] | undefined;
      if (messages?.length) prompt += `\n- Mensajes clave: ${messages.join(' | ')}`;
      const taglines = bi.tagline_suggestions as string[] | undefined;
      if (taglines?.length) prompt += `\n- Taglines sugeridos: ${taglines.join(' | ')}`;
      // Nested voice
      const voice = s(bi.voice);
      if (voice) {
        const tones = voice.tone as string[] | undefined;
        if (tones?.length) prompt += `\n- Tonos de voz: ${tones.join(', ')}`;
        const doSay = voice.do_say as string[] | undefined;
        if (doSay?.length) prompt += `\n- SÍ decir: ${doSay.slice(0, 5).join(' | ')}`;
        const dontSay = voice.dont_say as string[] | undefined;
        if (dontSay?.length) prompt += `\n- NO decir: ${dontSay.slice(0, 5).join(' | ')}`;
      }
      // Nested messaging
      const msg = s(bi.messaging);
      if (msg) {
        if (msg.tagline) prompt += `\n- Tagline principal: "${msg.tagline}"`;
        if (msg.elevator_pitch) prompt += `\n- Elevator pitch: ${msg.elevator_pitch}`;
      }
    }

    // ── 6. Visual Identity (CRITICAL for image generation) ──
    const vi = s(brandDNA.visual_identity);
    if (vi) {
      prompt += `\n\n🎨 IDENTIDAD VISUAL (LINEAMIENTOS GRÁFICOS — SEGUIR EN CADA IMAGEN):`;
      const primaryColors = vi.primary_colors as string[] | undefined;
      if (primaryColors?.length) prompt += `\n- Colores primarios de marca: ${primaryColors.join(', ')}`;
      const secondaryColors = vi.secondary_colors as string[] | undefined;
      if (secondaryColors?.length) prompt += `\n- Colores secundarios: ${secondaryColors.join(', ')}`;
      const brandColors = vi.brand_colors as string[] | undefined;
      if (brandColors?.length && !primaryColors?.length) prompt += `\n- Colores de marca: ${brandColors.join(', ')}`;
      if (vi.color_psychology) prompt += `\n- Psicología del color: ${vi.color_psychology}`;
      if (vi.color_meaning) prompt += `\n- Significado de colores: ${vi.color_meaning}`;
      if (vi.typography_style) prompt += `\n- Estilo tipográfico: ${vi.typography_style}`;
      if (vi.imagery_style) prompt += `\n- Estilo de imágenes: ${vi.imagery_style}`;
      if (vi.photography_style) prompt += `\n- Estilo fotográfico: ${vi.photography_style}`;
      if (vi.mood) prompt += `\n- Mood general: ${vi.mood}`;
      const moodKw = vi.mood_keywords as string[] | undefined;
      if (moodKw?.length) prompt += `\n- Keywords de mood: ${moodKw.join(', ')}`;
      const visualStyles = vi.visual_style as string[] | undefined;
      if (visualStyles?.length) prompt += `\n- Estilos visuales: ${visualStyles.join(', ')}`;
      const themes = vi.content_themes as string[] | undefined;
      if (themes?.length) prompt += `\n- Temas de contenido visual: ${themes.join(', ')}`;
    }

    // ── 7. Marketing Strategy (relevant for CTA and messaging) ──
    const ms = s(brandDNA.marketing_strategy);
    if (ms) {
      prompt += `\n\n📢 ESTRATEGIA DE MARKETING:`;
      if (ms.primary_objective) prompt += `\n- Objetivo principal: ${ms.primary_objective}`;
      if (ms.main_cta) prompt += `\n- CTA principal de la marca: "${ms.main_cta}"`;
      if (ms.funnel_strategy) prompt += `\n- Estrategia de funnel: ${ms.funnel_strategy}`;
      const pillars = ms.content_pillars as Array<Record<string, unknown>> | undefined;
      if (pillars?.length) {
        const pillarNames = pillars.map(p => p.name || p.nombre).filter(Boolean);
        if (pillarNames.length) prompt += `\n- Pilares de contenido: ${pillarNames.join(', ')}`;
      }
      const tactics = ms.engagement_tactics as string[] | undefined;
      if (tactics?.length) prompt += `\n- Tácticas de engagement: ${tactics.slice(0, 5).join(' | ')}`;
    }

    // ── 8. Ads Targeting (hooks and copy angles) ──
    const at = s(brandDNA.ads_targeting);
    if (at) {
      prompt += `\n\n🎯 SEGMENTACIÓN PUBLICITARIA:`;
      const hooks = at.hook_suggestions as string[] | undefined;
      if (hooks?.length) prompt += `\n- Hooks sugeridos: ${hooks.join(' | ')}`;
      // Structured ad copy angles
      const angles = at.ad_copy_angles as Array<Record<string, unknown>> | string[] | undefined;
      if (angles?.length) {
        if (typeof angles[0] === 'string') {
          prompt += `\n- Ángulos publicitarios: ${(angles as string[]).join(' | ')}`;
        } else {
          const structured = angles as Array<Record<string, unknown>>;
          prompt += `\n- Ángulos publicitarios detallados:`;
          structured.slice(0, 5).forEach((a, i) => {
            const angleName = a.angle_name || a.nombre || `Ángulo ${i + 1}`;
            prompt += `\n  ${i + 1}. "${angleName}"`;
            if (a.headline) prompt += ` — Headline: "${a.headline}"`;
            if (a.cta) prompt += ` — CTA: "${a.cta}"`;
          });
        }
      }
      // Meta targeting interests (useful for audience-aware imagery)
      const meta = s(at.meta_targeting);
      if (meta) {
        const interests = meta.interests as string[] | undefined;
        if (interests?.length) prompt += `\n- Intereses de audiencia (Meta): ${interests.slice(0, 8).join(', ')}`;
        const behaviors = meta.behaviors as string[] | undefined;
        if (behaviors?.length) prompt += `\n- Comportamientos de audiencia: ${behaviors.slice(0, 5).join(', ')}`;
      }
      const hashtags = at.hashtags as string[] | undefined;
      if (hashtags?.length) prompt += `\n- Hashtags relevantes: ${hashtags.slice(0, 8).join(', ')}`;
    }
  }

  // ═══════════════════════════════════════
  // Research variables (user-selected + auto)
  // ═══════════════════════════════════════
  if (researchVariables) {
    const rv = researchVariables;
    const hasAny = Object.values(rv).some(Boolean);
    if (hasAny) {
      prompt += `\n\n🔬 VARIABLES DE INVESTIGACIÓN SELECCIONADAS POR EL USUARIO (PRIORIDAD ALTA):`;
      if (rv.selectedAvatar) prompt += `\n- Avatar objetivo: ${rv.selectedAvatar}`;
      if (rv.selectedPain) prompt += `\n- Dolor principal a atacar: ${rv.selectedPain}`;
      if (rv.selectedDesire) prompt += `\n- Deseo principal a apelar: ${rv.selectedDesire}`;
      // Merged: angle or hook (same field)
      const angleOrHook = rv.selectedAngleOrHook || rv.selectedSalesAngle || rv.selectedHook;
      if (angleOrHook) prompt += `\n- Ángulo / Hook publicitario: ${angleOrHook}`;
      if (rv.selectedObjection) prompt += `\n- Objeción a romper visualmente: ${rv.selectedObjection}`;
      if (rv.selectedJTBD) prompt += `\n- Job to be done: ${rv.selectedJTBD}`;
      if (rv.selectedBuyingTrigger) prompt += `\n- Detonante de compra a activar: ${rv.selectedBuyingTrigger}`;
      if (rv.selectedTagline) prompt += `\n- Tagline/slogan a incorporar: "${rv.selectedTagline}"`;
      if (rv.selectedVisualStyle) prompt += `\n- Estilo visual seleccionado: ${rv.selectedVisualStyle}`;
      if (rv.selectedArchetype) prompt += `\n- Arquetipo de marca: ${rv.selectedArchetype}`;
      if (rv.selectedTone) prompt += `\n- Tono de voz: ${rv.selectedTone}`;
      if (rv.selectedKeyMessage) prompt += `\n- Mensaje clave: ${rv.selectedKeyMessage}`;

      prompt += `\n\nTRADUCCIÓN OBLIGATORIA DE VARIABLES A IMAGEN:
- Avatar → El ambiente, escenario y contexto visual deben coincidir con el estilo de vida del avatar
- Dolor → Referencia visual sutil en el contraste o transición (nunca como foco negativo)
- Deseo → La atmósfera principal debe EVOCAR el estado deseado como resultado logrado
- Ángulo/Hook → La composición, headline y el gancho visual deben reforzar este ángulo/hook específico
- Objeción → Incluir trust elements visuales que contrarresten la objeción (garantías, sellos, estrellas)
- JTBD → La escena sugiere el trabajo/resultado cumpliéndose visualmente
- Detonante → Incluir el trigger visual (urgencia, escasez, exclusividad, prueba social) según el detonante
- Tagline → Incorporar como subheadline o elemento de texto prominente si fue seleccionado
- Estilo visual → Adaptar toda la imagen al estilo visual seleccionado`;
    }
  }

  // ═══════════════════════════════════════
  // Brief data (from CRM product)
  // ═══════════════════════════════════════
  if (briefData) {
    const hasBrief = briefData.problem || briefData.solution || briefData.benefits || briefData.target_audience;
    if (hasBrief) {
      prompt += `\n\n📋 BRIEF DEL PRODUCTO (datos del cliente):`;
      if (briefData.problem) prompt += `\n- Problema que resuelve: ${briefData.problem}`;
      if (briefData.solution) prompt += `\n- Solución ofrecida: ${briefData.solution}`;
      if (briefData.target_audience) prompt += `\n- Audiencia objetivo: ${briefData.target_audience}`;
      const benefits = briefData.benefits as string[] | undefined;
      if (benefits?.length) prompt += `\n- Beneficios: ${benefits.join(' | ')}`;
      const features = briefData.key_features as string[] | undefined;
      if (features?.length) prompt += `\n- Features clave: ${features.join(' | ')}`;
    }
  }

  // ═══════════════════════════════════════
  // Full research context (pains, desires, avatars, competitors, JTBD, etc.)
  // ═══════════════════════════════════════
  if (researchContext) {
    prompt += `\n\n📊 INVESTIGACIÓN DE MERCADO COMPLETA (datos reales de investigación profunda):
${researchContext}

CÓMO USAR ESTA INVESTIGACIÓN EN LAS IMÁGENES:
- Los DOLORES del cliente deben reflejarse sutilmente en contrastes visuales (zona problema vs zona solución)
- Los DESEOS deben definir la ATMÓSFERA PRINCIPAL de la imagen (estado aspiracional logrado)
- Los AVATARES definen el escenario, contexto y estilo de vida visual
- Los ÁNGULOS DE VENTA deben inspirar el headline y la composición
- Las OBJECIONES deben contrarrestarse con trust elements (sellos, garantías, estrellas)
- Los COMPETIDORES indican de qué imagery visual DIFERENCIARSE (no copiar estilos de competidores)
- Los JTBD deben visualizarse como resultado cumplido en la escena`;
  }

  // ═══════════════════════════════════════
  // Image input handling instructions
  // ═══════════════════════════════════════
  prompt += `\n\n📸 INSTRUCCIONES SOBRE IMÁGENES DE ENTRADA:`;
  if (hasReferenceImage) {
    prompt += `\n
⚡ IMAGEN DE REFERENCIA PROPORCIONADA — LA ESTÁS VIENDO ⚡
Te estoy mostrando la imagen de referencia real en esta conversación.

TU TAREA CRÍTICA: ANALIZA visualmente la referencia y TRADUCE lo que ves en INSTRUCCIONES TEXTUALES DETALLADAS dentro de cada fal_prompt.

⚠️ EL MODELO DE GENERACIÓN (Nano Banana Pro) NO PUEDE "VER" LA REFERENCIA DIRECTAMENTE.
Por eso, TÚ debes describir CONCRETAMENTE en cada fal_prompt:
1. PALETA DE COLORES exacta que observas (ej: "warm earth tones with terracotta orange, deep brown, cream white")
2. ESTILO FOTOGRÁFICO (ej: "iPhone selfie quality", "editorial magazine", "Instagram feed aesthetic", "TikTok screenshot")
3. ILUMINACIÓN (ej: "soft natural window light from the left", "golden hour backlight", "ring light frontal")
4. COMPOSICIÓN y ENCUADRE (ej: "centered portrait, rule-of-thirds", "close-up from chest up", "full body environmental")
5. MOOD/ENERGÍA (ej: "casual and relaxed", "energetic and bold", "intimate and warm")
6. Si hay PERSONA: DESCRIBE su apariencia EXACTA — género, edad aprox, tono de piel, tipo/color de cabello, complexión corporal, rasgos faciales distintivos

NO escribas "use the reference image" ni "match the reference style" — eso NO funciona.
EN SU LUGAR, describe textualmente TODO lo que ves para que el modelo lo replique.

CADA VARIACIÓN usa la misma estética base pero VARÍA composición, layout y contexto según su ángulo de venta.`;
  }
  if (numProductImages > 0) {
    prompt += `\n⚡ HAY ${numProductImages} FOTO(S) DE PRODUCTO: ${hasReferenceImage ? `image_urls[1-${numProductImages}]` : `image_urls[0-${numProductImages - 1}]`} = fotos del producto/logo.
- INTEGRAR el producto visiblemente en cada variación — idéntico a las fotos (forma, colores, empaque).
- Si hay referencia: el producto REEMPLAZA al producto de la referencia, manteniendo la misma posición y proporción.
- NUNCA inventar productos o logos que no estén en las fotos.`;
  }
  if (!hasReferenceImage && numProductImages === 0) {
    prompt += `\n⚡ SIN IMÁGENES — crear todo desde la descripción textual.
- NO inventar logos ni marcas visuales.
- Diseño basado en tipografía, composición gráfica y personas reales.`;
  }

  if (customization) prompt += `\n\nINSTRUCCIONES ADICIONALES DEL USUARIO: ${customization}`;

  prompt += `\n\n${"═".repeat(50)}
Genera los ${numVariations} prompts ahora. Cada fal_prompt debe ser un párrafo completo y detallado.
${hasReferenceImage ? `
⚡ REFERENCIA — RECORDATORIO FINAL:
Has VISTO la imagen de referencia. Cada fal_prompt DEBE incluir una DESCRIPCIÓN TEXTUAL CONCRETA de:
- La paleta de colores, iluminación, estilo fotográfico y mood que observaste
- Si hay persona: su apariencia física concreta (género, edad, tono de piel, cabello, complexión)
- NO escribas "use the reference" — el modelo NO puede verla. Describe TEXTUALMENTE lo que viste.
- La persona (si existe) debe mantener su apariencia pero variar ropa/entorno/pose por variación.
` : ''}
CRÍTICO: Si hay fotos de producto/logo subidas, DEBEN integrarse visiblemente — incluir "integrate the uploaded product/logo photos" en cada fal_prompt. Si NO hay fotos, NO inventar logos — usar diseño tipográfico.

IMPORTANTE: copy_used tiene DOS bloques separados:

A) TEXTOS EN LA IMAGEN (renderizados por Nano Banana Pro dentro del banner):
   - headline: Texto DISRUPTIVO visible en la imagen (máx 6 palabras, scroll-stopping, tipo meme/tweet viral)
   - subheadline: Complemento breve visible (máx 10 palabras)
   - badge: Badge/sticker visible tipo "★★★★★", "+10K", "-40%" o null — look orgánico
   - cta: Texto de la FLECHA ↓ en la parte inferior (NO es un botón, es flecha + micro-texto tipo "Ver más ↓", "Info aquí ↓", "Descúbrelo ⬇️")

B) COPY PARA META ADS (texto que acompaña el anuncio en Meta Ads Manager, NO va en la imagen):
   - primary_text: Texto principal del anuncio CON EMOJIS usando el framework asignado.
     Máx 125 chars, VENTA DIRECTA, 3-5 emojis relevantes, tono conversacional tipo chat.
   - meta_headline: Título del anuncio debajo de la imagen (corto, directo, máx 40 chars)
   - meta_description: Descripción breve complementaria (máx 30 chars)
   - meta_cta: Botón CTA de Meta (ej: "Comprar", "Más información", "Ver oferta")

REGLAS:
- Los textos de la imagen (A) son VISUALES y DISRUPTIVOS — como contenido viral.
- Los textos de Meta (B) son COPY PUBLICITARIO persuasivo para vender.
- El campo "cta" en copy_used es el TEXTO DE LA FLECHA ↓, NO un botón.
- primary_text SIEMPRE con emojis y framework de cada variación.
- EXACTAMENTE ${numVariations} variaciones.

Responde SOLO con JSON (sin markdown, sin backticks):
{
  "prompts": [
    {
      "variation_id": 1,
      "variation_name": "Nombre de la variación",
      "variation_strategy": "string breve",
      "fal_prompt": "string — prompt COMPLETO para Nano Banana Pro con instrucciones de texto y flecha ↓",
      "copy_used": {
        "headline": "Texto disruptivo en la imagen",
        "subheadline": "Complemento breve",
        "badge": "Badge/sticker o null",
        "cta": "Texto de la flecha ↓ (ej: 'Ver más ↓')",
        "primary_text": "Copy persuasivo con emojis para Meta Ads",
        "meta_headline": "Título del anuncio en Meta",
        "meta_description": "Descripción breve",
        "meta_cta": "Botón CTA de Meta"
      },
      "recommended_for": "mejor caso de uso"
    }
  ]
}`;

  return prompt;
}

/**
 * Calls Gemini as creative director to generate N Nano Banana Pro prompts with copy_used.
 * Falls back to basic prompts if Gemini fails.
 */
async function generateImagePrompts(params: {
  apiKey: string;
  model: string;
  name: string;
  description?: string;
  stylePreset: string;
  aspectRatio: string;
  mode: string;
  language: string;
  hasReferenceImage: boolean;
  numProductImages: number;
  numVariations: number;
  customization?: string;
  brandDNA?: Record<string, unknown>;
  researchVariables?: Record<string, string | undefined>;
  researchContext?: string;
  briefData?: Record<string, unknown>;
  referenceImageUrl?: string;
  productImageUrls?: string[];
}): Promise<ImageDirectorResult[]> {
  const { apiKey, model, name, description, stylePreset, aspectRatio, mode, language, hasReferenceImage, numProductImages, numVariations, customization, brandDNA, researchVariables, researchContext, briefData, referenceImageUrl, productImageUrls } = params;

  const directorPrompt = buildImageDirectorPrompt({
    name, description: description || undefined, stylePreset, aspectRatio, mode, language, hasReferenceImage, numProductImages, numVariations, customization, brandDNA, researchVariables, researchContext, briefData,
  });

  const geminiModel = model.startsWith("gemini") ? model : "gemini-2.0-flash";

  console.log(`[image-director] Calling Gemini model=${geminiModel} for ${numVariations} Nano Banana Pro prompts, product="${name}", refImage=${!!referenceImageUrl}, productImages=${productImageUrls?.length || 0}`);

  try {
    // Build multimodal message content: text + reference image + product images
    // This lets Gemini ACTUALLY SEE the images and describe them concretely in each fal_prompt
    const messageContent: Array<Record<string, unknown>> = [];

    // Text prompt first
    messageContent.push({ type: "text", text: directorPrompt });

    // Add reference image so Gemini can ANALYZE it
    if (referenceImageUrl) {
      messageContent.push({
        type: "text",
        text: "\n\n📷 IMAGEN DE REFERENCIA (analízala detalladamente — estilo, colores, composición, personas, iluminación, mood):",
      });
      messageContent.push({
        type: "image_url",
        image_url: { url: referenceImageUrl },
      });
    }

    // Add product images so Gemini can see the actual product
    if (productImageUrls && productImageUrls.length > 0) {
      messageContent.push({
        type: "text",
        text: `\n\n📦 FOTOS DEL PRODUCTO (${productImageUrls.length} imagen(es) — describe el producto exactamente como aparece):`,
      });
      for (const pUrl of productImageUrls) {
        messageContent.push({
          type: "image_url",
          image_url: { url: pUrl },
        });
      }
    }

    // If we have images, add a final reminder to describe what was seen
    if (referenceImageUrl || (productImageUrls && productImageUrls.length > 0)) {
      messageContent.push({
        type: "text",
        text: `\n\n⚠️ INSTRUCCIÓN CRÍTICA PARA CADA fal_prompt:
${referenceImageUrl ? `- DESCRIBE CONCRETAMENTE lo que VES en la imagen de referencia: los colores exactos, el estilo fotográfico, la composición, la iluminación, la paleta, el mood. Si hay una persona, describe su apariencia física (complexión, tono de piel, género, edad aproximada, tipo de cabello). Cada fal_prompt debe INCORPORAR estos detalles visuales concretos, NO decir genéricamente "use the reference". El modelo de generación de imágenes NO puede "ver" la referencia — TÚ debes traducir lo que ves en INSTRUCCIONES TEXTUALES DETALLADAS.` : ''}
${productImageUrls?.length ? `- DESCRIBE el producto exactamente como lo ves: forma, colores, empaque, logo, tamaño aparente. Cada fal_prompt debe incluir esta descripción para que el modelo genere el producto IDÉNTICO.` : ''}`,
      });
    }

    // Use multimodal content format when we have images, plain text otherwise
    const messages = (referenceImageUrl || (productImageUrls && productImageUrls.length > 0))
      ? [{ role: "user", content: messageContent }]
      : [{ role: "user", content: directorPrompt }];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: geminiModel,
          messages,
          temperature: 0.8,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[image-director] Gemini error ${response.status}:`, errText.slice(0, 300));
      throw new Error(`Gemini ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Strip markdown code blocks if Gemini wraps them
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    console.log(`[image-director] Response (${content.length} chars):`, content.slice(0, 200));

    const parsed = JSON.parse(content);
    const prompts = parsed.prompts;

    if (!Array.isArray(prompts) || prompts.length < numVariations) {
      throw new Error(`Invalid structure: expected ${numVariations} prompts, got ${prompts?.length || 0}`);
    }

    const results: ImageDirectorResult[] = prompts.slice(0, numVariations).map((p: Record<string, unknown>) => {
      const fp = (p.fal_prompt || p.prompt || "") as string;
      const copyUsed = p.copy_used as Record<string, unknown> | undefined;

      console.log(`[image-director] V${p.variation_id} "${p.variation_name}": ${fp.length} chars`);

      return {
        fal_prompt: fp,
        copy_used: {
          headline: (copyUsed?.headline as string) || name,
          subheadline: (copyUsed?.subheadline as string) || "",
          badge: (copyUsed?.badge as string) || null,
          cta: (copyUsed?.cta as string) || "Comprar Ahora",
          primary_text: (copyUsed?.primary_text as string) || "",
          meta_headline: (copyUsed?.meta_headline as string) || (copyUsed?.headline as string) || name,
          meta_description: (copyUsed?.meta_description as string) || (copyUsed?.subheadline as string) || "",
          meta_cta: (copyUsed?.meta_cta as string) || "Más información",
        },
        variation_name: (p.variation_name || `Variation ${p.variation_id}`) as string,
        variation_strategy: (p.variation_strategy || "") as string,
        recommended_for: (p.recommended_for || "") as string,
      };
    });

    if (results.some((r) => !r.fal_prompt || r.fal_prompt.length < 50)) {
      throw new Error("One or more prompts are too short or empty");
    }

    return results;
  } catch (e) {
    console.error("[image-director] Failed, using fallback prompts:", e);
    return buildFallbackPrompts({ name, description, stylePreset, aspectRatio, mode, language, numVariations });
  }
}

/** Fallback prompts if Gemini creative director fails — includes text rendering for Nano Banana */
function buildFallbackPrompts(params: {
  name: string;
  description?: string;
  stylePreset: string;
  aspectRatio: string;
  mode: string;
  language: string;
  numVariations: number;
}): ImageDirectorResult[] {
  const { name, description, stylePreset, aspectRatio, mode, language, numVariations } = params;
  const desc = description ? ` ${description}.` : "";
  const styleMap: Record<string, string> = {
    professional: "Clean studio lighting, soft shadows, neutral background. Trust and credibility atmosphere.",
    minimal: "Even soft lighting, solid or subtle gradient background. Simplicity and elegance.",
    vibrant: "Colorful accent lights, bold background. Energetic and youthful mood.",
    luxury: "Dramatic jewelry-style lighting, dark background with metallic accents. Premium exclusive feel.",
    organic: "Natural golden hour lighting, earth tones, nature elements. Authentic and trustworthy.",
  };
  const style = styleMap[stylePreset] || styleMap.professional;

  const isSpanish = language === "es" || language === "español";
  const headlines = isSpanish
    ? [`Nadie te dice esto`, `Lo probé y WOW`, `Esto lo cambia todo`, `ÚLTIMO DÍA -50%`, `30 días después...`]
    : [`Nobody tells you this`, `I tried it and WOW`, `This changes everything`, `LAST DAY -50%`, `30 days later...`];
  const subheadlines = isSpanish
    ? ["El secreto que necesitabas", "Mi rutina nunca fue igual", "+10K personas ya lo usan", "No se va a repetir", "Mira la diferencia"]
    : ["The secret you needed", "My routine was never the same", "+10K people already use it", "This won't happen again", "Look at the difference"];
  const arrows = isSpanish ? ["Info aquí ↓", "Ver más ↓", "Descúbrelo ⬇️", "Aprovecha ↓", "Mi secreto ↓"] : ["Info here ↓", "See more ↓", "Discover ⬇️", "Grab it ↓", "My secret ↓"];
  const badges = [isSpanish ? "Probado ✓" : "Tested ✓", isSpanish ? "★★★★★ Real" : "★★★★★ Real", isSpanish ? "+10K vendidos" : "+10K sold", isSpanish ? "⚡ SOLO HOY" : "⚡ TODAY ONLY", isSpanish ? "Resultado real" : "Real result"];

  const modeBase = mode === "reference_and_product" || mode === "reference_only"
    ? `UGC-style advertising image inspired by the reference style. Natural lighting, authentic feel. Product: "${name}".${desc}`
    : `UGC-style advertising photo, smartphone quality (iPhone 15 Pro), natural lighting, 2K resolution, aspect ratio ${aspectRatio}. Product: "${name}".${desc}`;

  const variations: { variationName: string; strategy: string; recommended: string; layout: string }[] = [
    {
      variationName: "Scroll-Stopper UGC",
      strategy: "Contenido UGC auténtico — persona real tipo selfie/TikTok con producto",
      recommended: "Cold audience, scroll-stopping, confianza",
      layout: `UGC selfie-style photo: a REAL-LOOKING ordinary person (NOT a model, natural skin texture, casual clothes, messy hair ok) holding the product "${name}" like taking a selfie or TikTok video. Ring light or window natural lighting. Authentic room/bathroom/kitchen background. HEADLINE TEXT: "${headlines[0]}" in bold white handwritten/rounded font, large size, top-center with strong drop shadow. SUBHEADLINE: "${subheadlines[0]}" in light white font, small, below headline. BADGE: Small organic pill sticker "${badges[0]}" in top-right. ARROW: Large white arrow ↓ pointing down at bottom-center with text "${arrows[0]}" in small bold font. NO CTA BUTTON.`,
    },
    {
      variationName: "Problema-Solución",
      strategy: "Headline gigante disruptivo + producto como héroe visual",
      recommended: "Retargeting, conversión directa",
      layout: `Dynamic diagonal composition with product "${name}" as visual hero (40% of frame). HEADLINE TEXT: "${headlines[1]}" in EXTRA BOLD condensed white sans-serif font, VERY LARGE size occupying 30% of frame, positioned top-center with heavy drop shadow and slight rotation for energy. SUBHEADLINE: "${subheadlines[1]}" in light font, medium, below headline. BADGE: Red/orange starburst "${badges[1]}" in top-right corner. ARROW: Vibrant colored arrow ▼ pointing down at bottom-center with text "${arrows[1]}". Natural ambient lighting, textured urban background. NO CTA BUTTON.`,
    },
    {
      variationName: "Lifestyle Real",
      strategy: "Persona real en contexto natural tipo Instagram feed",
      recommended: "Brand awareness, deseo, TOFU",
      layout: `Candid lifestyle photo: an attractive but NATURAL person (not a model) confidently using "${name}" in a real setting (trendy cafe, modern apartment, outdoor walk). Golden hour natural lighting, warm tones, VSCO-style color grading. HEADLINE TEXT: "${headlines[2]}" in elegant but accessible sans-serif font, large, positioned top or center-left with warm glow effect. SUBHEADLINE: "${subheadlines[2]}" in thin font below headline. BADGE: Subtle handwritten-style pill "${badges[2]}". ARROW: Elegant small arrow ↓ at bottom-center with "${arrows[2]}". Looks like an Instagram post, NOT a produced ad. NO CTA BUTTON.`,
    },
    {
      variationName: "Urgencia Cruda",
      strategy: "Texto DOMINANTE con urgencia/escasez — FOMO máximo",
      recommended: "Flash sales, cierre, retargeting caliente",
      layout: `BOLD urgency composition: text DOMINATES 50%+ of the frame. HEADLINE TEXT: "${headlines[3]}" in EXTRA BOLD red/white condensed font, MASSIVE size, centered, with black outline for max contrast. SUBHEADLINE: "${subheadlines[3]}" in white bold font, medium. BADGE: LARGE red flash badge "${badges[3]}" with lightning bolt. Dynamic diagonal lines and urgency visual elements. High contrast dark background. ARROW: LARGE bright arrow ⬇️ at bottom-center with bold "${arrows[3]}". Product visible but text is the STAR. NO CTA BUTTON.`,
    },
    {
      variationName: "Antes / Después Raw",
      strategy: "Transformación visual auténtica — tipo review/reseña real",
      recommended: "Awareness, demostración de resultados, storytelling",
      layout: `Split before/after composition: LEFT side shows a real person looking tired/frustrated (cool/dark lighting, desaturated), RIGHT side shows the SAME person looking happy/confident with "${name}" (warm bright lighting, saturated). Looks like a real Instagram story screenshot. HEADLINE TEXT: "${headlines[4]}" in bold handwritten/marker font, warm color, centered across both halves. SUBHEADLINE: "${subheadlines[4]}" in light font below. BADGE: Authentic pill "${badges[4]}" in corner. ARROW: Arrow ↓ at bottom-center with "${arrows[4]}". Transformation must be SUBTLE and BELIEVABLE, not exaggerated. NO CTA BUTTON.`,
    },
  ];

  const metaPrimaryTexts = isSpanish
    ? [
        `😤 Probé LITERALMENTE todo 💸 Nada funcionaba hasta que encontré ${name} 🤯 Mi vida cambió en 2 semanas ⬇️ Info abajo`,
        `🔥 ¿Sigues aguantando [el problema]? 💡 +10,000 personas ya encontraron la solución ✨ Resultados desde el día 1 ⬇️ Descúbrelo`,
        `😩 Estaba harta de conformarme 📉 Probé ${name} sin esperanzas 💫 30 días después NO PUEDO CREERLO ✅ 100% real ⬇️`,
        `⏰ ÚLTIMAS HORAS 🔥 ${name} con -50% que NUNCA se repite 🚨 Solo quedan pocas unidades ⚡ No lo pienses más ⬇️`,
        `😔 ANTES: frustración total, nada servía ✨ DESPUÉS: ${name} cambió todo en 30 días 🌟 Mi historia es real ⬇️ Descúbrela`,
      ]
    : [
        `😤 I literally tried EVERYTHING 💸 Nothing worked until I found ${name} 🤯 My life changed in 2 weeks ⬇️ Info below`,
        `🔥 Still dealing with [the problem]? 💡 +10,000 people found the solution ✨ Results from day 1 ⬇️ Discover it`,
        `😩 I was done settling 📉 Tried ${name} with zero expectations 💫 30 days later I CAN'T BELIEVE IT ✅ 100% real ⬇️`,
        `⏰ LAST HOURS 🔥 ${name} -50% that will NEVER repeat 🚨 Few units left ⚡ Don't think twice ⬇️`,
        `😔 BEFORE: total frustration ✨ AFTER: ${name} changed everything in 30 days 🌟 My story is real ⬇️ Discover it`,
      ];

  return variations.slice(0, numVariations).map((v, i) => ({
    fal_prompt: `${modeBase} COMPOSITION: ${v.layout} All text must be perfectly legible, sharp, no AI artifacts. Smartphone camera quality (iPhone 15 Pro). Natural imperfect lighting preferred. NO CTA BUTTONS — use arrows pointing down instead. Aspect ratio: ${aspectRatio}.`,
    copy_used: {
      headline: headlines[i],
      subheadline: subheadlines[i],
      badge: badges[i],
      cta: arrows[i],
      primary_text: metaPrimaryTexts[i],
      meta_headline: headlines[i],
      meta_description: subheadlines[i],
      meta_cta: isSpanish ? "Más información" : "Learn More",
    },
    variation_name: v.variationName,
    variation_strategy: v.strategy,
    recommended_for: v.recommended,
  }));
}

/** Single Nano Banana Pro call via fal.ai */
/** Max prompt length for fal.ai — overly long prompts cause 500 errors */
const MAX_FAL_PROMPT_LENGTH = 3000;

async function callNanoBanana(params: {
  falKey: string;
  prompt: string;
  imageUrls: string[];
  aspectRatio: string;
  seed?: number;
}): Promise<string> {
  const { falKey, imageUrls, aspectRatio, seed } = params;
  // Truncate prompt if too long (fal.ai /edit can choke on very long prompts)
  const prompt = params.prompt.length > MAX_FAL_PROMPT_LENGTH
    ? params.prompt.slice(0, MAX_FAL_PROMPT_LENGTH) + "... Commercial photography quality. Aspect ratio: " + aspectRatio + "."
    : params.prompt;

  const falBody: Record<string, unknown> = {
    prompt,
    resolution: "2K",
    aspect_ratio: aspectRatio,
    output_format: "png",
    safety_tolerance: "4",
  };
  // Only include image_urls if there are images to reference
  if (imageUrls.length > 0) falBody.image_urls = imageUrls;
  if (seed !== undefined) falBody.seed = seed;

  // Use /edit endpoint when images are present (image-to-image), base endpoint for text-only
  const endpoint = imageUrls.length > 0
    ? "https://fal.run/fal-ai/nano-banana-pro/edit"
    : "https://fal.run/fal-ai/nano-banana-pro";
  console.log(`[nano-banana] endpoint=${endpoint}, images=${imageUrls.length}, promptLen=${prompt.length}`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(falBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[nano-banana] Error ${response.status}: ${errorText.slice(0, 300)}`);
    // If /edit fails with 500, try text-only endpoint as fallback (drop images)
    if (response.status === 500 && imageUrls.length > 0) {
      console.log(`[nano-banana] Fallback: retrying without images on base endpoint`);
      const fallbackBody = { ...falBody };
      delete fallbackBody.image_urls;
      const fallbackResp = await fetch("https://fal.run/fal-ai/nano-banana-pro", {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fallbackBody),
      });
      if (fallbackResp.ok) {
        const fbData = await fallbackResp.json();
        const fbUrl = fbData.images?.[0]?.url;
        if (fbUrl) {
          console.log(`[nano-banana] Fallback succeeded (text-only)`);
          return fbUrl;
        }
      }
    }
    throw new Error(`Fal.ai ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const url = data.images?.[0]?.url;
  if (!url) throw new Error("Fal.ai no retornó imagen");
  return url;
}

// ═══════════════════════════════════════════════════════════════
// Quick Market Research — auto-generates research context for manual products
// ═══════════════════════════════════════════════════════════════

/**
 * Calls Gemini to perform a quick market research based on product name, description,
 * and optional suggested angle. Returns a structured research context string that gets
 * injected into the image director prompt (same format as CRM research).
 */
async function quickMarketResearch(params: {
  apiKey: string;
  model: string;
  productName: string;
  productDescription?: string;
  suggestedAngle?: string;
  language: string;
}): Promise<{ researchContext: string; researchVariables: Record<string, string> }> {
  const { apiKey, model, productName, productDescription, suggestedAngle, language } = params;
  const langMap: Record<string, string> = { es: "español", en: "inglés", pt: "portugués" };
  const lang = langMap[language] || "español";

  const prompt = `Eres un estratega de marketing digital experto. Analiza este producto y genera una investigación de mercado rápida para crear anuncios publicitarios de alta conversión.

PRODUCTO: "${productName}"
${productDescription ? `DESCRIPCIÓN: "${productDescription}"` : "Sin descripción detallada — analiza por el nombre del producto."}
${suggestedAngle ? `ÁNGULO DE VENTA SUGERIDO POR EL USUARIO: "${suggestedAngle}" — Úsalo como guía principal para orientar toda la investigación.` : ""}
IDIOMA: ${lang}

Genera una investigación de mercado completa en ${lang}. Sé específico y práctico — esto se usará para generar anuncios visuales.

Responde SOLO con JSON (sin markdown, sin backticks):
{
  "avatar": "Descripción detallada del cliente ideal (demografía, estilo de vida, comportamiento)",
  "pains": ["Dolor/problema 1", "Dolor/problema 2", "Dolor/problema 3"],
  "desires": ["Deseo/resultado 1", "Deseo/resultado 2", "Deseo/resultado 3"],
  "hooks": ["Hook publicitario 1", "Hook publicitario 2", "Hook publicitario 3"],
  "objections": ["Objeción principal 1", "Objeción principal 2"],
  "jtbd": "Job to be done — qué trabajo funcional/emocional cumple el producto",
  "key_benefit": "El beneficio #1 más poderoso para usar en anuncios",
  "emotional_trigger": "El disparador emocional más efectivo para este producto"
}`;

  const geminiModel = model.startsWith("gemini") ? model : "gemini-2.0-flash";
  console.log(`[quick-research] Calling Gemini for product="${productName}"`);

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: geminiModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[quick-research] Gemini error ${response.status}:`, errText.slice(0, 300));
      throw new Error(`Gemini ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    const parsed = JSON.parse(content);
    console.log(`[quick-research] Success: avatar=${!!parsed.avatar}, pains=${parsed.pains?.length}, hooks=${parsed.hooks?.length}`);

    // Build research context string (same format used by CRM research)
    const parts: string[] = [];
    if (parsed.avatar) parts.push(`AVATAR / CLIENTE IDEAL:\n${parsed.avatar}`);
    if (parsed.pains?.length) parts.push(`DOLORES / PROBLEMAS:\n${parsed.pains.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}`);
    if (parsed.desires?.length) parts.push(`DESEOS / RESULTADOS:\n${parsed.desires.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n')}`);
    if (parsed.hooks?.length) parts.push(`HOOKS PUBLICITARIOS:\n${parsed.hooks.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}`);
    if (parsed.objections?.length) parts.push(`OBJECIONES PRINCIPALES:\n${parsed.objections.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}`);
    if (parsed.jtbd) parts.push(`JOB TO BE DONE:\n${parsed.jtbd}`);
    if (parsed.key_benefit) parts.push(`BENEFICIO CLAVE:\n${parsed.key_benefit}`);
    if (parsed.emotional_trigger) parts.push(`DISPARADOR EMOCIONAL:\n${parsed.emotional_trigger}`);

    const researchContext = parts.join('\n\n');

    // Build research variables for the director prompt
    const researchVariables: Record<string, string> = {};
    if (parsed.avatar) researchVariables.selectedAvatar = parsed.avatar;
    if (parsed.pains?.[0]) researchVariables.selectedPain = parsed.pains[0];
    if (parsed.desires?.[0]) researchVariables.selectedDesire = parsed.desires[0];
    if (parsed.hooks?.[0]) researchVariables.selectedAngleOrHook = suggestedAngle || parsed.hooks[0];
    if (parsed.objections?.[0]) researchVariables.selectedObjection = parsed.objections[0];
    if (parsed.jtbd) researchVariables.selectedJTBD = parsed.jtbd;

    return { researchContext, researchVariables };
  } catch (e) {
    console.error("[quick-research] Failed, proceeding without research:", e);
    // Return minimal context so generation can continue
    const fallbackContext = suggestedAngle
      ? `ÁNGULO DE VENTA: ${suggestedAngle}`
      : "";
    const fallbackVars: Record<string, string> = {};
    if (suggestedAngle) fallbackVars.selectedAngleOrHook = suggestedAngle;
    return { researchContext: fallbackContext, researchVariables: fallbackVars };
  }
}

// ═══════════════════════════════════════════════════════════════
// Serve handler
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action = "generate" } = body;

    // ── LIST TEMPLATES ──
    if (action === "list-templates") {
      const { category, organization_id } = body;
      let query = supabase.from("ad_templates").select("*").eq("is_active", true).order("sort_order", { ascending: true });
      if (category && category !== "all") query = query.eq("category", category);
      if (organization_id) {
        query = query.or(`organization_id.is.null,organization_id.eq.${organization_id}`);
      } else {
        query = query.is("organization_id", null);
      }
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ templates: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PARAMS ──
    const {
      organization_id: orgId,
      product_id: productId,
      reference_image_url: referenceImageUrl,
      product_image_urls: productImageUrls = [],
      // Accept both new aspect_ratio and legacy output_size
      aspect_ratio: aspectRatioRaw,
      output_size: outputSizeRaw = "1:1",
      copy_language: copyLanguage = "es",
      style_preset: stylePreset = "professional",
      customization,
      research_context: researchContext,
      research_variables: researchVariables,
      brand_dna: brandDNA,
      suggested_angle: suggestedAngle,
      num_variations: numVariationsRaw,
    } = body;

    if (!orgId) {
      return new Response(JSON.stringify({ error: "organization_id es requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!productId) {
      return new Response(JSON.stringify({ error: "product_id es requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: product, error: productError } = await supabase
      .from("ad_generator_products").select("name, description, crm_product_id").eq("id", productId).single();

    if (productError || !product) {
      return new Response(JSON.stringify({ error: "Producto no encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch CRM product data for additional context (brief, research) ──
    let briefData: Record<string, unknown> | undefined;
    if (product.crm_product_id) {
      try {
        const { data: crmProduct } = await supabase
          .from("products")
          .select("brief_data, strategy, ideal_avatar, content_strategy")
          .eq("id", product.crm_product_id)
          .single();
        if (crmProduct?.brief_data) {
          briefData = typeof crmProduct.brief_data === 'string'
            ? JSON.parse(crmProduct.brief_data)
            : crmProduct.brief_data as Record<string, unknown>;
        }
      } catch (e) {
        console.error("[ad-banner] CRM product fetch failed (non-critical):", e);
      }
    }

    // ── GENERATE COPY ONLY (legacy action, kept for backward compat) ──
    if (action === "generate-copy-only") {
      const tokenCheck = await checkAndDeductTokens(supabase, orgId, "ads.generate_copy");
      if (!tokenCheck.allowed) return insufficientTokensResponse(tokenCheck);
      let aiConfig;
      try { aiConfig = await getModuleAIConfig(supabase, orgId, "ad_generator"); }
      catch (e: any) {
        if (e.message?.startsWith("MODULE_INACTIVE:")) {
          return new Response(JSON.stringify({ error: "MODULE_INACTIVE", module: "ad_generator", message: "Módulo no habilitado." }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw e;
      }
      const copy = await generateCopy({ apiKey: aiConfig.apiKey, model: aiConfig.model, productName: product.name, productDescription: product.description, language: copyLanguage, customization, researchContext, researchVariables: researchVariables || undefined, brandDNA });
      return new Response(JSON.stringify({ copy, ai_provider: aiConfig.provider, ai_model: aiConfig.model }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GENERATE (full banner with text rendered in image) ──
    const tokenCheck = await checkAndDeductTokens(supabase, orgId, "ads.generate_banner");
    if (!tokenCheck.allowed) return insufficientTokensResponse(tokenCheck);

    let aiConfig;
    try { aiConfig = await getModuleAIConfig(supabase, orgId, "ad_generator"); }
    catch (e: any) {
      if (e.message?.startsWith("MODULE_INACTIVE:")) {
        return new Response(JSON.stringify({ error: "MODULE_INACTIVE", module: "ad_generator", message: "Módulo no habilitado." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    const falKey = Deno.env.get("FAL_KEY");
    if (!falKey) throw new Error("FAL_KEY no configurada");

    const startTime = Date.now();
    // Resolve aspect ratio: prefer explicit aspect_ratio, fallback to output_size (may be legacy pixel format)
    const aspectRatio = resolveAspectRatio(aspectRatioRaw || outputSizeRaw);
    const NUM_VARIATIONS = Math.max(1, Math.min(5, Number(numVariationsRaw) || 3));

    // Create records
    const bannerIds = Array.from({ length: NUM_VARIATIONS }, () => crypto.randomUUID());
    await supabase.from("ad_generated_banners").insert(
      bannerIds.map((id) => ({
        id, organization_id: orgId, product_id: productId,
        created_by: body.user_id || "system",
        reference_image_url: referenceImageUrl || null,
        template_id: null, product_image_urls: productImageUrls,
        output_size: aspectRatio, copy_language: copyLanguage,
        customization: customization || null,
        status: "generating", ai_provider: "fal", ai_model: "nano-banana-pro",
      })),
    );

    try {
      // ── Build image_urls ──
      const hasReference = !!referenceImageUrl;
      const validProductUrls = productImageUrls.filter(Boolean) as string[];

      let imageUrls: string[];
      let mode: "reference_and_product" | "reference_only" | "product_only" | "no_images";

      if (hasReference && validProductUrls.length > 0) {
        imageUrls = [referenceImageUrl!, ...validProductUrls.slice(0, 3)];
        mode = "reference_and_product";
      } else if (hasReference) {
        imageUrls = [referenceImageUrl!];
        mode = "reference_only";
      } else if (validProductUrls.length > 0) {
        imageUrls = validProductUrls.slice(0, 3);
        mode = "product_only";
      } else {
        imageUrls = [];
        mode = "no_images";
      }

      console.log(`[ad-banner] Mode=${mode}, refImage=${hasReference}, productImages=${validProductUrls.length}, totalUrls=${imageUrls.length}, aspectRatio=${aspectRatio}`);

      // ══════════════════════════════════════════════════════════
      // STEP 0.5: Quick market research for manual products
      // ══════════════════════════════════════════════════════════
      let effectiveResearchContext = researchContext || undefined;
      let effectiveResearchVars = researchVariables || undefined;

      const isManualProduct = !product.crm_product_id && !researchContext && !brandDNA;
      if (isManualProduct) {
        console.log(`[ad-banner] Manual product detected — running quick market research`);
        const qr = await quickMarketResearch({
          apiKey: aiConfig.apiKey,
          model: aiConfig.model,
          productName: product.name,
          productDescription: product.description || undefined,
          suggestedAngle: suggestedAngle || undefined,
          language: copyLanguage,
        });
        effectiveResearchContext = qr.researchContext || undefined;
        effectiveResearchVars = qr.researchVariables || undefined;
        console.log(`[ad-banner] Quick research done. Context=${effectiveResearchContext?.length || 0} chars`);
      } else if (suggestedAngle && !researchVariables?.selectedAngleOrHook) {
        // CRM product but user provided a suggested angle — merge it
        effectiveResearchVars = { ...(researchVariables || {}), selectedAngleOrHook: suggestedAngle };
      }

      // ══════════════════════════════════════════════════════════
      // STEP 1: Gemini creative director — generates N prompts + copy_used
      // ══════════════════════════════════════════════════════════
      const baseSeed = Math.floor(Math.random() * 1000000);

      const directorResults = await generateImagePrompts({
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        name: product.name,
        description: product.description || undefined,
        stylePreset,
        aspectRatio,
        mode,
        language: copyLanguage,
        hasReferenceImage: hasReference,
        numProductImages: validProductUrls.length,
        numVariations: NUM_VARIATIONS,
        customization,
        brandDNA: brandDNA || undefined,
        researchVariables: effectiveResearchVars,
        researchContext: effectiveResearchContext,
        briefData: briefData || undefined,
        referenceImageUrl: hasReference ? referenceImageUrl : undefined,
        productImageUrls: validProductUrls.length > 0 ? validProductUrls : undefined,
      });

      console.log(`[ad-banner] Step 1 done. Director results: ${directorResults.length} prompts`);

      // ══════════════════════════════════════════════════════════
      // STEP 2: Send N prompts to Nano Banana Pro with staggered starts + retry
      // ══════════════════════════════════════════════════════════
      const STAGGER_DELAY_MS = 800; // Stagger requests to avoid fal.ai rate limits

      async function generateAndUploadVariation(dr: typeof directorResults[0], i: number): Promise<string | null> {
        const MAX_RETRIES = 2;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`[ad-banner] Retry ${attempt}/${MAX_RETRIES} for variation ${i} "${dr.variation_name}"`);
              await new Promise(r => setTimeout(r, 2000 * attempt));
            }

            const generatedUrl = await callNanoBanana({
              falKey, prompt: dr.fal_prompt, imageUrls, aspectRatio,
              seed: baseSeed + i + (attempt * 100),
            });

            const imgResp = await fetch(generatedUrl);
            if (!imgResp.ok) throw new Error(`Download failed: ${imgResp.status}`);
            const bytes = new Uint8Array(await imgResp.arrayBuffer());

            const fileName = `banners/${orgId}/${bannerIds[i]}.png`;
            const { error: upErr } = await supabase.storage
              .from("ad-generator")
              .upload(fileName, bytes, { contentType: "image/png", upsert: true });
            if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

            const { data: urlData } = supabase.storage.from("ad-generator").getPublicUrl(fileName);
            return urlData.publicUrl;
          } catch (e) {
            console.error(`[ad-banner] Image ${i} attempt ${attempt} failed:`, e);
            if (attempt === MAX_RETRIES) return null;
          }
        }
        return null;
      }

      const imagePromises = directorResults.slice(0, NUM_VARIATIONS).map((dr, i) => {
        console.log(`[ad-banner] NanoBanana variation ${i} "${dr.variation_name}": seed=${baseSeed + i}, prompt=${dr.fal_prompt.length} chars`);
        // Stagger starts to avoid concurrent rate limits
        return new Promise<string | null>(resolve => {
          setTimeout(() => resolve(generateAndUploadVariation(dr, i)), i * STAGGER_DELAY_MS);
        });
      });

      const imageResults = await Promise.all(imagePromises);

      const generationTimeMs = Date.now() - startTime;
      console.log(`[ad-banner] Done in ${generationTimeMs}ms. Images=${imageResults.filter(Boolean).length}/3`);

      // Update DB records — each banner gets its copy_used from director
      const bannerUrls: string[] = [];
      for (let i = 0; i < NUM_VARIATIONS; i++) {
        const bannerUrl = imageResults[i];
        if (bannerUrl) {
          bannerUrls.push(bannerUrl);
          await supabase.from("ad_generated_banners").update({
            generated_image_url: bannerUrl,
            generated_copy: JSON.stringify(directorResults[i].copy_used),
            generation_time_ms: generationTimeMs,
            status: "completed",
          }).eq("id", bannerIds[i]);
        } else {
          await supabase.from("ad_generated_banners").update({
            status: "failed",
            error_message: "Error generando esta variación",
          }).eq("id", bannerIds[i]);
        }
      }

      if (bannerUrls.length === 0) throw new Error("No se generó ninguna variación");

      // Log usage
      try {
        await supabase.from("ai_usage_logs").insert({
          organization_id: orgId, user_id: body.user_id || "system",
          provider: "fal", model: "nano-banana-pro",
          module: "ad_generator", action: "generate_banner", success: true,
        });
      } catch (e) { console.error("Usage log failed:", e); }

      return new Response(JSON.stringify({
        banner_urls: bannerUrls,
        banner_url: bannerUrls[0],
        copy: JSON.stringify(directorResults[0].copy_used),
        banner_ids: bannerIds.filter((_, i) => imageResults[i]),
        banner_id: bannerIds[0],
        ai_provider: "fal", ai_model: "nano-banana-pro",
        generation_time_ms: generationTimeMs,
        aspect_ratio: aspectRatio,
        variations: bannerUrls.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (genError) {
      for (const bid of bannerIds) {
        await supabase.from("ad_generated_banners").update({
          status: "failed",
          error_message: genError instanceof Error ? genError.message : "Error desconocido",
        }).eq("id", bid).eq("status", "generating");
      }
      throw genError;
    }
  } catch (error) {
    console.error("Error in generate-ad-banner:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Error desconocido",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
