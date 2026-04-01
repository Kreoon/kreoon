import { LayoutGrid, Palette } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BlockPalette } from './BlockPalette';
import { StylesPanel } from './StylesPanel';
import type { BuilderConfig, ProfileBlock } from './types/profile-builder';

interface BuilderSidebarProps {
  blocks: ProfileBlock[];
  builderConfig: BuilderConfig;
  onConfigChange: (updates: Partial<BuilderConfig>) => void;
}

export function BuilderSidebar({
  blocks,
  builderConfig,
  onConfigChange,
}: BuilderSidebarProps) {
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
        </TabsList>

        <TabsContent value="blocks" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <BlockPalette existingBlocks={blocks} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="styles" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <StylesPanel config={builderConfig} onChange={onConfigChange} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
