import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone, DollarSign, Check, X, AlertTriangle,
  Loader2, RefreshCw, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandActivation } from '@/hooks/useBrandActivation';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { SOCIAL_PLATFORMS } from '@/components/marketplace/types/brandActivation';
import type { EligibleCampaign } from '@/hooks/useBrandActivation';

export function CreatorActivationCampaigns() {
  const navigate = useNavigate();
  const { profile: creatorProfile } = useCreatorProfile();
  const { getEligibleCampaigns } = useBrandActivation();

  const [campaigns, setCampaigns] = useState<EligibleCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!creatorProfile?.id) return;
    setLoading(true);
    const data = await getEligibleCampaigns(creatorProfile.id);
    setCampaigns(data);
    setLoading(false);
  }, [creatorProfile?.id, getEligibleCampaigns]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <Megaphone className="h-12 w-12 text-gray-600 mx-auto" />
        <div>
          <h3 className="text-white font-semibold">No hay campañas de activación disponibles</h3>
          <p className="text-gray-500 text-sm mt-1">
            Completa tu perfil de redes sociales para desbloquear más oportunidades
          </p>
        </div>
      </div>
    );
  }

  const eligible = campaigns.filter(c => c.meets_requirements);
  const ineligible = campaigns.filter(c => !c.meets_requirements);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            Campañas de Activación
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Publica en tus redes y gana por engagement
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Eligible campaigns */}
      {eligible.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-green-400 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Cumples los requisitos ({eligible.length})
          </h3>
          {eligible.map(c => (
            <ActivationCampaignRow
              key={c.campaign_id}
              campaign={c}
              onClick={() => navigate(`/marketplace/campaigns/${c.campaign_id}`)}
            />
          ))}
        </div>
      )}

      {/* Ineligible campaigns */}
      {ineligible.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            No cumples los requisitos ({ineligible.length})
          </h3>
          {ineligible.map(c => (
            <ActivationCampaignRow
              key={c.campaign_id}
              campaign={c}
              onClick={() => navigate(`/marketplace/campaigns/${c.campaign_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivationCampaignRow({ campaign, onClick }: { campaign: EligibleCampaign; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-[#1a1a2e]/80 border rounded-xl p-5 transition-all',
        campaign.meets_requirements
          ? 'border-green-500/20 hover:border-green-500/40'
          : 'border-white/5 hover:border-white/10 opacity-75',
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{campaign.title}</h3>
          <p className="text-gray-500 text-xs">{campaign.brand_name}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {campaign.meets_requirements ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Elegible
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 flex items-center gap-1">
              <X className="h-3 w-3" />
              No elegible
            </span>
          )}
          <span className="text-xs text-green-400 font-medium flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            ${campaign.budget_per_creator.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Required platforms */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {campaign.required_platforms.map(p => {
          const info = SOCIAL_PLATFORMS[p as keyof typeof SOCIAL_PLATFORMS];
          return (
            <span
              key={p}
              className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400"
            >
              {info?.label || p}
            </span>
          );
        })}
      </div>

      {/* Missing requirements */}
      {!campaign.meets_requirements && campaign.missing_requirements.length > 0 && (
        <div className="mt-3 space-y-1">
          {campaign.missing_requirements.map((req, i) => (
            <p key={i} className="text-xs text-amber-400/80">
              {req.platform}: necesitas {req.required.toLocaleString()} seguidores (tienes {req.actual.toLocaleString()})
            </p>
          ))}
        </div>
      )}
    </button>
  );
}
