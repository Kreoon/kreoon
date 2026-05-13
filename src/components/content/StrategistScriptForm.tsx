import { useState, useEffect, useMemo } from "react";
import { supabase, SUPABASE_ANON_KEY, SUPABASE_FUNCTIONS_URL } from "@/integrations/supabase/client";
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
import { useUnifiedTokens } from "@/hooks/useUnifiedTokens";
import { AI_TOKEN_COSTS } from "@/lib/finance/constants";
import {
  Sparkles, Loader2, Target, Users, Globe, FileText,
  MessageSquare, ListOrdered, Plus, X, Wand2, Settings2,
  Video, ChevronDown, ChevronUp, CheckCircle2, Bot, RefreshCw, FileSearch, AlertCircle, Search,
  Brain, Zap, ChevronRight, Hash, Shuffle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SkillsLoadingState, type SkillsRealProgress } from "./SkillsLoadingState";

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
  ai_analysis?: unknown; // ADN V2
}

interface GeneratedContent {
  script: string;
  director_output?: string;
  marketing_output?: string;
  captions?: string;
  broll_output?: string;
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
  director_prompt: string;
  marketing_prompt: string;
  captions_prompt: string;
  broll_prompt: string;
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
  narratives: boolean;
  objections: boolean;
  competitors: boolean;
  audience: boolean;
}

