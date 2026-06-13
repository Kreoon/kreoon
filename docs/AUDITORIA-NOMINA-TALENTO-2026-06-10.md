# Auditoría de Nómina / Liquidación de Talento — 2026-06-10

Auditoría de solo lectura sobre producción (org y datos reales). Objetivo: garantizar que (1) nunca se pague doble, (2) los ciclos de cierre sean correctos (30→paga antes del 10; 15→paga el 25), (3) nada quede sin pagar.

---

## RESUMEN EJECUTIVO

| Pregunta | Veredicto |
|----------|-----------|
| ¿Se está pagando doble HOY? | **NO.** 0 casos de mismo contenido pagado 2 veces al mismo usuario. |
| ¿Es seguro contra doble pago futuro? | **PARCIAL.** Protección solo lógica (guardias en funciones), sin candado a nivel BD. |
| ¿Los ciclos de cierre son los correctos? | **NO.** Hoy es mensual ("día 20"); se requiere quincenal (15→25, 30→10). |
| ¿Está automatizado? | **NO.** No hay cron; la liquidación se corre a mano. |
| ¿Puede quedar algo sin pagar? | **SÍ (riesgo).** Sin cron + guardia que salta usuarios con pago pendiente. |

**Backlog actual sin liquidar:** 12 creadores ($560.000) + 37 editores ($1.025.000) ≈ **$1.585.000 COP** en contenidos `approved` no pagados.

---

## ARQUITECTURA ACTUAL DE PAGOS A TALENTO

Existen **dos representaciones del pago** que conviven:
1. **Flags en `content`**: `creator_paid` / `editor_paid` (boolean) + `creator_payment` / `editor_payment` (monto).
2. **Tabla `talent_payments`**: registro formal con `content_ids` (ARRAY de uuid), `amount`, `status` (`pending`/`paid`/`cancelled`), `payment_date`, `user_id`, `description`.

La nómina "pagada en período" se calcula sumando ambas fuentes con dedup vía `content_ids` (ver [[feedback-finance-fallbacks]]).

### Mecanismos que CREAN talent_payments (verificados en prod)

| Mecanismo | Tipo | Deduplica | Descripción que escribe |
|-----------|------|-----------|------------------------|
| `auto_talent_payment_on_paid` | Trigger en content | **SÍ** — `NOT EXISTS ... content_ids @> ARRAY[NEW.id]` por user, status≠cancelled | "Cierre automático: …" |
| `fn_monthly_talent_payroll` | RPC manual | Parcial — filtra `creator_paid=false`; idempotencia por `status='pending'` | "Cierre mensual {periodo} — N proyectos" |
| `trg_fillmaker_auto_talent_payment` | Trigger fillmaker_services | SÍ por `fillmaker_service_id` | "Fillmaker: …" |
| Liquidación manual UI | Frontend | — | "Liquidación manual — DD/MM/YYYY" |
| **Origen desconocido** | **?** | **—** | **(vacía) — 25 registros paid** |

### Mecanismo que marca flags en content (frontend)
- `src/components/dashboard/DraggableContentCard.tsx` — UPDATE directo `creator_paid=true` **sin `WHERE NOT creator_paid`**.
- `src/components/projects/UnifiedProjectModal/tabs/PaymentsTab.tsx` — vía RPC `update_content_by_id` (genérico, sin validación de pago).
- El trigger `auto_talent_payment_on_paid` se dispara con estos UPDATE y crea el `talent_payment` (con dedup).

### Salvaguarda de reversión
- `fn_guard_revert_paid_to_approved`: impide pasar un content de `paid`→`approved` si ya existe `talent_payment` en estado `paid`/`processing`. Correcto.

---

## HALLAZGOS

### ✅ H1 — No hay doble pago real (verificado en datos)
Consulta sobre los 57 `talent_payments`: **0 combinaciones (user_id, content_id) aparecen en más de un pago no-cancelado.** Los 45 "solapamientos" iniciales son el caso legítimo **creador + editor** del mismo contenido (dos personas distintas). Las guardias de dedup están funcionando.

### 🔴 H2 — Ciclos de cierre incorrectos (no coinciden con el negocio)
`fn_monthly_talent_payroll` implementa **un** cierre mensual:
- `v_expected_pay := primer día del mes siguiente`
- notes: "Cierre automático día 20. Pago previsto: 1-5 de {mes siguiente}"

**Requerido:** dos cortes quincenales —
- Corte **día 15** → pago **día 25** del mismo mes.
- Corte **día 30** (último del mes) → pago **día 10** del mes siguiente.

