# Estructura interna completa de módulos IA — hasta prompts

Documento de referencia con la estructura de archivos, flujos y prompts de cada módulo IA.

---

## 1. Capa de gobernanza (AI Module Keys)

**Archivo:** `src/lib/aiModuleKeys.ts`

### Módulos canónicos y keys

| Categoría | Key | Descripción |
|-----------|-----|-------------|
| **Tablero** | `board.cards.ai` | Tarjetas individuales |
| | `board.states.ai` | Estados del tablero |
| | `board.flows.ai` | Flujo completo |
| **Content** | `content.script.ai` | Generación/análisis guiones |
| | `content.editor.ai` | Estructura, ritmo, cortes |
| | `content.strategist.ai` | Embudo, hipótesis |
| | `content.designer.ai` | Lineamientos visuales |
| | `content.trafficker.ai` | Copies, ads, KPI |
| | `content.admin.ai` | PM, alertas |
| **UP** | `up.events.ai` | Detección eventos |
| | `up.quality.ai` | Quality score |
| | `up.recommendations.ai` | Reglas, misiones |
| | `up.antifraud.ai` | Anti-fraude |
| **Talent** | `talent.matching.ai` | Asignación inteligente |
| | `talent.quality.ai` | Scoring calidad |
| | `talent.risk.ai` | Riesgo retraso/burnout |
| | `talent.reputation.ai` | Reputación |
| | `talent.ambassador.ai` | Embajadores |
| **Live** | `live.control.ai` | Control streaming |
| | `live.products.ai` | Productos en live |
| | `live.analytics.ai` | Analytics |
| | `streaming_ai` | Generación contenido |
| | `streaming.titles.ai` | Títulos/descripciones |
| **General** | `registration` | Sugerencia rol |
| | `assistant.ai` | Asistente general |
| | `analytics.ai` | Analytics IA |

---

## 2. Prompts por módulo (useAIPrompts / DEFAULT_PROMPTS)

**Archivo:** `src/hooks/useAIPrompts.ts`

### Estructura AIPromptConfig

```ts
interface AIPromptConfig {
  role: string;
  task: string;
  input: Record<string, unknown>;
  output_format: Record<string, unknown>;
}
```

### Prompts por defecto (board, content, up)

| Módulo | Role | Task |
|--------|------|------|
| `board.cards.ai` | `board_ai_card_analyst` | Analizar tarjeta y recomendar acciones |
| `board.states.ai` | `board_ai_state_optimizer` | Detectar estados saturados, ineficiencias |
| `board.flows.ai` | `board_ai_flow_strategist` | Analizar flujo, cuellos de botella, automatizaciones |
| `content.script.ai` | `ugc_script_strategist` | Generar/analizar guión con inputs estructurados |
| `content.editor.ai` | `ugc_video_editor_ai` | Optimizar estructura de edición, ritmo, cortes |
| `content.strategist.ai` | `ugc_content_strategist` | Análisis embudo, hipótesis conversión, ángulos |
| `content.designer.ai` | `ugc_visual_designer_ai` | Lineamientos visuales, thumbnails |
| `content.trafficker.ai` | `ugc_trafficker_ai` | Copies ads, segmentación, KPIs |
| `content.admin.ai` | `ugc_project_manager_ai` | Gestión operativa, timeline, alertas |
| `up.events.ai` | `gamification_event_detector` | Detectar eventos para puntos |
| `up.quality.ai` | `gamification_quality_ai` | Evaluar calidad para gamificación |
| `up.recommendations.ai` | `gamification_quest_generator` | Generar misiones y desafíos |
| `up.antifraud.ai` | `gamification_antifraud_ai` | Detectar abuso/manipulación |

**Origen de prompts:** DB vía RPC `get_ai_module_prompt` o fallback a `DEFAULT_PROMPTS`.

---

## 3. Scripts / Guiones — Prompts completos

**Archivos:**  
- `src/hooks/useScriptPrompts.ts` — `DEFAULT_SCRIPT_PROMPTS`  
- `src/components/settings/ai/ScriptPromptsConfig.tsx` — UI y configuración  
- Tabla: `organization_ai_prompts` (`module_key = 'scripts'`)

### Variables de plantilla (TEMPLATE_VARIABLES)

**Producto:** `{producto_nombre}`, `{producto_descripcion}`, `{producto_estrategia}`, `{producto_investigacion}`, `{producto_avatar}`, `{producto_angulos}`  

