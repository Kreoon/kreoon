import { SECTIONS } from './utils/sectionConfig';
import { cn } from '@/lib/utils';

interface ResearchSidebarProps {
  activeSectionId: string;
  onSectionClick: (sectionId: string) => void;
}

export function ResearchSidebar({ activeSectionId, onSectionClick }: ResearchSidebarProps) {
  return (
    <aside className="hidden lg:block w-[220px] shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto bg-black/60 backdrop-blur-md border-r border-white/10">
      <nav className="py-4 px-2 space-y-0.5">
        <p className="px-3 mb-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
          Secciones
        </p>
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSectionId === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs transition-all duration-200 text-left',
                isActive
                  ? 'bg-purple-500/15 text-white border-l-2 border-purple-500 font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5 border-l-2 border-transparent'
              )}
            >
              <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-purple-400' : 'text-white/40')} />
              <span className="truncate">{section.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
