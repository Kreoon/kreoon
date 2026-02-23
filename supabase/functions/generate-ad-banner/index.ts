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
  product_only: `MODO DE GENERACIÓN: Crear imagen publicitaria desde cero CON EL PRODUCTO VISIBLE.

IMÁGENES DE ENTRADA (image_urls): Fotos del producto/logo proporcionadas por el usuario.
INSTRUCCIONES OBLIGATORIAS PARA EL MODELO:
- El producto/logo de las fotos DEBE APARECER VISIBLE Y RECONOCIBLE en cada banner generado.
- Mantener la forma exacta, colores, empaque, logo y etiquetas del producto original.
- El producto debe ser el ELEMENTO HÉROE de la composición — protagonista visual.
- Si es un logo: integrarlo como marca de agua premium, en la esquina superior o como elemento central.
- Si es un producto físico: mostrarlo con iluminación profesional, ángulo atractivo, escala correcta.
- Si son varios productos: composición grupal armónica o destacar uno como principal.
El modelo RENDERIZA TEXTO directamente en la imagen — incluir instrucciones de tipografía.`,

  reference_and_product: `MODO DE GENERACIÓN: Crear banner inspirado en referencia visual + PRODUCTO VISIBLE.

IMÁGENES DE ENTRADA (image_urls):
[0] = Imagen de REFERENCIA — define el estilo visual, layout, composición y atmósfera a seguir.
[1-3] = Fotos del PRODUCTO/LOGO — DEBEN aparecer visibles en el banner final.

INSTRUCCIONES OBLIGATORIAS PARA EL MODELO:
- COPIAR el estilo, paleta de colores, composición, iluminación y atmósfera de la imagen de referencia [0].
- INCORPORAR VISIBLEMENTE el producto/logo de las imágenes [1-3] en el banner.
- El producto debe verse IDÉNTICO a las fotos: misma forma, empaque, colores, etiquetas.
- Adaptar el producto al estilo/ambiente de la referencia (misma iluminación, ángulo compatible).
- Si la referencia tiene un layout específico (split, centrado, diagonal), replicarlo con el nuevo producto.
El modelo RENDERIZA TEXTO directamente en la imagen — incluir instrucciones de tipografía.`,

  reference_only: `MODO DE GENERACIÓN: Crear banner inspirado en referencia visual (sin fotos de producto).

IMÁGENES DE ENTRADA (image_urls):
[0] = Imagen de REFERENCIA — define el estilo visual, layout, composición y atmósfera a seguir.

INSTRUCCIONES OBLIGATORIAS PARA EL MODELO:
- COPIAR el estilo, paleta de colores, composición, iluminación y atmósfera de la referencia.
- Como no hay fotos del producto, GENERAR una representación visual del producto descrito.
- Mantener coherencia con la descripción textual del producto.
- El layout, proporciones de texto y espaciado deben seguir la referencia.
El modelo RENDERIZA TEXTO directamente en la imagen — incluir instrucciones de tipografía.`,

  no_images: `MODO DE GENERACIÓN: Crear banner publicitario desde cero SIN fotos de entrada.

SIN IMÁGENES DE ENTRADA — el modelo genera todo desde la descripción textual.
INSTRUCCIONES OBLIGATORIAS PARA EL MODELO:
- Generar una composición publicitaria completa basada en la descripción del producto.
- Crear representación visual del producto/servicio basada en el nombre y descripción.
- Usar stock imagery conceptual, ilustraciones, fondos abstractos o escenas lifestyle según el estilo.
- La tipografía y composición de texto son el PROTAGONISTA del banner.
- El diseño debe ser profesional y atractivo aunque no haya fotos reales del producto.
El modelo RENDERIZA TEXTO directamente en la imagen — incluir instrucciones de tipografía.`,
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
 * Builds the complete Gemini prompt to generate 3 Nano Banana Pro prompts
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
  customization?: string;
  brandDNA?: Record<string, unknown>;
  researchVariables?: Record<string, string | undefined>;
  researchContext?: string;
  briefData?: Record<string, unknown>;
}): string {
  const { name, description, stylePreset, aspectRatio, mode, language, hasReferenceImage, numProductImages, customization, brandDNA, researchVariables, researchContext, briefData } = params;
  const langMap: Record<string, string> = { es: "español", en: "inglés", pt: "portugués" };
  const lang = langMap[language] || "español";

  let prompt = `Eres un director creativo experto en publicidad digital y especialista en prompts para generación de imágenes con IA (Nano Banana Pro / Gemini 3 Pro Image).

Tu tarea: Generar 3 prompts distintos y optimizados para crear imágenes publicitarias de ALTA CONVERSIÓN con TEXTO RENDERIZADO directamente en la imagen.

IMPORTANTE: Nano Banana Pro RENDERIZA TEXTO PERFECTO en la imagen. Cada prompt DEBE incluir instrucciones exactas de tipografía para headline, subheadline, CTA y badges.

${MODE_CONTEXT[mode] || MODE_CONTEXT.product_only}

Todo el copy/texto debe estar en ${lang}.

═══════════════════════════════════════════════════════════
SECCIONES OBLIGATORIAS EN CADA PROMPT:
═══════════════════════════════════════════════════════════

1. TECHNICAL SPECS:
   - Resolution: 2K high-resolution advertising image
   - Aspect ratio: ${aspectRatio}
   - Output format: PNG, commercial grade quality
   - Anti-artifacts: No AI distortions, anatomically correct if humans present

2. COMPOSITION & LAYOUT — usar una de estas 5 estrategias:
   • hero_impact: Producto centrado grande (40-50% del frame), headline arriba, CTA abajo
   • editorial_split: Imagen dividida en mitades (producto | copy), estilo editorial
   • minimal_elegant: Fondo limpio, producto pequeño-mediano, tipografía como protagonista
   • dynamic_diagonal: Composición diagonal, elementos en movimiento, energía visual
   • social_proof: Producto con elementos de prueba social (estrellas, badges, testimonial visual)

3. BACKGROUND:
   - Especificar tipo (gradiente, sólido, ambiente, textura, fotográfico)
   - Integrar colores de marca como acentos sutiles (NUNCA monocolor de marca completo)

4. PRODUCT POSITIONING + LIGHTING:
   - Posición exacta del producto en el frame
   - Tipo de iluminación (studio 3-point, golden hour, dramatic, flat, etc.)
   - Ángulo del producto y efectos de sombra

5. HEADLINE TEXT — INSTRUCCIONES EXACTAS:
   - El texto EXACTO del headline (máx 8 palabras, en ${lang})
   - Font style: bold, condensed, serif, sans-serif, handwritten, etc.
   - Tamaño relativo: large/xlarge/xxlarge
   - Color: hex code específico que contraste con el fondo
   - Posición: top-center, top-left, center, etc.
   - Efectos: shadow, outline, gradient fill, 3D, glow, etc.

6. SUBHEADLINE TEXT — INSTRUCCIONES EXACTAS:
   - El texto EXACTO del subheadline (máx 15 palabras, en ${lang})
   - Font style: lighter/thinner que el headline
   - Tamaño: medium/small relativo al headline
   - Color: hex code (usualmente más sutil que headline)
   - Posición: debajo del headline

7. BADGES (opcional pero recomendado para conversión):
   - Tipo: starburst, ribbon, seal, shield, tag, pill
   - Texto del badge (ej: "-30%", "Nuevo", "Best Seller", "Edición Limitada")
   - Color y posición
   - Usar solo cuando el producto/contexto lo amerite

8. CTA BUTTON — INSTRUCCIONES EXACTAS:
   - Texto del CTA (máx 4 palabras, en ${lang})
   - Shape: rounded pill, rectangle, rounded rectangle
   - Colores: background hex + text hex
   - Posición: bottom-center, bottom-right, etc.
   - Tamaño relativo

9. TRUST ELEMENTS (opcionales):
   - Estrellas de rating (★★★★★)
   - Checkmarks de verificación
   - Certificaciones, sellos de garantía
   - Números ("+10K clientes", "98% satisfacción")

10. DESIGN ACCENTS:
   - Bordes decorativos, líneas, shapes geométricos
   - Glows, brillos, partículas
   - Elementos gráficos de apoyo

11. MOOD & BRAND ARCHETYPE:
   - Atmósfera general de la imagen
   - Traducir el arquetipo de marca a elementos visuales

12. TECHNICAL QUALITY:
   - Especificar: commercial photography quality, no AI artifacts, sharp product detail
   - Anti-text-artifacts: text must be perfectly legible, no blurred or distorted letters

═══════════════════════════════════════════════════════════
LAS 3 VARIACIONES OBLIGATORIAS:
═══════════════════════════════════════════════════════════

1. IMPACTO DIRECTO (Conversión) — Framework AIDA para primary_text:
   - Layout: hero_impact o dynamic_diagonal
   - Headline agresivo enfocado en beneficio o urgencia
   - Badge de oferta/descuento si aplica
   - CTA directo y urgente
   - Mejor para: retargeting, lanzamientos, conversión directa
   - primary_text: Usar framework AIDA (Attention → Interest → Desire → Action)
     Formato: emoji + frase de ATENCIÓN → emoji + generar INTERÉS → emoji + activar DESEO → emoji + llamada a ACCIÓN
     Ejemplo: "🔥 ¿Cansado de [dolor]? 💡 Descubre cómo [beneficio] en solo [tiempo]. ✨ Imagina [resultado deseado]. 👉 [CTA urgente]"

2. PREMIUM ELEGANTE (Branding) — Framework PASTOR para primary_text:
   - Layout: minimal_elegant o editorial_split
   - Headline sofisticado enfocado en aspiración/valor
   - Sin badge (o badge premium sutil: "Exclusivo", "Premium")
   - CTA elegante
   - Mejor para: brand awareness, posicionamiento premium, top of funnel
   - primary_text: Usar framework PASTOR (Problem → Amplify → Story → Transformation → Offer → Response)
     Formato: emoji + PROBLEMA → emoji + AMPLIFICAR consecuencias → emoji + mini HISTORIA/testimonio → emoji + TRANSFORMACIÓN → emoji + OFERTA → emoji + RESPUESTA/CTA
     Ejemplo: "😩 [Problema del avatar] 📉 Si no actúas, [consecuencia]. 💫 [Mini historia de éxito]. ✅ Ahora puedes [transformación]. 🎁 [Oferta]. 👇 [CTA]"

3. SOCIAL PROOF (Testimonial) — Framework PAS para primary_text:
   - Layout: social_proof
   - Headline que incluya prueba social o resultado
   - Badge tipo "Best Seller", "★★★★★", "+10K clientes"
   - Trust elements prominentes
   - Mejor para: audiencia skeptical, comparación, consideration phase
   - primary_text: Usar framework PAS (Problem → Agitate → Solution)
     Formato: emoji + PROBLEMA claro → emoji + AGITAR el dolor/frustración → emoji + SOLUCIÓN con prueba social
     Ejemplo: "😤 [Problema común] 💸 [Agitar: lo que pierdes/sufres si no lo resuelves]. 🏆 +[número] personas ya lo resolvieron con [producto]. ⭐ [Prueba social]"

REGLAS PARA primary_text (Meta Ads):
- OBLIGATORIO: Incluir 3-5 emojis relevantes distribuidos en el texto
- OBLIGATORIO: Cada variación usa su framework correspondiente (AIDA, PASTOR, PAS)
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
    prompt += `\n⚡ HAY IMAGEN DE REFERENCIA: La primera image_url [0] es una imagen de referencia del usuario.
- COPIAR el estilo visual, paleta de colores, composición, layout, iluminación y mood de esta referencia.
- Mantener proporciones similares de texto vs imagen.
- Adaptar el contenido (producto + copy) al esquema visual de la referencia.`;
  }
  if (numProductImages > 0) {
    prompt += `\n⚡ HAY ${numProductImages} FOTO(S) DE PRODUCTO: ${hasReferenceImage ? `Las image_urls [1-${numProductImages}]` : `Las image_urls [0-${numProductImages - 1}]`} son fotos del producto/logo subidas por el usuario.
- Las imágenes subidas DEBEN INTEGRARSE en el diseño del banner tal como son.
- Mantener fidelidad total al producto original: forma, colores, empaque, logo, etiquetas.
- Si es un PRODUCTO FÍSICO: mostrarlo con iluminación profesional integrado en la composición.
- Si es un LOGO: integrarlo como branding visible en el diseño.
- Si son VARIOS productos: uno como protagonista, los demás como apoyo.
- NUNCA inventar ni generar logos o productos que no estén en las fotos.
- USAR las fotos tal como son — son el elemento visual más importante del banner.`;
  }
  if (!hasReferenceImage && numProductImages === 0) {
    prompt += `\n⚡ SIN IMÁGENES: No se han subido fotos de producto ni referencia.
- NO inventar logos, marcas ni productos visuales que no existan.
- Crear un diseño basado en tipografía, composición gráfica y elementos abstractos.
- El texto y la composición son los protagonistas.
- Usar fondos, gradientes, texturas y formas geométricas para crear impacto visual.`;
  }

  if (customization) prompt += `\n\nINSTRUCCIONES ADICIONALES DEL USUARIO: ${customization}`;

  prompt += `\n\n${"═".repeat(50)}
Genera los 3 prompts ahora. Cada fal_prompt debe ser un párrafo completo y detallado con TODAS las instrucciones de texto/tipografía incluidas.
CRÍTICO: Si hay fotos de producto/logo subidas, DEBEN integrarse visiblemente en cada imagen — incluir instrucción "integrate the uploaded product/logo photos into the design" en cada fal_prompt. Si NO hay fotos subidas, NO inventar logos ni productos — usar diseño tipográfico y gráfico.

IMPORTANTE: copy_used tiene DOS bloques separados:

A) TEXTOS EN LA IMAGEN (renderizados por Nano Banana Pro dentro del banner):
   - headline: Título principal visible en la imagen (máx 8 palabras)
   - subheadline: Subtítulo visible en la imagen (máx 15 palabras)
   - badge: Badge visible en la imagen (ej: "-30%", "Nuevo") o null
   - cta: Botón CTA visible en la imagen (máx 4 palabras)

