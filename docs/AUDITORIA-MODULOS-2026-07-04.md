# Auditoría End-to-End KREOON — 2026-07-04

Alcance: auditoría completa de la plataforma. Fase 1 = 4 módulos núcleo (**Financiero, Talento, Clientes, Board/Canvas**). Fase 2 = resto end-to-end (**Auth/Onboarding, Marketplace, Academia, Chat/Realtime/Streaming, IA/Edge Functions, Integraciones/Webhooks/Gamificación**). Complementa las auditorías 2026-06-10 (plataforma y nómina) sin repetirlas.

Cada ítem: severidad · `archivo:línea` · problema · fix propuesto · checkbox de ejecución.
Leyenda: 🔴 Crítico (seguridad/dinero en prod) · 🟠 Bug funcional · 🟡 Mejora.

---

## RESUMEN EJECUTIVO

El barrido end-to-end encontró **~30 críticos de seguridad ya en producción**, la mayoría del mismo patrón: **RPCs/edge functions SECURITY DEFINER o `verify_jwt=false` que confían en `organization_id`/`user_id`/precios enviados desde el cliente sin validar pertenencia ni pago**. Los de mayor impacto de negocio:

1. **Escalada a ADMIN** (§5) — cualquier usuario se auto-registra como admin de org (`active_role` escribible + `complete_onboarding` + `register_user_to_organization`). Compromiso total de un tenant.
2. **Paywall bypass Academia** (§7) — el cliente inserta su propio `academy_enrollment` y falsifica progreso/certificados; anula toda la capa de pago.
3. **Contratar creador por céntimos** (§6) — `stripe-creator-hire` confía en el `price` del body en modo directo.
4. **Webhook de hire 100% roto** (§6) — cobra pero nunca crea proyecto (columnas/enum inexistentes) y traga el error → pago sin entrega, sin reintento.
5. **Enumeración de clientes de cualquier org** (§0) — `get_unified_clients` sin validar membresía.
6. **`social-publish`/`restream-api`** (§8) — publicar/borrar posts y leer stream keys de otra org con sus tokens.
7. **Quema de tokens IA de cualquier org** (§9) — content-ai, up-ai-copilot, generate-script, intelligence-gatherer sin auth de membresía; `adn-continue` sobreescribe research ajeno.
8. **`bunny-raw-download/zip`** (§10) — leer cualquier archivo de la storage zone con un header `Authorization` cualquiera.
9. **Trust score y datos financieros del portal** (§10/§3) — falsificables/expuestos por RLS sin `WITH CHECK`.
10. **Wompi no envía `reference`** (§10) — pagos legítimos nunca reconcilian ni desbloquean el curso.

**Causa raíz repetida**: políticas RLS `FOR UPDATE/ALL` sin `WITH CHECK` ni whitelist de columnas, y funciones que no llaman a un helper común de validación de membresía. Recomendación estructural: crear `_shared/assertOrgMembership()` + auditar toda RLS `USING(true)`/sin `WITH CHECK`.

Conteo aproximado por severidad: **~30 🔴 · ~45 🟠 · ~35 🟡**.

---

## 0. TOP PRIORIDAD — CRÍTICOS TRANSVERSALES

- [ ] 🔴 **IDOR enumeración de clientes** — `get_unified_clients` (`supabase/migrations/00000000000000_baseline.sql:35788-35894`) es SECURITY DEFINER con `GRANT ... TO authenticated` y solo filtra `WHERE c.organization_id = p_org_id`; no valida que `auth.uid()` sea miembro de esa org. `useUnifiedClients.ts:9` pasa `orgId` desde el cliente. Cualquier autenticado enumera clientes/contactos (nombres, emails, teléfonos, notas, deal_value, pipeline) de cualquier org. **Fix**: verificar `EXISTS (SELECT 1 FROM organization_members WHERE organization_id = p_org_id AND user_id = auth.uid())` dentro de la función.
- [ ] 🔴 **Portal cliente edita columnas financieras** — RLS `Client users can update status of their content` (`baseline.sql:2297-2306`) es `FOR UPDATE ... USING(...)` sin `WITH CHECK` ni restricción de columnas. Un cliente puede modificar por API `creator_payment`, `price`, `editor_payment`, estado, etc. **Fix**: restringir a columna `status` (trigger o RPC controlada) + agregar `WITH CHECK`.
- [ ] 🔴 **Fuga cross-rol en board** — `get_org_content` (`baseline.sql:31135-31152`) recibe `p_role`/`p_user_id` del frontend (`useContent.ts:36-39`); con `p_role IS NULL` el filtro de rol se satisface y devuelve TODO el contenido de la org. **Fix**: derivar rol/uid de `auth.uid()` dentro de la RPC, ignorar params del cliente.
- [ ] 🔴 **Escalada vía `update_content_by_id`** — (`baseline.sql:24386-24421`) SECURITY DEFINER valida solo membresía de org, no propiedad de fila ni whitelist de campos; cualquier miembro edita cualquier `content` y cualquier clave del JSONB (`creator_id`, `creator_payment`…). **Fix**: validar propiedad/asignación según rol + whitelist de campos editables por rol.
- [ ] 🔴 **`send-invitation` sin control de rol** — (`supabase/functions/send-invitation/index.ts:32-53`, `verify_jwt=true`) el handler no valida rol/org del llamante; cualquier autenticado invita emails con `role:"admin"` y `client_id` arbitrario usando service-role. **Fix**: replicar patrón de `send-recruitment/index.ts:33-54` (validar `auth.getUser` + rol admin + pertenencia a la org).
- [ ] 🔴 **`content_comments` abierto a todas las orgs** — (`baseline.sql:250-251`) política `USING(true)`; cualquier autenticado lee todos los comentarios de todo el contenido. **Fix**: reescribir política uniendo a `content` + membresía/cliente propietario.

---

## 1. MÓDULO FINANCIERO

### Archivos clave
`src/pages/crm/org/OrgCRMFinances.tsx` (5 tabs), `src/services/finance/financeService.ts` (1097 líneas), `src/hooks/useFinance.ts`, `useFinanceOverview.ts`, `useTalentPayments.ts` (919), `src/components/talent/TalentPayrollView.tsx` (1529), `TalentPaymentsTab.tsx` (1259). RPCs en `20260520300000_finance_overview_talent_always_cop.sql`, `20260610150000_payroll_safety_and_biweekly.sql`, `20260516100000_client_package_payments.sql`.

### Seguridad
- [ ] 🔴 **RPCs de overview sin check de rol** — `get_org_finance_overview` (`20260520300000:50-53`), `get_org_payroll_overview` (`...170000:178-181`), `get_org_costs_overview` (`:249-252`), `fn_package_profitability` (`20260520000000:333-336`) solo verifican pertenencia, no rol admin. Editor/community_manager leen ingresos, costos, márgenes y totales de nómina. **Fix**: exigir rol admin (o allowlist financiera) dentro de cada RPC.
- [ ] 🔴 **RLS de `talent_payments` saltada por RPC** — el SELECT directo está restringido (`20260515190000:46-56`) a `user_id=auth.uid()`/admin, pero `get_org_payroll_overview` expone agregados de nómina a cualquier miembro. **Fix**: mismo check de rol del punto anterior.
- [ ] 🟠 **`client_package_payments` SELECT abierto a la org** — (`20260516100000:36-43`) cualquier miembro ve todos los abonos/ingresos de clientes (INSERT sí restringido a admin/digital_strategist). **Fix**: restringir SELECT a admin/digital_strategist.
- [ ] 🟠 **Sin UNIQUE anti-duplicado en `talent_payments`** — los 5 mecanismos deduplican con SELECT-then-INSERT (TOCTOU); trigger+cron o cron+manual concurrentes pueden duplicar pagos. **Fix**: índice único parcial `(organization_id,user_id,role,content_id) WHERE content_id IS NOT NULL`.

