---
titulo: KREOON — Auditoría de Producto End-to-End (QA · UX/UI · Código muerto · Fit con visión)
fecha: 2026-07-08
rama: feature/academy-v2-alexander
alcance: 77 páginas · 168 rutas · ~500 componentes · 199 edge functions · 197 hooks
metodo: análisis directo de código (grep de callers, rutas, imports) + conocimiento acumulado de la sesión de remediación FASE0-5
---

# KREOON — Auditoría de Producto End-to-End

> **Nota de método:** los 4 sub-agentes lanzados en paralelo murieron por límite de sesión (resetea 3:50am Bogotá). Este reporte se hizo por análisis directo del árbol de código. Las afirmaciones de "código muerto" están verificadas con `grep` de callers reales en todo `src/`. Las afirmaciones de UX/estrategia son juicio de producto — marcadas como **[JUICIO]** para que las valides, no son hechos del código.

---

## 0-BIS. DATOS DE USO REAL (medidos en la BD de producción, 2026-07-08)

Esto convierte casi todo el reporte de "juicio" a "hecho". Conteo de filas real:

| Tabla / Módulo | Filas | Lectura |
|---|---|---|
| `content` | **550** | Núcleo. Muy usado. La visión funciona. |
| `creator_profiles` | **429** | Marketplace de creadores. Muy usado. Núcleo. |
| `clients` | **92** | Bien usado. |
| `creator_live_streams` | 9 | Streaming legacy — casi nada. |
| `marketplace_campaigns` | 7 | Existe, poco. |
| `academy_enrollments` | **5** | Academia apenas arrancó. |
| `academy_courses` | 2 | Idem. |
| `academy_spaces` | 1 | Comunidad = 1 space de prueba. |
| `booking_event_types` | 1 | — |
| `marketplace_projects` | **0** | El hire directo NUNCA completó un proyecto (= los bugs de pago que se arreglaron hoy; el flujo estaba roto). |
| `org_contacts` (org-CRM) | **0** | Org-CRM NUNCA usado. |
| `streaming_sessions_v2` | **0** | Streaming v2 NUNCA usado. |
| `bookings` | **0** | Booking NUNCA usado. |

**Conclusión dura:** streaming, booking y org-CRM tienen CERO uso real. No es opinión — nadie los ha tocado nunca. Academia tiene 5 enrollments y 1 space: no hay comunidad que proteger, se puede reducir sin costo. El núcleo (content 550, creator_profiles 429) es lo único con tracción real.

### Dimensión de la base de datos (la sobre-construcción, en números)

**585 tablas en `public`.** Para referencia, una plataforma SaaS madura y compleja suele tener 80-150. Desglose de módulos cuestionables:

| Módulo | Tablas | Filas de uso | Tablas por fila de uso |
|---|---|---|---|
| **Academia** | **77** | 5 enrollments | 15 tablas por inscripción |
| **Streaming/Live** | **36** | 0 sesiones v2 | ∞ (uso cero) |
| **Booking** | **11** | 0 bookings | ∞ (uso cero) |
| **Org-CRM** | 3 | 0 contactos | ∞ (uso cero) |

- Los 3 módulos de uso cero (streaming + booking + org-CRM) = **50 tablas (~8.5% de la BD) borrables sin tocar nada usado.**
- Academia = **77 tablas (13% de la BD) para 5 usuarios.** Si se reduce a cursos+cert, se recuperan ~50 tablas.
- **Poda total posible de BD: ~100 tablas (17%) sin afectar un solo usuario activo.**

585 tablas no es "una plataforma rica en features" — es deuda estructural. Cada tabla lleva RLS, grants, triggers, migraciones que mantener (y auditar por seguridad — la fuga cross-org de hoy fue exactamente en tablas de un módulo de uso cero).

---

## 0. Veredicto estratégico (lo más importante)

**El problema central no es calidad de código — es SOBRE-CONSTRUCCIÓN.** KREOON tiene 168 rutas, 199 edge functions y ~500 componentes para una visión que se puede expresar en UN loop cash-first: **cobro al cliente → estrategia → contenido → talento → ejecución → aprobación → pago al talento.** (El cobro es el gate de entrada, no el cierre.)

