---
title: Kreoon — Motor de Inteligencia: ADNs, Onboarding 2.0 y Entregables
created: 2026-08-11
tags: [kreoon, ugc-colombia, adn, investigacion, apify, perplexity, onboarding, estrategia]
status: activo
related: ["[[Kreoon]]", "[[Kreoon Simplificado — Plan Maestro]]", "[[Onboarding de Clientes]]"]
---

> [!summary] Resumen ejecutivo
> Diseño del cerebro de la agencia autónoma: un motor de investigación REAL (Apify + Perplexity) que a partir del onboarding scrapea las redes propias del cliente, descubre y analiza competidores (aunque el cliente no los dé), lee los ads activos del gremio en la biblioteca de Meta, rankea los videos con viralidad real del nicho y transcribe el top — y con eso sintetiza 4 ADNs que alimentan estrategia y guiones con hooks probados, no inventados. Costo estimado: $2–5 USD de scraping por cliente nuevo, con inteligencia de nicho reutilizable que baja el costo marginal de cada cliente siguiente. Basado en el protocolo ya probado de investigación (julio 2026: 5 cuentas + 30 transcripciones por <$1).

## 1. El principio rector

**Preguntarle al cliente solo lo que las máquinas no pueden saber. Todo lo demás, investigarlo de verdad.**

Hoy los ADNs se generan con IA sobre lo que el cliente declara. El salto es que se generen sobre **evidencia**: sus redes reales, sus competidores reales, los ads reales que el gremio tiene corriendo, y los videos que de verdad están conectando en su nicho. La IA deja de imaginar el mercado y pasa a leerlo.

## 2. Onboarding 2.0 — más corto, más potente

El formulario de 6 pasos se **reduce**, porque el motor investiga lo que antes se preguntaba:

| Se le pregunta al cliente (lo que solo él sabe) | Lo investiga el motor (ya no se pregunta) |
|---|---|
| Datos legales y de facturación | ~~Referentes que le gustan~~ → se descubren los reales del nicho |
| Quién aprueba + correo del portal | ~~Qué hace su competencia~~ → se scrapea |
| **Redes propias: @Instagram, @TikTok, web** (campo crítico, validar formato) | ~~Tendencias del nicho~~ → Perplexity + ads library |
| Producto: componentes, precios, garantías, diferenciales (nunca se inventan) | ~~Qué formatos funcionan~~ → ranking de viralidad real |
| Nicho/categoría (selector simple: belleza, hogar, salud, comida, moda, servicios...) y país objetivo | ~~Lenguaje del avatar~~ → comentarios y captions reales |
| Competidores conocidos (OPCIONAL — "si no sabes, nosotros los encontramos") | |
| Restricciones legales (qué NO decir) | |
| Logística de producto físico | |

Nuevo campo clave del paso Marca: **"¿Qué cuentas admiras aunque no sean de tu nicho?"** (opcional) — semilla extra para el descubrimiento.

## 3. Arquitectura: de 2 ADNs a 4

```
                    ┌──────────────────────────────┐
                    │        ONBOARDING 2.0         │
                    └──────────────┬───────────────┘
                                   ▼
        ┌──────────────────────────────────────────────────┐
        │           MOTOR DE INVESTIGACIÓN (7 etapas)       │
        │  Apify (IG + TikTok + Meta Ads Library) +         │
        │  Perplexity (descubrimiento y contexto de mercado)│
        └──────┬───────────┬───────────┬───────────┬───────┘
               ▼           ▼           ▼           ▼
        ┌───────────┐┌───────────┐┌───────────┐┌───────────┐
        │ ADN MARCA ││ ADN       ││ ADN       ││ ADN VIRAL │
        │ (quién es)││ PRODUCTO  ││ MERCADO   ││ DEL NICHO │
        │           ││ (qué vende)││(vs quién) ││(qué pega) │
        └─────┬─────┘└─────┬─────┘└─────┬─────┘└─────┬─────┘
              └────────────┴─────┬──────┴────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ ESTRATEGIA → GUIONES      │
                    │ (hooks del nicho probados)│
                    └──────────────────────────┘
```

### ADN de Marca — *"Así entendimos tu marca"*
**Fuentes:** onboarding + scrape de redes propias + crawl de la web del cliente.
Campos: posicionamiento actual real (bio, qué publica vs qué dice ser), voz y tono detectados en sus captions, línea visual, frecuencia real de publicación, engagement actual (su línea base — contra esto se medirá el éxito), brecha entre lo que la marca cree que comunica y lo que sus redes muestran.

