---
title: Kreoon — Research Unificado: fusión del motor de inteligencia con generate-full-research
created: 2026-08-13
tags: [kreoon, adn, estrategia, research, edge-functions, fusion]
status: activo
related: ["[[Kreoon]]", "[[Kreoon — Motor de Inteligencia]]", "[[generate-full-research]]"]
---

> [!summary] Resumen ejecutivo
> Fusión de los dos motores en UN solo research: el `research-engine` (scraping real con Apify: redes propias, competidores, ads del gremio, viralidad del nicho) se convierte en la fuente de evidencia, y `generate-full-research` pasa de 21 pasos a **9**, quedándose solo con lo que alimenta CONTENIDO. Resultado: 4 ADNs (Marca, Mercado, Viral — a nivel cliente/nicho — y Producto — uno POR producto) + Estrategia de Contenido por producto. Se eliminan 12 pasos de consultoría de negocio, se arregla el cuello de botella de tokens (el paso de 24.000 se parte en 4), y se corrigen las 5 contradicciones detectadas en la auditoría del 2026-08-13.

## 1. El problema que resuelve la fusión

1. **Doble investigación:** `generate-full-research` re-investiga con Perplexity/Firecrawl lo que `research-engine` ya scrapeó con datos reales (competidores, ads, mercado) — pagando dos veces y pudiendo contradecir la evidencia que el cliente ya aprobó.
2. **Fuera de foco:** 12 de los 21 pasos generan consultoría de negocio (landings, WhatsApp, email, SEO, precios, alianzas, comunidad, lanzamiento) que la plataforma de contenido no entrega ni el cliente valida.
3. **Cuello de botella técnico:** 10 pasos piden ≥12.000 tokens y el de 24.000 (`content_calendar`) es el que más muere por timeout. Eliminar y partir pasos lo resuelve de raíz.

## 2. Veredicto paso por paso (los 21 del árbol viejo)

| # | Paso viejo | Veredicto | Destino en el sistema nuevo |
|---:|---|---|---|
| 0 | market_overview | **FUSIONAR (adelgazado)** | ADN Mercado: solo comportamiento del consumidor + nivel de conciencia del mercado. TAM/SAM/SOM, CAGR y PESTEL se ELIMINAN (consultoría, no contenido) |
| 1 | jtbd | **FUSIONAR (slim)** | ADN Producto (por producto): los 3 jobs en 1 párrafo c/u + 6-8 insights |
| 2 | pains_desires | **CONSERVAR** | ADN Producto: los 10 dolores / 10 deseos / 10 objeciones — oro puro para guiones |
| 3 | competitors | **REEMPLAZAR** | ADN Mercado lo genera desde los datos REALES scrapeados por research-engine. Se acaba el Perplexity-inventa-competidores y sobra `validateCompetitorUrls` (las URLs vienen del scraping) |
| 4 | avatars | **CONSERVAR (3-5)** | ADN Producto: de 5 exactos a 3-5 según el producto, con frases textuales tomadas también de comentarios reales scrapeados |
| 5 | differentiation | **FUSIONAR (slim)** | ADN Mercado: diferenciación + gaps (cruzados con los gaps del ADN Viral). El playbook CAST de 7 días y el score de oportunidad se ELIMINAN |
| 6 | sales_angles | **CONSERVAR (core)** | Estrategia de Contenido: 20 ángulos, ahora con regla nueva — cada hook declara de qué hook real del ADN Viral desciende (`hook_source`) |
| 7 | puv_transformation | **CONSERVAR (slim)** | ADN Producto: PUV ≤25 palabras + tabla antes/después |
| 8 | lead_magnets | **CONSERVAR (light)** | Estrategia de Contenido: 3 imanes (alimentan los CTAs de los guiones) |
| 9 | video_creatives | **CONSERVAR (core)** | Estrategia de Contenido: 15-18 ideas, formatos y duraciones tomados del ADN Viral (evidencia, no intuición) |
| 10 | content_calendar | **CONSERVAR + PARTIR** | Estrategia de Contenido: la parrilla de 4 semanas se genera en **4 invocaciones de ~6.000 tokens (una por semana)** — muere el paso de 24.000 |
| 11 | launch_strategy | **ELIMINAR** | Consultoría de negocio |
| 12 | landing_pages | **ELIMINAR** | Fuera de foco + la mina de los testimonios ficticios desaparece |
| 13 | whatsapp_funnel | **ELIMINAR** | Fuera de foco |
| 14 | paid_ads | **ELIMINAR (con herencia)** | La estructura completa de cuenta se va. Lo útil se hereda: los ads ganadores del gremio ya vienen en el ADN Mercado, y cada creativo de la estrategia conserva su recomendación ligera de pauta (frío/tibio/caliente) |
| 15 | email_marketing | **ELIMINAR** | Fuera de foco |
| 16 | pricing_strategy | **ELIMINAR** | El precio es dato del onboarding (lo declara el cliente), no se inventa estrategia de precios |
| 17 | kpis_dashboard | **ELIMINAR (con herencia)** | Se hereda solo un bloque "qué medir en tu contenido" (5-6 KPIs de contenido con triggers if/then) dentro de la Estrategia |
| 18 | seo_strategy | **ELIMINAR** | Fuera de foco |
| 19 | partnerships | **ELIMINAR** | Fuera de foco |
| 20 | community_strategy | **ELIMINAR** | Fuera de foco |