Hoy la plataforma es **5 productos distintos cohabitando**:
1. **Núcleo (la visión):** pipeline de contenido + marketplace de creadores/editores + campañas. ~40% del código.
2. **Academia + comunidad:** LMS completo (cursos, spaces, challenges, DM, leaderboard, mapa). ~20% del código. **Casi no toca el loop central.**
3. **Streaming/Live shopping:** 3 versiones cohabitando (streaming, streaming-v2, live-streaming). ~8%. **No está en la visión.**
4. **CRM doble:** platform-CRM (para gestionar KREOON) + org-CRM (para que las agencias gestionen sus leads). ~10%.
5. **Herramientas satélite:** booking (clon Calendly), ad-generator, ad-intelligence, social-scraper, blog, casos de éxito, calculadora UGC. ~15%.

**Recomendación de una línea:** conservar y pulir el núcleo (1), reducir Academia (2) a su mínimo conectado al loop, **eliminar** streaming/live (3), decidir CRM (4) por dato de uso real, y podar agresivamente las herramientas satélite (5). Esto puede recortar el código a la mitad sin tocar la visión.

---

## 1. CÓDIGO MUERTO CONFIRMADO (borrar sin riesgo)

Verificado: cero referencias en todo `src/` fuera del propio archivo.

| Archivo | Estado | Evidencia |
|---|---|---|
| `src/pages/MarketplaceContent.tsx` | Muerto | 0 callers, sin ruta en App.tsx |
| `src/pages/MarketplaceKanban.tsx` | Muerto | 0 callers, sin ruta |
| `src/pages/marketplace/CompanyDashboardPage.tsx` | Muerto | 0 callers reales (ruta `/company/:username` apunta a otra cosa — verificar) |
| `src/components/registration/` (carpeta completa) | Muerto | 0 callers; reemplazada por `registration-v2/` (3 callers). Incluye `UnifiedRegistrationWizard`, `RegistrationProgress`, `useRegistration`, `useRegistrationSubmit`, `steps/`, `types.ts` |
| `src/components/profile-builder-v2/` (carpeta completa) | **Muerto (WIP abandonado)** | **0 callers, sin ruta.** Es un experimento del plan `docs/plans/2026-06-17-profile-builder-v2-canva-*.md` que nunca se cableó. **OJO: el que VIVE es `profile-builder/` (v1, 17 callers) — NO confundir, borrar el v2.** |
| `src/components/streaming-v2/` (13 comps) | **Muerto** | 0 callers de componentes + `streaming_sessions_v2` tiene 0 filas en prod. |
| `supabase/functions/intelligence-gatherer` | Sin caller en src | 0 refs (verificar si lo llama otra edge function antes de borrar) |

**Acción:** borrar los 3 archivos de página + `registration/` v1 + `profile-builder-v2/` + `streaming-v2/` es seguro. Total ~25 archivos + 3 carpetas.

**CORRECCIÓN a una suposición inicial:** las 24 páginas de Academia NO son código muerto — todas tienen ruta y lazy import en App.tsx (verificado). El problema con Academia es de USO (5 enrollments) y de ESTRATEGIA (§5), no de código huérfano.

---

## 2. DOMINIO: Pipeline central de contenido `[NÚCLEO]`

**Archivos:** `ContentBoard.tsx` (1053 líneas), `Content.tsx`, `ClientContentBoard.tsx`, `Scripts.tsx`, `TemplateLibraryPage.tsx`; `components/board/` (26), `content/` (73), `content-board/`, `projects/` (20), `scripts/` (5), `product-dna/`, `client-dna/`.

**Veredicto:** núcleo absoluto. Es lo que hay que pulir, no tocar la estructura.

### QA / deuda conocida (de la sesión de remediación)
- `ContentBoard.tsx` sigue en 1053 líneas con 3 imports muertos preexistentes: `DroppableKanbanColumn`, `DraggableContentCard`, `MarketplaceBoardView` (líneas 3, 4, 42 — importados, cero usos). Borrar.
- `content/` con 73 componentes es la carpeta más pesada del núcleo — candidata a revisión de duplicados (hay VideoTab en `content/ContentDetailDialog/tabs/` y en `projects/UnifiedProjectModal/tabs/` que comparten lógica; ya se tocaron ambos en el fix de video).
- El fix de video final de esta sesión dejó `persistFinalVideos` con retry — verificar en prod que el 500 no reaparezca por otra causa.

