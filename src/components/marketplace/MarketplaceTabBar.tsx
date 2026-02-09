import { memo } from 'react';
import { Users, Building2, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceTab } from './types/marketplace';

interface MarketplaceTabBarProps {
  activeTab: MarketplaceTab;
  onTabChange: (tab: MarketplaceTab) => void;
  creatorsCount?: number;
  agenciesCount?: number;
  campaignsCount?: number;
}

const TABS: { id: MarketplaceTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'creators', label: 'Creadores', icon: Users },
  { id: 'agencies', label: 'Agencias & Estudios', icon: Building2 },
  { id: 'campaigns', label: 'Campanas', icon: Megaphone },
];

function TabBarComponent({ activeTab, onTabChange, creatorsCount, agenciesCount, campaignsCount }: MarketplaceTabBarProps) {
  return (
    <div className="flex items-center gap-1 pb-3 border-b border-white/5">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        const count = tab.id === 'creators' ? creatorsCount : tab.id === 'agencies' ? agenciesCount : campaignsCount;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              isActive
                ? 'bg-purple-500/15 text-purple-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                isActive ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-500'
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