**Formulario:** `{cta}`, `{angulo_venta}`, `{cantidad_hooks}`, `{pais_objetivo}`, `{estructura_narrativa}`, `{avatar_ideal}`, `{estrategias_video}`, `{transcripcion_referencia}`, `{hooks_sugeridos}`, `{instrucciones_adicionales}`  

**Documentos:** `{documento_brief}`, `{documento_onboarding}`, `{documento_research}`

### Prompt maestro (ScriptPromptsConfig)

```
🎯 ROL DEL SISTEMA
Actúa como un Prompt Engineer senior y estratega digital experto en UGC, performance ads y storytelling...
📦 PRODUCTO: {producto_nombre}
📝 DESCRIPCIÓN: {producto_descripcion}
🎯 ESTRATEGIA: {producto_estrategia}
👤 AVATAR: {producto_avatar}
```

### Prompts por rol (DEFAULT_SCRIPT_PROMPTS)

1. **script (Bloque Creador)** — Guión formato director, hooks A/B/C, teleprompter.
2. **editor (Bloque Editor)** — Storyboard 4–6 escenas, notas de edición, música/audio, subtítulos.
3. **strategist (Bloque Estratega)** — Fase embudo, objetivos, hipótesis A/B, métricas.
4. **trafficker (Bloque Trafficker)** — Meta Ads, segmentación, TikTok Ads, copy ads.
5. **designer (Bloque Diseñador)** — Paleta, tipografía, estilo visual, assets.
6. **admin (Bloque Admin/PM)** — Cronograma, responsables, checklist, riesgos.

### Reglas de formato (DEFAULT_FORMAT_RULES)

- Devuelve solo HTML (sin Markdown).
- HTML semántico: `<h2>`, `<h3>`, `<h4>`, `<p>`, `<ul>`, `<li>`, `<strong>`, `<em>`.
- `<u>` solo para CTAs.
- Emojis: máx. 1–2 por bloque.

### Reglas críticas (DEFAULT_CRITICAL_RULES)

- NINGÚN CAMPO ignorado si tiene información.
- Si un campo está vacío, NO inventar.
- Coherencia entre todo el contenido generado.
- 1 SOLO GUION completo por proyecto.
- Respetar la cantidad de hooks configurada.

---

## 4. Edge Functions — Prompts internos

### 4.1 generate-script

**Archivo:** `supabase/functions/generate-script/index.ts`  
**Módulo:** `scripts`

**System prompt (base):**

```
Eres un experto copywriter especializado en crear guiones para videos UGC y anuncios en redes sociales.

Reglas generales:
1. Tono conversacional y natural
2. Hook poderoso en los primeros 3 segundos
3. Guión entre 30-60 segundos
4. Indicaciones [ACCIÓN] entre corchetes
5. Evitar sonar como publicidad tradicional
6. Storytelling cuando sea posible
7. Español latinoamericano
```

**Añadido si hay fase ESFERA:**

```
=== INSTRUCCIONES CRÍTICAS - MÉTODO ESFERA: {phaseInfo.label} ===
🎯 OBJETIVO DE ESTA FASE: {phaseInfo.objective}
👥 AUDIENCIA OBJETIVO: {phaseInfo.audience}
🎨 TONO Y ESTILO: {phaseInfo.tone}
📋 TÉCNICAS A USAR (OBLIGATORIO): {phaseInfo.techniques}
💬 FRASES/KEYWORDS SUGERIDAS: {phaseInfo.keywords}
📢 ESTILO DE CTA: {phaseInfo.cta_style}
```

**User prompt:**

```
Crea un guión de video UGC para el siguiente producto:
**Producto:** ${product_name}
**Estrategia:** ${strategy}
**Investigación de mercado:** ${market_research}
**Avatar ideal:** ${ideal_avatar}
**Ángulo de venta:** ${sales_angle}
**Indicaciones adicionales:** ${additional_context}
```

### 4.2 script-chat

**Archivo:** `supabase/functions/script-chat/index.ts`

**System prompt:**

```
Eres un experto en copywriting y guiones de video UGC.
Ayudas a mejorar y refinar guiones basándote en las instrucciones del usuario.

CONTEXTO: Producto: ${productName}, Fase: ${spherePhase}
GUIÓN ACTUAL: ${currentScript}

INSTRUCCIONES CRÍTICAS:
1. SIEMPRE devuelve el guión COMPLETO con las modificaciones integradas
2. Si pide cambiar hooks, modifica SOLO hooks pero devuelve guión completo
3. Si pide cambiar CTA, modifica SOLO CTA pero devuelve guión completo
4. Mantén intactas las secciones no solicitadas
5. Mantén el formato HTML
6. Responde en español
7. La respuesta debe ser ÚNICAMENTE el guión modificado, sin comentarios
```