### ADN de Producto — *"Así vamos a vender tu producto"*
**Fuentes:** onboarding (componentes/garantías/precios: SOLO datos del cliente, nunca inventados) + crawl de landing/tienda + reseñas si existen.
Campos: promesa central, beneficios comprobables vs claims prohibidos, precio y anclas, objeciones (declaradas + detectadas en comentarios del nicho), avatar con escena específica, jerarquía de dolores/deseos.

### ADN de Mercado — *"Tu competencia al desnudo"* (NUEVO)
**Fuentes:** competidores dados + descubiertos, sus redes, y sus ads activos en la biblioteca de Meta.
Campos: los 3–5 competidores reales con números duros (seguidores, frecuencia, engagement), qué ángulos están PAUTANDO ahora mismo (ads activos por keyword del nicho y por página), cuáles ads llevan 30+ días corriendo (= ganadores comprobados: nadie paga un mes de pauta por un ad perdedor), sus funnels (a dónde llevan el tráfico), y los GAPS: ángulos que nadie está usando.

### ADN Viral del Nicho — *"Lo que de verdad conecta en tu nicho"* (NUEVO — el diferencial)
**Fuentes:** top 10–15 videos por viralidad real del nicho (propios + competidores + hashtags/keywords del nicho en TikTok e IG), transcritos y analizados.
Campos (framework de 6 dimensiones, ya validado):
1. **Taxonomía de hooks dominantes** del nicho (inclusivo-pérdida, kill-shot, noticia-shock, experimento-resultado, anclaje de precio, historia demostrativa, personalidad cruda, brecha) con ejemplos textuales reales transcritos.
2. **Estructuras de cuerpo** que se repiten (lista, agitación, auto-diálogo, números hiperespecíficos).
3. **CTAs y gating** (palabra clave→DM, guárdalo, link en bio) — incluyendo detección de automatización por ratio comentarios/likes ≥30%.
4. **Duraciones y formatos ganadores** (moda de duración, UGC vs talking-head vs demo).
5. **Lenguaje del avatar**: cómo habla la gente del nicho (captions + comentarios).
6. **Mezcla valor/personalidad**: el insight validado — los más virales NO son tutoriales, son emoción y opinión (~70% valor / 30% personalidad).

## 4. El motor de investigación — 7 etapas con stack verificado

> Protocolo de costo (ya probado): perfil primero → posts después → transcripción SOLO del top. Nunca transcribir el feed completo. Proyectar campos al leer datasets.

| # | Etapa | Herramienta (verificada hoy en Apify Store) | Costo aprox |
|---|---|---|---|
| A | **Línea base propia**: perfil + últimos 30 posts de IG y TikTok del cliente | `apify/instagram-profile-scraper` + `apify/instagram-scraper` + `clockworks/tiktok-profile-scraper` | ~$0.15 |
| B | **Descubrimiento de competidores** (si el cliente no los dio, o para completar a 5): (1) Perplexity: "principales marcas de [nicho] en [país] con presencia en IG/TikTok"; (2) `relatedProfiles` del scrape del cliente — Instagram mismo entrega los pares del nicho; (3) búsqueda TikTok por keywords del nicho (`clockworks/tiktok-scraper` con searchQueries) | Perplexity (ya integrada) + ~$0.05 | |
| C | **Scrape de competidores**: perfiles + 30 posts c/u de los 5 finales | mismos actores de A | ~$0.50 |
| D | **Ads del gremio**: biblioteca de Meta por (1) páginas de los competidores y (2) keywords del nicho en el país objetivo. Señal reina: días corriendo | `apify/facebook-ads-scraper` (oficial, $0.0058/ad) o `brilliant_gum/facebook-ads-library-scraper` (rastrea días corriendo, $0.015/ad) — 50–100 ads | ~$0.50–1.00 |
| E | **Ranking de viralidad real** (código, no IA): ver fórmula abajo. Selección del top 10–15 global | — | $0 |
| F | **Transcripción selectiva del top**: IG con `apple_yang/instagram-transcripts-scraper` ($0.005/min, 99.8% éxito, reintentar faltantes); TikTok con el add-on Transcript de clockworks ($0.048/min) o subtítulos descargables | ~$0.30–1.50 |
| G | **Análisis y síntesis**: cada transcripción por el framework de 6 dimensiones → síntesis de los 4 ADNs (multi-ai con los prompts de la sección 6) | Tokens IA internos |

