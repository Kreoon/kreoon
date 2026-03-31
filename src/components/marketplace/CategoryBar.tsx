import { useRef, useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid, Video, Dumbbell, Shirt, Laptop, Sparkles,
  UtensilsCrossed, Home, GraduationCap, Gamepad2, PawPrint,
  Baby, Heart, Music, Plane, TrendingUp, ChevronLeft, ChevronRight, SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MARKETPLACE_CATEGORIES } from './types/marketplace';

const ICON_MAP: Record<string, typeof LayoutGrid> = {
  LayoutGrid, Video, Dumbbell, Shirt, Laptop, Sparkles,
  UtensilsCrossed, Home, GraduationCap, Gamepad2, PawPrint,
  Baby, Heart, Music, Plane, TrendingUp,
};

interface CategoryBarProps {
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
}

export function CategoryBar({
  activeCategory,
  onCategoryChange,
  onOpenFilters,
  activeFilterCount,
}: CategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = useCallback((dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  }, []);

  return (
    <div className="relative flex items-center gap-3 border-b border-border">
      {/* Left arrow */}
      {showLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 z-10 w-8 h-8 rounded-[0.125rem] bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-foreground" />
        </button>
      )}

      {/* Categories scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide py-4 px-2 flex-1"
      >
        {MARKETPLACE_CATEGORIES.map(cat => {
          const Icon = ICON_MAP[cat.icon];
          const isActive =
            (cat.id === 'all' && activeCategory === null) ||
            cat.id === activeCategory;

          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id === 'all' ? null : cat.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 min-w-[56px] pb-2 border-b-2 transition-all duration-200',
                isActive
                  ? 'border-primary text-white'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              {Icon && <Icon className="h-6 w-6" />}
              <span className="text-xs whitespace-nowrap font-medium">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right arrow */}
      {showRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-20 z-10 w-8 h-8 rounded-[0.125rem] bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-foreground" />
        </button>
      )}

      {/* Filters button */}
      <button
        onClick={onOpenFilters}
        className={cn(
          'flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-sm border transition-colors text-sm font-medium',
          activeFilterCount > 0
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-border text-foreground/80 hover:border-border hover:text-foreground',
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">Filtros</span>
        {activeFilterCount > 0 && (
          <span className="w-5 h-5 rounded-[0.125rem] bg-primary text-white text-xs flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
}
