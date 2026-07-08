---
titulo: KREOON — Arquitectura de la Plataforma por Rol
fecha: 2026-07-08
fuente: código real (src/lib/roles.ts, permissionGroups.ts, Sidebar.tsx, App.tsx, dashboards, pipeline de estados)
proposito: documentación completa de funcionamiento, acceso y proceso end-to-end de cada rol
---

# KREOON — Arquitectura de la Plataforma por Rol

Documento de referencia. Describe cómo funciona la plataforma **desde la perspectiva de cada rol**: qué es, cómo entra, qué ve, qué puede hacer, y su proceso completo de punta a punta. Todo verificado contra el código, no inventado.

---

## PARTE 0 — Modelo mental de la plataforma

### La idea central
KREOON es el **sistema operativo de una agencia de contenido**. El modelo es **cash-first**: lo PRIMERO es el cobro al cliente. No arranca producción sin el dinero adentro — así es autosostenible. El loop que la plataforma existe para ejecutar es:

```
COBRO      →  ESTRATEGIA  →  CONTENIDO  →  TALENTO  →  EJECUCIÓN  →  APROBACIÓN  →  PAGO TALENTO
(cliente)     (guion/ADN)    (scripts)   (marketplace) (pipeline)   (cliente)      (nómina)
   ▲                                                                                    ▼
 paso 1 = gate de entrada (payment-first)                          paso final = se paga al talento
```

**Clave:** el cobro al cliente es el **gate de entrada** (paso 1), no el cierre. El pago al talento sí va al final, tras la aprobación. Esto extiende a todo el flujo de producción el mismo payment-first que ya existe en el marketplace (Stripe antes del hire directo).

Una **organización** (agencia) tiene un **dueño (admin)**, un **equipo de talento** (creadores, editores, estrategas, community managers), y **clientes/marcas** para quienes produce contenido. Cuando el equipo interno no alcanza, se contrata **talento externo** en el marketplace.

### Los 8 roles → 4 grupos de permiso
El sistema define **8 roles base** (`src/lib/roles.ts`) que se colapsan en **4 grupos de permiso** (`src/lib/permissionGroups.ts`). **Toda verificación de permiso usa el GRUPO, no el rol individual.**

| Rol base | Grupo de permiso | Color | Ícono | Dashboard de aterrizaje |
|---|---|---|---|---|
| `admin` | **admin** | Morado | Escudo | `/dashboard` |
| `content_creator` | **talent** | Rosa | Cámara | `/creator-dashboard` |
| `editor` | **talent** | Azul | Film | `/creator-dashboard` (adaptativo) |
| `digital_strategist` | **talent** | Verde | Tendencia | `/strategist-dashboard` |
| `creative_strategist` | **talent** | Naranja | Paleta | `/strategist-dashboard` |
| `community_manager` | **talent** | Teal | Usuarios | `/strategist-dashboard` |
| `client` | **client** | Ámbar | Edificio | `/client-dashboard` |
| `student` | **student** | Violeta | Birrete | `/academia` |

**Prioridad de rol** (cuando un usuario tiene varios): `admin > content_creator > editor > digital_strategist > creative_strategist > community_manager > client > student`.

> **Nota técnica:** existen ~40 roles *legacy* (creator, ugc_creator, video_editor, trafficker, brand_manager, etc.) que se mapean automáticamente a uno de los 8 base vía `LEGACY_TO_BASE_ROLE`. Código nuevo SIEMPRE usa las claves canónicas (`content_creator`, no `creator`).

### El pipeline de contenido (la columna vertebral)
Todo el trabajo de la plataforma fluye por estos estados (`content.status`). Cada rol interviene en tramos distintos:

```
draft → script_pending → script_approved → assigned → recording → recorded
   │         │                  │              │           │          │
 (crea)  (estratega       (cliente/admin    (admin      (creador)  (creador
          escribe guion)   aprueba guion)   asigna)     graba)     entrega)
                                                                      │
                                                                      ▼
recorded → editing → review → [issue → corrected] → approved → delivered → paid → archived
              │         │          │          │          │          │        │
          (editor)  (editor    (cliente   (editor   (cliente/  (entrega  (se paga
                     entrega)  pide       corrige)  admin       final)   al talento)
                               cambios)              aprueba)
```

