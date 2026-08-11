# Respaldo pre-simplificación · KREOON

**Fecha del respaldo:** 2026-08-11
**Proyecto Supabase:** `wjkbqcrxwsmvtxmqgiqc`
**Tag de git del código en ese momento:** `pre-simplificacion` (sobre `main`)
**Rama de trabajo de la simplificación:** `simplificacion-2026`

Esto es la red de seguridad ANTES de eliminar módulos completos de la plataforma.
Nada se eliminó al crear este respaldo: todas las consultas fueron de solo lectura.

---

## 1. Qué hay aquí (léelo primero)

```
backups/pre-simplificacion/
├── README.md                  ← este archivo
├── manifest.json              ← inventario: cada tabla, cuántas filas, cuántos bytes, cómo se exportó
├── live-streaming/            ← datos del módulo (un .json y un .csv por tabla)
├── social-feed/
├── up-reputacion/
├── marketplace-campanas/
├── booking/
├── schema/                    ← el DDL: cómo estaban hechas esas tablas
│   ├── 01_tables.sql          ← CREATE TABLE de las 135 tablas
│   ├── 02_constraints.sql     ← PK, UNIQUE, FK, CHECK
│   ├── 03_indexes.sql         ← índices
│   ├── 04_policies.sql        ← políticas RLS
│   ├── 05_triggers.sql        ← triggers
│   └── 06_dependencias.md     ← QUÉ SE VA A ROMPER al borrar (FKs entrantes, vistas, funciones)
└── tools/
    ├── export-modules.mjs     ← el script que bajó los datos (re-ejecutable)
    ├── refresh-manifest.mjs   ← recalcula manifest.json desde los archivos en disco
    └── make-restore-sql.mjs   ← genera el SQL para devolver una tabla a la base
```

Cada tabla tiene **dos** archivos con el mismo contenido:

- `<tabla>.json` → el bueno para restaurar (respeta tipos, jsonb, nulls).
- `<tabla>.csv` → para mirarlo en Excel/Sheets. **No lo uses para restaurar**, pierde tipos.

Una tabla vacía tiene un `.json` con `[]`. Eso es correcto: la tabla existía y no tenía filas.

---

## 2. Contenido por módulo

| Módulo | Tablas | Filas | Tablas con datos |
|---|---:|---:|---|
| `live-streaming` | 37 | 19 | `creator_live_streams` (9), `live_stream_viewers` (5), `live_feature_flags` (4), `live_platform_config` (1) |
| `social-feed` | 24 | 381 | `portfolio_posts` (158), `social_notifications` (68), `user_feed_events` (48), `content_likes` (45), `followers` (36), `portfolio_post_likes` (14), `kreadores_content_likes` (4), `saved_items` (4), `suggested_profiles_cache` (3), `user_interest_profile` (1) |
| `up-reputacion` | 44 | 85.603 | `user_global_badges` (76.125), `up_events` (3.371), `point_transactions` (2.644), `reputation_events` (1.702), `user_achievements` (640), `user_global_stats` (525), `global_badges` (145), `user_points` (85), `up_editores` (71), `user_reputation_totals` (48), `up_creadores` (44), `role_weight_config` (43), `up_user_scores` (42), `achievements` (24), `reputation_configs` (18), `role_multipliers` (17), `up_settings` (10), `reputation_global` (9), `up_fraud_alerts` (9), `user_streaks` (7), `up_quality_scores` (6), `mission_templates` (5), `reputation_seasons` (4), `role_points_config` (4), `user_daily_missions` (3), `up_seasons` (2) |
| `marketplace-campanas` | 15 | 15 | `marketplace_campaigns` (8), `campaign_templates` (6), `promotional_campaigns` (1) |
| `booking` | 15 | 6 | `booking_availability` (5), `booking_event_types` (1) |
| **TOTAL** | **135** | **86.024** | |

Lo que **NO** entró al respaldo por decisión explícita (siguen vivos, no se tocan):
`creator_profiles`, `portfolio_items`, `marketplace_projects`, `creator_services`,
`marketplace_reputation`, wallets y todo el módulo financiero.

