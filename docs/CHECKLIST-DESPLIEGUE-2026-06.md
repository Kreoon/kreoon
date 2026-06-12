# Checklist de despliegue — Cambios de seguridad, pago único y nómina (Junio 2026)

> **Contexto:** toda la parte de base de datos ya está aplicada en producción vía migraciones, y el código está commiteado en la rama `Dev_Branch_Alexander`. Lo que queda es la **secuencia de despliegue**, que requiere tus credenciales. Sigue el orden exacto — está diseñado para que nada se rompa en producción.

> **Regla de oro:** NO hagas `git push` (que dispara el deploy de Vercel) hasta haber completado el Paso 3 (precios de Stripe). Si despliegas el frontend antes, el checkout de pago único de agencias fallará porque los precios no existirán todavía.

---

## PASO 0 — Pre-requisitos

- [ ] Tener acceso de admin a: Stripe Dashboard, Supabase Dashboard (proyecto `wjkbqcrxwsmvtxmqgiqc`), Vercel, y a las cuentas de cada API key a rotar.
- [ ] Tener instalado el CLI de Supabase y haber hecho login: `npx supabase login`.
- [ ] Estar en la rama correcta: `git -C "F:\Users\SICOMMER SAS\Documents\GitHub\kreoon" branch --show-current` → debe decir `Dev_Branch_Alexander`.

---

## PASO 1 — 🔴 Rotar las claves expuestas en el historial de Git (LO MÁS URGENTE)

Estas claves quedaron en el historial de Git y deben considerarse comprometidas.

### 1.1 Rotar en cada servicio (generar nuevas, invalidar las viejas)
- [ ] **Supabase**: Dashboard → Account → Access Tokens → revocar el `SUPABASE_ACCESS_TOKEN` viejo y crear uno nuevo.
- [ ] **Supabase Service Role Key**: Dashboard → Project Settings → API → "Reset service_role secret" (⚠️ esto invalida el viejo; actualízalo en todos los servicios que lo usen: edge functions, n8n, mcp-server).
- [ ] **ElevenLabs** → regenerar API key.
- [ ] **Gemini (Google AI Studio)** → regenerar API key.
- [ ] **Mistral** → regenerar API key.
- [ ] **Apify** → regenerar token.
- [ ] **Firecrawl** → regenerar API key.
- [ ] **Perplexity** → regenerar API key.

### 1.2 Purgar los .env del historial de Git
Instala git-filter-repo (`pip install git-filter-repo`) y, desde la raíz del repo:
```bash
# Hacer backup del repo primero (copia la carpeta completa por seguridad)
git filter-repo --invert-paths \
  --path .env \
  --path kreoon-mcp-server/.env \
  --path extension/.env \
  --force
```
- [ ] Verificar que ya no aparecen: `git log --all --full-history -- .env` (debe estar vacío).
- [ ] Reconfigurar el remoto si filter-repo lo eliminó: `git remote add origin <URL-del-repo>`.
- [ ] **Forzar push del historial reescrito** (coordina con tu equipo — reescribe historia): `git push origin --force --all` y `git push origin --force --tags`.
- [ ] Confirmar que `.env`, `kreoon-mcp-server/.env`, `extension/.env` están en `.gitignore`.

> Si no quieres reescribir historia ahora, **el mínimo imprescindible es rotar las claves (1.1)** — eso ya invalida lo expuesto. La purga del historial es higiene adicional.

---

## PASO 2 — Configurar variables de entorno en Supabase

Dashboard → Project Settings → Edge Functions → Secrets (o `npx supabase secrets set`):

- [ ] `ROOT_ADMIN_EMAILS` = `founder@kreoon.com,<otros-admins-separados-por-coma>`
      ⚠️ **Sin esto, la edge function `kreoon-sql` responde 500 a propósito** (se eliminó el fallback de emails hardcodeados por seguridad).
- [ ] `STRIPE_PRICE_ORG_STARTER_ONETIME` = `price_xxx` (del Paso 3)
- [ ] `STRIPE_PRICE_ORG_PRO_ONETIME` = `price_xxx` (del Paso 3)

Comando CLI alternativo:
```bash
npx supabase secrets set ROOT_ADMIN_EMAILS="founder@kreoon.com" --project-ref wjkbqcrxwsmvtxmqgiqc
```

---

## PASO 3 — Crear los precios one-time de agencia en Stripe

En Stripe Dashboard → Products:
- [ ] Producto/precio **Agency Starter — pago único**. Define el monto (los planes mensuales anteriores eran $249/mes; decide el precio del pago único). Modo: **one-time** (no recurring). Copia el `price_id`.
- [ ] Producto/precio **Agency Pro — pago único** (antes $599/mes). One-time. Copia el `price_id`.
- [ ] Pega ambos `price_id` en los secrets del Paso 2 (`STRIPE_PRICE_ORG_STARTER_ONETIME`, `STRIPE_PRICE_ORG_PRO_ONETIME`).

> Las suscripciones de marcas/creadores siguen igual (recurrentes, sin trial). Solo agencias cambia a pago único.

---

## PASO 4 — Desplegar las Edge Functions (por CLI, NUNCA por MCP)

