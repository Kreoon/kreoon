import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { LayoutTemplate, Sparkles, TrendingDown, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BlockWrapper } from './BlockWrapper';
import { BlockRenderer } from './BlockRenderer';
import { DropZone } from './DropZone';
import { useCreatorPlanFeatures } from '@/hooks/useCreatorPlanFeatures';
import type { ProfileBlock, BuilderConfig } from './types/profile-builder';
import { BLOCK_DEFINITIONS, DEFAULT_BUILDER_CONFIG } from './types/profile-builder';

// Convertir HEX a HSL para Tailwind
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '262 83% 58%'; // fallback violeta

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Mapeo de fuentes a font-family CSS
const FONT_FAMILY_MAP: Record<string, string> = {
  inter: '"Inter", system-ui, sans-serif',
  poppins: '"Poppins", system-ui, sans-serif',
  playfair: '"Playfair Display", Georgia, serif',
  roboto: '"Roboto", system-ui, sans-serif',
  montserrat: '"Montserrat", system-ui, sans-serif',
};

// Mapeo de espaciado a valores CSS
const SPACING_MAP: Record<string, string> = {
  compact: '0.5rem',
  normal: '1rem',
  relaxed: '1.5rem',
};

// Mapeo de border-radius a valores CSS
const BORDER_RADIUS_MAP: Record<string, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '1rem',
};

// Anchos de canvas según device
const DEVICE_WIDTH: Record<'desktop' | 'tablet' | 'mobile', string> = {
  desktop: 'w-full max-w-3xl',
  tablet: 'w-[768px] max-w-full',
  mobile: 'w-[390px] max-w-full',
};

interface BuilderCanvasProps {
  blocks: ProfileBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (id: string, updates: Partial<ProfileBlock>) => void;
  onReorderBlocks: (activeId: string, overId: string) => void;
  onDeleteBlock?: (id: string) => void;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  // Configuración del builder para aplicar estilos en tiempo real
  builderConfig?: BuilderConfig;
  // Para MediaLibraryPicker
  userId?: string;
  creatorProfileId?: string;
  // Para contenedores
  onAddBlockToContainer?: (parentId: string, columnIndex?: number) => void;
  onRemoveFromContainer?: (parentId: string, blockId: string) => void;
}

