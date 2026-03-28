import React from 'react';

interface DNASectionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

export function DNASectionCard({
  title,
  description,
  icon: Icon,
  gradient,
  children
}: DNASectionCardProps) {
  return (
    <div className="rounded-lg bg-white dark:bg-[#14141f] border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none overflow-hidden">
      {/* Header - Siempre visible */}
      <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>

        {/* Title & Description */}
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white truncate">{title}</h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{description}</p>
        </div>
      </div>

      {/* Content - Siempre desplegado */}
      <div className="p-4 sm:p-6 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        {children}
      </div>
    </div>
  );
}