---

## 3. Cómo se sacaron los datos (y una trampa importante)

El script `tools/export-modules.mjs` baja las tablas por la API REST de Supabase usando la
llave `service_role`. **23 tablas devolvieron `403 permission denied`**: son tablas creadas sin
`GRANT ALL ... TO service_role`, un bug conocido del proyecto. Esas se exportaron aparte
usando el MCP de Supabase, que se conecta con el rol `postgres` y sí las ve.

En `manifest.json`, el campo `via` dice por qué camino salió cada tabla:
`postgrest-service-role` o `mcp-postgres`.

> Consecuencia práctica: si algún día una edge function con `service_role` necesita leer esas
> tablas, va a fallar con 500. No es problema de este respaldo, pero quedó documentado.

---

## 4. Cómo restaurar (paso a paso)

### Caso A: la tabla todavía existe y solo quieres devolverle las filas

1. Abre una terminal en la raíz del repo.
2. Corre (ejemplo con `followers`, que vive en la carpeta `social-feed`):

   ```
   node backups/pre-simplificacion/tools/make-restore-sql.mjs social-feed followers
   ```

3. Eso te deja un archivo en `backups/pre-simplificacion/restore/followers.sql`.
4. Abre el **SQL Editor** de Supabase (dashboard del proyecto `wjkbqcrxwsmvtxmqgiqc`).
5. Copia el contenido del archivo, pégalo y dale *Run*.
6. El propio SQL imprime al final cuántas filas quedaron. Debe coincidir con `manifest.json`.

### Caso B: la tabla ya fue eliminada

Primero hay que reconstruir la estructura, en este orden exacto:

1. `schema/01_tables.sql` (crea las tablas)
2. `schema/02_constraints.sql` (llaves y validaciones)
3. `schema/03_indexes.sql` (índices)
4. `schema/04_policies.sql` (seguridad RLS)
5. `schema/05_triggers.sql` (automatismos)

Cada archivo se pega en el SQL Editor y se corre. Después sigue el **Caso A** para los datos.

> Si solo necesitas una tabla, busca su bloque dentro de cada archivo en vez de correrlo entero.

### Verificación hecha el 2026-08-11

Se probó el camino completo con la tabla `followers`:

| Chequeo | Resultado |
|---|---|
| Filas en la base | 36 |
| Filas restauradas desde el backup en una tabla temporal | 36 |
| Filas que no coincidían (`EXCEPT`) | 0 |
| `md5` del contenido origen vs. restaurado | idéntico (`24dcdf8e…beec9`) |

La tabla temporal `_restore_test_followers` se creó, se comparó y **se eliminó**. Se confirmó
que no quedó ningún residuo (`0` tablas con prefijo `_restore_test`).

---

## 5. Antes de borrar: lo que va a estallar

`schema/06_dependencias.md` tiene el detalle. Resumen:

| Qué | Cuántos |
|---|---:|
| Llaves foráneas ENTRANTES (bloquean el `DROP TABLE`) | 8 |
| Vistas / vistas materializadas que usan estas tablas | 2 |
| Funciones de base de datos que mencionan estas tablas | 133 |

Las 8 FKs entrantes vienen de 7 tablas que **se quedan**: `alerts`, `brand_credit_transactions`,
`creatives`, `marketplace_media`, `marketplace_projects`, `portfolio_items`, `scheduled_posts`.
Hay que resolverlas (soltar la columna o la constraint) antes de cualquier `DROP`.

Ojo especial con `admin_delete_user_cascade`: esa función toca 31 tablas del set. Si se borran
las tablas sin actualizar la función, **borrar un usuario deja de funcionar**.

---

## 6. Reglas de esta carpeta

- No edites los `.json` ni los `.csv` a mano.
- No borres esta carpeta hasta que la simplificación esté estable en producción y validada.
- Los dumps planos están fuera de git (ver `.gitignore`); lo versionado es el ZIP
  `datos-pre-simplificacion.zip`, el esquema, el manifest y estas instrucciones.
  Para volver a tener los archivos sueltos, descomprime el ZIP en esta misma carpeta.
