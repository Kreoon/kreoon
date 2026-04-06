import { useRef, useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid,
  Video,
  Briefcase,
  Star,
  Building2,
  Palette,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicTemplate } from './TemplateCard';

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
}

const CATEGORIES: Category[] = [
  { id: 'all', label: 'Todos', icon: LayoutGrid },
  { id: 'ugc', label: 'UGC', icon: Video },
  { id: 'freelancer', label: 'Freelancer', icon: Briefcase },
  { id: 'influencer', label: 'Influencer', icon: Star },
  { id: 'agencia', label: 'Agencia', icon: Building2 },
  { id: 'profesional', label: 'Profesional', icon: Users },
  { id: 'creativo', label: 'Creativo', icon: Palette },
];

interface TemplateCategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  templates?: PublicTemplate[];
}

function getCategoryCount(templates: PublicTemplate[], categoryId: string): number {
  if (categoryId === 'all') return templates.length;
  return templates.filter((t) => t.category === categoryId).length;
}

export function TemplateCategoryTabs({
  activeCategory,
  onCategoryChange,
  templates = [],
}: TemplateCategoryTabsProps) {
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
    <div className="relative flex items-center border-b border-gray-800">
      {/* Flecha izquierda */}
      {showLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 z-10 w-7 h-7 rounded-md bg-gray-900 border border-gray-700 flex items-center justify-center hover:bg-gray-800 transition-colors"
          aria-label="Desplazar categorias a la izquierda"
        >
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        </button>
      )}

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide py-3 px-1 flex-1"
        role="tablist"
        aria-label="Categorias de plantillas"
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive =
            (cat.id === 'all' && activeCategory === 'all') ||
            cat.id === activeCategory;
          const count = getCategoryCount(templates, cat.id);

          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 border',
                isActive
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{cat.label}</span>
              {templates.length > 0 && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full',
                    isActive
                      ? 'bg-purple-500/30 text-purple-300'
                      : 'bg-gray-800 text-gray-500',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Flecha derecha */}
      {showRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 z-10 w-7 h-7 rounded-md bg-gray-900 border border-gray-700 flex items-center justify-center hover:bg-gray-800 transition-colors"
          aria-label="Desplazar categorias a la derecha"
        >
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}