interface GenerationStep {
  key: "script" | "director" | "marketing" | "captions" | "broll";
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

// Estrategias detalladas por estructura narrativa — se inyectan en el contexto de la IA
const NARRATIVE_STRATEGIES: Record<string, string> = {
  "problema-solucion": `ESTRATEGIA PAS (Problema → Agitación → Solución):
- HOOK (Escena 1): Abre nombrando el dolor exacto del avatar — sin rodeos, primera oración impactante
- AGITACIÓN (Escena 2): Amplifica el problema, muestra las consecuencias de no resolverlo, genera urgencia emocional
- SOLUCIÓN (Escena 3): Presenta el producto como la salida lógica y probada al problema
- PRUEBA (Escena 4): Dato, resultado o demostración rápida que respalda la solución
- CTA (Escena 5): Llamada a la acción directa y clara, aprovechando el estado emocional creado`,

  "historia-personal": `ESTRATEGIA STORYBRAND (Historia de Transformación Personal):
- HOOK (Escena 1): Revela el momento más bajo o el antes — frase de vulnerabilidad genuina
- CONTEXTO (Escena 2): Describe quién eras antes, qué intentaste sin éxito, por qué no funcionaba
- PUNTO DE QUIEBRE (Escena 3): El momento en que descubriste o decidiste cambiar (introduce el producto naturalmente)
- TRANSFORMACIÓN (Escena 4): Resultados concretos y cómo cambió tu vida/negocio/salud con números si es posible
- INVITACIÓN (Escena 5): Invita al espectador a vivir su propia transformación — CTA empático`,

  "antes-despues": `ESTRATEGIA BEFORE/AFTER/BRIDGE:
- HOOK (Escena 1): Muestra el DESPUÉS de forma impactante primero (el resultado) — genera curiosidad inmediata
- ANTES (Escena 2): Contrasta con el punto de partida — describe la situación anterior con detalles visuales
- PUENTE (Escena 3): Revela qué cambió exactamente, cómo y por qué este producto fue el puente
- PRUEBA VISUAL (Escena 4): Refuerza con comparación tangible — medidas, fotos, métricas, tiempo transcurrido
- CTA (Escena 5): Invita a comenzar el propio "antes" para llegar al "después" deseado`,

  "tutorial": `ESTRATEGIA PASO A PASO (How-To Hook):
- HOOK (Escena 1): Promete el resultado final — "En 3 pasos vas a lograr [beneficio específico]"
- CONTEXTO (Escena 2): Explica brevemente por qué este método/producto funciona (credibilidad)
- PASO 1 (Escena 3): Primer paso claro y accionable — con demostración visual si es posible
- PASO 2-3 (Escena 4): Continuación fluida, mostrando el proceso real con el producto
- RESULTADO + CTA (Escena 5): Muestra el resultado al aplicar los pasos + dónde conseguirlo`,

  "testimonio": `ESTRATEGIA SOCIAL PROOF (Testimonio Estructura):
- HOOK (Escena 1): Abre con la transformación del cliente en primera persona — resultado concreto con número
- ESCEPTICISMO (Escena 2): Confiesa que al inicio no creía o dudaba — genera identificación
- DESCUBRIMIENTO (Escena 3): Cómo llegó al producto y por qué decidió probarlo
- EXPERIENCIA (Escena 4): Cómo fue el proceso de uso — detalles sensoriales y emocionales reales
- RECOMENDACIÓN (Escena 5): Por qué lo recomendaría, a quién va dirigido + CTA natural`,

  "urgencia": `ESTRATEGIA FOMO + ESCASEZ:
- HOOK (Escena 1): Abre con la limitación — "Solo quedan X unidades" / "Solo hasta [fecha]" — genera presión inmediata
- VALOR (Escena 2): Justifica rápidamente por qué vale la pena actuar ahora — beneficio principal
- PRUEBA (Escena 3): Muestra por qué otros ya están aprovechando (social proof rápido)
- CONSECUENCIA (Escena 4): Qué pierden si no actúan ahora — costo de la inacción
- CTA URGENTE (Escena 5): Llamada directísima con el mecanismo de compra claro y la urgencia reforzada`,

  "educativo": `ESTRATEGIA EDUTAINMENT (Enseña + Engancha):
- HOOK (Escena 1): Dato sorprendente, estadística o pregunta retórica que desafía lo que el avatar cree
- ENSEÑANZA (Escena 2): Revela la información valiosa de forma clara y memorable — el "por qué" detrás
- EJEMPLO (Escena 3): Caso real, analogía o demostración que hace tangible el concepto
- CONEXIÓN (Escena 4): Vincula el conocimiento aprendido con el producto — transición natural, no forzada
- CTA EDUCADO (Escena 5): Invita a aprender más, profundizar o conseguir la herramienta — tono consultivo`,

  "entretenimiento": `ESTRATEGIA HOOK EMOCIONAL (Humor/Drama/Sorpresa):
- HOOK (Escena 1): Situación absurda, inesperada o graciosa relacionada con el nicho — retención máxima
- DESARROLLO (Escena 2): Amplía la situación con ritmo rápido — mantiene la energía del hook
- GIRO (Escena 3): El twist o remate que justifica el gancho — el producto aparece de forma orgánica
- REMATE (Escena 4): Cierra el arco humorístico/dramático con el beneficio del producto integrado
- CTA LIGERO (Escena 5): CTA con el mismo tono del video — no rompe la energía creada`,

  "mitos-realidades": `ESTRATEGIA MITO-BUSTING:
- HOOK (Escena 1): Nombra el mito más grande del nicho — algo que casi todo el mundo cree erróneamente
- MITO 1 (Escena 2): Presenta el primer error común + desmiente con dato o prueba
- MITO 2 (Escena 3): Segundo mito frecuente + la verdad detrás
- REALIDAD (Escena 4): Presenta la solución real (el producto) como el camino correcto basado en evidencia
- CTA EDUCADO (Escena 5): Invita a dejar de cometer el error y comenzar el camino correcto`,

  "comparativa": `ESTRATEGIA VS/DIFERENCIACIÓN:
- HOOK (Escena 1): Promete mostrar una diferencia que nadie está viendo — genera curiosidad comparativa
- ALTERNATIVA COMÚN (Escena 2): Describe lo que el avatar usa ahora — con sus limitaciones reales
- COMPARACIÓN (Escena 3): Muestra el producto lado a lado con la alternativa — criterios específicos
- VENTAJA CLARA (Escena 4): Resultado diferencial en términos concretos — velocidad, precio, eficacia, simplicidad
- CTA DE DECISIÓN (Escena 5): Invita a tomar la decisión correcta ahora que ya sabe la diferencia`,

  "detras-camaras": `ESTRATEGIA TRANSPARENCIA/AUTENTICIDAD:
- HOOK (Escena 1): "Lo que nadie te muestra sobre [producto/proceso]" — promesa de exclusividad
- PROCESO (Escena 2): Revela cómo se hace, fabrica o funciona el producto — con detalles reales
- ESTÁNDAR (Escena 3): Muestra el nivel de cuidado, calidad o esfuerzo detrás — construye confianza
- PERSONAS (Escena 4): Humaniza la marca — equipo, historia, valores que respaldan el producto
- CTA DE CONFIANZA (Escena 5): Invita a ser parte de algo auténtico — CTA con tono de comunidad`,

  "unboxing": `ESTRATEGIA REVEAL/DESCUBRIMIENTO:
- HOOK (Escena 1): Genera anticipación máxima — "Finalmente llegó" / muestra el paquete sin abrir
- PRIMER CONTACTO (Escena 2): Reacción genuina al abrir — texturas, presentación, detalles del packaging
- EXPLORACIÓN (Escena 3): Descubre cada componente con comentarios espontáneos — muestra beneficios visualmente
- PRIMERA PRUEBA (Escena 4): Usa el producto por primera vez en cámara — reacción auténtica
- VEREDICTO (Escena 5): Conclusión honesta + CTA para quienes quieran la misma experiencia`,

  "reaccion": `ESTRATEGIA AUTENTICIDAD ESPONTÁNEA:
- HOOK (Escena 1): Abre en medio de la reacción — captura el momento de sorpresa o emoción sin filtro
- CONTEXTO (Escena 2): Explica brevemente qué estás probando y por qué tenías expectativas (altas o bajas)
- REACCIÓN (Escena 3): La respuesta genuina al usar el producto — emociones en tiempo real
- ANÁLISIS (Escena 4): Reflexión inmediata — qué funciona, qué sorprendió, qué no esperabas
- RECOMENDACIÓN (Escena 5): Veredicto honesto + a quién se lo recomendaría + CTA`,

  "lista": `ESTRATEGIA TOP LIST / LISTICLE:
- HOOK (Escena 1): Promete la lista con número exacto — "X razones por las que..." / "X errores que..."
- ÍTEM 1-2 (Escena 2): Primeros dos puntos con ritmo rápido — cada uno en 5-8 segundos máximo
- ÍTEM 3-4 (Escena 3): Siguientes puntos — el punto más poderoso va en posición 3 o penúltima
- ÍTEM FINAL (Escena 4): El último ítem es el más sorprendente o emocional — máximo impacto de cierre
- CTA (Escena 5): Remata con el siguiente paso lógico después de la lista`,

  "pov": `ESTRATEGIA POV INMERSIVO:
- HOOK (Escena 1): "POV: [situación exacta del avatar]" — el espectador se ve reflejado desde la primera línea
- SITUACIÓN (Escena 2): Desarrolla el escenario con detalles que el avatar reconoce como propios
- DESCUBRIMIENTO (Escena 3): El momento en que el avatar del video encuentra/usa el producto — naturalidad
- TRANSFORMACIÓN (Escena 4): Cómo cambia la situación del avatar al usar el producto — resultado inmediato
- CIERRE POV (Escena 5): "Ahora entiendes por qué..." — CTA en el mismo tono inmersivo`,

  "controversia": `ESTRATEGIA OPINIÓN CONTROVERSIAL (Pattern Interrupt):
- HOOK (Escena 1): Declaración polémica o contraintuitiva — algo que la mayoría del nicho NO dice
- DEFENSA (Escena 2): Argumenta por qué tienes esa opinión — con datos o experiencia real
- CONTEXTO (Escena 3): Reconoce el otro punto de vista antes de derrumbarlo — muestra madurez
- PRUEBA (Escena 4): Evidencia que respalda tu posición — el producto como parte de la solución
- CTA DESAFIANTE (Escena 5): Invita a quien esté de acuerdo a actuar — filtra audiencia calificada`,

  "trend": `ESTRATEGIA TREND-JACKING:
- HOOK (Escena 1): Usa exactamente el formato/audio/texto del trend viral — reconocimiento inmediato
- ADAPTACIÓN (Escena 2): Lleva el trend al nicho del producto de forma creativa — mantiene el formato
- GIRO DE MARCA (Escena 3): Integra el producto en el trend de forma que se sienta natural, no forzado
- REMATE (Escena 4): El punch line o momento payoff del trend — adaptado al mensaje de la marca
- CTA TREND (Escena 5): CTA que mantiene la energía del trend — lenguaje acorde al formato viral`,

  "dia-en-vida": `ESTRATEGIA DAY IN THE LIFE:
- HOOK (Escena 1): "Mi rutina cambia desde que uso [producto]" — promete transformación cotidiana
- MAÑANA (Escena 2): Muestra el producto integrado en la rutina de inicio del día — naturaleza auténtica
- DURANTE EL DÍA (Escena 3): Momento clave donde el producto resuelve o mejora algo concreto
- RESULTADO DEL DÍA (Escena 4): Cómo se siente al final del día — beneficio acumulado y tangible
- CTA DE ESTILO DE VIDA (Escena 5): Invita a vivir una rutina similar — aspiracional y alcanzable`,

  "pregunta-respuesta": `ESTRATEGIA Q&A DIRECTO:
- HOOK (Escena 1): La pregunta más frecuente o picante del nicho — responde directamente en el primer segundo
- PREGUNTA 1 (Escena 2): Primera duda común + respuesta clara y directa con el producto como parte de la respuesta
- PREGUNTA 2 (Escena 3): Segunda pregunta más técnica o de objeción + respuesta que desarma el miedo
- PREGUNTA BONUS (Escena 4): La pregunta que nadie hace pero todos quieren saber — diferenciador
- CTA (Escena 5): "¿Tienes más dudas? Aquí te lo explico todo" — lleva al siguiente nivel`,

  "storytime": `ESTRATEGIA NARRATIVE ARC COMPLETO:
- HOOK (Escena 1): Empieza por el final o el momento más tenso — "Lo que pasó ese día cambió todo"
- CONTEXTO (Escena 2): Regresa al inicio — quién eras, cuál era la situación, qué estaba en juego
- CONFLICTO (Escena 3): El problema o crisis que se desarrolla — tensión narrativa máxima
- CLÍMAX (Escena 4): El punto de quiebre + cómo el producto o decisión cambió el resultado
- RESOLUCIÓN (Escena 5): El estado actual después de la historia — lección + CTA desde la emoción generada`,
};

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

const CAST_LAYER_INFO: Record<string, {
  letter: string;
  layerName: string;
  label: string;
  funnel: string;
  objective: string;
  audience: string;
  tone: string;
  techniques: string[];
  keywords: string[];
  ctaStyle: string;
  kpis: string[];
  creativeFocus: string;
}> = {
  engage: {
    letter: 'C',
    layerName: 'Conocer',
    label: 'C — Conocer',
    funnel: 'TOFU',
    objective: 'Viralidad, enganche, disrupción. Que el avatar descubra que tiene el problema.',
    audience: 'Audiencia FRÍA — no conocen la marca ni el producto',
    tone: 'Disruptivo, viral, sorprendente. Rompe patrones, genera curiosidad extrema.',
    techniques: ['Hooks ultra potentes 1-3s', 'Pattern interrupts', 'Declaraciones contraintuitivas', 'Mostrar el problema dramatizado'],
    keywords: ['¿Sabías que...?', 'Esto es lo que nadie te cuenta', 'Error #1', 'La verdad sobre'],
    ctaStyle: 'Suave — seguir, comentar, guardar. No vender directamente.',
    kpis: ['Alcance', 'Reproducciones', 'Guardados'],
    creativeFocus: 'Impacto visual + hook verbal. Primeros 2s son todo.',
  },
  solution: {
    letter: 'A',
    layerName: 'Atraer',
    label: 'A — Atraer',
    funnel: 'MOFU',
    objective: 'Mostrar que el producto ES la solución perfecta. Persuadir para explorar.',
    audience: 'Audiencia TIBIA — saben que tienen el problema, buscan solución',
    tone: 'Persuasivo, confiado, enfocado en beneficios y transformación.',
    techniques: ['Demostración en acción', 'Antes y después', 'Testimonios reales', 'Beneficios cuantificables'],
    keywords: ['La solución es', 'Esto cambió todo', 'Finalmente', 'Resultados garantizados'],
    ctaStyle: 'Directo — link en bio, probar, registrarse.',
    kpis: ['Clics', 'Visitas web', 'Leads'],
    creativeFocus: 'Demostración clara del producto + transformación del avatar.',
  },
  remarketing: {
    letter: 'S',
    layerName: 'Seducir',
    label: 'S — Seducir',
    funnel: 'BOFU',
    objective: 'Crear urgencia, superar objeciones finales. Cerrar la venta.',
    audience: 'Audiencia CALIENTE — vieron el producto pero no compraron',
    tone: 'Urgente, resolutivo, FOMO. Atacar objeciones directamente.',
    techniques: ['Escasez real', 'Social proof masivo', 'Responder objeciones', 'Garantías'],
    keywords: ['Últimas unidades', 'No te pierdas', 'Mientras lees esto', 'Si no ahora cuándo'],
    ctaStyle: 'Urgente — comprar ahora, última oportunidad.',
    kpis: ['Conversiones', 'ROAS', 'CPA'],
    creativeFocus: 'Objeción principal resuelta + CTA de urgencia.',
  },
  fidelize: {
    letter: 'T',
    layerName: 'Transformar',
    label: 'T — Transformar',
    funnel: 'Retención',
    objective: 'Entregar valor, buscar recompra y referidos. Crear comunidad y lealtad.',
    audience: 'CLIENTES existentes — ya compraron, queremos que vuelvan y recomienden',
    tone: 'Cercano, exclusivo, valora al cliente. Contenido de alto valor.',
    techniques: ['Contenido exclusivo', 'Tips avanzados', 'Historias de éxito', 'Programas de referidos'],
    keywords: ['Para ti que ya eres cliente', 'Tip exclusivo', 'Gracias por confiar', 'Familia [marca]'],
    ctaStyle: 'Comunitario — compartir, etiquetar amigos, dejar reseña, referir.',
    kpis: ['LTV', 'Retención', 'NPS'],
    creativeFocus: 'Comunidad + exclusividad + gratitud hacia el cliente.',
  },
};

function getCastLayerInfo(phase: string) {
  return CAST_LAYER_INFO[phase] || null;
}

const BLOCK_ACTION_KEYS: Record<string, string> = {
  script: "scripts.block.script",
  director: "scripts.block.director",
  marketing: "scripts.block.marketing",
  captions: "scripts.block.captions",
  broll: "scripts.block.broll",
};

const BLOCK_LABELS: Record<string, { emoji: string; short: string }> = {
  script: { emoji: "\uD83C\uDFAC", short: "Guion" },
  director: { emoji: "\uD83C\uDFA5", short: "Director" },
  marketing: { emoji: "\uD83D\uDCCA", short: "Marketing" },
  captions: { emoji: "\uD83D\uDCF1", short: "Captions" },
  broll: { emoji: "\uD83C\uDFAC", short: "B-Roll" },
};

const CONTENT_AI_FUNCTION = "content-ai";

const DEFAULT_PROMPTS = {
  script: `🎬 GUIÓN TELEPROMPTER UGC

⚠️ IMPORTANTE: Genera el guión COMPLETO. NO te detengas hasta terminar TODAS las escenas incluyendo el CTA final y las notas para el creador.

ESTRUCTURA REQUERIDA (HTML):
1. <h2>🎥 GUION DE VIDEO UGC</h2>
2. Escenas 1A, 1B, 1C (HOOKS - genera EXACTAMENTE {cantidad_hooks})
3. Escenas 2-3 (DESARROLLO)
4. Escenas 4-5 (SOLUCIÓN con producto)
5. Escena final (CTA: {cta})
6. <h3>📝 NOTAS PARA EL CREADOR</h3> con vestuario, props, locación

Cada escena incluye: Número, Tiempo (ej: 0-3s), Acción visual [entre corchetes], Diálogo exacto "entre comillas"

REGLAS:
- Genera {cantidad_hooks} hooks alternativos (1A, 1B, 1C...)
- Adapta lenguaje a {pais_objetivo}
- COMPLETA TODO hasta las notas finales`,

  director: `🎥 TABLA DE PRODUCCIÓN - DIRECTOR

⚠️ IMPORTANTE: Genera la tabla COMPLETA para TODAS las escenas del guión (1A, 1B, 1C, 2, 3, 4, 5, CTA). NO omitas ninguna.

ESTRUCTURA HTML REQUERIDA:
<h2>🎬 TABLA DE PRODUCCIÓN</h2>
<p>Duración: X segundos | Escenas: X | Setup: [lista]</p>

<table>
<tr><th>#</th><th>Tiempo</th><th>Guión Verbal</th><th>Guión Visual</th><th>Plano</th><th>Notas</th></tr>
[Una fila por CADA escena del guión]
</table>

<h3>📋 CHECKLIST PRE-PRODUCCIÓN</h3>
[Lista de verificación]

<h3>🎬 EQUIPO NECESARIO</h3>
[Cámara, luces, audio, etc.]

<h3>⏱️ TIEMPO ESTIMADO DE GRABACIÓN</h3>

Planos: PP (primer plano), PM (plano medio), PE (plano entero), PD (detalle)
Producto: {producto_nombre} | País: {pais_objetivo}

COMPLETA TODAS las escenas y secciones.`,

  marketing: `📊 ESTRATEGIA DE MARKETING Y PAUTA

⚠️ IMPORTANTE: Genera TODAS las secciones COMPLETAS. NO te detengas hasta terminar presupuesto y próximos contenidos.

ESTRUCTURA HTML REQUERIDA:
<h2>📊 BLOQUE MARKETING</h2>

<h3>🎯 ESTRATEGIA</h3>
Fase ESFERA | Objetivo | KPI Principal

<h3>👥 AUDIENCIAS</h3>
🔵 COLD: Intereses, comportamientos, lookalike
🟡 WARM: Retargeting (video viewers, engagement, web)
🔴 HOT: Cart abandonados, visitantes producto

<h3>📱 DISTRIBUCIÓN</h3>
<table><tr><th>Plataforma</th><th>Formato</th><th>Budget %</th><th>Objetivo</th></tr>
[Meta 60%, TikTok 30%, YouTube 10%]</table>

<h3>🔥 3 VARIACIONES DE AD</h3>
Variación A (Cold): Hook + Copy + CTA
Variación B (Warm): Hook + Copy + CTA
Variación C (Hot): Hook + Copy + CTA

<h3>📈 MÉTRICAS OBJETIVO</h3>
Hook Rate, CTR, CPC, ROAS (mínimo/objetivo/excelente)

<h3>💵 PRESUPUESTO</h3>
Testing: $X/día x X días | Escala: $X/día

<h3>📅 PRÓXIMOS CONTENIDOS</h3>
3 videos sugeridos para el embudo

Producto: {producto_nombre} | Avatar: {producto_avatar} | País: {pais_objetivo} | CTA: {cta}

COMPLETA TODAS las secciones.`,

  captions: `📱 CAPTIONS PARA REDES SOCIALES

⚠️ IMPORTANTE: Genera los 4 captions COMPLETOS. Cada uno con su texto íntegro, hashtags (orgánicos) y especificaciones.

ESTRUCTURA HTML REQUERIDA:
<h2>📱 CAPTIONS GENERADOS</h2>

<h3>📱 ORGÁNICO #1: Hook + Storytelling</h3>
[Caption COMPLETO 150-200 caracteres con emojis + 8-10 hashtags relevantes]
Objetivo: Engagement | Plataforma: Feed IG/FB

<h3>📱 ORGÁNICO #2: Trend/Humor</h3>
[Caption COMPLETO con referencia cultural/trend + hashtags trending]
Objetivo: Viralidad | Plataforma: Reels/TikTok

<h3>💰 ADS #1: Problema-Solución</h3>
[Caption COMPLETO 80-125 caracteres, beneficio + CTA directo, SIN hashtags]
Objetivo: Conversión | Cumple políticas: ✅

<h3>💰 ADS #2: FOMO/Urgencia</h3>
[Caption COMPLETO con escasez/urgencia + CTA, SIN hashtags]
Objetivo: Ventas | Cumple políticas: ✅

Producto: {producto_nombre} | Avatar: {producto_avatar} | País: {pais_objetivo} | CTA: {cta}

REGLAS: No claims médicos, no "milagro", beneficios verificables.
COMPLETA los 4 captions sin truncar.`,

  broll: `🎬 IDEAS DE B-ROLL

⚠️ IMPORTANTE: Genera las tablas COMPLETAS con 10-14 B-Rolls totales. NO te detengas hasta completar todas las secciones.

FORMATO: Solo HTML con estilos inline. Usa color:#1f2937 en TODAS las celdas td.

ESTRUCTURA REQUERIDA:
<h2 style="color:#1a1a1a;">🎬 IDEAS DE B-ROLL</h2>
<p>Producto: {producto_nombre} | Setup: Celular + Trípode + Ring light</p>

<h3 style="color:#059669;">📋 B-ROLLS ESENCIALES (6-8 tomas)</h3>
<table><tr style="background:#d1fae5;"><th style="color:#065f46;">#</th><th style="color:#065f46;">TOMA</th><th style="color:#065f46;">ESCENA</th><th style="color:#065f46;">QUÉ FILMAR</th><th style="color:#065f46;">PLANO</th><th style="color:#065f46;">DUR</th></tr>
[6-8 filas con descripciones MUY específicas, color:#1f2937 en cada td]
</table>

<h3 style="color:#f59e0b;">⭐ B-ROLLS OPCIONALES (4-6 tomas)</h3>
<table>[4-6 filas adicionales con color:#1f2937]</table>

<h3 style="color:#3b82f6;">🎯 SECUENCIA DE GRABACIÓN</h3>
Setup 1 Cenital: B-Rolls X, X, X
Setup 2 Lateral: B-Rolls X, X
Setup 3 En uso: B-Rolls X, X, X

<h3 style="color:#8b5cf6;">💡 TIPS</h3>
Iluminación | Configuración (1080p, 30-60fps) | Cantidad (2-3 tomas cada uno)

REGLAS:
- Solo HTML, color:#1f2937 en todas las celdas
- B-Rolls ESPECÍFICOS ("Close-up pipeta dispensando 3 gotas" NO "toma del producto")
- Planos: PD, PM, PP, PE | Duración: 2-5s

COMPLETA las 10-14 tomas y todas las secciones.`,
};

export function StrategistScriptForm({ product, contentId, onScriptGenerated, organizationId: propOrgId, spherePhase }: StrategistScriptFormProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const organizationId = propOrgId || profile?.current_organization_id;
  const [loading, setLoading] = useState(false);
  const [skillsProgress, setSkillsProgress] = useState<SkillsRealProgress | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [newHook, setNewHook] = useState("");

  // Block selection state
  const [selectedBlocks, setSelectedBlocks] = useState<Record<string, boolean>>({
    script: true, director: true, marketing: true, captions: true, broll: true,
  });

  // Token balance
  const { balance, getTokenCost, refetchBalance } = useUnifiedTokens(organizationId);

  const totalCost = useMemo(() =>
    Object.entries(selectedBlocks)
      .filter(([, sel]) => sel)
      .reduce((sum, [key]) => sum + getTokenCost(BLOCK_ACTION_KEYS[key]), 0),
    [selectedBlocks, getTokenCost]
  );

  const selectedCount = useMemo(() =>
    Object.values(selectedBlocks).filter(Boolean).length,
    [selectedBlocks]
  );

  const totalAvailable = balance?.total_available ?? Infinity;
  const insufficientTokens = totalAvailable < totalCost && totalAvailable !== Infinity;
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const [selectedIdeaIdx, setSelectedIdeaIdx] = useState<number | null>(null);
  const [selectedInsightIdx, setSelectedInsightIdx] = useState<number | null>(null);
  
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
    { key: "script", label: "🎬 Guión Principal", status: "pending" },
    { key: "director", label: "🎥 Modo Director", status: "pending" },
    { key: "marketing", label: "📊 Marketing (Tráfico + Estrategia)", status: "pending" },
    { key: "captions", label: "📱 Captions (4 variaciones)", status: "pending" },
    { key: "broll", label: "🎬 B-Roll (Ideas de tomas)", status: "pending" },
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
    director_prompt: DEFAULT_PROMPTS.director,
    marketing_prompt: DEFAULT_PROMPTS.marketing,
    captions_prompt: DEFAULT_PROMPTS.captions,
    broll_prompt: DEFAULT_PROMPTS.broll,
    reference_transcription: "",
    video_strategies: "",
    ai_model: "mistralai/mistral-large-latest",
    video_duration: "",
    target_platform: "",
    use_perplexity: false,
  });
  const [perplexityQueries, setPerplexityQueries] = useState<PerplexityQueriesState>({
    trends: true,
    hooks: true,
    narratives: true,
    objections: false,
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
        script_prompt: customPrompts.script || DEFAULT_PROMPTS.script,
        director_prompt: customPrompts.director || DEFAULT_PROMPTS.director,
        marketing_prompt: customPrompts.marketing || DEFAULT_PROMPTS.marketing,
        captions_prompt: customPrompts.captions || DEFAULT_PROMPTS.captions,
      }));
    }
  }, [customPrompts, loadingPrompts]);

  // No provider selection needed - using Kreoon AI

  // Pre-fill avatar from product if available
  useEffect(() => {
    if (product?.ideal_avatar && typeof product.ideal_avatar === 'string') {
      const strippedAvatar = product.ideal_avatar.replace(/<[^>]*>/g, '').substring(0, 200);
      setFormData(prev => ({
        ...prev,
        ideal_avatar: strippedAvatar
      }));
    }
  }, [product]);

  // Cargar la investigación COMPLETA del producto (avatar_profiles + sales_angles_data + market_research)
  const [researchProduct, setResearchProduct] = useState<any | null>(null);
  // ADN de Producto (V1): datos de la tabla product_dna
  const [productDnaRecord, setProductDnaRecord] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchResearchProduct = async () => {
      if (!product?.id) {
        setResearchProduct(null);
        setProductDnaRecord(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, client_id, avatar_profiles, sales_angles_data, market_research, sales_angles, ideal_avatar, brief_data")
          .eq("id", product.id)
          .maybeSingle();

        if (error) throw error;

        const normalized = (() => {
          if (!data) return null;
          const result = { ...(data as any) };

          const mr = result.market_research;
          if (typeof mr === "string") {
            try { result.market_research = JSON.parse(mr); } catch { /* keep as string */ }
          }
          const sad = result.sales_angles_data;
          if (typeof sad === "string") {
            try { result.sales_angles_data = JSON.parse(sad); } catch { /* keep as string */ }
          }
          const ap = result.avatar_profiles;
          if (typeof ap === "string") {
            try { result.avatar_profiles = JSON.parse(ap); } catch { /* keep as string */ }
          }
          const bd = result.brief_data;
          if (typeof bd === "string") {
            try { result.brief_data = JSON.parse(bd); } catch { /* keep as string */ }
          }

          return result;
        })();

        if (!cancelled) setResearchProduct(normalized);

        // Cargar ADN de Producto (product_dna): primero por ID exacto, fallback por client_id
        const dnaId = (normalized?.brief_data as any)?.product_dna_id;
        const clientId = normalized?.client_id;

        let dnaRecord: any = null;

        // Intento 1: por product_dna_id exacto
        if (dnaId) {
          const { data: d1 } = await supabase
            .from("product_dna")
            .select("id, strategy_recommendations, market_research, content_brief, emotional_analysis")
            .eq("id", dnaId)
            .maybeSingle();
          if (d1) dnaRecord = d1;
        }

        // Intento 2: por client_id (el más reciente con ángulos)
        if (!dnaRecord && clientId) {
          const { data: d2 } = await supabase
            .from("product_dna")
            .select("id, strategy_recommendations, market_research, content_brief, emotional_analysis")
            .eq("client_id", clientId)
            .not("strategy_recommendations", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (d2) dnaRecord = d2;
        }

        if (!cancelled) setProductDnaRecord(dnaRecord);
      } catch (e) {
        console.error("[StrategistScriptForm] Error fetching product research", e);
        if (!cancelled) {
          setResearchProduct(null);
          setProductDnaRecord(null);
        }
      }
    };

    fetchResearchProduct();

    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  const researchAvatars = useMemo(() => {
    const collected: any[] = [];

    // ADN Recargado: avatar_profiles.profiles
    const profiles = researchProduct?.avatar_profiles?.profiles;
    if (Array.isArray(profiles) && profiles.length) {
      collected.push(...profiles.map((a: any) => ({ ...a, _source: 'recargado' })));
    } else {
      // Fallback: market_research.strategicAvatars
      const strategicAvatars = researchProduct?.market_research?.strategicAvatars;
      if (Array.isArray(strategicAvatars) && strategicAvatars.length) {
        collected.push(...strategicAvatars.map((a: any) => ({ ...a, _source: 'recargado' })));
      }
    }

    // ADN Producto: product_dna.strategy_recommendations.seccion_3_avatares
    const dnaAvatars = productDnaRecord?.strategy_recommendations?.seccion_3_avatares;
    if (Array.isArray(dnaAvatars) && dnaAvatars.length) {
      const existingNames = new Set(collected.map((a: any) => (a?.name || a?.nombre_edad || '').toLowerCase()));
      dnaAvatars.forEach((a: any) => {
        const name = a?.nombre_edad || a?.nombre || '';
        if (name && !existingNames.has(name.toLowerCase())) {
          collected.push({ ...a, _source: 'dna' });
          existingNames.add(name.toLowerCase());
        }
      });
    }

    return collected;
  }, [researchProduct, productDnaRecord]);

  // Helper: parse emotional_analysis JSONB desde product_dna
  const parsedAiAnalysis = useMemo(() => {
    const raw = (productDnaRecord as any)?.emotional_analysis;
    if (!raw) return null;
    return typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
  }, [productDnaRecord]);

  // hasV2Data: true ONLY when ai_analysis real existe con datos
  const hasV2Data = useMemo(() => {
    return !!(parsedAiAnalysis?.creative_brief || parsedAiAnalysis?.target_audience || parsedAiAnalysis?.market_analysis);
  }, [parsedAiAnalysis]);

  const researchAngles = useMemo(() => {
    const collected: any[] = [];

    // ── V1: sales_angles_data.angles (estructurado) ──
    const v1Structured = researchProduct?.sales_angles_data?.angles;
    if (Array.isArray(v1Structured) && v1Structured.length) {
      collected.push(...v1Structured.map((a: any) => ({ ...a, _source: 'v1' })));
    } else {
      // V1 fallback: market_research.salesAngles
      const v1MR = researchProduct?.market_research?.salesAngles;
      if (Array.isArray(v1MR) && v1MR.length) {
        collected.push(...v1MR.map((a: any) => ({ ...a, _source: 'v1' })));
      } else {
        // V1 legacy: sales_angles simple array
        const legacy = (researchProduct?.sales_angles ?? product?.sales_angles) as any;
        if (Array.isArray(legacy) && legacy.length) {
          collected.push(...legacy.map((a: any) => ({ angle: typeof a === 'string' ? a : (a?.angle || a?.name || ''), _source: 'v1' })));
        }
      }
    }

    // ── ADN de Producto (product_dna.strategy_recommendations.seccion_4_angulos) ──
    const dnaAngles = productDnaRecord?.strategy_recommendations?.seccion_4_angulos;
    if (Array.isArray(dnaAngles) && dnaAngles.length) {
      const existingTexts = new Set(collected.map((a: any) => (a?.angle || a?.name || '').trim().toLowerCase()));
      dnaAngles.forEach((a: any) => {
        const text = a?.desarrollo || a?.angle_name || a?.angle || '';
        if (text && !existingTexts.has(text.trim().toLowerCase())) {
          collected.push({
            angle: text,
            hookExample: a?.hook_apertura || a?.hook || '',
            type: a?.tipo || a?.target_emotion || '',
            funnelPhase: a?.fase_esfera || '',
            avatar: a?.avatar_objetivo || '',
            _source: 'dna',
            _v2type: 'dna',
          });
          existingTexts.add(text.trim().toLowerCase());
        }
      });
    }

    // ── products.ai_analysis.creative_brief.content_pillars ──
    const pillars = parsedAiAnalysis?.creative_brief?.content_pillars;
    if (Array.isArray(pillars) && pillars.length) {
      const existingTexts = new Set(collected.map((a: any) => (a?.angle || a?.name || '').trim().toLowerCase()));
      pillars.forEach((p: unknown) => {
        const text = typeof p === 'string' ? p : (p as any)?.name || (p as any)?.pillar || '';
        if (text && !existingTexts.has(text.trim().toLowerCase())) {
          collected.push({ angle: text, type: 'contenido', _source: 'v2', _v2type: 'pillar' });
          existingTexts.add(text.trim().toLowerCase());
        }
      });
    }

    // ── products.ai_analysis.market_analysis.opportunities ──
    const opportunities = parsedAiAnalysis?.market_analysis?.opportunities;
    if (Array.isArray(opportunities) && opportunities.length) {
      const existingTexts = new Set(collected.map((a: any) => (a?.angle || a?.name || '').trim().toLowerCase()));
      opportunities.forEach((op: unknown) => {
        const text = typeof op === 'string' ? op : (op as any)?.opportunity || '';
        if (text && !existingTexts.has(text.trim().toLowerCase())) {
          collected.push({ angle: text, type: 'oportunidad', _source: 'v2', _v2type: 'opportunity' });
          existingTexts.add(text.trim().toLowerCase());
        }
      });
    }

    return collected;
  }, [researchProduct, product?.sales_angles, parsedAiAnalysis, productDnaRecord]);

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

  // Extraer dolores — ADN Recargado + ADN Producto (seccion_3_avatares.dolor_principal)
  const researchPains = useMemo(() => {
    const collected: { text: string; _source: string }[] = [];
    const seen = new Set<string>();
    const add = (text: string, source: string) => {
      const t = text.trim();
      if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); collected.push({ text: t, _source: source }); }
    };
    const pains = researchProduct?.market_research?.pains;
    if (Array.isArray(pains)) pains.forEach((p: any) => add(typeof p === 'string' ? p : (p?.pain || p?.description || p?.text || ''), 'recargado'));
    const jtbdPains = researchProduct?.market_research?.jtbd?.pains;
    if (Array.isArray(jtbdPains)) jtbdPains.forEach((p: any) => add(typeof p === 'string' ? p : (p?.pain || ''), 'recargado'));
    const avatarJtbdPains = parsedIdealAvatar?.jtbd?.pains;
    if (Array.isArray(avatarJtbdPains)) avatarJtbdPains.forEach((p: any) => add(typeof p === 'string' ? p : (p?.pain || ''), 'recargado'));
    const dnaAvatars = productDnaRecord?.strategy_recommendations?.seccion_3_avatares;
    if (Array.isArray(dnaAvatars)) dnaAvatars.forEach((a: any) => { if (a?.dolor_principal) add(a.dolor_principal, 'dna'); });
    return collected;
  }, [researchProduct, parsedIdealAvatar, productDnaRecord]);

  // Extraer deseos — ADN Recargado + ADN Producto (seccion_3_avatares.deseo_principal)
  const researchDesires = useMemo(() => {
    const collected: { text: string; _source: string }[] = [];
    const seen = new Set<string>();
    const add = (text: string, source: string) => {
      const t = text.trim();
      if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); collected.push({ text: t, _source: source }); }
    };
    const desires = researchProduct?.market_research?.desires;
    if (Array.isArray(desires)) desires.forEach((d: any) => add(typeof d === 'string' ? d : (d?.desire || d?.description || d?.text || ''), 'recargado'));
    const jtbdDesires = researchProduct?.market_research?.jtbd?.desires;
    if (Array.isArray(jtbdDesires)) jtbdDesires.forEach((d: any) => add(typeof d === 'string' ? d : (d?.desire || ''), 'recargado'));
    const avatarJtbdDesires = parsedIdealAvatar?.jtbd?.desires;
    if (Array.isArray(avatarJtbdDesires)) avatarJtbdDesires.forEach((d: any) => add(typeof d === 'string' ? d : (d?.desire || ''), 'recargado'));
    const dnaAvatars = productDnaRecord?.strategy_recommendations?.seccion_3_avatares;
    if (Array.isArray(dnaAvatars)) dnaAvatars.forEach((a: any) => { if (a?.deseo_principal) add(a.deseo_principal, 'dna'); });
    return collected;
  }, [researchProduct, parsedIdealAvatar, productDnaRecord]);

  // Extraer objeciones — ADN Recargado + ADN Producto (seccion_3_avatares.objecion_principal)
  const researchObjections = useMemo(() => {
    const collected: { text: string; _source: string }[] = [];
    const seen = new Set<string>();
    const add = (text: string, source: string) => {
      const t = text.trim();
      if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); collected.push({ text: t, _source: source }); }
    };
    const objections = researchProduct?.market_research?.objections;
    if (Array.isArray(objections)) objections.forEach((o: any) => add(typeof o === 'string' ? o : (o?.objection || o?.description || o?.text || ''), 'recargado'));
    const jtbdObjections = researchProduct?.market_research?.jtbd?.objections;
    if (Array.isArray(jtbdObjections)) jtbdObjections.forEach((o: any) => add(typeof o === 'string' ? o : (o?.objection || ''), 'recargado'));
    const avatarJtbdObjections = parsedIdealAvatar?.jtbd?.objections;
    if (Array.isArray(avatarJtbdObjections)) avatarJtbdObjections.forEach((o: any) => add(typeof o === 'string' ? o : (o?.objection || ''), 'recargado'));
    const dnaAvatars = productDnaRecord?.strategy_recommendations?.seccion_3_avatares;
    if (Array.isArray(dnaAvatars)) dnaAvatars.forEach((a: any) => { if (a?.objecion_principal) add(a.objecion_principal, 'dna'); });
    return collected;
  }, [researchProduct, parsedIdealAvatar, productDnaRecord]);

  // ── Intel ADN: datos enriquecidos de ambas fuentes ──────────────────────────

  // PUV (Propuesta de Valor Única) — ADN Recargado
  const researchPuv = useMemo(() => {
    return researchProduct?.sales_angles_data?.puv ?? null;
  }, [researchProduct]);

  // Transformación antes/después — ADN Recargado
  const researchTransformation = useMemo(() => {
    return researchProduct?.sales_angles_data?.transformation ?? null;
  }, [researchProduct]);

  // Ideas de video listas — ADN Recargado
  const researchVideoCreatives = useMemo(() => {
    const vc = researchProduct?.sales_angles_data?.videoCreatives;
    return Array.isArray(vc) ? vc : [];
  }, [researchProduct]);

  // Insights de comportamiento — ADN Recargado (jtbd.insights)
  const researchInsights = useMemo(() => {
    const ins = researchProduct?.market_research?.jtbd?.insights;
    return Array.isArray(ins) ? ins : [];
  }, [researchProduct]);

  // Contexto de marca — ADN Producto (seccion_1_contexto)
  const researchContexto = useMemo(() => {
    return productDnaRecord?.market_research?.seccion_1_contexto ?? null;
  }, [productDnaRecord]);

  // Inteligencia de mercado — ADN Producto (seccion_2_mercado)
  const researchMercado = useMemo(() => {
    return productDnaRecord?.market_research?.seccion_2_mercado ?? null;
  }, [productDnaRecord]);

  // Estructura del video — ADN Producto (seccion_7_ads)
  const researchVideoStructure = useMemo(() => {
    return productDnaRecord?.strategy_recommendations?.seccion_7_ads ?? null;
  }, [productDnaRecord]);

  // Hooks sugeridos — V2 primero, luego fallbacks V1
  const researchHookSuggestions = useMemo(() => {
    // 1. V2: ai_analysis.creative_brief.hooks_suggestions
    const v2arr = parsedAiAnalysis?.creative_brief?.hooks_suggestions ?? parsedAiAnalysis?.creative_brief?.hooksSuggestions ?? [];
    if (Array.isArray(v2arr) && v2arr.length) return v2arr.filter((s: unknown) => typeof s === 'string' && (s as string).trim()) as string[];

    // 2. V1: market_research.hooks
    const mrHooks = researchProduct?.market_research?.hooks;
    if (Array.isArray(mrHooks) && mrHooks.length) return mrHooks.filter((s: unknown) => typeof s === 'string') as string[];

    // 3. V1: ideal_avatar.messaging.hooks
    const avatarHooks = parsedIdealAvatar?.messaging?.hooks ?? parsedIdealAvatar?.hooks;
    if (Array.isArray(avatarHooks) && avatarHooks.length) return avatarHooks.filter((s: unknown) => typeof s === 'string') as string[];

    // 4. V1: keywords de los ángulos de venta como starters de hook
    const angles = researchProduct?.sales_angles_data?.angles;
    if (Array.isArray(angles)) {
      const keywords = angles.flatMap((a: any) => a?.keywords ?? []).filter((k: unknown) => typeof k === 'string' && (k as string).trim());
      if (keywords.length) return keywords as string[];
    }

    return [];
  }, [parsedAiAnalysis, researchProduct, parsedIdealAvatar]);

  // Mensajes clave — solo V2 (no hay equivalente directo en V1)
  const researchKeyMessages = useMemo(() => {
    const arr = parsedAiAnalysis?.creative_brief?.key_messages ?? parsedAiAnalysis?.creative_brief?.keyMessages ?? [];
    return Array.isArray(arr) ? arr.filter((s: unknown) => typeof s === 'string' && (s as string).trim()) as string[] : [];
  }, [parsedAiAnalysis]);

  // CTAs sugeridos — V2 primero, luego fallbacks V1
  const researchCtaSuggestions = useMemo(() => {
    // 1. V2: ai_analysis.creative_brief.cta_recommendations
    const v2arr = parsedAiAnalysis?.creative_brief?.cta_recommendations ?? parsedAiAnalysis?.creative_brief?.ctaRecommendations ?? [];
    if (Array.isArray(v2arr) && v2arr.length) return v2arr.filter((s: unknown) => typeof s === 'string' && (s as string).trim()) as string[];

    // 2. V1: market_research.ctas / ctaExamples
    const mrCtas = researchProduct?.market_research?.ctas ?? researchProduct?.market_research?.ctaExamples;
    if (Array.isArray(mrCtas) && mrCtas.length) return mrCtas.filter((s: unknown) => typeof s === 'string') as string[];

    // 3. V1: PUV callToAction
    const puv = researchProduct?.sales_angles_data?.puv;
    const ctaFromPuv = puv?.callToAction ?? puv?.cta;
    if (typeof ctaFromPuv === 'string' && ctaFromPuv.trim()) return [ctaFromPuv];

    return [];
  }, [parsedAiAnalysis, researchProduct]);

  // Disparadores de compra — V2 primero, luego V1 objeciones invertidas como proxy
  const researchBuyingTriggers = useMemo(() => {
    const v2arr = parsedAiAnalysis?.target_audience?.buying_triggers ?? parsedAiAnalysis?.target_audience?.buyingTriggers ?? [];
    if (Array.isArray(v2arr) && v2arr.length) return v2arr.filter((s: unknown) => typeof s === 'string' && (s as string).trim()) as string[];

    // V1 fallback: motivadores desde market_research
    const motivators = researchProduct?.market_research?.motivators ?? researchProduct?.market_research?.buyingMotivators;
    if (Array.isArray(motivators) && motivators.length) return motivators.filter((s: unknown) => typeof s === 'string') as string[];

    return [];
  }, [parsedAiAnalysis, researchProduct]);

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
      
      // Auto-fill country from product brief_data if form is empty
      if (!prev.target_country) {
        const bd = researchProduct?.brief_data as any;
        const country = bd?.target_country
          || (Array.isArray(bd?.target_locations) && bd.target_locations[0])
          || '';
        if (country) updates.target_country = country;
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
      { key: "script", label: "🎬 Guión", status: "pending" },
      { key: "director", label: "🎥 Director", status: "pending" },
      { key: "marketing", label: "📊 Marketing", status: "pending" },
      { key: "captions", label: "📱 Captions", status: "pending" },
    ]);
  };

  const handleRandomize = () => {
    // Pick a random item from arr that's different from current when possible
    function pickRandom<T>(arr: T[], current?: T): T | undefined {
      if (!arr.length) return undefined;
      const others = arr.filter(x => x !== current);
      const pool = others.length > 0 ? others : arr;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function getAngleText(a: unknown): string {
      if (typeof a === 'string') return a;
      const o = a as Record<string, string>;
      return o?.angle || o?.salesAngle || o?.name || '';
    }

    function getPainText(p: unknown): string {
      if (typeof p === 'string') return p;
      const o = p as Record<string, string>;
      return o?.pain || o?.description || o?.text || '';
    }

    function getDesireText(d: unknown): string {
      if (typeof d === 'string') return d;
      const o = d as Record<string, string>;
      return o?.desire || o?.description || o?.text || '';
    }

    function getObjectionText(o: unknown): string {
      if (typeof o === 'string') return o;
      const obj = o as Record<string, string>;
      return obj?.objection || obj?.description || obj?.text || '';
    }

    const updates: Partial<typeof formData> = {};

    // Ángulo de venta — aleatorio entre todos los ángulos disponibles
    if (researchAngles.length > 0) {
      const currentAngleText = formData.sales_angle;
      const angleTexts = researchAngles.map(getAngleText).filter(Boolean);
      const picked = pickRandom(angleTexts, currentAngleText);
      if (picked) updates.sales_angle = picked;
    }

    // Estructura narrativa — aleatoria entre todas las disponibles
    const structures = NARRATIVE_STRUCTURES.map(s => s.value);
    const pickedStructure = pickRandom(structures, formData.narrative_structure);
    if (pickedStructure) updates.narrative_structure = pickedStructure;

    // Dolor — aleatorio entre los disponibles
    if (researchPains.length > 0) {
      const painTexts = researchPains.map(getPainText).filter(Boolean);
      const picked = pickRandom(painTexts, formData.selected_pain);
      if (picked) updates.selected_pain = picked;
    }

    // Deseo — aleatorio entre los disponibles
    if (researchDesires.length > 0) {
      const desireTexts = researchDesires.map(getDesireText).filter(Boolean);
      const picked = pickRandom(desireTexts, formData.selected_desire);
      if (picked) updates.selected_desire = picked;
    }

    // Objeción — aleatoria si hay
    if (researchObjections.length > 0) {
      const objTexts = researchObjections.map(getObjectionText).filter(Boolean);
      const picked = pickRandom(objTexts, formData.selected_objection);
      if (picked) updates.selected_objection = picked;
    }

    // Avatar ideal — aleatorio desde researchAvatars (mismo formato que el selector)
    if (researchAvatars.length > 0) {
      const avatarFormatted = (researchAvatars as any[]).map((a, idx) => {
        const isDna = a._source === 'dna';
        const name = isDna
          ? (a?.nombre_edad || a?.nombre || `Avatar ${idx + 1}`)
          : (a?.name || a?.avatarName || `Avatar ${idx + 1}`);
        const rawSituation = isDna ? a?.situacion_actual : (a?.situation || a?.currentSituation);
        const situation = typeof rawSituation === 'string' ? rawSituation : (rawSituation?.dayToDay || '');
        const dolor = isDna ? a?.dolor_principal : '';
        return [
          `AVATAR: ${name}`,
          situation ? `SITUACIÓN: ${situation}` : '',
          dolor ? `DOLOR: ${dolor}` : '',
        ].filter(Boolean).join('\n');
      }).filter(Boolean);
      const picked = pickRandom(avatarFormatted, formData.ideal_avatar);
      if (picked) updates.ideal_avatar = picked;
    }

    // CTA — aleatorio desde V2 si hay, si no del CTA genérico
    const ctaPool = [
      ...researchCtaSuggestions,
      'Consíguelo ahora',
      'Link en bio',
      'Escríbenos hoy',
      'Agenda tu cita',
      'Pruébalo gratis',
    ];
    const pickedCta = pickRandom(ctaPool, formData.cta);
    if (pickedCta) updates.cta = pickedCta;

    // Hooks — barajar y tomar N aleatorios de las sugerencias
    const hookPool = researchHookSuggestions.length > 0 ? researchHookSuggestions : [];
    if (hookPool.length > 0) {
      const count = parseInt(formData.hooks_count) || 3;
      const shuffled = [...hookPool].sort(() => Math.random() - 0.5);
      updates.hooks = shuffled.slice(0, count);
    }

    // Idea de video — seleccionar aleatoriamente una diferente
    if (researchVideoCreatives.length > 0) {
      const indices = researchVideoCreatives.map((_: any, idx: number) => idx);
      const others = indices.filter((idx: number) => idx !== selectedIdeaIdx);
      const pool = others.length > 0 ? others : indices;
      const pickedIdx: number = pool[Math.floor(Math.random() * pool.length)];
      setSelectedIdeaIdx(pickedIdx);
      const hook = (researchVideoCreatives[pickedIdx] as any)?.structure?.hook;
      if (hook) {
        const existingHooks = updates.hooks ?? formData.hooks;
        if (!existingHooks.includes(hook)) {
          updates.hooks = [...existingHooks, hook];
        }
      }
    }

    // Insight — seleccionar aleatoriamente uno diferente y aplicar su accionable
    if (researchInsights.length > 0) {
      const indices = researchInsights.map((_: any, idx: number) => idx);
      const others = indices.filter((idx: number) => idx !== selectedInsightIdx);
      const pool = others.length > 0 ? others : indices;
      const pickedIdx: number = pool[Math.floor(Math.random() * pool.length)];
      setSelectedInsightIdx(pickedIdx);
      const actionable = (researchInsights[pickedIdx] as any)?.actionable;
      if (actionable) {
        const base = updates.additional_instructions ?? formData.additional_instructions;
        if (!base.includes(actionable)) {
          updates.additional_instructions = base ? `${base}\n${actionable}` : actionable;
        }
      }
    }

    if (Object.keys(updates).length > 0) setFormData(prev => ({ ...prev, ...updates }));
  };

  const buildBaseContext = () => {
    const narrativeLabel = NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label || formData.narrative_structure;
    const narrativeStrategy = NARRATIVE_STRATEGIES[formData.narrative_structure] || null;
    
    // Determine sphere phase info
    const sphereInfo = spherePhase ? getSpherePhaseInfo(spherePhase) : null;
    
    // Get business type
    const businessType = (product?.business_type as 'product_service' | 'personal_brand') || 'product_service';
    const isPersonalBrand = businessType === 'personal_brand';
    
    // Parse structured research data (V1 + V2)
    const researchData = product ? parseProductResearch({
      market_research: product.market_research,
      avatar_profiles: product.avatar_profiles,
      sales_angles: product.sales_angles,
      sales_angles_data: product.sales_angles_data,
      competitor_analysis: product.competitor_analysis,
      brief_data: product.brief_data,
      ai_analysis: (productDnaRecord as any)?.emotional_analysis ?? null,
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
${narrativeStrategy ? `\n${narrativeStrategy}\n` : ''}PAÍS OBJETIVO: ${formData.target_country}
${formData.video_duration ? `DURACIÓN DEL VIDEO: ${durationLabel}` : ''}
${formData.target_platform ? `PLATAFORMA DESTINO: ${platformLabel}` : ''}
AVATAR/CLIENTE IDEAL: ${formData.ideal_avatar}

⚠️ CANTIDAD DE HOOKS: ${formData.hooks_count} (OBLIGATORIO: genera EXACTAMENTE esta cantidad en la ESCENA 1)

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

`}ÁNGULOS DE VENTA DISPONIBLES (${researchAngles.length > 0 ? `${researchAngles.filter((a: any) => a._source === 'v1').length} V1 + ${researchAngles.filter((a: any) => a._source === 'v2').length} V2` : 'ninguno'}):
${researchAngles.length > 0
  ? researchAngles.map((a: any, i: number) => {
      const text = a?.angle || a?.salesAngle || a?.name || '';
      if (!text) return null;
      const type = a?.type || a?.category || '';
      const hook = a?.hookExample || '';
      const src = a?._source === 'v2' ? `[V2${a?._v2type ? ' · ' + a._v2type : ''}]` : '[V1]';
      return `${i + 1}. ${src}${type ? ` [${type}]` : ''} ${text}${hook ? ` | Hook: "${hook}"` : ''}`;
    }).filter(Boolean).join('\n')
  : product?.sales_angles?.join(', ') || 'No definidos'}

HOOKS SUGERIDOS:
${formData.hooks.length > 0 ? formData.hooks.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'Generar automáticamente'}`;

    // Agregar datos exclusivos del ADN V2 si están disponibles
    if (researchData?.keyMessages?.length) {
      context += `\n\nMENSAJES CLAVE (ADN V2):\n${researchData.keyMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
    }
    if (researchData?.ctaRecommendations?.length) {
      context += `\n\nCTAs RECOMENDADOS (ADN V2):\n${researchData.ctaRecommendations.slice(0, 4).map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
    }
    if (researchData?.trends?.length) {
      context += `\n\nTENDENCIAS DE MERCADO (ADN V2):\n${researchData.trends.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
    }
    if (researchData?.buyingTriggers?.length) {
      context += `\n\nDISPARADORES DE COMPRA (ADN V2):\n${researchData.buyingTriggers.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
    }

    // ── Datos enriquecidos de ADN Recargado + ADN Producto ──
    if (researchPuv) {
      context += `\n\n=== PROPUESTA DE VALOR ÚNICA ===\n${researchPuv.statement}`;
      if (researchPuv.tangibleResult) context += `\nResultado tangible: ${researchPuv.tangibleResult}`;
      if (researchPuv.marketDifference) context += `\nDiferencia de mercado: ${researchPuv.marketDifference}`;
      if (researchPuv.credibility) context += `\nCredibilidad: ${researchPuv.credibility}`;
    }

    if (researchTransformation) {
      const dims = [
        { key: 'emotional', label: 'Emocional' },
        { key: 'functional', label: 'Funcional' },
        { key: 'identity', label: 'Identidad' },
      ] as const;
      const parts = dims.map(({ key, label }) => {
        const d = (researchTransformation as any)[key];
        return d?.before && d?.after ? `${label}: "${d.before}" → "${d.after}"` : null;
      }).filter(Boolean);
      if (parts.length) context += `\n\n=== TRANSFORMACIÓN DEL CLIENTE ===\n${parts.join('\n')}`;
    }

    if (researchContexto) {
      const lines = [];
      if (researchContexto.tono_emocional_audio) lines.push(`Tono: ${researchContexto.tono_emocional_audio}`);
      if (Array.isArray(researchContexto.palabras_clave_cliente) && researchContexto.palabras_clave_cliente.length)
        lines.push(`Palabras clave: ${researchContexto.palabras_clave_cliente.join(', ')}`);
      if (researchContexto.restricciones_creativas) lines.push(`⚠️ Restricciones: ${researchContexto.restricciones_creativas}`);
      if (researchContexto.referentes_estilo) lines.push(`Referentes UGC: ${researchContexto.referentes_estilo}`);
      if (lines.length) context += `\n\n=== CONTEXTO DE MARCA ===\n${lines.join('\n')}`;
    }

    if (researchMercado) {
      const lines = [];
      if (researchMercado.tendencias_actuales) lines.push(`Tendencias: ${researchMercado.tendencias_actuales}`);
      if (researchMercado.gap_competitivo) lines.push(`Gap competitivo: ${researchMercado.gap_competitivo}`);
      if (researchMercado.posicionamiento_sugerido) lines.push(`Posicionamiento: ${researchMercado.posicionamiento_sugerido}`);
      if (lines.length) context += `\n\n=== INTELIGENCIA DE MERCADO ===\n${lines.join('\n')}`;
    }

    if (researchVideoStructure?.estructura_creativo_ad) {
      const e = researchVideoStructure.estructura_creativo_ad;
      context += `\n\n=== ESTRUCTURA DEL VIDEO ===\nHook (0-3s): ${e.hook || ''}\nProblema (3-10s): ${e.problema || ''}\nSolución (10-25s): ${e.solucion || ''}\nCTA (25-30s): ${e.cta || ''}`;
      if (researchVideoStructure.variaciones_recomendadas) context += `\nVariaciones: ${researchVideoStructure.variaciones_recomendadas}`;
    }

    if (researchInsights.length > 0) {
      context += `\n\n=== INSIGHTS DE COMPORTAMIENTO (top ${Math.min(4, researchInsights.length)}) ===\n${researchInsights.slice(0, 4).map((ins: any, i: number) => `${i + 1}. ${ins.insight}${ins.actionable ? ` → ${ins.actionable}` : ''}`).join('\n')}`;
    }

    // Idea de video seleccionada — inyectar estructura completa al prompt
    if (selectedIdeaIdx !== null && researchVideoCreatives[selectedIdeaIdx]) {
      const idea = researchVideoCreatives[selectedIdeaIdx] as any;
      const parts = [
        idea.title && `Título: ${idea.title}`,
        idea.angle && `Ángulo: ${idea.angle}`,
        idea.structure?.hook && `Hook: ${idea.structure.hook}`,
        idea.structure?.body && `Desarrollo: ${idea.structure.body}`,
        idea.structure?.cta && `CTA: ${idea.structure.cta}`,
        idea.duration && `Duración sugerida: ${idea.duration}`,
      ].filter(Boolean).join('\n');
      if (parts) context += `\n\n=== IDEA DE VIDEO SELECCIONADA (seguir esta estructura) ===\n${parts}`;
    }

    // Insight seleccionado — enfatizar al modelo
    if (selectedInsightIdx !== null && researchInsights[selectedInsightIdx]) {
      const ins = researchInsights[selectedInsightIdx] as any;
      context += `\n\n=== INSIGHT CLAVE SELECCIONADO (incorporar en el guión) ===\n${ins.insight}${ins.actionable ? `\nAplicación: ${ins.actionable}` : ''}`;
    }

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

  const buildRequestBody = (type: string, customPrompt: string, previousScript?: string) => {
    const baseContext = buildBaseContext();
    let fullPrompt = `${customPrompt}\n\n---\nCONTEXTO:\n${baseContext}`;
    if (previousScript && type !== "script") {
      fullPrompt += `\n\n---\nGUIÓN GENERADO:\n${previousScript}`;
    }
    return {
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
      use_skills: type === "script",
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
    };
  };

  // SSE streaming para el guion (skills en fases paralelas)
  const generateContentWithSkills = async (body: object): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? SUPABASE_ANON_KEY;

    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/${CONTENT_AI_FUNCTION}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error ${response.status}: ${text}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalScript = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          try {
            const payload = JSON.parse(line.slice(6));
            if (currentEvent === "phase_start") {
              setSkillsProgress({
                phase: payload.phase,
                totalPhases: payload.total,
                currentSkillNames: payload.skills ?? [],
                pct: payload.pct ?? 0,
              });
            } else if (currentEvent === "phase_complete") {
              setSkillsProgress(prev => prev ? { ...prev, pct: payload.pct ?? prev.pct } : prev);
            } else if (currentEvent === "complete") {
              finalScript = payload.script ?? payload.result ?? "";
              if (payload.error) throw new Error(payload.error);
            } else if (currentEvent === "error") {
              throw new Error(payload.message ?? "Error en la generación");
            }
          } catch (parseErr) {
            // línea malformada, ignorar
          }
          currentEvent = "";
        }
      }
    }

    return finalScript;
  };

  const generateContent = async (
    type: "script" | "director" | "marketing" | "captions" | "broll" | "editor" | "strategist" | "trafficker" | "designer" | "admin",
    customPrompt: string,
    previousScript?: string
  ): Promise<string> => {
    const body = buildRequestBody(type, customPrompt, previousScript);

    if (type === "script") {
      return generateContentWithSkills(body);
    }

    const { data, error } = await supabase.functions.invoke(CONTENT_AI_FUNCTION, { body });

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

    if (selectedCount === 0) {
      toast({
        title: "Selecciona al menos un bloque",
        description: "Debes seleccionar al menos un bloque para generar",
        variant: "destructive",
      });
      return;
    }

    // Pre-check token balance
    if (insufficientTokens) {
      toast({
        title: "Tokens insuficientes",
        description: `Necesitas ${totalCost} tokens pero tienes ${totalAvailable}. Compra mas tokens o selecciona menos bloques.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    resetSteps();

    const generatedContent: GeneratedContent = {
      script: "",
      director_output: "",
      marketing_output: "",
      captions: "",
    };

    const emitProgress = (patch: Partial<GeneratedContent>) => {
      console.log("[StrategistScriptForm] emitProgress", {
        script: patch.script?.length,
        director: patch.director_output?.length,
        marketing: patch.marketing_output?.length,
        captions: patch.captions?.length,
      });
      onScriptGenerated({ ...generatedContent, ...patch });
    };

    // Determine script context: generate new or use existing
    let scriptContext = "";

    try {
      // Step 1: Script block (generate or use existing as context)
      if (selectedBlocks.script) {
        updateStepStatus("script", "generating");
        try {
          generatedContent.script = await generateContent("script", formData.script_prompt);
          updateStepStatus("script", "done");
          emitProgress({ script: generatedContent.script });
          scriptContext = generatedContent.script;
        } catch (error: any) {
          updateStepStatus("script", "error");
          if (error?.message?.includes("insufficient_tokens") || error?.message?.includes("402")) {
            toast({ title: "Tokens insuficientes", description: "No hay tokens suficientes para continuar.", variant: "destructive" });
            refetchBalance();
            return;
          }
          throw error;
        }
      } else {
        // Use existing script from form data as context for other blocks
        scriptContext = formData.script_prompt;
      }

      // Step 2-5: Other blocks (only selected ones)
      const otherBlocks: Array<{
        key: "director" | "marketing" | "captions" | "broll";
        field: keyof GeneratedContent;
        prompt: string;
      }> = [
        { key: "director", field: "director_output", prompt: formData.director_prompt || "" },
        { key: "marketing", field: "marketing_output", prompt: formData.marketing_prompt || "" },
        { key: "captions", field: "captions", prompt: formData.captions_prompt || "" },
        { key: "broll", field: "broll_output", prompt: formData.broll_prompt || "" },
      ];

      for (const block of otherBlocks) {
        if (!selectedBlocks[block.key]) continue;

        updateStepStatus(block.key, "generating");
        try {
          const result = await generateContent(block.key, block.prompt, scriptContext);
          (generatedContent as any)[block.field] = result;
          updateStepStatus(block.key, "done");
          emitProgress({ [block.field]: result });
        } catch (error: any) {
          updateStepStatus(block.key, "error");
          if (error?.message?.includes("insufficient_tokens") || error?.message?.includes("402")) {
            toast({ title: "Tokens insuficientes", description: "Se agotaron los tokens. Los bloques anteriores se conservaron.", variant: "destructive" });
            refetchBalance();
            return;
          }
          throw error;
        }
      }

      toast({
        title: "Contenido generado exitosamente",
        description: `${selectedCount} bloque${selectedCount > 1 ? 's' : ''} generado${selectedCount > 1 ? 's' : ''} con IA`,
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
      setSkillsProgress(null);
      refetchBalance();
    }
  };

  if (!product) {
    return (
      <div className="p-4 sm:p-6 border rounded-sm bg-muted/50 text-center">
        <FileText className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 text-muted-foreground" />
        <p className="text-xs sm:text-sm text-muted-foreground">
          Selecciona un producto para crear el brief del guión
        </p>
      </div>
    );
  }

  const hasDocumentUrls = product.brief_url || product.onboarding_url || product.research_url;

  return (
    <div className="space-y-3 sm:space-y-6 p-3 sm:p-6 border rounded-sm bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg">
          <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Formulario de Guión
        </h4>
        <div className="flex items-center gap-1.5">
          {(researchAngles.length > 0 || researchPains.length > 0 || researchDesires.length > 0) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRandomize}
              className="h-7 px-2 text-[10px] sm:text-xs gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              title="Aleatorizar combinación de ángulo, dolor, deseo, estructura y CTA"
            >
              <Shuffle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Aleatorizar</span>
            </Button>
          )}
          {/* Investigación en tiempo real — toggle compacto */}
          <div
            className={`flex items-center gap-1 rounded-sm border px-1.5 py-1 transition-colors cursor-pointer ${
              formData.use_perplexity
                ? 'border-purple-500/50 bg-purple-500/15'
                : 'border-border bg-muted/20 hover:bg-muted/40'
            }`}
            onClick={() => setFormData(prev => ({ ...prev, use_perplexity: !prev.use_perplexity }))}
            title="Investigación en tiempo real con Perplexity"
          >
            <Search className={`h-3 w-3 shrink-0 ${formData.use_perplexity ? 'text-purple-400' : 'text-muted-foreground'}`} />
            <span className={`text-[10px] hidden sm:inline ${formData.use_perplexity ? 'text-purple-300' : 'text-muted-foreground'}`}>
              Investigar
            </span>
            <Switch
              checked={formData.use_perplexity}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_perplexity: checked }))}
              className="scale-75 pointer-events-none"
            />
          </div>
          <Badge variant="secondary" className="text-[10px] sm:text-xs bg-primary/10 text-primary border-primary/20 truncate max-w-[100px] sm:max-w-none">
            {AI_MODELS.find(m => m.value === formData.ai_model)?.label || "IA"}
          </Badge>
        </div>
      </div>

      {/* Chips de tipo de investigación — solo cuando está activo */}
      {formData.use_perplexity && (
        <div className="flex items-center gap-1.5 flex-wrap animate-in slide-in-from-top-1 duration-150">
          <span className="text-[10px] text-purple-400 shrink-0">Investigar:</span>
          {([
            { key: 'hooks',      label: '🎣 Hooks virales' },
            { key: 'narratives', label: '🧠 Narrativas' },
            { key: 'trends',     label: '📈 Tendencias' },
            { key: 'objections', label: '💬 Objeciones' },
            { key: 'competitors',label: '🏢 Competencia' },
          ] as { key: keyof PerplexityQueriesState; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPerplexityQueries(q => ({ ...q, [key]: !q[key] }))}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                perplexityQueries[key]
                  ? 'bg-purple-500/25 border-purple-500/50 text-purple-200'
                  : 'bg-muted/20 border-border text-muted-foreground hover:border-purple-500/30'
              }`}
            >
              {label}
            </button>
          ))}
          {customPerplexityQuery.trim() && (
            <span className="text-[10px] text-purple-300 italic truncate max-w-[150px]">+ "{customPerplexityQuery.trim()}"</span>
          )}
        </div>
      )}

      {/* ——————————————————————————————————————————————————
          Fila de 4 columnas: Pre-llenado · CAST · Intel ADN · Bloques
          —————————————————————————————————————————————————— */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">

        {/* Col 1 — Pre-llenado IA */}
        <div className="rounded-sm border bg-green-500/5 border-green-500/20 p-2 flex flex-col gap-1.5 min-h-[90px]">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-green-300 uppercase tracking-wide">
            <Bot className="h-3 w-3 shrink-0" /> Pre-llenado IA
          </div>
          {prefillStatus.isPrefilled ? (
            <div className="flex items-center gap-1 text-[10px] text-green-400">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              <span>Aplicado</span>
              {prefillStatus.prefilledAt && (
                <span className="ml-auto text-[9px] opacity-60 shrink-0">
                  {new Date(prefillStatus.prefilledAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground">Sin sugerencias</div>
          )}
          {(researchAngles.length > 0 || researchPains.length > 0 || researchDesires.length > 0) && (
            <button
              type="button"
              onClick={handleRandomize}
              className="mt-auto flex items-center justify-center gap-1 py-1.5 rounded-sm border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] hover:bg-amber-500/20 transition-colors"
            >
              <Shuffle className="h-3 w-3 shrink-0" /> Aleatorizar
            </button>
          )}
        </div>

        {/* Col 2 — Estrategia CAST */}
        {(() => {
          const castInfo = spherePhase ? getCastLayerInfo(spherePhase) : null;
          const colorMap: Record<string, string> = {
            C: 'from-blue-500/10 to-cyan-500/10 border-blue-500/30',
            A: 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30',
            S: 'from-red-500/10 to-rose-500/10 border-red-500/30',
            T: 'from-green-500/10 to-emerald-500/10 border-green-500/30',
          };
          const textMap: Record<string, string> = {
            C: 'text-blue-400', A: 'text-yellow-400', S: 'text-red-400', T: 'text-green-400',
          };
          const bg = castInfo ? (colorMap[castInfo.letter] || colorMap['C']) : '';
          const tc = castInfo ? (textMap[castInfo.letter] || textMap['C']) : '';
          return (
            <div className={`rounded-sm border p-2 flex flex-col gap-1.5 min-h-[90px] ${castInfo ? `bg-gradient-to-br ${bg}` : 'bg-muted/10 border-border opacity-40'}`}>
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${castInfo ? tc : 'text-muted-foreground'}`}>
                Estrategia CAST
              </div>
              {castInfo ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xl font-bold leading-none ${tc}`}>{castInfo.letter}</span>
                    <div>
                      <p className="text-[10px] font-semibold leading-tight">{castInfo.layerName}</p>
                      <p className="text-[9px] opacity-70">{castInfo.funnel}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-0.5 mt-auto">
                    {castInfo.kpis.slice(0, 3).map(kpi => (
                      <span key={kpi} className="text-[9px] px-1 py-0.5 rounded bg-background/30 font-mono">{kpi}</span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-muted-foreground">Sin fase asignada</div>
              )}
            </div>
          );
        })()}

        {/* Col 3 — Intel ADN (expandible abajo) */}
        <button
          type="button"
          onClick={() => setIntelOpen(o => !o)}
          className="rounded-sm border bg-violet-500/5 border-violet-500/20 p-2 flex flex-col gap-1.5 text-left hover:bg-violet-500/10 transition-colors min-h-[90px]"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-violet-300 uppercase tracking-wide">
              <Brain className="h-3 w-3 shrink-0" /> Intel ADN
            </div>
            {intelOpen
              ? <ChevronUp className="h-3 w-3 text-violet-400 shrink-0" />
              : <ChevronDown className="h-3 w-3 text-violet-400 shrink-0" />
            }
          </div>
          <div className="flex flex-wrap gap-1">
            {researchAngles.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300">{researchAngles.length} ángulos</span>
            )}
            {researchPains.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300">{researchPains.length} dolores</span>
            )}
            {researchHookSuggestions.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{researchHookSuggestions.length} hooks</span>
            )}
            {hasV2Data && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300 font-semibold">V2</span>
            )}
          </div>
          <div className="text-[9px] text-muted-foreground mt-auto">
            {intelOpen ? 'Clic para cerrar ↑' : 'Clic para ver datos ↓'}
          </div>
        </button>

        {/* Col 4 — Bloques a generar */}
        <div className="rounded-sm border bg-muted/30 p-2 flex flex-col gap-1.5 min-h-[90px]">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              <Sparkles className="h-3 w-3 text-primary shrink-0" /> Bloques
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
              {totalCost > 0 && <span className="font-mono">{totalCost} tkn</span>}
              {selectedCount < 6 && (
                <button
                  type="button"
                  className="text-primary hover:underline text-[9px]"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedBlocks({ script: true, director: true, marketing: true, captions: true, broll: true });
                  }}
                >
                  Todos
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-0.5 flex-1">
            {Object.entries(BLOCK_LABELS).map(([key, { emoji, short }]) => {
              const isSelected = selectedBlocks[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={e => { e.stopPropagation(); setSelectedBlocks(prev => ({ ...prev, [key]: !prev[key] })); }}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-sm border py-1 text-center transition-all select-none ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/30 text-muted-foreground border-border opacity-60 hover:opacity-90 hover:border-primary/50'
                  }`}
                >
                  <span className="text-xs leading-none">{emoji}</span>
                  <span className="text-[8px] font-medium leading-tight truncate w-full text-center">{short}</span>
                </button>
              );
            })}
          </div>
          {balance && (
            <div className="text-[9px] text-muted-foreground">
              Saldo: <span className={insufficientTokens ? 'text-destructive font-semibold' : 'text-foreground'}>
                {totalAvailable === Infinity ? '∞' : totalAvailable.toLocaleString()}
              </span>
            </div>
          )}
          {insufficientTokens && (
            <p className="text-[9px] text-destructive flex items-center gap-0.5">
              <AlertCircle className="h-3 w-3 shrink-0" /> Tokens insuficientes
            </p>
          )}
        </div>

      </div>

      {/* Intel ADN — contenido expandido (ancho completo, debajo de la fila) */}
      {intelOpen && (hasV2Data || researchAngles.length > 0 || researchPains.length > 0) && (
        <div className="rounded-sm border bg-violet-500/5 border-violet-500/20 p-3 space-y-3">

          {/* Hooks sugeridos */}
          {researchHookSuggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="h-3 w-3" /> Hooks sugeridos {hasV2Data && <span className="text-green-400">(ADN V2)</span>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {researchHookSuggestions.slice(0, 6).map((hook, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="text-[10px] px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/25 transition-colors text-left max-w-[200px] truncate"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      hooks: prev.hooks.includes(hook) ? prev.hooks : [...prev.hooks, hook].slice(0, parseInt(prev.hooks_count)),
                    }))}
                    title={hook}
                  >
                    + {hook}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mensajes clave */}
          {researchKeyMessages.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Mensajes clave (ADN V2)
              </p>
              <ul className="space-y-1">
                {researchKeyMessages.slice(0, 5).map((msg, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <ChevronRight className="h-3 w-3 text-violet-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] text-muted-foreground">{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTAs recomendados */}
          {researchCtaSuggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wide flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> CTAs recomendados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {researchCtaSuggestions.slice(0, 4).map((cta, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="text-[10px] px-2 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-200 hover:bg-green-500/25 transition-colors"
                    onClick={() => setFormData(prev => ({ ...prev, cta }))}
                    title={`Aplicar CTA: ${cta}`}
                  >
                    {cta}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Disparadores de compra */}
          {researchBuyingTriggers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="h-3 w-3" /> Disparadores de compra
              </p>
              <div className="flex flex-wrap gap-1.5">
                {researchBuyingTriggers.slice(0, 5).map((trigger, idx) => (
                  <span key={idx} className="text-[10px] px-2 py-1 rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-200">
                    {trigger}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Acciones rápidas */}
          <div className="flex gap-2 pt-1">
            {(hasV2Data || researchAngles.length > 0 || researchPains.length > 0 || researchDesires.length > 0) && (
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-sm border border-violet-500/30 bg-violet-500/15 hover:bg-violet-500/25 transition-colors text-xs font-medium text-violet-200"
                onClick={() => {
                  const updates: Partial<typeof formData> = {};
                  if (!formData.sales_angle && researchAngles.length > 0) {
                    const a = researchAngles[0] as any;
                    updates.sales_angle = a?.angle || a?.salesAngle || a?.name || '';
                  }
                  if (!formData.selected_pain && researchPains.length > 0) {
                    const p = researchPains[0] as any;
                    updates.selected_pain = typeof p === 'string' ? p : (p?.pain || p?.description || '');
                  }
                  if (!formData.selected_desire && researchDesires.length > 0) {
                    const d = researchDesires[0] as any;
                    updates.selected_desire = typeof d === 'string' ? d : (d?.desire || d?.description || '');
                  }
                  if (!formData.cta && researchCtaSuggestions.length > 0) {
                    updates.cta = researchCtaSuggestions[0];
                  }
                  if (formData.hooks.length === 0 && researchHookSuggestions.length > 0) {
                    updates.hooks = researchHookSuggestions.slice(0, parseInt(formData.hooks_count));
                  }
                  if (Object.keys(updates).length > 0) setFormData(prev => ({ ...prev, ...updates }));
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {hasV2Data ? 'Auto-aplicar sugerencias ADN' : 'Aplicar sugerencias de investigación'}
              </button>
            )}
            {(researchAngles.length > 0 || researchPains.length > 0 || researchDesires.length > 0) && (
              <button
                type="button"
                className="w-auto px-3 flex items-center justify-center gap-2 py-2 rounded-sm border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors text-xs font-medium text-amber-200"
                onClick={handleRandomize}
                title="Aleatorizar combinación"
              >
                <Shuffle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Intel ADN — Grid de tarjetas compactas ── */}
      {(researchPuv || researchTransformation || researchContexto || researchMercado || researchVideoStructure || researchVideoCreatives.length > 0 || researchInsights.length > 0) && (
        <div className="space-y-2">

          {/* ── Ideas + Insights lado a lado ── */}
          {(researchVideoCreatives.length > 0 || researchInsights.length > 0) && (
            <div className="grid grid-cols-2 gap-2">

              {/* 🎬 Ideas de Video */}
              {researchVideoCreatives.length > 0 && (
                <div className="rounded-sm border bg-muted/20 p-2">
                  <p className="text-[10px] text-muted-foreground mb-2 px-1">
                    🎬 {researchVideoCreatives.length} ideas de video
                  </p>
                  <div className="max-h-56 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-1.5">
                      {researchVideoCreatives.map((vc: any, i: number) => {
                        const isSelected = selectedIdeaIdx === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            className={`text-left p-2.5 rounded-sm border transition-all bg-background ${
                              isSelected
                                ? 'ring-2 ring-pink-500 border-pink-500 bg-pink-500/10'
                                : 'border-border/50 hover:border-pink-500/40 hover:bg-pink-500/5'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedIdeaIdx(null);
                                setFormData(prev => ({ ...prev, hooks: prev.hooks.filter(h => h !== vc.structure?.hook) }));
                              } else {
                                setSelectedIdeaIdx(i);
                                const hookText = vc.structure?.hook;
                                if (hookText) {
                                  setFormData(prev => ({
                                    ...prev,
                                    hooks: prev.hooks.includes(hookText) ? prev.hooks : [...prev.hooks, hookText],
                                  }));
                                }
                              }
                            }}
                          >
                            <p className="text-xs font-medium leading-snug line-clamp-2">{vc.title || vc.idea}</p>
                            {vc.structure?.hook && (
                              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                                <span className="text-yellow-400">🎣 </span>{vc.structure.hook}
                              </p>
                            )}
                            {vc.angle && (
                              <div className="mt-1.5">
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-pink-500/50 text-pink-400">{vc.angle}</Badge>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 💡 Insights */}
              {researchInsights.length > 0 && (
                <div className="rounded-sm border bg-muted/20 p-2">
                  <p className="text-[10px] text-muted-foreground mb-2 px-1">
                    💡 {researchInsights.length} insights de comportamiento
                  </p>
                  <div className="max-h-56 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-1.5">
                      {researchInsights.map((ins: any, i: number) => {
                        const isSelected = selectedInsightIdx === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            className={`text-left p-2.5 rounded-sm border transition-all bg-background ${
                              isSelected
                                ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/10'
                                : 'border-border/50 hover:border-amber-500/40 hover:bg-amber-500/5'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedInsightIdx(null);
                              } else {
                                setSelectedInsightIdx(i);
                                if (ins.actionable) {
                                  setFormData(prev => ({
                                    ...prev,
                                    additional_instructions: prev.additional_instructions
                                      ? `${prev.additional_instructions}\n${ins.actionable}`
                                      : ins.actionable,
                                  }));
                                }
                              }
                            }}
                          >
                            <p className="text-xs leading-snug line-clamp-3">{ins.insight}</p>
                            {ins.actionable && (
                              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                                <span className="text-green-400">→ </span>{ins.actionable}
                              </p>
                            )}
                            {ins.category && (
                              <div className="mt-1.5">
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/50 text-amber-400">{ins.category}</Badge>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* Document Loading Section */}
      {hasDocumentUrls && (
        <div className="p-2.5 sm:p-4 rounded-sm bg-muted/50 border space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <FileSearch className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <Label className="text-xs sm:text-sm font-medium truncate">Documentos</Label>
              {docsLoaded && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 sm:hidden" />
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {docsLoaded && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600 hidden sm:flex">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Cargados
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadProductDocuments}
                disabled={loadingDocs}
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
              >
                {loadingDocs ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span className="ml-1.5 hidden sm:inline">{docsLoaded ? "Recargar" : "Cargar Docs"}</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs">
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


      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">

        {/* ── Fila 1: Hooks | País | Duración ── */}
        {/* Número de Hooks */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <ListOrdered className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Hooks
          </Label>
          <Select
            value={formData.hooks_count}
            onValueChange={(v) => setFormData({ ...formData, hooks_count: v })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(n => (
                <SelectItem key={n} value={String(n)}>{n} Hook{n > 1 ? 's' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* País Objetivo */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> País
          </Label>
          <Select
            value={formData.target_country}
            onValueChange={(v) => setFormData({ ...formData, target_country: v })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="País..." /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Duración del Video */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <Video className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Duración
          </Label>
          <Select
            value={formData.video_duration}
            onValueChange={(v) => setFormData({ ...formData, video_duration: v })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Duración..." /></SelectTrigger>
            <SelectContent>
              {VIDEO_DURATIONS.map((duration) => (
                <SelectItem key={duration.value} value={duration.value}>{duration.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Fila 2: CTA (2 cols) | Plataforma ── */}
        {/* CTA */}
        <div className="space-y-1.5 col-span-2">
          <Label className="flex items-center gap-1 text-xs">
            <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> CTA *
          </Label>
          <Input
            value={formData.cta}
            onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
            placeholder="Ej: Haz clic en el link de la bio"
            className="h-8 text-xs sm:text-sm"
          />
        </div>

        {/* Plataforma Destino */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Plataforma
          </Label>
          <Select
            value={formData.target_platform}
            onValueChange={(v) => setFormData({ ...formData, target_platform: v })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Red..." /></SelectTrigger>
            <SelectContent>
              {TARGET_PLATFORMS.map((platform) => (
                <SelectItem key={platform.value} value={platform.value}>{platform.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Campos de ancho completo ── */}

        {/* Estructura Narrativa */}
        <div className="space-y-1.5 sm:space-y-2 col-span-2 sm:col-span-3">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Estructura Narrativa *
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

        {/* Ángulo de Venta */}
        <div className="space-y-1.5 sm:space-y-2 col-span-2 sm:col-span-3">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Ángulo de Venta *
          </Label>
          {researchAngles.length > 0 ? (() => {
            const recargadoCount = researchAngles.filter((a: any) => a._source === 'v1').length;
            const dnaCount = researchAngles.filter((a: any) => a._source === 'dna').length;
            const v2Count = researchAngles.filter((a: any) => a._source === 'v2').length;
            return (
              <div className="max-h-64 overflow-y-auto rounded-sm border bg-muted/20 p-2">
                <p className="text-[10px] text-muted-foreground mb-2 px-1 flex items-center gap-2 flex-wrap">
                  <span>{researchAngles.length} ángulo{researchAngles.length !== 1 ? 's' : ''}</span>
                  {recargadoCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{recargadoCount} ADN Recargado</span>}
                  {dnaCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{dnaCount} ADN Producto</span>}
                  {v2Count > 0 && <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{v2Count} Pilares</span>}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {researchAngles.map((a: any, idx: number) => {
                    const angleText = a?.angle || a?.salesAngle || a?.name || "";
                    if (!angleText) return null;
                    const angleType = a?.type || a?.category || a?.funnelPhase || "";
                    const hookExample = a?.hookExample || "";
                    const isSelected = formData.sales_angle === angleText;
                    const src = a?._source;
                    const isDna = src === 'dna';
                    const isV2 = src === 'v2';
                    const v2TypeLabel = a?._v2type === 'pillar' ? 'Pilar' : a?._v2type === 'opportunity' ? 'Oportunidad' : null;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`text-left p-2.5 rounded-sm border transition-all ${
                          isSelected
                            ? 'ring-2 ring-primary border-primary bg-primary/10'
                            : isDna
                              ? 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5 bg-background'
                              : isV2
                                ? 'border-green-500/20 hover:border-green-500/40 hover:bg-green-500/5 bg-background'
                                : 'border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5 bg-background'
                        }`}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          sales_angle: isSelected ? '' : angleText,
                        }))}
                      >
                        <p className="text-xs font-medium leading-snug line-clamp-2">{angleText}</p>
                        {hookExample && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic">"{hookExample}"</p>
                        )}
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {angleType && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{angleType}</Badge>
                          )}
                          {isDna && a?.funnelPhase && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 opacity-70">{a.funnelPhase}</Badge>
                          )}
                          {isDna ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/50 text-amber-400">ADN Producto</Badge>
                          ) : isV2 ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-500/50 text-green-400">
                              {v2TypeLabel || 'Pilar'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-500/50 text-blue-400">ADN Recargado</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <p className="text-xs text-muted-foreground py-2">
              {formData.sales_angle || 'Sin ángulo seleccionado'}
            </p>
          )}
        </div>

        {/* Avatar Ideal */}
        <div className="space-y-1.5 sm:space-y-2 col-span-2 sm:col-span-3">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Avatar / Cliente Ideal
          </Label>
          {researchAvatars.length > 0 ? (() => {
            const recargadoCount = researchAvatars.filter((a: any) => a._source === 'recargado').length;
            const dnaCount = researchAvatars.filter((a: any) => a._source === 'dna').length;
            return (
              <div className="max-h-64 overflow-y-auto rounded-sm border bg-muted/20 p-2">
                <p className="text-[10px] text-muted-foreground mb-2 px-1 flex items-center gap-2 flex-wrap">
                  <span>{researchAvatars.length} avatar{researchAvatars.length !== 1 ? 'es' : ''}</span>
                  {recargadoCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{recargadoCount} ADN Recargado</span>}
                  {dnaCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{dnaCount} ADN Producto</span>}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {researchAvatars.map((a: any, idx: number) => {
                    const isDna = a._source === 'dna';
                    // ADN Producto usa nombre_edad; ADN Recargado usa name
                    const name = isDna
                      ? (a?.nombre_edad || a?.nombre || `Avatar ${idx + 1}`)
                      : (a?.name || a?.avatarName || `Avatar ${idx + 1}`);
                    // Situación actual
                    const rawSituation = isDna
                      ? a?.situacion_actual
                      : (a?.situation || a?.currentSituation);
                    const situation = typeof rawSituation === 'string'
                      ? rawSituation
                      : (rawSituation?.dayToDay || '');
                    // Sub-info extra para DNA
                    const dolor = isDna ? a?.dolor_principal : '';
                    const formatted = [
                      `AVATAR: ${name}`,
                      situation ? `SITUACIÓN: ${situation}` : '',
                      dolor ? `DOLOR: ${dolor}` : '',
                    ].filter(Boolean).join('\n');
                    const isSelected = formData.ideal_avatar === formatted;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`text-left p-2.5 rounded-sm border transition-all ${
                          isSelected
                            ? 'ring-2 ring-primary border-primary bg-primary/10'
                            : isDna
                              ? 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5 bg-background'
                              : 'border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5 bg-background'
                        }`}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          ideal_avatar: isSelected ? '' : formatted,
                        }))}
                      >
                        <p className="text-xs font-medium leading-snug line-clamp-1">{name}</p>
                        {situation && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{situation}</p>
                        )}
                        <div className="mt-1.5">
                          {isDna ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/50 text-amber-400">ADN Producto</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-500/50 text-blue-400">ADN Recargado</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <p className="text-xs text-muted-foreground py-2">
              {formData.ideal_avatar || 'Selecciona un producto con investigación para ver los avatares'}
            </p>
          )}
        </div>

        {/* Dolores */}
        <div className="space-y-2 col-span-2 sm:col-span-3">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            💔 Dolor Seleccionado
          </Label>
          <ResearchItemCards
            items={researchPains}
            selected={formData.selected_pain}
            onSelect={(text) => setFormData(prev => ({ ...prev, selected_pain: text }))}
            selectedBorderClass="ring-2 ring-rose-500 border-rose-500 bg-rose-500/10"
            hoverClass="border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/5"
            emptyText={formData.selected_pain || 'Selecciona un producto con investigación para ver dolores'}
          />
        </div>

        {/* Deseos */}
        <div className="space-y-2 col-span-2 sm:col-span-3">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            ✨ Deseo Seleccionado
          </Label>
          <ResearchItemCards
            items={researchDesires}
            selected={formData.selected_desire}
            onSelect={(text) => setFormData(prev => ({ ...prev, selected_desire: text }))}
            selectedBorderClass="ring-2 ring-primary border-primary bg-primary/10"
            hoverClass="border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            emptyText={formData.selected_desire || 'Selecciona un producto con investigación para ver deseos'}
          />
        </div>

        {/* Objeciones */}
        <div className="space-y-2 col-span-2 sm:col-span-3">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            🚫 Objeción Seleccionada
          </Label>
          <ResearchItemCards
            items={researchObjections}
            selected={formData.selected_objection}
            onSelect={(text) => setFormData(prev => ({ ...prev, selected_objection: text }))}
            selectedBorderClass="ring-2 ring-orange-500 border-orange-500 bg-orange-500/10"
            hoverClass="border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/5"
            emptyText={formData.selected_objection || 'Selecciona un producto con investigación para ver objeciones'}
          />
        </div>
      </div>

      {/* Reference Transcription */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Transcripción de Referencia <span className="text-muted-foreground font-normal hidden sm:inline">(opcional)</span>
        </Label>
        <Textarea
          value={formData.reference_transcription}
          onChange={(e) => setFormData({ ...formData, reference_transcription: e.target.value })}
          placeholder="Pega aquí la transcripción de un video de referencia..."
          rows={3}
        />
      </div>

      {/* Hooks personalizados */}
      <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t">
        <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Hooks Sugeridos <span className="text-muted-foreground font-normal hidden sm:inline">(opcional)</span>
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
              <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-sm">
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
      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm">Instrucciones adicionales</Label>
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
            <Label className="text-sm font-medium">🎥 Prompt para Modo Director</Label>
            <Textarea
              value={formData.director_prompt}
              onChange={(e) => setFormData({ ...formData, director_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">📊 Prompt para Marketing</Label>
            <Textarea
              value={formData.marketing_prompt}
              onChange={(e) => setFormData({ ...formData, marketing_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">📱 Prompt para Captions</Label>
            <Textarea
              value={formData.captions_prompt}
              onChange={(e) => setFormData({ ...formData, captions_prompt: e.target.value })}
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
              director_prompt: DEFAULT_PROMPTS.director,
              marketing_prompt: DEFAULT_PROMPTS.marketing,
              captions_prompt: DEFAULT_PROMPTS.captions,
            }))}
          >
            Restaurar prompts por defecto
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Generation Progress */}
      {loading && (
        <div className="space-y-4">
          {/* Skills Loading State */}
          <SkillsLoadingState isGenerating={loading} realProgress={skillsProgress} />

          {/* Blocks Progress */}
          <div className="space-y-1.5 sm:space-y-2 p-2.5 sm:p-4 bg-muted/50 rounded-sm">
            <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">Progreso por bloques:</p>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 sm:gap-2">
              {generationSteps.filter((step) => selectedBlocks[step.key]).map((step) => (
                <div key={step.key} className="flex items-center gap-1.5 sm:gap-3">
                  {step.status === "pending" && <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                  {step.status === "generating" && <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary shrink-0" />}
                  {step.status === "done" && <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />}
                  {step.status === "error" && <X className="h-4 w-4 sm:h-5 sm:w-5 text-destructive shrink-0" />}
                  <span className={`text-xs sm:text-sm truncate ${step.status === "generating" ? "text-primary font-medium" : ""}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={loading || insufficientTokens || selectedCount === 0}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generando con IA...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Generar {selectedCount === 6 ? "Todo" : `${selectedCount} bloque${selectedCount !== 1 ? "s" : ""}`} con IA
            <span className="ml-1.5 opacity-75 font-mono text-xs">({totalCost})</span>
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Componente auxiliar: tarjetas de selección para dolor/deseo/objeción ──────

interface ResearchItemCardsProps {
  items: { text: string; _source: string }[];
  selected: string;
  onSelect: (text: string) => void;
  selectedBorderClass: string;
  hoverClass: string;
  emptyText: string;
}

function ResearchItemCards({ items, selected, onSelect, selectedBorderClass, hoverClass, emptyText }: ResearchItemCardsProps) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground py-1">{emptyText}</p>;
  }

  const recargadoCount = items.filter(i => i._source === 'recargado').length;
  const dnaCount = items.filter(i => i._source === 'dna').length;

  return (
    <div className="rounded-sm border bg-muted/20 p-2">
      <p className="text-[10px] text-muted-foreground mb-2 px-1 flex items-center gap-2 flex-wrap">
        <span>{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
        {recargadoCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{recargadoCount} ADN Recargado</span>}
        {dnaCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{dnaCount} ADN Producto</span>}
      </p>
      <div className="max-h-56 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {items.map((item, idx) => {
            const isSelected = selected === item.text;
            const isDna = item._source === 'dna';
            return (
              <button
                key={idx}
                type="button"
                className={`text-left p-2.5 rounded-sm border transition-all bg-background ${
                  isSelected
                    ? selectedBorderClass
                    : isDna
                      ? 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5'
                      : hoverClass
                }`}
                onClick={() => onSelect(isSelected ? '' : item.text)}
              >
                <p className="text-xs leading-snug line-clamp-3">{item.text}</p>
                <div className="mt-1.5">
                  {isDna ? (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/50 text-amber-400">ADN Producto</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-500/50 text-blue-400">ADN Recargado</Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
