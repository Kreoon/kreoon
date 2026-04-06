import { LayoutGrid, Palette, AlertTriangle, Dna } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BlockPalette } from './BlockPalette';
import { StylesPanel } from './StylesPanel';
import { DNADataPanel } from './DNADataPanel';
import { useCreatorPlanFeatures } from '@/hooks/useCreatorPlanFeatures';
import { useDNAForBuilder } from './hooks/useDNAForBuilder';
import { cn } from '@/lib/utils';
import type { BuilderConfig, ProfileBlock } from './types/profile-builder';

interface BuilderSidebarProps {
  blocks: ProfileBlock[];
  builderConfig: BuilderConfig;
  onConfigChange: (updates: Partial<BuilderConfig>) => void;
  onUpgradeClick?: () => void;
  creatorProfileId?: string;
  featuredMediaUrl?: string | null;
  featuredMediaType?: 'image' | 'video' | null;
}

export function BuilderSidebar({
  blocks,
  builderConfig,
  onConfigChange,
  onUpgradeClick,
  creatorProfileId,
  featuredMediaUrl,
  featuredMediaType,
}: BuilderSidebarProps) {
  const { maxBlocks } = useCreatorPlanFeatures();
  const { hasDNA } = useDNAForBuilder();
  const isUnlimited = !isFinite(maxBlocks);
  const blocksRemaining = isUnlimited ? Infinity : maxBlocks - blocks.length;
  const isNearLimit = !isUnlimited && blocksRemaining <= 2 && blocksRemaining > 0;
  const isAtLimit = !isUnlimited && blocksRemaining <= 0;

  return (
    <aside
      className="w-64 border-r border-border bg-background flex flex-col flex-shrink-0 overflow-hidden"
      aria-label="Panel lateral del editor"
    >
      <Tabs defaultValue="blocks" className="flex flex-col h-full">
        <TabsList className="rounded-none border-b border-border bg-transparent h-10 px-0 w-full justify-start gap-0 flex-shrink-0">
          <TabsTrigger
            value="blocks"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs h-full"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Bloques
          </TabsTrigger>
          <TabsTrigger
            value="styles"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs h-full"
          >
            <Palette className="h-3.5 w-3.5" />
            Estilos
          </TabsTrigger>
          <TabsTrigger
            value="dna"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs h-full relative"
          >
            <Dna className="h-3.5 w-3.5" />
            ADN
            {hasDNA && (
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[8px] bg-purple-500/20 text-purple-400 border-purple-500/30"
              >
                <span className="sr-only">ADN disponible</span>
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            {/* Contador de bloques */}
            <div
              className={cn(
                'mx-3 mt-3 mb-2 px-3 py-2 rounded-md text-xs flex items-center gap-2',
                isAtLimit && 'bg-red-500/10 text-red-400',
                isNearLimit && !isAtLimit && 'bg-amber-500/10 text-amber-400',
                !isNearLimit && !isAtLimit && 'bg-muted/50 text-muted-foreground'
              )}
            >
              {(isAtLimit || isNearLimit) && (
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span>
                {isUnlimited
                  ? `${blocks.length} bloques`
                  : isAtLimit
                    ? 'Limite alcanzado'
                    : isNearLimit
                      ? `Solo ${blocksRemaining} bloque${blocksRemaining > 1 ? 's' : ''} restante${blocksRemaining > 1 ? 's' : ''}`
                      : `${blocks.length}/${maxBlocks} bloques usados`}
              </span>
            </div>
            <BlockPalette existingBlocks={blocks} onUpgradeClick={onUpgradeClick} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="styles" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <StylesPanel
              config={builderConfig}
              onChange={onConfigChange}
              creatorProfileId={creatorProfileId}
              featuredMediaUrl={featuredMediaUrl}
              featuredMediaType={featuredMediaType}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="dna" className="flex-1 overflow-hidden mt-0">
          <DNADataPanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
