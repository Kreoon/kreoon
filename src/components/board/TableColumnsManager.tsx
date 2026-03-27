import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BOARD_FIELDS } from "./boardFieldsConfig";

interface TableColumnsManagerProps {
  /** Todos los campos disponibles */
  allFields: string[];
  /** Campos actualmente visibles */
  visibleFields: string[];
  /** Callback para agregar columna */
  onAddColumn: (field: string) => void;
}

/**
 * Botón "+" al final del header de tabla que permite agregar columnas ocultas.
 * Estilo Notion: muestra campos ocultos y permite re-agregarlos.
 */
export function TableColumnsManager({
  allFields,
  visibleFields,
  onAddColumn,
}: TableColumnsManagerProps) {
  const hiddenFields = allFields.filter(f => !visibleFields.includes(f));

  if (hiddenFields.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="end">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
            Agregar columna ({hiddenFields.length} ocultas)
          </p>
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {hiddenFields.map(field => {
              const config = BOARD_FIELDS[field];
              return (
                <Button
                  key={field}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-8 px-2 text-sm font-normal hover:bg-purple-50 dark:hover:bg-purple-500/10"
                  onClick={() => onAddColumn(field)}
                >
                  <Eye className="h-3.5 w-3.5 text-purple-500" />
                  {config?.label || field}
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
