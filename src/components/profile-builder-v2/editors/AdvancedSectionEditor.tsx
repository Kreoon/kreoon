import { Info } from "lucide-react";
import type { SectionEditorProps } from "./types";

export function AdvancedSectionEditor({ section }: SectionEditorProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
        <p className="text-sm font-medium text-foreground">{section.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {section.description}
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Esta sección está {section.isVisible ? "visible" : "oculta"} en tu
          perfil. Puedes mostrarla u ocultarla y reordenarla desde la lista de
          secciones.
        </span>
      </div>
    </div>
  );
}
