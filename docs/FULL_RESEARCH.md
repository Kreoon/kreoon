---
title: generate-full-research — el motor de estrategia de 21 pasos
created: 2026-08-13
tags: [kreoon, adn, estrategia, edge-functions, ia]
status: vigente
---

> **Qué es:** la función que convierte el ADN de marca y el ADN de producto en una
> estrategia completa de 21 piezas (mercado, avatares, ángulos, parrilla, funnels,
> ads, precios, KPIs…). Es el paso `estrategia` del pipeline autónomo del cliente.
>
> **Dónde vive:** `supabase/functions/generate-full-research/index.ts` (2.806 líneas).
> Es el ÚNICO árbol real de ADN Recargado en producción. `adn-orchestrator`,
> `adn-continue` y `adn-orchestrator-lite` se eliminaron el 2026-07-05 por no tener
> ningún caller.

---

## 1. La idea en una frase

**Un paso = una invocación de la edge function.** La función se llama a sí misma 21
veces en cadena. Devuelve `202` al instante y sigue trabajando sola en segundo plano,
dejando su progreso en una columna de la base de datos.

```
Frontend ──▶ [invocación externa] ──▶ 202 Accepted
                     │
                     └─▶ self-invoke fase 0 ─▶ fase 1 ─▶ … ─▶ fase 20 ─▶ finalize
                          (cada eslabón = 1 edge function completa, ~20-40 s)
```

Se hace así por una razón dura: una edge function vive **~150 segundos**. Generar 21
piezas en una sola llamada es imposible, así que cada paso tiene su propia invocación
entera para él.

**Consecuencia importante:** como todo pasa después del `202`, **si la cadena muere
nadie se entera por HTTP**. Por eso el orquestador del pipeline la vigila por polling
leyendo `products.research_progress`.

---

## 2. Anatomía de un paso

Cada uno de los 21 pasos hace exactamente esto:

| # | Etapa interna | Quién | Detalle |
|---|---|---|---|
| 1 | Investigación web | **Perplexity** | Query construida a medida del paso (`buildPerplexityQuery`). En modo profundo usa `sonar-pro` |
| 1.5 | Scraping real | **Firecrawl** | Solo si hay presupuesto de URLs. Inyecta "datos reales scrapeados" al prompt |
| 2 | Estructuración | **Gemini 2.5 Flash** | Primero en la fila. `reasoning_effort: "none"` para que el *thinking* no se coma el output |
| 3 | Respaldo | **Mistral Large** | Solo si Gemini falla (por ejemplo, 429 por cuota) |
| 4 | Reparación | código | `repairJsonForParse` limpia y arregla el JSON antes de parsear |
| 5 | Guardado | código | Escribe en la columna de `products` que le toque + actualiza el progreso |

El orden real es **Gemini → Mistral**, no al revés: `const attempts = [tryGemini, tryMistral]`.

### Timeouts por proveedor

Se ajustan al tamaño de lo que se pide, porque la función entera solo tiene ~150 s:

| Tokens pedidos | Gemini | Mistral |
|---|---:|---:|
| ≥ 14.000 | 100 s | 120 s |
| ≥ 10.000 | 85 s | 110 s |
| < 10.000 | 60 s | 95 s |

---

## 3. Los 21 pasos, sus tokens y dónde se guardan

`TOKEN_MAP` define cuánto puede escribir el modelo en cada paso. Suma total:
**227.000 tokens** de salida si todos llegaran al tope.