- **Auto-aprobación:** si un contenido queda en `delivered`/`review` sin respuesta del cliente por 5 días, un cron lo pasa a `approved` automáticamente (con bono de reputación al talento).
- **archived:** estado interno (aprobado + pagado 100%), fuera del flujo activo.

---

## PARTE 1 — ADMIN (dueño de la organización)

### Identidad
- **Grupo:** admin · **Dashboard:** `/dashboard` ("Centro de Control")
- Es el **dueño de la agencia**. Máximo poder dentro de su organización. Ve y controla todo.
- Sub-variante: **Platform Root / Superadmin** (el dueño de KREOON mismo) ve además el CRM de plataforma, pagos pendientes globales y papelera.

### Cómo entra
Registro como organización → `complete_onboarding` lo registra en su org con rol admin. Es quien crea la organización y a partir de ahí invita a su equipo y da de alta clientes.

### Qué ve (navegación completa — `adminSections`)
**KREOON STUDIO**
- **Centro de Control** (`/dashboard`) — visión global: producción, finanzas, equipo, clientes.
- **Producciones** (`/board`) — kanban del pipeline de todo el contenido.
- **Portafolio** (`/content`) — biblioteca de contenido.
- **Kreoon IA** (`/scripts`) — generador de guiones + ADN.
- **Academia** (`/academia`).
- **Ranking** (`/ranking`) — reputación/gamificación del equipo (UP points).

**MARKETING & MEDIA**
- Marketing (`/marketing`), Social Hub (`/social-hub`), Streaming + Hosting en Vivo *(adminOnly, en construcción)*, Anuncios (`/marketing-ads`), Generador de Anuncios (`/ad-generator`), Inteligencia de Anuncios, Análisis de Redes.

**GESTIÓN**
- **Talento & Equipo** (`/talent`) — gestión del equipo, embajadores, contratación.
- **Clientes** (`/clientes`) — CRM de clientes/marcas de la agencia.
- **Finanzas** (`/org-crm/finanzas`) — ingresos, costos, nómina, salud financiera.

**CRM PLATAFORMA** *(solo admin de organización o platform admin)*
- CRM, Comunidades, Revenue Plataforma, Email Marketing, Pagos Pendientes *(platform root)*, Papelera *(platform root)*.

**CONFIG** — Mi Perfil, Booking, Campañas Gestionadas, Mi Plan, Configuración.

### Qué puede hacer (permisos)
- **Todo** dentro de su organización: crear/editar/borrar contenido, clientes, productos, guiones.
- Asignar creadores/editores/estrategas a cada pieza de contenido.
- Aprobar/rechazar guiones y videos.
- Gestionar el equipo: invitar miembros, asignar roles, otorgar/revocar badge de embajador.
- Ver y gestionar todas las finanzas: marcar pagos a talento (con comprobante obligatorio), registrar cobros de clientes, ver salud financiera y anomalías.
- Configurar la organización: estados custom del board, white-label, marketplace on/off.
- **Rutas admin-only** (guard `allowedRoles={["admin"]}`): 13 rutas protegidas exclusivas.

### Proceso end-to-end (el flujo del dueño) — cash-first
1. **Da de alta un cliente/marca** en `/clientes`.
2. **COBRA al cliente** (paquete/campaña/hire) → el dinero entra ANTES de producir. Este es el gate: sin cobro, no arranca la producción.
3. **Crea el producto** de ese cliente.
4. **Genera el ADN** del producto (`generate-full-research`, 21 fases) — investigación de mercado, competencia, ángulos.
5. **Genera guiones** en Kreoon IA (`/scripts`) — 6 fases de IA, método CAST.
6. **Aprueba el guion** (o lo delega al cliente).
7. **Asigna** creador y editor al contenido en el board → estado `assigned`.
8. **Supervisa el pipeline** en Producciones mientras el talento graba/edita.
9. **Aprueba la entrega final** → `approved`.
10. **Paga al talento** (nómina, con comprobante) — recién aquí sale dinero, contra el cobro ya recibido en el paso 2.
11. Revisa **Finanzas** para salud del negocio (margen, mora, nómina pendiente).

