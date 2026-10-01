import {
  LayoutTemplate,
  Layers,
  Palette,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderPanel } from "./types";

interface LeftToolRailProps {
  activePanel: BuilderPanel;
  onPanelChange: (panel: BuilderPanel) => void;
}

const RAIL_ITEMS: Array<{
  panel: BuilderPanel;
  icon: LucideIcon;
  label: string;
}> = [
  { panel: "templates", icon: LayoutTemplate, label: "Plantillas" },
  { panel: "sections", icon: Layers, label: "Secciones" },
  { panel: "style", icon: Palette, label: "Estilo" },
  // «Medios» e «IA» se retiraron del carril: no tenían funciones (paneles «Pronto»). Las fotos y
  // videos se suben desde cada sección en el lienzo (MediaLibraryPicker).
  { panel: "publish", icon: Send, label: "Publicar" },
];

export function LeftToolRail({
  activePanel,
  onPanelChange,
}: LeftToolRailProps) {
  return (
    <nav
      className={cn(
        "flex shrink-0 border-border bg-card",
        // Móvil: barra inferior horizontal
        "order-last h-16 w-full flex-row items-center justify-around border-t px-2 pb-[env(safe-area-inset-bottom)]",
        // Escritorio: carril vertical a la izquierda
        "md:order-none md:h-auto md:w-16 md:flex-col md:justify-start md:gap-1 md:border-r md:border-t-0 md:px-0 md:py-3",
      )}
      aria-label="Herramientas del editor"
    >
      {RAIL_ITEMS.map(({ panel, icon: Icon, label }) => (
        <button
          key={panel}
          type="button"
          onClick={() => onPanelChange(panel)}
          className={cn(
            "flex min-h-11 w-16 flex-col items-center justify-center gap-1 rounded-lg py-1.5 md:w-14 md:py-2 text-[10px] font-medium transition-colors",
            activePanel === panel
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-label={label}
          aria-pressed={activePanel === panel}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </nav>
  );
}
