import { LayoutGrid, List, Calendar as CalendarIcon, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type BoardView = 'kanban' | 'list' | 'calendar' | 'table';

interface BoardViewSwitcherProps {
  currentView: BoardView;
  onViewChange: (view: BoardView) => void;
}

const VIEWS: { value: BoardView; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { value: 'list', label: 'Lista', icon: List },
  { value: 'calendar', label: 'Calendario', icon: CalendarIcon },
  { value: 'table', label: 'Tabla', icon: Table2 },
];

/** Selector de vista (Kanban / Lista / Calendario / Tabla). Conserva búsqueda y filtros: solo cambia la presentación. */
export function BoardViewSwitcher({ currentView, onViewChange }: BoardViewSwitcherProps) {
  return (
    <div role="group" aria-label="Tipo de vista" className="inline-flex items-center gap-0.5 rounded-[var(--radius-control,0.75rem)] bg-muted p-1">
      {VIEWS.map(view => {
        const Icon = view.icon;
        const active = currentView === view.value;
        return (
          <button
            key={view.value}
            type="button"
            aria-pressed={active}
            aria-label={view.label}
            title={view.label}
            onClick={() => onViewChange(view.value)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-[calc(var(--radius-control,0.75rem)-4px)] px-2.5 text-xs font-semibold transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              "[@media(pointer:coarse)]:min-h-10",
              active
                ? "bg-card text-foreground shadow-[var(--shadow-soft,0_1px_2px_rgb(0_0_0/0.08))]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
