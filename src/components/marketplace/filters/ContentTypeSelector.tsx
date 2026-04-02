import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// Colores por tipo de contenido (estilo especializaciones)
const CONTENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  UGC: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
  'Reels/TikTok': { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/40' },
  VSL: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' },
  Unboxing: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  Testimonio: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/40' },
  Reseña: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' },
  Tutorial: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' },
  'Compra en Vivo': { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40' },
};

const DEFAULT_COLORS = { bg: 'bg-muted/50', text: 'text-foreground', border: 'border-border/20' };

function getContentTypeColors(type: string) {
  return CONTENT_TYPE_COLORS[type] || DEFAULT_COLORS;
}

interface ContentTypeSelectorProps {
  value: string[];
  onChange: (types: string[]) => void;
  availableTypes: string[];
  className?: string;
}

export function ContentTypeSelector({
  value,
  onChange,
  availableTypes,
  className,
}: ContentTypeSelectorProps) {
  // Ordenar tipos para consistencia visual
  const sortedTypes = useMemo(() => {
    const order = Object.keys(CONTENT_TYPE_COLORS);
    return [...availableTypes].sort((a, b) => {
      const aIdx = order.indexOf(a);
      const bIdx = order.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [availableTypes]);

  const toggleType = (type: string) => {
    if (value.includes(type)) {
      onChange(value.filter((t) => t !== type));
    } else {
      onChange([...value, type]);
    }
  };

  if (sortedTypes.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No hay tipos de contenido disponibles
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {sortedTypes.map((type) => {
        const isActive = value.includes(type);
        const colors = getContentTypeColors(type);

        return (
          <button
            key={type}
            type="button"
            onClick={() => toggleType(type)}
            aria-pressed={isActive}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
              isActive
                ? cn(colors.bg, colors.text, colors.border)
                : 'border-border/20 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {type}
          </button>
        );
      })}
    </div>
  );
}

// Export colors helper for use in other components (like ActiveFilters)
export { getContentTypeColors, CONTENT_TYPE_COLORS };