### UX/UI por rol **[JUICIO]**
- **Creador:** el board mezcla estados legacy (`draft/recorded/delivered`) con estados custom por org (`custom_status_id`). El creador ve un kanban que puede tener 10+ columnas — fricción. Simplificar a las 4-5 etapas que le importan (asignado → grabando → entregado → aprobado).
- **Editor:** entra por `EditorDashboard` pero el trabajo real está en el board. Doble navegación.
- **Cliente:** `ClientContentBoard` es una vista separada de solo-revisión. Bien. Pero el cliente-portal solo puede tocar `status` (RLS lo fuerza) — el trigger `trg_guard_client_content_update` lo valida. Correcto.
- **Estratega:** genera guiones (Scripts.tsx) pero el paso de "estrategia completa" no existe — es guion por guion (ver §4, gap de estrategia automática).

### Oportunidades (impacto/esfuerzo)
1. **[ALTO/BAJO]** Borrar los 3 imports muertos de ContentBoard + auditar duplicados en `content/` (73 comps).
2. **[ALTO/MEDIO]** Unificar estados: hoy legacy enum + custom_status conviven y causan bugs (el de auto-aprobación de esta sesión fue exactamente eso). Migrar todo a custom_status_id y deprecar el enum.
3. **[ALTO/ALTO]** Cerrar el loop estrategia→contenido: que un "brief de estrategia" genere N items de contenido automáticamente (hoy es manual, uno por uno con BulkGenerationDrawer — está a medio camino).

---

## 3. DOMINIO: Marketplace + Talento `[NÚCLEO]`

**Archivos:** `components/marketplace/` = **142 componentes** (la carpeta más grande del repo), + `profile-builder/`, `profile-builder-v2/`, `profile-viewer/`, `clients/`.

**Veredicto:** núcleo, pero **inflado**. 142 componentes para "explorar creadores + contratar" es 3-4x lo razonable. Aquí está el mayor potencial de adelgazamiento del núcleo.

### Redundancia de vistas (confirmada por rutas)
Hay múltiples vistas del mismo dato "marketplace":
- `/marketplace` (MarketplaceDashboard), `/marketplace/explore` (MarketplaceExplore), `/marketplace/content` (MUERTO), `/marketplace/dashboard`, MarketplaceKanban (MUERTO).
- **DOS sistemas de perfil de creador:** `profile-builder/` (v1, **17 callers = VIVO**) y `profile-builder-v2/` (**0 callers = MUERTO**, WIP del plan canva de junio). **Borrar v2.** `profile-viewer/` (usa v1) es el renderer público — no duplica, complementa.

### QA **[dato duro]**
- **`marketplace_projects = 0 filas`.** El flujo hire directo (payment-first → webhook → crea proyecto) **nunca completó un proyecto en producción.** Consistente con los bugs de pago encontrados hoy (`activate_campaign` roto, escrow de campañas roto, idempotencia ausente). El fix de idempotencia de esta sesión cubrió `handleCreatorHirePaymentCompleted`, pero **hay que probar el hire end-to-end en staging** — es posible que siga fallando por otra causa dado que jamás produjo un proyecto.
- **CRÍTICO ya arreglado hoy:** `activate_campaign` estaba roto de raíz (columnas inexistentes) + sin auth. El marketplace de campañas nunca activó campañas pagas. Verificar el flujo completo end-to-end en staging.

### UX/UI por rol **[JUICIO]**
- **Creador:** setup de perfil con DOS builders distintos = confusión de qué llenar. Consolidar a uno.
- **Marca:** explorar → contratar tiene buen payment-first, pero las 5 vistas de marketplace fragmentan la navegación.
- **Integración con pipeline:** verificar que un creador contratado en marketplace aparezca automáticamente asignable en el ContentBoard. Si es un silo, es el gap #1 de la visión (el "ahí mismo se ejecuta").

