import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';
import { BLOCK_METADATA, DEFAULT_BLOCKS, BlockKey } from './types';

interface BlocksConfigProps {
  blocks: { block_key: string; is_visible: boolean }[];
  onToggle: (blockKey: BlockKey, visible: boolean) => void;
}

export function BlocksConfig({ blocks, onToggle }: BlocksConfigProps) {
  const getBlockVisibility = (key: BlockKey) => {
    const block = blocks.find(b => b.block_key === key);
    return block?.is_visible ?? true;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Bloques del Contenido</h3>
          <p className="text-sm text-muted-foreground">
            Activa o desactiva los bloques que se mostrarán en el detalle del contenido
          </p>
        </div>
        <Badge variant="outline">
          {blocks.filter(b => b.is_visible !== false).length} / {DEFAULT_BLOCKS.length} activos
        </Badge>
      </div>

      <div className="grid gap-3">
        {DEFAULT_BLOCKS.map((blockKey) => {
          const meta = BLOCK_METADATA[blockKey];
          const isVisible = getBlockVisibility(blockKey);

          return (
            <Card 
              key={blockKey} 
              className={`p-4 transition-all ${!isVisible ? 'opacity-50 bg-muted/30' : ''}`}
            >
              <div className="flex items-center gap-4">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                
                <div className="text-2xl">{meta.icon}</div>
                
                <div className="flex-1 min-w-0">
                  <Label htmlFor={`block-${blockKey}`} className="font-medium cursor-pointer">
                    {meta.label}
                  </Label>
                  <p className="text-sm text-muted-foreground truncate">
                    {meta.description}
                  </p>
                </div>

                <Switch
                  id={`block-${blockKey}`}
                  checked={isVisible}
                  onCheckedChange={(checked) => onToggle(blockKey, checked)}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        💡 Los bloques desactivados no se renderizarán para ningún usuario. 
        Los permisos granulares controlan quién puede ver/editar cada bloque activo.
      </p>
    </div>
  );
}
