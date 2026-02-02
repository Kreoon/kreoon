import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableStatusRowProps {
  id: string;
  children: React.ReactNode;
  isActive?: boolean;
}

export function SortableStatusRow({ id, children, isActive = true }: SortableStatusRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card transition-shadow",
        !isActive && "opacity-50",
        isDragging && "opacity-90 shadow-lg ring-2 ring-[#a855f7]/50 z-50"
      )}
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-white/10 text-muted-foreground"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}