| # | stepId | Nombre | Tokens | Columna destino en `products` |
|---:|---|---|---:|---|
| 0 | `market_overview` | Panorama de Mercado | 8.000 | `market_research.market_overview` |
| 1 | `jtbd` | Jobs To Be Done | 7.000 | `market_research.jtbd` + `ideal_avatar` |
| 2 | `pains_desires` | Dolores y Deseos | 9.000 | `market_research.jtbd` (mezcla) |
| 3 | `competitors` | Análisis de Competencia | **12.000** | `competitor_analysis.competitors` |
| 4 | `avatars` | Avatares de Cliente | **14.000** | `avatar_profiles.profiles` |
| 5 | `differentiation` | Diferenciación | **12.000** | `competitor_analysis` + `content_strategy` |
| 6 | `sales_angles` | Ángulos de Venta | **14.000** | `sales_angles_data` + `sales_angles` |
| 7 | `puv_transformation` | PUV y Transformación | 8.000 | `sales_angles_data` |
| 8 | `lead_magnets` | Lead Magnets | 7.000 | `sales_angles_data` |
| 9 | `video_creatives` | Creativos de Video | **12.000** | `sales_angles_data` |
| 10 | `content_calendar` | **Parrilla de Contenido** | **24.000** | `content_calendar` |
| 11 | `launch_strategy` | Estrategia de Lanzamiento | **14.000** | `launch_strategy` |
| 12 | `landing_pages` | Landing Pages | **16.000** | `sales_angles_data` |
| 13 | `whatsapp_funnel` | Funnel de WhatsApp | **14.000** | `sales_angles_data` |
| 14 | `paid_ads` | Paid Ads (Meta + TikTok) | **12.000** | `sales_angles_data` |
| 15 | `email_marketing` | Email Marketing | 10.000 | `sales_angles_data` |
| 16 | `pricing_strategy` | Estrategia de Precios | 7.000 | `sales_angles_data` |
| 17 | `kpis_dashboard` | KPIs y Dashboard | 6.000 | `sales_angles_data` |
| 18 | `seo_strategy` | SEO y Contenido Largo | 8.000 | `sales_angles_data` |
| 19 | `partnerships` | Alianzas | 6.000 | `sales_angles_data` |
| 20 | `community_strategy` | Comunidad | 7.000 | `sales_angles_data` |

**Diez de los 21 piden ≥12.000 tokens.** Ahí está el cuello de botella (ver §8).

Nota de diseño: los pasos 12–20 se apilan todos dentro de `sales_angles_data`, que
actúa como cajón general de los "tabs 360".

---

## 4. Qué come cada paso (el contexto)

`buildBaseContext` arma un texto plano que se le pasa a **todos** los pasos, con:

- **ADN de Marca** (`client_dna.dna_data`): identidad del negocio, historia, misión,
  factor único, propuesta de valor, USP, promesa, diferenciadores, cliente ideal
  (demográfico y psicográfico), tono.
- **ADN de Producto** (`product_dna`): lo que el cliente declaró de su producto.
- **Nombre del producto**.

Además, cada paso recibe **los resultados de los pasos anteriores** (`prevResults`),
así que la cadena se va enriqueciendo: los ángulos de venta conocen los avatares, la
parrilla conoce los ángulos, etc.

`getTargetMarket` deduce el mercado objetivo (país/región) de los dos ADNs.

---

## 5. Skills: el sistema de personalidades

Cada paso se ejecuta con un system prompt compuesto por el **KIRO Master Prompt** más
un conjunto de *skills* (hay 38 en `supabase/functions/_shared/skills/`).

Ejemplos del mapa `STEP_SKILLS`:

| Paso | Skills que se activan |
|---|---|
| `market_overview` | *(ninguna — investigación pura)* |
| `competitors` | *(ninguna — investigación pura)* |
| `kpis_dashboard` | *(ninguna — análisis puro)* |
| `avatars` | consciousness_mapper, avatar_mirrorer, neuro_persuader, cultural_adapter |
| `sales_angles` | consciousness_mapper, storybrand_architect, hooks_specialist, social_funnel_builder, cta_specialist, objection_crusher |
| `content_calendar` | consciousness_mapper, social_funnel_builder, platform_optimizer, virality_optimizer, seo_discoverer, hooks_specialist |
| `landing_pages` | landing_page_architect + 6 más |
| `whatsapp_funnel` | whatsapp_closer, consciousness_mapper, offer_engineer, objection_crusher, cta_specialist, cultural_adapter |

El KIRO Master Prompt se lee de base de datos (`getPrompt` sobre `platform_prompts`),
con un fallback en código. **Se puede editar sin desplegar nada.**

---

## 6. Los dos modos de ejecución

Se controla con `with_scraping_intelligence` en el body.

| | ADN 360 (base) | + Inteligencia Competitiva Real |
|---|---|---|
| Coste en tokens de plataforma | **1.500** | **3.500** |
| Perplexity | normal | `sonar-pro`, queries largas, `max_tokens` ×2 |
| Firecrawl | no | sí, hasta **8 URLs** por corrida |
| Pasos con búsqueda profunda | — | market_overview, competitors, pricing_strategy, paid_ads, sales_angles, seo_strategy |

