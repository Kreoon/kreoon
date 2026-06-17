import { ScrollArea } from '@/components/ui/scroll-area';
import type { BuilderPanel, BuilderSection } from './types';

interface ContextPanelProps {
  activePanel: BuilderPanel;
  selectedSection: BuilderSection | null;
}

const PANEL_TITLES: Record<BuilderPanel, string> = {
  templates: 'Plantillas',
  sections: 'Secciones',
  style: 'Estilo',
  media: 'Media',
  ai: 'IA',
  publish: 'Publicar',
};

export function ContextPanel({ activePanel, selectedSection }: ContextPanelProps) {
  return (
    <aside className="flex w-80 flex-shrink-0 flex-col border-l border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{PANEL_TITLES[activePanel]}</p>
        <p className="text-xs text-muted-foreground">Configura tu portafolio por secciones.</p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {selectedSection ? (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Seccion seleccionada</p>
              <p className="mt-1 text-sm font-medium text-foreground">{selectedSection.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{selectedSection.description}</p>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-center">
              <p className="text-sm font-medium text-foreground">Selecciona una seccion</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Haz clic en un bloque del preview para editarlo aqui.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
