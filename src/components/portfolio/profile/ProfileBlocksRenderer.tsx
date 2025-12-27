import { ProfileBlock } from '@/hooks/usePortfolioPermissions';
import { usePortfolioPermissions } from '@/hooks/usePortfolioPermissions';
import { cn } from '@/lib/utils';

interface ProfileBlocksRendererProps {
  blocks: ProfileBlock[];
  userId: string;
  isOwner: boolean;
  editMode?: boolean;
}

export default function ProfileBlocksRenderer({
  blocks,
  userId,
  isOwner,
  editMode = false,
}: ProfileBlocksRendererProps) {
  const { canViewBlock } = usePortfolioPermissions();

  const visibleBlocks = blocks
    .filter(block => canViewBlock(block, isOwner, userId))
    .sort((a, b) => a.order - b.order);

  if (visibleBlocks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay contenido para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visibleBlocks.map(block => (
        <BlockRenderer 
          key={block.key} 
          block={block} 
          userId={userId}
          editMode={editMode}
        />
      ))}
    </div>
  );
}

function BlockRenderer({ 
  block, 
  userId,
  editMode 
}: { 
  block: ProfileBlock; 
  userId: string;
  editMode: boolean;
}) {
  // Placeholder for each block type
  const renderBlockContent = () => {
    switch (block.key) {
      case 'portfolio_grid':
        return <PortfolioGridBlock userId={userId} />;
      case 'hero':
      case 'highlights':
      case 'skills':
      case 'certifications':
      case 'testimonials':
      case 'public_stats':
      case 'collections':
        return (
          <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
            {block.label} - En desarrollo
          </div>
        );
      default:
        if (block.is_internal) {
          return (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
              <span className="text-yellow-600">[Admin] {block.label}</span>
            </div>
          );
        }
        return null;
    }
  };

  return (
    <section className={cn(editMode && "ring-2 ring-primary/20 ring-offset-2 rounded-lg")}>
      {renderBlockContent()}
    </section>
  );
}

function PortfolioGridBlock({ userId }: { userId: string }) {
  // Simple placeholder grid
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square bg-muted rounded-sm" />
      ))}
    </div>
  );
}