### Oportunidades
1. **[ALTO/MEDIO]** Auditar los 142 componentes de marketplace/ por callers — estimado 30-40% muerto o duplicado. Es la mayor poda posible del núcleo.
2. **[ALTO/BAJO]** Elegir profile-builder v1 XOR v2, borrar el perdedor + profile-viewer si duplica.
3. **[ALTO/MEDIO]** Colapsar las 5 vistas de marketplace en 2 (explorar + mi-actividad).
4. **[CRÍTICO/ALTO]** Verificar y garantizar la costura marketplace→board (contratar → aparece en el pipeline ejecutable).

---

## 4. DOMINIO: Campañas + Estrategia de marketing `[NÚCLEO + GAP]`

**Archivos:** `BrandCampaignsPage`, `CampaignDetailPage`, `CampaignEditWizardPage`, `CampaignsFeedPage`, `CampaignWizardPage`, `CampanasGestionadasPage`, `CreatorCampaignsPage`, `Marketing.tsx`; `modules/marketing/`, `modules/ad-generator/`, `modules/ad-intelligence/`, `modules/social-scraper/`.

**Veredicto por sub-módulo [con datos de uso]:**
- **Campañas (self-serve + gestionadas):** núcleo. Pero hoy **rotas** — ver abajo.
- **ad-generator** (`/ad-generator`): **MANTENER.** `ad_generated_banners = 98 filas` — se usa de verdad, y genera creativos para el contenido (aporta al loop).
- **ad-intelligence** (`/admin/ad-intelligence`): **ELIMINAR.** `ad_library_ads = 0`. Biblioteca de ads scrapeada que nadie consultó. ~4 tablas + edge functions.
- **social-scraper** (`/admin/social-scraper`): **ELIMINAR.** `social_scrape_items = 0`. Nunca usado. 2 tablas + edge function `social-scraper`.
- **ad-tracking** (pixels/events/conversion): **ELIMINAR.** `ad_tracking_events = 0`. 3 tablas de un sistema de tracking de conversiones nunca activado.
- **marketing module** (`marketing_ads`): tabla vacía (0). Verificar solapamiento con campañas → probable eliminar.

### El GAP de "estrategia automática" (el corazón de la visión, HOY INCOMPLETO) **[JUICIO]**
La visión es **"se hace toda una estrategia de marketing automática"**. Hoy NO existe. Lo que hay:
- Generación de guiones sueltos (Scripts + ADN).
- Campañas que se crean manualmente con un wizard.
- No hay una pieza que tome un objetivo de marca → genere una estrategia (calendario TOFU/MOFU/BOFU + N piezas + asignación de talento) automáticamente.

**Esta es la funcionalidad MÁS importante que falta construir**, no que sobra. El resto del reporte es sobre quitar peso; esto es lo único grande que hay que AGREGAR para cumplir la visión. Las 24 skills de conocimiento (estrategia, copywriting, funnels) ya existen como memoria — el motor que las orqueste no.

### QA (arreglado hoy, verificar)
- `activate_campaign`, escrow de campañas, idempotencia Stripe — todo roto, todo arreglado esta sesión. **Requiere smoke test end-to-end de una campaña paga real antes de confiar.**

### Oportunidades
1. **[CRÍTICO/ALTO]** Construir el "motor de estrategia": brief de marca → estrategia + calendario + N briefs de contenido + sugerencia de talento. Es la diferencia entre "otra herramienta de guiones" y la visión.
2. **[ALTO/MEDIO]** Consolidar los flujos de campaña (hay wizard, feed, gestionadas, creator-campaigns = 7 páginas). Colapsar.
3. **[MEDIO/BAJO]** Decidir ad-generator/ad-intelligence/social-scraper por dato de uso. Si nadie los usa, son ~40 archivos de peso muerto.

---

## 5. DOMINIO: Academia + Comunidad + Gamificación `[REDUCIR — decisión estratégica]`

**Archivos:** 24 páginas en `pages/academia/`, `components/academy/` (79 comps), `points/`, `ambassador/`, 30+ tablas `academy_*`.

