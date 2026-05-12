# Marketplace Visual Redesign - Design Document

**Fecha:** 2026-02-27
**Estado:** Aprobado
**Enfoque:** Hybrid Premium (Visual + Credibilidad)

---

## Resumen Ejecutivo

Rediseño visual completo del marketplace de KREOON con los siguientes objetivos:
- Aumentar conversión (más clics en perfiles, más contactos, más contrataciones)
- Mejorar descubrimiento de talento
- Diferenciación visual (identidad propia)
- Resolver problemas de usabilidad

**Inspiración:** Airbnb/Pinterest + Dribbble/Behance (premium, visual-first, portfolio)

---

## 1. Tarjetas de Creadores (CreatorCard)

### Diseño Optimizado para Contenido Vertical

```
┌───────────────────┐
│                   │
│   PORTFOLIO       │
│   VERTICAL        │ ♥
│   (9:16)          │
│                   │
│  ┌───┬───┬───┐    │  ← Hover: 3 thumbnails verticales
│  │   │   │   │    │
│  │   │   │   │    │
│  └───┴───┴───┘    │
│                   │
├───────────────────┤
│ 👤 Creador Name   │
│ @user · 🎬 UGC    │
│                   │
│ ⭐ 4.9 (28)       │
│ 📦 45 proyectos   │
│ 🟢 < 2h respuesta │
└───────────────────┘
```

### Especificaciones

| Propiedad | Valor |
|-----------|-------|
| Aspect ratio imagen | 9:16 (vertical) |
| Grid | 4-6 columnas responsive |
| Hover | Mini-galería + quick actions |
| Animación entrada | Stagger fade-in (50ms delay) |
| Hover scale | 1.02 + shadow elevation |
| Favorito | Bounce + fill animation |

### Elementos de Social Proof

- Rating con número de reviews: `⭐ 4.9 (28)`
- Proyectos completados: `📦 45 proyectos`
- Tiempo de respuesta: `🟢 < 2h respuesta`
- Badge de disponibilidad

---

## 2. Tarjetas de Agencias/Orgs (OrgCard)

### Diseño Vertical (Consistente con CreatorCard)

```
┌───────────────────┐
│                   │
│   COVER/REEL      │
│   VERTICAL        │
│   (9:16)          │
│                   │
│  ┌────┐           │
│  │LOGO│           │  ← Logo flotante
│  └────┘           │
│                   │
├───────────────────┤
│ 🏢 Agencia Name   │
│ Tagline corto     │
│                   │
│ 🏷️ UGC · Video    │  ← Especialidades inline
│                   │
│ ⭐ 4.8 · 👥 5-10  │
│ 📦 120 proyectos  │
└───────────────────┘
```

### Diferenciación por Tipo

| Tipo | Color de Border |
|------|-----------------|
| Agencia | Púrpura |
| Productora | Azul |
| Estudio | Verde |
| Colectivo | Naranja |

---

## 3. Filtros y Búsqueda

### Búsqueda con IA (Natural Language)

```
┌─────────────────────────────────────────────────────────────┐
│  ✨ Busco creador UGC en Bogotá para marca de skincare...   │
│                                                             │
│  💡 Sugerencias: "editor de video para TikTok"              │
│                  "fotógrafo de producto en México"          │
└─────────────────────────────────────────────────────────────┘
```

- Input acepta lenguaje natural
- Backend usa AI para extraer: rol, ubicación, industria, keywords
- Sugerencias mientras escribe

### Filtros Disponibles

| Filtro | Tipo |
|--------|------|
| País | Dropdown |
| Rating mínimo | Slider visual |
| Rango de precio | Dual slider |
| Disponibilidad | Checkboxes |
| Especialidades | Chips multiselect |
| Idiomas | Checkboxes |
| Software | Chips multiselect |
| Plataformas | Chips multiselect |
| Acepta canje | Radio buttons |

### Mejoras UX

