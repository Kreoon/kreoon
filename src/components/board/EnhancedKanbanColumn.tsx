import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EnhancedKanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: ReactNode;
  isDropTarget?: boolean;
  canDrop?: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnter: () => void;
}

export function EnhancedKanbanColumn({
  id,
  title,
  color,
  count,
  children,
  isDropTarget,
  canDrop = true,
  onDragOver,
  onDrop,
  onDragEnter
}: EnhancedKanbanColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] md:min-w-[300px] max-w-[320px] rounded-xl transition-all duration-200",
        "bg-muted/30 backdrop-blur-sm",
        isDropTarget && canDrop && "ring-2 ring-primary/40 bg-primary/5",
        isDropTarget && !canDrop && "ring-2 ring-destructive/40 bg-destructive/5"
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <div 
            className="h-3 w-3 rounded-full shadow-sm" 
            style={{ backgroundColor: color }}
          />
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        </div>
        <span className={cn(
          "flex items-center justify-center h-6 min-w-6 px-2 rounded-full text-xs font-medium",
          "bg-background/80 text-muted-foreground shadow-sm"
        )}>
          {count}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto px-2 pb-3 min-h-[200px] max-h-[calc(100vh-280px)]">
        {children}
      </div>
    </div>
  );
}
