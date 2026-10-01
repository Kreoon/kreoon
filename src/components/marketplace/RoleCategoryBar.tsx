import { memo, useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Video, Film, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceViewMode } from './types/marketplace';

interface RoleCategoryBarProps {
  active: MarketplaceViewMode;
  onChange: (mode: MarketplaceViewMode) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Video, Film, Target,
};

interface CategoryItem {
  id: MarketplaceViewMode;
  label: string;
  icon: string | null;
  color: string;
}

const ITEMS: CategoryItem[] = [
  { id: 'all', label: 'Todos', icon: null, color: 'text-purple-400' },
  { id: 'creators', label: 'Creadores', icon: 'Video', color: 'text-pink-400' },
  { id: 'production', label: 'Produccion', icon: 'Film', color: 'text-blue-400' },
  { id: 'strategy', label: 'Estrategas', icon: 'Target', color: 'text-green-400' },
];

export const RoleCategoryBar = memo(function RoleCategoryBar({ active, onChange }: RoleCategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      el?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="relative flex items-center gap-1 py-2">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 z-10 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-none px-1"
      >
        {ITEMS.map(item => {
          const isActive = active === item.id;
          const Icon = item.icon ? ICON_MAP[item.icon] : null;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium whitespace-nowrap transition-all border',
                isActive
                  ? 'bg-purple-500/15 border-purple-500/40 text-foreground shadow-[0_0_12px_-3px_rgba(139,92,246,0.3)]'
                  : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border',
              )}
            >
              {Icon && (
                <Icon className={cn('h-4 w-4', isActive ? item.color : 'text-muted-foreground')} />
              )}
              {item.label}
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 z-10 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});
