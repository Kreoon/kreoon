# Marketplace Visual Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar rediseño visual híbrido premium del marketplace con social proof prominente, búsqueda AI, y perfiles personalizables.

**Architecture:** Mejoras incrementales sobre componentes existentes. CreatorCard ya tiene 9:16. Agregamos social proof, hover gallery, búsqueda AI, y sistema de personalización de perfiles con guardrails de branding.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui, Supabase Edge Functions (para AI search).

---

## Task 1: Mejorar Social Proof en CreatorCard

**Files:**
- Modify: `src/components/marketplace/CreatorCard.tsx:213-272`
- Modify: `src/components/marketplace/types/marketplace.ts:1-30`

**Step 1: Agregar campo response_time_label al tipo MarketplaceCreator**

En `src/components/marketplace/types/marketplace.ts`, agregar después de línea 24:

```typescript
  /** Average response time label e.g. "< 2h" */
  response_time_label?: string;
```

**Step 2: Actualizar overlay de info en CreatorCard**

En `src/components/marketplace/CreatorCard.tsx`, reemplazar el bloque de info overlay (líneas 213-272) con:

```tsx
{/* Creator info overlay at bottom of card */}
<div className="absolute bottom-0 inset-x-0 z-10 p-3 space-y-1.5">
  {/* Name + verified */}
  <div className="flex items-center gap-1.5">
    {creator.avatar_url ? (
      <img
        src={creator.avatar_url}
        alt=""
        className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-white/30"
      />
    ) : (
      <div className="w-6 h-6 rounded-full bg-purple-500/60 flex items-center justify-center flex-shrink-0 border border-white/30">
        <span className="text-[10px] text-white font-bold leading-none">
          {creator.display_name.charAt(0).toUpperCase()}
        </span>
      </div>
    )}
    <span className="font-semibold text-white text-sm truncate drop-shadow-md">
      {creator.display_name}
    </span>
    {creator.is_verified && (
      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
    )}
  </div>

  {/* Location */}
  {(creator.location_city || creator.location_country) && (
    <div className="flex items-center gap-1 text-white/70 text-xs">
      <MapPin className="h-3 w-3 flex-shrink-0" />
      <span className="truncate drop-shadow-sm">
        {[creator.location_city, creator.location_country].filter(Boolean).join(', ')}
      </span>
    </div>
  )}

  {/* Social Proof Row - ENHANCED */}
  <div className="flex items-center gap-2 flex-wrap">
    {/* Rating */}
    <div className="flex items-center gap-1">
      <Star className="h-3 w-3 text-purple-400 fill-purple-400" />
      <span className="text-white text-xs font-medium drop-shadow-sm">
        {creator.rating_avg.toFixed(1)}
      </span>
      <span className="text-white/50 text-[10px]">({creator.rating_count})</span>
    </div>

    {/* Projects completed */}
    {creator.completed_projects > 0 && (
      <div className="flex items-center gap-1 text-white/70 text-xs">
        <Package className="h-3 w-3" />
        <span>{creator.completed_projects}</span>
      </div>
    )}

    {/* Response time */}
    {creator.response_time_label && (
      <div className="flex items-center gap-1 text-green-400 text-[10px]">
        <Clock className="h-3 w-3" />
        <span>{creator.response_time_label}</span>
      </div>
    )}
  </div>

  {/* Price + Exchange */}
  <div className="flex items-center gap-2">
    {creator.base_price != null && (
      <span className="text-white/70 text-xs drop-shadow-sm">
        Desde <span className="text-white font-semibold">{formatPrice(creator.base_price)}</span>
      </span>
    )}
    {creator.accepts_product_exchange && (
      <span className="flex items-center gap-0.5 text-green-400 text-xs" title="Acepta canje">
        <Gift className="h-3 w-3" />
      </span>
    )}
  </div>
</div>
```

**Step 3: Agregar imports faltantes**

En `src/components/marketplace/CreatorCard.tsx`, agregar a los imports:

```tsx
import { Package, Clock } from 'lucide-react';
```

**Step 4: Verificar cambios en navegador**

Run: `npm run dev`
Expected: Cards muestran rating con count, proyectos completados, y tiempo de respuesta.

