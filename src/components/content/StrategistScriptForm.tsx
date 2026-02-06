import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useScriptPrompts } from "@/hooks/useScriptPrompts";
import { useOrganizationAI } from "@/hooks/useOrganizationAI";
import { 
  Sparkles, Loader2, Target, Users, Globe, FileText, 
  MessageSquare, ListOrdered, Plus, X, Wand2, Settings2,
  Video, ChevronDown, CheckCircle2, Bot, RefreshCw, FileSearch, AlertCircle, Search
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

import { parseProductResearch, formatResearchForPrompt } from "@/lib/productResearchParser";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  strategy: string | null;
  market_research: string | null;
  ideal_avatar: string | null;
  sales_angles: string[] | null;
  brief_url?: string | null;
  onboarding_url?: string | null;
  research_url?: string | null;
  // Extended research fields
  avatar_profiles?: unknown;
  sales_angles_data?: unknown;
  competitor_analysis?: unknown;
  brief_data?: unknown;
  business_type?: 'product_service' | 'personal_brand' | null;
}

interface GeneratedContent {
  script: string;
  editor_guidelines?: string;
  strategist_guidelines?: string;
  trafficker_guidelines?: string;
  designer_guidelines?: string;
  admin_guidelines?: string;
}

interface StrategistScriptFormProps {
  product: Product | null;
  contentId: string;
  onScriptGenerated: (content: GeneratedContent) => void;
  organizationId?: string;
  spherePhase?: string | null;
}

interface DocumentContent {
  brief: string;
  onboarding: string;
  research: string;
}

interface ScriptFormData {
  cta: string;
  sales_angle: string;
  hooks_count: string;
  ideal_avatar: string;
  selected_pain: string;
  selected_desire: string;
  selected_objection: string;
  target_country: string;
  narrative_structure: string;
  additional_instructions: string;
  hooks: string[];
  script_prompt: string;
  editor_prompt: string;
  strategist_prompt: string;
  trafficker_prompt: string;
  designer_prompt: string;
  admin_prompt: string;
  reference_transcription: string;
  video_strategies: string;
  ai_model: string;
  video_duration: string;
  target_platform: string;
  use_perplexity: boolean;
}

interface PerplexityQueriesState {
  trends: boolean;
  hooks: boolean;
  competitors: boolean;
  audience: boolean;
}

interface GenerationStep {
  key: "script" | "editor" | "strategist" | "trafficker" | "designer" | "admin";
  label: string;
  status: "pending" | "generating" | "done" | "error";
}