- Preview de resultados en tiempo real
- Badge con número de filtros activos
- Botón Reset prominente
- Chips más grandes y táctiles

---

## 4. Página de Perfil de Creador

### Layout General

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Volver                                    ♥ Guardar  💬 Chat │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   COVER / REEL HERO (16:9)              │   │
│  │  ┌────┐                                                 │   │
│  │  │ 👤 │  Nombre · @username · 📍 Bogotá                 │   │
│  │  └────┘  ⭐ 4.9 (28) · 📦 45 · 🟢 Disponible            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Sobre mí] ─────────────────────────────────────────────────  │
│                                                                 │
│  📁 Portfolio | 💼 Servicios | ⭐ Reviews | 📊 Stats            │
│                                                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│  │  📹 │ │  📹 │ │  📹 │ │  📹 │ │  📹 │ │  📹 │            │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  💼 Contratar desde $150 USD                              →     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Sistema de Personalización

### Elementos Personalizables por Creador

| Elemento | Opciones |
|----------|----------|
| Color accent | 8 colores de paleta Kreoon |
| Cover image/video | Upload libre |
| Layout portfolio | Grid, Masonry, Featured+Grid |
| Orden secciones | Drag & drop |
| Badges/stickers | Personalizados |
| Bio | Markdown lite |
| Links destacados | Max 3 |

### Paleta de Colores Permitidos

- 💜 Purple (default)
- 💙 Blue
- 💚 Green
- 🧡 Orange
- 💖 Pink
- 🤍 White
- 🖤 Black
- 💛 Yellow

### Elementos Fijos (Branding Kreoon)

- Tipografía (Inter/system)
- Header con navegación
- Footer con links legales
- Botones de acción (estilo consistente)
- Cards de servicios (estructura fija)
- Sistema de reviews (formato estándar)
- Indicadores de verificación
- Sticky CTA bar

---

## 6. Animaciones y Micro-interactions

### Framer Motion Specs

| Elemento | Animación |
|----------|-----------|
| Card entrada | Stagger fade-in (50ms delay por fila) |
| Card hover | Scale 1.02 + shadow elevation + reveal gallery |
| Favorito | Bounce + fill color |
| Skeleton | Shimmer gradient |
| Page transitions | Slide + fade |
| Modal | Scale from center + backdrop blur |

---

## 7. Componentes a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/marketplace/CreatorCard.tsx` | Nuevo layout vertical 9:16 |
| `src/components/marketplace/CreatorGrid.tsx` | Grid 4-6 columnas |
| `src/components/marketplace/OrgCard.tsx` | Layout vertical consistente |
| `src/components/marketplace/OrgGrid.tsx` | Grid unificado |
| `src/components/marketplace/MarketplaceSearchBar.tsx` | Búsqueda AI |
| `src/components/marketplace/FilterModal.tsx` | Nuevos filtros + preview |
| `src/components/marketplace/profile/CreatorProfilePage.tsx` | Layout personalizable |
| `src/pages/settings/sections/MarketplaceSection.tsx` | Editor de personalización |

### Nuevos Componentes

- `src/components/marketplace/CreatorCardVertical.tsx`
- `src/components/marketplace/AISearchInput.tsx`
- `src/components/marketplace/ProfileCustomizer.tsx`
- `src/components/marketplace/PortfolioLayoutSelector.tsx`
- `src/components/marketplace/ColorPaletteSelector.tsx`

---

## 8. Consideraciones Técnicas

### Performance

- Lazy loading de imágenes/videos
- Intersection Observer para cargar más cards
- Video preview solo en viewport visible
- Skeleton loaders para estados de carga

### Responsive

- Mobile: 2 columnas
- Tablet: 3-4 columnas
- Desktop: 4-6 columnas
- Max container width: 1400px

### Accesibilidad

- Alt text en todas las imágenes
- Focus states visibles
- Keyboard navigation
- Reduced motion support

---

## Siguiente Paso

Invocar skill `writing-plans` para crear plan de implementación detallado.
