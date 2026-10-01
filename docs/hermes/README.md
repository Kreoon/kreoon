# Hermes como ayudante de Claude

Hermes (tu servidor) ejecuta trabajo **acotado y repetible**; Claude decide, integra, revisa y es responsable de lo que
toca producción, seguridad o datos. El puente corre en **tu PC** (la sesión de Claude en la nube no alcanza `servidor-casa`:
no hay SSH ni claves, y no te pido claves en el chat).

## Reparto de roles

| Claude (arquitecto y revisor) | Hermes (ejecución acotada) |
|---|---|
| Arquitectura, seguridad, RLS, migraciones, integración y despliegue | Borradores de copy, guiones, calendarios, comunicados |
| Revisa y aprueba cada entrega antes de usarla | Investigación con fuentes, resúmenes, comparativas |
| Define la tarea y los criterios de aceptación | Variantes (A/B de copys, titulares, anuncios) |
| Decide qué entra al producto | Revisión de estilo en español de Colombia, verificación de afirmaciones |

## Flujo (6 pasos)

1. **Claude** escribe una tarea en `docs/hermes/cola/NNN-nombre.md` (frontmatter `perfil`, `titulo`, `max_runtime`; cuerpo
   autocontenido con criterios de aceptación) y la sube a la rama.
2. **Tú**: `git pull` y `node scripts/hermes/cola.mjs enviar` (usa `--ensayo` primero).
3. **Hermes** la ejecuta con el perfil indicado, en su workspace.
4. **Tú**: `node scripts/hermes/cola.mjs recoger` guarda el resultado en `docs/hermes/resultados/` (con `--commit` lo sube).
5. **Claude** revisa contra los criterios (`revision_claude: pendiente` → `aprobada` / `rehacer`) e integra lo bueno.
6. Si hay que corregir, el aprendizaje se anota en el perfil o en el paquete de contexto (ver «Entrenar»).

Comandos: `estado` (qué se envió y su id) · `enviar [--ensayo] [--solo nombre] [--reenviar]` · `recoger [--commit]` ·
`explorar` (solo lectura: descubre qué comandos y perfiles ofrece tu Hermes).
Una tarea ya enviada **no se reenvía** salvo `--reenviar` (evita duplicados como el de `t_42d5285a`).

## Reglas duras (no negociables)

- **Nada con secretos** a Hermes: `cola.mjs` rechaza cualquier tarea que parezca contener claves, tokens o contraseñas.
- **Nunca** delegar: seguridad, RLS, migraciones, edge functions, parches, datos personales de usuarios, ni texto legal final.
- Hermes no recibe el repositorio, solo el **paquete de contexto** (`docs/hermes/contexto/`) y lo que la tarea incluya.
- Todo lo que sale de Hermes es **borrador**. Ninguna entrega se publica ni se envía sin revisión de Claude y, si es legal o
  de imagen de personas, sin revisión de tu asesor.
- No inventar cifras, nombres, testimonios ni prometer ingresos o trabajo (reglas completas en el paquete de contexto).

## Entrenar a un bot (qué significa de verdad)

No es *fine-tuning*. «Entrenar» = darle un **perfil** (misión, límites, formato de salida), un **paquete de contexto**
(marca, hechos verificados, afirmaciones prohibidas), **ejemplos aprobados** (entregas que Claude marcó como buenas) y un
**ciclo de corrección** (cada rechazo se convierte en una regla o ejemplo nuevo). Así mejora con el uso sin salir del repo.
Cada perfil vive en `docs/hermes/perfiles/<nombre>.md`.

## Catálogo de perfiles

Existentes en tu Hermes (según las tareas ya enviadas): `estratega`, `redes`, `anuncios`, `ventas`, `vibecoding`.
Propuestos nuevos: `investigador`, `editor-es`, `verificador`. **Estado «por crear»**: falta descubrir el comando real de tu
Hermes para crear perfiles; corre `node scripts/hermes/cola.mjs explorar` y pega `docs/hermes/descubrimiento.md` en el chat.
Con eso Claude escribe los comandos exactos (no se inventan).

## Niveles de automatización

1. **Manual (hoy):** tú ejecutas `enviar` y `recoger`. Cero secretos expuestos.
2. **Semi:** una tarea programada en tu PC corre `recoger --commit` cada cierto tiempo.
3. **Automático:** el propio servidor hace `git pull` solo de `docs/hermes` con una *deploy key* de **solo lectura** y
   ejecuta la cola. Requiere crear esa clave en tu servidor: decisión tuya; Claude no la crea ni la ve.
   Exponer el servidor a internet para que la nube lo llame **no se recomienda**.

## Qué conviene delegar para ahorrar tokens

Redacción larga y variantes, investigación con fuentes, calendarios y piezas repetitivas, revisión de estilo. **No** conviene
delegar lo que exige ver el repo, razonar sobre seguridad o integrar con el producto: ahí el costo de explicar supera el ahorro.

## Estructura

```
docs/hermes/
  cola/            tareas que Claude escribe (una por archivo)
  resultados/      lo que devuelve Hermes (pendiente de revisión)
  perfiles/        un archivo por bot: misión, reglas, criterios, ejemplos
  contexto/        paquete de contexto que cargan todas las tareas
  estado.json      qué se envió y con qué id (lo escribe cola.mjs)
scripts/hermes/    cola.mjs (puente) · delegar-solo.ps1 (envío manual de las 4 primeras)
```
