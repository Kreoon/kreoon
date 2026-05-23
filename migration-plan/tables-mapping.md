# Tables Mapping — Supabase UGC Colombia → Supabase Kreoon

Fuente: README de UGC Colombia + grep `from('...')` en `web/src/`. Total de tablas en UGC: ~22.
Destino: Supabase Kreoon `wjkbqcrxwsmvtxmqgiqc` (única BD final).

## Leyenda de columnas

- **Origen**: tabla en Supabase UGC Colombia
- **Destino**: tabla en Supabase Kreoon donde migran los datos
- **Acción**: `MERGE` (insertar en tabla existente añadiendo `source`), `RENAME` (mover y renombrar), `NEW` (crear tabla nueva), `DROP` (descartar datos)
- **Riesgo**: colisión de schema/datos
- **Owner módulo**: quién toca esta tabla en Kreoon

---

## Mapeo de tablas (datos transaccionales)

| # | Origen (UGC) | Destino (Kreoon) | Acción | Riesgo | Notas |
|---|---|---|---|---|---|
| 1 | `leads` | `platform_crm_leads` | MERGE | ALTO | Añadir columna `source TEXT DEFAULT 'ugccolombia.co'`. Mapear campos UGC (`bant_score`, `tier`, `diagnosis_slug`, `ai_diagnosis`, `diagnosis_public`) que NO existen en Kreoon → añadir como columnas nuevas o `metadata JSONB`. |
| 2 | `lead_activities` | `platform_crm_lead_activities` o `crm_activities` | MERGE | MEDIO | Verificar si Kreoon CRM ya tiene tabla de activities. Si no, crear con misma estructura. |
| 3 | `clients` | `organizations` (con `is_agency_client=true`) | MERGE | ALTO | Cada "cliente UGC" se convierte en una organization Kreoon. Crear migración que cree org por cada cliente activo. Idempotente. |
| 4 | `creators` | `organization_members` + `creator_profiles` | MERGE | ALTO | El "pool curado A/B/C" de UGC mapea a campos de scoring en `creator_profiles` o `talent_activity_metrics`. Identificar campos no equivalentes (rate, tier ABC, status). |
| 5 | `projects` | `marketplace_projects` | MERGE | MEDIO | Kreoon ya tiene módulo marketplace. Asignar `organization_id` = org de la agencia. |
| 6 | `briefs` | `campaign_briefs` o nueva `agency_briefs` | NEW probable | MEDIO | UGC tiene briefs por proyecto cliente. Kreoon tiene briefs de campañas marketplace (diferente concepto). Crear `agency_briefs` separada. |
| 7 | `deliverables` | `content_items` | MERGE | MEDIO | Añadir `source='agency'` y `agency_project_id`. Bunny URLs ya son compartidas (cdn.kreoon.com). |
| 8 | `payments` | `wallet_transactions` | MERGE | ALTO | Módulo wallet de Kreoon ya existe. Mapear `creator_payments` y `client_invoices` por separado. Reconciliar histórico con extremo cuidado. |
| 9 | `workflow_logs` | `audit_logs` o nueva `agency_workflow_logs` | NEW probable | BAJO | Logs históricos de n8n. Puede archivar como JSONL en Storage y no migrar a Postgres si volumen es alto. |
| 10 | `bookings` | `public.bookings` | **CONFLICT** | ALTO | **AMBOS TIENEN ESTA TABLA**. Schema diferente (UGC = Cal.com, Kreoon = módulo booking nativo). Decisión: mantener separadas. Renombrar UGC → `agency_bookings` y dejar `bookings` para el módulo Kreoon. |
| 11 | `discovery_calls` | parte de `platform_crm_leads.interactions` (JSONB) | MERGE | BAJO | Llamadas BANT son sub-eventos del lead. Guardar como JSONB en columna `interactions` o tabla `crm_interactions`. |
| 12 | `email_sequences` | `email_sequences` (NEW) | NEW | BAJO | Kreoon NO tiene email sequences. Importar tabla 1:1. Renombrar a `email_drip_sequences` si hay conflicto con email-drip-processor function. |
| 13 | `newsletter_subscribers` | `newsletter_subscribers` (NEW) | NEW | BAJO | Kreoon NO tiene. Importar 1:1. |

