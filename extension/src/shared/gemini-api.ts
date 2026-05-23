// Gemini API called DIRECTLY from the extension browser context.
// No Edge Function, no server — zero impact on the Kreoon platform.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com'
const GEMINI_MODEL = 'gemini-2.0-flash'
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string

export interface ViralAnalysis {
  transcription: string
  hooks: string[]
  structure: string
  narrative_formula: string
  emotion_triggers: string[]
  cta_type: string
  viral_factors: string[]
  whats_working: string[]
  replication_guide: string[]
  viral_score: number
  hook_visual?: string
  scenes?: string
  suggestions?: string[]
}

export interface ProductContext {
  id: string
  name: string
  client_id: string
  client_name?: string
  description?: string
  strategy?: string
  ideal_avatar?: string
  sales_angles?: string[]
}

// ─────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────

const ANALYSIS_PROMPT = `Eres un analista experto de contenido viral para redes sociales en LATAM. Analiza este contenido EXHAUSTIVAMENTE.

Devuelve SOLO JSON válido, sin markdown, sin texto extra:
{
  "transcription": "transcripción word-for-word del audio/texto principal",
  "hook_visual": "descripción exacta de los primeros 3 segundos: qué se ve, qué emoción genera, técnica usada",
  "scenes": "desglose por escenas: qué se ve, tipo de plano, movimiento",
  "structure": "estructura detallada: Hook → qué sigue → CTA (con tiempos si aplica)",
  "narrative_formula": "PAS / AIDA / BAB / StoryBrand / Microhistoria / Tutorial / Testimonial — explica por qué",
  "emotion_triggers": ["trigger emocional 1", "trigger emocional 2", "trigger emocional 3"],
  "hooks": ["hook principal exacto, palabra por palabra", "segundo gancho si existe"],
  "cta_type": "tipo de CTA y cómo se ejecuta (verbal, texto, comentar, seguir, comprar)",
  "viral_factors": ["factor viral 1: por qué funciona", "factor viral 2", "factor viral 3"],
  "whats_working": ["qué hace bien 1 con evidencia específica", "qué hace bien 2"],
  "replication_guide": ["cómo replicar elemento 1", "cómo replicar elemento 2"],
  "viral_score": número del 0 al 100,
  "suggestions": ["sugerencia para adaptar a otro producto 1", "sugerencia 2"]
}`

const SCRIPT_PROMPT = `Eres KREOON AI, copywriter senior especializado en guiones UGC para Latinoamérica.

METODOLOGÍA CAST:
- CONOCER (TOFU): Hook de identificación, audiencia fría, NO vender en los primeros 3s
- ATRAER (MOFU): Educación, posicionar la solución antes que el producto
- SEDUCIR (BOFU): Prueba social, demos, urgencia, objeciones
- TRANSFORMAR: La transformación específica del avatar, CTA único sin fricción

PROCESO (sigue estos pasos mentalmente antes de escribir):
1. Identifica el nivel de consciencia del avatar (dormido/buscando/comparando/listo)
2. Mapea el hook viral al dolor específico del avatar del producto
3. Adapta la fórmula narrativa del viral al producto
4. Usa los mismos tipos de triggers emocionales pero para el producto
5. Cierra con el mismo tipo de CTA del viral

FORMATO TELEPROMPTER (obligatorio):
- Una idea por línea
- Máximo 150 palabras
- Indicaciones de acción [ENTRE CORCHETES]
- Español neutro latinoamericano (natural, no corporativo)
- NO mencionar la metodología CAST en el guión`

// ─────────────────────────────────────────────────────────────
// Core: call Gemini generateContent
// ─────────────────────────────────────────────────────────────