### Datos que toca
`content`, `clients`, `products`, `organization_members`, `organization_member_roles`, `organization_member_badges`, `talent_payments`, `client_packages`, `org_financial_costs`, todos los `get_org_*` RPCs.

---

## PARTE 2 — CONTENT CREATOR (creador de contenido)

### Identidad
- **Grupo:** talent · **Dashboard:** `/creator-dashboard` ("Centro de Creador")
- Es quien **graba/produce** el contenido audiovisual. El brazo ejecutor de la producción.

### Cómo entra
Dos caminos:
- **Interno:** invitado a una organización → aparece como miembro con rol `content_creator`.
- **Freelance:** se registra solo, sin organización → plan básico gratis, trabaja vía marketplace (ver Parte 9).

### Qué ve (navegación — `creatorSections`)
**KREOON STUDIO** — Centro de Creador, Producciones, Portafolio, Kreoon IA, Academia.
**MARKETING & MEDIA** — todo MENOS estrategia de marketing (`/marketing` excluido). Sí: Social Hub, Anuncios, Generador de Anuncios, etc.
**KREOON MARKETPLACE** — Marketplace, Campañas, Mis Campañas, Favoritos + gestión de talento.
**CONFIG** — Mi Perfil, Booking, Campañas Gestionadas, Mi Plan, Configuración.

### Su dashboard (`/creator-dashboard`)
Tarjetas: **Asignados** (sin iniciar), **En Proceso** (antes de entrega), **Entregados**, **Novedades** (requieren atención), **Aprobados** (pendientes de cobro), **Por Cobrar COP/USD**, **Cobrado COP/USD**, **Balance Wallet**, **Aplicaciones** (a campañas, pendientes de respuesta).

### Qué puede hacer
- Ver solo el contenido donde **él es el creador asignado** (RLS lo restringe — `get_org_content` filtra por `creator_id = auth.uid()` para el grupo creator).
- Grabar y **subir el video** (a Bunny CDN vía `bunny-portfolio-upload`).
- Marcar su parte como completada (`recorded`).
- Aplicar a campañas del marketplace.
- Gestionar su perfil público de creador (para ser contratado).
- Ver sus cobros y wallet.

### Proceso end-to-end (el flujo del creador)
1. **Recibe una asignación** → el contenido aparece en "Asignados" (`assigned`).
2. **Lee el guion** aprobado.
3. **Graba** el contenido → estado `recording`.
4. **Sube el video** a la plataforma (Bunny CDN).
5. **Marca como grabado** → `recorded`. Pasa al editor.
6. Si hay correcciones que lo involucran, atiende "Novedades".
7. Cuando el contenido se **aprueba y paga**, ve el cobro en "Por Cobrar" → "Cobrado".
8. **(Freelance/marketplace):** además aplica a campañas, es contratado directo (hire), entrega, cobra por wallet.

### Datos que toca
`content` (solo los suyos), `video_hashes`, `portfolio_posts`/`portfolio_stories`, `creator_profiles`, `campaign_applications`, `creator_wallets`, `talent_payments` (lectura de los suyos).

---

## PARTE 3 — EDITOR

### Identidad
- **Grupo:** talent · **Dashboard:** `/editor-dashboard` ("Centro de Editor")
- Hace **post-producción**: edición de video, audio, motion, color.

### Cómo entra
Igual que el creador: interno (invitado con rol `editor`) o freelance.

### Qué ve (navegación — `editorSections`)
**KREOON STUDIO** — Centro de Editor, Producciones, Portafolio, Kreoon IA, Academia.
**MARKETING & MEDIA** — como el creador pero **sin estrategia de marketing**.
**MARKETPLACE** — sin el feed de campañas (los editores no aplican a campañas de creador; el guard `getMarketplaceSections` excluye 'editor' del feed de campañas).
**CONFIG**.

