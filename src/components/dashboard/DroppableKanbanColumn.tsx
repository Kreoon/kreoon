import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ContentStatus } from "@/types/database";

interface DroppableKanbanColumnProps {
  status: ContentStatus;
  title: string;
  count: number;
  color: string;
  children: ReactNode;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetStatus: ContentStatus) => void;
  isDropTarget?: boolean;
  canDrop?: boolean;
}

export function DroppableKanbanColumn({ 
  status,
  title, 
  count, 
  color, 
  children,
  onDragOver,
  onDrop,
  isDropTarget,
  canDrop = true
}: DroppableKanbanColumnProps) {
  // Mapa de colores usando CSS variables para dark/light mode
  const colorMap: Record<string, string> = {
    "bg-muted-foreground": "var(--nova-text-secondary)",
    "bg-cyan-500": "var(--nova-accent-secondary)",
    "bg-info": "var(--nova-info)",
    "bg-warning": "var(--nova-warning)",
    "bg-blue-500": "var(--nova-info)",
    "bg-success": "var(--nova-success)",
    "bg-destructive": "var(--nova-error)",
    "bg-muted": "var(--nova-text-muted)",
  };
  const dotColor = color?.startsWith("#") ? color : (colorMap[color] || "var(--nova-accent-primary)");

  return (
    <div 
      className={cn(
        "flex flex-col shrink-0 w-[350px] h-full rounded-sm",
        "transition-all duration-300 ease-out border",
        isDropTarget && canDrop && "ring-2 ring-[#a855f7]/60 shadow-[0_0_30px_rgba(168,85,247,0.15)]",
        isDropTarget && !canDrop && "ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
      )}
      style={{
        background: "var(--nova-glass-bg-light)",
        borderColor: isDropTarget && canDrop ? "var(--nova-border-accent)" : "var(--nova-border-default)",
        boxShadow: "var(--nova-shadow-sm)",
      }}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
    >
      {/* Column Header - fixed 60px */}
      <div className="flex items-center justify-between h-[60px] shrink-0 p-4">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: dotColor,
              boxShadow: `0 0 8px ${dotColor}`,
            }}
          />
          <h3 className="font-semibold text-foreground text-xs md:text-sm">{title}</h3>
          <span
            className="flex items-center justify-center h-5 md:h-6 min-w-5 md:min-w-6 px-1.5 rounded-sm text-[10px] md:text-xs font-semibold"
            style={{
              background: "var(--nova-border-subtle)",
              border: "1px solid var(--nova-border-default)",
              color: "var(--nova-accent-primary-hover)",
            }}
          >
            {count}
          </span>
        </div>
      </div>
      
      {/* Cards container - scrollable */}
      <div className="kanban-column-cards flex flex-col flex-1 overflow-y-auto overflow-x-hidden pt-0 px-4 pb-4 gap-4 min-h-0 scroll-smooth">
        {children}
      </div>
    </div>
  );
}