**Costo total por cliente nuevo: ~$2–5 USD** de scraping. Se cobra dentro del valor del paquete o como tokens — margen altísimo para lo que entrega.

### Fórmula de viralidad real (Etapa E — determinística, en código)

```
score_viralidad = (views / followers_de_la_cuenta)        // viralidad RELATIVA, no bruta
               × (1 + comments/likes)                      // conversación = conexión
               × factor_recencia (1.0 si <60 días, 0.7 si <180, 0.4 resto)
               × factor_pineado (1.2 si el autor lo fijó — él sabe cuál es su ganador)

Para ads (etapa D): score_ad = días_corriendo (30+ = ganador comprobado)
                              + bonus si corre en múltiples países/plataformas
```
La viralidad relativa es la clave: 200K views en una cuenta de 40K seguidores vale más que 500K en una de 2M. Y con el ratio comentarios/likes ≥30% se marca la cuenta como "usa comment-gating/ManyChat" — dato de estrategia, no de contenido.

### Reglas operativas del motor (aprendidas en producción)
- Los runs de transcripción devuelven lotes incompletos: **verificar códigos y reintentar faltantes** (normal, no error).
- Rate limits: leer datasets en bloques de 12–19 items con offset; un run "fallido" deja dataset válido — rescatarlo.
- **Honestidad de alcance**: si el nicho no da para 5 competidores reales, entregar los validados con explicación. Prohibido rellenar.
- Guardar los IDs de runs/datasets de Apify en la corrida (trazabilidad y re-lectura sin re-scrapear).

### Inteligencia de nicho compartida (el moat de Kreoon)
Los resultados de las etapas B, D y el ADN Viral se guardan **por nicho+país** (`niche_intelligence`), no solo por cliente. El cliente #2 de "belleza capilar Colombia" reutiliza la inteligencia del nicho (si tiene <30 días) y el motor solo corre las etapas A y C específicas de él. **Cada cliente nuevo hace a Kreoon más inteligente y más barata de operar.** Refresh automático del nicho cada 30 días.

## 5. Entregables del cliente (pipeline de validación)

El checklist del portal pasa de 5 a 6 tarjetas, todas en lenguaje de niño:

| # | Tarjeta | Contenido (resumen legible, nunca JSON) | Acción |
|---|---|---|---|
| 1 | Tu información | ✓ Completada en el onboarding | — |
| 2 | **Así entendimos tu marca** | ADN Marca: posicionamiento, voz, línea base de engagement | Aprobar / Pedir cambio |
| 3 | **Tu mercado y competencia** | ADN Mercado: tabla de competidores con números, los ads ganadores del gremio (con capturas/links), los huecos que vamos a atacar | Aprobar / Pedir cambio |
| 4 | **Lo que funciona en tu nicho** | ADN Viral: los 5 hooks dominantes con ejemplos reales, formatos y duraciones ganadoras | Solo lectura (es evidencia, no opinión) |
| 5 | **Tu estrategia** | Ángulos elegidos (basados en gaps + hooks probados), mezcla de formatos 40/30/20/10, calendario del primer mes | Aprobar / Pedir cambio |
| 6 | **Tus guiones** | Lote con hooks A/B/C construidos sobre la taxonomía REAL del nicho, humanizados LATAM | Aprobar / Pedir cambio por guion |

La tarjeta 3 es la que vende: cuando el cliente ve los ads reales de su competencia con "este anuncio lleva 47 días corriendo", entiende que esto no es una agencia más. La tarjeta 4 es solo-lectura a propósito: los datos no se discuten, las decisiones (tarjeta 5) sí.

**Entregable interno extra (equipo):** el informe completo de investigación (formato del protocolo: radiografía por cuenta → anatomía de fórmulas → tabla comparativa → mapa de funnels → lectura estratégica) queda archivado en el proyecto del cliente, con transcripciones en anexo y IDs de datasets.

## 6. Prompts de síntesis (los que corren DENTRO del motor)

