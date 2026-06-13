# UI/UX Review — Academia KREOON

**Generado:** 2026-06-07 por feature-dev:code-reviewer sobre rama Dev_Branch_Alexander
**Alcance:** 9 componentes nuevos + 3 páginas modificadas en etapas 1-7

---

## Resumen ejecutivo

**Veredicto: NO listo para usuarios reales sin un sprint de accesibilidad + design system.**

35 hallazgos:
- **2 bloqueadores WCAG**
- 6 problemas de accesibilidad importantes
- 5 inconsistencias graves de design system
- 8 gaps de estados UX
- 4 issues de responsive mobile
- 5 elementos que aún se parecen a Skool

**Top 5 mejoras críticas:**

1. `BadgeDetailModal` sin `role="dialog"`, `aria-modal`, Escape, focus trap → bloqueador WCAG real
2. Módulo no usa tokens `kreoon-*` ni `nova-*` definidos en `tailwind.config.ts` — todo hardcoded
3. Loading states con texto plano en lugar de `KreoonSkeleton` (que ya existe)
4. `StreakFlame` con `animate-pulse` sin `motion-safe:` ni `prefers-reduced-motion`
5. `MembersAdminTab.exportCSV` y `banMutation` sin feedback de éxito/error visible

---

## Consistencia design system

**3 valores de fondo distintos sin token:**
- `#0a0a0f` (bg primary correcto) en AcademiaSpace{Home,Classroom,Admin}Page
- `#0c0c16` (valor diferente al token) en BadgesShowcase línea 119, SpaceNavbar línea 43, PostCard línea 117
- `bg-white/5` en todos los Cards (frágil — depende del fondo padre)

**Cards no usan KreoonGlassCard.** El proyecto tiene `src/components/ui/kreoon/KreoonGlassCard.tsx` pero los componentes nuevos usan `<Card className="bg-white/5 border-white/10">` directamente.

**Typography:** `font-display: Outfit` definido en tailwind.config, nunca aplicado en headings del módulo.

**Botones:** Todos los CTAs usan `<Button>` de shadcn con `style={{ backgroundColor: accent }}` en lugar de `KreoonButton` que tiene `focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50` + `active:scale-[0.98]`.

---

## Accesibilidad (WCAG 2.1 AA)

### 🔴 CRÍTICO: BadgeDetailModal sin infraestructura
`src/components/academy/gamification/BadgesShowcase.tsx:103-148`
- Sin `role="dialog"` ni `aria-modal="true"`
- Sin `aria-labelledby`
- Sin foco inicial ni trap
- Sin Escape para cerrar
- Viola WCAG 4.1.2 + 2.1.2

### 🔴 CRÍTICO: Botones icon-only sin aria-label
- `BadgesShowcase.tsx:44` — solo `title`, sin aria-label
- `MembersAdminTab.tsx:154` — botón ban con solo `<UserX />` opaco
- `PostCard.tsx:110` — menú actions sin aria-label/aria-expanded/aria-haspopup

### 🟠 Importante: Contraste text-zinc-500
Sobre `bg-white/5` en fondo `#0a0a0f`, ratio ~3.9:1 (mínimo AA es 4.5:1).
Afecta:
- `LevelBadge.tsx:78` (XP counter, 9px)
- `EnergyMeter.tsx:40` (número energy)
- `MembersAdminTab.tsx:140` (fecha joined)
- `KiroMentorWidget.tsx:117,122`

### 🟠 Importante: Menú flotante sin keyboard
`PostCard.tsx:109-127` — dropdown sin `role="menu"`, sin Escape, sin click-outside.

### 🟠 Importante: Select sin label
`PostComposer.tsx:110` — `<select>` de categoría sin `<label>` ni `aria-label`.

---

## Responsive mobile (375px-768px)

