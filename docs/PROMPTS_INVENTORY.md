# Inventario Completo de Prompts de IA

**Fecha:** Febrero 2025

---

## 1. Tabla Resumen de Prompts

| # | Identificador | Módulo | Rol del Sistema (resumido) | Variables | Output | Ubicación |
|---|---------------|--------|----------------------------|-----------|--------|-----------|
| 1 | board.cards.ai | Board | board_ai_card_analyst | (dinámicas) | JSON (risk_level, recommendation, etc.) | useAIPrompts, board-ai |
| 2 | board.states.ai | Board | board_ai_state_optimizer | (dinámicas) | JSON (problematic_states, recommendations) | useAIPrompts |
| 3 | board.flows.ai | Board | board_ai_flow_strategist | (dinámicas) | JSON (flow_issues, automation_suggestions) | useAIPrompts |
| 4 | content.script.ai | Content | ugc_script_strategist | product, avatar, hooks_count, etc. | creator_block, editor_block... | useAIPrompts, content-ai |
| 5 | content.editor.ai | Content | ugc_video_editor_ai | script, platform, duration | editing_notes, scene_breakdown | useAIPrompts |
| 6 | content.strategist.ai | Content | ugc_content_strategist | product, funnel_stage, target_audience | funnel_analysis, conversion_hypothesis | useAIPrompts |
| 7 | content.designer.ai | Content | ugc_visual_designer_ai | script, brand_guidelines, platform | color_palette, thumbnail_concepts | useAIPrompts |
| 8 | content.trafficker.ai | Content | ugc_trafficker_ai | script, product, platform, budget | primary_text_variations, headlines | useAIPrompts |
| 9 | content.admin.ai | Content | ugc_project_manager_ai | content, team, deadlines | timeline_status, risk_alerts | useAIPrompts |
| 10 | up.events.ai | UP | gamification_event_detector | content, user_actions | detected_events, point_recommendations | useAIPrompts |
| 11 | up.quality.ai | UP | gamification_quality_ai | content, history, corrections | quality_score, strengths | useAIPrompts |
| 12 | up.recommendations.ai | UP | gamification_quest_generator | user_stats, role, completed_quests | suggested_quests | useAIPrompts |
| 13 | up.antifraud.ai | UP | gamification_antifraud_ai | user_activity, point_history | risk_score, suspicious_patterns | useAIPrompts |
| 14 | script (creator) | Scripts | ESTRATEGA DIGITAL EXPERTO UGC | {producto_*}, {cta}, {angulo_venta}, etc. | HTML Bloque Creador | useScriptPrompts |
| 15 | editor | Scripts | EDITOR DE VIDEO PROFESIONAL | {producto_*}, {cta}, {angulo_venta}, etc. | HTML Bloque Editor | useScriptPrompts |
| 16 | strategist | Scripts | ESTRATEGA DE CONTENIDO Y GROWTH | {producto_*}, {angulo_venta}, {cta} | HTML Bloque Estratega | useScriptPrompts |
| 17 | trafficker | Scripts | TRAFFICKER / MEDIA BUYER | {producto_*}, {cta}, {angulo_venta} | HTML Bloque Trafficker | useScriptPrompts |
| 18 | designer | Scripts | DISEÑADOR VISUAL | {producto_*}, {cta}, {angulo_venta} | HTML Bloque Diseñador | useScriptPrompts |
| 19 | admin | Scripts | PROJECT MANAGER / ADMINISTRADOR | {producto_*}, {cta}, {angulo_venta} | HTML Bloque Admin | useScriptPrompts |
| 20 | search_semantic | Portfolio | Intelligent search assistant | {{query}} | JSON (entities, keywords) | portfolio_ai_prompts.ts |
| 21 | caption_helper | Portfolio | Creative caption writer | {{content_type}}, {{context}}, {{tone}}, {{language}} | captions[] | portfolio_ai_prompts.ts |
| 22 | bio_improver | Portfolio | Professional bio writer | {{current_bio}}, {{profession}}, {{skills}}, {{tone}}, {{language}} | improved_bio, key_changes | portfolio_ai_prompts.ts |
| 23 | creator_recommendations | Portfolio | Recommendation engine | {{interests}}, {{recent_views}}, {{categories}} | creator_recommendations[] | portfolio_ai_prompts.ts |
| 24 | moderation_reasoning | Portfolio | Content moderation assistant | {{content_type}}, {{text}}, {{has_media}}, {{media_description}} | is_flagged, severity | portfolio_ai_prompts.ts |
| 25 | feed_affinity_scoring | Portfolio | Feed ranking algorithm | {{interests}}, {{content}}, {{relationship}} | relevance_score | portfolio_ai_prompts.ts |
| 26 | blocks_suggestions | Portfolio | Profile optimization assistant | {{profession}}, {{content_types}}, {{goals}} | suggested_blocks[] | portfolio_ai_prompts.ts |
| 27 | MASTER_SYSTEM_PROMPT | Content AI | Prompt Engineer UGC | — | HTML guion | content-ai/index.ts |
| 28 | analyze_content | Content AI | Experto análisis contenido video | — | Feedback constructivo | content-ai/index.ts |
| 29 | chat | Content AI | Asistente producción contenido | — | Respuesta conversacional | content-ai/index.ts |
| 30 | improve_script | Content AI | Editor guiones | — | Guion HTML mejorado | content-ai/index.ts |
| 31 | Perplexity research | Content AI | Investigador mercado | productName, productDescription, salesAngle, targetCountry | 500 palabras | content-ai/index.ts |
| 32 | generate-script base | Scripts | Copywriter UGC | product_name, strategy, ideal_avatar, sales_angle | Guion texto | generate-script/index.ts |
| 33 | SPHERE_PHASE_DETAILS | Scripts | (amplía generate-script) | engage/solution/remarketing/fidelize | — | generate-script/index.ts |
| 34 | script-chat | Script Chat | Experto copywriting UGC | productName, spherePhase, currentScript | Guion completo modificado | script-chat/index.ts |
| 35 | RESEARCH_PROMPT | Product Research | Estratega Digital Método ESFERA | {{PRODUCT_DESCRIPTION}}, {{TARGET_MARKET}} | Texto largo estructurado | product-research/index.ts |
| 36 | DISTRIBUTION_PROMPT | Product Research | Asistente organización marketing | {{RESEARCH_CONTENT}}, {{BRIEF_DATA}} | JSON estructurado | product-research/index.ts |
| 37 | board analyze_card | Board AI | Asistente análisis producción | content.* (dinámico) | card_analysis JSON | board-ai/index.ts |
| 38 | board analyze_board | Board AI | Analista productividad Kanban | totalCards, overdueItems, statusDistribution | board_analysis JSON | board-ai/index.ts |
| 39 | board suggest_next_state | Board AI | Asistente flujo trabajo | content.* | next_state_suggestion JSON | board-ai/index.ts |
| 40 | board recommend_automation | Board AI | Experto automatización | transitionLines | automations[] JSON | board-ai/index.ts |
| 41 | portfolio search | Portfolio AI | Intelligent search assistant | payload.query | JSON | portfolio-ai/index.ts |
| 42 | portfolio caption | Portfolio AI | Creative caption writer | payload.* | JSON captions | portfolio-ai/index.ts |
| 43 | portfolio bio | Portfolio AI | Professional bio writer | payload.* | JSON improved_bio | portfolio-ai/index.ts |
| 44 | portfolio recommendations | Portfolio AI | Recommendation engine | payload.interests, payload.categories | JSON | portfolio-ai/index.ts |
| 45 | portfolio moderation | Portfolio AI | Content moderation | payload.* | JSON is_flagged | portfolio-ai/index.ts |
| 46 | portfolio blocks | Portfolio AI | Profile optimization | payload.* | JSON suggested_blocks | portfolio-ai/index.ts |
| 47 | suggest_role | Registration | Experto análisis perfiles UGC | fullName, email, bio, skills, experience | JSON suggestedRole | suggest-role/index.ts |
| 48 | streaming generate_event | Streaming | Experto marketing streaming | clientName, product, keywords, eventType | JSON title, description | streaming-ai-generate/index.ts |
| 49 | streaming improve_title | Streaming | (mismo sistema) | currentTitle | JSON title | streaming-ai-generate/index.ts |
| 50 | streaming improve_description | Streaming | (mismo sistema) | currentDescription | JSON description | streaming-ai-generate/index.ts |
| 51 | PROMPT_BUILDER_INSTRUCTION | Build Image | Image Prompt Engineer UGC | (contexto proyecto) | JSON (meta, composition, final_prompt) | build-image-prompt/index.ts |
| 52 | talent matching | Talent AI | Asistente asignación talento | req.role, talentWithWorkload | select_talent JSON | talent-ai/index.ts |
| 53 | talent quality | Talent AI | Evaluador calidad trabajo | content, history | evaluate_quality JSON | talent-ai/index.ts |
| 54 | talent risk | Talent AI | Analista riesgo | profile, activeTasks, history | analyze_risk JSON | talent-ai/index.ts |
| 55 | talent reputation | Talent AI | Analista reputación | (datos talento) | JSON | talent-ai/index.ts |
| 56 | talent ambassador | Talent AI | Analista embajadores | (datos embajador) | JSON | talent-ai/index.ts |
| 57 | up quality_score | UP AI Copilot | Evaluador calidad UGC | content.*, product.*, client.* | evaluate_quality JSON | up-ai-copilot/index.ts |
| 58 | up detect_events | UP AI Copilot | Detección eventos gamificación | content.* | suggestedEvents JSON | up-ai-copilot/index.ts |
| 59 | up antifraud | UP AI Copilot | Anti-fraude gamificación | user_activity, point_history | JSON | up-ai-copilot/index.ts |
| 60 | up recommendations | UP AI Copilot | Generador misiones/retos | user_stats, completed_quests | JSON | up-ai-copilot/index.ts |
| 61 | up consultor | UP AI Copilot | Consultor gamificación | — | Respuesta | up-ai-copilot/index.ts |
| 62 | evaluate_profile_tokens | Tokens | Evaluador perfiles creadores | profile.*, stats.*, config.* | JSON token_cost | evaluate-profile-tokens/index.ts |
| 63 | DEFAULT_MASTER_PROMPT | Scripts Config | Prompt Engineer UGC | {producto_*}, {producto_avatar} | — | ScriptPromptsConfig.tsx |
| 64 | DEFAULT_FORMAT_RULES | Scripts Config | — | — | Reglas formato HTML | ScriptPromptsConfig.tsx |
| 65 | DEFAULT_CRITICAL_RULES | Scripts Config | — | {cta}, {angulo_venta}, etc. | Reglas input | ScriptPromptsConfig.tsx |
| 66 | init_ai_prompts (DB) | organization_ai_prompts | Varios (13 módulos) | — | prompt_config JSONB | Migraciones SQL |