### Prompt — Análisis de transcripción (uno por video del top)
```
Eres analista de contenido viral para LATAM. Analiza esta transcripción de un video
que está en el top de viralidad real del nicho [NICHO] en [PAÍS].

TRANSCRIPCIÓN: [texto] | MÉTRICAS: [views, followers, likes, comments, duración, pineado]

Devuelve JSON con:
1. hook: { texto_exacto_0_5s, taxonomia: [inclusivo-perdida|kill-shot|noticia-shock|
   experimento-resultado|anclaje-precio|historia-demostrativa|personalidad-cruda|brecha],
   gatillos: [curiosidad|interrupcion-patron|auto-relevancia|emocion] }
2. estructura: { tipo, re_enganches: [textos], numeros_hiperespecificos: [cuáles] }
3. cta: { tipo, texto, usa_gating: bool }
4. lead_magnet: qué promete (o null)
5. lenguaje: { registro, muletillas, pais_del_espanol }
6. tipo_contenido: tutorial | emocion-opinion | demo | storytime | testimonial
No inventes nada que no esté en la transcripción. Si una dimensión no aplica, null.
```

### Prompt — Síntesis del ADN Viral del Nicho
```
Tienes [N] análisis JSON de los videos más virales (viralidad relativa real) del nicho
[NICHO] en [PAÍS], + [M] ads activos de la biblioteca de Meta con sus días corriendo.

REGLA CENTRAL: lo que se REPITE es la fórmula; lo que aparece una vez es anécdota.
Solo puedes afirmar patrones que aparezcan en 3+ videos o 3+ ads.

Sintetiza:
1. Los 3–5 hooks dominantes del nicho, cada uno con: taxonomía, 2 ejemplos TEXTUALES
   de las transcripciones, y en qué % del top aparece.
2. Estructura de cuerpo ganadora (con los re-enganches literales más usados).
3. CTAs que el nicho usa (y si el gating está normalizado).
4. Duración ganadora (moda) y mezcla tutorial vs emoción-opinión del top.
5. Ángulos de los ads ganadores (30+ días corriendo) — estos son los que YA imprimen dinero.
6. GAPS: taxonomías de hook y ángulos que NADIE del top usa (oportunidad).
Cita siempre la evidencia (video/ad de origen). Prohibido inventar ejemplos.
```

### Prompt — Síntesis del ADN de Mercado
```
Datos: perfiles y últimos 30 posts de [K] competidores de [MARCA] + sus ads activos.
Para cada competidor: posicionamiento en una línea (desde su bio y captions reales),
números duros (seguidores, frecuencia real calculada, engagement medio), qué está
pautando ahora (ángulos de sus ads activos, cuáles llevan 30+ días), su funnel
(externalUrl → a dónde lleva), y su arma secreta detectable.
Cierra con: tabla comparativa, los 3 huecos de mercado que [MARCA] puede atacar,
y qué NO copiar (con razón). Todo afirmado sobre datos entregados, nada imaginado.
```

Los guiones después se generan con el sistema maestro existente (ecuación del guion → hooks A/B/C → humanización LATAM), con una regla nueva: **cada hook generado debe declarar de qué hook real del ADN Viral desciende.** Se acabaron los hooks imaginados.

## 7. Prompts de implementación (Claude Code sobre el repo)

