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
  const colorMap: Record<string, string> = {
    "bg-muted-foreground": "#94a3b8",
    "bg-cyan-500": "#06b6d4",
    "bg-info": "#3b82f6",
    "bg-warning": "#f59e0b",
    "bg-blue-500": "#3b82f6",
    "bg-success": "#22c55e",
    "bg-destructive": "#ef4444",
    "bg-muted": "#64748b",
  };
  const dotColor = color?.startsWith("#") ? color : (colorMap[color] || "#8b5cf6");

  return (
    <div 
      className={cn(
        "flex flex-col min-w-[240px] md:min-w-[280px] max-w-[280px] rounded-xl",
        "transition-all duration-300 ease-out backdrop-blur-xl border",
        isDropTarget && canDrop && "ring-2 ring-[#a855f7]/60 shadow-[0_0_30px_rgba(168,85,247,0.15)]",
        isDropTarget && !canDrop && "ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
      )}
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        borderColor: isDropTarget && canDrop ? "rgba(168, 85, 247, 0.4)" : "rgba(139, 92, 246, 0.2)",
        boxShadow: "0 0 20px rgba(139, 92, 246, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
      }}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="flex items-center justify-between mb-3 md:mb-4 px-2 pt-2">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: dotColor,
              boxShadow: `0 0 8px ${dotColor}`,
            }}
          />
          <h3 className="font-semibold text-[#f8fafc] text-xs md:text-sm">{title}</h3>
          <span
            className="flex items-center justify-center h-5 md:h-6 min-w-5 md:min-w-6 px-1.5 rounded-lg text-[10px] md:text-xs font-semibold"
            style={{
              background: "rgba(168, 85, 247, 0.15)",
              border: "1px solid rgba(168, 85, 247, 0.3)",
              color: "#a78bfa",
            }}
          >
            {count}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 md:gap-3 flex-1 overflow-y-auto px-2 pr-2 pb-4 min-h-[150px] md:min-h-[200px]">
        {children}
      </div>
    </div>
  );
}