**Reparto del presupuesto de scraping** (8 URLs en total): 5 para competidores, 1
para precios, 1 para la biblioteca de anuncios, 1 para inspiración de landing. El
presupuesto viaja de eslabón a eslabón dentro del body, junto con la lista de URLs ya
scrapeadas, para no pagar dos veces la misma página.

---

## 7. Seguridad, reanudación y validaciones

**Autenticación en dos capas.** La llamada externa exige JWT de usuario y **valida
ownership del producto** antes de disparar nada (staff de la organización dueña, o el
usuario del cliente vía `client_users`). El encadenamiento interno solo se acepta si
el `Authorization` es exactamente el service role key: el flag `body._internal` no
basta, porque cualquiera puede escribirlo.

> Esto se cerró en la auditoría de julio. Antes, `organization_id` y `user_id` salían
> del body sin validar: cualquiera podía lanzar 21 fases contra el `product_id` de
> otra organización y quemarle los tokens.

**Smart resume.** `reconstructPrevResults` lee de la base lo ya generado y solo
considera "hecho" lo que tiene contenido real (ni arrays ni objetos vacíos). Al
reanudar, no se vuelven a cobrar tokens (`phase === 0 && !isFreshStart` → skip).

**Validación de URLs de competidores.** Tras el paso 3, `validateCompetitorUrls` hace
peticiones HEAD reales y borra las inventadas. Existe porque el modelo alucinaba URLs
del tipo `https://exito.com/producto-123456`.

**Cierre.** `finalizeProduct` marca `brief_status: "completed"`,
`research_progress: {step:21, total:21, done:true}` y sella `brief_data` con
`research_source: "adn_recargado"` y `research_version: 3`.

---

## 8. Los fallos conocidos (y por qué pasan)

### El límite NO es de Mistral

Mistral Large tiene ventana de 128k tokens (256k en Large 3), entrada y salida
juntas. **24.000 tokens de salida caben de sobra.** Lo que no cabe es en el
**tiempo**: al modelo se le conceden 120 s como mucho, porque la función entera vive
~150 s. Sacar 24.000 tokens de JSON en 120 s exigiría sostener ~200 tokens/s, y no da.
El JSON sale cortado, falla el parseo y se pierde la fase entera.

La frase correcta es: **no le da tiempo dentro del límite de la edge function.**

### Se agrava cuando Gemini se queda sin cuota

Gemini es el titular; Mistral el suplente. Cuando Gemini responde 429 (free tier, 20
req/min), Mistral pasa de plan B a único jugador — y es justo el lento. Por eso el
bloqueo aparece de golpe y afecta a las fases más pesadas.

### Las fases que más caen

Por orden de riesgo: `content_calendar` (24.000), `landing_pages` (16.000), y el
grupo de 14.000 (`avatars`, `sales_angles`, `launch_strategy`, `whatsapp_funnel`).

### Cuando falla

El paso escribe `research_progress: {error: true, label: "Error: <nombre> fallo"}` con
un bloque `debug` de las respuestas de cada proveedor, **y la cadena se detiene ahí**.
El orquestador lo detecta por polling y marca la etapa del pipeline en error, con la
acción "reintentar" disponible desde el portal.

---

## 9. Dónde se ve el resultado

El equipo lo consume en `src/components/products/ProductDetailDialog.tsx`, que tiene
**22 pestañas** — una por pieza más Info y Archivos: Brief, Mercado, JTBD,
Competencia, Avatares, Diferenciación, Esfera, Resumen, Ángulos, PUV, Leads,
Calendario, Lanzamiento, Landing Pages, Funnel WhatsApp, Paid Ads, Email Marketing,
Precios, KPIs, SEO, Alianzas, Comunidad.

Componentes de apoyo: `ResearchProgressIndicator.tsx` (la barra de las 21 fases),
`strategy-tabs/` (el contenido de cada pestaña), `productResearchPdfGenerator.ts` (la
exportación a PDF) y `CreateContentFromResearchDialog.tsx` (crear contenido a partir
de la estrategia).

