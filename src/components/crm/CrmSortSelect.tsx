import { ChevronUp, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SortDirection, SortFieldConfig } from '@/lib/crm-sort';

interface CrmSortSelectProps {
  fields: SortFieldConfig[];
  value: string;
  direction: SortDirection;
  onChange: (fieldKey: string, direction: SortDirection) => void;
  className?: string;
}

export function CrmSortSelect({
  fields,
  value,
  direction,
  onChange,
  className,
}: CrmSortSelectProps) {
  return (
    <div className={`flex items-center gap-1 ${className || ''}`}>
      <Select
        value={value}
        onValueChange={(key) => onChange(key, direction)}
      >
        <SelectTrigger className="w-44 h-9 bg-white/5 border-white/10 text-white/70 text-xs">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.key} value={f.key}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        onClick={() => onChange(value, direction === 'asc' ? 'desc' : 'asc')}
        className="p-2 rounded-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60 hover:text-white/90"
        title={direction === 'asc' ? 'Ascendente (A→Z, menor→mayor)' : 'Descendente (Z→A, mayor→menor)'}
      >
        {direction === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