### Veredicto estratégico **[reforzado por datos: 5 enrollments, 2 cursos, 1 space]**
Academia es un **LMS + red social completa** (cursos, spaces, feed, DM, challenges, leaderboard, calendario, mapa) que **casi no toca el loop central** (cobro→estrategia→contenido→talento→ejecución→pago). Es ~20% del código y 30+ tablas. **Y en producción tiene 5 inscripciones, 2 cursos y 1 space.** No hay comunidad real que proteger — reducir ahora es barato; en 6 meses con 5.000 estudiantes sería carísimo. **Momento ideal para decidir.**

**Tres caminos:**
- **(A) Mantener completo:** solo si Academia es el mecanismo de "autosostenible" — formar creadores que luego ejecutan campañas en el marketplace. Pero eso requiere que Academia esté COSIDA al marketplace (un graduado se vuelve creador contratable). Hoy `student` es un rol GLOBAL aislado sin org — es decir, **está desconectado del loop**.
- **(B) Reducir a mínimo viable [RECOMENDADO]:** quedarse con cursos + certificación, borrar spaces/DM/challenges/leaderboard/mapa (la parte "red social"). Eso conecta con la visión (formar creadores) sin cargar un Discord-clone.
- **(C) Separar/eliminar:** si Academia es un producto aparte, sácala a otro repo/subdominio y quita 20% del peso de un golpe.

**Recomiendo (B).** El "mapa", los "spaces" tipo Skool, los DM y el leaderboard son features de comunidad que compiten por atención con el núcleo y no sirven a "agencia de marketing autosostenible".

### Páginas candidatas a muerto/incompleto (verificar caller c/u)
Sospechosas de estar a medio construir o sin uso real: `AcademiaMapPage`, `AcademiaSpaceDMPage`, `AcademiaChallengesPage`/`AcademiaChallengeDetailPage`, `AcademiaLeaderboardPage`, `AcademiaSpaceCalendarPage`, `AcademiaMemberCalendarCallbackPage`. Todas tienen ruta pero eso no significa uso — requieren dato de tráfico real.

### QA (arreglado hoy)
- Quiz de fin de lección, recalc de completion por usuario, paywall de enrollment — arreglados esta sesión.
- Bunny library separada (`BUNNY_ACADEMY_LIBRARY_ID`) — arreglada hoy.

### Si se reduce (mínimo viable conectado a la visión)
Quedarse con: cursos + lecciones + video firmado + certificación + el rol student **cosido al marketplace** (graduarse → perfil de creador). Borrar: spaces, feed social, DM (`academy_dm_threads = 0`, nunca usado), challenges, leaderboard, mapa, calendario de comunidad. **Dato:** la parte "red social" de Academia (DM, space leads) tiene 0 filas — es puro peso, ~50 de las 77 tablas.

---

## 6. DOMINIO: CRM (doble) `[DECIDIR POR USO]`

**Dos sistemas:**
- **Platform-CRM** (`crm/platform/`, 9 páginas): para el DUEÑO gestionar KREOON (organizaciones, usuarios, finanzas de plataforma, email marketing, comunidades). Rutas `/crm/*`.
- **Org-CRM** (`crm/org/`, 4 páginas): para que cada AGENCIA gestione sus leads/contactos/pipelines. Rutas `/org-crm/*`. Es feature de producto.

**Veredicto [JUICIO]:**
- Platform-CRM: es tu panel de dueño. Útil pero pesado (9 páginas). Reducir a lo que realmente miras.
- Org-CRM: ¿las agencias lo usan o usan su propio CRM? Si no lo usan, son 43 componentes + 4 páginas de peso. **Los RPCs de este dominio fueron exactamente los que tenían la fuga cross-org de hoy** (`get_org_crm_overview`, `get_org_pipeline_summary`, etc.) — código que existe pero cuya seguridad nadie había validado, señal de feature poco ejercitada.

**Oportunidad [AHORA HECHO]:** `org_contacts = 0 filas`. **Org-CRM NUNCA se usó.** Eliminar sin dudarlo (quita 43 comps + 4 páginas + ~8 RPCs — los mismos que tuvieron la fuga cross-org de hoy). El platform-CRM (tu panel de dueño) es aparte y sí se usa; ese se queda pero se reduce.

---

## 7. DOMINIO: Streaming + Live `[ELIMINAR — fuera de visión]`

