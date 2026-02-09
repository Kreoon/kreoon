import { useState, useCallback } from 'react';
import { Palette, GripVertical, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProfileCustomization } from '@/hooks/useCreatorProfile';
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

interface WizardStepCustomizeProps {
  customization: ProfileCustomization;
  onChange: (customization: ProfileCustomization) => void;
}

const THEMES = [
  { id: 'dark_purple', label: 'Dark Purple', primary: '#8b5cf6', secondary: '#6366f1', gradient: 'from-purple-900/60 to-blue-900/60' },
  { id: 'ocean_blue', label: 'Ocean Blue', primary: '#3b82f6', secondary: '#06b6d4', gradient: 'from-blue-900/60 to-cyan-900/60' },
  { id: 'sunset_orange', label: 'Sunset', primary: '#f97316', secondary: '#ef4444', gradient: 'from-orange-900/60 to-red-900/60' },
  { id: 'forest_green', label: 'Forest', primary: '#22c55e', secondary: '#14b8a6', gradient: 'from-green-900/60 to-teal-900/60' },
  { id: 'minimal_white', label: 'Minimal', primary: '#a855f7', secondary: '#ec4899', gradient: 'from-gray-800/60 to-gray-900/60' },
  { id: 'neon_pink', label: 'Neon Pink', primary: '#ec4899', secondary: '#f43f5e', gradient: 'from-pink-900/60 to-rose-900/60' },
];

const CARD_STYLES = [
  { id: 'glass' as const, label: 'Glass', desc: 'Efecto cristal translucido' },
  { id: 'solid' as const, label: 'Solid', desc: 'Fondos solidos oscuros' },
  { id: 'outlined' as const, label: 'Outlined', desc: 'Solo bordes, sin fondo' },
];

const COVER_STYLES = [
  { id: 'gradient' as const, label: 'Gradiente', desc: 'Color degradado del tema' },
  { id: 'image' as const, label: 'Imagen', desc: 'Tu foto de portada' },
  { id: 'video' as const, label: 'Video', desc: 'Tu showreel de fondo' },
];

const SECTION_LABELS: Record<string, string> = {
  about: 'Sobre mi',
  services: 'Servicios',
  portfolio: 'Portafolio',
  stats: 'Estadisticas',
  reviews: 'Resenas',
};

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
        'flex items-center justify-between p-3 rounded-xl border transition-all',
        isDragging ? 'z-50 border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5',
        !isVisible && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
          <GripVertical className="h-4 w-4 text-gray-500" />
        </button>
        <span className="text-white text-sm">{SECTION_LABELS[sectionId] || sectionId}</span>
      </div>
      <button
        onClick={onToggleVisibility}
        className={cn(
          'p-1.5 rounded-lg transition-colors',
          isVisible ? 'hover:bg-white/10' : 'hover:bg-white/10'
        )}
      >
        {isVisible
          ? <Eye className="h-4 w-4 text-green-400" />
          : <EyeOff className="h-4 w-4 text-gray-600" />
        }
      </button>
    </div>
  );
}

export function WizardStepCustomize({ customization, onChange }: WizardStepCustomizeProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const sections = customization.sections_order || ['about', 'services', 'portfolio', 'stats', 'reviews'];
  const visibility = customization.sections_visible || { about: true, services: true, portfolio: true, stats: true, reviews: true };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.indexOf(active.id as string);
      const newIndex = sections.indexOf(over.id as string);
      onChange({
        ...customization,
        sections_order: arrayMove(sections, oldIndex, newIndex),
      });
    }
  }, [sections, customization, onChange]);

  const toggleSectionVisibility = (sectionId: string) => {
    onChange({
      ...customization,
      sections_visible: {
        ...visibility,
        [sectionId]: !visibility[sectionId],
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Personaliza tu perfil</h2>
        <p className="text-gray-400 text-sm">Elige un tema visual y organiza las secciones de tu perfil</p>
      </div>

      {/* Theme selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          <Palette className="inline h-4 w-4 mr-1.5" />
          Tema visual
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => onChange({ ...customization, theme: theme.id, primary_color: theme.primary, secondary_color: theme.secondary })}
              className={cn(
                'relative rounded-xl overflow-hidden border-2 transition-all',
                customization.theme === theme.id ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-white/10 hover:border-white/20'
              )}
            >
              <div className={`h-20 bg-gradient-to-br ${theme.gradient}`}>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                    <span className="text-white text-[10px] font-medium">{theme.label}</span>
                  </div>
                </div>
              </div>
              {customization.theme === theme.id && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Card style */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Estilo de tarjetas</label>
        <div className="grid grid-cols-3 gap-3">
          {CARD_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => onChange({ ...customization, card_style: style.id })}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                customization.card_style === style.id
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              )}
            >
              <p className="text-white text-sm font-medium">{style.label}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">{style.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cover style */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Estilo de portada</label>
        <div className="grid grid-cols-3 gap-3">
          {COVER_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => onChange({ ...customization, cover_style: style.id })}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                customization.cover_style === style.id
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              )}
            >
              <p className="text-white text-sm font-medium">{style.label}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">{style.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Section reorder */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-300">Orden de secciones</label>
          <span className="text-gray-500 text-xs">Arrastra para reordenar</span>
        </div>

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
      </div>
    </div>
  );
}