---

## 2. Identificación de Duplicados

### 2.1 Duplicados exactos o muy similares

| Grupo | Prompts | Ubicaciones | Notas |
|-------|---------|-------------|-------|
| **MASTER_SYSTEM / Prompt Maestro** | MASTER_SYSTEM_PROMPT (content-ai) ≈ DEFAULT_MASTER_PROMPT (ScriptPromptsConfig) | content-ai/index.ts, ScriptPromptsConfig.tsx | Mismo rol y reglas; content-ai es más completo |
| **Formato HTML** | DEFAULT_FORMAT_RULES (ScriptPromptsConfig) ≈ MASTER_SYSTEM_PROMPT reglas (content-ai) | ScriptPromptsConfig.tsx, content-ai/index.ts | Reglas de formato HTML idénticas |
| **Portfolio search** | portfolio_ai_prompts.search_semantic ≈ portfolio-ai case 'search' | portfolio_ai_prompts.ts, portfolio-ai/index.ts | portfolio_ai_prompts NO se usa; portfolio-ai tiene su propia versión inline |
| **Portfolio caption** | portfolio_ai_prompts.caption_helper ≈ portfolio-ai case 'caption' | portfolio_ai_prompts.ts, portfolio-ai/index.ts | Mismo concepto, diferentes textos |
| **Portfolio bio** | portfolio_ai_prompts.bio_improver ≈ portfolio-ai case 'bio' | portfolio_ai_prompts.ts, portfolio-ai/index.ts | Idem |
| **Portfolio blocks** | portfolio_ai_prompts.blocks_suggestions ≈ portfolio-ai case 'blocks' | portfolio_ai_prompts.ts, portfolio-ai/index.ts | Idem |
| **Portfolio moderation** | portfolio_ai_prompts.moderation_reasoning ≈ portfolio-ai case 'moderation' | portfolio_ai_prompts.ts, portfolio-ai/index.ts | Idem |
| **useAIPrompts vs board-ai** | DEFAULT_PROMPTS board.cards.ai vs analyze_card systemPrompt | useAIPrompts.ts, board-ai/index.ts | board-ai NO usa useAIPrompts; prompts distintos |
| **organization_ai_prompts vs useAIPrompts** | init_ai_prompts inserta prompts ≈ DEFAULT_PROMPTS | Migración SQL, useAIPrompts.ts | DB inicializa con valores similares a DEFAULT_PROMPTS |

