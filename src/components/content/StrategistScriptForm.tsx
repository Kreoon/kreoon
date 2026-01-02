import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Sparkles, Loader2, Target, Users, Globe, FileText, 
  MessageSquare, ListOrdered, Plus, X, Wand2, Settings2,
  Video, ChevronDown, CheckCircle2, Bot, RefreshCw, FileSearch
} from "lucide-react";

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
  ai_provider: "lovable" | "openai" | "anthropic";
  ai_model: string;
}

interface GenerationStep {
  key: "script" | "editor" | "strategist" | "trafficker" | "designer" | "admin";
  label: string;
  status: "pending" | "generating" | "done" | "error";
}

const AI_PROVIDERS = [
  { 
    value: "lovable", 
    label: "Lovable AI", 
    description: "Google Gemini & OpenAI GPT-5",
    models: [
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Recomendado)" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Rápido)" },
      { value: "openai/gpt-5", label: "GPT-5" },
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    ]
  },
  { 
    value: "openai", 
    label: "OpenAI GPT", 
    description: "Requiere API Key",
    models: [
      { value: "gpt-4o", label: "GPT-4o (Recomendado)" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini (Rápido)" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Económico)" },
    ]
  },
  { 
    value: "anthropic", 
    label: "Anthropic Claude", 
    description: "Requiere API Key",
    models: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (Recomendado)" },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (Rápido)" },
    ]
  },
];

const NARRATIVE_STRUCTURES = [
  { value: "problema-solucion", label: "Problema → Solución" },
  { value: "historia-personal", label: "Historia Personal" },
  { value: "antes-despues", label: "Antes/Después" },
  { value: "tutorial", label: "Tutorial paso a paso" },
  { value: "testimonio", label: "Testimonio" },
  { value: "urgencia", label: "Urgencia/Escasez" },
  { value: "educativo", label: "Educativo/Informativo" },
  { value: "entretenimiento", label: "Entretenimiento" },
];

const COUNTRIES = [
  "México", "Colombia", "Argentina", "España", "Chile", "Perú", "Estados Unidos (Latino)", "Otro",
];

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

