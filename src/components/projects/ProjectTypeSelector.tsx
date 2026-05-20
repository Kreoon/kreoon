import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PROJECT_TYPE_REGISTRY } from '@/types/unifiedProject.types';
import type { ProjectType } from '@/types/unifiedProject.types';
import { Video, Film, Target, Code, GraduationCap, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Video,
  Film,
  Target,
  Code,
  GraduationCap,
  Camera,
};

interface ProjectTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: ProjectType) => void;
  /** Optional: hide specific types (e.g., hide content_creation in marketplace) */
  excludeTypes?: ProjectType[];
  /** Optional: muestra una tarjeta especial de Fillmaker/Grabación */
  onSelectFillmaker?: () => void;
}

export function ProjectTypeSelector({ open, onOpenChange, onSelect, excludeTypes = [], onSelectFillmaker }: ProjectTypeSelectorProps) {
  const types = Object.values(PROJECT_TYPE_REGISTRY).filter(
    config => !excludeTypes.includes(config.type),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Tipo de Proyecto</DialogTitle>
          <DialogDescription>
            Selecciona la categoria del proyecto para activar los campos correspondientes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {types.map(config => {
            const Icon = ICON_MAP[config.icon] || Video;

            return (
              <button
                key={config.type}
                onClick={() => {
                  onSelect(config.type);
                  onOpenChange(false);
                }}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-sm border text-left transition-all',
                  'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                  'border-border/50 hover:border-primary/40 bg-card hover:bg-accent/50',
                )}
              >
                <div className={cn('p-2 rounded-sm shrink-0', config.bgColor)}>
                  <Icon className={cn('h-5 w-5', config.color)} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{config.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {getTypeDescription(config.type)}
                  </p>
                </div>
              </button>
            );
          })}

          {onSelectFillmaker && (
            <button
              onClick={() => {
                onSelectFillmaker();
                onOpenChange(false);
              }}
              className={cn(
                'flex items-start gap-3 p-4 rounded-sm border text-left transition-all',
                'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                'border-violet-500/30 hover:border-violet-500/60 bg-card hover:bg-violet-500/5',
              )}
            >
              <div className="p-2 rounded-sm shrink-0 bg-violet-500/10">
                <Camera className="h-5 w-5 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Servicio de Grabación</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  Fillmaker: grabación en locación para un cliente, con pago al editor
                </p>
              </div>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getTypeDescription(type: ProjectType): string {
  switch (type) {
    case 'content_creation':
      return 'UGC, videos, reels, contenido para redes sociales';
    case 'post_production':
      return 'Edicion de video, motion graphics, colorimetria';
    case 'strategy_marketing':
      return 'Estrategia digital, campanas, analisis de mercado';
    case 'technology':
      return 'Desarrollo web, apps, integraciones, automatizaciones';
    case 'education':
      return 'Cursos, talleres, material educativo';
    default:
      return '';
  }
}

export default ProjectTypeSelector;
