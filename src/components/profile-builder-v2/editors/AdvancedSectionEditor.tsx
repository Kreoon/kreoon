import { Info } from "lucide-react";
import type { SectionEditorProps } from "./fields";

export function AdvancedSectionEditor({ section }: SectionEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{section.label}</p>
        <p className="text-xs text-muted-foreground">{section.description}</p>
      </div>
      <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Esta seccion avanzada se edita visualmente en el lienzo. Puedes
          mostrarla u ocultarla desde el panel de secciones.
        </span>
      </div>
      {!section.isVisible && (
        <p className="text-xs text-amber-500">
          Esta seccion esta oculta actualmente.
        </p>
      )}
    </div>
  );
}