// AI Models available - real model IDs
const AI_MODELS = [
  // Gemini
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Recomendado)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Avanzado)" },
  { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash (Rápido)" },
  // OpenAI
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (Rápido)" },
  // Anthropic
  { value: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4 (Avanzado)" },
  { value: "anthropic/claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (Rápido)" },
  // Perplexity (con búsqueda en tiempo real)
  { value: "perplexity/llama-3.1-sonar-large-128k-online", label: "Perplexity Sonar Large (Búsqueda Online)" },
  { value: "perplexity/llama-3.1-sonar-small-128k-online", label: "Perplexity Sonar Small (Rápido)" },
];

const NARRATIVE_STRUCTURES = [
  { value: "problema-solucion", label: "Problema → Solución", description: "Presenta el dolor y ofrece la solución" },
  { value: "historia-personal", label: "Historia Personal", description: "Storytelling desde la experiencia propia" },
  { value: "antes-despues", label: "Antes/Después", description: "Transformación visual o narrativa" },
  { value: "tutorial", label: "Tutorial paso a paso", description: "Guía práctica de uso" },
  { value: "testimonio", label: "Testimonio", description: "Experiencia de un cliente real" },
  { value: "urgencia", label: "Urgencia/Escasez", description: "FOMO y acción inmediata" },
  { value: "educativo", label: "Educativo/Informativo", description: "Enseña algo valioso" },
  { value: "entretenimiento", label: "Entretenimiento", description: "Engancha con humor o creatividad" },
  { value: "mitos-realidades", label: "Mitos vs Realidades", description: "Desmiente creencias falsas" },
  { value: "comparativa", label: "Comparativa", description: "vs competencia o alternativas" },
  { value: "detras-camaras", label: "Detrás de Cámaras", description: "Muestra el proceso o equipo" },
  { value: "unboxing", label: "Unboxing/Reveal", description: "Descubrimiento del producto" },
  { value: "reaccion", label: "Reacción", description: "Respuesta espontánea al producto" },
  { value: "lista", label: "Lista/Top", description: "X razones, tips o beneficios" },
  { value: "pov", label: "POV (Punto de Vista)", description: "Perspectiva del avatar ideal" },
  { value: "controversia", label: "Opinión Controversial", description: "Declaración que genera debate" },
  { value: "trend", label: "Trend/Tendencia", description: "Adaptación de formato viral" },
  { value: "dia-en-vida", label: "Día en la Vida", description: "Rutina usando el producto" },
  { value: "pregunta-respuesta", label: "Q&A", description: "Responde preguntas frecuentes" },
  { value: "storytime", label: "Storytime", description: "Historia larga y envolvente" },
];

const COUNTRIES = [
  "México", "Colombia", "Argentina", "España", "Chile", "Perú", "Estados Unidos (Latino)", "Otro",
];

// Video duration options
const VIDEO_DURATIONS = [
  { value: "15-30s", label: "15-30 segundos (Story/Reel)" },
  { value: "30-60s", label: "30-60 segundos (Short-form)" },
  { value: "1-3min", label: "1-3 minutos (Medio)" },
  { value: "3-5min", label: "3-5 minutos (Largo)" },
  { value: "5-10min", label: "5-10 minutos (YouTube)" },
];

// Target platform options
const TARGET_PLATFORMS = [
  { value: "instagram", label: "Instagram (Reels/Stories)" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "multi", label: "Multi-plataforma" },
];

// Sphere phase info for AI context - Aligned with Método Esfera
const SPHERE_PHASE_INFO: Record<string, { 
  label: string; 
  objective: string; 
  audience: string; 
  tone: string;
  techniques: string[];
  keywords: string[];
  ctaStyle: string;
}> = {
  engage: {
    label: 'ENGANCHAR (Fase 1)',
    objective: 'Viralidad, enganche, disrupción, educar. Que las personas conozcan el producto o servicio y se den cuenta que tienen el problema.',
    audience: 'Audiencia FRÍA - personas que nunca han interactuado con la marca, no conocen el producto ni saben que tienen un problema',
    tone: 'Disruptivo, viral, llamativo, sorprendente. Romper patrones, generar curiosidad extrema.',
    techniques: [
      'Hooks ultra potentes en los primeros 1-3 segundos',
      'Pattern interrupts (romper patrones visuales/auditivos)',
      'Declaraciones controversiales o contraintuitivas',
      'Preguntas que despiertan curiosidad',
      'Mostrar el problema de forma dramatizada',
      'Contenido educativo que revele un problema oculto'
    ],
    keywords: ['¿Sabías que...?', 'Esto es lo que nadie te cuenta', 'Error #1', 'Por qué no funciona', 'La verdad sobre', 'Descubrí que'],
    ctaStyle: 'Suave - invitar a seguir, comentar, guardar. NO vender directamente.',
  },
  solution: {
    label: 'SOLUCIÓN (Fase 2)',
    objective: 'Venta directa, persuadir para comprar, ser el mejor vendiendo. Mostrar que el producto ES la solución perfecta.',
    audience: 'Audiencia TIBIA - personas que ya saben que tienen el problema y buscan activamente una solución',
    tone: 'Persuasivo, confiado, enfocado en beneficios y transformación. Venta directa pero no agresiva.',
    techniques: [
      'Demostración del producto en acción',
      'Antes y después transformacionales',
      'Testimonios de clientes reales',
      'Comparación sutil con alternativas',
      'Storytelling de éxito',
      'Beneficios específicos y cuantificables'
    ],
    keywords: ['La solución es', 'Esto cambió todo', 'Finalmente', 'Por eso creamos', 'Resultados garantizados', 'Funciona porque'],
    ctaStyle: 'Directo - invitar a comprar, probar, registrarse. Link en bio, desliza arriba.',
  },
  remarketing: {
    label: 'REMARKETING (Fase 3)',
    objective: 'Mostrar lo que se está perdiendo, crear urgencia, superar objeciones finales. Cerrar la venta.',
    audience: 'Audiencia CALIENTE - personas que ya vieron el producto, visitaron el sitio, agregaron al carrito pero NO compraron',
    tone: 'Urgente, resolutivo, enfocado en pérdida (FOMO). Atacar objeciones directamente.',
    techniques: [
      'Escasez real (stock limitado, tiempo limitado)',
      'Social proof masivo (X personas ya compraron)',
      'Responder objeciones comunes',
      'Garantías y eliminación de riesgo',
      'Comparación de precio vs valor',
      'Recordatorio de beneficios clave'
    ],
    keywords: ['Últimas unidades', 'Se acaba en', 'No te pierdas', 'Mientras lees esto', 'Si no ahora, cuándo', 'Otros ya lo tienen'],
    ctaStyle: 'Urgente - comprar ahora, última oportunidad, no esperes más.',
  },
  fidelize: {
    label: 'FIDELIZAR (Fase 4)',
    objective: 'Entregar valor y confianza, buscar que nos refieran y recompren. Crear comunidad y lealtad.',
    audience: 'CLIENTES existentes - personas que ya compraron y queremos que vuelvan a comprar y nos recomienden',
    tone: 'Cercano, exclusivo, valorando al cliente. Contenido de alto valor, tips, comunidad.',
    techniques: [
      'Contenido exclusivo para clientes',
      'Tips de uso avanzado del producto',
      'Historias de otros clientes exitosos',
      'Ofertas exclusivas para clientes',
      'Invitación a programas de referidos',
      'Behind the scenes y contenido humano'
    ],
    keywords: ['Para ti que ya eres cliente', 'Tip exclusivo', 'Gracias por confiar', 'Comparte con', 'Tu experiencia importa', 'Familia [marca]'],
    ctaStyle: 'Comunitario - compartir, etiquetar amigos, dejar reseña, referir.',
  },
};

function getSpherePhaseInfo(phase: string) {
  return SPHERE_PHASE_INFO[phase] || null;
}

const CONTENT_AI_FUNCTION = "content-ai";

const DEFAULT_PROMPTS = {
  script: `🧍‍♂️ ROL: Eres un ESTRATEGA DIGITAL EXPERTO en contenido UGC, storytelling y performance ads.

Tu tarea es crear el BLOQUE 1 – CREADOR con toda la información necesaria para la grabación del video.

---
📦 INFORMACIÓN DEL PRODUCTO:
- Nombre: {producto_nombre}
- Descripción: {producto_descripcion}
- Estrategia: {producto_estrategia}
- Avatar Ideal: {producto_avatar}
- Ángulos de Venta: {producto_angulos}

🎯 PARÁMETROS DEL CONTENIDO:
- CTA Principal: {cta}
- Ángulo de Venta: {angulo_venta}
- Estructura Narrativa: {estructura_narrativa}
- País Objetivo: {pais_objetivo}
- Cantidad de Hooks: {cantidad_hooks}

📝 HOOKS SUGERIDOS:
{hooks_sugeridos}

📄 DOCUMENTOS DE REFERENCIA:
Brief: {documento_brief}
Onboarding: {documento_onboarding}
Research: {documento_research}

📹 ESTRATEGIAS DE VIDEO:
{estrategias_video}

🎬 TRANSCRIPCIÓN DE REFERENCIA:
{transcripcion_referencia}

💡 INSTRUCCIONES ADICIONALES:
{instrucciones_adicionales}

---
FORMATO DE ENTREGA (HTML estructurado):

<h2>🧍‍♂️ BLOQUE 1 – CREADOR</h2>

<h3>📋 INFORMACIÓN GENERAL</h3>
<table>
  <tr><td><strong>Título del video:</strong></td><td>[Título descriptivo y atractivo]</td></tr>
  <tr><td><strong>Objetivo del video:</strong></td><td>[Awareness / Engagement / Conversión / Educación]</td></tr>
  <tr><td><strong>Duración sugerida:</strong></td><td>[XX-XX segundos]</td></tr>
  <tr><td><strong>Formato:</strong></td><td>[9:16 vertical / 1:1 cuadrado / 16:9 horizontal]</td></tr>
</table>

<h3>👤 AVATAR / PÚBLICO OBJETIVO</h3>
<p><strong>Perfil ideal:</strong> {producto_avatar}</p>
<ul>
  <li><strong>Demografía:</strong> [Edad, género, ubicación]</li>
  <li><strong>Dolor principal:</strong> [Problema que resuelve el producto]</li>
  <li><strong>Deseo principal:</strong> [Resultado que busca]</li>
  <li><strong>Nivel de consciencia:</strong> [Inconsciente / Consciente del problema / Buscando solución]</li>
</ul>

<h3>🎭 PERFIL DE PERSONA PARA GRABAR</h3>
<table>
  <tr><td><strong>Género recomendado:</strong></td><td>[Cualquiera / Femenino / Masculino]</td></tr>
  <tr><td><strong>Rango de edad:</strong></td><td>[XX-XX años]</td></tr>
  <tr><td><strong>Tono de voz:</strong></td><td>[Cercano y amigable / Profesional / Enérgico / Tipo chisme]</td></tr>
  <tr><td><strong>Nivel de energía:</strong></td><td>[Alta / Media / Baja-reflexiva]</td></tr>
  <tr><td><strong>Entorno sugerido:</strong></td><td>[Casa / Oficina / Exterior / Estudio neutro]</td></tr>
  <tr><td><strong>Outfit sugerido:</strong></td><td>[Casual / Profesional / Acorde al producto]</td></tr>
  <tr><td><strong>Look general:</strong></td><td>[Descripción del aspecto ideal]</td></tr>
</table>

<h3>🗣️ TONO DE COMUNICACIÓN</h3>
<p><strong>Estilo principal:</strong> [Cercano tipo chisme / Educativo / Inspirador / Directo / Storytelling]</p>
<ul>
  <li><strong>Velocidad de habla:</strong> [Rápida-dinámica / Normal / Pausada-reflexiva]</li>
  <li><strong>Conexión emocional:</strong> [Tipo de emoción a transmitir]</li>
  <li><strong>Lenguaje:</strong> [Coloquial / Semi-formal / Técnico accesible]</li>
  <li><strong>Adaptación regional:</strong> {pais_objetivo}</li>
</ul>

<h3>🎣 3 HOOKS DISRUPTIVOS (formato director - A/B/C)</h3>

<h4>HOOK A - [Tipo: Curioso/Pregunta]</h4>
<p><em>[Indicación de actuación: Expresión facial, tono, velocidad]</em></p>
<p><strong>Texto:</strong> "[Hook A completo - diseñado para scroll-stopper]"</p>
<p><em>Por qué funciona: [Explicación breve]</em></p>

<h4>HOOK B - [Tipo: Impactante/Declaración]</h4>
<p><em>[Indicación de actuación]</em></p>
<p><strong>Texto:</strong> "[Hook B completo]"</p>
<p><em>Por qué funciona: [Explicación breve]</em></p>

<h4>HOOK C - [Tipo: Storytelling/Personal]</h4>
<p><em>[Indicación de actuación]</em></p>
<p><strong>Texto:</strong> "[Hook C completo]"</p>
<p><em>Por qué funciona: [Explicación breve]</em></p>

<h3>🎬 GUION FORMATO DIRECTOR</h3>
<p><em>Con descripciones visuales, emocionales y de actuación.</em></p>

<h4>📍 APERTURA (Hook) - 0:00-0:03</h4>
<p><strong>Visual:</strong> [Descripción del plano, movimiento, ubicación]</p>
<p><strong>Emocional:</strong> [Estado emocional del creador]</p>
<p><strong>Acción:</strong> [Qué está haciendo el creador]</p>
<p><strong>Texto:</strong> "[Elegir Hook A, B o C]"</p>

<h4>📍 DESARROLLO - 0:03-0:XX</h4>
<p><strong>Visual:</strong> [Descripción de cambios de plano]</p>
<p><strong>Emocional:</strong> [Transición emocional]</p>
<p><strong>Texto:</strong> "[Desarrollo del mensaje principal siguiendo estructura {estructura_narrativa}]"</p>

<h4>📍 BENEFICIO/PRUEBA - 0:XX-0:XX</h4>
<p><strong>Visual:</strong> [Mostrar producto, resultado, o prueba social]</p>
<p><strong>Emocional:</strong> [Emoción de transformación o descubrimiento]</p>
<p><strong>Texto:</strong> "[Conexión con el beneficio principal]"</p>

<h4>📍 CIERRE/CTA - Últimos 3-5 segundos</h4>
<p><strong>Visual:</strong> [Plano de cierre]</p>
<p><strong>Emocional:</strong> [Urgencia amigable o invitación]</p>
<p><strong>Texto:</strong> "{cta}"</p>

<h3>📺 GUION PARA TELEPROMPTER</h3>
<p><em>Versión limpia y natural para leer directamente. Solo texto hablado, fluido y conversacional.</em></p>

<h4>🎣 HOOK (elegir uno para la grabación)</h4>
<p style="font-size: 1.2em; line-height: 2;">
<strong>A:</strong> "[Hook A - texto exacto para leer]"
</p>
<p style="font-size: 1.2em; line-height: 2;">
<strong>B:</strong> "[Hook B - texto exacto para leer]"
</p>
<p style="font-size: 1.2em; line-height: 2;">
<strong>C:</strong> "[Hook C - texto exacto para leer]"
</p>

<h4>💬 CUERPO</h4>
<p style="font-size: 1.2em; line-height: 2;">
"[Texto completo del desarrollo - escrito de forma natural y conversacional, como si hablaras con un amigo. Sin indicaciones de actuación, solo el texto hablado.]"
</p>

<h4>📢 CIERRE</h4>
<p style="font-size: 1.2em; line-height: 2;">
"{cta}"
</p>

<h4>📋 GUIÓN COMPLETO (una sola pieza para copiar)</h4>
<blockquote style="font-size: 1.1em; line-height: 2; padding: 20px; background: #f5f5f5; border-left: 4px solid #333;">
[Hook elegido]

[Desarrollo completo]

[Cierre con CTA]

<br><br>
<em>Duración aproximada de lectura: XX segundos</em>
</blockquote>

<h3>📢 CTA SUGERIDO</h3>
<table>
  <tr><td><strong>Para Orgánico:</strong></td><td>[CTA enfocado en engagement: comentar, seguir, guardar]</td></tr>
  <tr><td><strong>Para Ads:</strong></td><td>{cta}</td></tr>
  <tr><td><strong>Alternativa 1:</strong></td><td>[Variación del CTA]</td></tr>
  <tr><td><strong>Alternativa 2:</strong></td><td>[Otra variación]</td></tr>
</table>

<h3>💡 NOTAS ADICIONALES PARA EL CREADOR</h3>
<ul>
  <li><strong>Tip de actuación:</strong> [Consejo específico]</li>
  <li><strong>Expresiones faciales:</strong> [Sugerencias]</li>
  <li><strong>Gestos recomendados:</strong> [Movimientos de manos, postura]</li>
  <li><strong>Errores a evitar:</strong> [Qué NO hacer]</li>
  <li><strong>Referencias de estilo:</strong> [Creadores o videos de referencia]</li>
</ul>`,

  editor: `🎬 ROL: Eres un EDITOR DE VIDEO PROFESIONAL especializado en contenido de alto rendimiento para TikTok, Reels y Shorts.

Tu tarea es crear el BLOQUE 2 – EDITOR con todas las pautas de edición basadas en el GUIÓN GENERADO.

⚠️ IMPORTANTE: Debes basar TODO en el guión del Bloque 1. Cada escena del storyboard debe corresponder a una sección del guión.

---
📦 CONTEXTO DEL PROYECTO:
- Producto: {producto_nombre}
- Descripción: {producto_descripcion}
- Avatar objetivo: {producto_avatar}
- País: {pais_objetivo}

🎯 ENFOQUE DEL CONTENIDO:
- Ángulo de venta: {angulo_venta}
- Estructura narrativa: {estructura_narrativa}
- CTA: {cta}

📄 DOCUMENTOS:
Brief: {documento_brief}
Estrategias de video: {estrategias_video}

---
FORMATO DE ENTREGA (HTML estructurado):

<h2>🎬 BLOQUE 2 – EDITOR</h2>

<h3>📝 NOTAS DE EDICIÓN</h3>
<table>
  <tr><td><strong>Velocidad general:</strong></td><td>[Rápida y dinámica / Moderada / Pausada]</td></tr>
  <tr><td><strong>Ritmo de cortes:</strong></td><td>[Cada X segundos / Por frase / Por idea]</td></tr>
  <tr><td><strong>Estilo de corte:</strong></td><td>[Jump cuts / Smooth transitions / Match cuts / Sin cortes]</td></tr>
  <tr><td><strong>Duración por escena:</strong></td><td>[Especificar por sección]</td></tr>
  <tr><td><strong>Estilo general:</strong></td><td>[UGC orgánico / Producido / Híbrido]</td></tr>
</table>

<h3>🎥 STORYBOARD (4-6 escenas basadas en el guión)</h3>

<h4>📍 ESCENA 1: HOOK (0:00 - 0:03)</h4>
<p><em>Referencia del guión: [Texto del hook elegido]</em></p>
<table>
  <tr><td><strong>Tipo de plano:</strong></td><td>[Close-up / Medio / Americano / General]</td></tr>
  <tr><td><strong>Movimiento de cámara:</strong></td><td>[Estático / Zoom in / Zoom out / Pan / Seguimiento]</td></tr>
  <tr><td><strong>Elementos visuales:</strong></td><td>[Qué se ve en pantalla además del creador]</td></tr>
  <tr><td><strong>Texto en pantalla:</strong></td><td>"[Frase clave del hook]"</td></tr>
  <tr><td><strong>Efecto/Transición:</strong></td><td>[Zoom 1.1x / Shake / Flash / Ninguno]</td></tr>
  <tr><td><strong>Emoción transmitida:</strong></td><td>[Curiosidad / Sorpresa / Intriga]</td></tr>
</table>

<h4>📍 ESCENA 2: DESARROLLO PARTE 1 (0:03 - 0:XX)</h4>
<p><em>Referencia del guión: [Primera parte del desarrollo]</em></p>
<table>
  <tr><td><strong>Tipo de plano:</strong></td><td>[Descripción]</td></tr>
  <tr><td><strong>Movimiento de cámara:</strong></td><td>[Descripción]</td></tr>
  <tr><td><strong>Elementos visuales:</strong></td><td>[B-roll, producto, demos]</td></tr>
  <tr><td><strong>Texto en pantalla:</strong></td><td>"[Frase clave]"</td></tr>
  <tr><td><strong>Efecto/Transición:</strong></td><td>[Descripción]</td></tr>
  <tr><td><strong>Emoción transmitida:</strong></td><td>[Descripción]</td></tr>
</table>

<h4>📍 ESCENA 3: DESARROLLO PARTE 2 (0:XX - 0:XX)</h4>
<p><em>Referencia del guión: [Segunda parte del desarrollo]</em></p>
<table>
  <tr><td><strong>Tipo de plano:</strong></td><td>[Descripción]</td></tr>
  <tr><td><strong>Movimiento de cámara:</strong></td><td>[Descripción]</td></tr>
  <tr><td><strong>Elementos visuales:</strong></td><td>[Descripción]</td></tr>
  <tr><td><strong>Texto en pantalla:</strong></td><td>"[Frase clave]"</td></tr>
  <tr><td><strong>Efecto/Transición:</strong></td><td>[Descripción]</td></tr>
  <tr><td><strong>Emoción transmitida:</strong></td><td>[Descripción]</td></tr>
</table>

<h4>📍 ESCENA 4: BENEFICIO/PRUEBA (0:XX - 0:XX)</h4>
<p><em>Referencia del guión: [Sección de beneficio]</em></p>
<table>
  <tr><td><strong>Tipo de plano:</strong></td><td>[Descripción]</td></tr>
  <tr><td><strong>Movimiento de cámara:</strong></td><td>[Descripción]</td></tr>
  <tr><td><strong>Elementos visuales:</strong></td><td>[Producto, resultado, antes/después]</td></tr>
  <tr><td><strong>Texto en pantalla:</strong></td><td>"[Frase del beneficio]"</td></tr>
  <tr><td><strong>Efecto/Transición:</strong></td><td>[Descripción]</td></tr>
  <tr><td><strong>Emoción transmitida:</strong></td><td>[Transformación / Satisfacción]</td></tr>
</table>

<h4>📍 ESCENA 5: CIERRE/CTA (Últimos 3-5 seg)</h4>
<p><em>Referencia del guión: "{cta}"</em></p>
<table>
  <tr><td><strong>Tipo de plano:</strong></td><td>[Close-up o Medio]</td></tr>
  <tr><td><strong>Movimiento de cámara:</strong></td><td>[Zoom in sutil]</td></tr>
  <tr><td><strong>Elementos visuales:</strong></td><td>[Botón CTA, flecha, logo]</td></tr>
  <tr><td><strong>Texto en pantalla:</strong></td><td>"{cta}"</td></tr>
  <tr><td><strong>Efecto/Transición:</strong></td><td>[Bounce / Pulse / Destacado]</td></tr>
  <tr><td><strong>Emoción transmitida:</strong></td><td>[Urgencia / Invitación]</td></tr>
</table>

<h3>🎵 MÚSICA O AMBIENTACIÓN SUGERIDA</h3>
<table>
  <tr><td><strong>Género/Estilo:</strong></td><td>[Upbeat / Chill / Dramático / Trending]</td></tr>
  <tr><td><strong>BPM sugerido:</strong></td><td>[XX BPM]</td></tr>
  <tr><td><strong>Ejemplos de tracks:</strong></td><td>[Nombres o descripciones]</td></tr>
  <tr><td><strong>Volumen música:</strong></td><td>[-12dB a -15dB bajo la voz]</td></tr>
  <tr><td><strong>Volumen voz:</strong></td><td>[-3dB a -6dB]</td></tr>
</table>

<h4>🔊 SFX (Efectos de Sonido)</h4>
<ul>
  <li><strong>Hook:</strong> [Whoosh / Pop / Impact]</li>
  <li><strong>Transiciones:</strong> [Swoosh / Click]</li>
  <li><strong>Puntos clave:</strong> [Ding / Notification]</li>
  <li><strong>CTA:</strong> [Bell / Success sound]</li>
</ul>

<h3>📝 ESTILO DE SUBTÍTULOS / ANIMACIONES</h3>
<table>
  <tr><td><strong>Fuente:</strong></td><td>[Montserrat Bold / Poppins / Bebas Neue]</td></tr>
  <tr><td><strong>Tamaño:</strong></td><td>[Grande para móvil - 48-64px]</td></tr>
  <tr><td><strong>Color principal:</strong></td><td>[#FFFFFF con sombra]</td></tr>
  <tr><td><strong>Color destacado:</strong></td><td>[Color de marca para palabras clave]</td></tr>
  <tr><td><strong>Posición:</strong></td><td>[Centro-inferior / Centro / Siguiendo al hablante]</td></tr>
  <tr><td><strong>Animación:</strong></td><td>[Pop in / Typewriter / Word by word / Karaoke]</td></tr>
  <tr><td><strong>Palabras a destacar:</strong></td><td>[Lista de palabras clave del guión]</td></tr>
</table>

<h3>🎨 FILTROS O COLOR GRADING</h3>
<table>
  <tr><td><strong>Look general:</strong></td><td>[Natural / Warm / Cool / Vintage / High contrast]</td></tr>
  <tr><td><strong>Saturación:</strong></td><td>[+5% a +15%]</td></tr>
  <tr><td><strong>Contraste:</strong></td><td>[+5% a +10%]</td></tr>
  <tr><td><strong>Exposición:</strong></td><td>[+0.1 a +0.3 si es necesario]</td></tr>
  <tr><td><strong>Preset sugerido:</strong></td><td>[Nombre del preset o LUT]</td></tr>
</table>

<h3>✅ CHECKLIST DEL EDITOR</h3>
<ul>
  <li>[ ] Hook impactante en primer frame (sin intro)</li>
  <li>[ ] Cortes cada 2-3 segundos máximo</li>
  <li>[ ] Subtítulos sincronizados con el guión</li>
  <li>[ ] Palabras clave destacadas en color</li>
  <li>[ ] Música no compite con la voz</li>
  <li>[ ] SFX en puntos de impacto</li>
  <li>[ ] CTA visible mínimo 3 segundos</li>
  <li>[ ] Audio balanceado (voz clara)</li>
  <li>[ ] Safe zones respetadas (UI de redes)</li>
  <li>[ ] Duración final: [XX segundos]</li>
</ul>`,

  strategist: `🧠 ROL: Eres un ESTRATEGA DE CONTENIDO Y GROWTH HACKER experto en embudos de conversión, viralidad y performance.

Tu tarea es crear el BLOQUE 4 – ESTRATEGA con el análisis estratégico basado en el GUIÓN GENERADO.

⚠️ IMPORTANTE: Tu análisis debe partir del guión del Bloque 1 para determinar fase de embudo, hipótesis y métricas.

---
📦 CONTEXTO:
- Producto: {producto_nombre}
- Avatar ideal: {producto_avatar}
- Investigación: {producto_investigacion}
- Estrategia general: {producto_estrategia}
- País objetivo: {pais_objetivo}

🎯 ENFOQUE:
- Ángulo: {angulo_venta}
- Estructura: {estructura_narrativa}
- CTA del guión: {cta}

📄 DOCUMENTOS:
Research: {documento_research}
Brief: {documento_brief}

---
FORMATO DE ENTREGA (HTML estructurado):

<h2>🧠 BLOQUE 4 – ESTRATEGA</h2>

<h3>📊 FASE DEL EMBUDO</h3>
<table>
  <tr><td><strong>Fase:</strong></td><td>[ENGANCHE / SOLUCIÓN / FIDELIZAR / ENVOLVER]</td></tr>
  <tr><td><strong>Nivel TOFU/MOFU/BOFU:</strong></td><td>[Top / Middle / Bottom of Funnel]</td></tr>
  <tr><td><strong>Objetivo de la fase:</strong></td><td>[Qué buscamos lograr en esta etapa]</td></tr>
</table>

<h4>📍 Descripción de la Fase</h4>
<ul>
  <li><strong>ENGANCHE (TOFU):</strong> Captar atención, generar curiosidad, awareness</li>
  <li><strong>SOLUCIÓN (MOFU):</strong> Educar, mostrar beneficios, construir confianza</li>
  <li><strong>FIDELIZAR (BOFU):</strong> Convertir, generar urgencia, cerrar venta</li>
  <li><strong>ENVOLVER:</strong> Retención, comunidad, upsell, referidos</li>
</ul>
<p><strong>Este contenido está en fase:</strong> [Fase] porque [justificación basada en el guión]</p>

<h3>🎯 OBJETIVO ESTRATÉGICO DEL VIDEO</h3>
<table>
  <tr><td><strong>Objetivo principal:</strong></td><td>[Awareness / Engagement / Tráfico / Leads / Conversión]</td></tr>
  <tr><td><strong>Objetivo secundario:</strong></td><td>[Branding / Educación / Prueba social]</td></tr>
  <tr><td><strong>Acción deseada:</strong></td><td>[Qué queremos que haga el usuario]</td></tr>
  <tr><td><strong>Conexión con negocio:</strong></td><td>[Cómo impacta en ventas/crecimiento]</td></tr>
</table>

<h3>🔬 HIPÓTESIS DEL MENSAJE / PRUEBA A/B</h3>
<table>
  <tr><th>Elemento</th><th>Versión A</th><th>Versión B</th><th>Qué medimos</th></tr>
  <tr><td>Hook</td><td>[Hook A del guión]</td><td>[Hook B del guión]</td><td>Retención 0-3s</td></tr>
  <tr><td>Ángulo</td><td>{angulo_venta}</td><td>[Ángulo alternativo]</td><td>CTR / Engagement</td></tr>
  <tr><td>CTA</td><td>{cta}</td><td>[CTA alternativo]</td><td>Conversión</td></tr>
</table>

<h4>📝 Hipótesis Principal</h4>
<p><em>"Si usamos [elemento del guión], entonces [resultado esperado] porque [razón basada en avatar/investigación]"</em></p>

<h3>💡 INSIGHT EMOCIONAL O RACIONAL</h3>
<table>
  <tr><td><strong>Tipo de insight:</strong></td><td>[Emocional / Racional / Mixto]</td></tr>
  <tr><td><strong>Insight principal:</strong></td><td>[El insight que activa el guión]</td></tr>
  <tr><td><strong>Pain point:</strong></td><td>[Dolor del avatar que ataca el guión]</td></tr>
  <tr><td><strong>Deseo activado:</strong></td><td>[Deseo que despierta]</td></tr>
  <tr><td><strong>Trigger emocional:</strong></td><td>[FOMO / Aspiración / Miedo / Pertenencia]</td></tr>
</table>

<h3>📈 MÉTRICAS DE ÉXITO ESPERADAS</h3>
<table>
  <tr><th>Métrica</th><th>Benchmark</th><th>Objetivo</th><th>Excelente</th></tr>
  <tr><td>Watch time (retención)</td><td>>40%</td><td>>50%</td><td>>60%</td></tr>
  <tr><td>Engagement rate</td><td>>3%</td><td>>5%</td><td>>8%</td></tr>
  <tr><td>Hook retention (3s)</td><td>>60%</td><td>>70%</td><td>>80%</td></tr>
  <tr><td>Shares</td><td>1% de views</td><td>2% de views</td><td>3%+</td></tr>
  <tr><td>Saves</td><td>0.5% de views</td><td>1% de views</td><td>2%+</td></tr>
  <tr><td>CTR (si ads)</td><td>>1%</td><td>>1.5%</td><td>>2%</td></tr>
</table>

<h3>🔄 SUGERENCIA DE CONTENIDO COMPLEMENTARIO</h3>
<h4>📍 Siguiente video en el embudo:</h4>
<table>
  <tr><td><strong>Tipo:</strong></td><td>[Respuesta a objeción / Profundización / Testimonio]</td></tr>
  <tr><td><strong>Ángulo:</strong></td><td>[Ángulo complementario]</td></tr>
  <tr><td><strong>Objetivo:</strong></td><td>[Mover al siguiente nivel del embudo]</td></tr>
  <tr><td><strong>Hook sugerido:</strong></td><td>"[Idea de hook para siguiente video]"</td></tr>
</table>

<h4>📍 Contenido para remarketing:</h4>
<ul>
  <li><strong>Para quienes vieron +50%:</strong> [Tipo de contenido]</li>
  <li><strong>Para quienes interactuaron:</strong> [Tipo de contenido]</li>
  <li><strong>Para quienes hicieron clic:</strong> [Tipo de contenido]</li>
</ul>

<h4>📍 Serie de contenido sugerida:</h4>
<ol>
  <li>Este video (actual)</li>
  <li>[Video 2 - descripción]</li>
  <li>[Video 3 - descripción]</li>
  <li>[Video 4 - cierre/conversión]</li>
</ol>`,

  trafficker: `💰 ROL: Eres un MEDIA BUYER Y TRAFFICKER EXPERTO en campañas de paid media para Meta Ads, TikTok Ads y Google Ads.

Tu tarea es crear el BLOQUE 3 – TRAFFICKER con todas las pautas publicitarias basadas en el GUIÓN GENERADO.

⚠️ IMPORTANTE: Todas las variaciones de anuncio deben usar los hooks y mensajes del guión del Bloque 1.

---
📦 CONTEXTO:
- Producto: {producto_nombre}
- Avatar: {producto_avatar}
- Investigación: {producto_investigacion}
- Ángulos disponibles: {producto_angulos}

🎯 ENFOQUE:
- CTA del guión: {cta}
- Ángulo: {angulo_venta}
- País: {pais_objetivo}

📄 DOCUMENTOS:
Brief: {documento_brief}
Research: {documento_research}

---
FORMATO DE ENTREGA (HTML estructurado):

<h2>💰 BLOQUE 3 – TRAFFICKER</h2>

<h3>🎯 ÁNGULO DE VENTA PRINCIPAL</h3>
<table>
  <tr><td><strong>Ángulo:</strong></td><td>[Emocional / Educativo / Aspiracional / Prueba social / Urgencia / Curiosidad]</td></tr>
  <tr><td><strong>Sub-ángulo:</strong></td><td>{angulo_venta}</td></tr>
  <tr><td><strong>Justificación:</strong></td><td>[Por qué este ángulo funciona para el avatar]</td></tr>
</table>

<h3>📊 OBJETIVO DE CAMPAÑA</h3>
<table>
  <tr><td><strong>Objetivo principal:</strong></td><td>[Clics / Leads / Awareness / Engagement / Conversiones / Ventas]</td></tr>
  <tr><td><strong>Tipo de campaña:</strong></td><td>[Prospección / Retargeting / Lookalike]</td></tr>
  <tr><td><strong>Optimización:</strong></td><td>[Landing page views / Add to cart / Purchase]</td></tr>
</table>

<h3>👥 PÚBLICO OBJETIVO Y SEGMENTACIÓN</h3>

<h4>Audiencia 1 - Intereses (Cold)</h4>
<table>
  <tr><td><strong>Edad:</strong></td><td>[XX-XX años]</td></tr>
  <tr><td><strong>Género:</strong></td><td>[Todos / Femenino / Masculino]</td></tr>
  <tr><td><strong>Ubicación:</strong></td><td>{pais_objetivo}</td></tr>
  <tr><td><strong>Intereses:</strong></td><td>[Lista de intereses relevantes]</td></tr>
  <tr><td><strong>Comportamientos:</strong></td><td>[Compradores online, etc.]</td></tr>
</table>

<h4>Audiencia 2 - Lookalike</h4>
<table>
  <tr><td><strong>Base:</strong></td><td>[Compradores / Leads / Visitantes web]</td></tr>
  <tr><td><strong>Porcentaje:</strong></td><td>[1-3% para testing]</td></tr>
  <tr><td><strong>Ubicación:</strong></td><td>{pais_objetivo}</td></tr>
</table>

<h4>Audiencia 3 - Retargeting</h4>
<table>
  <tr><td><strong>Fuente:</strong></td><td>[Visitantes web / Engagement IG/FB / Video viewers]</td></tr>
  <tr><td><strong>Ventana:</strong></td><td>[7-30 días]</td></tr>
  <tr><td><strong>Exclusiones:</strong></td><td>[Compradores recientes]</td></tr>
</table>

<h3>📱 FORMATO DE ANUNCIO RECOMENDADO</h3>
<table>
  <tr><th>Plataforma</th><th>Formato</th><th>Ubicación</th><th>Prioridad</th></tr>
  <tr><td>Meta</td><td>Reels / Stories</td><td>IG Reels, IG Stories, FB Reels</td><td>Alta</td></tr>
  <tr><td>Meta</td><td>Feed</td><td>IG Feed, FB Feed</td><td>Media</td></tr>
  <tr><td>TikTok</td><td>In-Feed Video</td><td>For You Page</td><td>Alta</td></tr>
  <tr><td>YouTube</td><td>Shorts</td><td>Shorts Feed</td><td>Media</td></tr>
</table>

<h3>📢 CTA PUBLICITARIO PRINCIPAL</h3>
<table>
  <tr><td><strong>CTA del guión:</strong></td><td>{cta}</td></tr>
  <tr><td><strong>Botón Meta:</strong></td><td>[Más información / Comprar / Registrarse]</td></tr>
  <tr><td><strong>Botón TikTok:</strong></td><td>[Learn More / Shop Now]</td></tr>
</table>

<h3>🔥 3 VARIACIONES DE ANUNCIO (Hook + Copy corto)</h3>

<h4>Variación A - Hook 1 del guión</h4>
<p><strong>Hook:</strong> "[Primer hook del guión]"</p>
<p><strong>Copy:</strong> [Desarrollo breve 1-2 líneas] + {cta}</p>
<p><strong>Ángulo:</strong> [Tipo de ángulo]</p>

<h4>Variación B - Hook 2 del guión</h4>
<p><strong>Hook:</strong> "[Segundo hook del guión]"</p>
<p><strong>Copy:</strong> [Desarrollo breve 1-2 líneas] + {cta}</p>
<p><strong>Ángulo:</strong> [Tipo de ángulo]</p>

<h4>Variación C - Hook 3 del guión</h4>
<p><strong>Hook:</strong> "[Tercer hook del guión]"</p>
<p><strong>Copy:</strong> [Desarrollo breve 1-2 líneas] + {cta}</p>
<p><strong>Ángulo:</strong> [Tipo de ángulo]</p>

<h3>📝 4 VARIACIONES DE COPY LARGO PARA ADS</h3>

<h4>1. Copy Emocional</h4>
<p><em>[Copy de 3-4 líneas enfocado en emociones, dolor/deseo, transformación personal. Basado en el mensaje del guión.]</em></p>

<h4>2. Copy Educativo</h4>
<p><em>[Copy de 3-4 líneas enfocado en información, datos, cómo funciona. Basado en beneficios del guión.]</em></p>

<h4>3. Copy Storytelling</h4>
<p><em>[Copy de 4-5 líneas contando una historia breve. Inspirado en la narrativa del guión.]</em></p>

<h4>4. Copy Directo</h4>
<p><em>[Copy de 2-3 líneas directo al grano. Beneficio + CTA. Basado en el cierre del guión.]</em></p>

<h3>📊 KPIs A MEDIR</h3>
<table>
  <tr><th>KPI</th><th>Benchmark</th><th>Objetivo</th><th>Excelente</th></tr>
  <tr><td>CTR (Click-through rate)</td><td>>0.8%</td><td>>1.5%</td><td>>2.5%</td></tr>
  <tr><td>CPL (Cost per lead)</td><td>Según industria</td><td>[Monto]</td><td>[Monto]</td></tr>
  <tr><td>CPC (Cost per click)</td><td><$1.50</td><td><$1.00</td><td><$0.50</td></tr>
  <tr><td>ROAS</td><td>>1.5x</td><td>>2.5x</td><td>>4x</td></tr>
  <tr><td>CPM</td><td><$15</td><td><$10</td><td><$7</td></tr>
  <tr><td>Video retention (3s)</td><td>>50%</td><td>>65%</td><td>>75%</td></tr>
  <tr><td>Video retention (50%)</td><td>>25%</td><td>>35%</td><td>>45%</td></tr>
</table>

<h3>💵 PRESUPUESTO SUGERIDO</h3>
<table>
  <tr><th>Fase</th><th>Presupuesto/día</th><th>Duración</th><th>Objetivo</th></tr>
  <tr><td>Testing inicial</td><td>$20-50 USD</td><td>3-5 días</td><td>Validar creative</td></tr>
  <tr><td>Validación</td><td>$50-100 USD</td><td>7 días</td><td>Confirmar performance</td></tr>
  <tr><td>Escala</td><td>Variable (2-3x)</td><td>Ongoing</td><td>Maximizar resultados</td></tr>
</table>`,

  designer: `🎨 ROL: Eres un DISEÑADOR GRÁFICO Y MOTION DESIGNER experto en contenido visual para redes sociales.

Tu tarea es crear el BLOQUE 5 – DISEÑADOR con todas las pautas de diseño basadas en el GUIÓN GENERADO.

⚠️ IMPORTANTE: Todos los textos, thumbnails y assets deben reflejar el mensaje y frases del guión del Bloque 1.

---
📦 CONTEXTO:
- Producto: {producto_nombre}
- Avatar: {producto_avatar}
- País: {pais_objetivo}

🎯 ENFOQUE:
- CTA del guión: {cta}
- Ángulo: {angulo_venta}

📄 DOCUMENTOS:
Brief: {documento_brief}
Onboarding: {documento_onboarding}

---
FORMATO DE ENTREGA (HTML estructurado):

<h2>🎨 BLOQUE 5 – DISEÑADOR</h2>

<h3>🎨 LINEAMIENTO GRÁFICO</h3>

<h4>Paleta de Colores</h4>
<table>
  <tr><th>Uso</th><th>Color</th><th>HEX</th><th>Aplicación</th></tr>
  <tr><td>Primario</td><td>[Nombre]</td><td>#XXXXXX</td><td>CTAs, acentos, palabras clave</td></tr>
  <tr><td>Secundario</td><td>[Nombre]</td><td>#XXXXXX</td><td>Fondos, elementos de apoyo</td></tr>
  <tr><td>Acento</td><td>[Nombre]</td><td>#XXXXXX</td><td>Destacados, alertas</td></tr>
  <tr><td>Texto principal</td><td>[Nombre]</td><td>#FFFFFF</td><td>Subtítulos, headlines</td></tr>
  <tr><td>Texto secundario</td><td>[Nombre]</td><td>#XXXXXX</td><td>Descripciones, secundarios</td></tr>
</table>

<h4>Tipografía</h4>
<table>
  <tr><th>Uso</th><th>Fuente</th><th>Peso</th><th>Tamaño</th></tr>
  <tr><td>Headlines/Hooks</td><td>[Montserrat/Bebas Neue/Poppins]</td><td>Bold/Black</td><td>48-64px</td></tr>
  <tr><td>Subtítulos</td><td>[Fuente]</td><td>SemiBold</td><td>32-40px</td></tr>
  <tr><td>Cuerpo</td><td>[Fuente]</td><td>Regular</td><td>24-32px</td></tr>
  <tr><td>CTA</td><td>[Fuente]</td><td>Bold + MAYÚSCULAS</td><td>36-48px</td></tr>
</table>

<h4>Estilo Visual / Mood</h4>
<ul>
  <li><strong>Estética general:</strong> [UGC orgánico / Producido minimalista / Bold y colorido / Premium]</li>
  <li><strong>Feeling:</strong> [Moderno / Retro / Minimalista / Maximalista / Playful]</li>
  <li><strong>Atmósfera:</strong> [Energética / Tranquila / Urgente / Inspiradora]</li>
</ul>

<h3>🖼️ REFERENCIAS VISUALES (Look & Feel UGC)</h3>
<ul>
  <li><strong>Referencia 1:</strong> [Descripción del estilo - Creator X en TikTok]</li>
  <li><strong>Referencia 2:</strong> [Descripción del estilo - Marca Y en Instagram]</li>
  <li><strong>Referencia 3:</strong> [Descripción del estilo]</li>
  <li><strong>Lo que SÍ queremos:</strong> [Características visuales a replicar]</li>
  <li><strong>Lo que NO queremos:</strong> [Características visuales a evitar]</li>
</ul>

<h3>🧩 PLANTILLAS Y ELEMENTOS REUTILIZABLES</h3>

<h4>Stickers/Elementos</h4>
<ul>
  <li><strong>Sticker 1:</strong> [Emoji relevante + estilo]</li>
  <li><strong>Sticker 2:</strong> [Flecha animada para CTA]</li>
  <li><strong>Sticker 3:</strong> [Badge/Sello de oferta o beneficio]</li>
</ul>

<h4>Íconos</h4>
<ul>
  <li><strong>Estilo:</strong> [Línea / Sólido / Duotono]</li>
  <li><strong>Set recomendado:</strong> [Phosphor / Feather / Custom]</li>
  <li><strong>Íconos necesarios:</strong> [Lista según el guión]</li>
</ul>

<h4>Marcos/Overlays</h4>
<ul>
  <li><strong>Marco de video:</strong> [Descripción del borde o marco]</li>
  <li><strong>Overlay de texto:</strong> [Fondo semi-transparente, gradiente, etc.]</li>
  <li><strong>Lower third:</strong> [Diseño para nombre/usuario]</li>
</ul>

<h3>🏷️ LOGO Y BRANDING EN PANTALLA</h3>
<table>
  <tr><td><strong>Logo:</strong></td><td>[Versión a usar: full / isotipo / wordmark]</td></tr>
  <tr><td><strong>Tamaño:</strong></td><td>[Pequeño - no intrusivo]</td></tr>
  <tr><td><strong>Posición:</strong></td><td>[Esquina superior derecha / inferior izquierda]</td></tr>
  <tr><td><strong>Opacidad:</strong></td><td>[70-100%]</td></tr>
  <tr><td><strong>Aparición:</strong></td><td>[Siempre visible / Solo al final / Sutil]</td></tr>
</table>

<h3>📐 PROPORCIONES DE TEXTO Y JERARQUÍA VISUAL</h3>
<table>
  <tr><th>Elemento</th><th>Proporción pantalla</th><th>Posición</th><th>Duración</th></tr>
  <tr><td>Hook (texto grande)</td><td>30-40% del área</td><td>Centro o centro-superior</td><td>0-3 segundos</td></tr>
  <tr><td>Puntos clave</td><td>20-30% del área</td><td>Centro o tercio inferior</td><td>Según guión</td></tr>
  <tr><td>CTA</td><td>25-35% del área</td><td>Centro o centro-inferior</td><td>Últimos 3-5 seg</td></tr>
  <tr><td>Subtítulos</td><td>15-20% del área</td><td>Tercio inferior</td><td>Continuo</td></tr>
</table>

<h3>📍 UBICACIÓN DE CTA VISUAL / COPY DESTACADO</h3>
<p><strong>CTA del guión:</strong> "{cta}"</p>
<table>
  <tr><td><strong>Posición en pantalla:</strong></td><td>[Centro-inferior / Centro]</td></tr>
  <tr><td><strong>Estilo del texto:</strong></td><td>[Bold + Color primario + Sombra]</td></tr>
  <tr><td><strong>Elementos de apoyo:</strong></td><td>[Flecha pulsante / Botón animado / Subrayado]</td></tr>
  <tr><td><strong>Animación:</strong></td><td>[Bounce / Scale up / Slide in]</td></tr>
  <tr><td><strong>Fondo:</strong></td><td>[Caja de color / Gradiente / Sin fondo]</td></tr>
</table>

<h3>📱 ASSETS A CREAR (basados en el guión)</h3>

<h4>1. Thumbnail / Cover (1080x1080 o 1080x1920)</h4>
<ul>
  <li><strong>Texto principal:</strong> "[Frase del hook del guión]"</li>
  <li><strong>Imagen:</strong> [Frame del video / Foto del creador / Producto]</li>
  <li><strong>Elementos:</strong> [Emoji / Badge / Marco]</li>
  <li><strong>Estilo:</strong> [Alto contraste, legible en miniatura]</li>
</ul>

<h4>2. Textos en Pantalla (del guión)</h4>
<ul>
  <li><strong>Texto 1 (Hook):</strong> "[Frase del hook]" - Animación: [Pop in]</li>
  <li><strong>Texto 2 (Punto clave 1):</strong> "[Frase del desarrollo]" - Animación: [Slide]</li>
  <li><strong>Texto 3 (Punto clave 2):</strong> "[Frase del beneficio]" - Animación: [Fade]</li>
  <li><strong>Texto 4 (CTA):</strong> "{cta}" - Animación: [Bounce + Flecha]</li>
</ul>

<h4>3. End Card / CTA Animado</h4>
<ul>
  <li><strong>Texto principal:</strong> "{cta}"</li>
  <li><strong>Elementos:</strong> [Logo + Flecha + Botón]</li>
  <li><strong>Animación:</strong> [Secuencia de entrada]</li>
  <li><strong>Duración:</strong> [2-3 segundos]</li>
</ul>

<h3>✅ CHECKLIST DEL DISEÑADOR</h3>
<ul>
  <li>[ ] Paleta de colores consistente</li>
  <li>[ ] Tipografía legible en móvil</li>
  <li>[ ] Thumbnail con hook del guión</li>
  <li>[ ] Textos en pantalla reflejan el guión</li>
  <li>[ ] Safe zones respetadas (sin texto en bordes)</li>
  <li>[ ] CTA visual claro y destacado</li>
  <li>[ ] Assets en alta resolución (1080p mínimo)</li>
  <li>[ ] Archivos organizados y nombrados</li>
  <li>[ ] Versiones para diferentes plataformas</li>
</ul>`,

  admin: `📋 ROL: Eres un PROJECT MANAGER / ADMINISTRADOR experto en producción de contenido digital.

Tu tarea es crear el BLOQUE 6 – ADMINISTRADOR / PROJECT MANAGER con el plan de ejecución completo.

⚠️ IMPORTANTE: El cronograma y checklists deben coordinar todos los bloques anteriores (Creador, Editor, Trafficker, Estratega, Diseñador).

---
📦 CONTEXTO:
- Producto: {producto_nombre}
- País: {pais_objetivo}

🎯 ENFOQUE:
- CTA del guión: {cta}
- Ángulo: {angulo_venta}
- Estructura: {estructura_narrativa}

📄 DOCUMENTOS:
Brief: {documento_brief}
Estrategia: {producto_estrategia}

---
FORMATO DE ENTREGA (HTML estructurado):

<h2>📋 BLOQUE 6 – ADMINISTRADOR / PROJECT MANAGER</h2>

<h3>📅 CRONOGRAMA SUGERIDO</h3>
<table>
  <tr><th>Día</th><th>Fase</th><th>Tarea</th><th>Responsable</th><th>Entregable</th><th>Deadline</th></tr>
  <tr><td>1</td><td>Pre-producción</td><td>Revisión y aprobación del guión</td><td>Estratega + Cliente</td><td>Guión aprobado</td><td>[Hora]</td></tr>
  <tr><td>1</td><td>Pre-producción</td><td>Briefing al creador con guión</td><td>Admin</td><td>Brief enviado</td><td>[Hora]</td></tr>
  <tr><td>1</td><td>Pre-producción</td><td>Asignación de editor y diseñador</td><td>Admin</td><td>Equipo confirmado</td><td>[Hora]</td></tr>
  <tr><td>2-3</td><td>Producción</td><td>Grabación del video</td><td>Creador</td><td>Video raw</td><td>[Fecha]</td></tr>
  <tr><td>3</td><td>Producción</td><td>Subida de material raw</td><td>Creador</td><td>Archivos en Drive</td><td>[Hora]</td></tr>
  <tr><td>4</td><td>Post-producción</td><td>Edición según pautas Bloque 2</td><td>Editor</td><td>Video editado V1</td><td>[Fecha]</td></tr>
  <tr><td>4</td><td>Post-producción</td><td>Creación de assets según Bloque 5</td><td>Diseñador</td><td>Thumbnails + Textos</td><td>[Fecha]</td></tr>
  <tr><td>5</td><td>Post-producción</td><td>Integración de assets en video</td><td>Editor</td><td>Video editado V2</td><td>[Fecha]</td></tr>
  <tr><td>5</td><td>Revisión</td><td>QA interno</td><td>Admin</td><td>Feedback documentado</td><td>[Hora]</td></tr>
  <tr><td>6</td><td>Revisión</td><td>Correcciones (si aplica)</td><td>Editor</td><td>Video final</td><td>[Fecha]</td></tr>
  <tr><td>6-7</td><td>Aprobación</td><td>Envío a cliente para aprobación</td><td>Admin</td><td>Aprobación recibida</td><td>[Fecha]</td></tr>
  <tr><td>7-8</td><td>Publicación</td><td>Publicación orgánica según Bloque 4</td><td>Estratega</td><td>Posts en vivo</td><td>[Fecha + Hora]</td></tr>
  <tr><td>8</td><td>Publicación</td><td>Configuración de campaña según Bloque 3</td><td>Trafficker</td><td>Ads activos</td><td>[Fecha]</td></tr>
</table>

<h3>👥 RESPONSABLES POR TAREA</h3>
<table>
  <tr><th>Rol</th><th>Responsabilidades</th><th>Input que recibe</th><th>Output que entrega</th></tr>
  <tr><td>🧍‍♂️ Creador</td><td>Grabación del video según guión</td><td>Bloque 1 (Guión completo + Brief)</td><td>Video raw grabado</td></tr>
  <tr><td>🎬 Editor</td><td>Edición completa del video</td><td>Video raw + Bloque 2 (Pautas edición)</td><td>Video editado final</td></tr>
  <tr><td>💰 Trafficker</td><td>Configuración y gestión de campañas</td><td>Video final + Bloque 3 (Pautas ads)</td><td>Campañas activas + Reportes</td></tr>
  <tr><td>🧠 Estratega</td><td>Estrategia de publicación y análisis</td><td>Video final + Bloque 4 (Estrategia)</td><td>Posts publicados + Análisis</td></tr>
  <tr><td>🎨 Diseñador</td><td>Assets gráficos y visuales</td><td>Guión + Bloque 5 (Pautas diseño)</td><td>Thumbnails + Textos + Assets</td></tr>
  <tr><td>📋 Admin/PM</td><td>Coordinación y seguimiento</td><td>Todos los bloques</td><td>Proyecto completado</td></tr>
</table>

<h3>📦 ENTREGABLES ESPERADOS</h3>

<h4>Entregables del Creador:</h4>
<ul>
  <li>[ ] Video raw en alta calidad (1080p mínimo)</li>
  <li>[ ] Múltiples tomas de cada hook (A/B/C)</li>
  <li>[ ] Audio limpio y claro</li>
  <li>[ ] B-roll adicional (si aplica)</li>
</ul>

<h4>Entregables del Editor:</h4>
<ul>
  <li>[ ] Video editado principal (9:16)</li>
  <li>[ ] Versiones adicionales (1:1, 16:9 si aplica)</li>
  <li>[ ] Video con 3 variaciones de hook</li>
  <li>[ ] Archivo de proyecto editable</li>
</ul>

<h4>Entregables del Diseñador:</h4>
<ul>
  <li>[ ] Thumbnail principal (1080x1080)</li>
  <li>[ ] Thumbnail stories (1080x1920)</li>
  <li>[ ] Pack de textos animados</li>
  <li>[ ] Assets en formato editable (PSD/AI/Figma)</li>
</ul>

<h4>Entregables del Trafficker:</h4>
<ul>
  <li>[ ] 3 variaciones de ad configuradas</li>
  <li>[ ] Audiencias creadas</li>
  <li>[ ] Copies para cada variación</li>
  <li>[ ] Reporte de performance (semanal)</li>
</ul>

<h4>Entregables del Estratega:</h4>
<ul>
  <li>[ ] Posts publicados en todas las plataformas</li>
  <li>[ ] Captions y hashtags finales</li>
  <li>[ ] Comentario fijado</li>
  <li>[ ] Reporte de engagement (semanal)</li>
</ul>

<h3>📆 FECHA ESTIMADA DE ENTREGA</h3>
<table>
  <tr><td><strong>Inicio del proyecto:</strong></td><td>[Fecha]</td></tr>
  <tr><td><strong>Video raw listo:</strong></td><td>[Fecha + 2-3 días]</td></tr>
  <tr><td><strong>Video editado V1:</strong></td><td>[Fecha + 4 días]</td></tr>
  <tr><td><strong>Video final aprobado:</strong></td><td>[Fecha + 6-7 días]</td></tr>
  <tr><td><strong>Publicación:</strong></td><td>[Fecha + 7-8 días]</td></tr>
  <tr><td><strong>Ads activos:</strong></td><td>[Fecha + 8 días]</td></tr>
</table>

<h3>✅ CHECKLIST DE REVISIÓN FINAL</h3>

<h4>🎙️ VOZ / AUDIO</h4>
<ul>
  <li>[ ] Voz clara y audible</li>
  <li>[ ] Sin ruido de fondo molesto</li>
  <li>[ ] Volumen consistente</li>
  <li>[ ] Música no compite con la voz</li>
  <li>[ ] Pronunciación correcta del producto/marca</li>
</ul>

<h4>🖼️ IMAGEN / VIDEO</h4>
<ul>
  <li>[ ] Calidad de video (1080p mínimo)</li>
  <li>[ ] Iluminación adecuada</li>
  <li>[ ] Encuadre correcto (safe zones)</li>
  <li>[ ] Sin elementos distractores</li>
  <li>[ ] Color grading consistente</li>
</ul>

<h4>📝 COHERENCIA CON MARCA</h4>
<ul>
  <li>[ ] Tono de voz acorde a la marca</li>
  <li>[ ] Colores de marca respetados</li>
  <li>[ ] Logo visible (si aplica)</li>
  <li>[ ] Mensajes alineados con estrategia</li>
  <li>[ ] Sin errores de ortografía</li>
</ul>

<h4>📢 CTA CLARO</h4>
<ul>
  <li>[ ] CTA visible mínimo 3 segundos</li>
  <li>[ ] CTA coincide con objetivo: "{cta}"</li>
  <li>[ ] Fácil de entender y ejecutar</li>
  <li>[ ] Urgencia/motivación presente</li>
</ul>

<h4>⚡ TÉCNICO</h4>
<ul>
  <li>[ ] Formato correcto (9:16, 1:1, etc.)</li>
  <li>[ ] Duración dentro del rango sugerido</li>
  <li>[ ] Subtítulos sincronizados</li>
  <li>[ ] Archivo exportado correctamente</li>
  <li>[ ] Nombrado según convención</li>
</ul>

<h3>⚠️ RIESGOS Y MITIGACIÓN</h3>
<table>
  <tr><th>Riesgo</th><th>Probabilidad</th><th>Impacto</th><th>Mitigación</th></tr>
  <tr><td>Retraso en grabación</td><td>Media</td><td>Alto</td><td>Creador backup asignado + Comunicación proactiva</td></tr>
  <tr><td>Cambios al guión post-grabación</td><td>Alta</td><td>Alto</td><td>Máximo 1 ronda de cambios + Aprobación previa obligatoria</td></tr>
  <tr><td>Assets de diseño no listos</td><td>Baja</td><td>Medio</td><td>Diseño en paralelo con grabación</td></tr>
  <tr><td>Rechazo de cliente</td><td>Media</td><td>Alto</td><td>Preview parcial antes de finalizar</td></tr>
  <tr><td>Problemas técnicos de exportación</td><td>Baja</td><td>Medio</td><td>Checklist técnico antes de envío</td></tr>
</table>

<h3>💬 COMUNICACIÓN</h3>
<table>
  <tr><td><strong>Canal principal:</strong></td><td>[Slack / WhatsApp / Email]</td></tr>
  <tr><td><strong>Reunión de kick-off:</strong></td><td>[Fecha y hora]</td></tr>
  <tr><td><strong>Check-ins:</strong></td><td>[Frecuencia y formato]</td></tr>
  <tr><td><strong>Escalación:</strong></td><td>[A quién y cuándo]</td></tr>
</table>`,
};

export function StrategistScriptForm({ product, contentId, onScriptGenerated, organizationId: propOrgId, spherePhase }: StrategistScriptFormProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const organizationId = propOrgId || profile?.current_organization_id;
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [newHook, setNewHook] = useState("");
  const [promptsOpen, setPromptsOpen] = useState(false);
  
  // Load custom prompts from organization settings
  const { prompts: customPrompts, loading: loadingPrompts } = useScriptPrompts(organizationId);
  
  // Load enabled AI providers from organization settings
  const { getEnabledProviders, hasValidApiKey, loading: loadingAI } = useOrganizationAI(organizationId);
  
  // Check which providers are enabled (kreoon is always enabled)
  const enabledProviderKeys = useMemo(() => {
    const enabled = getEnabledProviders();
    return enabled.map(e => e.key);
  }, [getEnabledProviders]);

  // Check if a provider is enabled
  const isProviderEnabled = (providerValue: string) => {
    if (providerValue === 'kreoon') return true; // Always enabled
    return enabledProviderKeys.includes(providerValue);
  };
  
  // Document content from Drive
  const [documentContent, setDocumentContent] = useState<DocumentContent>({
    brief: "",
    onboarding: "",
    research: "",
  });
  const [docsLoaded, setDocsLoaded] = useState(false);

  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { key: "script", label: "🧍‍♂️ Bloque Creador (Guión)", status: "pending" },
    { key: "editor", label: "🎬 Bloque Editor", status: "pending" },
    { key: "trafficker", label: "💰 Bloque Trafficker", status: "pending" },
    { key: "strategist", label: "🧠 Bloque Estratega", status: "pending" },
    { key: "designer", label: "🎨 Bloque Diseñador", status: "pending" },
    { key: "admin", label: "📋 Bloque Admin/PM", status: "pending" },
  ]);

  const [formData, setFormData] = useState<ScriptFormData>({
    cta: "",
    sales_angle: "",
    hooks_count: "3",
    ideal_avatar: "",
    selected_pain: "",
    selected_desire: "",
    selected_objection: "",
    target_country: "",
    narrative_structure: "",
    additional_instructions: "",
    hooks: [],
    script_prompt: DEFAULT_PROMPTS.script,
    editor_prompt: DEFAULT_PROMPTS.editor,
    strategist_prompt: DEFAULT_PROMPTS.strategist,
    trafficker_prompt: DEFAULT_PROMPTS.trafficker,
    designer_prompt: DEFAULT_PROMPTS.designer,
    admin_prompt: DEFAULT_PROMPTS.admin,
    reference_transcription: "",
    video_strategies: "",
    ai_model: "google/gemini-2.5-flash",
    video_duration: "",
    target_platform: "",
    use_perplexity: false,
  });
  const [perplexityQueries, setPerplexityQueries] = useState<PerplexityQueriesState>({
    trends: true,
    hooks: true,
    competitors: false,
    audience: false,
  });
  const [customPerplexityQuery, setCustomPerplexityQuery] = useState("");

  // Track AI prefill status
  const [prefillStatus, setPrefillStatus] = useState<{
    isPrefilled: boolean;
    prefilledAt: string | null;
    fieldsLoaded: string[];
  }>({
    isPrefilled: false,
    prefilledAt: null,
    fieldsLoaded: [],
  });

  // Load prefill data from content record if available
  useEffect(() => {
    let cancelled = false;

    const loadPrefillData = async () => {
      if (!contentId) return;

      try {
        const { data: contentData, error } = await supabase
          .from('content')
          .select('ai_prefilled, ai_prefilled_at, selected_pain, selected_desire, selected_objection, target_country, narrative_structure, video_duration, ideal_avatar, sales_angle, suggested_hooks, cta, target_platform')
          .eq('id', contentId)
          .maybeSingle();

        if (error || !contentData || cancelled) return;

        // Check if this content was AI-prefilled
        if (contentData.ai_prefilled) {
          const fieldsLoaded: string[] = [];
          const updates: Partial<ScriptFormData> = {};

          // Load prefilled values into form if they exist and form fields are empty
          if (contentData.selected_pain) {
            updates.selected_pain = contentData.selected_pain;
            fieldsLoaded.push('dolor');
          }
          if (contentData.selected_desire) {
            updates.selected_desire = contentData.selected_desire;
            fieldsLoaded.push('deseo');
          }
          if (contentData.selected_objection) {
            updates.selected_objection = contentData.selected_objection;
            fieldsLoaded.push('objeción');
          }
          if (contentData.target_country) {
            updates.target_country = contentData.target_country;
            fieldsLoaded.push('país');
          }
          if (contentData.narrative_structure) {
            updates.narrative_structure = contentData.narrative_structure;
            fieldsLoaded.push('estructura');
          }
          if (contentData.video_duration) {
            updates.video_duration = contentData.video_duration;
            fieldsLoaded.push('duración');
          }
          if (contentData.ideal_avatar) {
            updates.ideal_avatar = contentData.ideal_avatar;
            fieldsLoaded.push('avatar');
          }
          if (contentData.sales_angle) {
            updates.sales_angle = contentData.sales_angle;
            fieldsLoaded.push('ángulo');
          }
          if (contentData.cta) {
            updates.cta = contentData.cta;
            fieldsLoaded.push('CTA');
          }
          if (contentData.target_platform) {
            updates.target_platform = contentData.target_platform;
            fieldsLoaded.push('plataforma');
          }
          // Handle suggested_hooks (JSONB array)
          if (contentData.suggested_hooks && Array.isArray(contentData.suggested_hooks)) {
            updates.hooks = contentData.suggested_hooks as string[];
            fieldsLoaded.push('hooks');
          }

          if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, ...updates }));
            setPrefillStatus({
              isPrefilled: true,
              prefilledAt: contentData.ai_prefilled_at,
              fieldsLoaded,
            });
          }
        }
      } catch (e) {
        console.error('[StrategistScriptForm] Error loading prefill data:', e);
      }
    };

    loadPrefillData();

    return () => {
      cancelled = true;
    };
  }, [contentId]);

  // Update prompts when custom prompts are loaded
  useEffect(() => {
    if (!loadingPrompts && customPrompts) {
      setFormData(prev => ({
        ...prev,
        script_prompt: customPrompts.script,
        editor_prompt: customPrompts.editor,
        strategist_prompt: customPrompts.strategist,
        trafficker_prompt: customPrompts.trafficker,
        designer_prompt: customPrompts.designer,
        admin_prompt: customPrompts.admin,
      }));
    }
  }, [customPrompts, loadingPrompts]);

  // No provider selection needed - using Kreoon AI

  // Pre-fill avatar from product if available
  useEffect(() => {
    if (product?.ideal_avatar) {
      const strippedAvatar = product.ideal_avatar.replace(/<[^>]*>/g, '').substring(0, 200);
      setFormData(prev => ({
        ...prev,
        ideal_avatar: strippedAvatar
      }));
    }
  }, [product]);

  // Cargar la investigación COMPLETA del producto (avatar_profiles + sales_angles_data + market_research)
  const [researchProduct, setResearchProduct] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchResearchProduct = async () => {
      if (!product?.id) {
        setResearchProduct(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, avatar_profiles, sales_angles_data, market_research, sales_angles, ideal_avatar")
          .eq("id", product.id)
          .maybeSingle();

        if (error) throw error;

        const normalized = (() => {
          if (!data) return null;
          let result = { ...(data as any) };
          
          // Parse market_research if it's a string
          const mr = result.market_research;
          if (typeof mr === "string") {
            try {
              result.market_research = JSON.parse(mr);
            } catch {
              // Keep as string if parse fails
            }
          }
          
          // Parse sales_angles_data if it's a string
          const sad = result.sales_angles_data;
          if (typeof sad === "string") {
            try {
              result.sales_angles_data = JSON.parse(sad);
            } catch {
              // Keep as string if parse fails
            }
          }
          
          // Parse avatar_profiles if it's a string
          const ap = result.avatar_profiles;
          if (typeof ap === "string") {
            try {
              result.avatar_profiles = JSON.parse(ap);
            } catch {
              // Keep as string if parse fails
            }
          }
          
          return result;
        })();

        if (!cancelled) setResearchProduct(normalized);
      } catch (e) {
        console.error("[StrategistScriptForm] Error fetching product research", e);
        if (!cancelled) setResearchProduct(null);
      }
    };

    fetchResearchProduct();

    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  const researchAvatars = useMemo(() => {
    const profiles = researchProduct?.avatar_profiles?.profiles;
    if (Array.isArray(profiles) && profiles.length) return profiles;

    const strategicAvatars = researchProduct?.market_research?.strategicAvatars;
    if (Array.isArray(strategicAvatars) && strategicAvatars.length) return strategicAvatars;

    return [];
  }, [researchProduct]);

  const researchAngles = useMemo(() => {
    const angles = researchProduct?.sales_angles_data?.angles;
    if (Array.isArray(angles) && angles.length) return angles;

    const salesAngles = researchProduct?.market_research?.salesAngles;
    if (Array.isArray(salesAngles) && salesAngles.length) return salesAngles;

    const fallback = (researchProduct?.sales_angles ?? product?.sales_angles) as any;
    if (Array.isArray(fallback) && fallback.length) return fallback.map((a: any) => ({ angle: a }));

    return [];
  }, [researchProduct, product?.sales_angles]);

  // Parsear ideal_avatar si es un JSON string para extraer JTBD
  const parsedIdealAvatar = useMemo(() => {
    const avatar = researchProduct?.ideal_avatar || product?.ideal_avatar;
    if (!avatar || typeof avatar !== 'string') return null;
    try {
      return JSON.parse(avatar);
    } catch {
      return null;
    }
  }, [researchProduct, product]);

  // Extraer dolores desde la investigación de mercado o ideal_avatar.jtbd
  const researchPains = useMemo(() => {
    // 1. Buscar en market_research.pains
    const pains = researchProduct?.market_research?.pains;
    if (Array.isArray(pains) && pains.length) return pains;

    // 2. Buscar en market_research.jtbd.pains
    const jtbdPains = researchProduct?.market_research?.jtbd?.pains;
    if (Array.isArray(jtbdPains) && jtbdPains.length) return jtbdPains;

    // 3. Buscar en ideal_avatar.jtbd.pains (JSON parseado)
    const avatarJtbdPains = parsedIdealAvatar?.jtbd?.pains;
    if (Array.isArray(avatarJtbdPains) && avatarJtbdPains.length) return avatarJtbdPains;

    return [];
  }, [researchProduct, parsedIdealAvatar]);

  // Extraer deseos desde la investigación de mercado o ideal_avatar.jtbd
  const researchDesires = useMemo(() => {
    // 1. Buscar en market_research.desires
    const desires = researchProduct?.market_research?.desires;
    if (Array.isArray(desires) && desires.length) return desires;

    // 2. Buscar en market_research.jtbd.desires
    const jtbdDesires = researchProduct?.market_research?.jtbd?.desires;
    if (Array.isArray(jtbdDesires) && jtbdDesires.length) return jtbdDesires;

    // 3. Buscar en ideal_avatar.jtbd.desires (JSON parseado)
    const avatarJtbdDesires = parsedIdealAvatar?.jtbd?.desires;
    if (Array.isArray(avatarJtbdDesires) && avatarJtbdDesires.length) return avatarJtbdDesires;

    return [];
  }, [researchProduct, parsedIdealAvatar]);

  // Extraer objeciones desde la investigación de mercado o ideal_avatar.jtbd
  const researchObjections = useMemo(() => {
    // 1. Buscar en market_research.objections
    const objections = researchProduct?.market_research?.objections;
    if (Array.isArray(objections) && objections.length) return objections;

    // 2. Buscar en market_research.jtbd.objections
    const jtbdObjections = researchProduct?.market_research?.jtbd?.objections;
    if (Array.isArray(jtbdObjections) && jtbdObjections.length) return jtbdObjections;

    // 3. Buscar en ideal_avatar.jtbd.objections (JSON parseado)
    const avatarJtbdObjections = parsedIdealAvatar?.jtbd?.objections;
    if (Array.isArray(avatarJtbdObjections) && avatarJtbdObjections.length) return avatarJtbdObjections;

    return [];
  }, [researchProduct, parsedIdealAvatar]);

  // Auto-fill sales_angle and narrative_structure from research when available
  useEffect(() => {
    // Only auto-fill if fields are empty and we have research data
    if (!researchProduct) return;
    
    setFormData(prev => {
      const updates: Partial<ScriptFormData> = {};
      
      // Auto-fill first sales angle if empty
      if (!prev.sales_angle) {
        const angles = researchProduct?.sales_angles_data?.angles;
        if (Array.isArray(angles) && angles.length > 0) {
          const firstAngle = angles[0];
          const angleText = firstAngle?.angle || firstAngle?.salesAngle || firstAngle?.name || "";
          if (angleText) {
            updates.sales_angle = angleText;
          }
        }
      }
      
      // Auto-fill narrative structure based on sales angle type if empty
      if (!prev.narrative_structure) {
        const angles = researchProduct?.sales_angles_data?.angles;
        if (Array.isArray(angles) && angles.length > 0) {
          const firstAngle = angles[0];
          const type = firstAngle?.type?.toLowerCase() || "";
          
          // Map angle type to narrative structure
          if (type.includes("problema") || type.includes("dolor")) {
            updates.narrative_structure = "problema-solucion";
          } else if (type.includes("transform") || type.includes("antes")) {
            updates.narrative_structure = "antes-despues";
          } else if (type.includes("testimon")) {
            updates.narrative_structure = "testimonio";
          } else if (type.includes("tutorial") || type.includes("educa")) {
            updates.narrative_structure = "tutorial";
          } else if (type.includes("urgencia") || type.includes("escasez")) {
            updates.narrative_structure = "urgencia";
          } else if (type.includes("prueba") || type.includes("social")) {
            updates.narrative_structure = "testimonio";
          } else {
            // Default to problema-solucion as it's most versatile
            updates.narrative_structure = "problema-solucion";
          }
        }
      }
      
      // Auto-suggest CTA from sales_angles_data.puv if empty
      if (!prev.cta) {
        const puv = researchProduct?.sales_angles_data?.puv;
        if (puv?.tangibleResult) {
          // Use tangible result as a suggestion for CTA
          updates.cta = "Descubre cómo lograrlo";
        }
      }
      
      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
  }, [researchProduct]);
  const fetchDocument = async (url: string): Promise<{ content: string; warning?: string }> => {
    if (!url) return { content: "" };
    
    try {
      const { data, error } = await supabase.functions.invoke("fetch-document", {
        body: { url },
      });

      if (error) {
        console.error("Error fetching document:", error);
        return { content: "", warning: error.message };
      }

      return { 
        content: data?.content || "", 
        warning: data?.warning 
      };
    } catch (error) {
      console.error("Error fetching document:", error);
      return { content: "", warning: error instanceof Error ? error.message : "Error desconocido" };
    }
  };

  // Fetch content from uploaded file or fallback to Drive URL
  const fetchDocumentContent = async (fileUrl: string | undefined, driveUrl: string | undefined): Promise<{ content: string; warning?: string; source?: string }> => {
    // Priority: uploaded file > drive URL
    if (fileUrl) {
      try {
        const response = await fetch(fileUrl);
        if (response.ok) {
          const text = await response.text();
          return { content: text, source: "file" };
        }
      } catch (error) {
        console.error("Error fetching uploaded file:", error);
      }
    }
    
    // Fallback to Drive URL
    if (driveUrl) {
      return { ...await fetchDocument(driveUrl), source: "drive" };
    }
    
    return { content: "" };
  };

  // Load all product documents
  const loadProductDocuments = async () => {
    if (!product) return;

    setLoadingDocs(true);
    const warnings: string[] = [];
    
    try {
      // Check for uploaded files first, then fall back to Drive URLs
      const [briefResult, onboardingResult, researchResult] = await Promise.all([
        fetchDocumentContent((product as any).brief_file_url, product.brief_url || undefined),
        fetchDocumentContent((product as any).onboarding_file_url, product.onboarding_url || undefined),
        fetchDocumentContent((product as any).research_file_url, product.research_url || undefined),
      ]);

      // Collect warnings
      if (briefResult.warning) warnings.push(`Brief: ${briefResult.warning}`);
      if (onboardingResult.warning) warnings.push(`Onboarding: ${onboardingResult.warning}`);
      if (researchResult.warning) warnings.push(`Research: ${researchResult.warning}`);

      setDocumentContent({
        brief: briefResult.content,
        onboarding: onboardingResult.content,
        research: researchResult.content,
      });
      setDocsLoaded(true);

      const loadedCount = [briefResult.content, onboardingResult.content, researchResult.content].filter(c => c.length > 0).length;
      const sources = [briefResult, onboardingResult, researchResult]
        .filter(r => r.content)
        .map(r => r.source === "file" ? "archivo" : "Drive");
      
      if (warnings.length > 0) {
        toast({
          title: `${loadedCount} documentos cargados`,
          description: warnings.join(". "),
          variant: loadedCount === 0 ? "destructive" : "default",
        });
      } else if (loadedCount > 0) {
        toast({
          title: "Documentos cargados",
          description: `Se cargaron ${loadedCount} documento(s) desde ${[...new Set(sources)].join(" y ")}`,
        });
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Error al cargar documentos",
        description: "Algunos documentos no pudieron ser cargados",
        variant: "destructive",
      });
    } finally {
      setLoadingDocs(false);
    }
  };


  const addHook = () => {
    if (newHook.trim() && formData.hooks.length < parseInt(formData.hooks_count)) {
      setFormData({
        ...formData,
        hooks: [...formData.hooks, newHook.trim()]
      });
      setNewHook("");
    }
  };

  const removeHook = (index: number) => {
    setFormData({
      ...formData,
      hooks: formData.hooks.filter((_, i) => i !== index)
    });
  };

  const updateStepStatus = (key: string, status: GenerationStep["status"]) => {
    setGenerationSteps(prev => 
      prev.map(step => step.key === key ? { ...step, status } : step)
    );
  };

  const resetSteps = () => {
    setGenerationSteps([
      { key: "script", label: "🧍‍♂️ Bloque Creador (Guión)", status: "pending" },
      { key: "editor", label: "🎬 Bloque Editor", status: "pending" },
      { key: "trafficker", label: "💰 Bloque Trafficker", status: "pending" },
      { key: "strategist", label: "🧠 Bloque Estratega", status: "pending" },
      { key: "designer", label: "🎨 Bloque Diseñador", status: "pending" },
      { key: "admin", label: "📋 Bloque Admin/PM", status: "pending" },
    ]);
  };

  const buildBaseContext = () => {
    const narrativeLabel = NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label || formData.narrative_structure;
    
    // Determine sphere phase info
    const sphereInfo = spherePhase ? getSpherePhaseInfo(spherePhase) : null;
    
    // Get business type
    const businessType = (product?.business_type as 'product_service' | 'personal_brand') || 'product_service';
    const isPersonalBrand = businessType === 'personal_brand';
    
    // Parse structured research data
    const researchData = product ? parseProductResearch({
      market_research: product.market_research,
      avatar_profiles: product.avatar_profiles,
      sales_angles: product.sales_angles,
      sales_angles_data: product.sales_angles_data,
      competitor_analysis: product.competitor_analysis,
      brief_data: product.brief_data,
    }) : null;
    
    // Format research for prompt
    const formattedResearch = researchData 
      ? formatResearchForPrompt(researchData, businessType)
      : '';
    
    // Get duration and platform labels
    const durationLabel = VIDEO_DURATIONS.find(d => d.value === formData.video_duration)?.label || formData.video_duration;
    const platformLabel = TARGET_PLATFORMS.find(p => p.value === formData.target_platform)?.label || formData.target_platform;
    
    let context = `${isPersonalBrand ? '🎯 MARCA PERSONAL' : '📦 PRODUCTO/SERVICIO'}: ${product?.name}
DESCRIPCIÓN: ${product?.description || 'No disponible'}
CTA: ${formData.cta}
ÁNGULO DE VENTA: ${formData.sales_angle}
ESTRUCTURA NARRATIVA: ${narrativeLabel}
PAÍS OBJETIVO: ${formData.target_country}
${formData.video_duration ? `DURACIÓN DEL VIDEO: ${durationLabel}` : ''}
${formData.target_platform ? `PLATAFORMA DESTINO: ${platformLabel}` : ''}
AVATAR/CLIENTE IDEAL: ${formData.ideal_avatar}

`;

    // Add research variables if selected
    if (formData.selected_pain || formData.selected_desire || formData.selected_objection) {
      context += `=== VARIABLES DE INVESTIGACIÓN SELECCIONADAS ===
`;
      if (formData.selected_pain) {
        context += `😰 DOLOR A EXPLOTAR: ${formData.selected_pain}
`;
      }
      if (formData.selected_desire) {
        context += `✨ DESEO A ACTIVAR: ${formData.selected_desire}
`;
      }
      if (formData.selected_objection) {
        context += `🚫 OBJECIÓN A ROMPER: ${formData.selected_objection}
`;
      }
      context += `
`;
    }

    // Add personal brand context
    if (isPersonalBrand) {
      context += `⚠️ IMPORTANTE - MARCA PERSONAL:
- El dueño de la marca será quien grabe el contenido (NO un creador externo)
- Los guiones deben estar en PRIMERA PERSONA ("Yo te enseño", "Mi método", etc.)
- El tono debe ser personal, auténtico y cercano
- Incluir referencias a la experiencia y trayectoria personal

`;
    }

    // Add detailed sphere phase context
    if (sphereInfo) {
      context += `=== FASE DEL MÉTODO ESFERA: ${sphereInfo.label} ===
🎯 OBJETIVO DE FASE: ${sphereInfo.objective}
👥 TIPO DE AUDIENCIA: ${sphereInfo.audience}
🎨 TONO RECOMENDADO: ${sphereInfo.tone}

📋 TÉCNICAS OBLIGATORIAS (usar al menos 2):
${sphereInfo.techniques.map((t, i) => `${i + 1}. ${t}`).join('\n')}

💬 FRASES/KEYWORDS SUGERIDAS:
${sphereInfo.keywords.map(k => `• "${k}"`).join('\n')}

📢 ESTILO DE CTA: ${sphereInfo.ctaStyle}

⚠️ IMPORTANTE: El guión DEBE estar 100% alineado con los objetivos de ${sphereInfo.label}.

`;
    }

    context += `ESTRATEGIA DEL PRODUCTO:
${product?.strategy || 'No disponible'}

${formattedResearch ? `=== INVESTIGACIÓN DE MERCADO DETALLADA ===
${formattedResearch}

` : `INVESTIGACIÓN DE MERCADO:
${product?.market_research || 'No disponible'}

`}ÁNGULOS DE VENTA DISPONIBLES:
${product?.sales_angles?.join(', ') || 'No definidos'}

HOOKS SUGERIDOS:
${formData.hooks.length > 0 ? formData.hooks.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'Generar automáticamente'}`;

    // Add document content if loaded
    if (documentContent.brief) {
      context += `\n\n--- BRIEF DEL CLIENTE ---\n${documentContent.brief.substring(0, 3000)}`;
    }
    if (documentContent.onboarding) {
      context += `\n\n--- ONBOARDING ---\n${documentContent.onboarding.substring(0, 3000)}`;
    }
    if (documentContent.research) {
      context += `\n\n--- INVESTIGACIÓN ---\n${documentContent.research.substring(0, 3000)}`;
    }

    if (formData.reference_transcription) {
      context += `\n\nTRANSCRIPCIÓN VIDEO DE REFERENCIA:\n${formData.reference_transcription}`;
    }
    if (formData.video_strategies) {
      context += `\n\nESTRATEGIAS/ESTRUCTURAS DE VIDEO:\n${formData.video_strategies}`;
    }
    if (formData.additional_instructions) {
      context += `\n\nINSTRUCCIONES ADICIONALES:\n${formData.additional_instructions}`;
    }

    return context;
  };

  const generateContent = async (
    type: "script" | "editor" | "strategist" | "trafficker" | "designer" | "admin",
    customPrompt: string,
    previousScript?: string
  ): Promise<string> => {
    const baseContext = buildBaseContext();
    
    let fullPrompt = `${customPrompt}\n\n---\nCONTEXTO:\n${baseContext}`;
    
    if (previousScript && type !== "script") {
      fullPrompt += `\n\n---\nGUIÓN GENERADO:\n${previousScript}`;
    }

    const { data, error } = await supabase.functions.invoke(CONTENT_AI_FUNCTION, {
      body: {
        action: formData.use_perplexity ? "research_and_generate" : "generate_script",
        organizationId,
        prompt: fullPrompt,
        product: {
          id: product?.id,
          name: product?.name,
          description: product?.description,
          strategy: product?.strategy,
          market_research: product?.market_research,
          ideal_avatar: product?.ideal_avatar,
          sales_angles: product?.sales_angles,
        },
        generation_type: type,
        ai_provider: "gemini",
        ai_model: formData.ai_model,
        use_perplexity: formData.use_perplexity,
        perplexity_queries: formData.use_perplexity ? perplexityQueries : undefined,
        custom_perplexity_query: formData.use_perplexity && customPerplexityQuery.trim() ? customPerplexityQuery.trim() : undefined,
        script_params: {
          cta: formData.cta,
          sales_angle: formData.sales_angle,
          hooks_count: formData.hooks_count,
          target_country: formData.target_country,
          narrative_structure: formData.narrative_structure,
          video_duration: formData.video_duration,
          target_platform: formData.target_platform,
          ideal_avatar: formData.ideal_avatar,
          platform: formData.target_platform || "TikTok",
          product_category: product?.name,
          video_strategies: formData.video_strategies,
          reference_transcription: formData.reference_transcription,
          hooks: formData.hooks,
          additional_instructions: formData.additional_instructions,
          document_brief: documentContent.brief,
          document_onboarding: documentContent.onboarding,
          document_research: documentContent.research,
        },
      },
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Respuesta vacía de la IA");
    if (data.error) throw new Error(data.error);

    return data.script || data.result || "";
  };

  const handleGenerate = async () => {
    if (!product) {
      toast({
        title: "Selecciona un producto",
        description: "Primero debes asociar un producto al proyecto",
        variant: "destructive",
      });
      return;
    }

    if (!formData.cta || !formData.sales_angle || !formData.narrative_structure) {
      toast({
        title: "Campos requeridos",
        description: "Completa CTA, Ángulo de venta y Estructura narrativa",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    resetSteps();

    const generatedContent: GeneratedContent = {
      script: "",
      editor_guidelines: "",
      strategist_guidelines: "",
      trafficker_guidelines: "",
      designer_guidelines: "",
      admin_guidelines: "",
    };

    const emitProgress = (patch: Partial<GeneratedContent>) => {
      console.log("[StrategistScriptForm] emitProgress", {
        script: patch.script?.length,
        editor: patch.editor_guidelines?.length,
        strategist: patch.strategist_guidelines?.length,
        trafficker: patch.trafficker_guidelines?.length,
        designer: patch.designer_guidelines?.length,
        admin: patch.admin_guidelines?.length,
      });
      onScriptGenerated({ ...generatedContent, ...patch });
    };

    try {
      // Step 1: Generate Script (Bloque Creador)
      updateStepStatus("script", "generating");
      generatedContent.script = await generateContent("script", formData.script_prompt);
      updateStepStatus("script", "done");
      emitProgress({ script: generatedContent.script });

      // Step 2: Generate Editor Guidelines
      updateStepStatus("editor", "generating");
      generatedContent.editor_guidelines = await generateContent("editor", formData.editor_prompt, generatedContent.script);
      updateStepStatus("editor", "done");
      emitProgress({ editor_guidelines: generatedContent.editor_guidelines });

      // Step 3: Generate Trafficker Guidelines
      updateStepStatus("trafficker", "generating");
      generatedContent.trafficker_guidelines = await generateContent("trafficker", formData.trafficker_prompt, generatedContent.script);
      updateStepStatus("trafficker", "done");
      emitProgress({ trafficker_guidelines: generatedContent.trafficker_guidelines });

      // Step 4: Generate Strategist Guidelines
      updateStepStatus("strategist", "generating");
      generatedContent.strategist_guidelines = await generateContent("strategist", formData.strategist_prompt, generatedContent.script);
      updateStepStatus("strategist", "done");
      emitProgress({ strategist_guidelines: generatedContent.strategist_guidelines });

      // Step 5: Generate Designer Guidelines
      updateStepStatus("designer", "generating");
      generatedContent.designer_guidelines = await generateContent("designer", formData.designer_prompt, generatedContent.script);
      updateStepStatus("designer", "done");
      emitProgress({ designer_guidelines: generatedContent.designer_guidelines });

      // Step 6: Generate Admin/PM Guidelines
      updateStepStatus("admin", "generating");
      generatedContent.admin_guidelines = await generateContent("admin", formData.admin_prompt, generatedContent.script);
      updateStepStatus("admin", "done");
      emitProgress({ admin_guidelines: generatedContent.admin_guidelines });

      toast({
        title: "Contenido generado exitosamente",
        description: "Guión y pautas generados con IA",
      });
    } catch (error) {
      console.error("Error:", error);
      const currentStep = generationSteps.find(s => s.status === "generating");
      if (currentStep) {
        updateStepStatus(currentStep.key, "error");
      }
      toast({
        title: "Error al generar",
        description: error instanceof Error ? error.message : "No se pudo generar el contenido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="p-6 border rounded-lg bg-muted/50 text-center">
        <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Selecciona un producto para poder crear el brief del guión
        </p>
      </div>
    );
  }

  const hasDocumentUrls = product.brief_url || product.onboarding_url || product.research_url;

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2 text-lg">
          <Wand2 className="h-5 w-5 text-primary" />
          Formulario de Guión
        </h4>
        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
          {AI_MODELS.find(m => m.value === formData.ai_model)?.label || "IA"}
        </Badge>
      </div>

      {/* AI Prefill Banner */}
      {prefillStatus.isPrefilled && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Formulario pre-llenado con IA
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Los campos fueron sugeridos automáticamente basándose en la investigación de mercado.
                {prefillStatus.fieldsLoaded.length > 0 && (
                  <> Campos: {prefillStatus.fieldsLoaded.join(', ')}.</>
                )}
              </p>
            </div>
            {prefillStatus.prefilledAt && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-600 shrink-0">
                {new Date(prefillStatus.prefilledAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Document Loading Section */}
      {hasDocumentUrls && (
        <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-primary" />
              <Label className="text-sm font-medium">Documentos del Producto</Label>
            </div>
            <div className="flex items-center gap-2">
              {docsLoaded && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Cargados
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadProductDocuments}
                disabled={loadingDocs}
              >
                {loadingDocs ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">{docsLoaded ? "Recargar" : "Cargar Docs"}</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {product.brief_url && (
              <Badge variant={documentContent.brief ? "default" : "secondary"}>
                Brief {documentContent.brief ? `(${Math.round(documentContent.brief.length / 100)}kb)` : ""}
              </Badge>
            )}
            {product.onboarding_url && (
              <Badge variant={documentContent.onboarding ? "default" : "secondary"}>
                Onboarding {documentContent.onboarding ? `(${Math.round(documentContent.onboarding.length / 100)}kb)` : ""}
              </Badge>
            )}
            {product.research_url && (
              <Badge variant={documentContent.research ? "default" : "secondary"}>
                Research {documentContent.research ? `(${Math.round(documentContent.research.length / 100)}kb)` : ""}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* AI Provider Selection */}
      <div className="p-4 rounded-lg bg-muted/50 border space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <Label className="text-sm font-medium">Modelo IA</Label>
        </div>
        
        <Select 
          value={formData.ai_model} 
          onValueChange={(v) => setFormData({ ...formData, ai_model: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar modelo" />
          </SelectTrigger>
          <SelectContent>
            {AI_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CTA */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" /> CTA (Llamado a la acción) *
          </Label>
          <Input
            value={formData.cta}
            onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
            placeholder="Ej: Haz clic en el link de la bio"
          />
        </div>

        {/* Ángulo de Venta */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Ángulo de Venta *
          </Label>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                <span className="truncate">
                  {formData.sales_angle || "Seleccionar ángulo..."}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 border rounded-lg bg-background p-2 space-y-1 max-h-60 overflow-y-auto">
              {researchAngles.map((a: any, idx: number) => {
                const angleText = a?.angle || a?.salesAngle || a?.name || "";
                if (!angleText) return null;

                const type = a?.type || a?.category;

                return (
                  <button
                    key={idx}
                    type="button"
                    className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                    onClick={() => setFormData(prev => ({ ...prev, sales_angle: angleText }))}
                  >
                    <span className="text-sm truncate">{angleText}</span>
                    {type ? (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {type}
                      </Badge>
                    ) : null}
                  </button>
                );
              })}

              {researchAngles.length === 0 && (
                <p className="text-sm text-muted-foreground p-2">
                  Selecciona un producto con investigación para ver los ángulos.
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Número de Hooks */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4" /> Cantidad de Hooks
          </Label>
          <Select 
            value={formData.hooks_count} 
            onValueChange={(v) => setFormData({ ...formData, hooks_count: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(n => (
                <SelectItem key={n} value={String(n)}>{n} Hook{n > 1 ? 's' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* País Objetivo */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> País Objetivo
          </Label>
          <Select 
            value={formData.target_country} 
            onValueChange={(v) => setFormData({ ...formData, target_country: v })}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar país..." /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Duración del Video */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Video className="h-4 w-4" /> Duración del Video
          </Label>
          <Select 
            value={formData.video_duration} 
            onValueChange={(v) => setFormData({ ...formData, video_duration: v })}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar duración..." /></SelectTrigger>
            <SelectContent>
              {VIDEO_DURATIONS.map((duration) => (
                <SelectItem key={duration.value} value={duration.value}>{duration.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Plataforma Destino */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" /> Plataforma Destino
          </Label>
          <Select 
            value={formData.target_platform} 
            onValueChange={(v) => setFormData({ ...formData, target_platform: v })}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar plataforma..." /></SelectTrigger>
            <SelectContent>
              {TARGET_PLATFORMS.map((platform) => (
                <SelectItem key={platform.value} value={platform.value}>{platform.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Perplexity Research */}
        <div className="space-y-4 md:col-span-2">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Search className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <Label className="text-sm font-medium">Investigación en tiempo real</Label>
                <p className="text-xs text-muted-foreground">
                  Usa Perplexity para buscar tendencias y hooks actuales
                </p>
              </div>
            </div>
            <Switch
              checked={formData.use_perplexity}
              onCheckedChange={(checked) => setFormData({ ...formData, use_perplexity: checked })}
            />
          </div>

          {formData.use_perplexity && (
            <div className="ml-4 space-y-2 animate-in slide-in-from-top-2">
              <p className="text-sm font-medium text-muted-foreground">¿Qué investigar?</p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={perplexityQueries.trends ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setPerplexityQueries((q) => ({ ...q, trends: !q.trends }))}
                >
                  📈 Tendencias actuales
                </Badge>
                <Badge
                  variant={perplexityQueries.hooks ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setPerplexityQueries((q) => ({ ...q, hooks: !q.hooks }))}
                >
                  🎣 Hooks efectivos
                </Badge>
                <Badge
                  variant={perplexityQueries.competitors ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setPerplexityQueries((q) => ({ ...q, competitors: !q.competitors }))}
                >
                  🏢 Competencia
                </Badge>
                <Badge
                  variant={perplexityQueries.audience ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setPerplexityQueries((q) => ({ ...q, audience: !q.audience }))}
                >
                  👥 Audiencia
                </Badge>
              </div>

              <Collapsible>
                <CollapsibleTrigger className="text-sm text-purple-400 hover:text-purple-300">
                  + Agregar búsqueda personalizada
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Textarea
                    placeholder="Ej: ¿Cuáles son los challenges virales de TikTok esta semana relacionados con skincare?"
                    value={customPerplexityQuery}
                    onChange={(e) => setCustomPerplexityQuery(e.target.value)}
                    className="mt-2"
                    rows={2}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        {/* Estructura Narrativa */}
        <div className="space-y-2 md:col-span-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Estructura Narrativa *
          </Label>
          <Select 
            value={formData.narrative_structure} 
            onValueChange={(v) => setFormData({ ...formData, narrative_structure: v })}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar estructura..." /></SelectTrigger>
            <SelectContent>
              {NARRATIVE_STRUCTURES.map((structure) => (
                <SelectItem key={structure.value} value={structure.value}>{structure.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Avatar Ideal */}
        <div className="space-y-2 md:col-span-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Avatar / Cliente Ideal
          </Label>
          <Textarea
            value={formData.ideal_avatar}
            onChange={(e) => setFormData({ ...formData, ideal_avatar: e.target.value })}
            placeholder="Describe al cliente ideal..."
            rows={2}
          />

          {/* Selector desplegable para avatares */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Seleccionar avatar ({researchAvatars.length})
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 border rounded-lg bg-background p-2 space-y-1 max-h-60 overflow-y-auto">
              {researchAvatars.slice(0, 5).map((a: any, idx: number) => {
                const name = a?.name || a?.avatarName || `Avatar ${idx + 1}`;
                const situation = a?.situation || a?.currentSituation || "";

                const formatted = [
                  `AVATAR: ${name}`,
                  situation ? `SITUACIÓN: ${situation}` : "",
                ]
                  .filter(Boolean)
                  .join("\n");

                return (
                  <button
                    key={idx}
                    type="button"
                    className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors"
                    onClick={() => setFormData(prev => ({ ...prev, ideal_avatar: formatted }))}
                  >
                    <p className="text-sm font-medium">{name}</p>
                    {situation ? (
                      <p className="text-xs text-muted-foreground line-clamp-1">{situation}</p>
                    ) : null}
                  </button>
                );
              })}

              {researchAvatars.length === 0 && (
                <p className="text-sm text-muted-foreground p-2">
                  Selecciona un producto con investigación para ver los avatares.
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Dolores */}
        <div className="space-y-2 md:col-span-2">
          <Label className="flex items-center gap-2">
            💔 Dolor Seleccionado
          </Label>
          <div className="flex gap-2">
            <Input
              value={formData.selected_pain}
              onChange={(e) => setFormData({ ...formData, selected_pain: e.target.value })}
              placeholder="Selecciona un dolor de la investigación..."
              className="flex-1"
            />
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <span className="flex items-center gap-1">
                    Dolores ({researchPains.length})
                  </span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute mt-2 border rounded-lg bg-background p-2 space-y-1 max-h-60 overflow-y-auto z-50 w-80 shadow-lg">
                {researchPains.map((pain: any, idx: number) => {
                  const painText = typeof pain === 'string' ? pain : (pain?.pain || pain?.description || pain?.text || `Dolor ${idx + 1}`);
                  const category = typeof pain === 'object' ? (pain?.category || pain?.type) : null;

                  return (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                      onClick={() => setFormData(prev => ({ ...prev, selected_pain: painText }))}
                    >
                      <span className="text-sm">{painText}</span>
                      {category && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {category}
                        </Badge>
                      )}
                    </button>
                  );
                })}

                {researchPains.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">
                    Selecciona un producto con investigación para ver los dolores.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Deseos */}
        <div className="space-y-2 md:col-span-2">
          <Label className="flex items-center gap-2">
            ✨ Deseo Seleccionado
          </Label>
          <div className="flex gap-2">
            <Input
              value={formData.selected_desire}
              onChange={(e) => setFormData({ ...formData, selected_desire: e.target.value })}
              placeholder="Selecciona un deseo de la investigación..."
              className="flex-1"
            />
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <span className="flex items-center gap-1">
                    Deseos ({researchDesires.length})
                  </span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute mt-2 border rounded-lg bg-background p-2 space-y-1 max-h-60 overflow-y-auto z-50 w-80 shadow-lg">
                {researchDesires.map((desire: any, idx: number) => {
                  const desireText = typeof desire === 'string' ? desire : (desire?.desire || desire?.description || desire?.text || `Deseo ${idx + 1}`);
                  const category = typeof desire === 'object' ? (desire?.category || desire?.type) : null;

                  return (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                      onClick={() => setFormData(prev => ({ ...prev, selected_desire: desireText }))}
                    >
                      <span className="text-sm">{desireText}</span>
                      {category && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {category}
                        </Badge>
                      )}
                    </button>
                  );
                })}

                {researchDesires.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">
                    Selecciona un producto con investigación para ver los deseos.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Objeciones */}
        <div className="space-y-2 md:col-span-2">
          <Label className="flex items-center gap-2">
            🚫 Objeción Seleccionada
          </Label>
          <div className="flex gap-2">
            <Input
              value={formData.selected_objection}
              onChange={(e) => setFormData({ ...formData, selected_objection: e.target.value })}
              placeholder="Selecciona una objeción de la investigación..."
              className="flex-1"
            />
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <span className="flex items-center gap-1">
                    Objeciones ({researchObjections.length})
                  </span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute mt-2 border rounded-lg bg-background p-2 space-y-1 max-h-60 overflow-y-auto z-50 w-80 shadow-lg">
                {researchObjections.map((objection: any, idx: number) => {
                  const objectionText = typeof objection === 'string' ? objection : (objection?.objection || objection?.description || objection?.text || `Objeción ${idx + 1}`);
                  const category = typeof objection === 'object' ? (objection?.category || objection?.type) : null;

                  return (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                      onClick={() => setFormData(prev => ({ ...prev, selected_objection: objectionText }))}
                    >
                      <span className="text-sm">{objectionText}</span>
                      {category && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {category}
                        </Badge>
                      )}
                    </button>
                  );
                })}

                {researchObjections.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">
                    Selecciona un producto con investigación para ver las objeciones.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>

      {/* Video Strategies */}
      <div className="space-y-2 pt-4 border-t">
        <Label className="flex items-center gap-2">
          <Video className="h-4 w-4" /> Estrategias / Estructuras de Video
        </Label>
        <Textarea
          value={formData.video_strategies}
          onChange={(e) => setFormData({ ...formData, video_strategies: e.target.value })}
          placeholder="Ej: POV, Storytime, ASMR, Unboxing, Tutorial rápido..."
          rows={2}
        />
      </div>

      {/* Reference Transcription */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" /> Transcripción Video de Referencia (opcional)
        </Label>
        <Textarea
          value={formData.reference_transcription}
          onChange={(e) => setFormData({ ...formData, reference_transcription: e.target.value })}
          placeholder="Pega aquí la transcripción de un video de referencia..."
          rows={3}
        />
      </div>

      {/* Hooks personalizados */}
      <div className="space-y-3 pt-4 border-t">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Hooks Sugeridos (opcional)
        </Label>
        
        <div className="flex gap-2">
          <Input
            value={newHook}
            onChange={(e) => setNewHook(e.target.value)}
            placeholder="Ej: ¿Sabías que el 80% de las personas...?"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHook())}
            disabled={formData.hooks.length >= parseInt(formData.hooks_count)}
          />
          <Button type="button" onClick={addHook} variant="outline" disabled={formData.hooks.length >= parseInt(formData.hooks_count)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {formData.hooks.length > 0 && (
          <div className="space-y-2">
            {formData.hooks.map((hook, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
                <span className="flex-1 text-sm">{hook}</span>
                <button type="button" onClick={() => removeHook(idx)} className="p-1 hover:bg-destructive/20 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instrucciones adicionales */}
      <div className="space-y-2">
        <Label>Instrucciones adicionales</Label>
        <Textarea
          value={formData.additional_instructions}
          onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
          placeholder="Agrega cualquier indicación especial..."
          rows={2}
        />
      </div>

      {/* Custom Prompts Section */}
      <Collapsible open={promptsOpen} onOpenChange={setPromptsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Personalizar Prompts de IA
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${promptsOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt para Guión</Label>
            <Textarea
              value={formData.script_prompt}
              onChange={(e) => setFormData({ ...formData, script_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt para Pautas del Editor</Label>
            <Textarea
              value={formData.editor_prompt}
              onChange={(e) => setFormData({ ...formData, editor_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt para Pautas del Estratega</Label>
            <Textarea
              value={formData.strategist_prompt}
              onChange={(e) => setFormData({ ...formData, strategist_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt para Pautas del Trafficker</Label>
            <Textarea
              value={formData.trafficker_prompt}
              onChange={(e) => setFormData({ ...formData, trafficker_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">🎨 Prompt para Pautas del Diseñador</Label>
            <Textarea
              value={formData.designer_prompt}
              onChange={(e) => setFormData({ ...formData, designer_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">📋 Prompt para Pautas del Admin/PM</Label>
            <Textarea
              value={formData.admin_prompt}
              onChange={(e) => setFormData({ ...formData, admin_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFormData(prev => ({
              ...prev,
              script_prompt: DEFAULT_PROMPTS.script,
              editor_prompt: DEFAULT_PROMPTS.editor,
              strategist_prompt: DEFAULT_PROMPTS.strategist,
              trafficker_prompt: DEFAULT_PROMPTS.trafficker,
              designer_prompt: DEFAULT_PROMPTS.designer,
              admin_prompt: DEFAULT_PROMPTS.admin,
            }))}
          >
            Restaurar prompts por defecto
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Generation Progress */}
      {loading && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-3">Progreso (IA):</p>
          {generationSteps.map((step) => (
            <div key={step.key} className="flex items-center gap-3">
              {step.status === "pending" && <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />}
              {step.status === "generating" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {step.status === "done" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {step.status === "error" && <X className="h-5 w-5 text-destructive" />}
              <span className={`text-sm ${step.status === "generating" ? "text-primary font-medium" : ""}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Generate Button */}
      <Button onClick={handleGenerate} disabled={loading} className="w-full" size="lg">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generando con IA...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Generar Todo con IA
          </>
        )}
      </Button>
    </div>
  );
}
