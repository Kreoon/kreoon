import {
  Image,
  User,
  Grid3X3,
  Briefcase,
  BarChart3,
  Star,
  DollarSign,
  Mail,
  Type,
  Video,
  Images,
  Share2,
  HelpCircle,
  MessageSquare,
  Building,
  Sparkles,
  Clock,
  Minus,
  Square,
  type LucideIcon,
} from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import {
  BLOCK_DEFINITIONS,
  getBlocksByCategory,
  type BlockType,
  type BlockCategory,
  type BlockDefinition,
  type ProfileBlock,
} from './types/profile-builder';

// Mapa de iconos: string (del tipo) → componente Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  Image,
  User,
  Grid3X3,
  Briefcase,
  BarChart3,
  Star,
  DollarSign,
  Mail,
  Type,
  Video,
  Images,
  Share2,
  HelpCircle,
  MessageSquare,
  Building,
  Sparkles,
  Clock,
  Minus,
  Square,
};

interface BlockPaletteProps {
  existingBlocks: ProfileBlock[];
}

interface DraggablePaletteItemProps {
  definition: BlockDefinition;
  disabled: boolean;
}

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  required: 'Requerido',
  core: 'Core',
  content: 'Contenido',
  media: 'Media',
  layout: 'Layout',
};

const DISPLAY_CATEGORIES: BlockCategory[] = ['core', 'content', 'media', 'layout'];

function DraggablePaletteItem({ definition, disabled }: DraggablePaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${definition.type}`,
    data: { type: definition.type, fromPalette: true },
    disabled,
  });

  const Icon = ICON_MAP[definition.icon] ?? Square;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`Arrastrar bloque ${definition.label}`}
      aria-disabled={disabled}
      className={cn(
        'flex items-center gap-2.5 p-2.5 rounded-sm border transition-all select-none',
        isDragging && 'opacity-50 scale-95',
        disabled
          ? 'border-border bg-muted/30 opacity-40 cursor-not-allowed'
          : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-grab active:cursor-grabbing'
      )}
    >
      <div
        className={cn(
          'h-7 w-7 rounded-sm flex items-center justify-center flex-shrink-0',
          disabled ? 'bg-muted' : 'bg-primary/10'
        )}
      >
        <Icon className={cn('h-4 w-4', disabled ? 'text-muted-foreground' : 'text-primary')} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{definition.label}</p>
        {disabled && (
          <p className="text-[10px] text-muted-foreground">Límite alcanzado</p>
        )}
      </div>
    </div>
  );
}

function countBlockInstances(blocks: ProfileBlock[], type: BlockType): number {
  return blocks.filter((b) => b.type === type).length;
}

function isBlockDisabled(definition: BlockDefinition, existingBlocks: ProfileBlock[]): boolean {
  if (definition.maxInstances === 0) return false;
  return countBlockInstances(existingBlocks, definition.type) >= definition.maxInstances;
}

export function BlockPalette({ existingBlocks }: BlockPaletteProps) {
  return (
    <div className="p-3 space-y-4">
      {DISPLAY_CATEGORIES.map((category) => {
        const blocks = getBlocksByCategory(category);
        if (blocks.length === 0) return null;

        return (
          <div key={category}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
              {CATEGORY_LABELS[category]}
            </p>
            <div className="space-y-1.5">
              {blocks.map((definition) => (
                <DraggablePaletteItem
                  key={definition.type}
                  definition={definition}
                  disabled={isBlockDisabled(definition, existingBlocks)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