export function BuilderCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onReorderBlocks,
  onDeleteBlock,
  previewDevice,
  builderConfig = DEFAULT_BUILDER_CONFIG,
  userId,
  creatorProfileId,
  onAddBlockToContainer,
  onRemoveFromContainer,
}: BuilderCanvasProps) {
  const { maxBlocks, commissionRate, isPremium } = useCreatorPlanFeatures();

  // Función recursiva para renderizar children de contenedores
  const renderChild = useCallback(
    (child: ProfileBlock) => (
      <BlockRenderer
        key={child.id}
        block={child}
        isEditing={true}
        isSelected={selectedBlockId === child.id}
        onSelect={() => onSelectBlock(child.id)}
        onUpdate={(updates) => onUpdateBlock(child.id, updates)}
        userId={userId}
        creatorProfileId={creatorProfileId}
        previewDevice={previewDevice}
        renderChild={renderChild}
        onRemoveChild={
          child.parentId && onRemoveFromContainer
            ? (childId) => onRemoveFromContainer(child.parentId!, childId)
            : undefined
        }
      />
    ),
    [selectedBlockId, onSelectBlock, onUpdateBlock, userId, creatorProfileId, previewDevice, onRemoveFromContainer]
  );

  // Todos los bloques son movibles - sin restricciones
  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [blocks]);

  const allBlockIds = sortedBlocks.map((b) => b.id);

  // Deseleccionar al hacer click en el canvas vacío
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onSelectBlock(null);
    }
  }

  function getBlockIndex(id: string) {
    return sortedBlocks.findIndex((b) => b.id === id);
  }

  function handleMoveUp(id: string) {
    const index = getBlockIndex(id);
    if (index <= 0) return;
    const prevBlock = sortedBlocks[index - 1];
    onReorderBlocks(id, prevBlock.id);
  }

  function handleMoveDown(id: string) {
    const index = getBlockIndex(id);
    if (index >= sortedBlocks.length - 1) return;
    const nextBlock = sortedBlocks[index + 1];
    onReorderBlocks(nextBlock.id, id);
  }

  // ID único para scoping de estilos
  const canvasId = useMemo(() => `canvas-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <div
      className="flex flex-col items-center w-full flex-1 min-h-0 overflow-y-auto py-8 px-4"
      onClick={handleCanvasClick}
      aria-label="Canvas del profile builder"
      role="main"
    >
      {/* Estilos con scope para headings y elementos del canvas */}
      <style>{`
        #${canvasId} h1, #${canvasId} h2, #${canvasId} h3, #${canvasId} h4 {
          font-family: var(--font-heading);
        }
        #${canvasId} p, #${canvasId} span, #${canvasId} li {
          font-family: var(--font-body);
        }
        #${canvasId} .btn-primary, #${canvasId} [data-accent="true"] {
          background-color: var(--creator-accent);
        }
      `}</style>
      <div
        id={canvasId}
        className={cn(
          'flex flex-col gap-0 mx-auto transition-all duration-200 rounded-lg',
          DEVICE_WIDTH[previewDevice],
          // Aplicar tema directamente
          builderConfig.theme === 'dark' ? 'bg-[#0a0a0f] text-zinc-100' : 'bg-white text-zinc-900',
        )}
        style={{
          // Aplicar todas las variables CSS del tema
          // HEX para uso directo
          '--creator-accent': builderConfig.accentColor,
          '--creator-accent-10': `${builderConfig.accentColor}1a`,
          '--creator-accent-20': `${builderConfig.accentColor}33`,
          // HSL para Tailwind/shadcn (sin hsl())
          '--primary': hexToHsl(builderConfig.accentColor),
          '--ring': hexToHsl(builderConfig.accentColor),
          // Fuentes
          '--font-heading': FONT_FAMILY_MAP[builderConfig.fontHeading] || FONT_FAMILY_MAP.inter,
          '--font-body': FONT_FAMILY_MAP[builderConfig.fontBody] || FONT_FAMILY_MAP.inter,
          fontFamily: FONT_FAMILY_MAP[builderConfig.fontBody] || FONT_FAMILY_MAP.inter,
          // Espaciado global
          '--creator-spacing': SPACING_MAP[builderConfig.spacing] || SPACING_MAP.normal,
          gap: SPACING_MAP[builderConfig.spacing] || SPACING_MAP.normal,
          // Border radius global
          '--creator-radius': BORDER_RADIUS_MAP[builderConfig.borderRadius] || BORDER_RADIUS_MAP.md,
          '--radius': BORDER_RADIUS_MAP[builderConfig.borderRadius] || BORDER_RADIUS_MAP.md,
          borderRadius: BORDER_RADIUS_MAP[builderConfig.borderRadius] || BORDER_RADIUS_MAP.md,
        } as React.CSSProperties}
      >
        {/* Estado vacío - Onboarding freemium */}
        {sortedBlocks.length === 0 && (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-5',
              'min-h-[400px] rounded-xl border-2 border-dashed',
              'border-zinc-700 bg-gradient-to-b from-zinc-900/80 to-zinc-950/50',
              'p-8',
            )}
            aria-label="Canvas vacío"
          >
            {/* Header */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 border border-purple-500/20">
              <LayoutTemplate className="h-8 w-8 text-purple-400" aria-hidden="true" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-zinc-200">
                Construye tu perfil profesional
              </h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                Arrastra bloques desde el panel izquierdo para crear tu portafolio y empezar a vender tus servicios
              </p>
            </div>

            {/* Info del plan */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  'gap-1.5 px-3 py-1',
                  isPremium
                    ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                    : 'border-zinc-700 text-zinc-400 bg-zinc-800/50'
                )}
              >
                {isPremium ? (
                  <Crown className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isFinite(maxBlocks) ? `${maxBlocks} bloques disponibles` : 'Bloques ilimitados'}
              </Badge>

              <Badge
                variant="outline"
                className={cn(
                  'gap-1.5 px-3 py-1',
                  commissionRate <= 0.15
                    ? 'border-green-500/50 text-green-400 bg-green-500/10'
                    : 'border-zinc-700 text-zinc-400 bg-zinc-800/50'
                )}
              >
                <TrendingDown className="h-3.5 w-3.5" />
                {(commissionRate * 100).toFixed(0)}% comision
              </Badge>
            </div>

            {/* Drop zone */}
            <div className="mt-2">
              <DropZone id="canvas-empty-drop" className="w-56" />
              <p className="text-center text-[10px] text-zinc-600 mt-2">
                o haz clic en un bloque del panel
              </p>
            </div>
          </div>
        )}

        {/* Todos los bloques con drag & drop - usa el DndContext de ProfileBuilder */}
        {sortedBlocks.length > 0 && (
          <SortableContext items={allBlockIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col" style={{ gap: 'var(--creator-spacing, 1rem)' }} role="list" aria-label="Bloques del perfil">
              {sortedBlocks.map((block, index) => {
                const definition = BLOCK_DEFINITIONS[block.type];
                const isFirst = index === 0;
                const isLast = index === sortedBlocks.length - 1;

                return (
                  <div key={block.id} role="listitem">
                    <BlockWrapper
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      onSelect={() => onSelectBlock(block.id)}
                      onDelete={
                        definition?.isDeletable && onDeleteBlock
                          ? () => onDeleteBlock(block.id)
                          : undefined
                      }
                      onToggleVisibility={() =>
                        onUpdateBlock(block.id, { isVisible: !block.isVisible })
                      }
                      onMoveUp={!isFirst ? () => handleMoveUp(block.id) : undefined}
                      onMoveDown={!isLast ? () => handleMoveDown(block.id) : undefined}
                    >
                      <BlockRenderer
                        block={block}
                        isEditing={true}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => onSelectBlock(block.id)}
                        onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                        userId={userId}
                        creatorProfileId={creatorProfileId}
                        previewDevice={previewDevice}
                        renderChild={renderChild}
                        onAddBlockToColumn={
                          onAddBlockToContainer
                            ? (columnIndex) => onAddBlockToContainer(block.id, columnIndex)
                            : undefined
                        }
                        onRemoveChild={
                          onRemoveFromContainer
                            ? (childId) => onRemoveFromContainer(block.id, childId)
                            : undefined
                        }
                      />
                    </BlockWrapper>
                  </div>
                );
              })}
            </div>
          </SortableContext>
        )}

        {/* Drop zone al final de la lista */}
        {sortedBlocks.length > 0 && (
          <div className="mt-2">
            <DropZone id="canvas-bottom-drop" />
          </div>
        )}
      </div>
    </div>
  );
}