### Bugs
- [ ] 🟠 **AbonoDialog viola CHECK de método de pago** — `AbonoDialog.tsx:72` envía `'Transferencia'/'Nequi'/'PayPal'` capitalizado; el CHECK (`20260516100000:13`) exige minúsculas → toda inserción falla. **Fix**: normalizar a lowercase (o ampliar el CHECK).
- [ ] 🟠 **`recalculate_package_payment_status` mezcla monedas** — (`20260516100000:82-84`) `SUM(amount)` sin filtrar `currency`; abono en moneda distinta corrompe `paid_amount`. **Fix**: sumar por moneda del paquete o forzar misma moneda.
- [ ] 🟠 **Trigger de recálculo no cubre UPDATE** — (`20260516100000:102-104`) `AFTER INSERT OR DELETE`; editar un abono no recalcula estado. **Fix**: agregar `OR UPDATE`.
- [ ] 🟠 **`usePaymentSummary` mezcla COP+USD** — (`useTalentPayments.ts:150-163`) suma `amount` sin separar `currency`. **Fix**: agrupar por moneda.
- [ ] 🟠 **Pago manual evade candado anti-doble-pago** — `useCreatePayment` (`useTalentPayments.ts:166-197`) no setea `role`, cae en `'legacy'`; el guard (`20260610150000:233-237`) no bloquea `legacy` vs `creator/editor`. **Fix**: setear `role` correcto en el insert manual.
- [ ] 🟠 **Nómina mensual con moneda hardcodeada** — `fn_monthly_talent_payroll` inserta `currency='COP'` fijo (`20260515180000:66`) ignorando `*_payment_currency` (la quincenal sí lo corrige). **Fix**: leer la moneda por contenido/creador.
- [ ] 🟠 **`auto_talent_payment_on_paid` no dispara con NULL** — (`20260610150000:288-289`) `OLD.creator_paid=FALSE`; si es NULL la condición es NULL y no paga. **Fix**: usar `IS DISTINCT FROM`.
- [ ] 🟠 **Idempotencia de nómina mensual demasiado amplia** — (`20260515220000:70-75`) `CONTINUE WHEN EXISTS(status='pending')` salta al usuario por cualquier pending previo, dejando contenido nuevo sin liquidar. **Fix**: ligar el check al período.
- [ ] 🟠 **`useDeletePayment` invalida solo una query** — (`useTalentPayments.ts:230-247`) no invalida payroll-summary/overdue/closures/overview → agregados stale. **Fix**: invalidar el set completo.
- [ ] 🟠 **AbonoDialog permite sobrepago y no audita** — (`AbonoDialog.tsx:58-90`) no valida contra `pendingAmount` ni envía `recorded_by`. **Fix**: validar tope + registrar `recorded_by`.
- [ ] 🟡 **`fn_monthly_talent_payroll_all` procesa orgs borradas** — (`20260515180000:165`) no filtra `deleted_at IS NULL`. **Fix**: agregar filtro.

### Mejoras
- [ ] 🟡 Dividir `TalentPayrollView.tsx` (1529), `TalentPaymentsTab.tsx` (1259), `financeService.ts` (1097), `useTalentPayments.ts` (919) por dominio.
- [ ] 🟡 Unificar cálculo de `total_sold/collected/pending` — hoy en 3 fuentes (`getAgencyPackageStats:434`, `getClientPackagesRevenue:474`, RPC overview) que pueden divergir.
- [ ] 🟡 N+1 / sin paginación en `useContentFinancialSummary` (`useTalentPayments.ts:322-380`) y `getActiveClientPackages`. **Fix**: vista/RPC agregada + `.limit()`.
- [ ] 🟡 `staleTime:0 + refetchOnMount` en todos los `useFinanceOverview` + realtime que invalida ~9 queries/evento. **Fix**: staleTime corto.
- [ ] 🟡 `OrgCRMFinances.tsx:56-60` usa `useMemo` con efecto secundario (`setCurrency`); mover a `useEffect`.

---

## 2. MÓDULO TALENTO

### Archivos clave
`src/pages/Creators.tsx`, `src/components/talent/CreatorsContent.tsx`, `UnifiedTalentCard.tsx`, `TalentWalletView.tsx` (1345), `src/components/team/{TalentCard,CreatorDetailDialog}.tsx`. Hooks `useTalentPayments.ts`, `useCreatorProfile.ts`, `useCreatorServices.ts`.

### Seguridad
- [ ] 🟠 **Posible IDOR de cobros** — `usePaymentContentItems` (`TalentWalletView.tsx:145-149`) filtra `.or(creator_id.eq...,editor_id.eq...)` con `userId`/`organizationId` por props; depende de RLS. **Fix**: verificar que ningún caller permita pasar `userId`/`organizationId` ajeno; endurecer RLS de `content` (relacionado con crítico de board).

### Bugs
- [ ] 🟠 **Rol legacy oculta creadores** — `CreatorsContent.tsx:83` filtra `['creator','editor','strategist']` mientras el resto usa `content_creator`. **Fix**: usar roles canónicos de `src/lib/roles.ts`.
- [ ] 🟠 **Talento zombie desaparece de stats** — `CreatorsContent.tsx:231-271` itera solo `profiles`; un `member` con perfil borrado se cae de lista y conteos. **Fix**: partir de `organization_member_roles`.
- [ ] 🟠 **Estrategas sin contar** — `CreatorsContent.tsx:232` castea rol, tabs (:392) excluyen `strategist`, no entran en `stats` (:403). **Fix**: incluir en conteos.
- [ ] 🟠 **`toggleAmbassador` sin transacción** — `CreatorsContent.tsx:285-365` hace 4-5 escrituras secuenciales; fallo parcial deja DB inconsistente. **Fix**: RPC transaccional.
- [ ] 🟠 **Race en generación de PDF de wallet** — `TalentWalletView.tsx:185-202` `useEffect` depende de `contentItems` stale → recibo incorrecto/vacío. **Fix**: gatear generación al refetch confirmado.
- [ ] 🟡 **`window.confirm` para borrar método de cobro** — `TalentWalletView.tsx:763`; usar `AlertDialog`.
- [ ] 🟡 **Botón "Nuevo Creador" decorativo** — `Creators.tsx:19` sin `onClick`.

### Mejoras
- [ ] 🟡 N+1 grave: `CreatorsContent.tsx:104-229` ~10 queries secuenciales a `content`. **Fix**: vista/RPC agregada.
- [ ] 🟡 Extraer `PaymentAccountsManager`/wizard de `TalentWalletView.tsx` (1345 líneas).
- [ ] 🟡 `CreatorsContent.tsx:458-496` — 4 `TabsContent` con `TalentGrid` idénticos; deduplicar.

---

## 3. MÓDULO CLIENTES

### Archivos clave
`src/pages/Clients.tsx`, `ClientDashboard.tsx` (1862 líneas, portal cliente), `ClientContentBoard.tsx`, `src/components/clients/{ClientsContent,ClientBillingTab,ClientDetailDialog,ClientPackageDialog}.tsx`, `src/components/client-dashboard/{ClientInvoicesTab,ClientDashboardOverview}.tsx`. Hooks `useUnifiedClients.ts`, `useClientBilling.ts`, `useClientPaymentStatus.ts`.