---

## Mapeo de tablas (admin/auth UGC)

| # | Origen (UGC) | Destino (Kreoon) | Acción | Notas |
|---|---|---|---|---|
| 14 | `admin_users` | `organization_members` con `role='admin'` en org `ugc-colombia` | MERGE | UGC tiene sistema admin propio. Migrar como members de la org oficial UGC Colombia (slug `ugc-colombia`). Roles UGC (Diana, Brian, Tanya, Samuel, Valentina) → asignar role Kreoon equivalente. |
| 15 | `invitations` | `organization_invitations` o re-usar `send-invitation` Edge Function | MERGE | Kreoon ya tiene flujo de invitaciones. Migrar pendientes y discontinuar tabla UGC. |
| 16 | `content_overrides` | `content_overrides` (NEW) | NEW | UGC tiene sistema de overrides de copy del sitio. Migrar 1:1 (es para el sitio web, no para la app). Vive en apps/web. |

---

## Mapeo de tablas (Stripe/billing)

| # | Origen (UGC) | Destino (Kreoon) | Acción | Riesgo | Notas |
|---|---|---|---|---|---|
| 17 | `stripe_customers` | `stripe_customers` (NEW o existing) | VERIFICAR | ALTO | **VERIFICAR** si Kreoon ya tiene esta tabla (probable que sí en módulo billing). Si existe, MERGE con `source`. **DECISIÓN CRÍTICA**: ¿una sola cuenta Stripe o dos? Recomiendo unificar Stripe a la cuenta Kreoon, cerrar cuenta UGC, migrar customers con Stripe API (`customer.update`). |
| 18 | `stripe_events` | `stripe_events` | VERIFICAR | MEDIO | Webhook events log. Si Kreoon tiene similar, MERGE. Si no, NEW. |
| 19 | `orders` | `subscriptions` o nueva `agency_orders` | NEW probable | ALTO | Orders UGC son del checkout custom (`/checkout/create-session`). Kreoon usa `subscriptions` directamente. Crear `agency_orders` con `client_org_id` referenciando organization. |
| 20 | `subscriptions` | `subscriptions` | **CONFLICT** | ALTO | **AMBOS TIENEN ESTA TABLA**. Schema diferente. UGC: subscription a retainer agencia. Kreoon: subscription a plan SaaS. Renombrar UGC → `agency_subscriptions` o mover a `agency_orders`. |

---

## Mapeo de tablas (content system UGC)

| # | Origen (UGC) | Destino (Kreoon) | Acción | Notas |
|---|---|---|---|---|
| 21 | `content_scripts` | `agency_content_scripts` (NEW) o discontinuar | EVALUAR | UGC tiene sistema propio de scripts del sitio web (forge, lead magnet, etc). Kreoon ya tiene `content_items` para scripts de IA del SaaS. **Son conceptos diferentes**: UGC = copy de marketing del sitio público. Mantener en apps/web con `content_overrides` y descartar tabla. |
| 22 | `content_publications` | discontinuar | DROP | Solo se usa para el blog del sitio web. Mejor migrar el blog a MDX/Sanity en apps/web. |
| 23 | `content_script_events` | descartar | DROP | Tracking interno del editor de scripts. Sin valor migrar. |

---

## Resumen de conflictos críticos

| Tabla | UGC tiene | Kreoon tiene | Resolución |
|---|---|---|---|
| `leads` | ✅ | ❌ (usa `platform_crm_leads`) | UGC `leads` → MERGE en `platform_crm_leads` con `source='ugccolombia.co'` |
| `clients` | ✅ | ✅ (`public.clients`, baseline:86) | UGC `clients` → mapear a `organizations` con flag `is_agency_client`. NO mergear con `public.clients` (concepto diferente). |
| `projects` | ✅ | Probable `marketplace_projects` | UGC `projects` → MERGE en `marketplace_projects` con flag agency |
| `subscriptions` | ✅ | ✅ (baseline:29831) | RENAME UGC → `agency_subscriptions` |
| `bookings` | ✅ | ✅ (baseline:48326) | RENAME UGC → `agency_bookings` |
| `creators` | ✅ | ❌ (usa `creator_profiles`) | UGC `creators` → MERGE en `creator_profiles` + `organization_members` |

