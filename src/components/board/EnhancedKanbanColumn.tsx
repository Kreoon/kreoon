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
        "flex flex-col shrink-0 w-[350px] h-full rounded-xl",
        "transition-all duration-300 ease-out",
        "backdrop-blur-xl border",
        isDropTarget && canDrop && "ring-2 ring-[#a855f7]/60 shadow-[0_0_30px_rgba(168,85,247,0.15)]",
        isDropTarget && !canDrop && "ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
      )}
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        borderColor: isDropTarget && canDrop ? "rgba(168, 85, 247, 0.4)" : "rgba(139, 92, 246, 0.2)",
        boxShadow: "0 0 20px rgba(139, 92, 246, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
    >
      {/* Column Header - fixed 60px */}
      <div className="flex items-center justify-between h-[60px] shrink-0 p-4">
        <div className="flex items-center gap-2.5">
          <div
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}`,
            }}
          />
          <h3 className="font-semibold text-sm text-[#f8fafc] tracking-tight">{title}</h3>
        </div>
        <span
          className="flex items-center justify-center h-6 min-w-6 px-2 rounded-lg text-xs font-semibold"
          style={{
            background: "rgba(168, 85, 247, 0.15)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            color: "#a78bfa",
          }}
        >
          {count}
        </span>
      </div>

      {/* Cards container - scrollable */}
      <div className="kanban-column-cards flex flex-col flex-1 overflow-y-auto overflow-x-hidden pt-0 px-4 pb-4 gap-4 min-h-0 scroll-smooth">
        {children}
      </div>
    </div>
  );
}