### Seguridad
> Crítico #1 (`get_unified_clients`) y #2 (UPDATE de content por cliente) están en la sección 0.
- [ ] 🔴 **Fuga de márgenes/pagos en el portal** — `ClientDashboard.tsx:392-396` hace `from('content').select('*')`; la RLS es a nivel de fila, así que el cliente recibe por red `creator_payment`, `editor_payment`, `billing_price`, costos, `notes`. **Fix**: seleccionar solo columnas seguras (o vista `v_client_content`).
- [ ] 🟠 **Facturación desincronizada por modelo dual** — `20260527000000_client_document_access.sql:8-42` filtra por `clients.user_id=auth.uid()` (legacy) pero el portal vincula por `client_users` (M2M); clientes vía `client_users` no ven cierres/facturas. **Fix**: unificar políticas a `client_users`.
- [ ] 🟠 **`selectedClientId` desde localStorage sin re-validar** — `ClientDashboard.tsx:234-256` fija el cliente desde `localStorage`/evento sin comprobar pertenencia. **Fix**: validar contra `client_users` al setear.

### Bugs
- [ ] 🟠 **Conteo de contenido sin filtro de org** — `ClientsContent.tsx:216-218` `from('content').select('client_id,status')` sin `organization_id`; over-fetch y cuenta cross-org en platform-root. **Fix**: filtrar por org.
- [ ] 🟠 **Saldo de cliente frágil** — `ClientDashboard.tsx:738-766` deriva `clientBalance` de `avgHooksPerVideo` × aprobados; saldos engañosos con paquetes mixtos. **Fix**: calcular desde `client_packages`/pagos reales.
- [ ] 🟡 **Dos motores de conteo y dos definiciones de "vencido"** — `ClientDashboard.tsx:392` vs `ClientsContent.tsx:216`; `useClientPaymentStatus.ts:56` vs `ClientBillingTab.tsx:410-419`. **Fix**: unificar en helper/RPC.
- [ ] 🟡 **Fallback legacy `clients.user_id`** — `ClientDashboard.tsx:311-321` convive con `client_users`. **Fix**: consolidar en `client_users`.

### Mejoras
- [ ] 🟡 Dividir `ClientDashboard.tsx` (1862 líneas) por tab.
- [ ] 🟡 N+1 en `fetchClientData` (`ClientDashboard.tsx:410-451`). **Fix**: vista.
- [ ] 🟡 Sin paginación en `ClientsContent`/`ClientDashboard`.
- [ ] 🟡 Replicar guard IDOR de `ClientBillingTab.tsx:378-385` en los demás fetches del portal.
- [ ] 🟡 Consolidar sistemas duplicados: `client_packages` + `fillmaker_services` + `client_closings`, y `creator_services` vs `PricingBlock`.

---

## 4. MÓDULO BOARD (CANVAS)

### Archivos clave
`src/pages/ContentBoard.tsx` (1311 líneas), `ClientContentBoard.tsx`, `OrgContentShowcase.tsx`, `src/components/board/*`. Hooks `useContent.ts`, `realtime/useRealtimeContent.ts`, `useBoardSettings.ts`. Edge `board-ai`, `content-ai`. Auto-aprobación `20260513140000_auto_approve_stale_content.sql`.

### Seguridad
> Críticos #3 (`get_org_content`) y #4 (`update_content_by_id`) están en la sección 0.
- [ ] 🔴 **`board-ai` sin auth ni check de membresía** — `config.toml:188` `verify_jwt=false`; `board-ai/index.ts:791-841` usa service-role, auth opcional (`userId="system"` si falla) y toma `organizationId` del body sin validar. Cualquiera pide `analyze_board` de otra org y recibe títulos, estados, asignaciones, cliente y datos de producto. **Fix**: `verify_jwt=true` + validar membresía.
- [ ] 🟠 **`content-ai` toma `organizationId` del body** — `config.toml:134` `verify_jwt=false` (`content-ai/index.ts:29-31`). **Fix**: validar membresía antes de generar/gastar tokens.
- [ ] 🟠 **RLS de `content` sin `organization_id`** — (`baseline.sql:227-237`) policies de creator/editor usan solo `*_id=auth.uid()`; el aislamiento depende de las RPC (evadibles). **Fix**: añadir filtro de org en las policies.

### Bugs
- [ ] 🟠 **Realtime ignora filtros de la query** — `useRealtimeContent.ts:140-149` filtra solo por `organization_id`; en `useContentWithFilters` agrega cualquier fila de la org (items fantasma). **Fix**: aplicar los mismos filtros al handler.
- [ ] 🟠 **Doble suscripción con canal homónimo** — `useContent.ts:167` y `:376` crean `content-realtime-${org}` → doble aplicación/duplicación. **Fix**: nombrar canales por hook/filtro.
- [ ] 🟠 **Filtros locales no re-sincronizan al cambiar de org** — `ContentBoard.tsx:203-215` inicializan estado solo en mount. **Fix**: re-inicializar al cambiar org.
- [ ] 🟠 **Auto-aprobación ignora estados custom** — `20260513140000:32-35` filtra `status='delivered'` (enum legacy), no `custom_status_id`; hace UPDATE directo saltando `updateContentStatusWithUP` (pagos/puntos) y deja `approved_by=NULL`. **Fix**: contemplar estados custom + flujo con puntos/pagos.
- [ ] 🟡 **DnD sin persistir orden** — `ContentBoard.tsx:582-652` usa HTML5 DnD (no `@dnd-kit` instalado); orden no se guarda. **Fix**: migrar a `@dnd-kit` + persistir.
- [ ] 🟡 **Filtro de fecha usa `created_at`** aunque la UI sugiere deadline — `ContentBoard.tsx:547-552`. **Fix**: filtrar por el campo correcto.
- [ ] 🟡 **`console.log` de realtime en prod** — `useRealtimeContent.ts:67-72,151-163`.

### Mejoras
- [ ] 🟡 Descomponer `ContentBoard.tsx` (1311): extraer `canMoveToStatus*` (:73-170), columna kanban y handlers.
- [ ] 🟡 Memoizar `EnhancedContentCard` y sacar `dropTarget`/`draggingContent` del padre (`ContentBoard.tsx:292-293`).
- [ ] 🟡 Virtualización (`@tanstack/virtual`) en columnas con muchas cards.
- [ ] 🟡 Paginación real: `get_org_content LIMIT 500` fijo (`useContent.ts:11,40`) trunca orgs grandes.
- [ ] 🟡 Deduplicar `useContent` vs `useContentWithFilters`.

---

<!-- FASE 2: secciones 5-10 se agregan al completar los agentes de exploración -->

## 5. AUTH · ONBOARDING · ROLES · IMPERSONATION

### Archivos clave
`src/hooks/useAuth.tsx` (AuthProvider, resolución de roles, `isPlatformAdmin`), `src/contexts/ImpersonationContext.tsx`, `src/components/ProtectedRoute.tsx` (guards de ruta), `src/hooks/useRoles.ts`, `src/lib/roles.ts` (8 roles, `LEGACY_TO_BASE_ROLE`), `src/components/registration-v2/useRegistrationSubmitV2.ts`, `supabase/functions/admin-users/index.ts` (bien protegida). Migraciones: `20260518140000_complete_autonomous_registration.sql` (`complete_onboarding` v4), `baseline.sql` (`register_user_to_organization:16750`, RLS `profiles:196-204`, `user_roles:206-211`, `organization_member_roles:5300-5342`).