### 4.3 content-ai

**Archivo:** `supabase/functions/content-ai/index.ts`  
**Módulos:** `scripts`, `content_detail`

**MASTER_SYSTEM_PROMPT (generate_script):**

```
🎯 ROL DEL SISTEMA
Actúa como Prompt Engineer senior y estratega digital experto en UGC, performance ads y storytelling.
...
📥 INPUT OBLIGATORIO: CTA, Ángulo, Cantidad hooks, País, Estructura, Avatar, Estrategias, Transcripción, Hooks sugeridos, Instrucciones, Documentos
⚠️ REGLAS CRÍTICAS: Ningún campo ignorado, no inventar vacíos, coherencia, 1 guion, respetar hooks
🎨 FORMATO: Solo HTML, semántico, <strong>/<em>/<u> para CTAs
```

**SYSTEM_PROMPTS.analyze_content:**

```
Eres un experto en análisis de contenido de video y marketing digital.
Evalúa: 1) Enganche inicial, 2) Estructura narrativa, 3) Claridad, 4) CTA, 5) Potencial viral, 6) Áreas de mejora.
Sé específico y da ejemplos concretos.
```

**SYSTEM_PROMPTS.chat:**

```
Eres un asistente experto en producción de contenido de video y marketing digital.
Ayudas con: ideas creativas, estrategias, mejores prácticas, optimización de guiones, consejos de producción.
Responde profesional pero amigable, en español.
```

**SYSTEM_PROMPTS.improve_script:**

```
Eres un editor experto de guiones.
Mejora guiones existentes basándote en el feedback.
Mantén la esencia optimizando: Claridad, Engagement, Estructura, Impacto emocional.
Devuelve guion mejorado en HTML estructurado.
```

**Perplexity (pre-research):**

```
Investiga información actualizada sobre "${productName}" para crear contenido publicitario:
PRODUCTO: ${productName}
DESCRIPCIÓN: ${productDescription}
ÁNGULO DE VENTA: ${salesAngle}
PAÍS OBJETIVO: ${targetCountry}

NECESITO: tendencias, estadísticas, dolores audiencia, frases populares, competidores.
Máximo 500 palabras.
```

**BLOCK_FORMAT_INSTRUCTIONS:**

- Estructura HTML con `script-block`, `block-header`, `block-content`.
- Tipos: hooks, script, visuals, audio, cta, notes.
- Clases: `hook-list`, `scene`, `dialogue`, `action`, `cta-text`, `timestamp`.

### 4.4 product-research (Investigador de mercado)

**Archivo:** `supabase/functions/product-research/index.ts`

**RESEARCH_PROMPT (Método ESFERA — resumido):**

```
Actúa como Estratega Digital Senior en investigación de mercado, análisis competitivo, avatares, ángulos de venta.
Método ESFERA de Juan Ads.

Flujo obligatorio:
PASO 1 · PANORAMA GENERAL: tamaño mercado, tendencia, estado, variables macro, nivel Schwartz, resumen ejecutivo
PASO 2 · JTBD: funcional, emocional, social; 10 dolores, 10 deseos, 10 objeciones, 10 insights
PASO 3 · AVATARES: 5 personas ultra detallados (nombre, edad, situación, conciencia, drivers, sesgos, objeciones, frases reales, metas, consumo contenido)
PASO 4 · COMPETENCIA 360°: 10 competidores con URL, propuesta, precios, tono, formatos, fortalezas/debilidades
PASO 5 · VACÍOS Y OPORTUNIDADES: mensajes repetidos, dolores mal comunicados, aspiraciones ignoradas
PASO 6 · INSIGHTS POR FASE ESFERA: Enganchar, Solución, Remarketing, Fidelizar
PASO 7 · ÁNGULOS DE VENTA: 20 obligatorios variados
PASO 8 · PUV: propuesta única de valor
PASO 9 · TRANSFORMACIÓN: antes/después (funcional, emocional, identidad, social, financiero)
PASO 10 · LEAD MAGNETS: 3 estratégicos
PASO 11 · CREATIVOS DE VIDEO: 20 (5 por fase ESFERA)
CONCLUSIÓN EJECUTIVA: resumen, 5 insights, 5 drivers, 3 acciones, 3 quick wins, 3 riesgos, recomendación final
```

**DISTRIBUTION_PROMPT:** Convierte la investigación en JSON estructurado (market_overview, jtbd, avatars, competitors, differentiation, esferaInsights, salesAngles, puv, transformation, leadMagnets, videoCreatives, executiveSummary).

