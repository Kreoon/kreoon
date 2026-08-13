# Pipeline autónomo del cliente

**Qué es:** el camino que recorre un cliente desde que envía su formulario hasta que sus guiones
entran al tablero listos para asignar creador. El sistema hace el trabajo; el cliente solo aprueba.

```
onboarding ─▶ ADN ─▶ mercado ─▶ estrategia ─▶ creadores ─▶ guiones ─▶ producción
             │       │          │             │            │
             └── se detiene en cada etapa esperando a quien le toque ──┘
```

Casi todas las paradas esperan al **cliente**. La de `creadores` espera al
**equipo**: el sistema propone tres creadores y un humano confirma quién graba.

---

## Cómo funciona, en una frase

El pipeline **avanza solo** de una etapa a la siguiente, pero **se para en cada una** hasta que el
cliente aprueba. Si el cliente pide un cambio, se regenera **solo esa etapa** con su comentario.

---

## Las piezas reales (y una trampa importante)

El encargo original mencionaba una función `generate-brand-dna` que **no existe**. Estas son las
que sí existen y lo que hace cada una:

| Etapa | Función real | Cómo responde | Ojo con |
|---|---|---|---|
| ADN de marca | `generate-client-dna` | Síncrona, 30–90 s | Versiona sola (`client_dna.is_active`) |
| ADN de producto | `generate-product-dna` | Síncrona, minutos | **Inserta una fila en `products` en CADA llamada**: llamarla dos veces crea dos productos |
| Estrategia | `generate-full-research` | **202 y sigue en segundo plano**: 21 fases, 5–15 min | El progreso está en `products.research_progress`; si se queda sin tokens **aborta sin avisar por HTTP** |
| Guiones | `generate-script` | Síncrona, 20–60 s | **No guarda nada**: devuelve HTML y el orquestador decide dónde ponerlo |

---

## La máquina de estados

Tabla `client_pipeline_runs`, una fila por cliente.

**Etapas** (`stage`): `onboarding` · `adn` · `mercado` · `estrategia` · `creadores` · `guiones` · `produccion`

**Estados** (`stage_status`):

| Estado | Significa | Quién tiene la pelota |
|---|---|---|
| `generating` | Se está generando | Nadie, hay que esperar |
| `awaiting_client` | Listo para revisar | El cliente |
| `changes_requested` | El cliente pidió un cambio | El sistema (regenera) |
| `approved` | Aprobado | El sistema (avanza) |
| `awaiting_team` | Hay que elegir creador | El equipo |
| `error` | Algo falló | El equipo |
| `paused_no_tokens` | La organización se quedó sin tokens de IA | El equipo |

El histórico va en `client_pipeline_stage_events`, que es **append-only**: cada generación, cada
petición de cambio y cada aprobación quedan registradas. Nada se sobreescribe, según la regla de
protección de contenido aprobado del proyecto.

### Límite de regeneraciones

Tres por etapa. En el cuarto intento el pipeline **no regenera**: marca la etapa como `error`,
registra un evento `escalated` y avisa al estratega. Un humano tiene que mirarlo.

---

## Los guiones entran al tablero como `script_pending`

**No existe** ningún estado tipo "guion en revisión de cliente" ni en el enum `content_status` ni
en `organization_statuses`. Crear uno exigiría tocar el enum **y** la tabla de estados, porque el
tablero lee el enum.

Lo correcto es `script_pending` ("Pendiente Guión"), que es exactamente lo que significa: hay un
guion esperando aprobación. Además ya tiene columnas de apoyo (`script`, `script_version`,
`script_pending_at`, `script_approved_at`) y es el estado que consume el flujo de aprobación que ya
existe.

---

## Reglas que el pipeline respeta

Vienen de `docs/AUDITORIA_ONBOARDING_CLIENTES.md`:

1. **`clients.is_public = false` siempre**. El valor por defecto es `true` y hay una política que
   deja leer a `anon` los clientes públicos.
2. **Los datos fiscales no se copian a `clients`**: se quedan en `client_onboarding_forms`.
   Copiarlos sería exponerlos.
3. **El acceso del cliente al portal es `client_users`**, no `clients.user_id`.
4. **Las notificaciones van por `user_notifications`** y el `type` debe ser uno ya mapeado en el
   frontend (`content_update`). Inventar un `type` nuevo revienta el renderizador y tumba el lote
   entero de notificaciones.

