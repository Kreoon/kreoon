import type { ReactNode } from 'react';

interface DetailSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function DetailSection({ title, action, children }: DetailSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
          {title}
        </h4>
        {action}
      </div>
      {children}
    </section>
  );
}