async function geminiGenerate(parts: object[], maxTokens = 4096): Promise<string> {
  const res = await fetch(
    `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.3,
        },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err.substring(0, 200)}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function parseJSON(text: string, fallback: Partial<ViralAnalysis>): ViralAnalysis {
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const p = JSON.parse(match[0])
      return {
        transcription: p.transcription || fallback.transcription || '',
        hooks: Array.isArray(p.hooks) ? p.hooks : [],
        structure: p.structure || '',
        narrative_formula: p.narrative_formula || '',
        emotion_triggers: Array.isArray(p.emotion_triggers) ? p.emotion_triggers : [],
        cta_type: p.cta_type || '',
        viral_factors: Array.isArray(p.viral_factors) ? p.viral_factors : [],
        whats_working: Array.isArray(p.whats_working) ? p.whats_working : [],
        replication_guide: Array.isArray(p.replication_guide) ? p.replication_guide : [],
        viral_score: typeof p.viral_score === 'number' ? p.viral_score : 50,
        hook_visual: p.hook_visual,
        scenes: p.scenes,
        suggestions: Array.isArray(p.suggestions) ? p.suggestions : [],
      }
    }
  } catch {
    // fall through
  }
  return {
    transcription: fallback.transcription || text.substring(0, 300),
    hooks: [], structure: '', narrative_formula: '',
    emotion_triggers: [], cta_type: '', viral_factors: [],
    whats_working: [], replication_guide: [], viral_score: 50,
  }
}

function buildContext(platform: string, metadata: {
  title?: string; caption?: string; author?: string
  views?: number; likes?: number; comments?: number; adCopy?: string
}, videoUrl: string): string {
  const parts = [`PLATAFORMA: ${platform.toUpperCase()}`]
  if (metadata.author) parts.push(`CREADOR: @${metadata.author}`)
  if (metadata.title) parts.push(`TÍTULO: ${metadata.title}`)
  if (metadata.caption) parts.push(`CAPTION:\n"${metadata.caption}"`)
  if (metadata.adCopy) parts.push(`COPY DEL ANUNCIO:\n"${metadata.adCopy}"`)
  const metrics: string[] = []
  if (metadata.likes) metrics.push(`${fmtNum(metadata.likes)} likes`)
  if (metadata.views) metrics.push(`${fmtNum(metadata.views)} vistas`)
  if (metadata.comments) metrics.push(`${fmtNum(metadata.comments)} comentarios`)
  if (metrics.length) parts.push(`MÉTRICAS: ${metrics.join(' | ')}`)
  parts.push(`URL: ${videoUrl}`)
  return parts.join('\n')
}

function fmtNum(n?: number): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export interface CaptureMetadata {
  title?: string; caption?: string; author?: string
  views?: number; likes?: number; comments?: number; adCopy?: string
}

export async function analyzeViralContent(
  platform: string,
  videoUrl: string,
  videoBase64: string | undefined,
  videoMimeType: string | undefined,
  metadata: CaptureMetadata,
): Promise<ViralAnalysis> {
  const ctx = buildContext(platform, metadata, videoUrl)
  const fallback = { transcription: metadata.caption || metadata.adCopy || '' }

  // Level 1: YouTube native URL (Gemini reads audio+video directly)
  if (platform === 'youtube' && videoUrl.includes('youtube.com')) {
    try {
      const text = await geminiGenerate([
        { file_data: { mime_type: 'video/mp4', file_uri: videoUrl } },
        { text: `${ANALYSIS_PROMPT}\n\n${ctx}` },
      ], 8192)
      if (text) return parseJSON(text, fallback)
    } catch (e) {
      console.warn('[Kreoon] YouTube analysis failed, falling to text:', e)
    }
  }

  // Level 2: Frame image (canvas capture — always available for IG/TT)
  if (videoBase64 && videoMimeType === 'image/jpeg') {
    try {
      const text = await geminiGenerate([
        { inline_data: { mime_type: 'image/jpeg', data: videoBase64 } },
        {
          text: `${ANALYSIS_PROMPT}

CONTEXTO: Solo tienes UN FRAME del video. Analiza lo visible (composición, texto en pantalla, expresión, plano) y complementa con caption y métricas para inferir la estructura narrativa y fórmula viral.

${ctx}`,
        },
      ], 6144)
      if (text) return parseJSON(text, fallback)
    } catch (e) {
      console.warn('[Kreoon] Frame analysis failed, falling to text:', e)
    }
  }

  // Level 3: Deep text/caption analysis (always works)
  const text = await geminiGenerate([
    {
      text: `Eres un auditor de contenido digital para LATAM. Analiza este contenido basándote SOLO en caption, métricas y contexto. Aunque no tengas el video, detecta la metodología viral del caption.

${ANALYSIS_PROMPT}

${ctx}`,
    },
  ], 4096)
  return parseJSON(text, fallback)
}

export async function generateScript(
  analysis: ViralAnalysis,
  product: ProductContext,
  platform: string,
  metadata: CaptureMetadata,
): Promise<string> {
  const productCtx = `PRODUCTO: ${product.name}
Cliente: ${product.client_name || 'Sin especificar'}
${product.description ? `Descripción: ${product.description}` : ''}
${product.ideal_avatar ? `Avatar ideal: ${product.ideal_avatar}` : ''}
${product.sales_angles?.length ? `Ángulos de venta: ${product.sales_angles.join(', ')}` : ''}`

  const viralCtx = `REFERENCIA VIRAL (${platform} · @${metadata.author || 'desconocido'}):
Score viral: ${analysis.viral_score}/100
Fórmula: ${analysis.narrative_formula || 'no identificada'}
Estructura: ${analysis.structure || 'no identificada'}
Hook principal: "${analysis.hooks[0] || ''}"
Triggers: ${analysis.emotion_triggers.join(', ')}
CTA: ${analysis.cta_type}
Qué funciona: ${analysis.whats_working.join(' | ')}
Guía de replicación: ${analysis.replication_guide.join(' | ')}
Transcripción: "${analysis.transcription.substring(0, 400)}"`

  const instruction = `${productCtx}

${viralCtx}

Genera un guión UGC para "${product.name}" aplicando la misma fórmula narrativa (${analysis.narrative_formula || 'detectada arriba'}) y estructura del viral.
El resultado debe sonar auténtico en español LATAM natural.`

  const text = await geminiGenerate([
    { text: SCRIPT_PROMPT },
    { text: instruction },
  ], 3000)

  return text.trim()
}