**Resultado: de 21 pasos a 9** (0-slim, 1-slim, 2, 4, 5-slim, 6, 7, 8, 9) + parrilla en 4 sub-invocaciones. Del TOKEN_MAP de 227.000 tokens de salida se baja a **~75.000**, y ningún paso pide más de 9.000 — el cuello de botella de §8 del doc viejo desaparece por diseño.

## 3. Arquitectura del Research Unificado

```
ONBOARDING (cliente, con N productos)
        │
        ▼
┌─ NIVEL CLIENTE / NICHO (se corre UNA vez por cliente) ─────────────┐
│                                                                     │
│  research-engine (Apify + Perplexity):                              │
│  redes propias → competidores (dados o descubiertos) → ads gremio   │
│  → ranking viralidad → transcripciones top                          │
│        │                                                            │
│        ├──▶ ADN MARCA   (onboarding + redes propias)                │
│        ├──▶ ADN MERCADO (competidores reales + ads + slim de        │
│        │                 market_overview + differentiation/gaps)    │
│        └──▶ ADN VIRAL   (cacheado por nicho+país, refresh 30 días)  │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼  (POR CADA PRODUCTO — aquí entra el multi-producto)
┌─ NIVEL PRODUCTO ────────────────────────────────────────────────────┐
│  ADN PRODUCTO: datos del cliente (nunca inventados) + jtbd slim +   │
│  10 dolores/deseos/objeciones + avatares 3-5 + PUV/transformación   │
│        │                                                            │
│        ▼                                                            │
│  ESTRATEGIA DE CONTENIDO: 20 ángulos (hook_source del ADN Viral) +  │
│  15-18 creativos (formatos del ADN Viral) + 3 lead magnets +        │
│  parrilla 4 semanas (4 invocaciones) + KPIs de contenido            │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
  Validación cliente → selección de creador → guiones adaptados
```

**Multi-producto resuelto:** Marca, Mercado y Viral viven a nivel cliente/nicho y NO se regeneran por producto. El producto #2 del mismo cliente solo corre su ADN Producto + su Estrategia — más rápido, más barato, y coherente entre productos.

## 4. Qué se rescata del sistema viejo (lo mejor, intacto)

1. **La arquitectura de cadena**: 202 inmediato + self-invoke por paso + progreso en BD + polling del orquestador. Probada y correcta para el límite de ~150s.
2. **Smart resume** (`reconstructPrevResults` + no recobrar tokens al reanudar).
3. **Doble capa de autenticación** (JWT + ownership externo; service role key exacto para el encadenado interno) — cerrada en la auditoría de julio, no se toca.
4. **Gemini → Mistral con timeouts por tamaño** + `repairJsonForParse`.
5. **El sistema de skills** (38 personalidades) para los 9 pasos que quedan.
6. **Prompts en `platform_prompts`** editables sin deploy.
7. **`plainLanguage.ts`** para el portal del cliente y el generador de PDF.
8. **El enriquecimiento en cadena** (`prevResults`): ángulos conocen avatares, parrilla conoce ángulos.

## 5. Correcciones de las contradicciones (§13 del doc viejo)

