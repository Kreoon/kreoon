import { useState } from 'react';
import { BarChart3, Target, Megaphone, FileText, Settings, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MarketingDashboard } from '../components/Dashboard/MarketingDashboard';
import { CampaignList } from '../components/Campaigns/CampaignList';
import { CampaignCreator } from '../components/Campaigns/CampaignCreator';
import { ReportsPage } from '../components/Reports/ReportsPage';
import { AdAccountsManager } from '../components/Accounts/AdAccountsManager';
import { useAdCampaigns } from '../hooks/useAdCampaigns';
import { useAdMetrics } from '../hooks/useAdMetrics';

type Tab = 'dashboard' | 'campaigns' | 'create' | 'reports' | 'accounts';

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'campaigns', label: 'Campañas', icon: Target },
  { key: 'create', label: 'Crear', icon: Sparkles },
  { key: 'reports', label: 'Reportes', icon: FileText },
  { key: 'accounts', label: 'Cuentas', icon: Settings },
];

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { campaigns, activeCampaigns, totalSpend } = useAdCampaigns();
  const { unreadInsightsCount } = useAdMetrics();

  return (
    <div className="space-y-6">
      {/* Quick stats bar */}
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border shrink-0">
          <Target className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs">{activeCampaigns.length} activas</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border shrink-0">
          <Megaphone className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs">{campaigns.length} total</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border shrink-0">
          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs">Gasto: {fmtCurrency(totalSpend)}</span>
        </div>
        {unreadInsightsCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary">{unreadInsightsCount} insights nuevos</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all',
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'campaigns' && campaigns.length > 0 && (
                <Badge variant="outline" className="text-[9px] ml-1 px-1.5">{campaigns.length}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && <MarketingDashboard />}
      {activeTab === 'campaigns' && (
        <CampaignList onCreateNew={() => setActiveTab('create')} />
      )}
      {activeTab === 'create' && (
        <CampaignCreator
          onSuccess={() => setActiveTab('campaigns')}
          onBack={() => setActiveTab('campaigns')}
        />
      )}
      {activeTab === 'reports' && <ReportsPage />}
      {activeTab === 'accounts' && <AdAccountsManager />}
    </div>
  );
}
