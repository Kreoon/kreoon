# Edge Functions Inventory — UGC Colombia consume de Kreoon

Inventario de qué Edge Functions del Supabase Kreoon (`wjkbqcrxwsmvtxmqgiqc.functions.supabase.co`) consume el sitio Next.js de UGC Colombia HOY, y qué endpoints internos del Next.js debemos preservar al migrar.

---

## 1. Functions de Kreoon que UGC ya consume

Detectado por grep en `F:/Users/SICOMMER SAS/Documents/GitHub/UGC Colombia/`:

| Function | Llamada desde | Propósito | Acción al unificar |
|---|---|---|---|
| `public-showcase` | `web/src/lib/integrations/kreoon.ts:15` | Devuelve grid de creators/contenido público para mostrar en home UGC | Mantener tal cual. Ya está en `supabase/functions/public-showcase/`. |
| `public-registration` | `web/src/lib/api/registration.ts:5` (base URL) | Registro de creadores que aplican desde el sitio público UGC | Mantener tal cual. Ya está en `supabase/functions/public-registration/`. |

**Ambos endpoints ya están en el repo Kreoon** (`supabase/functions/public-showcase/`, `supabase/functions/public-registration/`) y configurados con `verify_jwt = false` en `supabase/config.toml`. **Cero migración requerida en Fase 5**.

Sólo necesario: en la nueva app `apps/web`, mantener el wrapper `lib/integrations/kreoon.ts` (renombrar a `lib/api/showcase.ts` ya que TODO es Kreoon ahora) apuntando a las mismas URLs.

---

## 2. API Routes internas del Next.js UGC (a preservar)

Estas son **Next.js Route Handlers** (`app/api/*/route.ts`), NO Edge Functions de Supabase. Viven en `apps/web` y siguen funcionando igual en el monorepo. Listadas para inventariar, no para migrar:

### Lead management
- `app/api/leads/route.ts` — Crear/listar leads (form principal)
- `app/api/waitlist/route.ts` — Waitlist (formulario simplificado)
- `app/api/brand-diagnosis/route.ts` — Diagnóstico AI de marca
- `app/api/early-diagnosis/route.ts` — Diagnóstico temprano (variante)
- `app/api/diagnosis-status/route.ts` — Polling status de diagnóstico async
- `app/api/lead-forge/route.ts` — Lead magnet "Forge"
- `app/api/quiz-next/route.ts`, `app/api/quiz-predict/route.ts` — Quizzes

### Booking (Cal.com)
- `app/api/availability/route.ts` — Disponibilidad
- `app/api/book/route.ts` — Crear booking
- `app/api/debug-calendar/route.ts` — Debug

### Stripe
- `app/api/checkout/create-session/route.ts` — Checkout Stripe estándar
- `app/api/checkout/custom/route.ts` — Checkout custom (con metadata específica)
- `app/api/webhooks/stripe/route.ts` — Webhook de Stripe

### Admin (autenticado con `admin_users`)
- `app/api/admin/leads/[id]/route.ts` — CRUD lead admin
- `app/api/admin/leads/[id]/activities/route.ts` — Activities por lead
- `app/api/admin/invite/route.ts` — Invitar admins
- `app/api/admin/accept-invitation/route.ts` — Aceptar invitación
- `app/api/admin/delete-lead/route.ts` — Borrar lead
- `app/api/admin/toggle-public/route.ts` — Toggle público de diagnóstico
- `app/api/admin/content/route.ts` — Content overrides
- `app/api/admin/logo-upload/route.ts` — Subir logo de lead
- `app/api/admin/logo-fetch/route.ts` — Fetch logo automático
- `app/api/admin/seed-scripts/route.ts` — Seed de scripts

### Newsletter
- `app/api/newsletter/unsubscribe/route.ts` — Unsubscribe link

### Showcase
- `app/api/showcase/*` — Endpoints internos del showcase

### Auth
- `app/api/auth/*` — Auth admin (será sustituido por Supabase Auth + cookie domain `.kreoon.com`)

### Cron (Vercel scheduled)
- `app/api/cron/send-emails/route.ts` — Cron diario 14:00 UTC (configurado en `web/vercel.json`)

---

## 3. Acción al monorepo (Fase 2-5)

