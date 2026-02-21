import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Optional secondary text (e.g. client name for products) */
  hint?: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  align?: 'start' | 'center' | 'end';
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Sin resultados.',
  className,
  triggerClassName,
  align = 'start',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    const found = options.find((o) => o.value === value);
    return found?.label ?? placeholder;
  }, [value, options, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className={cn(
            'inline-flex items-center justify-between gap-1 rounded-md border border-input bg-background px-3 text-sm transition-colors',
            'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            value === options[0]?.value ? 'text-muted-foreground' : 'text-foreground',
            triggerClassName,
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-[220px] p-0', className)} align={align}>
        <CommandPrimitive className="flex flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
          {/* Minimal search input */}
          <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <CommandPrimitive.Input
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <CommandPrimitive.List className="max-h-[220px] overflow-y-auto p-1">
            <CommandPrimitive.Empty className="py-4 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </CommandPrimitive.Empty>
            {options.map((option) => (
              <CommandPrimitive.Item
                key={option.value}
                value={option.label}
                onSelect={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer select-none',
                  'data-[selected=true]:bg-accent/60 data-[selected=true]:text-accent-foreground',
                )}
              >
                <Check
                  className={cn(
                    'h-3 w-3 shrink-0',
                    value === option.value ? 'opacity-60' : 'opacity-0',
                  )}
                />
                <span className="truncate">{option.label}</span>
                {option.hint && (
                  <span className="ml-auto text-[10px] text-muted-foreground/60 truncate">
                    {option.hint}
                  </span>
                )}
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}