---

## Qué ve cada uno

**El cliente** — una sola pantalla, un checklist de 5 pasos:

1. Tu información ✓
2. Así entendimos tu marca → Ver · Aprobar · Pedir un cambio
3. Tu estrategia → igual
4. Tus guiones → aprobar o pedir cambio uno por uno
5. Tus videos → cómo va la producción (solo lectura)

Sin jerga: nunca "ADN jsonb" ni "stage", sino "Así entendimos tu marca" y "Estamos preparándolo".

**El equipo** — en la lista de Clientes, cada tarjeta lleva una etiqueta con la etapa y quién tiene
la pelota: "Marca · espera al cliente", "Guiones · preparando", "Estrategia · necesita ayuda".

---

## Rollback

1. Código: `git revert` de los commits `feat(pipeline)`.
2. Base de datos:
   ```sql
   DROP TABLE public.client_pipeline_stage_events;
   DROP TABLE public.client_pipeline_runs;
   DROP FUNCTION public.touch_client_pipeline_runs();
   ```
   No se pierde contenido: el ADN, la estrategia y los guiones viven en sus tablas de siempre
   (`client_dna`, `products`, `content`). Estas dos tablas solo guardan el *estado del viaje*.
3. Edge function: `npx supabase functions delete pipeline-orchestrator`.

---

## Las dos etapas nuevas (2026-08-13)

### `mercado` — la investigación real entra al pipeline

Entre el ADN y la estrategia. La ejecuta `research-engine` (ver
`docs/MOTOR_INTELIGENCIA.md`), que scrapea las redes del cliente y de su
competencia, lee los anuncios activos del gremio en la biblioteca de Meta,
rankea por viralidad relativa y sintetiza dos ADNs nuevos: el de Mercado y el
Viral del nicho.

| | |
|---|---|
| Función | `research-engine` (asíncrona, se auto-encadena; 5–20 min) |
| Estado | `research_runs.status`, reconciliado por el `poll` del orquestador |
| Referencia | `client_pipeline_runs.research_run_id` |
| Techo de gasto | `research_runs.budget_usd`, 6 USD por defecto |

**Nunca bloquea al cliente.** Si no hay `APIFY_TOKEN`, si el motor devuelve
error o si el presupuesto se agota, la etapa se marca aprobada por omisión, se
avisa al equipo y la estrategia se genera igual —marcada como "sin
investigación de mercado"—. Un scraper caído no puede dejar a nadie esperando.

Un `status = 'partial'` **sí** se le muestra al cliente: es una investigación
con huecos declarados, y eso vale mucho más que ninguna.

### `creadores` — quién graba, antes de escribir

Entre la estrategia y los guiones, porque un guion se escribe para la voz de
una persona concreta. Elegir después obliga a reescribir o, peor, a que alguien
finja en cámara una vida que no es la suya.

- El sistema propone **tres** creadores con un puntaje **explicable** (nicho
  afín 25, edad del avatar 20, género 15, formatos ganadores 15, escenarios 10,
  ficha al día 15). Nada de IA: son reglas que el equipo puede leer y rebatir.
- La ficha creativa vive en `creator_creative_profile`, con la completitud
  calculada por trigger.
- El equipo confirma con la acción **`select_creators`** (`{run_id,
  creator_ids[]}`). `approve` sobre esta etapa devuelve 409 a propósito:
  confirmar sin decir a quién se elige no significa nada.
- Sin creadores activos en la organización, la etapa se salta con aviso y los
  guiones salen sin adaptar.

**Los guiones nacen con creador asignado** (`content.creator_id`) y con las
reglas de adaptación en el prompt. Si el creador no coincide con el avatar, el
guion cambia el punto de vista (tercero cercano, experto, reacción) en vez de
forzar una primera persona increíble.

### `readapt_scripts` — cambiar de creador sin rehacer nada

Si el creador se enferma o renuncia: `{run_id, creator_ids[]}` pasa los guiones
existentes por una re-adaptación de voz manteniendo ángulo y estructura. Los
guiones que el cliente **ya aprobó no se tocan**: nace una copia titulada
"re-adaptado a [nombre]" y la aprobada se queda intacta.
