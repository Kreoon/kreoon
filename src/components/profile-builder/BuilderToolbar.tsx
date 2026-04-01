import { Monitor, Tablet, Smartphone, Save, Eye, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BuilderToolbarProps {
  isDirty: boolean;
  isSaving: boolean;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  profileId: string;
  onSaveDraft: () => void;
  onPublish: () => void;
  onPreview: () => void;
  onDeviceChange: (device: 'desktop' | 'tablet' | 'mobile') => void;
}

const DEVICES = [
  { id: 'desktop', icon: Monitor, label: 'Escritorio' },
  { id: 'tablet', icon: Tablet, label: 'Tablet' },
  { id: 'mobile', icon: Smartphone, label: 'Móvil' },
] as const;

export function BuilderToolbar({
  isDirty,
  isSaving,
  previewDevice,
  onSaveDraft,
  onPublish,
  onPreview,
  onDeviceChange,
}: BuilderToolbarProps) {
  return (
    <TooltipProvider>
      <div className="h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 gap-4 flex-shrink-0">
        {/* Izquierda: indicador de cambios */}
        <div className="flex items-center gap-2 min-w-[160px]">
          {isDirty && !isSaving && (
            <span className="flex items-center gap-1.5 text-xs text-amber-500">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Cambios sin guardar
            </span>
          )}
          {isSaving && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cloud className="h-3.5 w-3.5 animate-pulse" />
              Guardando...
            </span>
          )}
          {!isDirty && !isSaving && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cloud className="h-3.5 w-3.5" />
              Todo guardado
            </span>
          )}
        </div>

        {/* Centro: toggle de dispositivos */}
        <div className="flex items-center gap-1 bg-muted rounded-sm p-1">
          {DEVICES.map(({ id, icon: Icon, label }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onDeviceChange(id)}
                  aria-label={`Vista ${label}`}
                  className={cn(
                    'p-1.5 rounded-sm transition-colors',
                    previewDevice === id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Derecha: acciones */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onPreview}
                aria-label="Abrir preview en nueva pestaña"
              >
                <Eye className="h-4 w-4 mr-1.5" />
                Preview
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Abre tu perfil público en nueva pestaña</p>
            </TooltipContent>
          </Tooltip>

          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSaving || !isDirty}
            aria-label="Guardar borrador"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Guardar borrador
          </Button>

          <Button
            size="sm"
            onClick={onPublish}
            disabled={isSaving}
            aria-label="Publicar perfil"
          >
            Publicar
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