### PROMPT R1 — Backend del motor de investigación
```
## FEATURE
Motor de investigación real (Apify + Perplexity) para el pipeline autónomo de Kreoon.
Lee antes: docs/AUDITORIA_ONBOARDING_CLIENTES.md y el plan de simplificación.

## MIGRACIÓN
1. Tabla `research_runs`: id, organization_id, client_id, pipeline_run_id, niche, country,
   status (pending|running|partial|done|error), stage jsonb (progreso por etapa A–G),
   apify_run_ids jsonb, cost_usd numeric, error_log jsonb, created_at, finished_at.
2. Tabla `niche_intelligence`: id, niche, country, adn_viral jsonb, market_ads jsonb,
   discovered_competitors jsonb, source_run_id, refreshed_at. UNIQUE(niche, country).
   RLS: lectura para authenticated de cualquier org (es inteligencia compartida de
   plataforma, sin datos de clientes); escritura solo service_role.
3. RLS de research_runs: mismo predicado org-member del onboarding. GRANTs + NOTIFY.

## EDGE FUNCTION `research-engine` (service role, invocada por el orquestador)
Orquesta las etapas A–G del motor (ver spec en docs/MOTOR_INTELIGENCIA.md):
- Cliente Apify por HTTP API (token en secrets: APIFY_TOKEN). Actores:
  apify/instagram-profile-scraper, apify/instagram-scraper,
  apple_yang/instagram-transcripts-scraper, clockworks/tiktok-profile-scraper,
  clockworks/tiktok-scraper, apify/facebook-ads-scraper.
- Patrón por actor: start run → poll status → leer dataset CON fields proyectados
  (los items completos pesan ~20KB) y paginación por bloques de ~15 con offset.
- Etapa B (descubrimiento): si el onboarding no trae 5 competidores, completar con
  (1) Perplexity vía multi-ai, (2) relatedProfiles del scrape propio, (3) búsqueda
  TikTok por keywords. Deduplicar y validar que existan antes de scrapearlos.
- Etapa E: ranking determinístico en código (fórmula de score en el doc) — NO usar IA
  para rankear.
- Etapa F: transcribir SOLO el top 10–15; verificar códigos devueltos y reintentar
  faltantes hasta 3 veces.
- Etapa G: análisis por transcripción + síntesis de ADNs con los prompts del doc,
  vía multi-ai. Guardar los 4 ADNs donde el pipeline los lee, y actualizar
  niche_intelligence si el nicho no existe o tiene >30 días.
- Caché: si niche_intelligence(niche, country) tiene <30 días, SALTAR etapas B y D
  y reutilizar — registrar el ahorro en cost_usd.
- Presupuesto duro por run: tope configurable (default $6 USD); al llegar al tope,
  status 'partial' con lo obtenido + notificación al equipo. Nunca colgado, nunca
  gasto sin techo.
- Cada etapa idempotente y re-ejecutable; apify_run_ids guarda TODOS los runs para
  re-leer datasets sin re-scrapear.

## VALIDACIÓN
Corrida real con un cliente de prueba del nicho belleza (usa una marca real pequeña):
mostrar research_run completo, costo real, los 4 ADNs generados y el registro en
niche_intelligence. Commit: "feat: Agregar motor de investigación real (Apify + Perplexity)"
```

### PROMPT R2 — Integración con el pipeline autónomo y entregables
```
## FEATURE
Conectar el motor de investigación al pipeline autónomo y renderizar los entregables.

1. ORQUESTADOR: en pipeline-orchestrator, la etapa 'adn' ahora es:
   onboarding submitted → invocar research-engine → al terminar (o quedar 'partial'),
   generar los 4 ADNs → stage_status 'awaiting_client'. Si research falla del todo,
   fallback al flujo actual (ADN solo con datos del onboarding) + aviso al equipo
   marcando el ADN como "sin investigación de mercado".
2. PORTAL DEL CLIENTE — las 6 tarjetas (spec sección 5 del doc):
   - Tarjeta 3 "Tu mercado": tabla de competidores + ads ganadores con días corriendo
     y links a la biblioteca de Meta. Lenguaje simple, cero jerga.
   - Tarjeta 4 "Lo que funciona en tu nicho": los hooks dominantes con ejemplos
     reales citados, solo lectura.
   - Render SIEMPRE desde un resumen legible generado (multi-ai) — nunca el JSON crudo.
3. GUIONES: al generar el lote, inyectar el ADN Viral en el prompt de guiones con la
   regla "cada hook declara de qué hook real del nicho desciende" y guardar esa
   trazabilidad (hook_source) en el item de content.
4. EQUIPO: en la vista del cliente, botón "Ver informe de investigación completo"
   (el informe interno con transcripciones y datasets referenciados).
5. Regeneración por feedback ("Pedir cambio"): re-sintetiza SOLO con los datos ya
   scrapeados (sin re-scrapear) salvo que el cambio pida otros competidores.

## VALIDACIÓN
E2E: onboarding real de prueba → investigación corriendo visible → 4 ADNs → cliente
aprueba → estrategia → guiones con hook_source trazable. Capturas de las 6 tarjetas
en móvil. Commit: "feat: Conectar motor de investigación al pipeline y entregables"
```

## 8. Decisiones y advertencias