### 2.2 Duplicados conceptuales (mismo rol, distintas implementaciones)

| Rol | Ubicaciones |
|-----|-------------|
| Estratega/Copywriter UGC | useScriptPrompts.script, content-ai MASTER, generate-script |
| Evaluador calidad | useAIPrompts up.quality.ai, up-ai-copilot quality_score, talent-ai quality |
| Analista contenido/producción | content-ai analyze_content, board-ai analyze_card |
| Recommendation engine | portfolio_ai_prompts.creator_recommendations, portfolio-ai recommendations |

---

## 3. Mapa de Variables de Plantilla

### 3.1 Variables Scripts (useScriptPrompts / ScriptPromptsConfig)

| Variable | Descripción | Usada en |
|----------|-------------|----------|
| `{producto_nombre}` | Nombre del producto | script, editor, strategist, trafficker, designer, admin |
| `{producto_descripcion}` | Descripción del producto | script, editor |
| `{producto_estrategia}` | Estrategia de marketing | script, strategist, trafficker |
| `{producto_investigacion}` | Investigación de mercado | strategist |
| `{producto_avatar}` | Avatar / Cliente ideal | script, editor, strategist, trafficker, designer |
| `{producto_angulos}` | Ángulos de venta | script |
| `{cta}` | Llamado a la acción | script, editor, strategist, trafficker, designer, admin |
| `{angulo_venta}` | Ángulo de venta seleccionado | script, editor, strategist, trafficker, designer, admin |
| `{cantidad_hooks}` | Cantidad de hooks | script |
| `{pais_objetivo}` | País objetivo | script, editor, strategist, trafficker |
| `{estructura_narrativa}` | Estructura narrativa | script, editor, admin |
| `{avatar_ideal}` | Avatar ideal del formulario | script, DEFAULT_CRITICAL_RULES |
| `{estrategias_video}` | Estrategias de video | script, editor |
| `{transcripcion_referencia}` | Transcripción de referencia | script |
| `{hooks_sugeridos}` | Hooks sugeridos | script |
| `{instrucciones_adicionales}` | Instrucciones adicionales | script |
| `{documento_brief}` | Contenido brief | script, editor |
| `{documento_onboarding}` | Contenido onboarding | script |
| `{documento_research}` | Contenido research | script |