El cliente lo ve en su portal, traducido a lenguaje llano por
`src/components/client-portal/plainLanguage.ts` (`strategyToSections`), nunca como
JSON crudo.

---

## 10. Contrato de invocación

```jsonc
// POST /functions/v1/generate-full-research
{
  "product_id": "uuid",              // OBLIGATORIO
  "with_scraping_intelligence": true, // opcional — activa Firecrawl + sonar-pro (3500 tokens)
  "force_regenerate": false,          // opcional — borra todas las columnas y empieza de cero
  "phase": 0                          // interno del encadenado; no mandar desde fuera
}
// → 202 { success: true }  y sigue en segundo plano
```

Progreso: `SELECT research_progress FROM products WHERE id = ...`
→ `{ step, total: 21, label, stepId, error?, done? }`

---

## 11. Relación con el motor de investigación (2026-08-13)

Desde que existe `research-engine` (ver `docs/MOTOR_INTELIGENCIA.md`), el pipeline
investiga el mercado **antes** de esta función, con datos scrapeados reales de la
competencia y de los anuncios activos del gremio.

**Hoy los dos no se hablan.** `generate-full-research` recibe únicamente
`{ product_id }`: no lee el ADN de Mercado ni el ADN Viral que el motor ya produjo y
que el cliente ya aprobó. Consecuencia: unas 5 fases (`market_overview`,
`competitors`, `paid_ads`, `video_creatives` y parte de `pains_desires`) vuelven a
investigar desde cero con Perplexity y Firecrawl lo que ya está scrapeado y guardado,
y pueden acabar contradiciendo la evidencia aprobada.

Conectarlos tendría dos efectos: quitaría el trabajo duplicado y **bajaría los tokens
de esas fases**, que es justo donde está el cuello de botella descrito en §8. Queda
pendiente de decisión.

---

## 12. Los 21 prompts, uno por uno

Todos los prompts se escriben en español **sin tildes**, concatenan el `baseContext`
(los dos ADNs) y el `targetMarket`, y muchos reinyectan resultados de pasos
anteriores. Aquí va lo que pide cada uno y de qué depende.

### 0 · `market_overview` — Panorama de Mercado
- **Pide:** investigación de mercado con datos reales: TAM/SAM/SOM, CAGR, estado del mercado, comportamiento del consumidor, variables PESTEL y nivel de conciencia de Schwartz.
- **Cantidades:** 6-8 variables PESTEL · resumen ejecutivo de 3-4 párrafos · 5-7 oportunidades · 5-7 amenazas.
- **Schema:** `market_overview`
- **Reglas:** "USA DATOS REALES Y ACTUALES (busca estadisticas 2024-2026)", "Cita fuentes cuando sea posible", "Se ESPECIFICO con numeros". Sin dependencias.

### 1 · `jtbd` — Jobs To Be Done
- **Pide:** los trabajos funcional, emocional y social del cliente, con 3-4 párrafos cada uno, más insights accionables.
- **Cantidades:** 10-12 insights (el schema admite hasta 14).
- **Schema:** `jtbd`
- **Reglas:** "Piensa como el cliente, no como el vendedor". Categorías cerradas: trigger, momento_verdad, barrera, decision, influenciador, competencia_indirecta.

### 2 · `pains_desires` — Dolores y Deseos
- **Pide:** análisis psicológico profundo del cliente ideal.
- **Cantidades:** **exactamente 10 dolores, 10 deseos y 10 objeciones** (el schema lo fuerza: min = max = 10).
- **Schema:** `pains, desires, objections`
- **Reglas:** "Usa el lenguaje EXACTO que usaria el cliente". **Depende de** `jtbd`.

### 3 · `competitors` — Análisis de Competencia
- **Pide:** competidores reales con presencia online verificable, directos e indirectos, con su posicionamiento (no solo qué venden).
- **Cantidades:** 6-10 competidores · 3+ fortalezas y 3+ debilidades cada uno.
- **Schema:** `competitors`
- **Reglas:** bloque entero de **"REGLAS CRITICAS DE URL Y HANDLES (PROHIBIDO INVENTAR)"**: solo dominio raíz oficial, campo vacío si no se conoce, nunca inventar rutas de producto, handles reales. Textual: *"Es PREFERIBLE dejar el campo vacio antes que inventar… Un campo inventado = mentira que rompe la confianza del usuario"*. Más un filtro anti-alucinación de categoría ("si el producto es para PERSONAS, NO listes productos para mascotas"). Es el paso que después pasa por `validateCompetitorUrls`.