### Qué puede hacer
- Ver solo el contenido donde **él es el editor asignado** (RLS: `editor_id = auth.uid()`).
- Descargar el material grabado (Bunny raw download).
- Subir el video editado final.
- Mover el contenido por sus estados de edición.
- Marcar entrega y atender solicitudes de corrección.

### Proceso end-to-end (el flujo del editor)
1. **Recibe contenido grabado** (`recorded`) donde es el editor asignado.
2. **Descarga el material** crudo.
3. **Edita** → estado `editing`.
4. **Entrega la edición** → `review` / `delivered`.
5. Si el cliente pide cambios → `issue` → el editor **corrige** → `corrected`.
6. Cuando se **aprueba** → `approved`, y luego se le **paga** (auto-genera `talent_payments`).

> **Asignación automática:** si un creador también tiene rol editor, al asignarse como creador se auto-asigna como editor del mismo contenido (`auto_assign_editor_if_creator_is_editor`). También hay un "randomizer" opcional que asigna editor del pool al pasar a `recorded`.

### Datos que toca
`content` (solo los suyos como editor), Bunny raw storage, `talent_payments`, stats de editor en `profiles` (editor_completed_count, editor_on_time_count).

---

## PARTE 4 — ESTRATEGAS (Digital / Creative / Community Manager)

Los **3 comparten navegación** (`strategistSections`) y grupo talent, pero difieren en función.

### Identidad
| Rol | Foco |
|---|---|
| `digital_strategist` | Marketing digital, analytics, tráfico, ads, SEO, conversión |
| `creative_strategist` | Dirección creativa, concepto de marca, ángulos narrativos |
| `community_manager` | Gestión de comunidad y redes sociales |

- **Dashboard:** `/strategist-dashboard`

### Qué ven (navegación — `strategistSections`)
Es la navegación **más parecida a la de admin** (son el cerebro de la operación):
**KREOON STUDIO** — Centro de Control, Producciones, Portafolio, Kreoon IA, Academia, Ranking.
**MARKETING & MEDIA** — **completo, incluye `/marketing`** (a diferencia de creador/editor).
**GESTIÓN** — Talento & Equipo, Clientes, Finanzas.
**CONFIG**.

### Qué pueden hacer
- Generar y **escribir guiones** (Kreoon IA) — son los principales usuarios de Scripts.
- Definir la **estrategia por cliente** (calendario, ángulos, pilares TOFU/MOFU/BOFU).
- Ver el pipeline completo y gestionar clientes y talento.
- `digital_strategist` tiene rutas propias (guard `allowedRoles={["admin","digital_strategist"]}` y `["digital_strategist"]`) — acceso a herramientas de marketing/tráfico.
- Selector de cliente (`StrategistClientSelector`) para trabajar contextualizado por marca.

### Proceso end-to-end (el flujo del estratega)
1. **Selecciona un cliente** y estudia su ADN de marca/producto.
2. **Define la estrategia**: pilares, ángulos, calendario de contenido.
3. **Genera los guiones** en Kreoon IA (método CAST: Conocer-Atraer-Seducir-Transformar).
4. Los guiones pasan a **aprobación** (cliente/admin).
5. **Supervisa la ejecución** en el board.
6. (Digital) mide resultados en analytics/ads.

> **GAP conocido (ver auditoría de producto):** hoy la estrategia es guion-por-guion. La visión de "estrategia de marketing automática" (brief de marca → estrategia + calendario + N piezas + asignación de talento en un click) todavía NO existe — es lo principal por construir.

### Datos que tocan
`content`, `products`, `product_dna`, `scripts`, `clients`, RPCs de estrategia, `get_org_*` (con validación de membresía).

---

## PARTE 5 — CLIENT (cliente / marca)

### Identidad
- **Grupo:** client · **Dashboard:** `/client-dashboard` ("Inicio")
- Es el **cliente externo / la marca** para quien la agencia produce. Acceso acotado: revisar, aprobar, contratar.

