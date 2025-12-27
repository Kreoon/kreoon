import { useProfileBlocksConfig } from '@/hooks/useProfileBlocksConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface BlocksEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BlocksEditorDialog({ open, onOpenChange }: BlocksEditorDialogProps) {
  const { blocks, loading, saving, toggleBlock } = useProfileBlocksConfig();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar bloques del perfil</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map(block => (
              <div 
                key={block.key}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{block.label}</span>
                  {block.is_internal && (
                    <Badge variant="outline" className="text-xs">Interno</Badge>
                  )}
                </div>
                <Switch
                  checked={block.enabled}
                  onCheckedChange={() => toggleBlock(block.key)}
                  disabled={saving}
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