**Prompts de fase (A1, A2, A3, B, etc.):** Variantes JSON más pequeñas para evitar truncamiento.

### 4.5 board-ai

**Archivo:** `supabase/functions/board-ai/index.ts`

**analyze_card — System:**

```
Eres un asistente de análisis de producción de contenido para una agencia.
Analizas tarjetas Kanban y proporcionas insights accionables.
Responde en español. Sé directo y conciso.
Tus análisis deben ser explicables: indica qué datos analizaste y por qué.
```

**analyze_card — User:** Incluye título, cliente, estado, días en estado, deadline, creador, editor, guión, video, historial de estados.

**analyze_card — Tool (JSON):** current_interpretation, risk_level, risk_percentage, risk_factors, probable_next_state, recommendation, data_analyzed, confidence.

**analyze_board — System:**

```
Eres un analista de productividad para una agencia de contenido.
Analizas tableros Kanban, detectas cuellos de botella, problemas de flujo y oportunidades.
Responde en español. Sé directo y accionable.
Explica el razonamiento detrás de cada conclusión.
```

**analyze_board — User:** Métricas generales, distribución por estado.

**analyze_board — Tool (JSON):** summary, health_score, bottlenecks[], recommendations[], metrics_analyzed.

**suggest_next_state — System:**

```
Eres un asistente de flujo de trabajo.
Analiza el estado actual y sugiere el siguiente más apropiado.
Considera los prerrequisitos típicos de cada estado.
```

**recommend_automation — System:**

```
Eres un experto en automatización de flujos.
Analiza patrones de movimiento y sugiere automatizaciones útiles.
Deben ser prácticas y mejorar eficiencia.
Devuelve JSON: {automations:[], patterns_analyzed:[]}
```

### 4.6 portfolio-ai (Red social)

**Archivo:** `supabase/functions/portfolio-ai/index.ts`  
**Frontend prompts:** `src/lib/prompts/portfolio_ai_prompts.ts`

**search (búsqueda semántica):**

- System: Asistente de búsqueda para portfolio creativo. Extrae parámetros estructurados.
- User: `Search query: "${payload.query}"`
- Output: entities, keywords, location, categories, skills.

**caption:**

- System: Escritor creativo de captions para redes. Conversacional, trendy, Instagram/TikTok.
- User: Content type, context, tone, language. Generar 3 opciones.
- Output: captions[] con text, hashtags, tone.

**bio:**

- System: Escritor de bios para portfolios. Profesional, conciso, optimizado para descubrimiento.
- User: Current bio, profession, skills, tone, language.
- Output: improved_bio, key_changes, seo_keywords.

**recommendations:**

- System: Motor de recomendaciones para portfolio. Sugiere creadores y contenido por intereses.
- User: User interests, recently viewed, following categories.
- Output: creator_recommendations[], content_recommendations[].

**moderation:**

- System: Moderación de contenido. Identifica problemas respetando expresión creativa.
- User: Content type, text, has_media.
- Output: is_flagged, severity, reasons[], action_recommended.

**blocks:**

- System: Asistente de optimización de perfil. Sugiere estructura de bloques.
- User: Profession, content_types, goals.
- Output: suggested_blocks[] con block_key, title, reason, priority.

### 4.7 suggest-role (Registro)

**Archivo:** `supabase/functions/suggest-role/index.ts`  
**Módulo:** `registration`

**System:**

```
Eres un experto en análisis de perfiles para plataformas UGC.
Sugieres el rol más adecuado basándote en la información proporcionada.
Responde SIEMPRE en JSON válido.
```

**User:**

```
Analiza el perfil:
- Nombre: ${fullName}
- Email: ${email}
- Biografía: ${bio}
- Habilidades: ${skills}
- Experiencia: ${experience}

Roles: creator, editor, client
Responde JSON: {suggestedRole, confidence, reasoning}
```

### 4.8 streaming-ai-generate (Live)

**Archivo:** `supabase/functions/streaming-ai-generate/index.ts`  
**Módulo:** `streaming_ai`

**System:**

```
Eres un experto en marketing digital y creación de contenido para streaming en vivo.
Siempre respondes en español con contenido atractivo y profesional.
SOLO respondes con JSON válido, sin texto adicional.
```

**generate_event_content — User:**

```
Genera un título atractivo y descripción breve para ${EVENT_TYPE_PROMPTS[eventType]}.
Cliente: ${clientName}
Producto: ${product}
Palabras clave: ${keywords}

Responde JSON: {title, description}
Título máx 60 chars, descripción máx 200 chars.
```

