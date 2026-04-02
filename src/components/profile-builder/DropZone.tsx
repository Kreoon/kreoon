import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { PlusCircle } from 'lucide-react';

interface DropZoneProps {
  id: string;
  className?: string;
}

export function DropZone({ id, className }: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col items-center justify-center gap-2',
        'h-16 w-full rounded-lg border-2 border-dashed',
        'transition-colors duration-150',
        isOver
          ? 'border-purple-500 bg-purple-500/10 text-purple-400'
          : 'border-zinc-700/50 bg-transparent text-zinc-600 hover:border-zinc-600 hover:text-zinc-500',
        className,
      )}
      aria-label="Zona para soltar bloques"
      role="region"
    >
      <PlusCircle className="h-4 w-4" aria-hidden="true" />
      <span className="text-xs font-medium">
        {isOver ? 'Suelta aquí para agregar' : 'Arrastra un bloque aquí'}
      </span>
    </div>
  );
}