**Step 5: Commit**

```bash
git add src/components/marketplace/CreatorCard.tsx src/components/marketplace/types/marketplace.ts
git commit -m "feat(marketplace): social proof prominente en CreatorCard

- Rating con número de reviews
- Proyectos completados con icono
- Tiempo de respuesta verde
- Mejor jerarquía visual"
```

---

## Task 2: Hover Gallery en CreatorCard

**Files:**
- Modify: `src/components/marketplace/CreatorCard.tsx`

**Step 1: Agregar estado para hover gallery**

Después de línea 29 agregar:

```tsx
const [showGallery, setShowGallery] = useState(false);
```

**Step 2: Agregar mini-galería en hover**

Antes del cierre del div con className "relative aspect-[9/16]" (aprox línea 138), agregar:

```tsx
{/* Hover mini-gallery */}
{media.length >= 3 && (
  <div
    className={cn(
      "absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex gap-1 transition-all duration-300",
      "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
    )}
  >
    {media.slice(0, 3).map((item, i) => (
      <button
        key={item.id}
        onClick={(e) => {
          e.stopPropagation();
          setCurrentSlide(i);
        }}
        className={cn(
          "w-12 h-16 rounded-lg overflow-hidden border-2 transition-all",
          i === currentSlide
            ? "border-white scale-105"
            : "border-white/30 hover:border-white/60"
        )}
      >
        <img
          src={resolveThumb(item)}
          alt=""
          className="w-full h-full object-cover"
        />
      </button>
    ))}
  </div>
)}
```

**Step 3: Verificar hover gallery**

Run: `npm run dev`
Expected: Al hacer hover en card con 3+ items, aparecen thumbnails clicables.

**Step 4: Commit**

```bash
git add src/components/marketplace/CreatorCard.tsx
git commit -m "feat(marketplace): mini-galería en hover de CreatorCard

- Muestra 3 thumbnails al hacer hover
- Click cambia slide actual
- Animación suave de entrada"
```

---

## Task 3: Animaciones Framer Motion Mejoradas

**Files:**
- Modify: `src/components/marketplace/CreatorCard.tsx`
- Modify: `src/components/marketplace/CreatorGrid.tsx`

**Step 1: Convertir CreatorCard a motion.div**

Agregar import:

```tsx
import { motion } from 'framer-motion';
```

Reemplazar el div principal:

```tsx
<motion.div
  className={cn(
    'group relative cursor-pointer',
    className,
  )}
  onClick={onClick}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ scale: 1.02, y: -4 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.2 }}
>
```

**Step 2: Agregar animación bounce al favorito**

Reemplazar el botón de favorito:

```tsx
<motion.button
  onClick={handleFavorite}
  className="absolute top-3 right-3 z-10"
  aria-label="Favorito"
  whileTap={{ scale: 1.3 }}
  animate={isFavorite ? { scale: [1, 1.2, 1] } : {}}
>
  <Heart
    className={cn(
      'h-6 w-6 drop-shadow-lg transition-colors duration-200',
      isFavorite
        ? 'text-pink-500 fill-pink-500'
        : 'text-white hover:text-pink-300',
    )}
  />
</motion.button>
```

**Step 3: Actualizar CreatorGrid para stagger**

En `src/components/marketplace/CreatorGrid.tsx`, eliminar el wrapper con animación inline y dejar que Framer Motion maneje el stagger desde el card.

Reemplazar el mapeo de creators:

```tsx
{creators.map((creator, i) => (
  <MarketplaceCreatorCard
    key={creator.id}
    creator={creator}
    onClick={() => onCreatorClick?.(creator.slug || creator.id)}
    style={{ animationDelay: `${i * 50}ms` } as React.CSSProperties}
  />
))}
```

**Step 4: Verificar animaciones**

Run: `npm run dev`
Expected: Cards tienen fade-in con stagger, hover eleva card, favorito hace bounce.

**Step 5: Commit**

```bash
git add src/components/marketplace/CreatorCard.tsx src/components/marketplace/CreatorGrid.tsx
git commit -m "feat(marketplace): animaciones Framer Motion mejoradas

- Fade-in con stagger en grid
- Hover scale + elevación
- Bounce en favorito
- Transiciones suaves"
```

