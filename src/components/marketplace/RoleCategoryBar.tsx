import { memo, useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Video, Film, Target, Code, GraduationCap, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceViewMode, MarketplaceRoleCategory } from './types/marketplace';

interface RoleCategoryBarProps {
  active: MarketplaceViewMode;
  onChange: (mode: MarketplaceViewMode) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutGrid, Video, Film, Target, Code, GraduationCap, Megaphone,
};

interface CategoryItem {
  id: MarketplaceViewMode;
  label: string;
  icon: string;
  color: string;
}

const ITEMS: CategoryItem[] = [
  { id: 'all', label: 'Todos', icon: 'LayoutGrid', color: 'text-purple-400' },
  { id: 'content_creation', label: 'Creación de Contenido', icon: 'Video', color: 'text-pink-400' },
  { id: 'post_production', label: 'Post-Producción', icon: 'Film', color: 'text-blue-400' },
  { id: 'strategy_marketing', label: 'Estrategia & Marketing', icon: 'Target', color: 'text-green-400' },
  { id: 'technology', label: 'Tecnología', icon: 'Code', color: 'text-cyan-400' },
  { id: 'education', label: 'Educación', icon: 'GraduationCap', color: 'text-yellow-400' },
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
          className="absolute left-0 z-10 h-8 w-8 rounded-full bg-background/90 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
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
          const Icon = ICON_MAP[item.icon];

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border',
                isActive
                  ? 'bg-purple-500/15 border-purple-500/40 text-white shadow-[0_0_12px_-3px_rgba(139,92,246,0.3)]'
                  : 'border-white/5 text-gray-400 hover:bg-white/5 hover:text-white hover:border-white/10',
              )}
            >
              {Icon && (
                <Icon className={cn('h-4 w-4', isActive ? item.color : 'text-gray-500')} />
              )}
              {item.label}
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 z-10 h-8 w-8 rounded-full bg-background/90 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});