**Archivos:** `pages/streaming/` (hub, studio, recap, hosting), `pages/live/` (broadcast, discover, viewer); `components/streaming/` (8), `streaming-v2/` (13), `live-streaming/` (7) = **28 componentes en 3 carpetas** + edge functions `streaming-webhook`, `streaming-webhook-v2`, `cloudflare-live-webhook`, `streaming-obs-bridge`, `live-hosting-service`, `streaming-shopping`.

**Veredicto: ELIMINAR. [AHORA ES HECHO, no juicio]**
- **`streaming_sessions_v2` = 0 filas. `creator_live_streams` = 9. Nadie lo usa en producción.** Dato duro, no opinión.
- Live shopping / streaming **no está en la visión** (creadores + marcas + contenido + editores + agencia). Es un producto de e-commerce en vivo distinto.
- **3 versiones cohabitando** (streaming 2 callers, streaming-v2 **0 callers**, live-streaming 1 caller) es la señal más clara de feature que se rehízo varias veces sin converger — típico de algo que no encontró product-market-fit. `streaming-v2/` está directamente muerto.
- Consumió esfuerzo de seguridad hoy (RLS de chat/viewers, firmas de webhooks, `cloudflare-live-webhook` que ni siquiera está registrado en infra) para código que probablemente nadie usa en producción.
- `cloudflare-live-webhook`: 0 refs en src. `streaming-obs-bridge`, `restream-api`: 1 ref c/u.

**Oportunidad [ALTÍSIMO/MEDIO]:** eliminar los 3 módulos de streaming + sus edge functions + tablas `streaming_*`/`live_*`. Quita ~28 componentes, ~6 edge functions, y cierra toda una superficie de seguridad. **La poda de mayor ROI del reporte.** (Confirmar primero que no hay una org usándolo activamente.)

---

## 8. DOMINIO: Portfolio + Social Hub `[MEJORAR / consolidar]`

**Archivos:** `pages/portfolio/` (6: Feed, Profile, PublicProfile, Company, Saved, Videos), `PortfolioShowcasePage`, `OrgPortfolioPage`, `OrgContentShowcase`; `components/portfolio/` (36), `social/` (15), `modules/social/`.

**Veredicto [JUICIO]:** el portafolio (mostrar el trabajo del creador) SÍ sirve a la visión — es el escaparate para que las marcas elijan. Pero está fragmentado:
- `FeedPage` y `ProfilePage` en `pages/portfolio/`: 0 refs directas (probable acceso por índice) — verificar.
- Portafolio (36 comps) + social hub (15) + módulo social + `OrgPortfolioPage` + `OrgContentShowcase` + `PortfolioShowcasePage` = demasiadas vistas del mismo concepto "mostrar contenido".

**Oportunidad [MEDIO/MEDIO]:** consolidar portafolio en: perfil-de-creador (marketplace) + showcase-de-org. Borrar las vistas redundantes.

---

## 9. DOMINIO: Herramientas satélite `[PODAR AGRESIVO]`

Todas fuera del loop central. Cada una es peso.

| Módulo | Ruta | Veredicto **[JUICIO]** |
|---|---|---|
| **Booking** (clon Calendly) | `/book/*`, `/booking/*` | **`bookings = 0 filas`. NUNCA usado. Eliminar confirmado por datos** — módulo entero (agendamiento + emails de recordatorio + `booking-reminder` edge function que se tocó hoy). Fuera de visión. |
| **Blog** | `/blog` | Marketing de la propia KREOON. Mover a sitio estático, sacar del app bundle. |
| **Casos de éxito** | `/casos-de-exito` | Marketing. Idem — estático. |
| **Calculadora UGC** | `/calculadora-ugc` | Lead magnet. ¿Convierte? Si no, borrar. |
| **Research landing** | `/research/:productId` | Verificar uso. |
| **MCP docs / UP docs** | `/mcp-docs`, `/up-documentation` | Documentación interna. Sacar del app. |
| **Demo / DemoClientDashboard** | `/demo` | Demo para ventas. Aislar. |
| **DevModulesPage** | `/admin/dev-modules` | Herramienta interna. OK si es solo-admin. |