---

## Task 4: Rediseño Vertical de OrgCard

**Files:**
- Modify: `src/components/marketplace/OrgCard.tsx`

**Step 1: Cambiar aspect ratio a vertical**

Reemplazar la estructura completa de OrgCard con layout vertical:

```tsx
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Star, Users, Briefcase, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceOrg } from './types/marketplace';
import { ORG_TYPE_LABELS, ORG_TYPE_COLORS, TEAM_SIZE_LABELS } from './types/marketplace';

interface OrgCardProps {
  org: MarketplaceOrg;
  onClick?: () => void;
  className?: string;
}

function OrgCardComponent({ org, onClick, className }: OrgCardProps) {
  const typeColor = org.org_type ? ORG_TYPE_COLORS[org.org_type] : null;
  const typeLabel = org.org_type ? ORG_TYPE_LABELS[org.org_type] : null;
  const accentColor = org.portfolio_color || '#8B5CF6';

  return (
    <motion.div
      className={cn(
        'group relative cursor-pointer overflow-hidden',
        className,
      )}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Vertical media area - 9:16 */}
      <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-card border border-white/5">
        {/* Cover image */}
        {org.org_cover_url ? (
          <img
            src={org.org_cover_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10, transparent)` }}
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Type badge */}
        {typeColor && typeLabel && (
          <div className={cn('absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold z-10', typeColor.bg, typeColor.text)}>
            {typeLabel}
          </div>
        )}

        {/* Floating logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.org_display_name}
              className="h-20 w-20 rounded-2xl border-2 border-white/20 object-cover shadow-2xl bg-gray-900"
            />
          ) : (
            <div
              className="h-20 w-20 rounded-2xl border-2 border-white/20 flex items-center justify-center shadow-2xl"
              style={{ backgroundColor: `${accentColor}30` }}
            >
              <Building2 className="h-10 w-10" style={{ color: accentColor }} />
            </div>
          )}
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-0 inset-x-0 z-10 p-3 space-y-1.5">
          <h3 className="font-semibold text-white text-sm truncate drop-shadow-md">
            {org.org_display_name}
          </h3>

          {org.org_tagline && (
            <p className="text-white/70 text-xs line-clamp-2">{org.org_tagline}</p>
          )}

          {/* Specialties */}
          {org.org_specialties.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {org.org_specialties.slice(0, 2).map(spec => (
                <span key={spec} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 capitalize">
                  {spec}
                </span>
              ))}
              {org.org_specialties.length > 2 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60">
                  +{org.org_specialties.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-purple-400 fill-purple-400" />
              <span className="text-white font-medium">{org.org_marketplace_rating_avg.toFixed(1)}</span>
            </div>
            {org.org_team_size_range && (
              <div className="flex items-center gap-1 text-white/60">
                <Users className="h-3 w-3" />
                <span>{TEAM_SIZE_LABELS[org.org_team_size_range] || org.org_team_size_range}</span>
              </div>
            )}
            {org.org_marketplace_projects_count > 0 && (
              <div className="flex items-center gap-1 text-white/60">
                <Briefcase className="h-3 w-3" />
                <span>{org.org_marketplace_projects_count}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const MarketplaceOrgCard = memo(OrgCardComponent);
```

**Step 2: Verificar OrgCard vertical**

Run: `npm run dev`
Navigate: `/marketplace` → tab Agencias
Expected: Cards de organizaciones ahora son verticales 9:16 con logo centrado.

**Step 3: Commit**

```bash
git add src/components/marketplace/OrgCard.tsx
git commit -m "feat(marketplace): OrgCard rediseñado vertical 9:16

- Aspect ratio 9:16 consistente con CreatorCard
- Logo centrado flotante
- Social proof en overlay inferior
- Animaciones Framer Motion"
```

---

## Task 5: Sistema de Colores de Personalización

**Files:**
- Create: `src/components/marketplace/profile/ColorPaletteSelector.tsx`
- Create: `src/lib/marketplace/profile-customization.ts`

**Step 1: Crear constantes de personalización**

Crear archivo `src/lib/marketplace/profile-customization.ts`:

```typescript
export const KREOON_ACCENT_COLORS = [
  { id: 'purple', hex: '#8B5CF6', label: 'Púrpura', emoji: '💜' },
  { id: 'blue', hex: '#3B82F6', label: 'Azul', emoji: '💙' },
  { id: 'green', hex: '#10B981', label: 'Verde', emoji: '💚' },
  { id: 'orange', hex: '#F97316', label: 'Naranja', emoji: '🧡' },
  { id: 'pink', hex: '#EC4899', label: 'Rosa', emoji: '💖' },
  { id: 'white', hex: '#F8FAFC', label: 'Blanco', emoji: '🤍' },
  { id: 'black', hex: '#1E1E2E', label: 'Negro', emoji: '🖤' },
  { id: 'yellow', hex: '#EAB308', label: 'Amarillo', emoji: '💛' },
] as const;

export type AccentColorId = typeof KREOON_ACCENT_COLORS[number]['id'];

export const PORTFOLIO_LAYOUTS = [
  { id: 'grid', label: 'Grid Uniforme', icon: 'LayoutGrid' },
  { id: 'masonry', label: 'Masonry', icon: 'LayoutDashboard' },
  { id: 'featured', label: 'Featured + Grid', icon: 'LayoutTemplate' },
] as const;

export type PortfolioLayoutId = typeof PORTFOLIO_LAYOUTS[number]['id'];

export interface ProfileCustomization {
  accent_color: AccentColorId;
  portfolio_layout: PortfolioLayoutId;
  section_order: string[];
  featured_links: Array<{ label: string; url: string }>;
}

export const DEFAULT_PROFILE_CUSTOMIZATION: ProfileCustomization = {
  accent_color: 'purple',
  portfolio_layout: 'grid',
  section_order: ['portfolio', 'services', 'reviews', 'stats'],
  featured_links: [],
};
```

**Step 2: Crear ColorPaletteSelector**

Crear archivo `src/components/marketplace/profile/ColorPaletteSelector.tsx`:

```tsx
import { cn } from '@/lib/utils';
import { KREOON_ACCENT_COLORS, type AccentColorId } from '@/lib/marketplace/profile-customization';
import { Check } from 'lucide-react';

interface ColorPaletteSelectorProps {
  value: AccentColorId;
  onChange: (color: AccentColorId) => void;
  className?: string;
}

export function ColorPaletteSelector({ value, onChange, className }: ColorPaletteSelectorProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {KREOON_ACCENT_COLORS.map(color => (
        <button
          key={color.id}
          type="button"
          onClick={() => onChange(color.id)}
          className={cn(
            'relative w-10 h-10 rounded-full transition-all duration-200',
            'ring-2 ring-offset-2 ring-offset-background',
            value === color.id
              ? 'ring-white scale-110'
              : 'ring-transparent hover:ring-white/30 hover:scale-105'
          )}
          style={{ backgroundColor: color.hex }}
          title={color.label}
        >
          {value === color.id && (
            <Check
              className={cn(
                'absolute inset-0 m-auto h-5 w-5',
                color.id === 'white' || color.id === 'yellow' ? 'text-gray-800' : 'text-white'
              )}
            />
          )}
        </button>
      ))}
    </div>
  );
}
```

**Step 3: Verificar componente**

Run: `npm run dev`
Expected: Componente compila sin errores.

**Step 4: Commit**

```bash
git add src/lib/marketplace/profile-customization.ts src/components/marketplace/profile/ColorPaletteSelector.tsx
git commit -m "feat(marketplace): sistema de colores para personalización de perfil

- 8 colores de paleta Kreoon
- ColorPaletteSelector con animaciones
- Tipos y constantes de personalización"
```

---

## Task 6: PortfolioLayoutSelector

**Files:**
- Create: `src/components/marketplace/profile/PortfolioLayoutSelector.tsx`

**Step 1: Crear PortfolioLayoutSelector**

```tsx
import { cn } from '@/lib/utils';
import { PORTFOLIO_LAYOUTS, type PortfolioLayoutId } from '@/lib/marketplace/profile-customization';
import { LayoutGrid, LayoutDashboard, LayoutTemplate } from 'lucide-react';

const ICONS = {
  LayoutGrid,
  LayoutDashboard,
  LayoutTemplate,
};

interface PortfolioLayoutSelectorProps {
  value: PortfolioLayoutId;
  onChange: (layout: PortfolioLayoutId) => void;
  className?: string;
}

export function PortfolioLayoutSelector({ value, onChange, className }: PortfolioLayoutSelectorProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      {PORTFOLIO_LAYOUTS.map(layout => {
        const Icon = ICONS[layout.icon as keyof typeof ICONS];
        const isSelected = value === layout.id;

        return (
          <button
            key={layout.id}
            type="button"
            onClick={() => onChange(layout.id)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
              isSelected
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            )}
          >
            <Icon className={cn('h-8 w-8', isSelected ? 'text-purple-400' : 'text-gray-400')} />
            <span className={cn('text-xs font-medium', isSelected ? 'text-white' : 'text-gray-400')}>
              {layout.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/marketplace/profile/PortfolioLayoutSelector.tsx
git commit -m "feat(marketplace): PortfolioLayoutSelector para personalización

- 3 layouts: Grid, Masonry, Featured+Grid
- Selección visual con iconos
- Estados activo/hover"
```

---

## Task 7: ProfileCustomizer Panel

**Files:**
- Create: `src/components/marketplace/profile/ProfileCustomizer.tsx`

**Step 1: Crear panel completo de personalización**

```tsx
import { useState, useEffect } from 'react';
import { ColorPaletteSelector } from './ColorPaletteSelector';
import { PortfolioLayoutSelector } from './PortfolioLayoutSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import {
  ProfileCustomization,
  DEFAULT_PROFILE_CUSTOMIZATION,
  type AccentColorId,
  type PortfolioLayoutId
} from '@/lib/marketplace/profile-customization';

interface ProfileCustomizerProps {
  initialValues?: Partial<ProfileCustomization>;
  onSave: (customization: ProfileCustomization) => Promise<void>;
  isSaving?: boolean;
}

export function ProfileCustomizer({ initialValues, onSave, isSaving }: ProfileCustomizerProps) {
  const [customization, setCustomization] = useState<ProfileCustomization>({
    ...DEFAULT_PROFILE_CUSTOMIZATION,
    ...initialValues,
  });

  const [newLink, setNewLink] = useState({ label: '', url: '' });

  const handleColorChange = (color: AccentColorId) => {
    setCustomization(prev => ({ ...prev, accent_color: color }));
  };

  const handleLayoutChange = (layout: PortfolioLayoutId) => {
    setCustomization(prev => ({ ...prev, portfolio_layout: layout }));
  };

  const handleAddLink = () => {
    if (newLink.label && newLink.url && customization.featured_links.length < 3) {
      setCustomization(prev => ({
        ...prev,
        featured_links: [...prev.featured_links, { ...newLink }],
      }));
      setNewLink({ label: '', url: '' });
    }
  };

  const handleRemoveLink = (index: number) => {
    setCustomization(prev => ({
      ...prev,
      featured_links: prev.featured_links.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    await onSave(customization);
  };

  return (
    <div className="space-y-6">
      {/* Color accent */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Color principal</CardTitle>
        </CardHeader>
        <CardContent>
          <ColorPaletteSelector
            value={customization.accent_color}
            onChange={handleColorChange}
          />
        </CardContent>
      </Card>

      {/* Portfolio layout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Layout de portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioLayoutSelector
            value={customization.portfolio_layout}
            onChange={handleLayoutChange}
          />
        </CardContent>
      </Card>

      {/* Featured links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Links destacados (máx. 3)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customization.featured_links.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-gray-500 cursor-grab" />
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input value={link.label} disabled className="bg-white/5" />
                <Input value={link.url} disabled className="bg-white/5 text-xs" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveLink(i)}
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          ))}

          {customization.featured_links.length < 3 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Etiqueta"
                  value={newLink.label}
                  onChange={e => setNewLink(prev => ({ ...prev, label: e.target.value }))}
                />
                <Input
                  placeholder="https://..."
                  value={newLink.url}
                  onChange={e => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddLink}
                disabled={!newLink.label || !newLink.url}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? 'Guardando...' : 'Guardar personalización'}
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/marketplace/profile/ProfileCustomizer.tsx
git commit -m "feat(marketplace): ProfileCustomizer panel completo

- Selector de color
- Selector de layout
- Links destacados con add/remove
- Botón guardar"
```

---

## Task 8: Migración DB para Personalización

**Files:**
- Create: `supabase/migrations/20260227200000_creator_profile_customization.sql`

**Step 1: Crear migración**

```sql
-- Add customization columns to creator_profiles
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT 'purple',
ADD COLUMN IF NOT EXISTS portfolio_layout text DEFAULT 'grid',
ADD COLUMN IF NOT EXISTS section_order text[] DEFAULT ARRAY['portfolio', 'services', 'reviews', 'stats'],
ADD COLUMN IF NOT EXISTS featured_links jsonb DEFAULT '[]'::jsonb;

-- Add check constraints
ALTER TABLE creator_profiles
ADD CONSTRAINT valid_accent_color CHECK (
  accent_color IN ('purple', 'blue', 'green', 'orange', 'pink', 'white', 'black', 'yellow')
);

ALTER TABLE creator_profiles
ADD CONSTRAINT valid_portfolio_layout CHECK (
  portfolio_layout IN ('grid', 'masonry', 'featured')
);

-- Index for featured_links queries
CREATE INDEX IF NOT EXISTS idx_creator_profiles_accent_color
ON creator_profiles(accent_color);

COMMENT ON COLUMN creator_profiles.accent_color IS 'User-selected accent color from Kreoon palette';
COMMENT ON COLUMN creator_profiles.portfolio_layout IS 'Portfolio display layout: grid, masonry, or featured';
COMMENT ON COLUMN creator_profiles.section_order IS 'Order of profile sections';
COMMENT ON COLUMN creator_profiles.featured_links IS 'Array of {label, url} objects for highlighted links';
```

**Step 2: Aplicar migración**

```bash
npx supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260227200000_creator_profile_customization.sql
git commit -m "feat(db): columnas de personalización en creator_profiles

- accent_color (8 colores válidos)
- portfolio_layout (grid/masonry/featured)
- section_order (array de secciones)
- featured_links (jsonb)"
```

---

## Task 9: Edge Function para AI Search

**Files:**
- Create: `supabase/functions/marketplace-ai-search/index.ts`

**Step 1: Crear edge function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedQuery {
  roles: string[];
  location: string | null;
  categories: string[];
  keywords: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple keyword extraction (can be enhanced with AI later)
    const parsed = parseNaturalQuery(query);

    // Build filter object for frontend
    const filters = {
      search: parsed.keywords.join(' '),
      country: parsed.location,
      marketplace_roles: parsed.roles,
      category: parsed.categories[0] || null,
    };

    return new Response(
      JSON.stringify({
        parsed,
        filters,
        suggestions: generateSuggestions(query)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseNaturalQuery(query: string): ParsedQuery {
  const q = query.toLowerCase();

  // Extract roles
  const roleMap: Record<string, string> = {
    'ugc': 'ugc_creator',
    'creador ugc': 'ugc_creator',
    'editor': 'video_editor',
    'editor de video': 'video_editor',
    'fotógrafo': 'photographer',
    'fotografo': 'photographer',
    'community': 'community_manager',
    'diseñador': 'graphic_designer',
  };

  const roles: string[] = [];
  for (const [keyword, role] of Object.entries(roleMap)) {
    if (q.includes(keyword)) roles.push(role);
  }

  // Extract location
  const locationMap: Record<string, string> = {
    'bogotá': 'CO',
    'bogota': 'CO',
    'colombia': 'CO',
    'méxico': 'MX',
    'mexico': 'MX',
    'cdmx': 'MX',
    'chile': 'CL',
    'argentina': 'AR',
    'perú': 'PE',
    'peru': 'PE',
  };

  let location: string | null = null;
  for (const [keyword, code] of Object.entries(locationMap)) {
    if (q.includes(keyword)) {
      location = code;
      break;
    }
  }

  // Extract categories
  const categoryMap: Record<string, string> = {
    'belleza': 'belleza',
    'skincare': 'belleza',
    'moda': 'moda',
    'fitness': 'fitness',
    'tech': 'tech',
    'tecnología': 'tech',
    'food': 'food',
    'comida': 'food',
    'gaming': 'gaming',
  };

  const categories: string[] = [];
  for (const [keyword, cat] of Object.entries(categoryMap)) {
    if (q.includes(keyword)) categories.push(cat);
  }

  // Remaining words as keywords
  const stopwords = ['busco', 'para', 'en', 'de', 'un', 'una', 'marca', 'creador', 'creator'];
  const keywords = query
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.includes(w.toLowerCase()));

  return { roles, location, categories, keywords };
}

function generateSuggestions(query: string): string[] {
  return [
    'editor de video para TikTok',
    'fotógrafo de producto en México',
    'creador UGC para skincare',
  ];
}
```

**Step 2: Agregar a config.toml**

En `supabase/config.toml`:

```toml
[functions.marketplace-ai-search]
verify_jwt = false
```

**Step 3: Deploy**

```bash
npx supabase functions deploy marketplace-ai-search
```

**Step 4: Commit**

```bash
git add supabase/functions/marketplace-ai-search/index.ts supabase/config.toml
git commit -m "feat(edge): marketplace-ai-search para búsqueda natural

- Parsea queries en lenguaje natural
- Extrae roles, ubicación, categorías
- Genera sugerencias
- No requiere JWT"
```

---

## Task 10: AISearchInput Component

**Files:**
- Create: `src/components/marketplace/AISearchInput.tsx`
- Create: `src/hooks/useMarketplaceAISearch.ts`

**Step 1: Crear hook**

```typescript
// src/hooks/useMarketplaceAISearch.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParsedFilters {
  search: string;
  country: string | null;
  marketplace_roles: string[];
  category: string | null;
}

export function useMarketplaceAISearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const parseQuery = useCallback(async (query: string): Promise<ParsedFilters | null> => {
    if (!query.trim()) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-ai-search', {
        body: { query },
      });

      if (error) throw error;

      setSuggestions(data.suggestions || []);
      return data.filters;
    } catch (err) {
      console.error('AI search error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { parseQuery, isLoading, suggestions };
}
```

**Step 2: Crear AISearchInput**

```tsx
// src/components/marketplace/AISearchInput.tsx
import { useState, useCallback } from 'react';
import { Sparkles, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMarketplaceAISearch } from '@/hooks/useMarketplaceAISearch';
import type { MarketplaceFilters } from './types/marketplace';

interface AISearchInputProps {
  onFiltersChange: (filters: Partial<MarketplaceFilters>) => void;
  className?: string;
}

export function AISearchInput({ onFiltersChange, className }: AISearchInputProps) {
  const [query, setQuery] = useState('');
  const { parseQuery, isLoading, suggestions } = useMarketplaceAISearch();
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = useCallback(async () => {
    const filters = await parseQuery(query);
    if (filters) {
      onFiltersChange(filters);
    }
    setShowSuggestions(false);
  }, [query, parseQuery, onFiltersChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative flex items-center">
        <Sparkles className="absolute left-3 h-4 w-4 text-purple-400" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Busco creador UGC en Bogotá para marca de skincare..."
          className="pl-10 pr-24 bg-white/5 border-white/10 focus:border-purple-500"
        />
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !query.trim()}
          size="sm"
          className="absolute right-1 bg-purple-600 hover:bg-purple-500"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-white/5">
            💡 Sugerencias
          </div>
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/hooks/useMarketplaceAISearch.ts src/components/marketplace/AISearchInput.tsx
git commit -m "feat(marketplace): AISearchInput con búsqueda en lenguaje natural

- Hook useMarketplaceAISearch
- Input con icono Sparkles
- Dropdown de sugerencias
- Integración con edge function"
```

---

## Task 11: Integrar AISearchInput en MarketplacePage

**Files:**
- Modify: `src/components/marketplace/MarketplacePage.tsx`

**Step 1: Agregar toggle AI/normal search**

Después de los imports, agregar:

```tsx
import { AISearchInput } from './AISearchInput';
```

**Step 2: Agregar estado para modo AI**

Después de línea 42:

```tsx
const [aiSearchMode, setAiSearchMode] = useState(false);
```

**Step 3: Agregar handler para AI filters**

```tsx
const handleAIFiltersChange = useCallback(
  (newFilters: Partial<MarketplaceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setIsSearchActive(true);
  },
  [setFilters]
);
```

**Step 4: Modificar área de búsqueda**

Reemplazar el bloque de MarketplaceSearchBar con:

```tsx
{/* Search bar - AI mode toggle */}
<div className="py-4 space-y-2">
  <div className="flex items-center gap-2 mb-2">
    <button
      onClick={() => setAiSearchMode(false)}
      className={cn(
        "px-3 py-1 rounded-full text-xs transition-colors",
        !aiSearchMode
          ? "bg-purple-600 text-white"
          : "bg-white/5 text-gray-400 hover:text-white"
      )}
    >
      Búsqueda normal
    </button>
    <button
      onClick={() => setAiSearchMode(true)}
      className={cn(
        "px-3 py-1 rounded-full text-xs transition-colors flex items-center gap-1",
        aiSearchMode
          ? "bg-purple-600 text-white"
          : "bg-white/5 text-gray-400 hover:text-white"
      )}
    >
      <Sparkles className="h-3 w-3" />
      AI Search
    </button>
  </div>

  {aiSearchMode ? (
    <AISearchInput onFiltersChange={handleAIFiltersChange} />
  ) : (
    <MarketplaceSearchBar
      search={filters.search}
      country={filters.country}
      contentTypes={filters.content_type}
      onSearchChange={handleSearchChange}
      onCountryChange={v => updateFilter('country', v)}
      onContentTypesChange={v => updateFilter('content_type', v)}
      onSubmit={handleSearchSubmit}
    />
  )}
</div>
```

**Step 5: Agregar import Sparkles**

```tsx
import { Sparkles, ArrowRight } from 'lucide-react';
```

**Step 6: Verificar integración**

Run: `npm run dev`
Navigate: `/marketplace`
Expected: Toggle entre búsqueda normal y AI visible, AI input funciona.

**Step 7: Commit**

```bash
git add src/components/marketplace/MarketplacePage.tsx
git commit -m "feat(marketplace): integrar AISearchInput en página principal

- Toggle búsqueda normal/AI
- AI search aplica filtros automáticamente
- UX fluida entre modos"
```

---

## Task 12: Testing Visual y Ajustes Finales

**Step 1: Test manual completo**

```bash
npm run dev
```

Verificar:
- [ ] CreatorCard muestra social proof (rating count, proyectos, tiempo)
- [ ] Hover gallery aparece con 3+ items
- [ ] Animaciones de scale y favorito funcionan
- [ ] OrgCard es vertical 9:16
- [ ] Toggle AI Search funciona
- [ ] AI Search parsea y aplica filtros

**Step 2: Build production**

```bash
npm run build
```

Expected: Build exitoso sin errores TypeScript.

**Step 3: Commit final**

```bash
git add -A
git commit -m "feat(marketplace): rediseño visual completo

- Social proof prominente en cards
- Hover gallery interactiva
- OrgCard vertical consistente
- Búsqueda AI con lenguaje natural
- Sistema de personalización de perfiles
- Animaciones Framer Motion"
```

---

## Summary

| Task | Descripción | Estimado |
|------|-------------|----------|
| 1 | Social proof en CreatorCard | 15 min |
| 2 | Hover gallery | 15 min |
| 3 | Animaciones Framer Motion | 20 min |
| 4 | OrgCard vertical | 20 min |
| 5 | Sistema de colores | 15 min |
| 6 | PortfolioLayoutSelector | 10 min |
| 7 | ProfileCustomizer panel | 25 min |
| 8 | Migración DB | 10 min |
| 9 | Edge function AI search | 25 min |
| 10 | AISearchInput | 20 min |
| 11 | Integración AISearch | 15 min |
| 12 | Testing y ajustes | 20 min |

**Total estimado:** ~3.5 horas

---

Plan guardado. ¿Cómo quieres proceder con la implementación?

**1. Subagent-Driven (esta sesión)** - Dispatch subagent por tarea, revisión entre tareas, iteración rápida

**2. Parallel Session (separada)** - Abrir nueva sesión con executing-plans, ejecución batch con checkpoints

¿Cuál prefieres?
