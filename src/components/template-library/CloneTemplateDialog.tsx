import { useState } from 'react';
import { AlertTriangle, Heart, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { PublicTemplate } from './TemplateCard';

type CopyMode = 'with_content' | 'structure_only';
type ApplyMode = 'replace' | 'append';

interface CloneTemplateDialogProps {
  template: PublicTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /**
   * Funcion de clonacion inyectable.
   * Recibe el id de plantilla y las opciones elegidas.
   */
  onClone?: (
    templateId: string,
    options: { copyMode: CopyMode; applyMode: ApplyMode },
  ) => Promise<void>;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function CloneTemplateDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
  onClone,
}: CloneTemplateDialogProps) {
  const [copyMode, setCopyMode] = useState<CopyMode>('structure_only');
  const [applyMode, setApplyMode] = useState<ApplyMode>('replace');
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (!template || !onClone) return;

    setIsApplying(true);
    try {
      await onClone(template.id, { copyMode, applyMode });
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    if (isApplying) return;
    onOpenChange(false);
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Aplicar plantilla</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Preview compacto del template */}
          <div className="flex gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800">
            {template.thumbnail_url ? (
              <img
                src={template.thumbnail_url}
                alt={`Preview de ${template.name}`}
                className="w-16 h-12 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-12 rounded-lg bg-gradient-to-br from-purple-900 to-slate-900 flex-shrink-0 flex items-center justify-center">
                <span className="text-white/30 text-xl font-bold">
                  {template.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0 flex flex-col justify-center">
              <p className="text-white font-medium text-sm truncate">{template.name}</p>
              {template.description && (
                <p className="text-gray-400 text-xs line-clamp-2 mt-0.5">{template.description}</p>
              )}
              <div className="flex items-center gap-2.5 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="h-3 w-3" />
                  {formatCount(template.use_count)} usos
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Heart className="h-3 w-3" />
                  {formatCount(template.like_count)}
                </span>
              </div>
            </div>
          </div>

          {/* Opcion: copiar textos */}
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm font-medium">Contenido</Label>
            <RadioGroup
              value={copyMode}
              onValueChange={(v) => setCopyMode(v as CopyMode)}
              className="space-y-2"
            >
              <label
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  copyMode === 'structure_only'
                    ? 'border-purple-500/50 bg-purple-500/5'
                    : 'border-gray-800 hover:border-gray-700',
                )}
              >
                <RadioGroupItem
                  value="structure_only"
                  className="border-gray-600 text-purple-500 mt-0.5"
                />
                <div>
                  <p className="text-sm text-white font-medium">Solo estructura</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Importa el diseno y disposicion de bloques sin textos de ejemplo.
                  </p>
                </div>
              </label>
              <label
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  copyMode === 'with_content'
                    ? 'border-purple-500/50 bg-purple-500/5'
                    : 'border-gray-800 hover:border-gray-700',
                )}
              >
                <RadioGroupItem
                  value="with_content"
                  className="border-gray-600 text-purple-500 mt-0.5"
                />
                <div>
                  <p className="text-sm text-white font-medium">Copiar textos de ejemplo</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Incluye los textos de la plantilla como punto de partida.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Opcion: reemplazar o agregar */}
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm font-medium">Como aplicarla</Label>
            <RadioGroup
              value={applyMode}
              onValueChange={(v) => setApplyMode(v as ApplyMode)}
              className="space-y-2"
            >
              <label
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  applyMode === 'replace'
                    ? 'border-purple-500/50 bg-purple-500/5'
                    : 'border-gray-800 hover:border-gray-700',
                )}
              >
                <RadioGroupItem
                  value="replace"
                  className="border-gray-600 text-purple-500 mt-0.5"
                />
                <div>
                  <p className="text-sm text-white font-medium">Reemplazar mi perfil</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Borra el diseno actual y lo reemplaza con esta plantilla.
                  </p>
                </div>
              </label>
              <label
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  applyMode === 'append'
                    ? 'border-purple-500/50 bg-purple-500/5'
                    : 'border-gray-800 hover:border-gray-700',
                )}
              >
                <RadioGroupItem
                  value="append"
                  className="border-gray-600 text-purple-500 mt-0.5"
                />
                <div>
                  <p className="text-sm text-white font-medium">Agregar bloques</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Anade los bloques de la plantilla al final de tu perfil actual.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Warning si reemplaza */}
          {applyMode === 'replace' && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Esto sobrescribira tu diseno actual. Esta accion no se puede deshacer.
              </span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isApplying}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApply}
              disabled={isApplying || !onClone}
              className={cn(
                'text-white',
                applyMode === 'replace'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-purple-600 hover:bg-purple-700',
              )}
            >
              {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aplicar plantilla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
