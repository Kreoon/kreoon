import { useState } from 'react';
import {
  Plus, Play, Pause, Trash2, RefreshCw, Sparkles, MoreVertical,
  ExternalLink, Eye, MousePointerClick, DollarSign, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAdCampaigns } from '../../hooks/useAdCampaigns';
import { AdPlatformIcon } from '../common/AdPlatformIcon';
import { CampaignStatusBadge } from '../common/CampaignStatusBadge';
import { OBJECTIVE_LABELS, CAMPAIGN_STATUS_LABELS } from '../../config';
import type { AdCampaignStatus, MarketingCampaign } from '../../types/marketing.types';
import { toast } from 'sonner';

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

interface CampaignListProps {
  onCreateNew?: () => void;
}

type TabFilter = 'all' | AdCampaignStatus;

export function CampaignList({ onCreateNew }: CampaignListProps) {
  const { campaigns, isLoading, pauseCampaign, resumeCampaign, deleteCampaign, syncCampaign } = useAdCampaigns();
  const [tab, setTab] = useState<TabFilter>('all');

  const filtered = tab === 'all' ? campaigns : campaigns.filter(c => c.status === tab);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todas', count: campaigns.length },
    { key: 'active', label: 'Activas', count: campaigns.filter(c => c.status === 'active').length },
    { key: 'draft', label: 'Borrador', count: campaigns.filter(c => c.status === 'draft').length },
    { key: 'paused', label: 'Pausadas', count: campaigns.filter(c => c.status === 'paused').length },
    { key: 'completed', label: 'Completadas', count: campaigns.filter(c => c.status === 'completed').length },
  ];

  const handleAction = async (campaign: MarketingCampaign, action: string) => {
    try {
      switch (action) {
        case 'pause':
          await pauseCampaign.mutateAsync(campaign.id);
          toast.success('Campaña pausada');
          break;
        case 'resume':
          await resumeCampaign.mutateAsync(campaign.id);
          toast.success('Campaña reanudada');
          break;
        case 'delete':
          await deleteCampaign.mutateAsync(campaign.id);
          toast.success('Campaña eliminada');
          break;
        case 'sync':
          await syncCampaign.mutateAsync(campaign.id);
          toast.success('Campaña sincronizada');
          break;
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse bg-muted/20"><CardContent className="h-20" /></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-all',
                tab === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        {onCreateNew && (
          <Button size="sm" onClick={onCreateNew}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nueva campaña
          </Button>
        )}
      </div>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <Card className="bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Target className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              No hay campañas {tab !== 'all' ? CAMPAIGN_STATUS_LABELS[tab as AdCampaignStatus]?.toLowerCase() : ''}.
            </p>
            {onCreateNew && (
              <Button size="sm" variant="outline" onClick={onCreateNew}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Crear primera campaña
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(campaign => (
            <Card key={campaign.id} className="bg-card/50">
              <CardContent className="flex items-center gap-4 py-3">
                <AdPlatformIcon platform={campaign.platform} size="md" withBg />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{campaign.name}</p>
                    <CampaignStatusBadge status={campaign.status} />
                    {campaign.ai_generated && (
                      <Badge className="text-[9px] bg-purple-500/20 text-purple-400 border-0">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">
                      {OBJECTIVE_LABELS[campaign.objective]}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <DollarSign className="w-3 h-3" />
                      {fmtCurrency(campaign.total_spend)}
                    </span>
                    {campaign.daily_budget && (
                      <span className="text-[10px] text-muted-foreground">
                        {fmtCurrency(campaign.daily_budget)}/día
                      </span>
                    )}
                    {campaign.start_date && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(campaign.start_date).toLocaleDateString()}
                        {campaign.end_date && ` - ${new Date(campaign.end_date).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAction(campaign, 'sync')}>
                      <RefreshCw className="w-3.5 h-3.5 mr-2" /> Sincronizar
                    </DropdownMenuItem>
                    {campaign.status === 'active' && (
                      <DropdownMenuItem onClick={() => handleAction(campaign, 'pause')}>
                        <Pause className="w-3.5 h-3.5 mr-2" /> Pausar
                      </DropdownMenuItem>
                    )}
                    {campaign.status === 'paused' && (
                      <DropdownMenuItem onClick={() => handleAction(campaign, 'resume')}>
                        <Play className="w-3.5 h-3.5 mr-2" /> Reanudar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleAction(campaign, 'delete')}
                      className="text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
