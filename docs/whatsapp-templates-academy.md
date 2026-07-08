# Plantillas WhatsApp — Academy v2 (CRION)

> **Estado:** borrador para revisión de Alexander.
> Una vez aprobados los textos aquí, se crean en **Botcake → Templates → Nueva plantilla**,
> se envían a Meta (aprobación 24-48h) y luego se conecta cada `template_id` en Supabase.
> Recién entonces implementamos los **emisores** (`academy_emit_event`) en el código.

---

## Reglas que estoy aplicando

- **UTILITY** (transaccional, gatillada por una acción del usuario): sin emojis, sin
  negrita, sin lenguaje promocional. Si Meta detecta tono de venta, la reclasifica a
  MARKETING y deja de enviarse a quien no dio opt-in.
- **MARKETING** (promocional): permite emojis y tono de venta, pero **requiere opt-in
  explícito** del usuario (checkbox en checkout / preferencias). Hoy el opt-in global
  es `profiles.whatsapp_enabled`; para MARKETING conviene un opt-in dedicado (ver nota
  al final).
- Variables `{{1}}`, `{{2}}`... siguen exactamente el `variables_schema` ya seedeado en
  `20260614000002_academy_v2_wa_templates_seed.sql`.
- Donde hay **botón URL dinámico**, la URL lleva su propia variable de botón (`{{1}}`
  del botón), que el fanout envía vía `button_variables`.

---

## 1. welcome_to_space — Bienvenida al espacio

| Campo | Valor |
|---|---|
| **Nombre** | `crion_academy_welcome` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type** | `welcome_to_space` |
| **Disparador previsto** | Al unirse / ser aprobado en un space de academia |

**Cuerpo:**
```
Hola {{1}}, ya eres parte de {{2}}.

Tu acceso está listo. Desde aquí vas a recibir avisos de tus lecciones,
logros y actividad de la comunidad.

Ingresa cuando quieras para empezar.
```

**Botón (URL dinámico):** `Entrar al espacio` → `https://kreoon.com/academia/{{1}}`

**Variables cuerpo:**
- `{{1}}` → nombre del miembro (ej: Alexander)
- `{{2}}` → nombre del space (ej: Marketing con IA)

**Variable botón:** `{{1}}` → slug/ruta del space (ej: `mkt-ia`)

---

## 2. lesson_unlocked — Lección desbloqueada

| Campo | Valor |
|---|---|
| **Nombre** | `crion_academy_lesson_unlocked` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type** | `lesson_unlocked` |
| **Disparador previsto** | Al desbloquearse una lección/módulo (por progreso o drip) |

**Cuerpo:**
```
Hola {{1}}, se desbloqueó una nueva lección en {{3}}.

Lección: {{2}}

Ya puedes verla cuando estés listo.
```

**Botón (URL dinámico):** `Ver lección` → `https://kreoon.com/academia/{{1}}`

**Variables cuerpo:**
- `{{1}}` → nombre del miembro (ej: Alexander)
- `{{2}}` → título de la lección (ej: Lección 3: prompts efectivos)
- `{{3}}` → nombre del curso (ej: Curso de Marketing con IA)

**Variable botón:** `{{1}}` → ruta a la lección

---

## 3. badge_earned — Insignia ganada

| Campo | Valor |
|---|---|
| **Nombre** | `crion_academy_badge_earned` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type** | `badge_earned` |
| **Disparador previsto** | Al otorgarse una insignia al miembro |

**Cuerpo:**
```
Hola {{1}}, ganaste la insignia {{2}} en {{3}}.

Gracias por tu constancia. Sigue avanzando para desbloquear las
siguientes.
```

**Variables cuerpo:**
- `{{1}}` → nombre del miembro
- `{{2}}` → nombre de la insignia (ej: Primera Publicación)
- `{{3}}` → nombre del space (ej: Marketing con IA)

---

## 4. level_up — Subida de nivel

| Campo | Valor |
|---|---|
| **Nombre** | `crion_academy_level_up` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type** | `level_up` |
| **Disparador previsto** | Al cruzar el umbral de XP de un nivel |

**Cuerpo:**
```
Hola {{1}}, subiste al nivel {{2}} en {{3}}.

Acumulaste {{4}} XP. Cada actividad que completas suma para el
siguiente nivel.
```

**Variables cuerpo:**
- `{{1}}` → nombre del miembro
- `{{2}}` → nuevo nivel (ej: 4)
- `{{3}}` → nombre del space
- `{{4}}` → XP total (ej: 1240)

---

## 5. certificate_ready — Certificado disponible