| Contradicción | Corrección en la fusión |
|---|---|
| 3 frameworks conviviendo (CAST vs CONVERT vs Schwartz) | **Un solo framework: CAST** en todos los outputs. El campo `esferaPhase` se renombra a `cast_phase`. Schwartz se conserva SOLO como vocabulario interno de niveles de conciencia (no como estructura de output) — y deja de estar prohibido/exigido a la vez |
| Prompt ≠ schema (jtbd 10-12 vs 10-14, etc.) | En cada paso conservado, **el schema manda**: se reescribe el texto del prompt para pedir exactamente lo que el schema valida |
| Campos exigidos sin instrucciones (`consciousness_level`, `funnel_temperature`, `production_brief`) | Se agregan instrucciones explícitas de cada campo al prompt del paso correspondiente — nada se rellena "por inferencia" |
| Precio "A definir" pasado sin resolver | Muere solo: pricing_strategy se elimina y el precio viene del onboarding en el baseContext |
| Testimonios ficticios de landing_pages | Muere con el paso. Regla global escrita: **ningún output del research inventa testimonios, URLs ni datos de producto** |

## 6. PROMPTS DE IMPLEMENTACIÓN (Claude Code, en orden)

### PROMPT F1 — Fusión del backend (el grande)

```
## FEATURE
Research Unificado: fusionar research-engine con generate-full-research en un solo
proceso de 4 ADNs + Estrategia de Contenido, multi-producto.

## CONTEXTO OBLIGATORIO
Lee ANTES de tocar código: docs/MOTOR_INTELIGENCIA.md, el doc de generate-full-research
(21 pasos), docs/RESEARCH_UNIFICADO.md (este diseño, tabla de veredictos incluida) y
la implementación actual de ambas funciones. La arquitectura de cadena (202 +
self-invoke + research_progress + smart resume + doble capa de auth + Gemini→Mistral
+ repairJsonForParse + skills + platform_prompts) SE CONSERVA INTACTA — esto es una
reducción y un recableado, no una reescritura.

## 1. RECABLEADO DE CONTEXTO (la fusión real)
- buildBaseContext ahora recibe e inyecta, además de ADN Marca y ADN Producto:
  el ADN MERCADO y el ADN VIRAL generados por research-engine (leerlos de donde el
  motor los guarda; si el run del motor quedó 'partial', inyectar lo disponible con
  la marca "sin investigación completa de mercado").
- REGLA GLOBAL nueva en el KIRO Master Prompt de research: "La evidencia scrapeada
  (competidores reales, ads activos, hooks transcritos) es la fuente de verdad.
  Prohibido contradecirla o re-imaginarla. Prohibido inventar testimonios, URLs,
  handles o datos de producto. Todo dato de producto viene del cliente."
- Los pasos que antes investigaban con Perplexity/Firecrawl lo que el motor ya trae
  (market_overview, competitors, paid_ads, video_creatives) DEJAN de llamar a
  Perplexity/Firecrawl para eso: consumen la evidencia inyectada. Perplexity queda
  solo para el slim de comportamiento del consumidor (paso 0-slim).

## 2. REDUCCIÓN DE 21 A 9 PASOS
Aplica la tabla de veredictos de docs/RESEARCH_UNIFICADO.md:
- ELIMINAR del árbol (STEP_SKILLS, TOKEN_MAP, prompts, schemas, encadenado):
  launch_strategy, landing_pages, whatsapp_funnel, paid_ads, email_marketing,
  pricing_strategy, kpis_dashboard, seo_strategy, partnerships, community_strategy.
  Los prompts eliminados NO se borran del repo: moverlos a
  supabase/functions/_shared/prompts/_archivo/ con un README ("disponibles como
  add-on futuro").
- HERENCIAS antes de eliminar:
  a) paid_ads → cada creativo de video_creatives conserva un campo
     pauta_recomendada: {temperatura: frio|tibio|caliente, nota: 1 línea}.
  b) kpis_dashboard → nuevo bloque content_kpis (5-6 KPIs de contenido con
     triggers if/then tipo "hook con retención <3s a los 3 días → rotar hook")
     dentro del paso de estrategia final. Máx 2.000 tokens.
- ADELGAZAR: market_overview (solo comportamiento del consumidor + nivel de
  conciencia; fuera TAM/SAM/SOM/CAGR/PESTEL; 8.000→4.000 tokens), jtbd (3 jobs en
  1 párrafo c/u + 6-8 insights; 7.000→4.000), differentiation (diferenciación +
  gaps cruzados con ADN Viral; fuera castPlaybook y executiveSummary; 12.000→5.000).
- REEMPLAZAR competitors: el paso ahora SINTETIZA desde los competidores scrapeados
  del ADN Mercado (no investiga). Eliminar validateCompetitorUrls (ya no aplica:
  URLs reales del scraping). 12.000→6.000 tokens.
- PARTIR content_calendar: de 1 invocación de 24.000 a 4 invocaciones de ~6.000
  (semana 1, 2, 3, 4), cada una recibiendo las semanas anteriores en prevResults.
  Mantener el schema final idéntico (se ensambla al guardar).
- TOKEN_MAP resultante: ningún paso >9.000. Verifica la suma total (~75.000).

## 3. CORRECCIÓN DE CONTRADICCIONES (tabla §5 del diseño)
- Un solo framework: CAST. Renombrar esferaPhase→cast_phase (migración de datos
  existentes incluida: UPDATE de las columnas jsonb que lo contengan).
- En cada paso conservado: reescribir el prompt para pedir EXACTAMENTE lo que el
  schema valida (jtbd, competitors, sales_angles, video_creatives — cifras alineadas).
- Agregar al prompt las instrucciones de consciousness_level, funnel_temperature y
  production_brief donde el schema los exija.

## 4. MULTI-PRODUCTO
- ADN Marca, Mercado y Viral: nivel cliente/nicho — se generan una vez y se REUSAN
  para todos los productos del cliente. El contrato de invocación gana
  {client_id, product_id}: si los ADNs de nivel cliente ya existen y tienen <30
  días, NO se regeneran (log del ahorro).
- ADN Producto + Estrategia de Contenido: SIEMPRE por product_id.
- sales_angles: obligatorio hook_source (id del hook real del ADN Viral del que
  desciende cada ángulo). Si un ángulo ataca un GAP (hook que nadie usa), declara
  hook_source: "gap" + cuál gap.

## NO ROMPER
Smart resume, auth de dos capas, force_regenerate, el polling del orquestador y
ProductDetailDialog (la UI se ajusta en F2 — mientras tanto las pestañas de pasos
eliminados pueden quedar vacías sin crashear).

## VALIDACIÓN
Corrida completa real con un cliente de prueba con DOS productos: verificar que
marca/mercado/viral se generan una vez, que producto 2 solo corre sus pasos, que
ningún paso supera 9.000 tokens, que hook_source está en los 20 ángulos, y que el
tiempo y costo total bajaron vs una corrida vieja (comparar con research_progress
de un producto histórico). Commits en español por bloque.
```