### Seguridad
- [ ] 🔴 **CADENA DE ESCALADA A ADMIN (la más grave)** — la policy `Users can update own profile` (`baseline.sql:200`) es `FOR UPDATE USING(id=auth.uid())` **sin `WITH CHECK` ni restricción de columnas** → el usuario escribe cualquier columna de su perfil, incluido `active_role='admin'`. `complete_onboarding` (`20260518140000:60,85,98`) lee ese `active_role` y lo pasa a `register_user_to_organization` (`baseline.sql:16759,16778`), que es SECURITY DEFINER con `SET row_security=off` e inserta el rol directo en `organization_member_roles`. Resultado: un talento auto-registrado queda como **admin de la org**, y `ProtectedRoute.tsx:224-228` lo trata como plena confianza. **Fix**: `WITH CHECK` + trigger que impida al usuario cambiar `active_role`/`email`/`is_superadmin`; `complete_onboarding` debe forzar el rol según `user_type`, nunca confiar en `active_role` del perfil.
- [ ] 🔴 **`complete_onboarding(p_user_id)` sin validar `auth.uid()`** — (`20260518140000:13-27`, GRANT authenticated :112) acepta cualquier `p_user_id`; cualquier autenticado completa onboarding y fuerza registro-en-org de terceros. Contrasta con `get_pending_consents` ya endurecida (`20260610120000:298-303`). **Fix**: guardia `auth.uid()=p_user_id`.
- [ ] 🟠 **Impersonation 100% frontend sobre campo escribible** — `ImpersonationContext.tsx:7,78` `isRootAdmin = profile?.email === 'jacsolucionesgraficas@gmail.com'` (hardcode, solo JS); `effectiveRoles`/`effectiveUserId` son cosméticos, la sesión Supabase sigue siendo la del admin → RLS evalúa como admin, `isReadOnlyMode=false`. Estado en `sessionStorage` en claro. **Fix**: validar rol root en backend; usar sesión/token del suplantado o RPCs con contexto.
- [ ] 🟠 **`isPlatformAdmin` cliente confía en `profiles.email`** — `useAuth.tsx:318-321,345,578-580` activa `detectedPlatformAdmin` si el email está en `ROOT_EMAILS`; como la policy de perfil no restringe columnas (ver primer punto), el gate admin de UI es forzable. Backend `admin-users` sí usa email del JWT (seguro). **Fix**: derivar admin de rol en BD, no de email de perfil.
- [ ] 🟠 **Guards de ruta solo en cliente** — todo `ProtectedRoute.tsx` (student guard, accountType) filtra rutas en cliente; un `student` puede llamar `supabase.from(...)` directo y su único límite real es RLS. **Fix**: no depender del guard para aislamiento; asegurar RLS en toda tabla alcanzable.
- [ ] 🟡 **Tokens/rol en localStorage** — sesión Supabase + `activeRole` (`useAuth.tsx:60`) expuestos a XSS. (Registro express de student sin consentimientos: confirmado por diseño, OK.)
- ✅ `organization_member_roles` NO tiene policy always-true (self-insert de rol admin solo funciona vía la cadena SECURITY DEFINER de arriba, no por RLS abierta); `admin-users` bien protegida.

### Bugs
- [ ] 🟠 **Rol `student` nunca persiste (RLS bloquea)** — `useRegistrationSubmitV2.ts:351-354` inserta en `user_roles` sin sesión admin; RLS lo rechaza (`baseline.sql:206-211`) y no se verifica el error → el student queda como "talent sin keys" (`ProtectedRoute.tsx:292-312`). **Fix**: RPC SECURITY DEFINER que registre el rol student validando identidad.
- [ ] 🟠 **`routeRequiresOrg` indefinida** — `ProtectedRoute.tsx:204` usa una variable no declarada (la prop es `requiresOrg` :83) → `ReferenceError` para platform-root sin org. **Fix**: usar el nombre correcto.
- [ ] 🟠 **`getDashboardPath` llamada con 3 args, acepta 2** — `ProtectedRoute.tsx:387` pasa `(roles, activeRole, isBrandMember)` pero la firma es `(roles, activeRole?)` (:54); el tercer arg se ignora → redirección de dashboard incorrecta. **Fix**: ajustar firma/llamada.
- [ ] 🟠 **`student` omitido en prioridades de rol** — `useAuth.tsx:118-131` y `ProtectedRoute.tsx:61-68` no incluyen `student` (sí está en `FUNCTIONAL_ROLES`, `roles.ts:375-379`); un solo-student cae a `roles[0]` y no resuelve dashboard. **Fix**: incluir student en la prioridad.
- [ ] 🟠 **`getBaseRole` degrada silenciosamente a `content_creator`** — `roles.ts:261-266` mapea cualquier rol nulo/desconocido a `content_creator`, ocultando roles mal escritos. **Fix**: log/none en vez de default silencioso.
- [ ] 🟠 **Fallback a `organization_members.role` (DEFAULT 'creator')** — `useAuth.tsx:438-499` da `creator` fantasma a miembros no-owner sin rol canónico. **Fix**: no inferir rol del default legacy.
- [ ] 🟡 **Refetch en cada refresh de token/foco** — `useAuth.tsx:205-218` programa `fetchUserData(...,true)` en cada `onAuthStateChange`. **Fix**: gatear a cambios reales de usuario.

### Mejoras
- [ ] 🟡 Memoizar `value` de `AuthContext.Provider` (`useAuth.tsx:758-788`) e `ImpersonationContext` (`:204-216`) con `useMemo`.
- [ ] 🟡 Deduplicar helpers de roles: `getPrimaryRole`/`getUserType`/`getPermissionGroup` viven divergentes en `lib/roles.ts`, `useRoles.ts`, `useAuth.tsx`, `lib/permissionGroups.ts` (`getPrimaryRole` da resultados distintos por orden de prioridad). Unificar en una fuente.
- [ ] 🟡 Mover escrituras sensibles (`user_roles`, rol en org) desde cliente a RPC SECURITY DEFINER validada.

## 6. MARKETPLACE

### Archivos clave
`supabase/functions/stripe-creator-hire/index.ts` (modo service seguro 102-146; modo directo inseguro 147-169), `supabase/functions/stripe-webhook/index.ts` (hire handler 1696-1768; campañas 1212-1331), `src/components/marketplace/profile/PricingSidebar.tsx`, `src/components/profile-builder/blocks/PricingBlock.tsx` (697 líneas). Tablas `marketplace_campaigns/campaign_applications/marketplace_projects` (`baseline.sql:21571-21803`), migración hire directo `20260519100000_marketplace_projects_direct_hire.sql`, pausa `20260527110000_talent_marketplace_pause.sql`.

### Seguridad
- [ ] 🔴 **Precio manipulable en hire directo (contratar por céntimos)** — `stripe-creator-hire/index.ts:147-169`: cuando no se envía `service_id`, confía ciegamente en `price`/`currency`/`title` del body (`PricingSidebar.tsx:69-77`, `PricingBlock.tsx:385-387`). NO valida contra ningún checkout intent. Un usuario invoca con `price:0.01` y contrata a cualquier creador por céntimos. **Fix**: forzar siempre `service_id` con precio leído de `creator_services` (modo service, ya seguro), o crear intent server-side `reference+amount` y validarlo.
- [ ] 🔴 **`get_marketplace_excluded_user_ids` expuesto a anon** — (`baseline.sql:24142-24156`) SECURITY DEFINER con GRANT a `anon`/`authenticated`; devuelve UUIDs de TODAS las cuentas cliente (`client_users` + members rol client). Cualquier anónimo enumera cuentas. **Fix**: revocar `anon`, devolver mínimo server-side.
- [ ] 🟠 **`campaign_applications` UPDATE sin `WITH CHECK`** — (`baseline.sql:22200-22212`) el creador aplicante puede UPDATE de su fila sin restricción de columnas → auto-fijar `status='approved'`, `brand_rating`, etc.; el trigger cuenta los "approved" (`baseline.sql:22039-22041`). Escalada de integridad. **Fix**: `WITH CHECK` + whitelist de columnas editables por el creador.
- [ ] 🟠 **Hire directo puede contratar creador pausado/inactivo** — (`20260527110000:7,263-266`) el filtro `marketplace_paused_until` solo se aplica en `get_unified_talent`, no en `stripe-creator-hire`; cobra igual. **Fix**: validar pausa/actividad antes del cobro.
- [ ] 🟡 **Fuga menor de notas internas del brand** — el creador ve `brand_notes`/`brand_rating` de su propia `campaign_application`. **Fix**: excluir columnas internas del SELECT del creador.
- ✅ Firma de webhook Stripe correcta (`stripe-webhook:61-73`), `stripe-creator-hire` `verify_jwt=true` + revalida JWT + bloquea auto-contratación, RLS de `marketplace_projects`/pagos/reviews bien scopeada.

