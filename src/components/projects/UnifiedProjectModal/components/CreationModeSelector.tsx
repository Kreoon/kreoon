import { Dna, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CreationMode } from '@/types/unifiedProject.types';

interface CreationModeSelectorProps {
  onSelectMode: (mode: CreationMode) => void;
  onCancel: () => void;
}

export function CreationModeSelector({ onSelectMode, onCancel }: CreationModeSelectorProps) {
  return (
    <div className="space-y-6 py-2">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Como deseas crear este proyecto?
        </h2>
        <p className="text-sm text-muted-foreground">
          Elige la forma de configurar el brief del proyecto
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Standard Mode - DNA Questionnaire */}
        <button
          onClick={() => onSelectMode('standard')}
          className={cn(
            'group relative p-6 rounded-lg border-2 border-transparent',
            'bg-purple-50/50 dark:bg-purple-950/20',
            'hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30',
            'transition-all duration-200 text-left'
          )}
        >
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <Dna className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                Con Cuestionario DNA
                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="text-sm text-muted-foreground">
                Responde preguntas y opcionalmente graba un audio para generar el brief completo del proyecto.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                Preguntas guiadas
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                Audio opcional
              </span>
            </div>
          </div>
        </button>

        {/* Manual Mode - Direct Script */}
        <button
          onClick={() => onSelectMode('manual')}
          className={cn(
            'group relative p-6 rounded-lg border-2 border-transparent',
            'bg-green-50/50 dark:bg-green-950/20',
            'hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30',
            'transition-all duration-200 text-left'
          )}
        >
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                Modo Manual
                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="text-sm text-muted-foreground">
                Ya tienes el guion o la informacion completa. Ingresa directamente el contenido sin preguntas.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                Guion directo
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                Mas rapido
              </span>
            </div>
          </div>
        </button>
      </div>

      <div className="flex justify-center pt-2">
        <Button variant="ghost" onClick={onCancel} className="text-muted-foreground">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
