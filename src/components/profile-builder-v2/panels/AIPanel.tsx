import { Sparkles, Wand2, Megaphone, Briefcase, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AIPanelProps {
  selectedLabel?: string | null;
}

const ACTIONS: Array<{
  id: string;
  icon: LucideIcon;
  label: string;
  hint: string;
}> = [
  {
    id: "bio",
    icon: Wand2,
    label: "Mejorar mi bio",
    hint: "Reescribe tu bio con un tono mas profesional",
  },
  {
    id: "headline",
    icon: Sparkles,
    label: "Crear frase principal",
    hint: "Genera un titular llamativo",
  },
  {
    id: "cta",
    icon: Megaphone,
    label: "Mejorar CTA",
    hint: "Optimiza tu llamada a la accion",
  },
  {
    id: "services",
    icon: Briefcase,
    label: "Sugerir servicios",
    hint: "Propone servicios segun tu perfil",
  },
  {
    id: "review",
    icon: Eye,
    label: "Revisar mi portafolio",
    hint: "Analiza y da recomendaciones",
  },
];

export function AIPanel({ selectedLabel }: AIPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {selectedLabel
          ? `Acciones sugeridas para: ${selectedLabel}`
          : "Selecciona una seccion para acciones especificas."}
      </p>

      <div className="space-y-2">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled
            className="flex w-full items-start gap-2.5 rounded-lg border border-border bg-background p-3 text-left opacity-60"
          >
            <action.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{action.label}</span>
              <span className="block text-xs text-muted-foreground">
                {action.hint}
              </span>
            </span>
            <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted-foreground">
              Pronto
            </span>
          </button>
        ))}
      </div>

      <p className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
        Cada accion mostrara una vista previa de antes y despues. Nada se aplica
        automaticamente.
      </p>
    </div>
  );
}