### 4 · `avatars` — Avatares de Cliente
- **Pide:** buyer personas que "se sientan como una PERSONA REAL": demografía, situación, psicografía, frases textuales, comportamiento y trigger de compra.
- **Cantidades:** **exactamente 5 avatares** · 5-7 frases textuales cada uno.
- **Schema:** `avatars`
- **Reglas:** "Las frases deben sonar 100% naturales"; nombres simbólicos. **Depende de** `pains_desires`.

### 5 · `differentiation` — Diferenciación + Playbook CAST
- **Pide:** tres bloques: diferenciación de mercado, el **playbook CAST ejecutable** y el resumen ejecutivo con score de oportunidad 0-10.
- **Cantidades:** 4-7 acciones inmediatas · 3-6 quick wins · 3-5 riesgos · **calendario de exactamente 7 días** · 3-5 insights clave.
- **Schema:** `differentiation, castPlaybook, executiveSummary`
- **Reglas:** CAST = Conocer › Atraer › Seducir › Transformar. **Prohibición explícita:** *"Evita referencias a frameworks externos como ESFERA, Schwartz o Hormozi como estructura"*. Canales restringidos a TikTok, Instagram, WhatsApp, Email, Paid Ads y Landing. **Depende de** `competitors`, `avatars` y `pains_desires`.

### 6 · `sales_angles` — Ángulos de Venta
- **Pide:** ángulos con hook listo para usar, CTA, emoción, fase de funnel, hashtags y por qué funciona.
- **Cantidades:** **exactamente 20 ángulos**, cada uno de 3-4 oraciones.
- **Schema:** `salesAngles`
- **Reglas:** "Cada angulo debe ser UNICO"; obliga a variar los 9 tipos (educativo, emocional, aspiracional, autoridad, comparativo, anti-mercado, storytelling, prueba-social, error-comun). **Depende de** `avatars` y `differentiation`.

### 7 · `puv_transformation` — PUV y Transformación
- **Pide:** propuesta única de valor + tabla antes/después.
- **Cantidades:** PUV de **máximo 25 palabras** · 5 dimensiones de transformación (funcional, emocional, identidad, social, financiera).
- **Schema:** `puv, transformation`
- **Reglas:** la PUV debe pasar *"la prueba del taxi"*. **Depende de** `sales_angles` y `differentiation`.

### 8 · `lead_magnets` — Lead Magnets
- **Pide:** imanes de leads con promesa, estructura, entrega y tiempo estimado.
- **Cantidades:** 3, uno por nivel de conciencia (problem / solution / product aware) · estructura de 5-7 secciones.
- **Schema:** `leadMagnets`
- **Reglas:** "tan valioso que lo querrian pagar"; variar formatos. **Depende de** `avatars` y `pains_desires`.

### 9 · `video_creatives` — Creativos de Video
- **Pide:** ideas de contenido con guion resumido: hook, cuerpo, clímax, CTA, formato, duración, plataforma y notas de producción.
- **Cantidades:** 15-18 ideas (schema hasta 20) · título de máx. 12 palabras · **máximo 4 de 18 con persona hablando**.
- **Schema:** `creatives`
- **Reglas:** "PRIORIZAR formatos faciles de producir". Clasifica por las 7 fases del método **CONVERT** en el campo `esferaPhase`. **Depende de** `sales_angles` y `avatars`.

### 10 · `content_calendar` — Parrilla de Contenido
- **Pide:** parrilla de 4 semanas con contenido **listo para publicar**: copy completo, hashtags y CTA por pieza.
- **Cantidades:** 28-35 piezas · 4 temas semanales · 3 días de lead magnet · mezcla de pilares 40% educativo / 20% emocional / 15% autoridad / 15% venta / 10% comunidad.
- **Schema:** `calendar, weeklyThemes, leadMagnetDays`
- **Reglas:** variar 10 formatos. **Es el paso más pesado del sistema: 24.000 tokens.** **Depende de** `avatars` y `sales_angles`.

