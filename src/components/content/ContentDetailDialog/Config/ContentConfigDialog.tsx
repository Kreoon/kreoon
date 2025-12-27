import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useContentConfig } from './useContentConfig';
import { BlocksConfig } from './BlocksConfig';
import { PermissionsConfig } from './PermissionsConfig';
import { LayoutConfig } from './LayoutConfig';
import { StatesConfig } from './StatesConfig';
import { TextEditorConfig } from './TextEditorConfig';
import { AdvancedConfig } from './AdvancedConfig';
import { BlockKey, DEFAULT_BLOCKS } from './types';

interface ContentConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function ContentConfigDialog({ open, onOpenChange, organizationId }: ContentConfigDialogProps) {
  const [activeTab, setActiveTab] = useState('blocks');
  
  const {
    blocks,
    permissions,
    stateRules,
    advanced,
    loading,
    updateBlockVisibility,
    updateBlockOrder,
    updateBlockPermission,
    updateStateRule,
    updateAdvancedConfig,
  } = useContentConfig(organizationId);

  const visibleBlocks = DEFAULT_BLOCKS.filter(bk => {
    const block = blocks.find(b => b.block_key === bk);
    return block?.is_visible !== false;
  });

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            ⚙️ Configuración del Contenido
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Personaliza bloques, permisos, layout y comportamiento del detalle del contenido
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-4">
            <TabsTrigger value="blocks">Bloques</TabsTrigger>
            <TabsTrigger value="permissions">Permisos</TabsTrigger>
            <TabsTrigger value="layout">Orden</TabsTrigger>
            <TabsTrigger value="states">Estados</TabsTrigger>
            <TabsTrigger value="editor">Texto</TabsTrigger>
            <TabsTrigger value="advanced">Avanzado</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2">
            <TabsContent value="blocks" className="mt-0">
              <BlocksConfig 
                blocks={blocks}
                onToggle={updateBlockVisibility}
              />
            </TabsContent>

            <TabsContent value="permissions" className="mt-0">
              <PermissionsConfig
                permissions={permissions}
                visibleBlocks={visibleBlocks}
                onUpdate={updateBlockPermission}
              />
            </TabsContent>

            <TabsContent value="layout" className="mt-0">
              <LayoutConfig
                blocks={blocks}
                onReorder={updateBlockOrder}
              />
            </TabsContent>

            <TabsContent value="states" className="mt-0">
              <StatesConfig
                organizationId={organizationId}
                stateRules={stateRules}
                onUpdate={updateStateRule}
              />
            </TabsContent>

            <TabsContent value="editor" className="mt-0">
              <TextEditorConfig
                features={advanced?.text_editor_features ?? {
                  headings: true,
                  bold: true,
                  italic: true,
                  underline: true,
                  lists: true,
                  quotes: true,
                  code: true,
                  highlight: true,
                  emojis: true,
                  comments: true,
                  history: true,
                  links: true,
                  tables: true,
                  checklist: true,
                  images: true,
                }}
                onUpdate={(features) => updateAdvancedConfig({ text_editor_features: features })}
              />
            </TabsContent>

            <TabsContent value="advanced" className="mt-0">
              <AdvancedConfig
                config={advanced}
                onUpdate={updateAdvancedConfig}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
