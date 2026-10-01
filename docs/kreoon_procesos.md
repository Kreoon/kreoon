# KREOON - Documentación de Procesos

> **Versión:** 2.0 | **Fecha:** Marzo 2026

---

## Índice de Procesos

1. [Registro y Onboarding](#1-registro-y-onboarding)
2. [Gestión de Contenido](#2-gestión-de-contenido)
3. [Marketplace y Campañas](#3-marketplace-y-campañas)
4. [Sistema de Booking](#4-sistema-de-booking)
5. [Live Streaming](#5-live-streaming)
6. [Sistema Financiero](#6-sistema-financiero)
7. [Sistema de Referidos](#7-sistema-de-referidos)
8. [Gestión de AI Tokens](#8-gestión-de-ai-tokens)
9. [CRM y Clientes](#9-crm-y-clientes)
10. [Notificaciones](#10-notificaciones)

---

## 1. Registro y Onboarding

### 1.1 Registro de Marcas y Organizaciones (cerrado en esta fase)

El único alta pública es el de **creadores** en `/registro` (ver 1.2). El alta de marcas y
organizaciones está **cerrada en esta fase**: `/unete/marcas`, `/unete/organizaciones` y
`/marca-referida` muestran una página informativa de alta cerrada. Las cuentas de marcas y
organizaciones existentes siguen funcionando con normalidad (login en `/auth`).

### 1.2 Flujo de Registro - Creadores (único alta público)

Ruta canónica: `/registro/:organizationSlug`. La ruta genérica `/registro` (y los enlaces heredados
`/register`, `/unete`, `/unete/talento`, `/unete-talento`, `/auth?tab=register`) redirigen a la
organización predeterminada según el host, conservando solo UTM/`ref` y un destino interno seguro (`next`).

```
┌─────────────────┐
│  Landing Page   │
│ /registro       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Formulario:     │
│ - Datos básicos │
│ - Redes sociales│
│ - Portfolio URL │
│ - Especialidad  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verificación    │
│ Email           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Crear:          │
│ - Profile       │
│ - creator_      │
│   profile       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Onboarding:     │
│ - Portfolio     │
│ - Servicios     │
│ - Tarifas       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Perfil Público  │
│ Activo          │
└─────────────────┘
```

### 1.3 Partner Communities

Cuando un usuario se registra desde una comunidad aliada:

```
1. URL con parámetro: ?community=nombre_comunidad
2. Guardar en metadata: raw_user_meta_data.partner_community
3. Al confirmar email → trigger apply_community_benefits()
4. Beneficios automáticos:
   - Suscripción trial
   - Tokens bonus
   - Pricing especial (marcas)
```

---

## 2. Gestión de Contenido

### 2.1 Flujo de Creación de Contenido

```
┌─────────────────┐
│ Cliente crea    │
│ Brief de        │
│ Producto        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Wizard:         │
│ 1. Info básica  │
│ 2. Objetivos    │
│ 3. Referencias  │
│ 4. Budget       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ INSERT          │────▶│ Edge Function:  │
│ products        │     │ product-research│
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ 10 pasos AI:    │
                        │ - Perplexity    │
                        │ - Competencia   │
                        │ - Tendencias    │
                        │ - Insights      │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ Guardar en      │
                        │ product_research│
                        └────────┬────────┘
                                 │
         ┌───────────────────────┘
         │
         ▼
┌─────────────────┐
│ Crear contenido │
│ por fase Esfera:│
│ - Engage        │
│ - Solution      │
│ - Remarketing   │
│ - Fidelize      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Content Board   │
│ (Kanban)        │
└─────────────────┘
```

### 2.2 Estados del Content Board

```
Por Definir → Producción → En Revisión → Aprobado → Publicado
     │              │            │           │          │
     │              │            │           │          └── Final
     │              │            │           └── Listo para publicar
     │              │            └── Cliente revisa
     │              └── En creación/edición
     └── Nuevo contenido
```

**Estados personalizables por organización** en `board_statuses`

### 2.3 Asignación de Contenido

```
┌─────────────────┐
│ Admin asigna    │
│ contenido       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Seleccionar:                    │
│ - Creador (obligatorio)         │
│ - Editor (opcional)             │
│ - Fecha límite                  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Notificación    │
│ al asignado     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Contenido       │
│ aparece en      │
│ su dashboard    │
└─────────────────┘
```

---

## 3. Marketplace y Campañas

### 3.1 Flujo de Creación de Campaña

```
┌─────────────────┐
│ Marca accede    │
│ /campaigns/new  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Campaign Wizard │
│ Step 1: Básicos │
│ - Título        │
│ - Descripción   │
│ - Tipo          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Step 2: Budget  │
│ - Presupuesto   │
│ - Por creador   │
│ - Moneda        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Step 3: Target  │
│ - Categorías    │
│ - Seguidores    │
│ - Ubicación     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Step 4: Fechas  │
│ - Inicio        │
│ - Fin           │
│ - Deadline      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Step 5: Media   │
│ - Assets        │
│ - Guidelines    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Checkout Stripe │
│ (campaign-      │
│  checkout)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Campaña         │
│ Publicada       │
└─────────────────┘
```

### 3.2 Flujo de Aplicación de Creador

```
┌─────────────────┐
│ Creador ve      │
│ campaña en feed │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "Aplicar"│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Formulario:     │
│ - Propuesta     │
│ - Portfolio     │
│ - Precio        │
│ - Disponibilidad│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ campaign_       │
│ applications    │
│ status: pending │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Notificación    │
│ a marca         │
└─────────────────┘
```

### 3.3 Flujo de Revisión de Aplicaciones

```
┌─────────────────┐
│ Marca revisa    │
│ aplicaciones    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Aprobar│ │Rechazar│
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│status:│ │status:│
│accepted│ │rejected│
└───┬───┘ └───────┘
    │
    ▼
┌─────────────────┐
│ Crear proyecto  │
│ marketplace_    │
│ projects        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Escrow creado   │
│ con monto       │
└─────────────────┘
```

### 3.4 Flujo de Entrega de Proyecto

```
┌─────────────────┐
│ Creador sube    │
│ entregables     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ project_        │
│ deliveries      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Notificación    │
│ a marca         │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Aprobar│ │Solicitar│
│       │ │Cambios │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Liberar│ │Revisión│
│Escrow │ │Adicional│
└───────┘ └───────┘
```

---

## 4. Sistema de Booking

### 4.1 Configuración de Evento

```
┌─────────────────┐
│ Usuario crea    │
│ Event Type      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Configurar:     │
│ - Nombre        │
│ - Duración      │
│ - Precio        │
│ - Descripción   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Disponibilidad: │
│ - Días          │
│ - Horarios      │
│ - Buffer        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Preguntas       │
│ Personalizadas  │
│ (opcional)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Políticas       │
│ Cancelación     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Recordatorios   │
│ Automáticos     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Event Type      │
│ Publicado       │
│ slug: /book/... │
└─────────────────┘
```

### 4.2 Flujo de Reserva

```
┌─────────────────┐
│ Visitante       │
│ accede URL      │
│ /book/user/event│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ver calendario  │
│ disponibilidad  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Seleccionar:    │
│ - Fecha         │
│ - Hora          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Edge Function:  │────▶│ Verificar       │
│ calendar-check- │     │ conflictos      │
│ conflicts       │     │ Google Calendar │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Formulario:     │
│ - Nombre        │
│ - Email         │
│ - Preguntas     │
│   personalizadas│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ booking-create  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT bookings │
│ status: pending │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Edge Function:  │────▶│ calendar-google-│
│ Sync Calendar   │     │ sync            │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Emails:         │
│ - Confirmación  │
│   invitado      │
│ - Notificación  │
│   host          │
└─────────────────┘
```

### 4.3 Recordatorios Automáticos

```
┌─────────────────┐
│ Cron Job        │
│ booking-reminder│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Query bookings  │
│ próximos 24h/1h │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Por cada booking│
│ con reminder    │
│ enabled         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Enviar email    │
│ recordatorio    │
└─────────────────┘
```

### 4.4 Cancelación/Reprogramación

```
┌─────────────────┐
│ Invitado accede │
│ /booking/cancel │
│ /booking/       │
│ reschedule      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verificar       │
│ política        │
│ cancelación     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Dentro │ │Fuera  │
│período│ │período│
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Permitir││Cobrar │
│gratis │ │fee    │
└───────┘ └───────┘
```

---

## 5. Live Streaming

### 5.1 Crear Transmisión

```
┌─────────────────┐
│ Creador accede  │
│ /live/broadcast │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GoLiveModal:    │
│ - Título        │
│ - Descripción   │
│ - Categoría     │
│ - Thumbnail     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Edge Function:  │────▶│ Cloudflare API: │
│ cloudflare-live-│     │ Create Live     │
│ service         │     │ Input           │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Respuesta:      │
│ - WHIP URL      │
│ - WHEP URL      │
│ - Stream Key    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ live_streams    │
│ status: pending │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WebRTC          │
│ Connection      │
│ (WHIP)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stream LIVE     │
│ status: live    │
└─────────────────┘
```

### 5.2 Ver Stream

```
┌─────────────────┐
│ Viewer accede   │
│ /live/watch/:id │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LiveViewerPage  │
│ - LivePlayer    │
│ - LiveChat      │
│ - LiveReactions │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WebRTC          │
│ Connection      │
│ (WHEP Playback) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Realtime:       │
│ - Chat messages │
│ - Reactions     │
│ - Viewer count  │
└─────────────────┘
```

### 5.3 Live Shopping

```
┌─────────────────┐
│ Durante stream  │
│ Host muestra    │
│ producto        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ProductShowcase │
│ aparece en      │
│ viewer UI       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Viewer click    │
│ "Comprar"       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ streaming-      │
│ shopping        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stripe Checkout │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Confirmar:      │
│ - 20% KREOON    │
│ - 80% Escrow    │
│   creador       │
└─────────────────┘
```

---

## 6. Sistema Financiero

### 6.1 Flujo de Pago con Escrow

```
┌─────────────────┐
│ Cliente paga    │
│ por servicio    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stripe procesa  │
│ pago            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ stripe-webhook  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ escrow_holds    │
│ status: held    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Creador entrega │
│ trabajo         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cliente aprueba │
│ o 72h auto      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RPC:            │
│ release_escrow  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Distribución:                   │
│ - Platform fee → KREOON wallet  │
│ - Referral cut → Referrer wallet│
│ - Net amount → Creator wallet   │
└─────────────────────────────────┘
```

### 6.2 Flujo de Retiro

```
┌─────────────────┐
│ Usuario solicita│
│ retiro          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verificar:      │
│ - Balance       │
│ - Mínimo        │
│ - Método        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ withdrawal_     │
│ requests        │
│ status: pending │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ wallet-process- │
│ withdrawal      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Procesar según  │
│ método:         │
│ - Stripe Payout │
│ - Bank Transfer │
│ - PayPal        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UPDATE          │
│ withdrawal_     │
│ requests        │
│ status: completed│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UPDATE          │
│ unified_wallets │
│ (restar balance)│
└─────────────────┘
```

### 6.3 Flujo de Suscripción

```
┌─────────────────┐
│ Usuario elige   │
│ plan            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ subscription-   │
│ service         │
│ action: checkout│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stripe Checkout │
│ Session         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Usuario paga    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stripe Webhook: │
│ checkout.       │
│ session.complete│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UPDATE          │
│ platform_       │
│ subscriptions   │
│ - tier          │
│ - status: active│
│ - stripe_sub_id │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Asignar tokens  │
│ AI según plan   │
└─────────────────┘
```

---

## 7. Sistema de Referidos

### 7.1 Generación de Link

```
┌─────────────────┐
│ Usuario accede  │
│ panel referidos │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generar código  │
│ único (si no    │
│ existe)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ referral_codes  │
│ code: ABC123    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Mostrar URL:    │
│ kreoon.com/     │
│ ?ref=ABC123     │
└─────────────────┘
```

### 7.2 Registro con Referido

```
┌─────────────────┐
│ Nuevo usuario   │
│ accede con      │
│ ?ref=ABC123     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Guardar en      │
│ localStorage    │
│ referral_code   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Completar       │
│ registro        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ referral_       │
│ relationships   │
│ status: pending │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Aplicar:        │
│ - 30% descuento │
│ - 25 coins      │
└─────────────────┘
```

### 7.3 Calificación de Referido

```
┌─────────────────┐
│ Referido        │
│ completa acción │
│ (suscripción o  │
│ transacción)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ referral-service│
│ action: qualify │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UPDATE          │
│ referral_       │
│ relationships   │
│ status: active  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Dar 50 coins    │
│ al referidor    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Calcular        │
│ comisiones      │
│ perpetuas       │
└─────────────────┘
```

### 7.4 Distribución de Comisiones

```
┌─────────────────┐
│ Referido paga   │
│ suscripción     │
│ $100            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 20% ($20) →     │
│ Referidor       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ referral_       │
│ earnings        │
└─────────────────┘

--- O ---

┌─────────────────┐
│ Referido hace   │
│ transacción     │
│ $1000           │
│ Platform fee:   │
│ 30% = $300      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5% de $300 →    │
│ $15 Referidor   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ referral_       │
│ earnings        │
└─────────────────┘
```

---

## 8. Gestión de AI Tokens

### 8.1 Consumo de Tokens

```
┌─────────────────┐
│ Usuario usa     │
│ función AI      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ ai-tokens-      │
│ service         │
│ (o función      │
│ específica)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verificar       │
│ balance         │
│ disponible      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Balance│ │Sin    │
│OK     │ │balance│
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Ejecutar│ │Error: │
│función │ │comprar│
│AI     │ │tokens │
└───┬───┘ └───────┘
    │
    ▼
┌─────────────────┐
│ RPC:            │
│ consume_ai_     │
│ tokens          │
│ (atómico)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Orden consumo:  │
│ 1. Bonus tokens │
│ 2. Subscription │
│ 3. Purchased    │
└─────────────────┘
```

### 8.2 Compra de Tokens

```
┌─────────────────┐
│ Usuario elige   │
│ paquete         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ ai-tokens-      │
│ service         │
│ action: purchase│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stripe Checkout │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Webhook:        │
│ payment_intent. │
│ succeeded       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UPDATE          │
│ ai_token_       │
│ balances        │
│ purchased +=    │
│ tokens          │
└─────────────────┘
```

### 8.3 Reset Mensual (Cron)

```
┌─────────────────┐
│ Cron: monthly   │
│ token reset     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Para cada       │
│ suscripción     │
│ activa          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UPDATE          │
│ ai_token_       │
│ balances        │
│ subscription =  │
│ plan.aiTokens   │
└─────────────────┘
```

---

## 9. CRM y Clientes

### 9.1 Creación de Cliente

```
┌─────────────────┐
│ Admin/Strategist│
│ crea cliente    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Formulario:     │
│ - Nombre        │
│ - Contacto      │
│ - Industria     │
│ - Logo          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT clients  │
│ organization_id │
│ (auto)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Opcional:       │
│ Invitar usuario │
│ cliente         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ client_users    │
└─────────────────┘
```

### 9.2 Flujo de Brief de Producto

```
┌─────────────────┐
│ Ver cliente     │
│ en dashboard    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click           │
│ "Nuevo Producto"│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CreateProduct   │
│ BriefWizard     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Completar:      │
│ - Info básica   │
│ - Objetivos     │
│ - Competencia   │
│ - Referencias   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT products │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Trigger:        │
│ product-research│
│ (AI)            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generar         │
│ contenido       │
│ sugerido        │
└─────────────────┘
```

---

## 10. Notificaciones

### 10.1 Tipos de Notificaciones

| Evento              | Canal         | Template             |
| ------------------- | ------------- | -------------------- |
| Nueva reserva       | Email, In-app | booking_confirmation |
| Recordatorio        | Email         | booking_reminder     |
| Aplicación recibida | Email, In-app | campaign_application |
| Proyecto asignado   | Email, In-app | project_assigned     |
| Entrega recibida    | Email, In-app | delivery_received    |
| Pago recibido       | Email, In-app | payment_received     |
| Tokens bajos        | Email, In-app | tokens_low           |

### 10.2 Flujo de Notificación

```
┌─────────────────┐
│ Evento ocurre   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function   │
│ o Trigger       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ notifications   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│In-app │ │Email  │
│(Realtime)│      │
└───────┘ └───┬───┘
              │
              ▼
         ┌───────┐
         │Resend │
         │API    │
         └───────┘
```

### 10.3 Webhooks Externos

```
┌─────────────────┐
│ Evento en       │
│ booking         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verificar       │
│ webhooks        │
│ configurados    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ booking-webhook-│
│ dispatch        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST a URL      │
│ externa con     │
│ payload JSON    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Log response    │
│ para debugging  │
└─────────────────┘
```

---

## 11. Procesos Administrativos

### 11.1 Impersonación (Root Mode)

```
┌─────────────────┐
│ Platform Root   │
│ Admin           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click           │
│ "Modo Root"     │
│ (header)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Seleccionar:    │
│ - Organización  │
│ - Rol           │
│ - Usuario       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Context switch  │
│ ImpersonationPro│
│ vider           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ver plataforma  │
│ como ese usuario│
│ (solo lectura)  │
└─────────────────┘
```

### 11.2 Gestión de Prompts AI

```
┌─────────────────┐
│ Platform Root   │
│ → Settings      │
│ → Prompts AI    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Listar prompts  │
│ por módulo      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Editar prompt   │
│ template        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UPDATE          │
│ platform_prompts│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cache invalidado│
│ próximas        │
│ requests usan   │
│ nuevo prompt    │
└─────────────────┘
```

---

## 12. Integraciones

### 12.1 Google Calendar

```
┌─────────────────┐
│ Usuario conecta │
│ Google Calendar │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ calendar-google-│
│ auth            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OAuth2 Flow     │
│ Google          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ calendar-google-│
│ callback        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT          │
│ calendar_       │
│ integrations    │
│ - access_token  │
│ - refresh_token │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sync eventos    │
│ bidireccional   │
└─────────────────┘
```

### 12.2 n8n Automation

```
┌─────────────────┐
│ Evento KREOON   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ n8n-proxy       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST webhook    │
│ n8n server      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ n8n workflow    │
│ ejecuta         │
│ automatización  │
└─────────────────┘
```

---

_Documentación de procesos KREOON - Marzo 2026_
