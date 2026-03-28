import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BOARD_CLASSES } from "./kanbanTechStyles";

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
        // Base layout
        "flex flex-col shrink-0 w-[280px] sm:w-[350px] h-full",
        // Nova v2 styling
        "rounded-lg border transition-all duration-200",
        "bg-zinc-100/80 dark:bg-[#0f0f22]/60",
        "border-zinc-200/80 dark:border-purple-500/15",
        // Drop target states with Nova glow
        isDropTarget && canDrop && [
          "ring-2 ring-purple-500/60 dark:ring-purple-400/50",
          "border-purple-400 dark:border-purple-500/40",
          "dark:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
        ],
        isDropTarget && !canDrop && "ring-2 ring-red-500/50 border-red-400 dark:border-red-500/50"
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
    >
      {/* Column Header - Nova v2 */}
      <div className={cn(
        "flex items-center justify-between h-[60px] shrink-0 p-4 rounded-t-lg",
        "bg-white dark:bg-[#0f0f22]",
        "border-b border-zinc-200/50 dark:border-purple-500/10"
      )}>
        <div className="flex items-center gap-2.5">
          <div
            className="h-3 w-3 rounded-full shadow-sm dark:shadow-[0_0_8px_rgba(var(--status-color),0.4)]"
            style={{
              backgroundColor: color,
              // CSS variable for glow color matching status
              "--status-color": color,
            } as React.CSSProperties}
          />
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-[#e4e4e7] tracking-tight">
            {title}
          </h3>
        </div>
        <span
          className={cn(
            "flex items-center justify-center h-6 min-w-6 px-2 rounded-md text-xs font-semibold",
            "bg-purple-100 dark:bg-purple-500/15",
            "border border-purple-300/80 dark:border-purple-500/25",
            "text-purple-700 dark:text-purple-300"
          )}
        >
          {count}
        </span>
      </div>

      {/* Cards container - scrollable */}
      <div className="kanban-column-cards flex flex-col flex-1 overflow-y-auto overflow-x-hidden pt-0 px-4 pb-4 gap-3 min-h-0 scroll-smooth">
        {children}
      </div>
    </div>
  );
}
