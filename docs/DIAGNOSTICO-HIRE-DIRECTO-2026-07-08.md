# Diagnóstico: Hire Directo (marketplace_projects = 0)

Fecha: 2026-07-08. Fase D, Módulo 2.3. Solo diagnóstico — sin cambios de código.

## Archivos del flujo

**Entrada (perfil del creador):**
- `src/components/marketplace/HireButton.tsx` — botón de contratación, delega en un
  callback `onHire` (no navega directo).
- `src/components/marketplace/profile/PricingSidebar.tsx`, `ServiceDetailModal.tsx`,
  `CreatorServicesSection.tsx` — disparan `onHire` → navegan a `/marketplace/hire/:creatorId`.

**Wizard de contratación:**
- Ruta `/marketplace/hire/:creatorId` (`src/App.tsx:673`) → `HiringWizardPage.tsx`
  → `src/components/marketplace/hiring/HiringWizard.tsx`
  → pasos: `HiringStepPackage.tsx`, `HiringStepPayment.tsx`, `HiringStepSummary.tsx`.

**Checkout (payment-first, confirmado en memoria de proyecto):**
- `HiringWizard.tsx:307-308` invoca la edge function `stripe-creator-hire`
  ANTES de completar el wizard (Stripe Checkout Session).
- `supabase/functions/stripe-creator-hire/index.ts:121` crea la sesión con
  `metadata.type = "creator_hire_payment"`.

**Webhook → creación del proyecto:**
- `supabase/functions/stripe-webhook/index.ts:125-126` — el dispatcher del webhook
  SÍ enruta correctamente: `session.metadata?.type === "creator_hire_payment"` →
  `handleCreatorHirePaymentCompleted(supabase, session)`.
- `supabase/functions/stripe-webhook/handlers/marketplace.ts:335-394` —
  `handleCreatorHirePaymentCompleted` arma `projectData` y hace
  `supabase.from("marketplace_projects").insert(projectData)` (línea 392).
  Si falla, hace `throw` (línea 393-394) — NO traga el error silenciosamente,
  así que un fallo real debería verse como delivery fallido en el dashboard de Stripe.

## Punto de ruptura identificado

**No se encontró un bug de wiring obvio en el código.** La cadena completa
(botón → wizard → checkout Stripe → webhook → insert en `marketplace_projects`)
está correctamente conectada extremo a extremo:

1. `session.metadata.type` se setea igual en el creador de la sesión
   (`stripe-creator-hire`) y se lee igual en el dispatcher del webhook.
2. El insert no está en un try/catch que trague errores.
3. Las rutas de frontend existen y están montadas en `App.tsx`.

**Conclusión más probable:** el flujo existe y está bien cableado, pero
**nadie ha completado un checkout real todavía** — no es necesariamente un bug,
es una feature sin tráfico/adopción real en producción. Esto es consistente con
lo que ya reportó la auditoría integral (`docs/AUDITORIA-PLATAFORMA-2026-06-10.md`):
"plan pago único" y features de marketplace con baja adopción real.

**No se puede descartar del todo un fallo silencioso más profundo** (ej: firma de
webhook Stripe mal configurada en producción, secret rotado, o un campo requerido en
`projectData` que causa el insert a fallar en un caso específico) sin acceso a logs
reales de Stripe/Supabase en producción — eso está fuera del alcance de una revisión
de código estática.

## Costura marketplace→board

**No existe.** Grep confirmado: `marketplace_project` no aparece ni una sola vez en
`src/components/board/`, `src/components/content-board/` ni `src/pages/ContentBoard.tsx`.

El webhook crea una fila en `marketplace_projects`, pero **no crea ningún registro en
`content`** ni dispara nada que aparezca en el ContentBoard. Son dos silos completamente
separados: `marketplace_projects` (contratación/pago) y `content` (producción/tablero).
Aunque el pago se complete y el insert funcione, el proyecto contratado nunca aparecería
como trabajo asignable en el tablero de producción — habría que crear manualmente el
contenido correspondiente.

## Recomendación para fix (fuera de este alcance — trabajo de desarrollo aparte)

1. Verificar en producción (Stripe dashboard + logs de Supabase) si ha habido intentos
   reales de checkout con `type=creator_hire_payment` que hayan fallado, antes de asumir
   que el problema es solo "0 tráfico".
2. Si se confirma que el flujo nunca se probó end-to-end: hacer una prueba manual completa
   en un ambiente de staging/test con una tarjeta de prueba de Stripe.
3. Diseñar la costura marketplace→board explícitamente: decidir si `handleCreatorHirePaymentCompleted`
   debe crear también un registro en `content` (o disparar un evento que el board escuche),
   para que un hire directo pagado se convierta automáticamente en trabajo visible en producción.