---

## Migraciones a escribir (Fase 5)

1. **`2026MMDD_010_agency_columns.sql`**: añadir columnas a tablas Kreoon existentes
   - `ALTER TABLE platform_crm_leads ADD COLUMN source TEXT DEFAULT 'kreoon.com'`
   - `ALTER TABLE platform_crm_leads ADD COLUMN bant_tier TEXT, ADD COLUMN ai_diagnosis JSONB, ADD COLUMN diagnosis_slug TEXT UNIQUE, ADD COLUMN diagnosis_public BOOLEAN`
   - `ALTER TABLE organizations ADD COLUMN is_agency_client BOOLEAN DEFAULT false, ADD COLUMN agency_retainer_mxn_usd NUMERIC`
   - `ALTER TABLE creator_profiles ADD COLUMN tier_abc TEXT, ADD COLUMN agency_status TEXT`
   - `ALTER TABLE content_items ADD COLUMN source TEXT DEFAULT 'kreoon', ADD COLUMN agency_project_id UUID`

2. **`2026MMDD_011_agency_tables.sql`**: crear tablas nuevas
   - `CREATE TABLE agency_briefs (...)` — briefs por proyecto cliente
   - `CREATE TABLE agency_orders (...)` — checkout custom UGC
   - `CREATE TABLE agency_subscriptions (...)` — retainers (renombrada desde `subscriptions` UGC)
   - `CREATE TABLE agency_bookings (...)` — Cal.com bookings (renombrada desde `bookings` UGC)
   - `CREATE TABLE agency_workflow_logs (...)` — n8n logs
   - `CREATE TABLE email_sequences (...)` — drip sequences del sitio web
   - `CREATE TABLE newsletter_subscribers (...)` — newsletter
   - `CREATE TABLE content_overrides (...)` — overrides de copy del sitio web

3. **`2026MMDD_012_agency_rls.sql`**: políticas RLS de las nuevas tablas
   - Todo `agency_*` solo accesible por members de org `ugc-colombia`
   - `email_sequences` y `newsletter_subscribers` accesibles por `service_role` y `admin`

4. **`2026MMDD_013_seed_agency_data.sql`**: importar datos
   - Usar `COPY FROM` desde dumps SQL del Supabase UGC
   - O script Node con Supabase Admin SDK que lea de UGC y escriba a Kreoon
   - Validar conteos: `SELECT count(*) FROM <tabla>` en ambos lados → debe match

---

## Cosas pendientes de verificar antes de Fase 5

- [ ] Listar TODAS las tablas reales de UGC Supabase (correr `supabase db dump --schema-only` en proyecto UGC)
- [ ] Listar TODAS las tablas reales de Kreoon Supabase (usar Supabase MCP `list_tables`)
- [ ] Confirmar si Kreoon ya tiene `stripe_customers` y `stripe_events` (módulo billing)
- [ ] Decidir cuenta Stripe final: ¿UGC o Kreoon? (Recomendación: Kreoon)
- [ ] Volumen de datos: ¿cuántas filas tiene cada tabla? (afecta estrategia COPY vs INSERT loop)
- [ ] PII: ¿hay datos personales en `leads` que requieran consentimiento adicional para migrar? (GDPR/Ley 1581 Colombia)

---

## Backup obligatorio antes de cualquier migración

- Snapshot completo Supabase UGC vía `supabase db dump --data-only > backup_ugc_$(date +%Y%m%d).sql`
- Snapshot completo Supabase Kreoon (mismo comando)
- Subir ambos a Bunny Storage o S3 con retention 90 días
- Documentar URL del snapshot en el commit message de la migración de seed