### Bugs
- [ ] 🔴 **Contratación directa cobra pero NUNCA crea proyecto** — `stripe-webhook/index.ts:1729-1748`: el insert a `marketplace_projects` usa columnas inexistentes (`budget`, `delivery_days`, `revisions_included` — la tabla usa `total_price`) y `status:"confirmed"`, valor ausente del enum (`baseline.sql:21571-21573`). El insert lanza error → pago sin proyecto (100% de los hires directos). **Fix**: usar columnas/enum reales (`total_price`, status válido).
- [ ] 🔴 **Error del insert se traga (sin throw)** — `stripe-webhook/index.ts:1751-1753` hace `console.warn` sin `throw`; el webhook responde 200 a Stripe → fallo invisible y sin reintento. Contradice el patrón del propio archivo (`callAcademyRpc:37-55`). **Fix**: propagar throw para forzar 5xx/reintento.
- [ ] 🟠 **Hire directo sin idempotencia** — `handleCreatorHirePaymentCompleted` (`:1696-1748`) no verifica `stripe_session_id`/`payment_intent` previo (a diferencia de `handleOrgAccessPurchase:1004-1016`); reintento de Stripe duplicaría proyectos. **Fix**: guardar y verificar el session_id.
- [ ] 🟠 **Escrow prometido pero inexistente en hire directo** — el webhook fija `payment_status:"paid"` directo (`:1735`) y no crea `escrow_holds` (las campañas sí, `:1231-1247`), pero `PricingSidebar.tsx:239-257` promete "Escrow seguro / se libera al aprobar". **Fix**: crear escrow real o corregir el copy.
- [ ] 🟠 **Moneda/monto derivados del metadata del cliente** — `stripe-webhook:1737` usa `session.metadata` (originado en cliente) en vez de `session.amount_total`/`session.currency` reales. **Fix**: usar valores autoritativos de Stripe.

### Mejoras
- [ ] 🟡 Unificar 3 fuentes de deliverables: `creator_services.deliverables`, `PricingBlock` packages, `PricingSidebar CreatorPackage[]`; que PricingBlock/Sidebar referencien `service_id`.
- [ ] 🟡 Extraer los 4 layouts y `createHireHandler` de `PricingBlock.tsx` (697 líneas); hay lógica de hire casi duplicada con `PricingSidebar.tsx:52-86`.
- [ ] 🟡 `PricingBlock.tsx:31` `price:string` obliga a `parseFloat` en cada hire (riesgo NaN/locale). **Fix**: normalizar a número.
- [ ] 🟡 Dividir `stripe-webhook/index.ts` (~1770 líneas) por dominio para reducir superficie de error.

## 7. ACADEMIA v2
_(No repite hallazgos de la auditoría 2026-06-10: RLS faltante en academy_plans/level_tiers/badges, award_space_points, QA de editor/player.)_

### Archivos clave
Páginas `src/pages/academia/{AcademiaPlayerPage,AcademiaCoursePage,AcademiaCourseEditorPage}.tsx`. Hooks `useAcademyEnrollment.ts`, `useAcademyCourse.ts` (progreso), `useAcademyUnlock.ts`. Edge `academy-course-checkout`, `academy-hotmart-redirect`, `wompi-webhook`, `mercadopago-webhook`, `hotmart-webhook`. Migraciones `20260606095803_kreoon_academia_module.sql` (RLS base + certificados), `20260614000005_academy_unlock_rules.sql`, `20260614006100_academy_v2_checkout_intents.sql`, `20260612000013_academy_rls_hardening.sql`.

### Seguridad
- [ ] 🔴 **PAYWALL BYPASS TOTAL: enrollment auto-insertable** — `20260606095803_kreoon_academia_module.sql:631-634` política `enrollments_own` es `FOR ALL ... WITH CHECK(user_id=auth.uid())` sin validar curso gratis ni pago. Cualquier autenticado hace `academy_enrollments.insert({course_id:<pago>, user_id:self})` y accede gratis. Anula toda la capa checkout_intents/webhooks. **Fix (raíz)**: separar SELECT propio de INSERT/UPDATE; mover creación de enrollment a `service_role`/RPC SECURITY DEFINER con validación de pago.
- [ ] 🔴 **Progreso/certificado 100% client-trusted** — misma policy `FOR ALL`; `useAcademyCourse.ts:274-308` escribe `completion_pct` desde el cliente. Un alumno pone `completion_pct=100` → dispara XP `course_completed` y habilita `issue_academy_certificate` (GRANT authenticated, `...:583`) → certificado + 500 pts sin cursar. **Fix**: recalcular server-side (trigger), revocar INSERT/UPDATE de progreso al cliente.
- [ ] 🟠 **Reglas de desbloqueo solo cosméticas** — `20260612000013:76-88` (`lessons_read`) gatea solo por `_has_academy_access(space_id)`, no consulta `academy_unlock_rules` ni enrollment por-curso; `academy_evaluate_unlock` solo corre en frontend (`AcademiaPlayerPage.tsx:38`). Un alumno lee lecciones de cursos bloqueados vía PostgREST. **Fix**: gatear lecciones por unlock/enrollment en RLS.
- [ ] 🟠 **Regresión que borró el gate por enrollment** — `20260606120000_fix_academia_rls_circular.sql:23-30` reemplazó `lessons_read` (exigía `EXISTS academy_enrollments`) por solo `status='published'` para arreglar recursión; nunca se reinstauró el gate por-curso. **Fix**: reinstaurar gate por enrollment sin recursión.
- [ ] 🟠 **IDOR en `academy_evaluate_unlock`** — `20260614000005:75,80,264` acepta `p_user_id` con `COALESCE(p_user_id, auth.uid())` y GRANT authenticated; cualquiera evalúa desbloqueo de OTRO usuario (filtra nivel/XP/cursos/badges). **Fix**: forzar `auth.uid()`.
- [ ] 🟠 **Wompi/MP no limpian `revoked_at` al re-comprar** — `wompi-webhook:78-85`, `mercadopago-webhook:72-79` omiten `revoked_at:null` (hotmart sí lo hace :161); usuario reembolsado que vuelve a pagar queda revocado. **Fix**: setear `revoked_at:null` en el upsert.

