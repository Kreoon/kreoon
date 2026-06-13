# Backend QA Report — Academia (reemplazo de Codex)

> Fecha: 2026-06-08
> Rama: `Dev_Branch_Alexander` (head `8210a9d6` antes de hotfixes)
> Reemplaza el run frozen `task-mq4fal7g-nmxzab`.

## Resumen ejecutivo

- Hallazgos previos cerrados: 3/5 (C-03, C-04, A-04 cerrados; C-02 parcial; A-07 cerrado pero introdujo NCR-01)
- Nuevos críticos: **3** (2 ya corregidos en hotfix commit, 1 de diseño documentado)
- Nuevos altos: **5** (1 ya corregido — NAL-02)
- Veredicto inicial: **BLOQUEAR**. Post-hotfix: **fix-and-ship**.

---

## Verificación de cierre de hallazgos previos

| Hallazgo | Estado | Confianza |
|---|---|---|
| C-02 — caller no validado en certificados | PARCIAL — `issue_academy_certificate` permite service_role bypass | 80 |
| C-03 — `award_space_points` accesible sin restricción | CERRADO | 100 |
| C-04 — escrituras community sin validar membresía | CERRADO | 95 |
| A-04 — atomicidad `submit_quiz_attempt_atomic` | CERRADO | 85 |
| A-07 — NaN en grading con solo manuales | CERRADO (introdujo NCR-01) | 100 |

---

## Nuevos críticos

### NCR-01 — `roundedScore` undefined → runtime crash en todos los quizzes
**Archivo**: `supabase/functions/academy-grade-attempt/index.ts:202`
**Impacto**: `ReferenceError: roundedScore is not defined`. Todos los quizzes devuelven HTTP 500 al submit.
**Status**: ✅ CORREGIDO. `score_pct: roundedScore` → `score_pct: scorePct`.

### NCR-02 — Tablas y función nunca creadas
**Archivos**: `20260608213600_academia_badges_remaining.sql`, `20260608213700_academia_cron_jobs.sql`
**Impacto**: `academy_member_badges`, `academy_weekly_missions` y `update_member_energy` se referencian pero no existen. Las migraciones rompen en `db push` y los cron jobs de gamificación abortan en runtime.
**Status**: ✅ CORREGIDO. Migración nueva `20260608213500_academia_gamification_tables.sql` con CREATE TABLE + RLS + función con cap 0-100 + GRANT solo a service_role.

### NCR-03 — `issue_academy_certificate` permite bypass service_role (diseño)
**Archivo**: `20260607182250_academia_security_hardening.sql:43`
**Impacto**: Asimetría con `check_certificate_eligibility`. Cualquier función SECURITY DEFINER que llame esta función con `auth.uid() IS NULL` puede emitir certificados sin validar elegibilidad completa.
**Status**: ⚠️ PENDIENTE — decisión de diseño. Recomendación: separar en `_issue_academy_certificate_internal` privada + wrapper público con check estricto.

---

## Nuevos altos

### NAL-01 — Badges socializer/beloved cross-space
**Archivo**: `20260608213600_academia_badges_remaining.sql:91-93, 107-108`
Contador global de comentarios/likes asigna badge en el space del último trigger. Fix: filtrar `WHERE post_id IN (SELECT id FROM academy_posts WHERE space_id = v_space_id)`.
**Status**: ⏭️ DIFERIDO al siguiente sprint.

### NAL-02 — `academy-trigger-integrations` sin validar membresía del caller
**Archivo**: `supabase/functions/academy-trigger-integrations/index.ts:28-34`
Cualquier autenticado podía disparar webhooks Zapier/Kreoon de cualquier space con payload arbitrario.
**Status**: ✅ CORREGIDO. Check de `owner_id` OR `academy_memberships(is_active=true)` añadido tras leer el space.

### NAL-03 — `academy-course-checkout` TOCTOU posible doble cobro Stripe
**Archivo**: `supabase/functions/academy-course-checkout/index.ts:57-65`
Doble click crea 2 sessions Stripe. Webhook idempotente protege el INSERT pero el usuario puede ser cobrado 2 veces.
**Status**: ⏭️ DIFERIDO. Mitigación recomendada: `UNIQUE (user_id, course_id)` en `academy_enrollments` + manejar conflicto en webhook.

### NAL-04 — `ref` de afiliado de 8 chars sin tracking server-side
**Archivo**: `src/components/academy/community/admin/AffiliatesAdminTab.tsx:48`
8 hex chars → colisiones en bases grandes; el parámetro no se procesa.
**Status**: ⏭️ DIFERIDO. Documentado como "tracking pendiente" en código.

### NAL-05 — `PayoutsAdminTab` calcula comisión con plan actual, no histórico
**Archivo**: `src/components/academy/community/admin/PayoutsAdminTab.tsx:56-63`
Cambio de plan Hobby→Pro distorsiona ganancias históricas reportadas.
**Status**: ⏭️ DIFERIDO. Fix de fondo: snapshot `fee_pct` en `academy_enrollments`.

---

## Lo bien hecho

- `award_space_points` con whitelist + caps + GRANT solo a service_role — sólido.
- HMAC anti-CSRF en OAuth Google Calendar con tiempo constante, TTL 10min, nonce.
- `handleAcademyCoursePurchase` idempotente con check existencia antes de insert.
- `submit_quiz_attempt_atomic` atómico vía transacción implícita PostgreSQL.
- `trg_badge_founder` con `COUNT <= 100` post-INSERT es semánticamente correcto.
- CSV injection guard cubre los 4 caracteres formula-injection (`=`, `+`, `-`, `@`).

---

## Hotfixes aplicados en este commit

```
fix(academia): scorePct typo en grade-attempt (NCR-01)
fix(academia): tablas badges + missions + update_member_energy (NCR-02)
fix(academia): validar membresía del caller en trigger-integrations (NAL-02)
```

## Pendientes para próximo sprint

1. NCR-03 — refactor de `issue_academy_certificate` con función interna
2. NAL-01 — filtrar badges socializer/beloved por space
3. NAL-03 — `UNIQUE (user_id, course_id)` en `academy_enrollments`
4. NAL-04 — tracking real de `ref` afiliado
5. NAL-05 — snapshot `fee_pct` histórico en enrollments

## Veredicto final (post-hotfix)

**fix-and-ship**: los 2 bloqueantes reales (NCR-01, NCR-02) están corregidos. NAL-02 también cerrado. El resto se puede deployar con riesgo aceptado documentado.