### 11 · `launch_strategy` — Estrategia de Lanzamiento
- **Pide:** las tres fases (pre, durante, post) con oferta, emails, presupuesto, cronograma, equipo y métricas.
- **Cantidades:** 5-7 emails · 6-8 hitos · plan para equipo de 1-5 personas.
- **Schema:** `preLaunch, launch, postLaunch, budget, timeline, team, metrics`
- **Reglas:** "Presupuesto adaptado a LATAM". **Depende de** `puv_transformation`.

### 12 · `landing_pages` — Landing Pages
- **Pide:** **2 variaciones conceptualmente distintas**: A "La Directa" (audiencia caliente, oferta desde el hero) y B "La Educativa" (audiencia tibia, construye confianza primero). Copy listo para pegar.
- **Cantidades:** 8-11 secciones por variación · plan de A/B testing con 2 tests.
- **Schema:** `landing_pages, ab_testing_plan, tech_stack_recommendation`
- **Reglas:** headlines que pasen "el test de 3 segundos". ⚠️ **Excepción a la regla anti-invención**: pide testimonios *"ficticios pero creibles"* con nombre, ciudad y resultado. **Depende de** 5 pasos anteriores.

### 13 · `whatsapp_funnel` — Funnel de WhatsApp
- **Pide:** secuencias listas para copiar y pegar, con emojis, más setup de cuenta y benchmarks.
- **Cantidades:** 3 tipos — captación (5-7 mensajes / 7-10 días), cierre (3-5 / 3-5 días), reactivación (2-3 / 3 días) · máx. 150 palabras por mensaje · audio de 60-90 s.
- **Schema:** `whatsapp_funnels, whatsapp_setup, performance_benchmarks`
- **Reglas:** **"Primer mensaje NUNCA con pitch directo de venta"**; horarios LATAM 8am-8pm; respuestas a objeciones literales ("muy caro", "lo pienso"); cada mensaje lleva su campo `forbidden`.

### 14 · `paid_ads` — Paid Ads (Meta + TikTok)
- **Pide:** estructura de cuenta por temperatura, presupuestos, plan de testing, benchmarks LATAM, calendario y errores a evitar.
- **Cantidades:** 20-30% frío / 40-50% tibio / 30-40% caliente · mínimo 3 campañas en Meta · mínimos LATAM: Meta 10 USD/día, TikTok 20 USD/día.
- **Schema:** `paid_ads_strategy`
- **Reglas:** cada creativo referenciado a uno de `video_creatives`; TikTok con Spark Ads sobre contenido orgánico ganador; exige criterios de matar y de escalar.

### 15 · `email_marketing` — Email Marketing
- **Pide:** secuencias de bienvenida, lanzamiento y reactivación, listas para pegar.
- **Cantidades:** 7 emails de bienvenida (schema 5-10) · 5 de pre-lanzamiento + 3 de lanzamiento · 3 de reactivación · asunto de 30-50 caracteres · cuerpo de 150-300 palabras · **1 solo CTA por email**.
- **Schema:** `email_strategy`
- **Reglas:** *"LISTOS PARA COPIAR Y PEGAR (no plantillas vacias)"*; tono de persona a persona, "NUNCA corporativo"; incluye lista de `words_to_avoid`.

### 16 · `pricing_strategy` — Estrategia de Precios
- **Pide:** posicionamiento, rango competitivo, precio en USD y moneda local, pricing psicológico, planes de pago, escalera de valor y proyecciones.
- **Cantidades:** escalera de 5 peldaños (free, entry, core, premium, continuity) · 3 escenarios de ingresos.
- **Schema:** `pricing_strategy`
- **Reglas:** mostrar el costo del problema antes del precio (anclaje); cuotas **siempre** en LATAM (Wompi, PayU, MercadoPago); advertencia de que "la urgencia falsa destruye confianza".

### 17 · `kpis_dashboard` — KPIs y Dashboard
- **Pide:** north star metric, framework AARRR completo, KPIs por canal, triggers de decisión if/then, checklists, stack de herramientas y red flags.
- **Schema:** `kpis_dashboard`
- **Reglas:** triggers ejecutables del tipo *"Si CTR menor a 1% por 3 dias → cambiar hook"*; herramientas reales con costo y disponibilidad en LATAM. **Depende de** `paid_ads` y `pricing_strategy`.