**improve_title / improve_description:** Variantes para mejorar título o descripción existente.

**EVENT_TYPE_PROMPTS:** informative, shopping, webinar, interview, entertainment, educational.

### 4.9 build-image-prompt (Constructor de prompts para imágenes)

**Archivo:** `supabase/functions/build-image-prompt/index.ts`

**PROMPT_BUILDER_INSTRUCTION:**

```
Actúa como Image Prompt Engineer Senior para publicidad, UGC y social media.
Creas prompts de imagen profesionales usando TODO el contexto del proyecto.

NO generas la imagen. SOLO JSON estructurado para generador de imágenes.

REGLAS: Limpiar HTML/emojis, analizar script/producto/avatar/ángulos, usar @img1/@img2 para referencias.
JSON: meta, references, scene_context, composition, visual_style, text_overlay, negative_prompt, final_prompt
```

### 4.10 generate-thumbnail

**Archivo:** `supabase/functions/generate-thumbnail/index.ts`  
**Módulo:** `thumbnails`

- Recibe `prompt` desde el cliente (construido por build-image-prompt o manual).
- Limpia prompt (elimina HTML, emojis, formateo).
- Añade prefijo de orientación: `CRITICAL FORMAT REQUIREMENT: Generate VERTICAL/SQUARE/HORIZONTAL image...`

---

## 5. Flujo de datos de prompts

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUENTES DE PROMPTS                            │
├─────────────────────────────────────────────────────────────────┤
│ organization_ai_prompts (DB)  │  DEFAULT_* (código)              │
│ - module_key: scripts         │  - useScriptPrompts              │
│ - prompt_config: {            │  - useAIPrompts DEFAULT_PROMPTS  │
│   master_prompt,              │  - portfolio_ai_prompts.ts       │
│   full_prompts,               │  - Edge functions (hardcoded)    │
│   format_rules,               │                                  │
│   critical_rules              │                                  │
│ }                             │                                  │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────┐            ┌─────────────────────────────┐
│ ScriptPromptsConfig │            │ StrategistScriptForm         │
│ ScriptGenerator     │            │ ScriptGenerator              │
│ ContentDetailDialog │            │ ContentDetailDialog          │
└─────────────────────┘            └─────────────────────────────┘
         │                                    │
         └────────────────┬───────────────────┘
                          ▼
         ┌────────────────────────────────────┐
         │  content-ai / generate-script       │
         │  (reemplazo de variables)           │
         │  replaceTemplateVariables()         │
         └────────────────────────────────────┘
```

---

## 6. Archivos de referencia rápida

| Propósito | Archivo |
|-----------|---------|
| Módulos y keys | `src/lib/aiModuleKeys.ts` |
| Prompts por módulo (board/content/up) | `src/hooks/useAIPrompts.ts` |
| Prompts de guiones (creador/editor/etc.) | `src/hooks/useScriptPrompts.ts` |
| Config UI guiones | `src/components/settings/ai/ScriptPromptsConfig.tsx` |
| Prompts portfolio/social | `src/lib/prompts/portfolio_ai_prompts.ts` |
| Parser research → prompt | `src/lib/productResearchParser.ts` |
| Generación guiones | `supabase/functions/generate-script/index.ts` |
| Chat guiones | `supabase/functions/script-chat/index.ts` |
| Content AI (multi-acción) | `supabase/functions/content-ai/index.ts` |
| Investigación mercado | `supabase/functions/product-research/index.ts` |
| Board AI | `supabase/functions/board-ai/index.ts` |
| Portfolio AI | `supabase/functions/portfolio-ai/index.ts` |
| Sugerencia rol | `supabase/functions/suggest-role/index.ts` |
| Streaming AI | `supabase/functions/streaming-ai-generate/index.ts` |
| Build image prompt | `supabase/functions/build-image-prompt/index.ts` |
| Generate thumbnail | `supabase/functions/generate-thumbnail/index.ts` |
| Prompts en DB | Tabla `organization_ai_prompts` |

---

## 7. Tabla organization_ai_prompts

**Esquema:**  
- `organization_id`, `module_key` (único por org)  
- `prompt_config` (JSONB): master_prompt, role_prompts, format_rules, critical_rules, full_prompts  
- `is_active`  
- `version`, timestamps  

**RPC:**  
- `get_ai_module_prompt(_org_id, _module_key)` — leer prompt  
- `init_ai_prompts_for_org(_org_id)` — inicializar defaults  