B) COPY PARA META ADS (texto que acompaña el anuncio en Meta Ads Manager, NO va en la imagen):
   - primary_text: Texto principal del anuncio CON EMOJIS usando el framework asignado:
     * Variación 1 (Impacto Directo) → AIDA: Attention → Interest → Desire → Action, con emojis
     * Variación 2 (Premium Elegante) → PASTOR: Problem → Amplify → Story → Transformation → Offer → Response, con emojis
     * Variación 3 (Social Proof) → PAS: Problem → Agitate → Solution, con emojis
     Máx 125 chars, enfocado en VENTA, 3-5 emojis relevantes obligatorios.
   - meta_headline: Título del anuncio debajo de la imagen (corto, directo, máx 40 chars)
   - meta_description: Descripción breve complementaria (máx 30 chars)
   - meta_cta: Botón CTA de Meta (ej: "Comprar", "Más información", "Registrarse", "Descargar", "Ver oferta")

Los textos de Meta Ads (B) deben ser DIFERENTES a los textos de la imagen (A). Los de Meta son copy publicitario persuasivo enfocado en conversión, mientras los de la imagen son titulares visuales de impacto.
CRÍTICO: primary_text SIEMPRE debe incluir emojis y seguir el framework (AIDA/PASTOR/PAS) de cada variación.

