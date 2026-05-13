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
        "flex flex-col shrink-0 w-[280px] sm:w-[320px] h-full snap-start",
        "rounded-xl border transition-all duration-200",
        "bg-zinc-100/70 dark:bg-[#0c0c1e]/70",
        "border-zinc-200/60 dark:border-white/[0.06]",
        "shadow-sm dark:shadow-none",
        isDropTarget && canDrop && [
          "ring-2 ring-purple-500/60 dark:ring-purple-400/50",
          "border-purple-400 dark:border-purple-500/40",
          "dark:shadow-[0_0_24px_rgba(139,92,246,0.2)]"
        ],
        isDropTarget && !canDrop && "ring-2 ring-red-500/50 border-red-400 dark:border-red-500/50"
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
    >
      {/* Colored top accent bar */}
      <div
        className="h-[3px] w-full rounded-t-xl shrink-0 transition-all duration-200"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          boxShadow: `0 0 12px ${color}55`,
        }}
      />

      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between shrink-0 px-4 py-3",
        "bg-white/80 dark:bg-[#0f0f22]/80",
        "border-b border-zinc-200/40 dark:border-white/[0.05]"
      )}>
        <div className="flex items-center gap-2.5">
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}99`,
            }}
          />
          <h3 className="font-semibold text-[13px] text-zinc-800 dark:text-zinc-100 tracking-tight leading-none">
            {title}
          </h3>
        </div>
        <span
          className={cn(
            "flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-md text-[11px] font-bold tabular-nums",
            "border",
          )}
          style={{
            backgroundColor: `${color}18`,
            borderColor: `${color}40`,
            color: color,
          }}
        >
          {count}
        </span>
      </div>

      {/* Cards container - scrollable */}
      <div className="kanban-column-cards flex flex-col flex-1 overflow-y-auto overflow-x-hidden pt-2 px-3 pb-4 gap-2.5 min-h-0 scroll-smooth">
        {children}
      </div>
    </div>
  );
}
