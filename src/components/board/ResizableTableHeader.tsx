import { useState, useRef, useCallback, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ChevronDown, ChevronUp, ArrowUpDown, GripVertical, MoreVertical, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResizableTableHeaderProps {
  field: string;
  label: string;
  sortable?: boolean;
  width?: number;
  minWidth?: number;
  onResize?: (field: string, width: number) => void;
  onDragEnd?: (dragIndex: number, hoverIndex: number) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  index: number;
  isDraggable?: boolean;
  /** Callback para ocultar columna - estilo Notion */
  onHideColumn?: (field: string) => void;
  /** Si la columna puede ocultarse (ej: title NO puede) */
  canHide?: boolean;
}

interface DragItem {
  type: string;
  field: string;
  index: number;
}

export function ResizableTableHeader({
  field,
  label,
  sortable = false,
  width,
  minWidth = 80,
  onResize,
  onDragEnd,
  sortField,
  sortDirection,
  onSort,
  index,
  isDraggable = true,
  onHideColumn,
  canHide = true,
}: ResizableTableHeaderProps) {
  const ref = useRef<HTMLTableCellElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Drag and drop
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'TABLE_COLUMN',
    item: (): DragItem => ({ type: 'TABLE_COLUMN', field, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => isDraggable && !isResizing,
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'TABLE_COLUMN',
    hover: (item: DragItem) => {
      if (item.index !== index && onDragEnd) {
        onDragEnd(item.index, index);
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = ref.current?.offsetWidth || 100;
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!onResize) return;
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, startWidthRef.current + diff);
      onResize(field, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, field, minWidth, onResize]);

  // Connect drag and drop refs
  drag(drop(ref));

  const SortIcon = () => {
    if (!sortable) return null;
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1 text-purple-500" />
      : <ChevronDown className="h-3 w-3 ml-1 text-purple-500" />;
  };

  return (
    <TableHead
      ref={ref}
      className={cn(
        "relative select-none transition-colors duration-150",
        sortable && "cursor-pointer",
        isDragging && "opacity-50",
        isOver && "bg-purple-100 dark:bg-purple-500/20",
        isResizing && "cursor-col-resize"
      )}
      style={{ width: width ? `${width}px` : undefined }}
      onClick={() => sortable && onSort?.(field)}
    >
      <div className="flex items-center gap-1 group/header">
        {/* Drag handle */}
        {isDraggable && (
          <GripVertical className="h-3 w-3 text-zinc-400 dark:text-zinc-600 cursor-grab active:cursor-grabbing opacity-0 group-hover/header:opacity-100 hover:opacity-100 transition-opacity" />
        )}

        <span className="flex items-center flex-1">
          {label}
          <SortIcon />
        </span>

        {/* Column actions dropdown - estilo Notion */}
        {(onHideColumn || sortable) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover/header:opacity-100 transition-opacity hover:bg-zinc-200 dark:hover:bg-zinc-700"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {sortable && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onSort?.(field);
                    }}
                    className="gap-2"
                  >
                    <ArrowUp className="h-4 w-4" />
                    Ordenar A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onSort?.(field);
                    }}
                    className="gap-2"
                  >
                    <ArrowDown className="h-4 w-4" />
                    Ordenar Z-A
                  </DropdownMenuItem>
                </>
              )}
              {sortable && onHideColumn && canHide && <DropdownMenuSeparator />}
              {onHideColumn && canHide && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onHideColumn(field);
                  }}
                  className="gap-2 text-red-600 dark:text-red-400"
                >
                  <EyeOff className="h-4 w-4" />
                  Ocultar columna
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Resize handle */}
      {onResize && (
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize",
            "hover:bg-purple-500 transition-colors duration-150",
            isResizing && "bg-purple-500"
          )}
        />
      )}
    </TableHead>
  );
}

// Hook para manejar el estado de columnas
export function useColumnConfig(
  initialColumns: string[],
  initialWidths: Record<string, number> = {}
) {
  const [columnOrder, setColumnOrder] = useState<string[]>(initialColumns);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths);

  const moveColumn = useCallback((dragIndex: number, hoverIndex: number) => {
    setColumnOrder(prev => {
      const newOrder = [...prev];
      const [removed] = newOrder.splice(dragIndex, 1);
      newOrder.splice(hoverIndex, 0, removed);
      return newOrder;
    });
  }, []);

  const resizeColumn = useCallback((field: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [field]: width }));
  }, []);

  const resetColumns = useCallback((columns: string[]) => {
    setColumnOrder(columns);
    setColumnWidths({});
  }, []);

  return {
    columnOrder,
    columnWidths,
    moveColumn,
    resizeColumn,
    resetColumns,
    setColumnOrder,
    setColumnWidths,
  };
}
