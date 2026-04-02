import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, Megaphone, Radio, Construction } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveLives } from '@/hooks/useLiveStream';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  { id: 'campaigns', label: 'Campañas', icon: Megaphone },
];

function TabBarComponent({ activeTab, onTabChange, creatorsCount, agenciesCount, campaignsCount }: MarketplaceTabBarProps) {
  const navigate = useNavigate();
  const { activeRole, isPlatformAdmin } = useAuth();
  const { data: liveStreams } = useActiveLives({ limit: 50 });
  const liveCount = liveStreams?.length || 0;

  const isAdmin = activeRole === 'admin' || isPlatformAdmin;

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
              'flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all',
              isActive
                ? 'bg-purple-500/15 text-purple-400'
                : 'text-gray-500 hover:text-foreground hover:bg-white/5'
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

      {/* Tab En Vivo - Admin: navega a /live, Otros: muestra "Próximamente" */}
      {isAdmin ? (
        <button
          onClick={() => navigate('/live')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all',
            'text-gray-500 hover:text-foreground hover:bg-white/5'
          )}
        >
          <Radio className={cn('h-4 w-4', liveCount > 0 && 'text-red-500 animate-pulse')} />
          <span>En Vivo</span>
          {liveCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
              {liveCount}
            </span>
          )}
        </button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all',
                'text-gray-500/50 cursor-not-allowed'
              )}
              disabled
            >
              <Radio className="h-4 w-4" />
              <span>En Vivo</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center gap-1">
                <Construction className="h-3 w-3" />
                Pronto
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Esta función estará disponible muy pronto</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export const MarketplaceTabBar = memo(TabBarComponent);
