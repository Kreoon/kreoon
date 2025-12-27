import { LayoutGrid, List, Calendar as CalendarIcon, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function BoardViewSwitcher({ currentView, onViewChange }: BoardViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
      {VIEWS.map(view => {
        const Icon = view.icon;
        return (
          <Button
            key={view.value}
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 px-2.5 h-8",
              currentView === view.value && "bg-background shadow-sm"
            )}
            onClick={() => onViewChange(view.value)}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
