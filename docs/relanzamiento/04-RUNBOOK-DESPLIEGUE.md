# 04 · Runbook de despliegue

> **Nada de esto se ha ejecutado en producción.** El brief indica que el artefacto no autoriza el despliegue: cada paso de producción
> requiere autorización explícita de Alexander tras revisar el código y el ensayo.

## Orden recomendado (en dos tiempos)

### Tiempo A — cierre de seguridad (urgente, independiente del relanzamiento visual)
Los hallazgos H1–H3 son explotables hoy. La migración `…100000` no depende de ningún código nuevo.
1. Respaldo (ver `03-MIGRACION-DATOS.md`, sección *Respaldo y reversión*).
2. Ensayo en rama de Supabase (`create_branch`) y correr el arnés adaptado.
3. Aplicar `20260930100000_lockdown_membership_paths.sql` y `20260930160000_brand_members_insert_scope.sql` (ambas solo cierran accesos indebidos).
4. Verificar (SQL abajo). Efecto esperado en el frontend **actual**: el alta de "cliente" por `register_user_to_organization` deja de funcionar (intencional).

### Tiempo B — lanzamiento
1. Desplegar el frontend de esta rama (Vercel).
2. Aplicar, en este orden: `…110000` → `…130000` → `…140000` → `…160000`.
3. Desplegar edge functions modificadas: `public-registration`, `client-onboarding-claim`, `auth-email-proxy`, `notify-new-member`,
   `kreoon-bootstrap`, `migrate-to-kreoon`, `sync-to-kreoon`, `sync-user-permissions`, `bulk-password-reset` (+ `_shared/legacyToolGuard.ts`).
4. Configuración externa (no verificable desde el repo — **hacerlo antes del paso 5**):
   - **Supabase Auth → URL Configuration → Redirect URLs:** añadir `https://kreoon.com/registro/**`, `https://www.kreoon.com/registro/**`
     y `https://kreoon.com/auth/callback`. Sin esto, el enlace del correo y el retorno de Google caen en el *Site URL*.
   - **Auth → Providers → Google:** confirmar Client ID/Secret y la URI de redirección de Supabase. Si no está lista: `VITE_GOOGLE_AUTH_ENABLED=false` en Vercel.
   - **Auth → Email:** "Confirm email" activo; la plantilla *Confirm signup* debe usar `{{ .ConfirmationURL }}` (respeta `emailRedirectTo`).
   - Variables de las edge functions: `PUBLIC_REGISTRATION_ENABLED` (`false` cuando ugccolombia.co ya enlace al registro canónico),
     `CLIENT_ONBOARDING_CLAIM_ENABLED` (vacío = cerrado), `ENABLE_LEGACY_ADMIN_TOOLS` (vacío = deshabilitadas), `SYNC_TO_KREOON_SECRET` (solo si se reactivara).
5. Aplicar los datos: `…120000` (UGC Colombia: nombre, inscripción abierta, rol por defecto, organización predeterminada) y `…150000` (color).
6. `npx supabase gen types typescript --project-id wjkbqcrxwsmvtxmqgiqc > src/integrations/supabase/types.ts` (las RPC nuevas hoy se llaman con *cast*).
7. Actualizar el formulario de **ugccolombia.co** para enlazar a `https://kreoon.com/registro/ugc-colombia`; después `PUBLIC_REGISTRATION_ENABLED=false`.
8. Recomendado: eliminar del proyecto las funciones heredadas (`supabase functions delete migrate-to-kreoon sync-to-kreoon kreoon-bootstrap sync-user-permissions bulk-password-reset`).

## Verificación posterior (SQL)

```sql
-- Seguridad: ninguna función de alta ejecutable por anon salvo las públicas de lectura
select proname from pg_proc p where pronamespace='public'::regnamespace
  and has_function_privilege('anon', p.oid, 'EXECUTE')
  and proname in ('approve_join_request','complete_creator_signup','register_user_to_organization','finish_creator_onboarding','save_creator_onboarding_progress');  -- 0 filas

-- Ya no existe la policy abierta, y las de gestión exigen admin
select policyname from pg_policies where tablename='organization_members' and policyname in ('System can insert members on registration','Admins can manage members'); -- 0 filas

-- Organización
select id, name, slug, is_registration_open, registration_require_invite, default_role, is_default_registration_org
from organizations;  -- 1 fila: UGC Colombia, true, false, content_creator, true

-- Un perfil NUEVO no nace público
select is_active, is_published from creator_profiles order by created_at desc limit 1;  -- false, false
```

## Checklist E2E manual (con cuentas reales, en rama/preview primero)

- [ ] `/registro/ugc-colombia` muestra «Únete a UGC Colombia como creador» y los 5 documentos con sus versiones.
- [ ] Correo: crear cuenta → correo → enlace → `/continuar` → `/bienvenida` → asistente → panel. Membresía `content_creator`, sin duplicados al reintentar.
- [ ] Abrir el enlace del correo en **otro dispositivo**: pide confirmación explícita (no se une solo).
- [ ] Enlace vencido/reusado: muestra "ya no es válido" y reenvía.
- [ ] Cuenta existente: "Ya tienes una cuenta", sin duplicar.
- [ ] Google (si está habilitado): mismo resultado; usuario existente sin membresía recibe confirmación.
- [ ] Slug inexistente / org cerrada: estado claro, **no** se crea cuenta ni se usa otra organización.
- [ ] Regresión de roles: admin, creador, editor, cliente y estudiante existentes inician sesión y llegan a su espacio habitual.
- [ ] `/register?role=admin&intent=brand&utm_source=x` → `/registro/ugc-colombia?utm_source=x` (sin `role`/`intent`).
- [ ] `/unete/marcas`, `/unete/organizaciones`, `/marca-referida`: sin formulario.
- [ ] Aislamiento A/B: con dos usuarios de organizaciones distintas (requiere una 2.ª organización de prueba en la rama): ningún acceso cruzado a `organization_members`, Storage privado ni RPC.
- [ ] Móvil (390 px) y escritorio: formulario, errores, verificación y onboarding legibles; teclado completo; contraste (`npm run check:contrast`).
