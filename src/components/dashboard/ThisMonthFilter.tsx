import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

interface ThisMonthFilterProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
  className?: string;
}

export function ThisMonthFilter({ isActive, onToggle, className }: ThisMonthFilterProps) {
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={() => onToggle(!isActive)}
      className={cn(
        "gap-2 transition-all",
        isActive && "bg-primary text-primary-foreground",
        className
      )}
    >
      {isActive ? (
        <>
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Quitar filtro</span>
        </>
      ) : (
        <>
          <Calendar className="w-4 h-4" />
          <span>Este mes</span>
        </>
      )}
    </Button>
  );
}

// Hook para filtrar contenido por mes actual
export function useThisMonthFilter<T extends { created_at?: string | null }>(
  items: T[],
  isActive: boolean,
  dateField: keyof T = 'created_at' as keyof T
): T[] {
  if (!isActive) return items;
  
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  return items.filter(item => {
    const dateValue = item[dateField];
    if (!dateValue || typeof dateValue !== 'string') return false;
    
    const itemDate = new Date(dateValue);
    return isWithinInterval(itemDate, { start: monthStart, end: monthEnd });
  });
}