### Bugs
- [ ] 🟠 **Checkout Hotmart roto por CHECK** — `academy-hotmart-redirect/index.ts:89-98` inserta intent con `gateway:'hotmart'` pero el CHECK es `IN('stripe','mercadopago','wompi')` (`20260614006100:31`) → INSERT viola constraint, flujo Hotmart falla 500. **Fix**: ampliar el CHECK.
- [ ] 🟠 **Drip content nunca se aplica** — el editor usa `drip_days_after_enroll` (`AcademiaCourseEditorPage.tsx:629,905`) pero el gating server-side lee `unlock_after_days` (`20260614000005:238`, `20260613000005:18`) — columna sin UI. El drip no bloquea nada. **Fix**: unificar la columna.
- [ ] 🟠 **Completitud de video ignora el quiz de fin** — `AcademiaPlayerPage.tsx:96-104,283-304` marca lección `completed` al terminar el video aunque `end_lesson_quiz_id` no se apruebe. **Fix**: exigir quiz aprobado.
- [ ] 🟠 **`amount_paid_usd` guarda 0 en no-USD** — `wompi-webhook:83`, `mercadopago-webhook:77` (`currency==='USD'? ... : 0`); todo pago COP/MXN registra 0, corrompe ingresos. **Fix**: convertir/guardar el monto real.
- [ ] 🟠 **`recalcEnrollmentCompletion` cuenta por `enrollment_id`** — `useAcademyCourse.ts:289-297` filtra por `enrollment_id` pero el progreso hace upsert `onConflict:'lesson_id,user_id'` (:259); tras reinscripción el % se subestima. **Fix**: contar por `(lesson_id,user_id)`.

### Mejoras
- [ ] 🟡 N+1 en cada tick de video (`useAcademyCourse.ts:266,274-308`): 3 queries + UPDATE por evento `in_progress`. **Fix**: trigger SQL + throttle.
- [ ] 🟡 Componentes gigantes: `AcademiaCourseEditorPage.tsx` (1120), `AcademiaSpaceHomePage.tsx` (795), `AcademiaManagePage.tsx` (639).
- [ ] 🟡 `20260613000016_grant_service_role_academy_tables.sql:27-33` hace GRANT ALL a todo el schema `public` (no solo `academy_*`); reducir superficie.

## 8. CHAT · REALTIME · SOCIAL HUB · STREAMING

### Archivos clave
`src/hooks/useStreamingChat.ts`, `src/hooks/useLiveViewer.ts` (3 canales realtime), `src/hooks/usePresence.ts`, `src/hooks/academy/useAcademyDM.ts` (patrón correcto de referencia). Edge: `restream-api/index.ts`, `social-publish/index.ts` (3031 líneas), `streaming-webhook{,-v2}/index.ts`, `cloudflare-live-webhook/index.ts`. RLS `baseline.sql:47798-47927` (streaming v2), `:53267-53346` (live streams/viewers/reactions). Config `config.toml:218,221,450,585,598`.

### Seguridad
- [ ] 🔴 **`social-publish` IDOR: publicar/borrar posts de otra org** — (`social-publish/index.ts:2443-2454,2961-2976`) valida que exista JWT (cualquier usuario) pero carga `scheduled_posts` por `post_id` con service-role sin comprobar `post.user_id`/`organization_id` contra el llamante. Cualquier autenticado publica a redes o borra posts de otra org usando sus tokens sociales. **Fix**: validar propiedad del post antes de publicar/borrar.
- [ ] 🔴 **`restream-api` IDOR: stream key de cualquier org** — (`restream-api/index.ts:100-116,153-172,300-309`) `verify_jwt=true` solo garantiza JWT; cada acción toma `organization_id` del body sin verificar membresía. `get_stream_key` expone la key de cualquier org; `disconnect` borra tokens OAuth ajenos. **Fix**: validar membresía del `organization_id`.
- [ ] 🔴 **Chat de streaming RLS `USING(true)`/`WITH CHECK(true)`** — (`baseline.sql:47901-47907`) cualquier autenticado lee TODOS los mensajes de todas las sesiones/orgs e inserta en cualquier `session_id` sin exigir `user_id=auth.uid()` (suplanta `author_name`/`is_host`). Agravado por `useStreamingChat.ts:135-140` que fija `is_host:true` hardcodeado. **Fix**: RLS por sesión/propiedad + validar identidad.
- [ ] 🔴 **`live_stream_viewers` UPDATE always-true** — (`baseline.sql:53296-53298`) `USING(session_id = session_id)` (tautología); cualquiera actualiza cualquier fila de viewers y corrompe métricas. **Fix**: comparar contra `auth.uid()`.
- [ ] 🔴 **Webhooks de streaming sin validar firma** — `streaming-webhook-v2` (`index.ts:23-47`, `verify_jwt=false`) no valida ningún secreto → cualquiera inyecta `viewer_update`/`purchase`/`chat_message`/`stream_ended`. `cloudflare-live-webhook:28` declara `CLOUDFLARE_WEBHOOK_SECRET` y header `cf-webhook-auth` pero **nunca los comprueba**. `streaming-webhook` v1 (`:32`) es fail-open (si falta la env, omite validación). **Fix**: validar HMAC/secreto en las 3; fail-closed.
- [ ] 🟠 **Tokens OAuth guardados en claro** — `restream-api/index.ts:81-84,339-343` guarda `access_token_encrypted: tokens.access_token` sin cifrar. **Fix**: cifrar (Vault/pgcrypto) o renombrar y proteger.
- [ ] 🟡 **`live_stream_reactions` SELECT `USING(true)`** — (`baseline.sql:53344-53346`) expone toda reacción. **Fix**: scopear por stream.
- ✅ Comentarios live (`baseline.sql:53314-53322`) sí validan `user_id=auth.uid()`; hooks realtime desuscriben bien (`removeChannel`); `useAcademyDM` usa `useId()` (buen patrón). Nota: `bunny-chat-upload` y `cleanup-chat-attachments` citados en CLAUDE.md **no existen** en `supabase/functions/`.

### Bugs
- [ ] 🟠 **Presencia nunca se marca offline** — `usePresence.ts:94-102` sin handler `beforeunload`/`visibilitychange` ni update `is_online:false`; usuarios quedan "en línea" indefinidamente. **Fix**: marcar offline al salir.
- [ ] 🟠 **`streaming-webhook-v2` contador roto** — (`index.ts:355-360`) asigna `total_messages: supabase.rpc(...)` (el builder) al UPDATE en vez de invocar la RPC. **Fix**: await de la RPC.
- [ ] 🟠 **N+1 + duplicado en comentarios live** — `useLiveViewer.ts:130-148` hace `select` a `profiles` por cada INSERT realtime; `loadComments` (:88-114) no deduplica por `id` → comentario propio duplicado. **Fix**: join + dedup por id.
- [ ] 🟡 **Reacciones: cooldown solo cliente** — `LiveReactions.tsx:80-84` / `useLiveViewer.ts:318-334` sin control server-side → flood trivial. **Fix**: rate-limit server-side.

### Mejoras
- [ ] 🟡 Dividir `social-publish/index.ts` (3031 líneas) por plataforma en `_shared`.
- [ ] 🟡 Consolidar los 3 canales realtime de `useLiveViewer` (`:117-220`) en uno multi-tabla.
- [ ] 🟡 Componentes grandes: `SocialFeedCard.tsx` (447), `streaming-chat-aggregator` (485), `UnifiedChatPanel.tsx` (368), `StreamingStudioPage.tsx` (346).
- [ ] 🟡 `clearChat` (`useStreamingChat.ts:212-227`) UPDATE masivo sin batching → RPC/soft-flag por sesión.
- [ ] 🟡 Virtualizar `LiveChat` (`:35-39`) — sin virtualización con 100+ mensajes.

## 9. IA · EDGE FUNCTIONS · MCP
_(No repite 2026-06-10: rate limiting IA, mcp_validate_api_key metadata, secretos en .env, kreoon-sql/admin-users.)_