| Campo | Valor |
|---|---|
| **Nombre** | `crion_academy_certificate_ready` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type** | `certificate_ready` |
| **Disparador previsto** | Al completar el 100% de un curso |

**Cuerpo:**
```
Hola {{1}}, completaste {{2}} y tu certificado ya está disponible.

Puedes descargarlo y compartirlo cuando quieras.
```

**Botón (URL dinámico):** `Ver certificado` → `https://kreoon.com/academia/{{1}}`

**Variables cuerpo:**
- `{{1}}` → nombre del miembro
- `{{2}}` → nombre del curso

**Variable botón:** `{{1}}` → ruta al certificado

---

## 6. cart_abandoned — Carrito abandonado ⚠️ MARKETING

| Campo | Valor |
|---|---|
| **Nombre** | `crion_academy_cart_abandoned` |
| **Categoría** | MARKETING (requiere opt-in) |
| **Idioma** | Español (es) |
| **event_type** | `cart_abandoned` |
| **Disparador previsto** | Checkout iniciado sin completar pago en X horas |

**Cuerpo:**
```
{{1}}, te quedó {{2}} en el carrito 🛒

Todavía estás a tiempo de completar tu inscripción y empezar hoy mismo.
```

**Botón (URL dinámico):** `Terminar inscripción` → `https://kreoon.com/checkout/{{1}}`

**Variables cuerpo:**
- `{{1}}` → nombre del miembro
- `{{2}}` → nombre del producto (ej: Curso Marketing con IA)

**Variable botón:** `{{1}}` → token/ruta del checkout

---

## 7. upsell_offer — Oferta de upsell ⚠️ MARKETING

| Campo | Valor |
|---|---|
| **Nombre** | `crion_academy_upsell_offer` |
| **Categoría** | MARKETING (requiere opt-in) |
| **Idioma** | Español (es) |
| **event_type** | `upsell_offer` |
| **Disparador previsto** | Al completar un curso que tiene un upsell configurado |

**Cuerpo:**
```
Hola {{1}}, ya completaste {{2}} 🎉

Tenemos algo para llevarte al siguiente nivel: {{3}}

La oferta es por tiempo limitado.
```

**Botón (URL dinámico):** `Ver oferta` → `https://kreoon.com/academia/{{1}}`

**Variables cuerpo:**
- `{{1}}` → nombre del miembro
- `{{2}}` → curso completado (ej: Curso de IA Básico)
- `{{3}}` → titular del upsell (ej: 30% off en el curso avanzado)

**Variable botón:** `{{1}}` → ruta a la oferta

---

## Resumen

| # | Nombre | Categoría | event_type | Vars cuerpo | Botón URL |
|---|---|---|---|---|---|
| 1 | crion_academy_welcome | UTILITY | welcome_to_space | 2 | Sí |
| 2 | crion_academy_lesson_unlocked | UTILITY | lesson_unlocked | 3 | Sí |
| 3 | crion_academy_badge_earned | UTILITY | badge_earned | 3 | No |
| 4 | crion_academy_level_up | UTILITY | level_up | 4 | No |
| 5 | crion_academy_certificate_ready | UTILITY | certificate_ready | 2 | Sí |
| 6 | crion_academy_cart_abandoned | MARKETING | cart_abandoned | 2 | Sí |
| 7 | crion_academy_upsell_offer | MARKETING | upsell_offer | 3 | Sí |

---

## Notas para decidir antes de implementar

1. **Opt-in para MARKETING (6 y 7).** El opt-in actual (`profiles.whatsapp_enabled`)
   es genérico. Para `cart_abandoned` y `upsell_offer` Meta exige consentimiento de
   marketing. Opciones: (a) un checkbox dedicado en checkout que guarde un flag, o
   (b) reusar `whatsapp_enabled` asumiendo que cubre todo. **¿Cuál prefieres?**

2. **Botón URL: dominio.** Usé `kreoon.com/academia/...`. Si la academia vive en un
   subdominio o ruta distinta (white-label), confírmame el patrón real de URL.

3. **Otras plantillas ya seedeadas que no entran en este lote:** `cohort_starting`,
   `checkpoint_due`, `academy_event_reminder_24h`. Quedan disponibles si luego quieres
   activarlas.

4. **Tras tu OK:** creas las 7 en Meta, y cuando aprueben, hacemos el
   `UPDATE whatsapp_notification_templates SET template_id=..., is_active=true` y yo
   implemento los emisores en cada punto del código (unión a space, desbloqueo de
   lección, badge, level up, fin de curso, checkout abandonado, upsell).
