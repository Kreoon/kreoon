---
title: QA del Research Unificado — corrida real 2026-08-13
created: 2026-08-13
tags: [kreoon, qa, research, adn]
status: cerrado con salvedades
---

> Todo lo de aquí sale de corridas reales contra la base de producción, con dos
> productos de prueba del cliente Dapta que se borraron al terminar. Nada está
> simulado.

## 1. Qué se probó

Dos productos del **mismo cliente**, para validar de paso el multi-producto:

| Producto | Resultado | Pasos | Ángulos | Parrilla |
|---|---|---|---:|---:|
| ZZ QA Research A | ✅ Completado | 16/16 | 20 | 28 piezas |
| ZZ QA Research B | ✅ Completado | 16/16 | 14 | 28 piezas |

Ninguno terminó en error. La cadena entera —de `market_overview` a
`content_kpis`— se encadenó sola por self-invocation, como antes.

## 2. Lo que se verificó, con números

| Comprobación | Resultado |
|---|---|
| Total de fases | **16** (9 pasos + 2 mitades de ideas + 4 semanas de parrilla + KPIs) |
| Ningún paso pide más de 9.000 tokens | ✅ el máximo es 9.000 (`sales_angles`) |
| Suma del TOKEN_MAP | **~72.000** (antes: 227.000) |
| Ángulos con `hook_source` | **20 de 20** |
| Creativos con `pauta_recomendada` | **15 de 15** |
| KPIs de contenido | **5** con su disparador if/then |
| Fases CAST presentes en la parrilla | las 4: conocer, atraer, seducir, transformar |
| `esferaPhase` vivo en el código | **0 referencias** |
| Los 10 stepIds eliminados en el código | **0 referencias** |
| Migración de datos históricos | 27 parrillas + 48 sets de creativos, **0 pendientes** |
| Distribución tras migrar | conocer 159 · atraer 232 · seducir 197 · transformar 168 |

## 3. Multi-producto

El segundo producto del mismo cliente **reutilizó la investigación del primero**:
la evidencia (competidores, anuncios, ADN Viral) y el ADN de marca son de nivel
cliente, así que no se scrapeó ni se pagó nada nuevo. Solo corrió su propio ADN
de Producto y su estrategia. El log lo deja escrito:
`REUSADA de nivel cliente, compartida con otros N producto(s): 0 scrapes nuevos`.

## 4. Los tres fallos que aparecieron al correrlo (y cómo se cerraron)

Esto no salió leyendo código. Salió poniéndolo a correr.

### 4.1 La función no tiene 150 segundos, tiene ~112

El comentario del código decía "wall-clock 150s". La realidad medida: las
invocaciones mueren alrededor de **112 s**. Por eso subir el timeout de Mistral
a 118 s no arregló nada — ese techo no se alcanza nunca.

### 4.2 Con Gemini sin cuota, Mistral se queda solo y no llega

`video_creatives` murió **cuatro veces seguidas** en TIMEOUT: Gemini devolvía
429 (cuota agotada del plan free) y Mistral, que es el lento, no terminaba el
JSON dentro de la ventana real.

**Arreglo:** entra **OpenAI (gpt-4o-mini)** como segundo de la cadena
(Gemini → OpenAI → Mistral). Su clave ya estaba en los secrets del proyecto.
El paso que llevaba cuatro intentos fallidos pasó **en 62 segundos**.

Además, las ideas de contenido se partieron en dos mitades (7 + 8) y los KPIs
salieron a su propio paso: 15 ideas de una vez no cabían en el tiempo.

### 4.3 Una comilla suelta se llevaba el paso entero

Un JSON real de Mistral se rompió en `"productionNotes": "Mostrar datos (ej. "`
— una comilla doble sin escapar dentro de un texto. Se perdía el paso completo.

**Arreglo doble:** el system prompt prohíbe comillas dobles dentro de los
valores, y el reparador ahora **rescata los elementos completos** en vez de
descartarlo todo. Diez creativos buenos valen más que cero.

## 5. Salvedades honestas — lo que NO quedó perfecto

- **La parrilla repite títulos.** De 28 piezas, 22 títulos únicos: **6 se
  repiten** entre semanas. Cada semana recibe las anteriores y el prompt pide
  explícitamente no repetir, pero el modelo insiste. No es bloqueante (el
  equipo edita la parrilla antes de publicar), pero está ahí.
- **El producto B generó 14 ángulos, no 20.** El schema pide 20 exactos; el
  rescate de JSON parcial salvó 14 cuando la respuesta vino rota. Es
  justamente el comportamiento buscado —mejor 14 que ninguno— pero conviene
  saber que el número no siempre es 20.
- **Depende de que Gemini u OpenAI respondan.** Con los tres proveedores caídos
  no hay research. La cuota de Gemini del plan free sigue agotada; ahora eso ya
  no rompe la cadena, pero el sistema está tirando de OpenAI.

## 6. Compatibilidad con lo viejo

- Los productos históricos con datos de los 10 pasos eliminados **siguen
  abriéndose**: sus columnas no se tocaron, simplemente ya no tienen pestaña.
- `products.launch_strategy` **no se borra** en `force_regenerate`: es dato
  histórico de corridas viejas.
- Los prompts archivados están completos en
  `supabase/functions/_shared/prompts/_archivo/` con instrucciones para
  revivirlos.

## 7. Verificaciones técnicas

- `deno check` sobre `generate-full-research`: **0 errores** (antes de esta
  sesión tenía 7, todos preexistentes; se cerraron de paso).
- `deno check` sobre `pipeline-orchestrator` y `research-engine`: 0 errores.
- `tsc --noEmit -p tsconfig.app.json` sobre los archivos del portal: 0 errores.
- Datos de prueba borrados: los dos productos ZZ QA ya no existen.
