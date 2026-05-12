# Rediseño de Página de Inicio Implementation Plan

> **For Claude**: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal**: Transformar kreoon.com en una experiencia inmersiva de "Creative OS" con storytelling scroll y efectos visuales premium.

**Architecture**: Uso de `framer-motion` para el manejo de scroll (useScroll, useTransform) y pinning de secciones. Estructura modular de componentes en `src/components/landing/sections/`.

**Tech Stack**: React, Framer Motion, Tailwind CSS, Lucide React.

---

### Task 1: Generación de Assets Premium con IA
**Goal**: Crear la base visual "top" para las secciones.

**Steps**:
1. Generar orbe púrpura 3D para el Hero.
2. Generar elementos de UI abstractos (tarjetas de cristal, iconos neón).
3. Guardar en `public/assets/landing/`.

---

### Task 2: StoryScrollContainer y Scroll Smooth
**Files**:
- Create: `src/components/landing/StoryScrollContainer.tsx`
- Modify: `src/index.css` (para scroll smooth global)

**Steps**:
1. Implementar contenedor con `position: relative`.
2. Configurar `framer-motion` para detectar progreso de scroll global.
3. Commit: `feat: add story scroll container`

---

### Task 3: Hero Section - "La Activación"
**Files**:
- Create: `src/components/landing/sections/HeroModern.tsx`

**Steps**:
1. Implementar layout con orbe central animado.
2. Añadir animaciones de entrada para el texto (stagger children).
3. Añadir indicador de scroll dinámico.
4. Commit: `feat: implement modern hero section`

---

### Task 4: AI Research Section - "El Cerebro"
**Files**:
- Create: `src/components/landing/sections/AIEngineSection.tsx`

**Steps**:
1. Implementar "Scroll Pinning" usando `sticky`.
2. Animar la "descomposición" del producto en 12 pasos de ADN basada en el scroll.
3. Añadir efectos de rejilla de datos en el fondo.
4. Commit: `feat: implement ai engine section with scroll pinning`

---

### Task 5: Factory Section - "El Sistema de Esferas"
**Files**:
- Create: `src/components/landing/sections/FactorySection.tsx`

**Steps**:
1. Dibujar los 4 nodos de Esferas (Engage, Solution, Remarketing, Fidelize).
2. Animar tarjetas de contenido viajando entre nodos conforme el usuario scrollea.
3. Commit: `feat: implement factory section with sphere system`

---

### Task 6: Marketplace Section - "El Universo Kreoon"
**Files**:
- Create: `src/components/landing/sections/MarketplaceUniverse.tsx`

**Steps**:
1. Crear red de perfiles flotantes con efectos de profundidad (z-index + scale).
2. Animar líneas de conexión que se iluminan al pasar el scroll.
3. Commit: `feat: implement marketplace universe section`

---

### Task 7: Fase 2 - Integración de Contenido Real y Pulido Pro
**Goal**: Integrar datos de Supabase y elevar la interactividad al nivel más "top".

**Steps**:
1. **Fetch de Creadores Reales**: Modificar `MarketplaceUniverse.tsx` para usar `useMarketplaceCreators` filtrando por creadores con portafolio (miniaturas).
2. **Social Proof Section**: Crear `RealContentShowcase.tsx` que consuma contenido con estado `approved` y lo muestre en un carrusel inmersivo.
3. **Mouse Parallax**: Añadir interactividad de mouse al Hero orb y tarjetas de UI.
4. **Sistema de Partículas**: Implementar fondo de "nebulosa Kreoon" reactiva.
5. **Refactor de Estilos**: Aplicar Glassmorphism v2 (bordes animados, sombras de color profundas).

---

### Task 8: QA, Performance y Entrega Final
**Steps**:
1. Verificar performance con el alto volumen de animaciones.
2. Asegurar responsividad móvil (adaptar efectos pesados).
3. Validar accesibilidad y SEO técnico.
4. Commit: `feat: final polish and phase 2 integration complete`