### Cómo entra
- Invitado por la agencia (queda vinculado vía `client_users` a un `client`), o
- Marca independiente que se registra directo (`brand_members` / `active_brand_id`).
- Un usuario cliente puede estar vinculado a **varias empresas** y cambiar entre ellas ("Cambiar Empresa").

### Qué ve (navegación — `clientSections`)
**Menú principal (MVP simplificado):**
- Inicio (`/client-dashboard`), **ADN de Marca** (tab=dna), **Productos** (tab=products), **Portafolio** (tab=portfolio), Academia, **Facturas** (tab=facturas), **Mis Proyectos** (`/board?view=marketplace`), Campañas Gestionadas, Mi Plan, Configuración.

**MARKETPLACE**
- Explorar Talento (`/marketplace`), Favoritos, Mis Campañas, **Crear Campaña**.

### Qué puede hacer
- Ver **solo su propio contenido** (RLS: el grupo client solo ve contenido de sus `client_id`).
- **Revisar y aprobar/rechazar** guiones y videos (única acción de escritura sobre content — el trigger `trg_guard_client_content_update` lo restringe a cambiar solo `status`).
- Definir el **ADN de su marca** y gestionar sus **productos**.
- **Contratar talento** directo en el marketplace (payment-first con Stripe).
- **Crear campañas** para reclutar creadores.
- Ver sus **facturas** y su plan.

### Proceso end-to-end (el flujo del cliente) — cash-first
1. **Define el ADN de su marca** y crea sus **productos**.
2. **PAGA** el paquete/servicio a la agencia (o el hire/campaña en marketplace) → el pago es el gate: la producción arranca DESPUÉS de que el cliente paga.
3. La agencia le genera guiones → el cliente **revisa y aprueba** (o pide cambios → `issue`).
4. La agencia produce; el cliente **revisa el video final** → aprueba (`approved`) o pide correcciones.
5. **(Autoservicio marketplace):** explora talento → **contrata directo** (paga con Stripe → se crea el proyecto + escrow) → recibe entregables → libera el pago.
6. **(Campañas):** crea una campaña → **paga** → recibe aplicaciones de creadores → selecciona → ejecuta.
7. Ve sus **facturas** y comprobantes.

### Datos que toca
`content` (solo suyo, solo status), `clients`, `products`, `product_dna` (marca), `marketplace_projects`, `marketplace_campaigns`, `escrow_holds`, `client_packages`/facturas.

---

## PARTE 6 — STUDENT (estudiante)

### Identidad
- **Grupo:** student · **Dashboard:** `/academia`
- Rol **global**: NO requiere organización. Acceso **exclusivo al módulo Academia**.

### Cómo entra
Registro **express** (sin checkbox legal, sin verificación de mayoría de edad — decisión de producto). Aterriza directo en Academia. Puede luego hacer **upgrade** a creador desde su perfil (para pasar del aprendizaje a la ejecución en el marketplace).

### Qué ve
Solo Academia: home, cursos, lecciones, (comunidad si está habilitada).

### Qué puede hacer
- Explorar y **inscribirse en cursos** (gratis o pagos — el enrollment valida pago vía `academy_checkout_intents`).
- **Cursar lecciones** (video con URL firmada de Bunny, solo si la lección está desbloqueada por `academy_evaluate_unlock`).
- Responder **quizzes** (el progreso a `completed` requiere aprobar el quiz de fin de lección).
- Ganar XP, badges, subir de nivel.
- Obtener **certificado** al completar (requiere `completion_pct` real, no falsificable).

### Proceso end-to-end (el flujo del estudiante)
1. **Registro express** → aterriza en `/academia`.
2. **Explora** el catálogo de cursos.
3. **Se inscribe** (RPC `enroll_in_course` valida curso gratis o intento de pago pagado).
4. **Cursa las lecciones** — el desbloqueo es condicional (nivel/XP/progreso/quiz/drip/badge).
5. **Aprueba quizzes** → la lección se marca `completed`.
6. Al 100% → **certificado**.
7. **(Opcional)** upgrade a creador → entra al loop principal como talento.