### Archivos clave
`supabase/config.toml` (matriz verify_jwt). Helpers `_shared/{ai-providers,ai-token-guard,get-module-ai-config}.ts`. Funciones `content-ai/index.ts` (1400), `board-ai` (886), `up-ai-copilot` (1007), `generate-script` (404), `portfolio-ai` (147), `intelligence-gatherer`, `adn-orchestrator`/`adn-continue` (worker real), `api/index.ts` (542, API pública). MCP: `mcp-key-manager/index.ts` + RPC `mcp_validate_api_key` (el server de 35 tools está fuera del repo).

### Seguridad
**Patrón sistémico**: funciones IA `verify_jwt=false` que toman `organizationId`/`userId` del body con service_role sin validar membresía → quema de tokens ajenos y fuga cross-org. Ninguna comparte helper de validación.
- [ ] 🔴 **`adn-continue` IDOR destructivo** — (`adn-continue/index.ts:437-462`, default verify_jwt=true pero sin check de propiedad sobre `product_id`) cualquier autenticado dispara research y **sobreescribe `products.full_research_v3`** de cualquier producto + quema IA. **Fix**: validar propiedad/membresía del producto.
- [ ] 🔴 **`content-ai` quema tokens de cualquier org** — (`content-ai/index.ts:552,593`, `config.toml:134`) toma `organizationId` del body y deduce tokens sin `getUser` ni membresía; peor: si la org no tiene fila en `organization_ai_tokens`, `ai-token-guard.ts:77-83` retorna `allowed:true` (IA ilimitada gratis). **Fix**: validar membresía + fila de tokens obligatoria.
- [ ] 🔴 **`up-ai-copilot` cero auth** — (`up-ai-copilot/index.ts:87-91`, `config.toml:194`) service_role + `orgId=body.organizationId` sin token guard; acciones costosas (`quality_score`, `anti_fraud`) invocables por cualquiera contra cualquier org. **Fix**: auth + membresía + token guard.
- [ ] 🔴 **`generate-script` IA gratis facturable a org ajena** — (`generate-script/index.ts:237,256`, `config.toml:149`) `organizationId` del body sin `getUser`, sin membresía, sin token guard. **Fix**: igual patrón.
- [ ] 🔴 **`portfolio-ai` prompt injection / proxy LLM gratis** — (`portfolio-ai/index.ts:89-91`) acepta `prompts.system`/`prompts.user` crudos del body y los manda al LLM; `organizationId`/`userId` solo para logging. **Fix**: no aceptar prompts crudos; construir server-side + auth.
- [ ] 🔴 **`intelligence-gatherer` endpoint costoso anónimo** — (`intelligence-gatherer/index.ts:489-496`, `config.toml:680`) `Deno.serve` sin auth; quema Perplexity y escribe inteligencia para `organization_id` arbitrario. **Fix**: auth + membresía.
- [ ] 🔴 **API pública: IDOR residuales** — `api/index.ts`: `/content` GET (`:254-278`) devuelve contenido de TODAS las orgs; `/content/:id` GET+PATCH (`:322-377`) opera sobre cualquier id sin validar org; `/clients` POST (`:404-412`) inserta body crudo con `organization_id` arbitrario; `/webhooks/content-status` (`:509-525`) cambia status de cualquier `content_id`; `/content` POST (`:280-311`) solo valida ownership si viene `client_id`. **Fix**: scopear por org en todos (los `/clients` y `/creators` ya se arreglaron; faltan estos).
- [ ] 🟠 **`board-ai` auth opcional silenciosa** — (`board-ai/index.ts:792-811`) "silently continue with system user" si el token es inválido; `organizationId` del body sin validar. **Fix**: `verify_jwt=true` + membresía.
- [ ] 🟠 **`streaming-ai` / `suggest-role` queman tokens de otra org** — `streaming-ai` (`:39,52,70`, verify_jwt=true) autentica pero no valida que el user pertenezca al `organization_id` de params; `suggest-role` (`:13-23`) sin auth. **Fix**: membresía.
- [ ] 🟠 **`api_key_encrypted` en claro** — `get-module-ai-config.ts:150-151,244` usa/retorna `organization_ai_providers.api_key_encrypted` como texto plano pese al nombre. **Fix**: cifrar (Vault) + nunca retornar en config.

### Bugs
- [ ] 🟠 **Gemini sin thinkingBudget en el path compartido** — `_shared/ai-providers.ts:33-48` no envía `thinkingConfig:{thinkingBudget:0}`; con `max_tokens:16384` Gemini 2.5 gasta el presupuesto en "thinking" y trunca el JSON (afecta content-ai/board-ai/portfolio-ai/campaign-wizard-ai/talent-ai). `finance-ai:72` y `generate-full-research:1223` sí lo aplican. **Fix**: aplicar en el helper compartido.
- [ ] 🟠 **JSON mode roto en fallback a Anthropic** — `callAIWithFallback` reenvía `tools` a proveedores que los ignoran (anthropic/perplexity); si Anthropic es preferido, la respuesta vuelve como texto libre y el parseo de board-ai falla (`ai-providers.ts:92-98`, `board-ai:284,479`). **Fix**: filtrar cadena a proveedores tool-capable o usar `response_format`.
- [ ] 🟠 **ADN orchestrator desconectado del worker** — `adn-orchestrator/index.ts:183,556` invoca `adn-research-v3` que **no existe** (solo declarada en `config.toml:675`); el worker real es `adn-continue`. La cadena de 22 pasos nunca corre desde el orchestrator. **Fix**: apuntar al worker correcto.
- [ ] 🟠 **ADN mismatch de campo competidores** — orchestrator envía `competitor_links` (`:524`), intelligence-gatherer lee `competitor_urls` (`:34,519`) → análisis siempre recibe `[]`. **Fix**: unificar nombre.
- [ ] 🟠 **`adn-continue` excede wall-clock** — (`:296-382`) ejecuta ~20 pasos secuenciales (×50s + 1500ms) en una invocación → `completed_with_errors` o muerto a mitad. **Fix**: chunk por invocación / cola.

### Mejoras
- [ ] 🟡 Extraer helper compartido `assertOrgMembership(supabase, userId, orgId)` en `_shared/` y llamarlo en TODA función IA que reciba `organizationId` del body (hoy cada una lo hace distinto o nada).
- [ ] 🟡 `ai-token-guard.ts` debe recibir/validar el `userId` autenticado, no solo `organizationId`.
- [ ] 🟡 Unificar cliente Gemini (`multi-ai:47-94`, `api:484-497`, `ai-providers.ts`) en un solo lugar para que el fix de thinking aplique una vez.

## 10. INTEGRACIONES · WEBHOOKS · GAMIFICACIÓN
_(No repite hallazgos 2026-06-10: bunny-delete-v2, badges/achievements always-true, webhook_secret texto plano, award_space_points caller.)_

### Archivos clave
Pasarelas `supabase/functions/{mercadopago,wompi,hotmart}-webhook/index.ts` + `_shared/payment/*.ts` (MP/Wompi sí verifican firma HMAC — bien). Bunny `bunny-raw-{download,zip}/index.ts` (`config.toml:245-306`). Integraciones `{n8n-proxy,ghl-sync,pancake-webhook-receiver,pancake-sync}/index.ts`. pg_net triggers `20260513210000_pancake_sync_trigger.sql`, `20260614001000_academy_v2_bus_triggers.sql`. Trust `20260427000002_trust_score_function.sql`, RLS `baseline.sql:61149`. Notificaciones `{daily-reminders,booking-reminder}/index.ts`.