### 3.2 Variables Product Research

| Variable | Descripción |
|----------|-------------|
| `{{PRODUCT_DESCRIPTION}}` | Descripción del producto |
| `{{TARGET_MARKET}}` | Mercado objetivo |
| `{{RESEARCH_CONTENT}}` | Contenido de investigación original |
| `{{BRIEF_DATA}}` | Brief del producto |

### 3.3 Variables Portfolio (portfolio_ai_prompts.ts)

| Variable | Descripción |
|----------|-------------|
| `{{query}}` | Búsqueda del usuario |
| `{{content_type}}` | Tipo de contenido |
| `{{context}}` | Contexto |
| `{{tone}}` | Tono |
| `{{language}}` | Idioma |
| `{{current_bio}}` | Bio actual |
| `{{profession}}` | Profesión/rol |
| `{{skills}}` | Habilidades |
| `{{interests}}` | Intereses |
| `{{recent_views}}` | Vistas recientes |
| `{{categories}}` | Categorías |
| `{{text}}` | Texto a moderar |
| `{{has_media}}` | Si tiene media |
| `{{media_description}}` | Descripción de media |
| `{{content}}` | Metadatos de contenido |
| `{{relationship}}` | Relación creador-viewer |
| `{{content_types}}` | Tipos de contenido disponibles |
| `{{goals}}` | Objetivos |

### 3.4 Variables script-chat (template literals)

| Variable | Origen |
|----------|--------|
| `${productName}` | Request body |
| `${spherePhase}` | Request body |
| `${currentScript}` | Request body |

### 3.5 Variables suggest-role

| Variable | Origen |
|----------|--------|
| `${fullName}` | Request body |
| `${email}` | Request body |
| `${bio}` | Request body |
| `${skills}` | Request body |
| `${experience}` | Request body |

---

## 4. Tabla organization_ai_prompts (DB)

**Esquema:**
- `organization_id`, `module_key` (único por org)
- `prompt_config` (JSONB): estructura tipo AIPromptConfig {role, task, input, output_format}
- `is_active`, `version`

**Módulos inicializados por init_ai_prompts_for_org:**
- board.cards.ai, board.states.ai, board.flows.ai
- content.script.ai, content.editor.ai, content.strategist.ai, content.designer.ai, content.trafficker.ai, content.admin.ai
- up.events.ai, up.quality.ai, up.recommendations.ai, up.antifraud.ai

