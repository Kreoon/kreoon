import { FileText, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ManualScriptInputProps {
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
  placeholder?: string;
}

export function ManualScriptInput({
  value,
  onChange,
  editing,
  placeholder = 'Pega aqui el guion completo, brief o indicaciones del cliente...'
}: ManualScriptInputProps) {
  return (
    <div className="space-y-4 rounded-lg border border-green-200 dark:border-green-800/50 p-4 bg-green-50/30 dark:bg-green-950/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="font-semibold text-foreground">Guion / Brief Directo</span>
        </div>
        <Badge
          variant="outline"
          className="text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 bg-green-100/50 dark:bg-green-900/30"
        >
          Modo Manual
        </Badge>
      </div>

      {/* Info message */}
      <div className="flex items-start gap-2 p-3 rounded-md bg-green-100/50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30">
        <Info className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        <p className="text-sm text-green-700 dark:text-green-300">
          <strong>Todos los campos son opcionales.</strong> Puedes crear el proyecto con solo el titulo y agregar detalles despues.
          Este modo omite el cuestionario DNA para proyectos donde ya tienes la informacion del cliente.
        </p>
      </div>

      {/* Content area */}
      {editing ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={12}
          className={cn(
            'font-mono text-sm resize-none',
            'bg-white dark:bg-gray-950',
            'border-green-200 dark:border-green-800/50',
            'focus:border-green-500 focus:ring-green-500/20'
          )}
        />
      ) : (
        <div className={cn(
          'min-h-[200px] p-4 rounded-md',
          'bg-white dark:bg-gray-950',
          'border border-green-200 dark:border-green-800/50'
        )}>
          {value ? (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {value}
            </div>
          ) : (
            <span className="text-muted-foreground italic">Sin guion ingresado</span>
          )}
        </div>
      )}

      {/* Character count when editing */}
      {editing && (
        <div className="flex justify-end">
          <span className="text-xs text-muted-foreground">
            {value.length.toLocaleString()} caracteres
          </span>
        </div>
      )}
    </div>
  );
}