### 18 · `seo_strategy` — SEO y Contenido Largo
- **Pide:** keywords en tres capas, blog con topic clusters, YouTube, SEO local y timeline.
- **Cantidades:** 8-12 keywords primarias · 6-10 long tail · 3-5 artículos pilar · los 10 primeros videos de YouTube.
- **Schema:** `seo_strategy`
- **Reglas:** expectativa honesta impuesta: *"el trafico organico tarda 3-6 meses minimo"*; las preguntas deben ser las exactas que hace el avatar en Google, YouTube y TikTok.

### 19 · `partnerships` — Alianzas y Colaboraciones
- **Pide:** afiliados, influencers por tiers, co-marketing, comunidades, PR y plantilla de contacto lista para enviar.
- **Cantidades:** comisión 15-30% · cookie 30-60 días · tiers nano (1K-10K) y micro (10K-100K) · 3-5 partners.
- **Schema:** `partnerships_strategy`
- **Reglas:** partners "no competidores, mismo avatar"; medios, podcasts y newsletters **reales** del nicho.

### 20 · `community_strategy` — Estrategia de Comunidad
- **Pide:** concepto y plataforma, onboarding, calendario interno, mecánicas de engagement, monetización, crecimiento, moderación y métricas.
- **Cantidades:** calendario de 7 días · plan para los primeros 100 miembros · *aha moment* en máximo 7 días.
- **Schema:** `community_strategy`
- **Reglas:** criterio de plataforma explícito — *"WhatsApp para LATAM low-tech, Discord/Skool para tech-savvy"*.

---

## 13. Contradicciones detectadas en el código (2026-08-13)

No son opiniones: son inconsistencias verificables entre lo que pide el prompt y lo
que exige el schema, o entre distintos pasos entre sí.

### 13.1 Tres frameworks conviviendo

| Paso | Framework que usa |
|---|---|
| `differentiation` | **CAST** (Conocer › Atraer › Seducir › Transformar) — y **prohíbe** citar ESFERA o Schwartz como estructura |
| `video_creatives`, `content_calendar` | **CONVERT** (Conciencia › Origen › Necesidad › Valor › Engagement › Retención › Tracción), en un campo llamado **`esferaPhase`** |
| `market_overview`, `avatars`, `landing_pages` | **Schwartz** (niveles de conciencia), justo lo que `differentiation` prohíbe |

El nombre del campo (`esferaPhase`) viene de un cuarto framework ya retirado. La regla
del proyecto dice usar CAST en todo output; los pasos 9 y 10 no la cumplen.

### 13.2 El prompt y el schema no piden lo mismo

| Paso | Prompt | Schema |
|---|---|---|
| `jtbd` | 10-12 insights | 10-14 |
| `competitors` | 3+ fortalezas/debilidades | mínimo 2 |
| `sales_angles` | 5 hashtags | 3-5 |
| `video_creatives` | 15-18 (y una distribución que suma 18) | 15-20 |
| `whatsapp_funnel` | 3 tipos de secuencia | 3-4, y el enum incluye `upsell`, que el prompt nunca menciona |
| `email_marketing` | 7 emails de bienvenida | 5-10 |

### 13.3 Campos que el schema exige y el prompt no explica

`consciousness_level`, `funnel_temperature` (en `sales_angles`, `video_creatives`,
`content_calendar`) y `production_brief` (escenario, luz, encuadre, vestuario,
subtítulos, en `video_creatives`) están en el schema pero **no se piden en el texto
del prompt**. El modelo los rellena por inferencia, sin instrucciones.

### 13.4 Datos que se pasan sin resolver

`email_marketing` y `partnerships` reciben el precio literalmente como
`"A definir (consultar baseContext)"`, aunque `pricing_strategy` ya calcula un precio
recomendado — pero corre **después** (paso 16, contra el 15 y el 19).

### 13.5 La excepción de los testimonios

`landing_pages` pide testimonios *"ficticios pero creibles"*, mientras `competitors`
prohíbe inventar hasta una URL. Es una decisión deliberada (una landing necesita
maqueta), pero conviene tenerla presente: **si ese copy se publica tal cual, se
publican testimonios falsos.**
