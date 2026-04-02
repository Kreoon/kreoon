import {
  Image,
  User,
  Users,
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
  Lock,
  Crown,
  // Nuevos iconos para bloques v3
  LayoutTemplate,
  Columns3,
  BoxSelect,
  PanelTop,
  ChevronDown,
  Heading1,
  MousePointerClick,
  ListChecks,
  Timer,
  Code,
  Megaphone,
  ClipboardList,
  MessageCircle,
  Trophy,
  Film,
  ArrowLeftRight,
  Expand,
  GalleryHorizontal,
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
import { useCreatorPlanFeatures, type CreatorTier } from '@/hooks/useCreatorPlanFeatures';

// Mapa de iconos: string (del tipo) → componente Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  Image,
  User,
  Users,
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
  // Nuevos iconos para bloques v3
  LayoutTemplate,
  Columns3,
  BoxSelect,
  PanelTop,
  ChevronDown,
  Heading1,
  MousePointerClick,
  ListChecks,
  Timer,
  Code,
  Megaphone,
  ClipboardList,
  MessageCircle,
  Trophy,
  Film,
  ArrowLeftRight,
  Expand,
  GalleryHorizontal,
};

interface BlockPaletteProps {
  existingBlocks: ProfileBlock[];
}

interface DraggablePaletteItemProps {
  definition: BlockDefinition;
  disabled: boolean;
  locked: boolean;
  requiredPlan?: CreatorTier;
  onLockedClick?: () => void;
}

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  required: 'Basicos',
  layout: 'Constructor',
  core: 'Perfil',
  content: 'Contenido',
  media: 'Multimedia',
  conversion: 'Conversion',
};

// Orden: Constructor primero, luego todo lo demas
const DISPLAY_CATEGORIES: BlockCategory[] = ['layout', 'required', 'core', 'content', 'media', 'conversion'];

function DraggablePaletteItem({ definition, disabled, locked, requiredPlan, onLockedClick }: DraggablePaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${definition.type}`,
    data: { type: definition.type, fromPalette: true },
    disabled: disabled || locked,
  });

  const Icon = ICON_MAP[definition.icon] ?? Square;
  const isPremiumLock = requiredPlan === 'creator_premium';

  // Si está bloqueado, mostrar con estilo especial
  if (locked) {
    return (
      <div
        role="button"
        onClick={onLockedClick}
        className={cn(
          'flex items-center gap-2.5 p-2.5 rounded-sm border transition-all select-none cursor-pointer',
          isPremiumLock
            ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
            : 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10'
        )}
      >
        <div
          className={cn(
            'h-7 w-7 rounded-sm flex items-center justify-center flex-shrink-0 relative',
            isPremiumLock ? 'bg-amber-500/10' : 'bg-purple-500/10'
          )}
        >
          <Icon className={cn('h-4 w-4', isPremiumLock ? 'text-amber-400/50' : 'text-purple-400/50')} />
          <div className="absolute -bottom-0.5 -right-0.5">
            {isPremiumLock ? (
              <Crown className="h-3 w-3 text-amber-400" />
            ) : (
              <Lock className="h-3 w-3 text-purple-400" />
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate text-muted-foreground">{definition.label}</p>
          <p className={cn('text-[10px]', isPremiumLock ? 'text-amber-400' : 'text-purple-400')}>
            {isPremiumLock ? 'Premium' : 'Pro'}
          </p>
        </div>
        <Sparkles className={cn('h-3.5 w-3.5 flex-shrink-0', isPremiumLock ? 'text-amber-400' : 'text-purple-400')} />
      </div>
    );
  }

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
          <p className="text-[10px] text-muted-foreground">Limite alcanzado</p>
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

interface BlockPaletteFullProps extends BlockPaletteProps {
  onUpgradeClick?: () => void;
}

export function BlockPalette({ existingBlocks, onUpgradeClick }: BlockPaletteFullProps) {
  const { canUseBlock, getPlanRequiredForBlock } = useCreatorPlanFeatures();

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
              {blocks.map((definition) => {
                const locked = !canUseBlock(definition.type);
                const requiredPlan = locked ? getPlanRequiredForBlock(definition.type) : undefined;

                return (
                  <DraggablePaletteItem
                    key={definition.type}
                    definition={definition}
                    disabled={isBlockDisabled(definition, existingBlocks)}
                    locked={locked}
                    requiredPlan={requiredPlan ?? undefined}
                    onLockedClick={onUpgradeClick}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
