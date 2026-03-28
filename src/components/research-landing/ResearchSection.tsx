import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface ResearchSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
}

export function ResearchSection({ id, title, subtitle, icon: Icon, children }: ResearchSectionProps) {
  return (
    <section id={id} className="scroll-mt-[120px] lg:scroll-mt-[80px]">
      <div className="bg-white/[0.03] backdrop-blur-lg border border-white/[0.08] rounded-sm p-5 md:p-7">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 rounded-sm bg-purple-500/15 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-purple-400" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
        </div>
        {subtitle && (
          <p className="text-xs text-white/40 mb-5 ml-11">{subtitle}</p>
        )}
        <div className="h-px bg-gradient-to-r from-purple-500/30 via-pink-500/20 to-transparent mb-5 ml-11" />

        {/* Section content */}
        {children}
      </div>
    </section>
  );
}

/** Empty state for sections without data */
export function EmptySection({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <p className="text-white/30 text-sm">
        {label} no disponible. Genera la investigacion completa desde el Brief IA.
      </p>
    </div>
  );
}
