import { Suspense, memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { BLOCK_COMPONENTS } from '@/components/profile-builder/blocks';
import { useCurrentDevice } from '@/hooks/useCurrentDevice';
import type { ProfileBlock, BlockType, BlockStyles } from '@/components/profile-builder/types/profile-builder';

// ─── Props del bloque en modo público ─────────────────────────────────────────

export interface PublicBlockProps {
  block: ProfileBlock;
  /** Datos del creador para bloques que los necesitan (ej: recommended_talent) */
  creatorProfile?: {
    id: string;
    user_id: string;
    display_name: string;
    categories?: string[];
  };
}

// ─── Padding/margin según estilos del bloque ─────────────────────────────────

const PADDING_CLASSES: Record<NonNullable<BlockStyles['padding']>, string> = {
  none: 'px-0',
  sm: 'px-0 sm:px-4',
  md: 'px-0 sm:px-6',
  lg: 'px-0 sm:px-8 md:px-12',
  xl: 'px-0 sm:px-12 md:px-16',
};

const MARGIN_CLASSES: Record<NonNullable<BlockStyles['margin']>, string> = {
  none: 'my-0',
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-6',
  xl: 'my-10',
};

/**
 * Resuelve config y styles del bloque según el dispositivo actual.
 * Aplica configOverrides y responsiveOverrides guardados en el builder.
 */
function resolveBlockForDevice(
  block: ProfileBlock,
  device: 'desktop' | 'tablet' | 'mobile'
): ProfileBlock {
  // Desktop usa los estilos base sin overrides
  if (device === 'desktop') {
    return block;
  }

  // Aplicar configOverrides para el dispositivo
  const configOverrides = block.configOverrides?.[device] || {};
  const resolvedConfig = { ...block.config, ...configOverrides };

  // Aplicar responsiveOverrides (estilos) para el dispositivo
  const styleOverrides = block.styles?.responsiveOverrides?.[device] || {};
  const resolvedStyles = { ...block.styles, ...styleOverrides };

  return {
    ...block,
    config: resolvedConfig,
    styles: resolvedStyles,
  };
}

// ─── Skeleton de carga ────────────────────────────────────────────────────────

function BlockSkeleton() {
  return (
    <div
      className="animate-pulse rounded-lg bg-zinc-800/40 h-32 w-full"
      aria-hidden="true"
      role="presentation"
    />
  );
}

// ─── Bloque no implementado ───────────────────────────────────────────────────

function BlockFallback({ type }: { type: BlockType }) {
  return (
    <div
      className="flex items-center justify-center h-16 rounded-lg border border-dashed border-zinc-700/40"
      role="status"
      aria-label={`Bloque ${type} no disponible`}
    />
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

function PublicBlockRendererComponent({ block, creatorProfile }: PublicBlockProps) {
  // Detectar dispositivo actual para aplicar overrides responsive
  const currentDevice = useCurrentDevice();

  // Resolver el bloque con los overrides del dispositivo actual
  const resolvedBlock = useMemo(
    () => resolveBlockForDevice(block, currentDevice),
    [block, currentDevice]
  );

  const BlockComponent = BLOCK_COMPONENTS[resolvedBlock.type];

  if (!BlockComponent) {
    return <BlockFallback type={resolvedBlock.type} />;
  }

  const paddingClass = resolvedBlock.styles?.padding
    ? PADDING_CLASSES[resolvedBlock.styles.padding]
    : PADDING_CLASSES['md'];

  const marginClass = resolvedBlock.styles?.margin
    ? MARGIN_CLASSES[resolvedBlock.styles.margin]
    : MARGIN_CLASSES['md'];

  return (
    <div
      className={cn('w-full', paddingClass, marginClass)}
      data-block-type={resolvedBlock.type}
      style={{
        backgroundColor: resolvedBlock.styles?.backgroundColor,
        color: resolvedBlock.styles?.textColor,
      }}
    >
      <Suspense fallback={<BlockSkeleton />}>
        <BlockComponent
          block={resolvedBlock}
          // Modo público: isEditing e isSelected siempre falsos
          isEditing={false}
          isSelected={false}
          onSelect={() => undefined}
          onUpdate={() => undefined}
          // Pasar creatorProfileId para bloques que lo necesitan
          creatorProfileId={creatorProfile?.id}
        />
      </Suspense>
    </div>
  );
}

export const PublicBlockRenderer = memo(PublicBlockRendererComponent);
