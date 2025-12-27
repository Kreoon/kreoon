import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Layers, PanelTop, LayoutGrid } from 'lucide-react';
import { BLOCK_METADATA, DEFAULT_BLOCKS, BlockKey, LayoutType } from './types';

interface LayoutConfigProps {
  blocks: { block_key: string; is_visible: boolean; sort_order: number; layout_type: string }[];
  onReorder: (orderedBlocks: { block_key: BlockKey; sort_order: number }[]) => void;
  onLayoutChange?: (layoutType: LayoutType) => void;
}

const LAYOUT_OPTIONS: { value: LayoutType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'tab', label: 'Pestañas', icon: <LayoutGrid className="h-5 w-5" />, description: 'Vista de pestañas horizontales' },
  { value: 'accordion', label: 'Acordeón', icon: <PanelTop className="h-5 w-5" />, description: 'Secciones colapsables' },
  { value: 'section', label: 'Secciones', icon: <Layers className="h-5 w-5" />, description: 'Vista de secciones apiladas' },
];

export function LayoutConfig({ blocks, onReorder, onLayoutChange }: LayoutConfigProps) {
  const [layoutType, setLayoutType] = useState<LayoutType>('tab');
  const [draggedItem, setDraggedItem] = useState<BlockKey | null>(null);

  const visibleBlocks = DEFAULT_BLOCKS.filter(bk => {
    const block = blocks.find(b => b.block_key === bk);
    return block?.is_visible !== false;
  });

  const sortedBlocks = [...visibleBlocks].sort((a, b) => {
    const aBlock = blocks.find(bl => bl.block_key === a);
    const bBlock = blocks.find(bl => bl.block_key === b);
    return (aBlock?.sort_order ?? 0) - (bBlock?.sort_order ?? 0);
  });

  const handleDragStart = (e: React.DragEvent, blockKey: BlockKey) => {
    setDraggedItem(blockKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetKey: BlockKey) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetKey) return;

    const oldIndex = sortedBlocks.indexOf(draggedItem);
    const newIndex = sortedBlocks.indexOf(targetKey);
    
    const newOrder = [...sortedBlocks];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, draggedItem);

    const orderedBlocks = newOrder.map((key, index) => ({
      block_key: key,
      sort_order: index,
    }));

    onReorder(orderedBlocks);
    setDraggedItem(null);
  };

  const handleLayoutChange = (value: LayoutType) => {
    setLayoutType(value);
    onLayoutChange?.(value);
  };

  return (
    <div className="space-y-6">
      {/* Layout Type Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Tipo de Layout</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Define cómo se mostrarán los bloques en el detalle del contenido
        </p>

        <RadioGroup 
          value={layoutType} 
          onValueChange={(v) => handleLayoutChange(v as LayoutType)}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {LAYOUT_OPTIONS.map(option => (
            <Card 
              key={option.value}
              className={`p-4 cursor-pointer transition-all ${
                layoutType === option.value 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}
            >
              <Label className="flex flex-col items-center gap-2 cursor-pointer">
                <RadioGroupItem value={option.value} className="sr-only" />
                {option.icon}
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground text-center">
                  {option.description}
                </span>
              </Label>
            </Card>
          ))}
        </RadioGroup>
      </div>

      {/* Block Order */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Orden de Bloques</h3>
            <p className="text-sm text-muted-foreground">
              Arrastra para reordenar los bloques
            </p>
          </div>
          <Badge variant="outline">{sortedBlocks.length} bloques</Badge>
        </div>

        <div className="space-y-2">
          {sortedBlocks.map((blockKey, index) => {
            const meta = BLOCK_METADATA[blockKey];
            
            return (
              <Card
                key={blockKey}
                draggable
                onDragStart={(e) => handleDragStart(e, blockKey)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, blockKey)}
                className={`p-3 cursor-grab active:cursor-grabbing transition-all ${
                  draggedItem === blockKey ? 'opacity-50 scale-95' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <Badge variant="secondary" className="w-6 h-6 p-0 justify-center">
                    {index + 1}
                  </Badge>
                  <span className="text-xl">{meta.icon}</span>
                  <span className="font-medium">{meta.label}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 El orden y layout afectan a todos los usuarios de la organización.
      </p>
    </div>
  );
}