**Uso:** ScriptPromptsConfig guarda en esta tabla con `module_key = 'scripts'` y `prompt_config` con `full_prompts`, `master_prompt`, `format_rules`, `critical_rules`. useAIPrompts usa RPC `get_ai_module_prompt` para leer.

---

## 5. Recomendaciones de Consolidación

### 5.1 Alta prioridad

1. **Unificar portfolio_ai_prompts.ts con portfolio-ai Edge Function**
   - Situación: portfolio_ai_prompts.ts tiene definiciones completas que no se usan.
   - Acción: Hacer que portfolio-ai importe o consulte portfolio_ai_prompts, o migrar prompts a un módulo compartido que la Edge Function pueda consumir.

2. **Eliminar duplicación MASTER_SYSTEM / DEFAULT_MASTER**
   - Situación: content-ai y ScriptPromptsConfig tienen prompts maestros casi idénticos.
   - Acción: Definir un único prompt maestro en `src/lib/prompts/` o en DB y consumirlo desde ambos.

3. **Conectar useAIPrompts con board-ai**
   - Situación: board-ai usa prompts hardcodeados; useAIPrompts tiene DEFAULT_PROMPTS para board que no se usan.
   - Acción: Hacer que board-ai (o un adapter) lea prompts desde get_ai_module_prompt cuando esté disponible.

### 5.2 Media prioridad

4. **Centralizar variables de plantilla**
   - Crear `src/lib/prompts/template-variables.ts` con todas las variables documentadas y funciones de reemplazo.
   - Unificar sintaxis: elegir `{var}` o `{{var}}` y aplicarla en todo el proyecto.

5. **Consolidar prompts de scripts**
   - useScriptPrompts, content-ai y generate-script comparten contexto de guiones.
   - Acción: Un único origen de verdad (DB organization_ai_prompts o archivo) y un formato estándar de variables.

6. **Reutilizar prompts de Portfolio**
   - feed_affinity_scoring en portfolio_ai_prompts no tiene equivalente en portfolio-ai (feed-recommendations es algoritmo, no LLM).
   - Documentar qué prompts de portfolio_ai_prompts se usan realmente y cuáles son legacy.

### 5.3 Baja prioridad

7. **Documentar formato de output por módulo**
   - Crear schemas JSON o tipos TypeScript para cada output esperado.
   - Facilitar validación y evolución de prompts.

8. **Versionado de prompts**
   - La tabla organization_ai_prompts tiene `version`; aprovecharla para cambios controlados.
   - Considerar historial de versiones para rollback.

9. **Tests de prompts**
   - Tests que validen que las variables se reemplazan correctamente.
   - Snapshot tests para detectar cambios no deseados en prompts críticos.

---

## 6. Resumen de Ubicaciones por Archivo

| Archivo | Cantidad prompts | Tipo |
|---------|------------------|------|
| src/hooks/useAIPrompts.ts | 13 | DEFAULT_PROMPTS (role/task/input/output) |
| src/hooks/useScriptPrompts.ts | 6 | DEFAULT_SCRIPT_PROMPTS (HTML por rol) |
| src/lib/prompts/portfolio_ai_prompts.ts | 7 | system, user_template, output_schema |
| src/components/settings/ai/ScriptPromptsConfig.tsx | 4 | master, format, critical, role_prompts |
| supabase/functions/content-ai/index.ts | 5+ | MASTER, analyze, chat, improve, Perplexity |
| supabase/functions/generate-script/index.ts | 1 base + 4 fases | systemPrompt + SPHERE_PHASE_DETAILS |
| supabase/functions/script-chat/index.ts | 1 | systemPrompt |
| supabase/functions/product-research/index.ts | 2+ | RESEARCH_PROMPT, DISTRIBUTION_PROMPT, phase prompts |
| supabase/functions/board-ai/index.ts | 4 | analyze_card, analyze_board, suggest_next_state, recommend_automation |
| supabase/functions/portfolio-ai/index.ts | 6 | switch por action |
| supabase/functions/suggest-role/index.ts | 1 | system + user |
| supabase/functions/streaming-ai-generate/index.ts | 1 system + 3 user | generate_event, improve_title, improve_description |
| supabase/functions/build-image-prompt/index.ts | 1 | PROMPT_BUILDER_INSTRUCTION |
| supabase/functions/talent-ai/index.ts | 5 | matching, quality, risk, reputation, ambassador |
| supabase/functions/up-ai-copilot/index.ts | 5 | quality, events, antifraud, recommendations, consultor |
| supabase/functions/evaluate-profile-tokens/index.ts | 1 | system + user |
| Migraciones organization_ai_prompts | 13 módulos | init_ai_prompts_for_org |
