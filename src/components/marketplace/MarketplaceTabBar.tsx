import { memo } from 'react';
import { Users, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceTab } from './types/marketplace';

interface MarketplaceTabBarProps {
  activeTab: MarketplaceTab;
  onTabChange: (tab: MarketplaceTab) => void;
  creatorsCount?: number;
  agenciesCount?: number;
}

const TABS: { id: MarketplaceTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'creators', label: 'Creadores', icon: Users },
  { id: 'agencies', label: 'Agencias & Estudios', icon: Building2 },
];

function TabBarComponent({ activeTab, onTabChange, creatorsCount, agenciesCount }: MarketplaceTabBarProps) {
  return (
    <div className="flex items-center gap-1 pb-3 border-b border-border">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        const count = tab.id === 'creators' ? creatorsCount : agenciesCount;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all',
              isActive
                ? 'bg-purple-500/15 text-purple-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                isActive ? 'bg-purple-500/20 text-purple-300' : 'bg-muted/50 text-muted-foreground'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const MarketplaceTabBar = memo(TabBarComponent);