### PROMPT F2 — UI, portal y cierre

```
## FEATURE
Research Unificado — ajuste de UI y QA de cierre.

1. ProductDetailDialog: de 22 pestañas a las del sistema nuevo:
   Info, Archivos, Brief, ADN Producto (jtbd + dolores/deseos + avatares + PUV),
   Mercado (ADN Mercado del cliente, compartido entre productos, con los ads
   ganadores del gremio), Nicho Viral (solo lectura), Ángulos, Creativos,
   Parrilla, KPIs de contenido. Eliminar las pestañas de los 10 pasos borrados
   (strategy-tabs correspondientes) y sus componentes exclusivos.
2. ResearchProgressIndicator: de 21 fases a las nuevas (9 pasos + 4 sub-semanas de
   parrilla), con etiquetas en lenguaje simple.
3. productResearchPdfGenerator: regenerar el índice del PDF con la estructura nueva.
4. Portal del cliente (plainLanguage.ts / strategyToSections): mapear las secciones
   nuevas; verificar que nada referencia pasos eliminados.
5. CreateContentFromResearchDialog: crear contenido desde ángulos/creativos sigue
   funcionando con los campos nuevos (cast_phase, hook_source, pauta_recomendada).
6. QA con evidencia (docs/QA_RESEARCH_UNIFICADO.md):
   - E2E dos productos del mismo cliente (reuso de ADNs de nivel cliente).
   - Reanudación: matar la cadena a mitad y verificar smart resume sin recobro.
   - Cliente ve su estrategia en lenguaje llano, sin JSON ni pestañas rotas.
   - grep global: cero referencias vivas a los 10 stepIds eliminados y a esferaPhase.
   - Producto histórico (research_version 3 viejo) sigue abriéndose sin crashear
     (compatibilidad de lectura con columnas ya pobladas).
Commits en español por bloque.
```

## 7. Decisiones tomadas

> [!important] No re-litigar
> 1. El research es UNO: research-engine aporta la evidencia, la cadena reducida la convierte en ADNs y estrategia. Nada investiga dos veces.
> 2. La plataforma genera CONTENIDO: los 10 pasos de consultoría de negocio salen del flujo (archivados como posible add-on, no borrados del repo).
> 3. Multi-producto: Marca/Mercado/Viral a nivel cliente (reusables), Producto/Estrategia por producto.
> 4. Framework único: CAST. La evidencia scrapeada manda sobre cualquier generación.
> 5. La arquitectura de cadena del sistema viejo se conserva — está bien hecha; lo que sobraba era la carga, no el diseño.
