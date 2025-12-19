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
  return (
    <div 
      className={cn(
        "flex flex-col min-w-[240px] md:min-w-[280px] max-w-[280px] rounded-lg transition-all duration-200",
        isDropTarget && canDrop && "bg-primary/5 ring-2 ring-primary/20",
        isDropTarget && !canDrop && "bg-destructive/5 ring-2 ring-destructive/20"
      )}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className={cn("h-2 w-2 rounded-full", color)} />
          <h3 className="font-semibold text-foreground text-xs md:text-sm">{title}</h3>
          <span className="flex items-center justify-center h-4 md:h-5 min-w-4 md:min-w-5 px-1 md:px-1.5 rounded-full bg-muted text-[10px] md:text-xs font-medium text-muted-foreground">
            {count}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 md:gap-3 flex-1 overflow-y-auto pr-2 pb-4 min-h-[150px] md:min-h-[200px]">
        {children}
      </div>
    </div>
  );
}