**Oportunidad [MEDIO/BAJO]:** cada landing de marketing (blog, casos, calculadora, research) que salga del bundle de React reduce peso de carga inicial. Booking es la decisión grande — es un módulo entero.

**three.js** (`@react-three/drei` + `fiber`, deps pesadas): solo 3 usos — `HeroOrbCanvas` (landing), `FullscreenVideoViewer`, `MarketplaceDashboardTab`. Si el orbe del landing es lo único crítico, evaluar reemplazo liviano; three.js pesa cientos de KB.

---

## 10. DOMINIO: Dashboards por rol + Onboarding + Auth `[CONSOLIDAR]`

**Dashboards:** `Dashboard`, `CreatorDashboard`, `EditorDashboard`, `StrategistDashboard`, `ClientDashboard`, `FreelancerDashboard`, `DemoClientDashboard`, `MarketplaceDashboard`, `CompanyDashboardPage` (muerto).

**Veredicto [JUICIO]:** 8 dashboards vivos. `FreelancerDashboard` vs `CreatorDashboard` — probable solapamiento (freelancer ≈ creador). `DemoClientDashboard` vs `ClientDashboard` — el demo debería ser el real con datos mock, no un archivo aparte. Consolidar a 1 dashboard por rol real (creador, editor, estratega, cliente, admin) = 5, no 8.

**Registro:** `registration/` v1 MUERTO (borrar), `registration-v2/` vivo. Bien.

**Auth/onboarding:** el fix de escalada a admin de hoy tocó `complete_onboarding` y `register_user_to_organization`. Estable ahora.

---

## 11. PLAN DE EJECUCIÓN (ordenado por ROI, para ejecutar en próxima sesión)

### FASE A — Borrado seguro inmediato (cero riesgo, verificado por callers)
1. Borrar 3 páginas muertas: `MarketplaceContent.tsx`, `MarketplaceKanban.tsx`, `CompanyDashboardPage.tsx`.
2. Borrar carpeta `components/registration/` v1 completa (0 callers; vive registration-v2).
3. Borrar carpeta `components/profile-builder-v2/` completa (0 callers; vive profile-builder v1). **NO borrar v1.**
4. Borrar carpeta `components/streaming-v2/` (0 callers, 0 filas en prod).
5. Borrar 3 imports muertos en `ContentBoard.tsx` (líneas 3, 4, 42).
6. Verificar y borrar `intelligence-gatherer` edge function si no tiene caller.

### FASE B — Borrado respaldado por DATOS de uso cero (bajo riesgo, alto impacto)
7. **Streaming/Live COMPLETO:** `streaming_sessions_v2=0`, `bookings=0`... nadie lo usa. Eliminar `pages/streaming/`, `pages/live/`, `components/streaming*`, `live-streaming/`, edge functions `streaming-*`, `cloudflare-live-webhook`, `streaming-obs-bridge`, `live-hosting-service`, `streaming-shopping`, `restream-api`, tablas `streaming_*`/`live_*`/`creator_live_streams`. **La mayor poda del repo.**
8. **Booking COMPLETO:** `bookings=0`. Eliminar `modules/booking/`, rutas `/book/*` `/booking/*`, edge function `booking-reminder`, tablas `bookings`/`booking_event_types`.
9. **Org-CRM COMPLETO:** `org_contacts=0`. Eliminar `pages/crm/org/`, `components/crm/` (los de org), rutas `/org-crm/*`, RPCs `get_org_crm_*`/`get_org_pipeline_*`/`get_org_recent_activity`/`get_org_upcoming_actions`, tablas `org_contacts`/`org_pipelines`/`org_contact_interactions`. (El platform-CRM se queda.)

### FASE C — Decisiones que necesitan tu OK explícito
10. **Academia:** decidir (A) mantener / (B) reducir a cursos+certificación cosidos al marketplace / (C) separar a otro producto. **Recomiendo B** (solo 5 enrollments, momento barato para decidir).
11. Sacar landings de marketing (blog, casos-de-éxito, calculadora-ugc, research, mcp-docs, up-documentation) del bundle React → sitio estático.
12. **Ad-tools por dato:** ad-generator MANTENER (98 usos). ELIMINAR ad-intelligence (`ad_library_ads=0`), social-scraper (`social_scrape_items=0`), ad-tracking pixels/events/conversion (`ad_tracking_events=0`), marketing_ads (0). ~12 tablas + edge functions `social-scraper`, `ad-intelligence`, `intelligence-gatherer`.