### 🔴 H3 — Sin automatización (riesgo de "quedar sin pagar")
No existe job de `pg_cron` para la nómina (el único cron activo es el reset de tokens IA). La liquidación depende de que alguien ejecute `fn_monthly_talent_payroll` manualmente. Si no se corre, el backlog se acumula (hoy ~$1.585.000).

### 🟠 H4 — Sin candado a nivel BD contra doble pago
`talent_payments` **no tiene ninguna constraint UNIQUE** (solo PK en `id`). La prevención de doble pago es 100% lógica (guardias dentro de funciones). Si un pago se inserta por fuera de esas funciones (ver H5) o se introduce un bug, nada lo detiene en la base de datos. Falta la última línea de defensa.

### 🟠 H5 — 25 pagos de origen desconocido sin trazabilidad
25 `talent_payments` (status `paid`) tienen `description` vacía y no provienen de ninguna función actual (ni trigger, ni cierre, ni UI). Probable inserción manual directa / n8n / versión anterior. Si ese canal sigue activo, **bypassa todas las guardias de dedup** y es la vía más probable de un doble pago futuro.

### 🟠 H6 — La idempotencia del cierre puede retrasar pagos
`fn_monthly_talent_payroll` hace `CONTINUE WHEN EXISTS (status='pending')` — si un usuario tiene un cierre `pending` sin liquidar de un período anterior, el nuevo cierre **lo salta por completo**, dejando sus contenidos nuevos sin incluir hasta que se pague el pending. No se pierde dinero, pero se retrasa.

### 🟠 H7 — UPDATE de flags sin guard + dos sistemas paralelos
- Los UPDATE `creator_paid=true` del frontend no llevan `WHERE NOT creator_paid` (el doble clic no duplica el payment gracias al trigger, pero es frágil).
- `content.creator_paid` y `project_assignments.is_paid` pueden divergir (no se sincronizan).

---

## PLAN DE REMEDIACIÓN PROPUESTO (no aplicado — requiere tu OK)

### Fase 1 — Candado anti-doble-pago a nivel BD (la prioridad #1)
Crear una tabla puente o constraint EXCLUDE que garantice que **un mismo (content_id, rol) no pueda estar en dos pagos activos**. Opción recomendada: tabla `talent_payment_items(payment_id, content_id, role)` con `UNIQUE(content_id, role) WHERE status activo`, migrando los `content_ids` existentes. Alternativa más ligera: constraint `EXCLUDE USING gist` con `content_ids &&` por `user_id` (requiere `btree_gist`). Es seguro de agregar porque hoy hay 0 duplicados.

### Fase 2 — Ciclos quincenales correctos
Reescribir/duplicar `fn_monthly_talent_payroll` → `fn_biweekly_talent_payroll(p_org, p_cutoff)` que:
- Corte 15: toma contenidos aprobados hasta el día 15 → `due_payment_date = 25 del mismo mes`.
- Corte 30: toma del 16 al fin de mes → `due_payment_date = 10 del mes siguiente`.
- Agregar columnas a `talent_payments`: `closing_date DATE`, `due_payment_date DATE`, `cycle_label TEXT`.

### Fase 3 — Automatización con pg_cron
Dos jobs: día 15 y último día del mes, que llamen la función por cada organización activa. Decisión: ¿auto-generar y dejar en `pending` para que la agencia revise y confirme el pago, o auto-confirmar? (recomendado: generar `pending`, pago se confirma manual tras transferir).

### Fase 4 — Cerrar el canal de origen desconocido (H5)
Auditar de dónde vienen los 25 pagos sin descripción; si es un canal activo (n8n/script), enrutarlo por la función oficial. Agregar `created_by`/`source` obligatorio en inserciones.

### Fase 5 — Endurecer flags y backlog
- `WHERE NOT creator_paid` en los UPDATE del frontend.
- Vista/alerta de "contenidos aprobados sin pagar > X días" para que nada se quede atrás.
- Resolver el backlog actual de $1.585.000 con un cierre controlado.

---

## DECISIONES DE NEGOCIO PENDIENTES (para implementar)
1. ¿Qué fecha del contenido define a qué corte pertenece — `approved_at` o `created_at`?
2. Corte 30: ¿se procesa el día 30, o el último día del mes (28/31)?
3. ¿El cron auto-genera pagos en `pending` (la agencia confirma tras transferir) o auto-confirma?
4. ¿El backlog actual ($1.585.000) entra al próximo cierre normal o se liquida aparte?