### Seguridad
- [ ] 🔴 **`bunny-raw-download` IDOR: lee cualquier archivo de la zona** — (`bunny-raw-download/index.ts:21-27`) solo comprueba que EXISTA el header `Authorization` (no valida JWT ni propiedad); `verify_jwt=false` (`config.toml:270`). Acepta `storagePath`/`url` arbitrario y descarga con el `BUNNY_STORAGE_PASSWORD` del servidor. Cualquiera con `Authorization: Bearer x` lee assets de cualquier org/proyecto. **Fix**: validar JWT + propiedad del path.
- [ ] 🔴 **`bunny-raw-zip` mismo IDOR** — (`bunny-raw-zip/index.ts:148-180`, `config.toml:276`) toma `folderPath` arbitrario y zippea cualquier carpeta; `projectId` solo para el nombre. **Fix**: validar propiedad.
- [ ] 🔴 **`ghl-sync` SSRF + relay sin auth** — (`ghl-sync/index.ts:28,116,265`) toma `webhook_url` del body sin allowlist y hace fetch server-side; `verify_jwt=false` (`config.toml:164`). SSRF a URLs internas + exfiltración de datos de clientes/pagos. **Fix**: allowlist de dominios + autenticar el caller (como n8n-proxy).
- [ ] 🔴 **Trust score falsificable directo** — RLS UPDATE de `creator_profiles` (`baseline.sql:61149-61153`) es `USING(user_id=auth.uid() OR is_platform_admin())` sin `WITH CHECK` ni límite de columnas. El creador hace `UPDATE creator_profiles SET trust_score=100` o falsea las columnas fuente (`on_time_delivery_pct`, `rating_avg`…) que lee `calculate_creator_trust_score`. **Fix**: whitelist de columnas / mover métricas a tabla no escribible por el creador.
- [ ] 🟠 **Wompi checkout no envía `reference` → pagos no reconcilian** — `_shared/payment/wompi.ts:47,50-61` genera `reference` pero no lo incluye en el body; el webhook busca intent por `tx.reference` (`wompi-webhook:44-49`) → cae en `unknown_reference` y nunca desbloquea el curso. **Fix**: incluir `reference` en el payment link. _(Bug con impacto de dinero — subir prioridad.)_
- [ ] 🟠 **Trigger Pancake con anon key en texto plano** — `20260513210000_pancake_sync_trigger.sql:12` embebe el JWT anon en el `.sql` versionado; `pancake-sync` es `verify_jwt=false` y acepta cualquier `user_id` del body (`pancake-sync/index.ts:310-319`) → cualquiera fuerza export a CRM de cualquier usuario. **Fix**: mover secreto a Vault + validar caller.
- [ ] 🟠 **`daily-reminders` público sin rate-limit** — `verify_jwt=false` (`config.toml:146`), `index.ts:120-130` reenvía todo lo pendiente sin dedup → spam de emails/WhatsApp en bucle (coste Resend+Botcake). **Fix**: auth/secret + dedup/idempotencia.
- [ ] 🟡 **`n8n-proxy` relay sin auth** — (`n8n-proxy/index.ts:32`, `verify_jwt=false`) mitigado por allowlist pero dispara workflows internos con payload arbitrario. **Fix**: autenticar el caller.
- [ ] 🟡 **`pancake-webhook-receiver` compare no timing-safe** — (`index.ts:27`) compara secret con `!==`. **Fix**: comparación timing-safe.

### Bugs
- [ ] 🟠 **`booking-reminder` envío duplicado (no atómico)** — (`index.ts:54-79,126-147`) envía email y luego marca `*_sent=true`; fallo/concurrencia reenvía. **Fix**: marcar antes / idempotency key.
- [ ] 🟠 **Wompi/MP idempotencia TOCTOU** — `mercadopago-webhook:53-90`, `wompi-webhook:57-96` leen `intent.status==='paid'` sin lock; entregas concurrentes pasan ambas. **Fix**: `UPDATE ... WHERE status!='paid' RETURNING` atómico o tabla de eventos procesados.
- [ ] 🟠 **`award_space_points` traga errores de reputación** — `20260613000011:65-70` `EXCEPTION WHEN OTHERS THEN NULL` desincroniza XP comunidad vs reputación global. **Fix**: registrar el fallo.
- [ ] 🟡 **Bus pg_net + syncs fallan silenciosamente** — `20260614001000:35-55` (`academy_emit_event_safe`) y `trigger_pancake_sync` (`20260513210000:29-36`) son fire-and-forget sin verificación ni retry. **Fix**: dead-letter/retry.

### Mejoras
- [ ] 🟡 `academy_emit_event` envía `service_role` vía pg_net (`20260614000003:99-104`); usar secret dedicado (`x-academy-fanout-secret` ya existe).
- [ ] 🟡 Añadir dead-letter/retry a todo el bus (Pancake, GHL, n8n, fanout) — hoy ningún camino registra fallos para reproceso.

---

## ORDEN DE EJECUCIÓN SUGERIDO
**Bloque 1 — Escalada y control de acceso (máxima urgencia):**
1. §5 Escalada a admin (policy de `profiles` + `WITH CHECK` + `complete_onboarding` valida `auth.uid()` y fuerza rol) — bloquea el compromiso total de tenant.
2. §7 Paywall Academia (`enrollments_own` → separar SELECT de escritura; enrollment vía RPC con pago) + progreso/certificado server-side.
3. §6 Marketplace: forzar `service_id`/precio server-side en `stripe-creator-hire`; arreglar webhook de hire (columnas/enum + throw + idempotencia).

**Bloque 2 — Fuga y quema cross-org:**
4. §0 `get_unified_clients`, `content_comments`, `get_org_content`, `update_content_by_id`, `send-invitation`.
5. §9 IA: helper `assertOrgMembership` + aplicarlo en content-ai/up-ai-copilot/generate-script/portfolio-ai/intelligence-gatherer/board-ai/adn-continue; IDORs de la API pública.
6. §8 `social-publish`/`restream-api` IDOR + RLS chat/viewers + firmas de webhooks streaming.
7. §10 `bunny-raw-download/zip`, `ghl-sync` SSRF, trust score `WITH CHECK`, Wompi `reference`.

**Bloque 3 — Dinero (financiero):**
8. §1 RPCs overview con check de rol, `client_package_payments` SELECT, UNIQUE anti-duplicado, AbonoDialog CHECK, mezcla de monedas, candado de pago manual, moneda nómina mensual, trigger NULL. §3 facturación cliente desincronizada + fuga de márgenes en portal.

**Bloque 4 — Bugs funcionales:** §2 talento (roles legacy/zombie), §4 board (realtime/filtros/auto-aprobación), §7 drip/quiz/checkout Hotmart, §10 idempotencia webhooks.

**Bloque 5 — Mejoras:** monolitos (>800 líneas), N+1/paginación, memoización de providers, DnD, dead-letter del bus de eventos.

## VERIFICACIÓN (por cada fix)
- RLS/RPC: probar con usuario NO-admin de la org y con usuario de OTRA org (debe fallar/no ver datos). `mcp__claude_ai_Supabase__execute_sql` con rol simulado, o sesión real.
- Edge/webhooks: llamar con `organizationId` ajeno → rechaza; webhook con firma inválida → rechaza.
- Financiero: abono desde `AbonoDialog` (sin violar CHECK), `paid_amount` con abono en otra moneda, nómina 2× (no duplica).
- Board: mover cards con distintos roles, cambiar de org (filtros persisten), auto-aprobación con estado custom.
- `npm run build` + `npm run lint` sin errores tras cada cambio.