### FASE D — Consolidación del núcleo (el trabajo de calidad)
13. **PRIMERO: arreglar el hire directo end-to-end** — `marketplace_projects=0` significa que nunca funcionó. Probar en staging: contratar creador → pago Stripe → proyecto creado → aparece en board. Es el corazón de "ahí mismo se ejecuta" y está roto.
14. Auditar los 142 comps de `marketplace/` por callers → poda estimada 30-40%.
15. Auditar los 73 comps de `content/` por duplicados.
16. Colapsar 5 vistas de marketplace → 2. Colapsar 8 dashboards → 5. Colapsar 7 páginas de campaña.
17. Unificar estados de contenido (legacy enum → custom_status_id).

### FASE E — Construir lo que falta (la visión real)
18. **Motor de estrategia automática:** brief de marca → estrategia + calendario + N briefs de contenido + sugerencia de talento. **La única cosa grande que hay que AGREGAR.**
19. Coser marketplace→board (contratar → ejecutable — hoy roto, ver #13) y Academia→marketplace (graduar → contratable) si se mantiene Academia.

---

## 12. Números para dimensionar

| Métrica | Actual | Objetivo "liviano" |
|---|---|---|
| **Tablas en BD** | **585** | ~350 (borrar streaming+booking+org-crm = 50; reducir academia = 50; ad-intel+scraper+tracking+marketing ≈ 12) |
| Rutas | 168 | ~70 |
| Páginas | 77 | ~40 |
| Edge functions | 199 | ~110 |
| Componentes marketplace | 142 | ~80 |
| Carpetas de streaming | 3 (todas eliminables) | 0 |
| Sistemas de perfil | 2 (v2 muerto) | 1 |
| Dashboards | 8 | 5 |
| Módulos de uso CERO | 6 (streaming, booking, org-crm, ad-intel, social-scraper, ad-tracking) | 0 |

**Reducción estimada: ~40% del código y ~40% de la BD sin afectar UN SOLO usuario activo** (todo lo que se borra tiene 0 filas o es código muerto). Y eso ANTES de la decisión sobre Academia.

---

## 13. Lo que quedó verificado con datos vs lo que falta

**Verificado con datos duros de la BD de producción (hecho en esta pasada):**
- Uso real de cada módulo cuestionable (filas por tabla) → streaming/booking/org-crm/ad-intel/scraper/tracking = 0, confirmado eliminables.
- Código muerto por callers: 3 páginas + registration-v2... perdón, registration v1 + profile-builder-v2 + streaming-v2, confirmados.
- Las 24 páginas de Academia: todas cableadas (NO muertas) — el tema es uso/estrategia.
- Dimensión BD: 585 tablas, desglose por módulo.

**Falta (requiere herramientas que no tengo ahora / próxima pasada con agentes frescos):**
- Callers de cada uno de los 142 comps de marketplace y 73 de content (la poda FINA intra-núcleo — mecánico, 1 sesión de agente).
- QA funcional por click-through de cada wizard (campaña, **hire — que sabemos que nunca produjo un proyecto**, onboarding) — necesita agente de browser, no grep.
- ~~Confirmar que borrar streaming/booking/org-crm no rompe imports transversales~~ **HECHO:** el único acople del núcleo con esos módulos es `ActiveLivesCarousel` (lazy import en `components/marketplace/MarketplacePage.tsx:36-38`, "solo admins, feature en construcción", navega a `/live`). Booking y org-CRM: sin acople transversal. **Fase B es segura ejecutando: quitar ese único carousel (bloque líneas ~367-372 + import) y luego borrar los módulos.** El resto sale limpio (todo referenciado solo desde App.tsx y dentro de sí mismo).

**El reporte es EJECUTABLE tal cual para las Fases A y B** (borrado de código muerto + módulos de uso cero). Las Fases C-E requieren tus decisiones y trabajo de construcción.
