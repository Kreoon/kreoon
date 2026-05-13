# Plantillas WhatsApp — Kreoon by UGC Colombia

> Todas las plantillas deben crearse en **Botcake → Templates → Nueva plantilla**  
> y enviarse a Meta para aprobación (24-48h).  
> Una vez aprobada cada una, copia el `template_id` y actualiza la tabla en Supabase.

---

## Cómo actualizar el template_id en Supabase (tras aprobación)

```sql
UPDATE whatsapp_notification_templates
SET template_id = 'TU_TEMPLATE_ID_AQUI', is_active = true
WHERE event_type = 'NOMBRE_DEL_EVENTO';
```

---

## PLANTILLAS DE FLUJO DE CONTENIDO (UTILITY)

---

### 1. kreoon_content_assigned

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_content_assigned` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `content_assigned` |

**Texto del cuerpo (pegar exacto):**
```
📋 Kreoon — Nuevo contenido asignado

Hola {{1}}, tienes una nueva asignación esperándote.

🎬 *{{2}}*
🏢 {{3}} · 👤 Cliente: {{4}}

Ingresa a kreoon.com/board para ver los detalles y comenzar. ¡Tú puedes!
```

**Variables:**
- `{{1}}` → Nombre del creador (ej: Alexander)
- `{{2}}` → Título del contenido (ej: Video Testimonial Marca X)
- `{{3}}` → Nombre de la organización (ej: Agencia Kreoon)
- `{{4}}` → Nombre del cliente (ej: Cliente ABC)

---

### 2. kreoon_content_recorded

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_content_recorded` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `content_recorded` |

**Texto del cuerpo:**
```
Hola {{1}}, el proyecto {{2}} fue grabado y está listo para edición.

Grabado por: {{4}}
Equipo: {{3}}

Ingresa a kreoon.com/board para iniciar el proceso de edición.
```

> **Nota**: Sin emojis ni negrita para evitar reclasificación a Marketing por Meta.

**Variables:**
- `{{1}}` → Nombre del editor (ej: Juan)
- `{{2}}` → Título del contenido (ej: Video Testimonial)
- `{{3}}` → Nombre de la organización (ej: Agencia Kreoon)
- `{{4}}` → Nombre del creador que grabó (ej: María)

---

### 3. kreoon_content_approved

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_content_approved` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `content_approved` |

**Texto del cuerpo:**
```
✅ Kreoon — ¡Contenido aprobado!

¡Buenas noticias, {{1}}! 🎉

Tu contenido *{{2}}* fue aprobado por el cliente. Sigue así, ¡gran trabajo!

Revisa el estado en kreoon.com/board
```

**Variables:**
- `{{1}}` → Nombre del creador (ej: Alexander)
- `{{2}}` → Título del contenido (ej: Video Testimonial)

---

### 4. kreoon_content_issue

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_content_issue` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `content_issue` |

**Texto del cuerpo:**
```
Hola {{1}}, se registró una novedad en el proyecto {{2}}.

Equipo: {{3}}

Revisa los comentarios en kreoon.com/board y toma las acciones necesarias para continuar con la producción.
```

**Variables:**
- `{{1}}` → Nombre del usuario responsable (ej: Juan)
- `{{2}}` → Título del contenido (ej: Video Testimonial)
- `{{3}}` → Nombre de la organización (ej: Agencia Kreoon)

---

### 5. kreoon_script_pending

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_script_pending` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `script_pending` |

**Texto del cuerpo:**
```
📝 Kreoon — Guión listo para revisar

Hola, tu guión está esperando tu aprobación.

🎬 *{{1}}*
🏢 {{2}}

Ingresa a kreoon.com para aprobarlo o solicitar cambios. Tu respuesta a tiempo mantiene el proyecto en marcha. 🚀
```

**Variables:**
- `{{1}}` → Título del contenido (ej: Video Testimonial Marca X)
- `{{2}}` → Nombre de la organización (ej: Agencia Kreoon)

---

### 6. kreoon_content_delivered

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_content_delivered` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `content_delivered` |

**Texto del cuerpo:**
```
📦 Kreoon — Contenido entregado

¡Tu contenido está listo para revisar!

🎬 *{{1}}*
🏢 Entregado por: {{2}}

⏳ Tienes *2 días* para revisarlo y dar tu feedback. Si no hay respuesta, el contenido pasará automáticamente a aprobado.

Revisa en kreoon.com ✅
```

**Variables:**
- `{{1}}` → Título del contenido (ej: Video Testimonial)
- `{{2}}` → Nombre de la organización (ej: Agencia Kreoon)

---

### 7. kreoon_content_corrected

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_content_corrected` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `content_corrected` |

**Texto del cuerpo:**
```
🔄 Kreoon — Contenido corregido

¡Ya está lista la nueva versión!

🎬 *{{1}}*
🏢 {{2}}

La corrección fue aplicada según tus comentarios. Revisa la versión final en kreoon.com ✨
```

**Variables:**
- `{{1}}` → Título del contenido (ej: Video Testimonial)
- `{{2}}` → Nombre de la organización (ej: Agencia Kreoon)

---

## PLANTILLAS DE MARKETPLACE Y EQUIPO

---

### 8. kreoon_new_campaign

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_new_campaign` |
| **Categoría** | MARKETING |
| **Idioma** | Español (es) |
| **event_type en BD** | `new_campaign` |

