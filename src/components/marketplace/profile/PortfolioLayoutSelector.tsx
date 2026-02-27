import { cn } from '@/lib/utils';
import { PORTFOLIO_LAYOUTS, type PortfolioLayoutId } from '@/lib/marketplace/profile-customization';
import { LayoutGrid, LayoutDashboard, LayoutTemplate } from 'lucide-react';

const ICONS = {
  LayoutGrid,
  LayoutDashboard,
  LayoutTemplate,
};

interface PortfolioLayoutSelectorProps {
  value: PortfolioLayoutId;
  onChange: (layout: PortfolioLayoutId) => void;
  className?: string;
}

export function PortfolioLayoutSelector({ value, onChange, className }: PortfolioLayoutSelectorProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      {PORTFOLIO_LAYOUTS.map(layout => {
        const Icon = ICONS[layout.icon as keyof typeof ICONS];
        const isSelected = value === layout.id;

        return (
          <button
            key={layout.id}
            type="button"
            onClick={() => onChange(layout.id)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
              isSelected
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            )}
          >
            <Icon className={cn('h-8 w-8', isSelected ? 'text-purple-400' : 'text-gray-400')} />
            <span className={cn('text-xs font-medium', isSelected ? 'text-white' : 'text-gray-400')}>
              {layout.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
