# Migración `portfolio_posts` → `portfolio_items`

**Fecha del diagnóstico:** 2026-08-11
**Estado:** diagnóstico terminado. Nada aplicado en base de datos.
**Regla de oro respetada:** no se pierde contenido de creadores. En la duda, se conserva.

---

## Resumen en una frase

De las 158 filas, **21 ya están migradas** (el 100 % de las que se pueden migrar) y **137 no se pueden migrar** porque su autor **no existe** en la plataforma. Además, `portfolio_posts` **no es una tabla vieja**: la app sigue escribiendo en ella hoy. **No se debe dropear.**

---

## Los números exactos

| Concepto | Filas |
|---|---:|
| Total en `portfolio_posts` | **158** |
| Borradas (soft-delete) | 0 |
| Ya replicadas en `portfolio_items` (tienen `legacy_post_id`) | **21** |
| Migrables que aún faltan | **0** |
| **No migrables** | **137** |

### Por qué esas 137 no se pueden migrar

`portfolio_items.creator_id` es obligatorio y apunta a `creator_profiles`. Para migrar una fila hace falta que su autor sea un creador registrado.

| Situación del autor | Posts | Autores |
|---|---:|---:|
| Autor con perfil de creador (migrable) | 21 | 2 |
| Autor **inexistente** (no está en `auth.users` ni en `profiles`) | 137 | 19 |

El hallazgo clave: **los 137 posts no son de "estudiantes o clientes"**, como decía el comentario de la migración anterior (`20260708040000`). Sus `user_id` **no existen en ninguna parte de la base de datos**. Son datos importados de un **proyecto Supabase anterior** — 31 de sus archivos todavía apuntan al dominio del proyecto viejo (`hfooshsteglylhvrpuka.supabase.co`), que ya no es el nuestro.

`portfolio_posts.user_id` **no tiene llave foránea**, y por eso la base de datos nunca impidió que quedaran así.

### ¿Ese contenido se ve hoy en la plataforma?

**No.** El feed unificado (`get_feed_posts`) cruza los posts contra la tabla de perfiles; como esos 19 autores no existen, sus 137 posts **ya son invisibles** en el feed desde julio. Están guardados, pero nadie los ve.

### ¿Los archivos siguen existiendo?

| Dónde está el archivo | Posts huérfanos | ¿Sigue vivo? |
|---|---:|---|
| Bunny CDN, librería 568434 | 106 | **Sí.** Es la misma librería que usan los 1.134 `portfolio_items` actuales |
| Storage del proyecto Supabase viejo | 31 | **Dudoso.** Apunta a un proyecto que ya no controlamos |

---

## Información que se perdería aunque migráramos la fila

Estas columnas de `portfolio_posts` **no tienen destino** en `portfolio_items`:

| Columna | Qué guarda | Dato actual |
|---|---|---|
| `is_pinned` / `pinned_at` | Post fijado arriba del perfil | 3 posts fijados |
| `comments_count` | Contador de comentarios | 0 en todas las filas |
| `post_type` | Distingue `portfolio` de `personal` | 21 son `personal` — y las 21 son de autores inexistentes |

También se pierde el vínculo con los **likes**: `portfolio_post_likes` apunta a `portfolio_posts.id`, no a `portfolio_items.id`. Hay 14 likes registrados; 6 de ellos están sobre posts de autores inexistentes. Al migrar solo se copia el *número* de likes, no quién dio like.

---

## Las 3 opciones para las 137 filas

### a) Crear perfiles de creador mínimos para esos 19 usuarios

- **Se gana:** las 137 filas entrarían a `portfolio_items` y `portfolio_posts` podría vaciarse de contenido único.
- **Se rompe:**
  - Los 19 usuarios **no existen en `auth.users`**. `creator_profiles.user_id` no podría apuntar a nadie real: serían perfiles fantasma sin dueño, imposibles de editar, reclamar o borrar por su supuesto autor.
  - Habría que **inventar** nombre público, avatar y datos de perfil. Es exactamente lo que la regla de oro prohíbe.
  - Efecto colateral directo: los creadores aparecen en **búsquedas y en el marketplace**. Crearíamos 19 creadores falsos visibles para clientes reales.
