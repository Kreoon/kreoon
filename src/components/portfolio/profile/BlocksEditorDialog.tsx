import { useState, useCallback } from 'react';
import { useProfileBlocksConfig } from '@/hooks/useProfileBlocksConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Eye, EyeOff, Lock, Globe, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileBlock } from '@/hooks/usePortfolioPermissions';

interface BlocksEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BlocksEditorDialog({ open, onOpenChange }: BlocksEditorDialogProps) {
  const { blocks, loading, saving, toggleBlock, reorderBlocks } = useProfileBlocksConfig();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [orderedBlocks, setOrderedBlocks] = useState<ProfileBlock[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize ordered blocks when dialog opens
  useState(() => {
    if (blocks.length > 0) {
      setOrderedBlocks([...blocks]);
    }
  });

  // Update when blocks change
  if (blocks.length > 0 && orderedBlocks.length === 0) {
    setOrderedBlocks([...blocks]);
  }

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newBlocks = [...orderedBlocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, draggedBlock);

    // Update order numbers
    const reorderedBlocks = newBlocks.map((block, idx) => ({ ...block, order: idx }));
    setOrderedBlocks(reorderedBlocks);
    setDraggedIndex(targetIndex);
    setHasChanges(true);
  }, [draggedIndex, orderedBlocks]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleToggle = useCallback(async (key: string) => {
    const success = await toggleBlock(key);
    if (success) {
      setOrderedBlocks(prev => 
        prev.map(b => b.key === key ? { ...b, enabled: !b.enabled } : b)
      );
    }
  }, [toggleBlock]);

  const handleSaveOrder = useCallback(async () => {
    const orderedKeys = orderedBlocks.map(b => b.key);
    const success = await reorderBlocks(orderedKeys);
    if (success) {
      setHasChanges(false);
    }
  }, [orderedBlocks, reorderBlocks]);

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return <Globe className="h-3 w-3" />;
      case 'owner': return <Lock className="h-3 w-3" />;
      case 'org_admin': return <Users className="h-3 w-3" />;
      default: return <Eye className="h-3 w-3" />;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'Público';
      case 'owner': return 'Solo dueño';
      case 'org_admin': return 'Solo admin';
      default: return visibility;
    }
  };

  const publicBlocks = orderedBlocks.filter(b => !b.is_internal);
  const internalBlocks = orderedBlocks.filter(b => b.is_internal);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurar bloques del perfil</DialogTitle>
          <DialogDescription>
            Arrastra para reordenar, activa o desactiva bloques
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Public blocks */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Bloques públicos
              </h3>
              <div className="space-y-2">
                {publicBlocks.map((block, index) => (
                  <div
                    key={block.key}
                    draggable
                    onDragStart={() => handleDragStart(orderedBlocks.indexOf(block))}
                    onDragOver={(e) => handleDragOver(e, orderedBlocks.indexOf(block))}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-move transition-all",
                      draggedIndex === orderedBlocks.indexOf(block) && "opacity-50 ring-2 ring-primary",
                      !block.enabled && "opacity-60"
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium", !block.enabled && "line-through text-muted-foreground")}>
                          {block.label}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                          {getVisibilityIcon(block.visibility)}
                          {getVisibilityLabel(block.visibility)}
                        </Badge>
                      </div>
                    </div>

                    <Switch
                      checked={block.enabled}
                      onCheckedChange={() => handleToggle(block.key)}
                      disabled={saving}
                      className="flex-shrink-0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Internal blocks */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Bloques internos (solo administradores)
              </h3>
              <div className="space-y-2">
                {internalBlocks.map((block) => (
                  <div
                    key={block.key}
                    className={cn(
                      "flex items-center gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg",
                      !block.enabled && "opacity-60"
                    )}
                  >
                    <Users className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <span className={cn("font-medium text-yellow-700", !block.enabled && "line-through")}>
                        {block.label}
                      </span>
                    </div>

                    <Switch
                      checked={block.enabled}
                      onCheckedChange={() => handleToggle(block.key)}
                      disabled={saving}
                      className="flex-shrink-0"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {hasChanges && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setOrderedBlocks([...blocks]);
                setHasChanges(false);
              }}
            >
              Descartar
            </Button>
            <Button onClick={handleSaveOrder} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar orden'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
