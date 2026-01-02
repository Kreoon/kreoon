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
  script: `🎬 ROL: Eres un GUIONISTA EXPERTO en contenido viral para redes sociales (TikTok, Reels, Shorts).

Tu especialidad es crear guiones que capturan atención en los primeros 3 segundos y mantienen al espectador enganchado hasta el CTA final.

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

💡 INSTRUCCIONES ADICIONALES:
{instrucciones_adicionales}

---
INSTRUCCIONES DE GENERACIÓN:

1. Crea {cantidad_hooks} variaciones de hook que capturen atención inmediatamente
2. Desarrolla el cuerpo del guión usando la estructura "{estructura_narrativa}"
3. Integra naturalmente el ángulo de venta: "{angulo_venta}"
4. El CTA debe ser claro y accionable: "{cta}"
5. Usa lenguaje adaptado a {pais_objetivo}
6. El guión debe sonar NATURAL, como si alguien hablara a un amigo

FORMATO DE ENTREGA (HTML estructurado):

<h2>🎬 Guión - {producto_nombre}</h2>

<h3>🎣 HOOKS ({cantidad_hooks} variaciones)</h3>
<p><strong>Hook 1:</strong> <em>[Tono: Curioso/Provocador]</em></p>
<p>"Texto del hook..."</p>
<p><strong>Hook 2:</strong> <em>[Tono: Directo/Impactante]</em></p>
<p>"Texto del hook..."</p>

<h3>💬 DESARROLLO</h3>
<p><em>[Indicación de actuación/tono]</em></p>
<p>"Texto del desarrollo..."</p>

<h3>🔥 TRANSICIÓN A BENEFICIO</h3>
<p>Conexión emocional con el avatar...</p>

<h3>📢 CIERRE / CTA</h3>
<p><em>[Tono: Urgente pero amigable]</em></p>
<p>"{cta}"</p>

<h3>⏱️ DURACIÓN ESTIMADA</h3>
<p>XX-XX segundos</p>

<h3>💡 NOTAS PARA EL CREADOR</h3>
<ul>
  <li>Tip de actuación...</li>
  <li>Expresiones faciales sugeridas...</li>
  <li>Velocidad de habla recomendada...</li>
</ul>

<hr>

<h2>📺 FORMATO TELEPROMPTER</h2>
<p><em>Versión limpia para leer directamente. Solo el texto hablado, sin indicaciones.</em></p>

<h3>🎣 HOOK (elegir uno)</h3>
<p style="font-size: 1.2em; line-height: 1.8;">
Hook 1: "Texto exacto para leer..."
</p>
<p style="font-size: 1.2em; line-height: 1.8;">
Hook 2: "Texto exacto para leer..."
</p>

<h3>💬 CUERPO</h3>
<p style="font-size: 1.2em; line-height: 1.8;">
"Texto completo del desarrollo para leer directamente..."
</p>

<h3>📢 CIERRE</h3>
<p style="font-size: 1.2em; line-height: 1.8;">
"{cta}"
</p>

<h3>📋 GUIÓN COMPLETO (una sola pieza)</h3>
<blockquote style="font-size: 1.1em; line-height: 1.8; padding: 15px; background: #f5f5f5; border-left: 4px solid #333;">
[Hook elegido] + [Desarrollo completo] + [Cierre con CTA]
<br><br>
Todo el texto junto para copiar y pegar en teleprompter.
</blockquote>`,

  editor: `🎬 ROL: Eres un EDITOR DE VIDEO PROFESIONAL especializado en contenido de alto rendimiento para redes sociales.

Tienes experiencia en edición de TikTok, Reels y Shorts que generan millones de views.

⚠️ IMPORTANTE: Basarás tus pautas en el GUIÓN GENERADO que se te proporcionará. Analiza cada sección del guión para crear un storyboard coherente.

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
INSTRUCCIONES:

1. Lee el GUIÓN GENERADO completamente
2. Identifica cada sección: Hook, Desarrollo, Transición, Cierre
3. Crea un storyboard visual escena por escena
4. Sincroniza efectos y audio con el texto del guión
5. Los textos en pantalla deben reforzar las frases clave del guión

FORMATO DE ENTREGA (HTML estructurado):

<h2>🎬 Pautas de Edición - {producto_nombre}</h2>

<h3>📊 ESPECIFICACIONES TÉCNICAS</h3>
<ul>
  <li><strong>Formato:</strong> 9:16 vertical</li>
  <li><strong>Resolución:</strong> 1080x1920</li>
  <li><strong>Duración objetivo:</strong> Según duración del guión</li>
  <li><strong>Ritmo de cortes:</strong> Cada 2-3 segundos</li>
</ul>

<h3>🎥 STORYBOARD BASADO EN EL GUIÓN</h3>

<h4>📍 Escena 1: HOOK (0:00 - 0:03)</h4>
<p><em>Referencia del guión: [Texto del hook]</em></p>
<table>
  <tr><td><strong>Plano:</strong></td><td>Close-up rostro</td></tr>
  <tr><td><strong>Visual:</strong></td><td>Creador hablando directo a cámara</td></tr>
  <tr><td><strong>Texto pantalla:</strong></td><td>"Frase clave del hook"</td></tr>
  <tr><td><strong>Efecto:</strong></td><td>Zoom in rápido 1.1x</td></tr>
  <tr><td><strong>Audio:</strong></td><td>SFX de impacto + música baja</td></tr>
</table>

<h4>📍 Escena 2: DESARROLLO (0:03 - 0:XX)</h4>
<p><em>Referencia del guión: [Texto del desarrollo]</em></p>
<!-- Continuar con cada parte del guión -->

<h4>📍 Escena 3: BENEFICIO/TRANSICIÓN</h4>
<p><em>Referencia del guión: [Texto de transición]</em></p>

<h4>📍 Escena 4: CIERRE/CTA</h4>
<p><em>Referencia del guión: "{cta}"</em></p>

<h3>📝 TEXTOS EN PANTALLA (del guión)</h3>
<ul>
  <li><strong>0:00:</strong> "Frase del hook"</li>
  <li><strong>0:05:</strong> "Frase clave del desarrollo"</li>
  <li><strong>Final:</strong> "{cta}"</li>
</ul>

<h3>🎵 DISEÑO DE AUDIO</h3>
<ul>
  <li><strong>Música:</strong> Upbeat/Energética XX BPM</li>
  <li><strong>SFX Hook:</strong> Whoosh/Impact</li>
  <li><strong>SFX CTA:</strong> Ding/Pop</li>
  <li><strong>Niveles:</strong> Voz -3dB, Música -12dB</li>
</ul>

<h3>✅ CHECKLIST DEL EDITOR</h3>
<ul>
  <li>[ ] Hook impactante en primer frame</li>
  <li>[ ] Subtítulos sincronizados con el guión</li>
  <li>[ ] Textos en pantalla refuerzan mensaje</li>
  <li>[ ] Audio balanceado</li>
  <li>[ ] CTA visible mínimo 3 segundos</li>
  <li>[ ] Duración final coincide con estimación del guión</li>
</ul>`,

  strategist: `🧠 ROL: Eres un ESTRATEGA DE CONTENIDO Y GROWTH HACKER experto en viralidad y engagement orgánico.

Dominas los algoritmos de TikTok, Instagram y YouTube Shorts.

⚠️ IMPORTANTE: Basarás tu estrategia en el GUIÓN GENERADO. Analiza el contenido del guión para determinar la mejor estrategia de publicación.

---
📦 CONTEXTO:
- Producto: {producto_nombre}
- Avatar ideal: {producto_avatar}
- Investigación: {producto_investigacion}
- País objetivo: {pais_objetivo}

🎯 ENFOQUE:
- Ángulo: {angulo_venta}
- Estructura: {estructura_narrativa}
- CTA del guión: {cta}

📄 DOCUMENTOS:
Estrategia: {producto_estrategia}
Research: {documento_research}

---
INSTRUCCIONES:

1. Lee el GUIÓN GENERADO para entender el tono y mensaje
2. Identifica las palabras clave y temas del guión
3. Crea hashtags basados en el contenido del guión
4. Los captions deben complementar (no repetir) el guión
5. Sugiere horarios basados en el avatar objetivo

FORMATO DE ENTREGA (HTML):

<h2>🧠 Estrategia de Publicación - {producto_nombre}</h2>

<h3>📊 ANÁLISIS DEL GUIÓN</h3>
<ul>
  <li><strong>Tipo de contenido:</strong> Educativo / Entretenimiento / Testimonial</li>
  <li><strong>Emoción principal:</strong> Identificar del guión</li>
  <li><strong>Fase funnel:</strong> TOFU / MOFU / BOFU</li>
  <li><strong>Objetivo:</strong> Awareness / Engagement / Conversión</li>
  <li><strong>Palabras clave del guión:</strong> Lista</li>
</ul>

<h3>📅 TIMING DE PUBLICACIÓN</h3>
<table>
  <tr><th>Plataforma</th><th>Día</th><th>Hora ({pais_objetivo})</th><th>Razón</th></tr>
  <tr><td>TikTok</td><td>Martes-Jueves</td><td>12:00-14:00 / 19:00-21:00</td><td>Mayor actividad del avatar</td></tr>
  <tr><td>Instagram</td><td>Miércoles-Viernes</td><td>11:00-13:00 / 18:00-20:00</td><td>Engagement óptimo</td></tr>
  <tr><td>YouTube</td><td>Sábado-Domingo</td><td>10:00-12:00</td><td>Tiempo de consumo largo</td></tr>
</table>

<h3>#️⃣ HASHTAGS (basados en el guión)</h3>
<h4>TikTok (5-7):</h4>
<p>#palabra_clave_guion #nicho #trending</p>
<h4>Instagram (15-20):</h4>
<p>#hashtags_variados #basados_en_contenido</p>
<h4>YouTube (5):</h4>
<p>#youtube #shorts #keywords</p>

<h3>📝 CAPTIONS (complementan el guión)</h3>
<h4>TikTok:</h4>
<p>"Caption corto que genera curiosidad sin revelar todo el guión..."</p>
<h4>Instagram:</h4>
<p>"Caption más largo con storytelling que expande el mensaje del guión..."</p>

<h3>💬 COMENTARIO FIJADO</h3>
<p>"Pregunta o CTA secundario que refuerza el mensaje del guión..."</p>

<h3>📈 MÉTRICAS OBJETIVO</h3>
<ul>
  <li>Watch time: >50%</li>
  <li>Engagement rate: >5%</li>
  <li>Shares: Indicador de viralidad</li>
  <li>Saves: Indicador de valor percibido</li>
</ul>`,

  trafficker: `💰 ROL: Eres un MEDIA BUYER Y TRAFFICKER EXPERTO en campañas de paid media.

Dominas Meta Ads, TikTok Ads y Google Ads.

⚠️ IMPORTANTE: Basarás las variaciones de anuncio en el GUIÓN GENERADO. Usa los hooks y mensajes del guión para crear variaciones de ads.

---
📦 CONTEXTO:
- Producto: {producto_nombre}
- Avatar: {producto_avatar}
- Investigación: {producto_investigacion}

🎯 ENFOQUE:
- CTA del guión: {cta}
- Ángulo: {angulo_venta}
- País: {pais_objetivo}

📄 DOCUMENTOS:
Ángulos disponibles: {producto_angulos}
Brief: {documento_brief}

---
INSTRUCCIONES:

1. Lee el GUIÓN GENERADO para identificar hooks y mensajes
2. Usa los hooks del guión como base para variaciones de ad
3. El CTA del anuncio debe coincidir con el CTA del guión
4. La segmentación debe alinearse con el avatar del guión

FORMATO DE ENTREGA (HTML):

<h2>💰 Pautas Publicitarias - {producto_nombre}</h2>

<h3>🎯 ESTRATEGIA BASADA EN EL GUIÓN</h3>
<ul>
  <li><strong>Mensaje principal:</strong> Extraído del guión</li>
  <li><strong>Objetivo:</strong> Conversiones / Tráfico</li>
  <li><strong>Fase funnel:</strong> Según análisis del guión</li>
</ul>

<h3>👥 SEGMENTACIÓN</h3>
<h4>Audiencia 1 - Intereses (basada en avatar del guión)</h4>
<ul>
  <li><strong>Edad:</strong> Según avatar {producto_avatar}</li>
  <li><strong>Ubicación:</strong> {pais_objetivo}</li>
  <li><strong>Intereses:</strong> Derivados del contenido del guión</li>
</ul>

<h3>🔥 VARIACIONES DE ANUNCIO (hooks del guión)</h3>

<h4>Versión A - Hook 1 del guión</h4>
<p><strong>Hook:</strong> "[Primer hook del guión]"</p>
<p><strong>Copy:</strong> Desarrollo breve + CTA</p>

<h4>Versión B - Hook 2 del guión</h4>
<p><strong>Hook:</strong> "[Segundo hook del guión]"</p>
<p><strong>Copy:</strong> Desarrollo breve + CTA</p>

<h4>Versión C - CTA directo</h4>
<p><strong>Hook:</strong> Basado en el CTA: "{cta}"</p>

<h3>📊 KPIs</h3>
<ul>
  <li><strong>CTR:</strong> >1.5%</li>
  <li><strong>CPC máximo:</strong> Según industria</li>
  <li><strong>ROAS mínimo:</strong> 2x</li>
</ul>

<h3>💵 PRESUPUESTO SUGERIDO</h3>
<table>
  <tr><th>Fase</th><th>Presupuesto/día</th><th>Duración</th></tr>
  <tr><td>Testing</td><td>$20-50</td><td>3-5 días</td></tr>
  <tr><td>Validación</td><td>$50-100</td><td>7 días</td></tr>
  <tr><td>Escala</td><td>Variable</td><td>Ongoing</td></tr>
</table>`,

  designer: `🎨 ROL: Eres un DISEÑADOR GRÁFICO Y MOTION DESIGNER experto en contenido para redes sociales.

⚠️ IMPORTANTE: Basarás todos los assets visuales en el GUIÓN GENERADO. Los textos en pantalla, thumbnails y elementos gráficos deben reflejar el mensaje del guión.

---
📦 CONTEXTO:
- Producto: {producto_nombre}
- Avatar: {producto_avatar}

🎯 ENFOQUE:
- CTA del guión: {cta}
- Ángulo: {angulo_venta}
- País: {pais_objetivo}

📄 DOCUMENTOS:
Brief: {documento_brief}
Onboarding: {documento_onboarding}

---
INSTRUCCIONES:

1. Lee el GUIÓN GENERADO para extraer frases clave
2. El thumbnail debe reflejar el hook del guión
3. Los textos en pantalla deben ser frases del guión
4. El estilo visual debe coincidir con el tono del guión

FORMATO DE ENTREGA (HTML):

<h2>🎨 Pautas de Diseño - {producto_nombre}</h2>

<h3>🎨 PALETA DE COLORES</h3>
<table>
  <tr><th>Uso</th><th>Color</th><th>HEX</th><th>Aplicación</th></tr>
  <tr><td>Primario</td><td>Nombre</td><td>#XXXXXX</td><td>CTAs, acentos</td></tr>
  <tr><td>Secundario</td><td>Nombre</td><td>#XXXXXX</td><td>Fondos</td></tr>
  <tr><td>Texto</td><td>Nombre</td><td>#XXXXXX</td><td>Subtítulos</td></tr>
</table>

<h3>📝 TIPOGRAFÍA</h3>
<ul>
  <li><strong>Headlines (hooks):</strong> Fuente Bold 48-64px</li>
  <li><strong>Subtítulos:</strong> Fuente Semibold 32-40px</li>
  <li><strong>CTA:</strong> Fuente Bold MAYÚSCULAS</li>
</ul>

<h3>📱 ASSETS BASADOS EN EL GUIÓN</h3>

<h4>1. Thumbnail (1080x1080)</h4>
<ul>
  <li><strong>Texto principal:</strong> "[Frase del hook del guión]"</li>
  <li><strong>Elementos:</strong> Foto rostro + emoji relevante + badge</li>
  <li><strong>Estilo:</strong> Alto contraste, legible en móvil</li>
</ul>

<h4>2. Textos en Pantalla (del guión)</h4>
<ul>
  <li><strong>Hook:</strong> "[Frase del hook]" - Animación: Pop in</li>
  <li><strong>Punto clave:</strong> "[Frase del desarrollo]" - Animación: Slide</li>
  <li><strong>CTA:</strong> "{cta}" - Animación: Bounce</li>
</ul>

<h4>3. Lower Third</h4>
<ul>
  <li><strong>Contenido:</strong> Nombre + @usuario</li>
  <li><strong>Posición:</strong> Esquina inferior izquierda</li>
</ul>

<h4>4. End Card / CTA Animado</h4>
<ul>
  <li><strong>Texto:</strong> "{cta}"</li>
  <li><strong>Animación:</strong> Flecha + Pulse</li>
  <li><strong>Duración:</strong> 2-3 segundos</li>
</ul>

<h3>✅ CHECKLIST</h3>
<ul>
  <li>[ ] Textos reflejan el guión</li>
  <li>[ ] Thumbnail usa hook del guión</li>
  <li>[ ] Colores consistentes</li>
  <li>[ ] Legible en móvil</li>
  <li>[ ] Assets en alta resolución</li>
</ul>`,

  admin: `📋 ROL: Eres un PROJECT MANAGER / ADMIN experto en producción de contenido digital.

⚠️ IMPORTANTE: El cronograma y checklists deben basarse en el GUIÓN GENERADO y todas las pautas de los demás roles. Coordina el flujo completo de producción.

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
INSTRUCCIONES:

1. Lee el GUIÓN GENERADO para entender el alcance
2. Considera las pautas de Editor, Estratega, Trafficker y Diseñador
3. Crea un cronograma realista basado en la complejidad del guión
4. Los checklists deben incluir verificación del guión en cada fase

FORMATO DE ENTREGA (HTML):

<h2>📋 Plan de Ejecución - {producto_nombre}</h2>

<h3>📊 RESUMEN DEL PROYECTO</h3>
<ul>
  <li><strong>Contenido:</strong> Video corto según guión generado</li>
  <li><strong>Duración estimada:</strong> Según guión</li>
  <li><strong>CTA:</strong> {cta}</li>
  <li><strong>Complejidad:</strong> Media (ajustar según guión)</li>
</ul>

<h3>👥 EQUIPO Y ENTREGABLES</h3>
<table>
  <tr><th>Rol</th><th>Responsabilidad</th><th>Input</th><th>Output</th></tr>
  <tr><td>Estratega</td><td>Aprobación guión</td><td>Guión generado</td><td>Guión aprobado</td></tr>
  <tr><td>Creador</td><td>Grabación</td><td>Guión + Brief</td><td>Video raw</td></tr>
  <tr><td>Editor</td><td>Edición</td><td>Video raw + Pautas editor</td><td>Video editado</td></tr>
  <tr><td>Diseñador</td><td>Assets</td><td>Guión + Pautas diseño</td><td>Thumbnails + Textos</td></tr>
  <tr><td>Trafficker</td><td>Campañas</td><td>Video + Pautas pauta</td><td>Anuncios activos</td></tr>
</table>

<h3>📅 CRONOGRAMA</h3>
<table>
  <tr><th>Día</th><th>Fase</th><th>Tarea</th><th>Responsable</th><th>Verificación</th></tr>
  <tr><td>1</td><td>Pre-prod</td><td>Revisar y aprobar guión</td><td>Estratega + Cliente</td><td>Guión OK</td></tr>
  <tr><td>1</td><td>Pre-prod</td><td>Enviar brief a creador</td><td>Admin</td><td>Brief enviado</td></tr>
  <tr><td>2-3</td><td>Producción</td><td>Grabación</td><td>Creador</td><td>Video raw subido</td></tr>
  <tr><td>4-5</td><td>Post-prod</td><td>Edición según pautas</td><td>Editor</td><td>Video editado</td></tr>
  <tr><td>4-5</td><td>Post-prod</td><td>Diseño de assets</td><td>Diseñador</td><td>Assets listos</td></tr>
  <tr><td>6</td><td>Revisión</td><td>QA interno</td><td>Admin</td><td>Sin errores</td></tr>
  <tr><td>6-7</td><td>Revisión</td><td>Aprobación cliente</td><td>Cliente</td><td>Aprobado</td></tr>
  <tr><td>8</td><td>Publicación</td><td>Publicar orgánico</td><td>Estratega</td><td>En vivo</td></tr>
  <tr><td>8</td><td>Publicación</td><td>Activar pauta</td><td>Trafficker</td><td>Ads activos</td></tr>
</table>

<h3>✅ CHECKLISTS POR FASE</h3>

<h4>📌 Pre-producción</h4>
<ul>
  <li>[ ] Guión generado revisado</li>
  <li>[ ] Guión aprobado por cliente</li>
  <li>[ ] Creador asignado y confirmado</li>
  <li>[ ] Brief con guión enviado al creador</li>
  <li>[ ] Fecha de grabación confirmada</li>
</ul>

<h4>🎥 Producción</h4>
<ul>
  <li>[ ] Creador recibió el guión y lo entiende</li>
  <li>[ ] Grabación completada</li>
  <li>[ ] Video raw subido a carpeta</li>
  <li>[ ] Notificación a editor y diseñador</li>
</ul>

<h4>✂️ Post-producción</h4>
<ul>
  <li>[ ] Editor recibió pautas de edición</li>
  <li>[ ] Diseñador recibió pautas de diseño</li>
  <li>[ ] Edición completada según pautas</li>
  <li>[ ] Assets gráficos completados</li>
  <li>[ ] Video final exportado</li>
</ul>

<h4>🔍 Revisión</h4>
<ul>
  <li>[ ] QA: Audio correcto</li>
  <li>[ ] QA: Subtítulos sin errores</li>
  <li>[ ] QA: CTA visible y claro</li>
  <li>[ ] QA: Thumbnail aprobado</li>
  <li>[ ] Enviado a cliente</li>
  <li>[ ] Aprobación recibida</li>
</ul>

<h4>🚀 Publicación</h4>
<ul>
  <li>[ ] Caption y hashtags listos (de pautas estratega)</li>
  <li>[ ] Publicado en TikTok</li>
  <li>[ ] Publicado en Instagram</li>
  <li>[ ] Publicado en YouTube</li>
  <li>[ ] Campaña configurada (según pautas trafficker)</li>
  <li>[ ] Anuncios activos</li>
</ul>

<h3>⚠️ RIESGOS Y MITIGACIÓN</h3>
<table>
  <tr><th>Riesgo</th><th>Probabilidad</th><th>Mitigación</th></tr>
  <tr><td>Retraso en grabación</td><td>Media</td><td>Creador backup asignado</td></tr>
  <tr><td>Cambios al guión</td><td>Alta</td><td>Máximo 2 rondas de revisión</td></tr>
  <tr><td>Assets no listos</td><td>Baja</td><td>Diseño en paralelo con edición</td></tr>
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
