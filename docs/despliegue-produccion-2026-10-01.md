# Despliegue a producción — rama `claude/focused-mendel-es4xcv` (2026-10-01)

Estado al cerrar la sesión: la rama compila desde una copia limpia (`vite build` OK). El paso a producción
quedó bloqueado por el control de permisos de la sesión de Claude, así que estos pasos los ejecuta Alexander
(o una sesión con permiso explícito para producción).

## Ya aplicado en producción

- Fases 2, 2b, 5, reglas de archivado y movimientos por rol, `builder_config_draft`, hotfixes de
  `approve_join_request` y de escalada a admin (sesiones anteriores).
- **Fase 4** (`20260930140000_community_benefits_server_only_metadata`): aplicada hoy. Los beneficios de
  comunidad ya leen `raw_app_meta_data` (no editable por el usuario).

## Pendiente, en este orden

> No usar `supabase db push`: el historial remoto tiene otras versiones (las migraciones se aplicaron con
> otros timestamps) y se re-aplicarían.
> Aplicar cada archivo pegándolo en el SQL Editor de Supabase.

1. ~~**Fase 7**~~ — **aplicada y verificada** (2026-10-01, tarde).
2. **Fase 3** — `supabase/migrations/20260930130000_creator_onboarding_and_unpublished_profiles.sql`.
   Ya trae `publish_profile_blocks` fusionada con la versión de borradores de estilo (no hay que re-aplicar
   nada después). Efecto: los perfiles de creador NUEVOS nacen sin publicar hasta que la persona publica.
3. **Fusionar el PR #59 a `main`** → Vercel publica el frontend. La rama ya incluye el trabajo terminado de la
   sesión de prototipos (Bunny, `/p/:slug`, constructor V2, móvil ola 1); build OK.
4. Comprobar en producción: `/registro/ugc-colombia` crea la cuenta, Inicio del creador, perfil público.
5. **Fase 1** — `supabase/migrations/20260930100000_lockdown_membership_paths.sql` (después del paso 3:
   el registro de `main` viejo usaba la función que esta fase endurece).
6. **Fase 6** — `supabase/migrations/20260930160000_brand_members_insert_scope.sql` (después del paso 3:
   «Unirse con código» del frontend nuevo usa `join_brand_with_code`, que crea esta fase).

## Bunny (de la sesión de prototipos)

- Las funciones `bunny-*` ya están desplegadas en producción y aceptan el frontend viejo.
- Después del paso 3: probar subidas de video y material, luego `supabase secrets set BUNNY_UPLOAD_LEGACY_COMPAT=off`
  y rotar las claves de Bunny (antes se entregaban al navegador).
- El service worker pasa a `kreoon-v7`: los usuarios reciben logos e íconos nuevos al activarse.

## Después de las pruebas

- Notificaciones: siguen pausadas (`NOTIFICATIONS_PAUSED=true` en funciones y plantillas de WhatsApp en
  `notification_pause_backup`). Reactivarlas cuando terminen las pruebas.

## Pendientes conocidos (no bloquean)

- `brands.invite_code` es legible por cualquier usuario autenticado (`brands_select = true`): moverlo a una
  tabla privada.
- Perfil público: el texto libre (biografía) todavía viaja completo por la red; la redacción de contactos es
  solo en pantalla. La regla de `restriccion-contacto.md` pide validarlo en el servidor (vista/RPC pública).
- `social_links` dejó de pedirse en la consulta pública, pero la RLS de `creator_profiles` filtra filas, no
  columnas: un cliente puede pedir la columna directo. Igual que `stripe_account_id`.
- Logos nuevos: faltan los archivos en `public/brand/` (logo claro/oscuro, símbolo, Kiro, favicon).