### Datos que toca
`academy_enrollments`, `academy_lesson_progress`, `academy_courses`, `academy_lessons`, `academy_unlock_rules`, certificados. **NO toca** ninguna tabla de organización.

> **Nota estratégica (auditoría de producto):** Academia hoy tiene 5 inscripciones y 77 tablas. Está desconectada del loop principal (student es global sin org). Recomendación pendiente: reducir a cursos+certificación **cosidos al marketplace** (graduarse → perfil de creador contratable).

---

## PARTE 7 — Roles y estados transversales

Estos no son roles nuevos, sino **modos** que alteran lo que un usuario ve/puede.

### Multi-rol
Un usuario puede tener varios roles (ej. `content_creator` + `editor`, o talent + client). El sidebar **combina** las secciones de navegación de todos sus grupos (`combineNavSections`). El `activeRole` (selector de rol) determina qué panel/dashboard ve en cada momento. Un creador+editor con activeRole='creator' ve el panel de creador, no el de editor.

### Freelance (talent sin organización)
Creador/editor que se registra **sin org** → plan **básico gratis** → navegación reducida (`freelanceSections`):
- MI NEGOCIO — Dashboard, Mis Proyectos, Academia.
- MARKETPLACE — Explorar, Campañas, **Billetera** (`/wallet`).
- SOCIAL — Social Hub.
- CONFIG.

Su negocio es 100% marketplace: aplica a campañas o es contratado directo, entrega, cobra por wallet.

### Talento en org con plan básico
Miembro de org pero con plan personal básico → menú **reducido** (`basicTalentInOrgSections`): Tablero, Producciones, Portafolio, Kreoon IA, Academia, Social Hub, Marketplace (Explorar + Campañas), Config. Sin acceso a gestión/finanzas.

### Usuario bloqueado (gate de referidos)
Si no ha completado el gate de referidos (`useReferralGate`) → solo ve `lockedUserSections`: "Obtener Llaves" (`/unlock-access`) + Mi Perfil. Todo lo demás bloqueado hasta desbloquear.

### Platform Root / Superadmin (el dueño de KREOON)
Admin especial (emails hardcoded en `is_platform_admin` / `is_platform_root`). Ve además:
- CRM PLATAFORMA completo, **Pagos Pendientes** globales, **Papelera** (`platformRootOnly`).
- Puede **impersonar** a cualquier usuario (`ImpersonationContext`) para soporte — ve la plataforma como ese usuario sin cambiar sus credenciales.
- Cambia entre organizaciones (`RootOrgSwitcher`).

### Embajador (Ambassador) — es BADGE, no rol
Nivel bronze/silver/gold en `organization_member_badges`. Es un **privilegio/logro**, separado del sistema de roles. Un embajador que crea contenido interno de la marca lo hace **sin pago monetario** (recibe UP points/reputación en vez de dinero — `validate_internal_org_content` fuerza pago 0 + `reward_type='UP'`).

---

## PARTE 8 — Matriz de acceso (rol × módulo)

| Módulo | Admin | Creador | Editor | Estrategas | Cliente | Student |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Centro de Control / Dashboard | ✅ full | ✅ propio | ✅ propio | ✅ full | ✅ propio | — |
| Producciones (board) | ✅ todo | ✅ suyos | ✅ suyos | ✅ todo | ✅ suyos (revisión) | — |
| Kreoon IA (guiones/ADN) | ✅ | ✅ | ✅ | ✅ (principal) | — | — |
| Academia | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (único) |
| Marketing (estrategia) | ✅ | — | — | ✅ | — | — |
| Social Hub / Anuncios | ✅ | ✅ | ✅ | ✅ | — | — |
| Talento & Equipo | ✅ | vía marketplace | vía marketplace | ✅ | — | — |
| Clientes (CRM agencia) | ✅ | — | — | ✅ | — | — |
| Finanzas (org) | ✅ | ver cobros | ver cobros | ✅ | ver facturas | — |
| CRM Plataforma | ✅ (platform admin) | — | — | — | — | — |
| Marketplace (explorar/contratar) | ✅ | ✅ | parcial | ✅ | ✅ | — |
| Wallet / Billetera | ✅ | ✅ | ✅ | ✅ | pagos | — |
| Streaming / Live | admin-only (en construcción) | — | — | — | — | — |

