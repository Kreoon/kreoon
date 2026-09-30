# 03 · Migración y conciliación de datos

> **Nota:** la sección 6 del brief llegó truncada ("Antes de migrar:" sin lista). Este plan sigue el bloque JSON
> (`dry_run_required`, `mapping_manifest_required`, `backup_and_rollback_required`, `preserve_auth_user_ids`, `preserve_existing_permissions`,
> `rewrite_historical_signed_documents:false`, `fabricate_legal_consents:false`, `blind_mass_update:false`, ejecución solo tras autorización).
> Si la lista original tenía otros requisitos, hay que contrastarla.

## Conclusión del dry-run [VIVO, solo lectura, 30/09/2026]

No hay "consolidación" de organizaciones que ejecutar: **existe una sola organización** (`c8ae6c6d-…`, slug `ugc-colombia`). El trabajo
es de **configuración** (nombre visible, inscripción, rol por defecto, organización predeterminada) y de **conciliación**.

| Medida | Valor | Lectura |
|---|---|---|
| Tablas con `organization_id` | 196 (19.181 filas) | |
| Filas con `organization_id` NULL | 3.804 | Tablas por-usuario (wallets 645, ai_token_balances 644, unified_wallets 609, portfolio_items 554, tracking 447…). Esperable; no se tocan. |
| Filas con `organization_id` de **otra** org (que no existe) | **283** | **Huérfanas**: `chat_rbac_rules` 102, `board_status_rules` 50, `organization_statuses` 36, `organization_ai_modules` 29, `ai_usage_logs` 19, `platform_backup` 16, `board_permissions` 15, `ambassador_up_config` 4, `board_settings` 3, `organization_ai_providers` 3, **`organization_members` 1**, y 5 tablas con 1 fila |
| Perfiles | 644 (+1 `auth.users` sin perfil) | |
| Perfiles **sin membresía** | **268** (255 con solicitud pendiente de ugccolombia.co) | Cuentas existentes que no son miembros; se conservan |
| Miembros activos | 377 (188 con rol legado `creator`) | No se convierten masivamente |
| Miembros sin fila en `organization_member_roles` | 2 | Revisar |
| Perfiles con los 5 consentimientos de registro | **24 de 644** | No se fabrican; se piden en el onboarding |
| `creator_profiles` públicos | 642 | Decisión de producto pendiente (ver 05) |

## Manifiesto de mapeo

| Origen | Destino | Acción | Riesgo |
|---|---|---|---|
| `organizations.name` ('KREOON') | 'UGC Colombia' | `UPDATE` de 1 fila con guarda de ID+slug (`…125000`) | Bajo. Cambia el nombre visible de la org, no el de la plataforma |
| `organizations.is_registration_open / registration_require_invite / default_role` | true / false / `content_creator` | idem | `default_role` estaba en `client`: incompatible con creadores |
| `organizations.is_default_registration_org` | true | idem | Único por índice parcial |
| `app_settings.primary_color/theme_color` | '#6D4AFF' (si era '#7700b8') | `…150000` | Bajo; el frontend ya trata ambos como "por defecto" |
| Auth users / perfiles / roles / permisos | — | **No se tocan** (IDs de Auth preservados) | — |
| 283 filas huérfanas de otra org | **Decisión pendiente** | No hay UPDATE ciego. Clasificar: config heredada (`organization_statuses`, `board_*`, `chat_rbac_rules`, `organization_ai_*`) → archivar o remapear tras revisión por tabla; `organization_members` huérfana → revisar/eliminar | Medio |
| 268 perfiles sin membresía | **Decisión pendiente** | Opciones: (a) que cada persona confirme su alta al iniciar sesión (ya soportado), (b) aprobar `organization_join_requests` desde el panel (ahora seguro). **No** aprobar en masa sin revisar | Medio |
| Documentos firmados históricos | — | **No se reescriben** (`rewrite_historical_signed_documents:false`) | — |

## Dry-run (repetible)

```sql
-- 1. Identidad de la organización (debe devolver exactamente 1 fila)
select id, name, slug, is_registration_open, registration_require_invite, default_role
from organizations where id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e' and slug = 'ugc-colombia';

-- 2. Huérfanos por tabla (filas cuyo organization_id no existe en organizations)
select t.table_name,
  (xpath('/row/c/text()', query_to_xml(format(
    'select count(*) c from public.%I x where organization_id is not null and not exists (select 1 from organizations o where o.id = x.organization_id)',
    t.table_name), false, true, '')))[1]::text::int as huerfanas
from information_schema.tables t
join information_schema.columns c on c.table_schema = t.table_schema and c.table_name = t.table_name and c.column_name = 'organization_id'
where t.table_schema = 'public' and t.table_type = 'BASE TABLE' order by 2 desc;

-- 3. Conciliación de personas
select (select count(*) from profiles) perfiles,
       (select count(*) from organization_members where deleted_at is null) miembros_activos,
       (select count(*) from profiles p where not exists (select 1 from organization_members m where m.user_id = p.id and m.deleted_at is null)) sin_membresia;
```

## Respaldo y reversión

1. **Antes de aplicar cualquier migración:** `pg_dump` de las tablas tocadas (`organizations`, `organization_members`,
   `organization_member_roles`, `organization_join_requests`, `creator_profiles`, `app_settings`, `user_legal_consents`) **y** de las
   definiciones de las funciones/policies modificadas (`pg_get_functiondef`, `pg_policies`). Con Supabase: punto de restauración (PITR) o backup manual.
2. **Ensayo:** crear una rama de Supabase (`create_branch`), aplicar las 6 migraciones, correr `supabase/tests/registration` adaptado y las
   consultas de conciliación. **No se hizo** (requiere autorización y costo); el arnés local valida la lógica sobre un esquema simulado.
3. **Reversión por migración:** `…100000`, `…130000`, `…140000` y `…160000` son `CREATE OR REPLACE`/`DROP POLICY`: se revierten reaplicando la definición
   previa (guardada en el respaldo de funciones/policies). `…110000` es aditiva (`DROP FUNCTION`/`TABLE` las retira). `…125000` y `…150000`:
   `UPDATE` inverso con los valores del respaldo (`name='KREOON'`, `default_role='client'`, `registration_require_invite=true`, `primary_color='#7700b8'`).
4. **Conciliación posterior:** repetir el dry-run; los conteos de perfiles, miembros y `auth.users` deben ser idénticos; `organizations` = 1 fila.
