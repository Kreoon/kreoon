import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableHead } from '@/components/ui/table';
import type { SortDirection } from '@/lib/crm-sort';

interface SortableTableHeadProps {
  fieldKey: string;
  label: string;
  activeSortField: string;
  sortDirection: SortDirection;
  onSort: (fieldKey: string) => void;
  className?: string;
}

export function SortableTableHead({
  fieldKey,
  label,
  activeSortField,
  sortDirection,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = fieldKey === activeSortField;

  return (
    <TableHead
      className={cn('text-white/70 cursor-pointer select-none hover:text-white/90 transition-colors', className)}
      onClick={() => onSort(fieldKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortDirection === 'asc'
            ? <ChevronUp className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </div>
    </TableHead>
  );
}
