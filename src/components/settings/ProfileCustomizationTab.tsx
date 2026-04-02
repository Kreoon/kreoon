import { useState, useCallback } from 'react';
import { Palette, GripVertical, Eye, EyeOff, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCreatorProfile, type ProfileCustomization } from '@/hooks/useCreatorProfile';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Constants ──────────────────────────────────────────────────────────────

const THEMES = [
  { id: 'dark_purple', label: 'Dark Purple', primary: '#8b5cf6', secondary: '#6366f1', gradient: 'from-purple-500/30 to-blue-500/30' },
  { id: 'ocean_blue', label: 'Ocean Blue', primary: '#3b82f6', secondary: '#06b6d4', gradient: 'from-blue-500/30 to-cyan-500/30' },
  { id: 'sunset_orange', label: 'Sunset', primary: '#f97316', secondary: '#ef4444', gradient: 'from-orange-500/30 to-red-500/30' },
  { id: 'forest_green', label: 'Forest', primary: '#22c55e', secondary: '#14b8a6', gradient: 'from-green-500/30 to-teal-500/30' },
  { id: 'minimal_white', label: 'Minimal', primary: '#a855f7', secondary: '#ec4899', gradient: 'from-gray-300/30 to-gray-500/30' },
  { id: 'neon_pink', label: 'Neon Pink', primary: '#ec4899', secondary: '#f43f5e', gradient: 'from-pink-500/30 to-rose-500/30' },
];

const CARD_STYLES: { id: ProfileCustomization['card_style']; label: string; desc: string }[] = [
  { id: 'glass', label: 'Glass', desc: 'Efecto cristal translúcido' },
  { id: 'solid', label: 'Solid', desc: 'Fondos sólidos' },
  { id: 'outlined', label: 'Outlined', desc: 'Solo bordes, sin fondo' },
];

const COVER_STYLES: { id: ProfileCustomization['cover_style']; label: string; desc: string }[] = [
  { id: 'gradient', label: 'Gradiente', desc: 'Color degradado del tema' },
  { id: 'image', label: 'Imagen', desc: 'Tu foto de portada' },
  { id: 'video', label: 'Video', desc: 'Tu showreel de fondo' },
];

const SECTION_LABELS: Record<string, string> = {
  about: 'Sobre mí',
  services: 'Servicios',
  portfolio: 'Portafolio',
  stats: 'Estadísticas',
  reviews: 'Reseñas',
};

const DEFAULT_SECTIONS = ['about', 'services', 'portfolio', 'stats', 'reviews'];
const DEFAULT_VISIBILITY: Record<string, boolean> = { about: true, services: true, portfolio: true, stats: true, reviews: true };

// ─── Sortable Row ───────────────────────────────────────────────────────────

function SortableSectionRow({
  sectionId,
  isVisible,
  onToggleVisibility,
}: {
  sectionId: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sectionId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between p-3 rounded-sm border transition-all',
        isDragging ? 'z-50 border-primary bg-primary/10' : 'border-border bg-card',
        !isVisible && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium">{SECTION_LABELS[sectionId] || sectionId}</span>
      </div>
      <button
        onClick={onToggleVisibility}
        className="p-1.5 rounded-sm transition-colors hover:bg-muted"
      >
        {isVisible
          ? <Eye className="h-4 w-4 text-green-500" />
          : <EyeOff className="h-4 w-4 text-muted-foreground" />
        }
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ProfileCustomizationTab() {
  const { profile, loading, saving, updateField, save } = useCreatorProfile();

  const customization: ProfileCustomization = profile?.profile_customization || {
    theme: 'dark_purple',
    card_style: 'glass',
    cover_style: 'image',
    sections_order: DEFAULT_SECTIONS,
    sections_visible: DEFAULT_VISIBILITY,
  };

  const sections = customization.sections_order || DEFAULT_SECTIONS;
  const visibility = customization.sections_visible || DEFAULT_VISIBILITY;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const updateCustomization = useCallback((updates: Partial<ProfileCustomization>) => {
    updateField('profile_customization', { ...customization, ...updates });
  }, [customization, updateField]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.indexOf(active.id as string);
      const newIndex = sections.indexOf(over.id as string);
      updateCustomization({ sections_order: arrayMove(sections, oldIndex, newIndex) });
    }
  }, [sections, updateCustomization]);

  const toggleSectionVisibility = (sectionId: string) => {
    updateCustomization({
      sections_visible: { ...visibility, [sectionId]: !visibility[sectionId] },
    });
  };

  const handleSave = async () => {
    await save();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Tema Visual
          </CardTitle>
          <CardDescription>Elige el tema de colores para tu perfil público</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => updateCustomization({
                  theme: theme.id,
                  primary_color: theme.primary,
                  secondary_color: theme.secondary,
                })}
                className={cn(
                  'relative rounded-sm overflow-hidden border-2 transition-all',
                  customization.theme === theme.id
                    ? 'border-primary shadow-lg ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className={`h-20 bg-gradient-to-br ${theme.gradient}`}>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-background/80 to-transparent">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                      <span className="text-[10px] font-medium">{theme.label}</span>
                    </div>
                  </div>
                </div>
                {customization.theme === theme.id && (
                  <div className="absolute top-1.5 right-1.5">
                    <Badge variant="default" className="text-[9px] px-1.5 py-0">Activo</Badge>
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card style */}
      <Card>
        <CardHeader>
          <CardTitle>Estilo de Tarjetas</CardTitle>
          <CardDescription>Cómo se ven las secciones de tu perfil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {CARD_STYLES.map(style => (
              <button
                key={style.id}
                onClick={() => updateCustomization({ card_style: style.id })}
                className={cn(
                  'p-3 rounded-sm border text-left transition-all',
                  customization.card_style === style.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/50'
                )}
              >
                <p className="text-sm font-medium">{style.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{style.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cover style */}
      <Card>
        <CardHeader>
          <CardTitle>Estilo de Portada</CardTitle>
          <CardDescription>El fondo superior de tu perfil público</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {COVER_STYLES.map(style => (
              <button
                key={style.id}
                onClick={() => updateCustomization({ cover_style: style.id })}
                className={cn(
                  'p-3 rounded-sm border text-left transition-all',
                  customization.cover_style === style.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/50'
                )}
              >
                <p className="text-sm font-medium">{style.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{style.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section reorder */}
      <Card>
        <CardHeader>
          <CardTitle>Orden de Secciones</CardTitle>
          <CardDescription>Arrastra para reordenar y oculta las que no necesites</CardDescription>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sections} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sections.map(sectionId => (
                  <SortableSectionRow
                    key={sectionId}
                    sectionId={sectionId}
                    isVisible={visibility[sectionId] !== false}
                    onToggleVisibility={() => toggleSectionVisibility(sectionId)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
        {saving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
        ) : (
          <><Save className="mr-2 h-4 w-4" />Guardar Personalización</>
        )}
      </Button>
    </div>
  );
}