Responde SOLO con JSON (sin markdown, sin backticks):
{
  "prompts": [
    {
      "variation_id": 1,
      "variation_name": "Impacto Directo",
      "variation_strategy": "string breve explicando el approach",
      "fal_prompt": "string — el prompt COMPLETO para Nano Banana Pro con instrucciones de texto",
      "copy_used": {
        "headline": "Título visual en la imagen",
        "subheadline": "Subtítulo visual en la imagen",
        "badge": "Badge en la imagen o null",
        "cta": "CTA visual en la imagen",
        "primary_text": "Texto principal persuasivo para Meta Ads enfocado en el dolor/deseo",
        "meta_headline": "Título del anuncio en Meta",
        "meta_description": "Descripción breve en Meta",
        "meta_cta": "Botón CTA de Meta"
      },
      "recommended_for": "string — mejor caso de uso"
    },
    { "variation_id": 2, "variation_name": "Premium Elegante", ... },
    { "variation_id": 3, "variation_name": "Social Proof", ... }
  ]
}`;

  return prompt;
}

/**
 * Calls Gemini as creative director to generate 3 Nano Banana Pro prompts with copy_used.
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
  customization?: string;
  brandDNA?: Record<string, unknown>;
  researchVariables?: Record<string, string | undefined>;
  researchContext?: string;
  briefData?: Record<string, unknown>;
}): Promise<ImageDirectorResult[]> {
  const { apiKey, model, name, description, stylePreset, aspectRatio, mode, language, hasReferenceImage, numProductImages, customization, brandDNA, researchVariables, researchContext, briefData } = params;

  const directorPrompt = buildImageDirectorPrompt({
    name, description: description || undefined, stylePreset, aspectRatio, mode, language, hasReferenceImage, numProductImages, customization, brandDNA, researchVariables, researchContext, briefData,
  });

  const geminiModel = model.startsWith("gemini") ? model : "gemini-2.0-flash";

  console.log(`[image-director] Calling Gemini model=${geminiModel} for 3 Nano Banana Pro prompts, product="${name}"`);

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
          messages: [{ role: "user", content: directorPrompt }],
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

    if (!Array.isArray(prompts) || prompts.length < 3) {
      throw new Error(`Invalid structure: expected 3 prompts, got ${prompts?.length || 0}`);
    }

    const results: ImageDirectorResult[] = prompts.slice(0, 3).map((p: Record<string, unknown>) => {
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
    return buildFallbackPrompts({ name, description, stylePreset, aspectRatio, mode, language });
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
}): ImageDirectorResult[] {
  const { name, description, stylePreset, aspectRatio, mode, language } = params;
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
    ? [`Descubre ${name}`, `${name} Premium`, `Todos Aman ${name}`]
    : [`Discover ${name}`, `${name} Premium`, `Everyone Loves ${name}`];
  const subheadlines = isSpanish
    ? ["La solución que estabas buscando", "Calidad que se nota en cada detalle", "Miles de clientes satisfechos"]
    : ["The solution you've been looking for", "Quality you can feel in every detail", "Thousands of happy customers"];
  const ctas = isSpanish ? ["Comprar Ahora", "Descubrir Más", "Ver Más"] : ["Buy Now", "Learn More", "Shop Now"];
  const badges = [isSpanish ? "-30% HOY" : "-30% TODAY", null, isSpanish ? "★★★★★ Best Seller" : "★★★★★ Best Seller"];

  const modeBase = mode === "reference_and_product" || mode === "reference_only"
    ? `Professional advertising image inspired by the reference banner style. Product: "${name}".${desc}`
    : `Professional advertising photography, 2K resolution, aspect ratio ${aspectRatio}. Product: "${name}".${desc} Product must look exactly as in the provided photos.`;

  const variations: { variationName: string; strategy: string; recommended: string; layout: string }[] = [
    {
      variationName: "Impacto Directo",
      strategy: "Conversión directa con headline agresivo y CTA urgente",
      recommended: "Retargeting, lanzamientos, conversión directa",
      layout: `Product centered in lower two-thirds (40-50% of frame). HEADLINE TEXT: "${headlines[0]}" in bold white sans-serif font, large size, positioned top-center with drop shadow. SUBHEADLINE: "${subheadlines[0]}" in light white font, medium size, below headline.${badges[0] ? ` BADGE: Red starburst in top-right corner with white bold text "${badges[0]}".` : ""} CTA BUTTON: Rounded white pill at bottom-center with bold black text "${ctas[0]}".`,
    },
    {
      variationName: "Premium Elegante",
      strategy: "Branding sofisticado y aspiracional",
      recommended: "Brand awareness, posicionamiento premium",
      layout: `Editorial split layout: product on right third, clean space on left for text. HEADLINE TEXT: "${headlines[1]}" in elegant thin serif font, large size, positioned left-center with subtle gold color. SUBHEADLINE: "${subheadlines[1]}" in light gray thin font, small size, below headline. CTA BUTTON: Minimal rounded rectangle at bottom-left with thin border and elegant text "${ctas[1]}".`,
    },
    {
      variationName: "Social Proof",
      strategy: "Prueba social y testimonial visual",
      recommended: "Audiencia skeptical, consideration phase",
      layout: `Product with social proof elements. HEADLINE TEXT: "${headlines[2]}" in bold white condensed font, positioned top-center. SUBHEADLINE: "${subheadlines[2]}" in white font, medium size, below headline.${badges[2] ? ` BADGE: Gold shield badge at top-left with text "${badges[2]}".` : ""} Five gold stars (★★★★★) below subheadline. CTA BUTTON: Bold rounded pill at bottom-center with text "${ctas[2]}".`,
    },
  ];

  // Fallback primary_text with AIDA/PASTOR/PAS frameworks and emojis
  const metaPrimaryTexts = isSpanish
    ? [
        // AIDA: Attention → Interest → Desire → Action
        `🔥 ¿Buscas resultados reales? 💡 ${name} lo hace posible. ✨ Imagina lograrlo hoy. 👉 ¡No esperes más!`,
        // PASTOR: Problem → Amplify → Story → Transformation → Offer → Response
        `😩 ¿Frustrado con opciones mediocres? 💫 ${name} cambió todo para miles. ✅ Transforma tu experiencia. 👇 Descúbrelo`,
        // PAS: Problem → Agitate → Solution
        `😤 Mereces algo mejor. 💸 No sigas perdiendo tiempo. 🏆 +10K personas eligieron ${name}. ⭐ ¡Únete hoy!`,
      ]
    : [
        `🔥 Looking for real results? 💡 ${name} makes it possible. ✨ Imagine achieving it today. 👉 Don't wait!`,
        `😩 Frustrated with mediocre options? 💫 ${name} changed everything. ✅ Transform your experience. 👇 Discover it`,
        `😤 You deserve better. 💸 Stop wasting time. 🏆 10K+ people chose ${name}. ⭐ Join today!`,
      ];

  return variations.map((v, i) => ({
    fal_prompt: `${modeBase} COMPOSITION: ${v.layout} ${style} All text must be perfectly legible, sharp, no AI artifacts or distorted letters. Commercial photography quality. No blurred text. Aspect ratio: ${aspectRatio}.`,
    copy_used: {
      headline: headlines[i],
      subheadline: subheadlines[i],
      badge: badges[i],
      cta: ctas[i],
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
async function callNanoBanana(params: {
  falKey: string;
  prompt: string;
  imageUrls: string[];
  aspectRatio: string;
  seed?: number;
}): Promise<string> {
  const { falKey, prompt, imageUrls, aspectRatio, seed } = params;

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
  console.log(`[nano-banana] endpoint=${endpoint}, images=${imageUrls.length}`);
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
    throw new Error(`Fal.ai ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const url = data.images?.[0]?.url;
  if (!url) throw new Error("Fal.ai no retornó imagen");
  return url;
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
    const NUM_VARIATIONS = 3;

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
      // STEP 1: Gemini creative director — generates 3 prompts + copy_used
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
        customization,
        brandDNA: brandDNA || undefined,
        researchVariables: researchVariables || undefined,
        researchContext: researchContext || undefined,
        briefData: briefData || undefined,
      });

      console.log(`[ad-banner] Step 1 done. Director results: ${directorResults.length} prompts`);

      // ══════════════════════════════════════════════════════════
      // STEP 2: Send 3 prompts to Nano Banana Pro in parallel
      // ══════════════════════════════════════════════════════════
      const imagePromises = directorResults.slice(0, NUM_VARIATIONS).map((dr, i) => {
        console.log(`[ad-banner] NanoBanana variation ${i} "${dr.variation_name}": seed=${baseSeed + i}, prompt=${dr.fal_prompt.length} chars`);

        return callNanoBanana({ falKey, prompt: dr.fal_prompt, imageUrls, aspectRatio, seed: baseSeed + i })
          .then(async (generatedUrl) => {
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
          })
          .catch((e) => {
            console.error(`[ad-banner] Image ${i} failed:`, e);
            return null;
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