### Mantener sin cambios (Fase 2)
Todas las API routes de Next.js UGC (`app/api/*`) se copian a `apps/web/src/app/api/*` tal cual. Funcionan igual.

### Refactorizar imports (Fase 2)
- Cambiar `import { supabase } from "@/lib/supabase/..."` por `import { createServerClient } from "@kreoon/supabase"`
- Las URLs/keys se centralizan en `packages/supabase`, los `.env` de cada app solo apuntan al mismo proyecto Supabase Kreoon

### Cambios de auth (Fase 4-5)
- Tabla `admin_users` se reemplaza por verificación de membresía en `organization_members` (org `ugc-colombia`, role `admin`)
- Los routes `app/api/admin/*` cambian el guard: en vez de `assertAdminUser()` → `assertOrganizationAdmin('ugc-colombia')`
- Login `/login` (Next.js) usa Supabase Auth con cookie domain `.kreoon.com`

### Edge Functions nuevas posiblemente necesarias (Fase 5)
Ninguna estrictamente. El sitio Next.js ya tiene todo lo que necesita como API routes propias. La integración con Kreoon es bidireccional vía Supabase compartida.

Sin embargo, si querer **desacoplar la lógica de BANT scoring** y otros workflows de IA del Next.js (que hoy llaman Claude/OpenAI directamente desde route handlers), podríamos crear:
- `supabase/functions/bant-scorer/` (mueve lógica desde `app/api/leads/route.ts`)
- `supabase/functions/diagnosis-generator/` (mueve lógica desde `app/api/brand-diagnosis/route.ts`)

Beneficio: stateless, escalable, mismo runtime que el resto. Cost: refactor adicional. **Decisión recomendada**: posponer a una Fase 8 post-fusión, no urgente.

---

## 4. n8n workflows que tocan UGC (en `dev.kreoon.com`)

Según README de UGC Colombia, estos workflows ya viven en la instancia n8n de Kreoon:

- `lead-ingestion` — Recibe webhook desde form, normaliza, inserta en `leads`
- `bant-scorer` — Claude API → actualiza `leads.tier`
- `discovery-call-followup` — Followup tras booking Cal.com
- `creator-application-pipeline` — Pipeline de aplicaciones de creators
- `monthly-client-report` — Genera PDF mensual y envía por email Resend
- `follow-up-sequence` — Nurture sequence
- `creator-payment-scheduler` — Calcula y dispara pagos a creators
- `content-repurposing-alert` — Alertas de contenido reutilizable

**Acción en Fase 5**: cambiar las credenciales de Supabase en cada workflow para que apunten al proyecto `wjkbqcrxwsmvtxmqgiqc` (Kreoon), no al proyecto UGC. URLs de tablas internas cambian si renombramos (ej. `subscriptions` → `agency_subscriptions`).

Documentar cada workflow modificado en `migration-plan/n8n-changes.md` durante Fase 5.

---

## 5. Endpoints externos que UGC usa (no cambian)

Estos servicios siguen igual, solo se mueven las credenciales al `.env` de `apps/web`:

- **Stripe**: API + webhooks (decisión: usar cuenta Kreoon, cerrar UGC)
- **Resend**: API para emails transaccionales (usar dominio `kreoon.com`)
- **Cal.com**: API para booking
- **Bunny CDN**: ya compartido (`cdn.kreoon.com`)
- **Claude / OpenAI**: para BANT scorer y diagnóstico
- **Botcake (WhatsApp)**: notificaciones — ya integrado en Kreoon n8n

---

## 6. Checklist pre-cutover (Fase 4)

- [ ] Smoke test de `public-showcase` desde dominio kreoon.com (no UGC) — debe devolver mismo grid
- [ ] Smoke test de `public-registration` — registro de prueba debe crear lead correctamente
- [ ] Verificar que las API routes de `apps/web/src/app/api/*` funcionan en `kreoon.com/api/*`
- [ ] Cron `send-emails` corre en el nuevo proyecto Vercel `kreoon-web` (no en el proyecto Vercel UGC viejo)
- [ ] DNS de `kreoon.com` propagado (TTL 300)
- [ ] Cookie Supabase con `domain=.kreoon.com` validada manualmente (login en `kreoon.com/login` → cookie visible en `app.kreoon.com`)