export function StrategistScriptForm({ product, contentId, onScriptGenerated, organizationId: propOrgId }: StrategistScriptFormProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const organizationId = propOrgId || profile?.current_organization_id;
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [newHook, setNewHook] = useState("");
  const [promptsOpen, setPromptsOpen] = useState(false);
  
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
    ai_provider: "lovable",
    ai_model: "google/gemini-2.5-flash",
  });

  const currentProvider = AI_PROVIDERS.find(p => p.value === formData.ai_provider);
  const availableModels = currentProvider?.models || [];

  // Update model when provider changes
  useEffect(() => {
    const provider = AI_PROVIDERS.find(p => p.value === formData.ai_provider);
    if (provider && provider.models.length > 0) {
      setFormData(prev => ({
        ...prev,
        ai_model: provider.models[0].value
      }));
    }
  }, [formData.ai_provider]);

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

  // Fetch document from URL - returns { content, warning }
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

  // Generate optimized prompts with AI
  const generateOptimizedPrompts = async () => {
    if (!product) return;

    setLoadingPrompts(true);
    try {
      const contextInfo = `
INFORMACIÓN DEL PRODUCTO:
- Nombre: ${product.name}
- Descripción: ${product.description || "No disponible"}
- Estrategia: ${product.strategy || "No disponible"}
- Investigación de mercado: ${product.market_research || "No disponible"}
- Avatar ideal: ${product.ideal_avatar || "No disponible"}
- Ángulos de venta: ${product.sales_angles?.join(", ") || "No definidos"}

${documentContent.brief ? `BRIEF DEL CLIENTE:\n${documentContent.brief.substring(0, 2000)}` : ""}

${documentContent.onboarding ? `ONBOARDING:\n${documentContent.onboarding.substring(0, 2000)}` : ""}

${documentContent.research ? `INVESTIGACIÓN:\n${documentContent.research.substring(0, 2000)}` : ""}
`;

      const promptGenerationRequest = `
Eres un experto en prompt engineering para generación de contenido con IA.

Basándote en la información del producto, genera 6 prompts PROFESIONALES y COMPLETOS.

${contextInfo}

REQUISITOS OBLIGATORIOS PARA CADA PROMPT:
1. Debe comenzar con un ROL específico (ej: "🎬 ROL: Eres un GUIONISTA EXPERTO en...")
2. Debe incluir sección de VARIABLES DE PLANTILLA que se reemplazarán automáticamente
3. Debe incluir INSTRUCCIONES DETALLADAS de qué generar
4. Debe incluir FORMATO DE ENTREGA en HTML estructurado

VARIABLES DISPONIBLES (DEBEN INCLUIRSE EN LOS PROMPTS):
- {producto_nombre} - Nombre del producto
- {producto_descripcion} - Descripción del producto  
- {producto_estrategia} - Estrategia de marketing
- {producto_investigacion} - Investigación de mercado
- {producto_avatar} - Avatar/cliente ideal
- {producto_angulos} - Ángulos de venta disponibles
- {cta} - Llamado a la acción
- {angulo_venta} - Ángulo de venta seleccionado
- {estructura_narrativa} - Estructura narrativa
- {pais_objetivo} - País objetivo
- {cantidad_hooks} - Cantidad de hooks
- {hooks_sugeridos} - Hooks sugeridos por usuario
- {documento_brief} - Contenido del brief
- {documento_onboarding} - Contenido del onboarding
- {documento_research} - Contenido del research
- {instrucciones_adicionales} - Instrucciones adicionales
- {estrategias_video} - Estrategias de video

GENERA 6 PROMPTS PARA:
1. GUIÓN (script_prompt): ROL de Guionista experto en contenido viral. Incluir variables de producto, CTA, ángulo, estructura narrativa. Formato HTML con hooks, desarrollo, cierre.

2. EDITOR (editor_prompt): ROL de Editor de video profesional. Incluir variables de producto y documentos. Formato HTML con storyboard, audio, checklist.

3. ESTRATEGA (strategist_prompt): ROL de Estratega de contenido y growth hacker. Incluir variables de producto, país, avatar. Formato HTML con timing, hashtags, captions, métricas.

4. TRAFFICKER (trafficker_prompt): ROL de Media buyer experto. Incluir variables de producto, CTA, país, ángulos. Formato HTML con segmentación, variaciones, KPIs.

5. DISEÑADOR (designer_prompt): ROL de Diseñador gráfico y motion designer. Incluir variables de producto y documentos. Formato HTML con paleta, tipografía, assets, checklist.

6. ADMIN/PM (admin_prompt): ROL de Project Manager. Incluir variables de producto, estructura. Formato HTML con cronograma, equipo, checklists por fase, riesgos.

Responde SOLO en formato JSON:
{
  "script_prompt": "🎬 ROL: Eres un GUIONISTA EXPERTO...\\n\\n📦 CONTEXTO:\\n- Producto: {producto_nombre}\\n...",
  "editor_prompt": "🎬 ROL: Eres un EDITOR DE VIDEO PROFESIONAL...\\n\\n📦 CONTEXTO:\\n- Producto: {producto_nombre}\\n...",
  "strategist_prompt": "🧠 ROL: Eres un ESTRATEGA DE CONTENIDO...\\n\\n📦 CONTEXTO:\\n- Producto: {producto_nombre}\\n...",
  "trafficker_prompt": "💰 ROL: Eres un MEDIA BUYER EXPERTO...\\n\\n📦 CONTEXTO:\\n- Producto: {producto_nombre}\\n...",
  "designer_prompt": "🎨 ROL: Eres un DISEÑADOR GRÁFICO...\\n\\n📦 CONTEXTO:\\n- Producto: {producto_nombre}\\n...",
  "admin_prompt": "📋 ROL: Eres un PROJECT MANAGER...\\n\\n📦 CONTEXTO:\\n- Producto: {producto_nombre}\\n..."
}

IMPORTANTE: Cada prompt debe ser EXTENSO (mínimo 500 palabras), con todas las variables relevantes y formato HTML detallado.
`;

      const { data, error } = await supabase.functions.invoke(CONTENT_AI_FUNCTION, {
        body: {
          action: "generate_script",
          organizationId,
          prompt: promptGenerationRequest,
          product: { id: product.id, name: product.name },
          ai_provider: formData.ai_provider,
          ai_model: formData.ai_model,
        },
      });

      if (error) throw new Error(error.message);

      const responseText = data?.script || data?.result || "";
      
      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedPrompts = JSON.parse(jsonMatch[0]);
        setFormData(prev => ({
          ...prev,
          script_prompt: parsedPrompts.script_prompt || prev.script_prompt,
          editor_prompt: parsedPrompts.editor_prompt || prev.editor_prompt,
          strategist_prompt: parsedPrompts.strategist_prompt || prev.strategist_prompt,
          trafficker_prompt: parsedPrompts.trafficker_prompt || prev.trafficker_prompt,
          designer_prompt: parsedPrompts.designer_prompt || prev.designer_prompt,
          admin_prompt: parsedPrompts.admin_prompt || prev.admin_prompt,
        }));
        setPromptsOpen(true);
        toast({
          title: "Prompts generados",
          description: "Se han creado prompts optimizados basados en la información del producto",
        });
      } else {
        throw new Error("No se pudo parsear la respuesta de la IA");
      }
    } catch (error) {
      console.error("Error generating prompts:", error);
      toast({
        title: "Error al generar prompts",
        description: error instanceof Error ? error.message : "No se pudieron generar los prompts",
        variant: "destructive",
      });
    } finally {
      setLoadingPrompts(false);
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
    
    let context = `PRODUCTO: ${product?.name}
DESCRIPCIÓN: ${product?.description || 'No disponible'}
CTA: ${formData.cta}
ÁNGULO DE VENTA: ${formData.sales_angle}
ESTRUCTURA NARRATIVA: ${narrativeLabel}
PAÍS OBJETIVO: ${formData.target_country}
AVATAR/CLIENTE IDEAL: ${formData.ideal_avatar}

ESTRATEGIA DEL PRODUCTO:
${product?.strategy || 'No disponible'}

INVESTIGACIÓN DE MERCADO:
${product?.market_research || 'No disponible'}

ÁNGULOS DE VENTA DISPONIBLES:
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
        action: "generate_script",
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
        ai_provider: formData.ai_provider,
        ai_model: formData.ai_model,
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
          {currentProvider?.label}
        </Badge>
      </div>

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
          <Label className="text-sm font-medium">Seleccionar IA</Label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Proveedor</Label>
            <Select 
              value={formData.ai_provider} 
              onValueChange={(v: "lovable" | "openai" | "anthropic") => setFormData({ ...formData, ai_provider: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    <div className="flex flex-col">
                      <span>{provider.label}</span>
                      <span className="text-xs text-muted-foreground">{provider.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Modelo</Label>
            <Select 
              value={formData.ai_model} 
              onValueChange={(v) => setFormData({ ...formData, ai_model: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
          <Select 
            value={formData.sales_angle} 
            onValueChange={(v) => setFormData({ ...formData, sales_angle: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar ángulo..." />
            </SelectTrigger>
            <SelectContent>
              {product.sales_angles?.map((angle, idx) => (
                <SelectItem key={idx} value={angle}>{angle}</SelectItem>
              ))}
              {(!product.sales_angles || product.sales_angles.length === 0) && (
                <div className="px-2 py-2 text-sm text-muted-foreground">No hay ángulos definidos</div>
              )}
            </SelectContent>
          </Select>
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
        <div className="flex gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="flex-1 justify-between">
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Personalizar Prompts de IA
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${promptsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="secondary"
            onClick={generateOptimizedPrompts}
            disabled={loadingPrompts}
            title="Generar prompts optimizados con IA"
          >
            {loadingPrompts ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Generar Prompts con IA</span>
          </Button>
        </div>
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
          <p className="text-sm font-medium mb-3">Progreso ({currentProvider?.label}):</p>
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
            Generando con {currentProvider?.label}...
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
