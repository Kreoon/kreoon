import { useRef, useEffect } from 'react';
import { SECTIONS } from './utils/sectionConfig';
import { cn } from '@/lib/utils';

interface ResearchMobileTabsProps {
  activeSectionId: string;
  onSectionClick: (sectionId: string) => void;
}

export function ResearchMobileTabs({ activeSectionId, onSectionClick }: ResearchMobileTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Auto-scroll active tab into view
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [activeSectionId]);

  return (
    <div className="lg:hidden sticky top-[57px] z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-1 px-3 py-2 no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSectionId === section.id;
          return (
            <button
              key={section.id}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSectionClick(section.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap transition-all shrink-0',
                isActive
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-white/40 hover:text-white/70 border border-transparent'
              )}
            >
              <Icon className="h-3 w-3" />
              {section.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