> [!important] Decisiones de diseño
> 1. Ranking de viralidad = código determinístico; la IA analiza y sintetiza, nunca rankea ni inventa métricas.
> 2. Todo lo afirmado en un ADN debe tener evidencia citada (video, ad o dato del onboarding). Regla anti-alucinación en todos los prompts de síntesis.
> 3. Tope de gasto por corrida ($6 USD default) y caché de nicho de 30 días — el costo por cliente BAJA con la escala.
> 4. Los datos de producto (componentes, garantías, precios) vienen SOLO del cliente. La investigación enriquece mercado y contenido, jamás inventa atributos del producto.
> 5. `niche_intelligence` es de plataforma (sin datos de clientes individuales) — es el activo acumulable de Kreoon.

> [!warning] Riesgos honestos
> 1. **Scrapers se rompen**: los actores cambian con las plataformas. Mitigación: apify_run_ids + status 'partial' + fallback a ADN sin investigación; nunca bloquear el pipeline del cliente por un scraper caído.
> 2. **Nichos pequeños**: habrá nichos donde no existan 5 competidores con contenido viral. El motor entrega lo que hay con honestidad de alcance — el prompt lo exige.
> 3. **Costo TikTok transcript** ($0.048/min) es ~10x el de IG: priorizar transcripción IG y usar TikTok para métricas/formatos, transcribiendo solo sus top 3–5.
> 4. Este motor corre DESPUÉS de la simplificación (fases 0–3 del plan maestro) — es la fase 4 con esteroides, no un proyecto paralelo.

## 9. Orden de ejecución

1. Simplificación fases 0–3 (plan maestro vigente).
2. **R1** — backend del motor (con corrida real de prueba y costo medido).
3. **R2** — integración al pipeline + entregables.
4. Piloto con 1 cliente real del nicho más repetido de la agencia (belleza) → medir: costo real, calidad de ADNs vs los actuales, tiempo onboarding→guiones.
5. Ajustar prompts de síntesis con lo aprendido del piloto (los prompts viven en `platform_prompts`, editables sin deploy).

---

## 10. PROMPT R3 — Etapa "Selección de creador" (va DESPUÉS de R1 y R2)

> Añadido 2026-08-13. Se ejecuta cuando R1 y R2 estén validados: los guiones solo
> pueden adaptarse al creador si antes existen ADN Viral y estrategia reales.