**Texto del cuerpo:**
```
🚀 Kreoon — Nueva campaña para ti

¡Hola {{1}}! Hay una oportunidad que coincide con tu perfil.

🎯 *{{2}}*
🏷️ Marca: {{3}}
💰 Presupuesto: {{4}}
⭐ Compatibilidad: {{5}}%

Aplica antes de que se llenen los cupos en kreoon.com/marketplace
```

**Variables:**
- `{{1}}` → Nombre del creador (ej: Alexander)
- `{{2}}` → Título de la campaña (ej: Campaña Verano 2026)
- `{{3}}` → Nombre de la marca (ej: Marca X)
- `{{4}}` → Presupuesto (ej: $500.000 por video)
- `{{5}}` → Porcentaje de compatibilidad (ej: 87)

---

### 9. kreoon_new_member

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_new_member` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `new_member` |

**Texto del cuerpo:**
```
👥 Kreoon — Nuevo miembro en tu equipo

🏢 {{1}} tiene un nuevo integrante.

🎉 *{{2}}* se unió como {{3}}

Gestiona tu equipo en kreoon.com/settings
```

**Variables:**
- `{{1}}` → Nombre de la organización (ej: Agencia Kreoon)
- `{{2}}` → Nombre del nuevo miembro (ej: Carlos Pérez)
- `{{3}}` → Rol asignado (ej: Creador)

---

## PLANTILLAS DE BIENVENIDA Y RECORDATORIOS

---

### 10. kreoon_welcome_creator

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_welcome_creator` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `welcome_creator` |

**Texto del cuerpo:**
```
🎬 ¡Bienvenido a Kreoon, {{1}}!

Somos la plataforma donde marcas y agencias encuentran a sus creadores de contenido UGC en LATAM.

Así funciona:
🏷️ Las marcas y agencias publican sus necesidades de contenido
🎯 Kreoon te conecta con quienes buscan tu perfil y estilo
📋 Recibes asignaciones directamente aquí en WhatsApp
💰 Produces el contenido y cobras por cada entrega

Para que te encuentren rápido:
📸 Completa tu perfil y sube tu portafolio en kreoon.com/profile

¡Tu primera asignación puede llegar pronto! 🚀
```

**Variables:**
- `{{1}}` → Nombre del creador (ej: Alexander)

---

### 11. kreoon_welcome_client

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_welcome_client` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `welcome_client` |

**Texto del cuerpo:**
```
👋 ¡Bienvenido a Kreoon, {{1}}!

Somos la plataforma de producción de contenido UGC de {{2}}.

Desde aquí puedes:
📝 Revisar y aprobar guiones antes de la grabación
🎬 Seguir el avance de cada pieza de contenido
📦 Recibir entregas y dar tu feedback en tiempo real

Tu equipo ya está listo para comenzar. Ingresa en kreoon.com 🚀
```

**Variables:**
- `{{1}}` → Nombre del cliente (ej: Valentina)
- `{{2}}` → Nombre de la organización (ej: Agencia Kreoon)

---

### 12. kreoon_profile_reminder

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_profile_reminder` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `profile_reminder` |

**Texto del cuerpo:**
```
Hola {{1}}, tu perfil en Kreoon está incompleto.

Las marcas y agencias no pueden encontrarte hasta que completes esta información:

• Foto de perfil
• Biografía y especialidades
• Portafolio con ejemplos de tu trabajo

Completa tu perfil en kreoon.com/profile para aparecer en los resultados de búsqueda.
```

**Variables:**
- `{{1}}` → Nombre del creador (ej: Alexander)

---

### 13. kreoon_client_reminder

| Campo | Valor |
|---|---|
| **Nombre** | `kreoon_client_reminder` |
| **Categoría** | UTILITY |
| **Idioma** | Español (es) |
| **event_type en BD** | `client_reminder` |

**Texto del cuerpo:**
```
🔔 Kreoon — Contenido pendiente de revisión

Hola, tu equipo en {{1}} está esperando tu respuesta.

📦 {{2}} entrega(s) esperan tu aprobación

Tu feedback a tiempo mantiene la producción en marcha y evita retrasos. ⚡

Revisa y aprueba en kreoon.com
```

**Variables:**
- `{{1}}` → Nombre de la organización (ej: Agencia Kreoon)
- `{{2}}` → Número de entregas pendientes (ej: 2)

---

## Resumen — Todas las plantillas

| # | Nombre | Categoría | Event type | Variables | Estado |
|---|---|---|---|---|---|
| 1 | kreoon_content_assigned | UTILITY | content_assigned | 4 | Pendiente |
| 2 | kreoon_content_recorded | UTILITY | content_recorded | 4 | Pendiente |
| 3 | kreoon_content_approved | UTILITY | content_approved | 2 | Pendiente |
| 4 | kreoon_content_issue | UTILITY | content_issue | 3 | Pendiente |
| 5 | kreoon_script_pending | UTILITY | script_pending | 2 | Pendiente |
| 6 | kreoon_content_delivered | UTILITY | content_delivered | 2 | Pendiente |
| 7 | kreoon_content_corrected | UTILITY | content_corrected | 2 | Pendiente |
| 8 | kreoon_new_campaign | MARKETING | new_campaign | 5 | Pendiente |
| 9 | kreoon_new_member | UTILITY | new_member | 3 | Pendiente |
| 10 | kreoon_welcome_creator | UTILITY | welcome_creator | 1 | Pendiente |
| 11 | kreoon_welcome_client | UTILITY | welcome_client | 2 | Pendiente |
| 12 | kreoon_profile_reminder | UTILITY | profile_reminder | 2 | Pendiente |
| 13 | kreoon_client_reminder | UTILITY | client_reminder | 2 | Pendiente |
