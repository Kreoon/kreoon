import { Suspense, memo } from 'react';
import { cn } from '@/lib/utils';
import { BLOCK_COMPONENTS } from '@/components/profile-builder/blocks';
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
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8 md:px-12',
  xl: 'px-12 md:px-16',
};

const MARGIN_CLASSES: Record<NonNullable<BlockStyles['margin']>, string> = {
  none: 'my-0',
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-6',
  xl: 'my-10',
};

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
  const BlockComponent = BLOCK_COMPONENTS[block.type];

  if (!BlockComponent) {
    return <BlockFallback type={block.type} />;
  }

  const paddingClass = block.styles.padding
    ? PADDING_CLASSES[block.styles.padding]
    : PADDING_CLASSES['md'];

  const marginClass = block.styles.margin
    ? MARGIN_CLASSES[block.styles.margin]
    : MARGIN_CLASSES['md'];

  return (
    <div
      className={cn('w-full', paddingClass, marginClass)}
      data-block-type={block.type}
      style={{
        backgroundColor: block.styles.backgroundColor,
        color: block.styles.textColor,
      }}
    >
      <Suspense fallback={<BlockSkeleton />}>
        <BlockComponent
          block={block}
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