> El MCP no resuelve el import `../_shared/cors.ts`. Usa siempre el CLI.

```bash
cd "F:\Users\SICOMMER SAS\Documents\GitHub\kreoon"
npx supabase functions deploy subscription-service --project-ref wjkbqcrxwsmvtxmqgiqc
npx supabase functions deploy stripe-webhook --project-ref wjkbqcrxwsmvtxmqgiqc
npx supabase functions deploy api --project-ref wjkbqcrxwsmvtxmqgiqc
npx supabase functions deploy fetch-document --project-ref wjkbqcrxwsmvtxmqgiqc
npx supabase functions deploy kreoon-sql --project-ref wjkbqcrxwsmvtxmqgiqc
npx supabase functions deploy admin-users --project-ref wjkbqcrxwsmvtxmqgiqc
```
- [ ] `subscription-service` desplegada (pago único agencias + sin trial)
- [ ] `stripe-webhook` desplegada (handler `handleOrgAccessPurchase`)
- [ ] `api` desplegada (fix IDOR /clients, /creators, POST /content)
- [ ] `fetch-document` desplegada (fix SSRF)
- [ ] `kreoon-sql` desplegada (⚠️ solo después de setear `ROOT_ADMIN_EMAILS`)
- [ ] `admin-users` desplegada

> `config.toml` cambió `verify_jwt = true` para `bunny-delete-v2` y `admin-users`. Verifica que el deploy respete esos flags (o ajústalos en el dashboard: Edge Functions → cada función → JWT verification).

---

## PASO 5 — Desplegar el frontend (push → Vercel)

Solo después de completar Pasos 2-4:
```bash
git push origin Dev_Branch_Alexander
```
- [ ] Vercel construye y despliega automáticamente.
- [ ] Incluye: pago único de agencias (UI), vista de Nómina, fixes de QA de Academia, hooks de gamificación (RPCs), cambios de pricing sin "14 días gratis".

---

## PASO 6 — Verificación post-deploy

- [ ] **Pago único agencias**: en la página de Planes (como org/agencia), el plan muestra "pago único" y el checkout abre Stripe con el precio correcto.
- [ ] **Suscripciones marcas/creadores**: el checkout sigue recurrente, sin pedir trial.
- [ ] **Nómina**: abrir Finanzas de la org → sección "Nómina de Talento" muestra los pendientes; probar "Marcar pagado" en un registro de prueba.
- [ ] **Gamificación**: que se otorguen puntos/reputación normalmente (las RPCs ya están en prod).
- [ ] **Academia**: revisar que los flujos editados funcionen.

---

## PASO 7 — Fase 3 de gamificación (SOLO después de confirmar Paso 6)

Una vez verificado que el frontend desplegado usa las RPCs de gamificación sin errores, aplicar el DROP de las políticas always-true (bloque comentado al final de `supabase/migrations/20260610140000_gamification_rpcs.sql`).

Antes de dropear la de `up_events`, confirmar el origen de su INSERT:
```sql
SELECT proname, prosecdef FROM pg_proc
WHERE pg_get_functiondef(oid) ILIKE '%insert into%up_events%';
```
- [ ] `reputation_events`, `point_transactions`, `user_global_stats` → seguro dropear (escritura ya pasa por RPC).
- [ ] `user_global_badges`, `user_reputation_totals` → seguro (escritores son SECURITY DEFINER, verificado).
- [ ] `up_events` → dropear solo si el INSERT viene de service_role/SECURITY DEFINER.

---

## PASO 8 — Endurecimiento final (no bloqueante)

- [ ] **Auth → HaveIBeenPwned**: Dashboard → Authentication → Policies → activar "Prevent use of leaked passwords".
- [ ] **Investigar los 25 pagos de nómina con descripción vacía** (origen desconocido — posible n8n/script). Identificar el canal y enrutarlo por la función oficial:
      ```sql
      SELECT id, user_id, amount, payment_date, created_by
      FROM talent_payments WHERE (description IS NULL OR description='') AND role='legacy';
      ```
- [ ] **Performance BD** (opcional): borrar los 685 índices sin uso confirmados y las 6 tablas `_backup_*` (ya blindadas con RLS) tras exportarlas.

---

## Estado actual (referencia)

**Ya aplicado en producción (BD):** RLS en tablas academy; `connected_accounts` (tokens OAuth) cerrado; `organization_client_payments` restringido; `get_pending_consents` con guardia; políticas always-true de escritura cerradas; `search_path` en 191 funciones; `mi_tasks`/`mi_tickets` cerrados; candado anti-doble-pago de nómina (probado); función quincenal `fn_biweekly_talent_payroll`; cron `biweekly-talent-payroll` (job 22, días 15 y fin de mes); 3 RPCs de gamificación; tablas `_backup_*` blindadas.

**Ya commiteado (código, rama Dev_Branch_Alexander, SIN push):** pago único agencias, edge functions (IDOR/SSRF/verify_jwt/kreoon-sql), vista de Nómina, hooks de gamificación→RPC, QA de Academia, cambios de pricing.

**Backlog de nómina:** el próximo corte (día 15) generará automáticamente ~$1.585.000 en pagos pendientes (12 creadores + 1 editor) — revísalos y confírmalos tras transferir.