---

## PARTE 9 — Los 5 flujos completos de la plataforma (end-to-end)

### Flujo A — Producción interna (agencia → cliente) — CASH-FIRST
```
Admin da de alta cliente
  → COBRA al cliente (paquete/campaña) ← GATE: el dinero entra primero
  → crea producto → Estratega genera ADN + guion (Kreoon IA)
  → Cliente aprueba guion
  → Admin asigna creador + editor
  → Creador graba (recorded)
  → Editor edita (review)
  → Cliente aprueba video (approved)
  → Contenido entregado (delivered)
  → Admin paga al talento (paid) ← sale dinero contra el cobro ya recibido
```

### Flujo B — Contratación directa (cliente → creador externo)
```
Cliente explora marketplace
  → elige creador → paga con Stripe (payment-first)
  → se crea marketplace_project + escrow_holds (funded)
  → creador entrega
  → cliente aprueba → se libera el escrow (release_escrow)
  → creador cobra en su wallet
```
> **Estado real:** `marketplace_projects = 0` — este flujo nunca completó un proyecto en producción (los bugs de pago se arreglaron en la sesión de remediación de julio; requiere smoke test).

### Flujo C — Campaña de marketplace (cliente → varios creadores)
```
Cliente/marca crea campaña (wizard)
  → paga (campaign_publish → escrow) o publica (exchange/canje)
  → creadores ven el feed de campañas y aplican
  → cliente selecciona aplicaciones
  → creadores ejecutan y entregan
```

### Flujo D — Academia (formación)
```
Student se registra (express)
  → explora cursos → se inscribe (gratis/pago)
  → cursa lecciones (unlock condicional + quiz)
  → obtiene certificado
  → (upgrade) se vuelve creador → entra al loop principal
```

### Flujo E — Freelance (creador independiente)
```
Creador se registra sin org (plan básico gratis)
  → completa su perfil de creador (profile-builder)
  → aparece en el marketplace
  → aplica a campañas / es contratado directo
  → entrega → cobra por wallet
```

---

## PARTE 10 — Notas de arquitectura relevantes por rol

- **Aislamiento multi-tenant:** toda query filtra por `organization_id`; las RLS lo fuerzan a nivel de BD. Un usuario de una org NUNCA ve datos de otra (los RPCs `get_org_*` validan membresía con `assert_org_member`).
- **Seguridad de escritura del cliente:** el trigger `trg_guard_client_content_update` impide que un cliente-portal modifique cualquier campo de `content` que no sea `status`.
- **Escalada de privilegios cerrada:** un talento no puede auto-asignarse admin (`register_user_to_organization` valida `auth.uid()` y bloquea `p_role='admin'`).
- **Impersonation:** solo platform admin; usa `effectiveRoles` en vez de `realRoles` en toda la UI para ver como el usuario objetivo.
- **White-label:** la organización puede renombrar "KREOON STUDIO"/"KREOON MARKETPLACE" y poner su logo (`useWhiteLabel`).
- **Tokens de IA:** cada usuario/org tiene un panel de tokens de IA (`AITokensPanel`); admin puede cambiar de contexto, cliente lo ve en solo-lectura.

---

## Apéndice — Fuentes en el código
- Definición de roles: `src/lib/roles.ts`
- Grupos de permiso: `src/lib/permissionGroups.ts`
- Navegación por rol: `src/components/layout/Sidebar.tsx`
- Guards de ruta: `src/App.tsx` (`ProtectedRoute`, `RequireAcademyAccess`, `RootOnlyRoute`)
- Dashboards: `src/pages/{Dashboard,CreatorDashboard,EditorDashboard,StrategistDashboard,ClientDashboard,FreelancerDashboard}.tsx`
- Pipeline de estados: `content.status` en `src/types/database.ts`
- Auditoría de producto (uso real + recomendaciones): `docs/AUDITORIA-PRODUCTO-2026-07-08.md`