- **¿Reversible?** A medias. Se podrían borrar los perfiles después, pero el `ON DELETE CASCADE` de `portfolio_items.creator_id` **borraría también las 137 filas migradas**.
- **Veredicto:** inventa datos y ensucia el marketplace. No recomendable.

### b) Hacer `portfolio_items.creator_id` nullable y migrar con `creator_id = NULL`

- **Se gana:** las filas se mueven sin inventar ningún dato.
- **Se rompe:**
  - El feed (`get_feed_posts`) hace un cruce **obligatorio** contra `creator_profiles`. Con `creator_id` nulo, esas filas **seguirían sin verse** — o sea, no se gana visibilidad, que es lo único que justificaría el esfuerzo.
  - Se debilita una garantía que hoy protege a **las 1.283 filas** de `portfolio_items`: dejaría de ser imposible tener contenido sin dueño. Cualquier bug futuro podría crear filas huérfanas silenciosamente.
  - Habría que auditar todo el código que asume que `creator_id` siempre tiene valor.
- **¿Reversible?** Difícil. Volver a poner la restricción exige que no quede ni una fila nula, es decir, borrar lo que acabamos de migrar.
- **Veredicto:** se paga un costo estructural real a cambio de nada visible.

### c) No migrarlas y conservar `portfolio_posts` como archivo — **RECOMENDADA**

- **Se gana:** cero pérdida de datos, cero datos inventados, cero riesgo. El contenido queda íntegro y consultable.
- **Se rompe:** nada.
- **¿Reversible?** Totalmente: si algún día aparece el dueño real de esos posts, se le puede asignar el contenido.
- **Costo:** conviven dos tablas. Pero **eso ya es así hoy y no va a cambiar** — ver el punto siguiente.

---

## Advertencia importante: `portfolio_posts` no es una tabla muerta

El objetivo original era dropearla. **Eso hoy rompería la aplicación**, independientemente de los datos.

`portfolio_posts` recibe **escrituras activas** desde al menos 15 archivos de `src/`, entre ellos:

- `src/components/portfolio/MediaUploader.tsx` — **inserta** cada post nuevo que publica un usuario
- `src/components/portfolio/profile/PortfolioProfile.tsx` — 7 usos (lectura y escritura)
- `src/components/portfolio/PostActionsMenu.tsx` — borrado y edición de posts
- `src/pages/portfolio/VideosPage.tsx`, `src/hooks/useMarketplaceCreators.ts`, `src/hooks/useHashtags.ts`, `src/hooks/useMarketplaceReadiness.ts`, y otros

Dropear la tabla exigiría primero **migrar todo ese código** a `portfolio_items`, lo cual es un proyecto aparte y mucho mayor que mover 158 filas.

---

## Recomendación

**Opción (c): conservar `portfolio_posts`.** No hay nada pendiente por migrar (0 filas), las 137 restantes no son migrables sin inventar usuarios que no existen, y la tabla sigue en uso activo por la aplicación.

### Siguiente paso sugerido (opcional, aparte)

Las 137 filas están guardadas pero **invisibles**. Si el dueño del producto quiere recuperar ese contenido, el camino honesto no es la migración: es **identificar a quién pertenece realmente** cada uno de esos 19 autores y reasignarlo a su cuenta actual. Los 106 archivos en Bunny siguen vivos y son recuperables. Es una decisión de producto, no técnica.

---

## Archivo de migración preparado

`supabase/migrations/20260812040000_migrate_portfolio_posts.sql`

- Es **solo aditivo**: no borra, no actualiza, no dropea nada.
- Es **idempotente**: correrlo dos veces no duplica filas.
- **Hoy insertaría 0 filas** (verificado con un `SELECT` de conteo). Se deja preparado para capturar cualquier post publicado entre este diagnóstico y el momento de aplicarlo.
- Incluye un bloque de verificación que **aborta con `EXCEPTION`** (y hace rollback) si los conteos no cuadran, y que deja por escrito si la replicación fue total o parcial.
- **No ha sido aplicado.**