| Componente | Issue | Archivo:línea |
|---|---|---|
| SpaceNavbar | 7 tabs scroll horizontal sin fade indicador | SpaceNavbar.tsx:44 |
| BadgesShowcase | grid-cols-4 base, debería ser grid-cols-2 en mobile | BadgesShowcase.tsx:71 |
| MembersAdminTab | search `w-64` + botón CSV puede overflow | MembersAdminTab.tsx:109 |
| SpaceMap | scrollWheelZoom activo en touch — scroll de página mueve zoom | SpaceMap.tsx:60 |

---

## Estados UX

### Loading: texto plano en 3 páginas
- AcademiaSpaceHomePage.tsx:82 — "Cargando academia..."
- AcademiaSpaceClassroomPage.tsx:13 — "Cargando classroom..."
- AcademiaSpaceAdminPage.tsx:74 — "Cargando..."

Existe `KreoonSkeleton`, `KreoonSkeletonCard`, `KreoonLoadingScreen` listos para usar.

### Empty sin CTA
- AdminPage tabs Comunidad/Payouts/Afiliados — "próximamente" sin botón
- MembersAdminTab.tsx:121 — "Sin miembros" plano sin `KreoonEmptyState`

### Errores silenciosos
- `PostComposer.tsx:58` — `console.error('Upload failed')` sin toast
- `MembersAdminTab.tsx:49-58` — banMutation sin `onError`
- `useAcademyGamification.ts` — hooks lanzan `throw` pero componentes no manejan `isError`
- `VibeScore.tsx` — falla → muestra "Tranquilo" (falso negativo)

---

## Microinteracciones

### `animate-pulse` sin reduced-motion
`StreakFlame.tsx:28` — `days >= 7 && 'animate-pulse'` sin `motion-safe:`. Riesgo para usuarios con epilepsia fotosensible o vestibular disorder.

### Hover states inconsistentes
- BadgesShowcase → `hover:scale-110`
- PostCard → `hover:border-white/20`
- KiroMentor CTA → `hover:underline`
- SpaceNavbar → `hover:text-zinc-300`
- MembersAdminTab `<li>` → sin hover

---

## Diferenciación vs Skool

### ✅ Lo que ya nos diferencia
- KIRO Mentor widget proactivo (no chatbot)
- Vibe Score en hero — Skool no lo tiene
- EnergyMeter como segundo eje de engagement
- Niveles nombrados con perks (no "Nivel 5")
- Rareza de badges con glow visual (common→legendary)
- SpaceMap con Leaflet — Skool no tiene mapa
- Meta Pixel integrado por space — Skool cobra extra

### ⚠️ Lo que aún parece Skool
- Feed PostCard/SpaceFeed estructuralmente idéntico
- Classroom es grid de cards genérica
- Leaderboard mini es el mismo patrón
- Tabs vacíos (Payouts/Afiliados/Facturación) dan sensación de incompleto
- SpaceNavbar es funcionalmente idéntica

---

## Lo bien hecho

- `cn()` consistente en componentes nuevos
- Hooks siguen patrón `useQuery + queryKey ['academy', ...]`
- Estructura de carpetas coherente con el proyecto
- `MetaPixel.tsx` limpia correctamente y previene doble carga
- `VibeScore` con staleTime sensato (2 min)
- `useMyGamificationState` con staleTime 30s balanceado
- `MembersAdminTab.exportCSV` escapa comillas correctamente
- `sanitizeHTML` aplicado consistentemente antes de `dangerouslySetInnerHTML`
- Lógica KIRO (5 prioridades encadenadas) elegante sin IA

---

## Recomendación

**Sprint de 1 semana** para alcanzar producción:

**Día 1-2:** Bloqueadores WCAG (modal accesible, aria-labels, focus trap)
**Día 3:** Tokens design system (KreoonGlassCard, KreoonButton, KreoonSkeleton aplicados)
**Día 4:** Contraste + reduced-motion + estados error visibles
**Día 5:** Responsive mobile + diferenciadores visuales adicionales
