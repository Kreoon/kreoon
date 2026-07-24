import {
  LayoutTemplate,
  Layers,
  Palette,
  Images,
  Sparkles,
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
  { panel: "media", icon: Images, label: "Medios" },
  { panel: "ai", icon: Sparkles, label: "IA" },
  { panel: "publish", icon: Send, label: "Publicar" },
];

export function LeftToolRail({
  activePanel,
  onPanelChange,
}: LeftToolRailProps) {
  return (
    <nav className="flex w-16 flex-col items-center gap-1 border-r border-border bg-card py-3">
      {RAIL_ITEMS.map(({ panel, icon: Icon, label }) => (
        <button
          key={panel}
          type="button"
          onClick={() => onPanelChange(panel)}
          className={cn(
            "flex w-14 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors",
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