```
## FEATURE
Etapa "Selección de creador" en el pipeline autónomo, ANTES de la generación de
guiones — para que todo guion se escriba adaptado al creador real que va a grabar.

## CONTEXTO
El pipeline actual es: onboarding → adn → estrategia → guiones → produccion.
El nuevo orden es: onboarding → adn → estrategia → CREADORES → guiones → produccion.
Lee la máquina de estados client_pipeline_runs y el orquestador antes de tocar nada.

## 1. FICHA CREATIVA DEL CREADOR (dato nuevo, sin ella nada funciona)
Extiende creator_profiles (o tabla satélite creator_creative_profile si el schema
lo pide) con la "ficha creativa":
  - edad (rango), genero, ciudad y acento/país del español
  - estilo_energia: 'calmado' | 'neutro' | 'alta-energia'
  - forma_de_hablar: muletillas reales, registro (coloquial/neutro), 2-3 frases
    de ejemplo de cómo habla (las escribe el creador o el equipo al escucharlo)
  - escenarios_disponibles: [casa, cocina, gym, carro, oficina, exterior...]
  - formatos_fuertes: [talking-head, demo, GRWM, storytime, voz-en-off...]
  - restricciones: qué NO graba (rostro, niños, ropa deportiva, marcas de X tipo)
  - nichos_afines: [belleza, hogar, fitness...]
UI: mini-formulario de 2 minutos en el perfil del creador + vista de completitud
en el directorio de Talento ("ficha creativa: 80%"). El equipo puede llenarla por él.

## 2. NUEVA ETAPA 'creadores' EN EL PIPELINE
- Al aprobarse la estrategia: stage='creadores', stage_status='awaiting_team'.
- El sistema PROPONE una shortlist automática de 3 creadores: scoring determinístico
  ficha creativa vs ADN (edad vs avatar, género vs avatar, nicho afín, escenarios
  vs formatos ganadores del ADN Viral, restricciones como filtro duro). Mostrar el
  porqué de cada match ("coincide edad del avatar, tiene cocina, fuerte en demo").
- El equipo confirma 1..N creadores (puede ignorar la shortlist y elegir manual —
  el humano manda). Opcional por org: el cliente ve la tarjeta del creador elegido
  (foto + 2 videos del portafolio) con Aprobar / Pedir otro.
- Confirmado el creador → el run guarda selected_creator_ids y AVANZA SOLO a guiones.
- La tarjeta del portal del cliente entre "Tu estrategia" y "Tus guiones":
  "Tu creador" — foto, nombre, por qué lo elegimos, muestras de su trabajo.

## 3. GENERACIÓN DE GUIONES ADAPTADA AL CREADOR
Al generar el lote, inyectar en el prompt de guiones la FICHA DEL CREADOR completa
junto al ADN, con estas reglas (van literales en el prompt de generación):

  REGLAS DE ADAPTACIÓN AL CREADOR:
  1. El guion se escribe para la voz de [NOMBRE], [EDAD], [GÉNERO], de [CIUDAD].
     Usa su registro y sus muletillas reales: [MULETILLAS]. Prohibido un lenguaje
     que esta persona no usaría.
  2. COHERENCIA CREADOR-AVATAR: si el creador coincide con el avatar del ADN,
     narra en primera persona como usuario del producto. Si NO coincide (edad,
     género u contexto), CAMBIA el punto de vista narrativo en vez de forzar:
     testimonio de tercero cercano ("se lo regalé a mi mamá"), voz de experto/
     recomendador, reacción, o demo sin claim personal. NUNCA pongas al creador
     a fingir una vida que en cámara no es creíble.
  3. Escenarios y props: solo los de su lista [ESCENARIOS]. Si el guion pide
     cocina y no tiene, se reescribe la escena.
  4. Formato: prioriza sus formatos fuertes [FORMATOS]; si la estrategia exige
     otro, simplifica la ejecución.
  5. Restricciones del creador son filtro DURO: [RESTRICCIONES].
  6. Cada guion declara: creator_id, punto de vista elegido (primera persona /
     tercero cercano / experto / reacción) y por qué.

- Guardar en el item de content: selected_creator_id + pov_narrativo + hook_source.
- Si hay varios creadores confirmados, el lote se reparte y cada guion se genera
  para SU creador (no un lote genérico repartido después).

## 4. REASIGNACIÓN SIN REHACER TODO
Si después de generados los guiones cambia el creador (se enferma, renuncia):
acción "Re-adaptar guiones" → pasa los guiones existentes por una pasada de
RE-VOICING (mismo ángulo, misma estructura, nueva voz/POV/escenarios según la
ficha del nuevo creador) en vez de regenerar de cero. Los guiones ya aprobados
por el cliente generan versión nueva marcada "re-adaptado a [nombre]" — nunca
se sobreescribe la versión aprobada (regla de protección de contenido).

## NO ROMPER
La asignación manual del board existente sigue funcionando; esta etapa la alimenta
(el creador confirmado queda asignado en los items al crearse).

## VALIDACIÓN
E2E con dos casos: (a) creador que coincide con el avatar → guiones en primera
persona; (b) creador que NO coincide (ej. avatar mujer 35, creador hombre 20) →
verificar que el guion cambió el POV y NO finge ser el avatar. Probar también la
re-adaptación por cambio de creador. Capturas + queries de trazabilidad.
Commits en español por bloque.
```

### Nota de encaje con el pipeline vivo

`stage` de `client_pipeline_runs` hoy admite `onboarding · adn · estrategia · guiones ·
produccion` y `stage_status` admite `generating · awaiting_client · changes_requested ·
approved · error · paused_no_tokens`. R3 introduce **dos valores nuevos**: la etapa
`creadores` y el estado `awaiting_team`. Ambos exigen tocar los CHECK de la tabla y el
`ORDEN_ETAPAS` del orquestador — no se puede hacer "por los lados". El portal del cliente
y la etiqueta de la tarjeta de Clientes leen esos valores, así que entran en el mismo bloque.

### Orden de ejecución actualizado

1. Simplificación fases 0–3 ✔
2. **R1** — backend del motor (tanda 1: base + etapas A/C/E · tanda 2: B/D/F/G).
3. **R2** — integración al pipeline + entregables (6 tarjetas).
4. **R3** — etapa de selección de creador + guiones adaptados a la ficha creativa.
5. Piloto con cliente real y ajuste de prompts en `platform_prompts`.
