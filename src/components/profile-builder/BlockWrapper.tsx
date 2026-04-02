import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlockWrapperProps } from './types/profile-builder';
import { BLOCK_DEFINITIONS } from './types/profile-builder';

export function BlockWrapper({
  block,
  children,
  isSelected,
  onSelect,
  onDelete,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
}: BlockWrapperProps) {
  const definition = BLOCK_DEFINITIONS[block.type];
  const isDeletable = definition.isDeletable;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-lg border transition-colors duration-150',
        'bg-[#14141f]',
        isSelected
          ? 'border-purple-500 ring-2 ring-purple-500/20'
          : 'border-zinc-800 hover:border-zinc-600',
        !block.isVisible && 'opacity-40',
        isDragging && 'cursor-grabbing shadow-2xl shadow-black/40',
      )}
      onClick={onSelect}
      aria-label={`Bloque ${definition.label}${isSelected ? ', seleccionado' : ''}`}
      aria-selected={isSelected}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        // No interceptar teclas si el foco está en un elemento editable
        const target = e.target as HTMLElement;
        const isEditable =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]') ||
          target.closest('.ProseMirror') ||
          target.closest('[role="dialog"]');

        if (isEditable) return;

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Overlay de controles — visible en hover o cuando está seleccionado */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 z-10 flex items-center justify-between',
          'px-2 py-1 rounded-t-lg',
          'bg-gradient-to-b from-black/60 to-transparent',
          'transition-opacity duration-150',
          isSelected
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle + label */}
        <div className="flex items-center gap-1.5">
          <button
            className={cn(
              'flex items-center justify-center h-6 w-6 rounded',
              'text-zinc-400 hover:text-zinc-200',
              'hover:bg-white/10',
              'cursor-grab active:cursor-grabbing',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-1 focus:ring-purple-500',
            )}
            aria-label="Arrastrar para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <span className="text-[10px] font-medium text-zinc-400 select-none">
            {definition.label}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-0.5">
          {onMoveUp && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
              onClick={onMoveUp}
              aria-label="Mover bloque arriba"
              tabIndex={-1}
            >
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}

          {onMoveDown && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
              onClick={onMoveDown}
              aria-label="Mover bloque abajo"
              tabIndex={-1}
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            onClick={onToggleVisibility}
            aria-label={block.isVisible ? 'Ocultar bloque' : 'Mostrar bloque'}
            tabIndex={-1}
          >
            {block.isVisible ? (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
            )}
          </Button>

          {isDeletable && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
              onClick={onDelete}
              aria-label={`Eliminar bloque ${definition.label}`}
              tabIndex={-1}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Contenido del bloque */}
      <div
        className={cn(
          'pointer-events-none select-none',
          isSelected && 'pointer-events-auto',
        )}
      >
        {children}
      </div>

      {/* Indicador de bloque oculto */}
      {!block.isVisible && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2 rounded-full bg-zinc-800/80 px-3 py-1.5">
            <EyeOff className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-500">Oculto</span>
          </div>
        </div>
      )}
    </div>
  );
}
