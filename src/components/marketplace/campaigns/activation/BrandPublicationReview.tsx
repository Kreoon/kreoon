import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Users, Check, X, Eye, ExternalLink,
  Loader2, AlertTriangle, Clock, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandActivation } from '@/hooks/useBrandActivation';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';
import { SOCIAL_PLATFORMS, VERIFICATION_STATUS_CONFIG } from '@/components/marketplace/types/brandActivation';
import type { PublicationVerificationStatus } from '@/components/marketplace/types/brandActivation';
import type { PublicationWithCreator } from '@/hooks/useBrandActivation';
import { PublicationMetricsPanel } from './PublicationMetricsPanel';

interface BrandPublicationReviewProps {
  campaignId: string;
  onBack: () => void;
}

type TabFilter = 'all' | PublicationVerificationStatus;

const TABS: { value: TabFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending_verification', label: 'Por verificar' },
  { value: 'verified', label: 'Verificadas' },
  { value: 'pending_content', label: 'Esperando contenido' },
  { value: 'violation', label: 'Violaciones' },
];

export function BrandPublicationReview({ campaignId, onBack }: BrandPublicationReviewProps) {
  const { getCampaignPublications, verifyPublication, reportPublicationRemoved } = useBrandActivation();
  const { getCampaignById } = useMarketplaceCampaigns();

  const [publications, setPublications] = useState<PublicationWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [metricsTarget, setMetricsTarget] = useState<string | null>(null);

  const campaign = getCampaignById(campaignId);

  const loadPublications = useCallback(async () => {
    setLoading(true);
    const data = await getCampaignPublications(campaignId);
    setPublications(data);
    setLoading(false);
  }, [campaignId, getCampaignPublications]);

  useEffect(() => {
    loadPublications();
  }, [loadPublications]);

  const filtered = activeTab === 'all'
    ? publications
    : publications.filter(p => p.verification_status === activeTab);

  const handleVerify = async (pubId: string) => {
    const ok = await verifyPublication(pubId, {
      verification_status: 'verified',
      verification_method: 'manual',
    });
    if (ok) {
      setPublications(prev =>
        prev.map(p => p.id === pubId ? { ...p, verification_status: 'verified' as const } : p),
      );
    }
  };

  const handleReject = async (pubId: string) => {
    const ok = await verifyPublication(pubId, {
      verification_status: 'pending_content',
      verification_notes: 'Contenido no aprobado, por favor revisa los requisitos.',
    });
    if (ok) {
      setPublications(prev =>
        prev.map(p => p.id === pubId ? { ...p, verification_status: 'pending_content' as const } : p),
      );
    }
  };

  const handleReportRemoved = async (pubId: string) => {
    const ok = await reportPublicationRemoved(pubId);
    if (ok) {
      setPublications(prev =>
        prev.map(p => p.id === pubId ? { ...p, verification_status: 'violation' as const, is_still_live: false } : p),
      );
    }
  };

  // Metrics panel
  const metricsPublication = metricsTarget
    ? publications.find(p => p.id === metricsTarget)
    : null;
  if (metricsPublication) {
    return (
      <PublicationMetricsPanel
        publication={metricsPublication}
        onBack={() => setMetricsTarget(null)}
        onRefresh={loadPublications}
      />
    );
  }

  const statusCounts = {
    pending_verification: publications.filter(p => p.verification_status === 'pending_verification').length,
    verified: publications.filter(p => p.verification_status === 'verified').length,
    violation: publications.filter(p => p.verification_status === 'violation').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis campañas
        </button>
        <h2 className="text-lg font-bold text-white">Publicaciones de Activación</h2>
        {campaign && <p className="text-gray-500 text-sm">{campaign.title}</p>}
      </div>

      {/* Summary cards */}
      <div className="flex gap-4">
        <div className="bg-purple-500/10 rounded-lg px-4 py-2">
          <p className="text-purple-300 text-lg font-bold">{statusCounts.pending_verification}</p>
          <p className="text-gray-500 text-xs">Por verificar</p>
        </div>
        <div className="bg-green-500/10 rounded-lg px-4 py-2">
          <p className="text-green-300 text-lg font-bold">{statusCounts.verified}</p>
          <p className="text-gray-500 text-xs">Verificadas</p>
        </div>
        <div className="bg-red-500/10 rounded-lg px-4 py-2">
          <p className="text-red-300 text-lg font-bold">{statusCounts.violation}</p>
          <p className="text-gray-500 text-xs">Violaciones</p>
        </div>
        <div className="bg-white/5 rounded-lg px-4 py-2">
          <p className="text-white text-lg font-bold">{publications.length}</p>
          <p className="text-gray-500 text-xs">Total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.value
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Publications list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map(pub => (
            <PublicationCard
              key={pub.id}
              publication={pub}
              onVerify={() => handleVerify(pub.id)}
              onReject={() => handleReject(pub.id)}
              onReportRemoved={() => handleReportRemoved(pub.id)}
              onViewMetrics={() => setMetricsTarget(pub.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay publicaciones {activeTab !== 'all' ? 'en esta categoría' : ''}</p>
        </div>
      )}
    </div>
  );
}

function PublicationCard({
  publication,
  onVerify,
  onReject,
  onReportRemoved,
  onViewMetrics,
}: {
  publication: PublicationWithCreator;
  onVerify: () => void;
  onReject: () => void;
  onReportRemoved: () => void;
  onViewMetrics: () => void;
}) {
  const platformInfo = SOCIAL_PLATFORMS[publication.platform];
  const statusConfig = VERIFICATION_STATUS_CONFIG[publication.verification_status];
  const showActions = publication.verification_status === 'pending_verification';
  const showRemoveReport = publication.verification_status === 'verified' && publication.is_still_live;

  return (
    <div className="bg-card/80 border border-white/5 rounded-xl p-5 space-y-4">
      {/* Creator + Platform + Status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {publication.creator_avatar_url ? (
            <img src={publication.creator_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold">
              {publication.creator_display_name?.charAt(0) || '?'}
            </div>
          )}
          <div>
            <p className="text-white font-medium text-sm">{publication.creator_display_name || 'Creador'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={cn('w-5 h-5 rounded flex items-center justify-center', platformInfo.bgColor)}>
                <span className="text-white text-[10px] font-bold">{platformInfo.label.charAt(0)}</span>
              </div>
              <span className="text-gray-500 text-xs">{platformInfo.label}</span>
            </div>
          </div>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full', statusConfig.bgColor, statusConfig.color)}>
          {statusConfig.label}
        </span>
      </div>

      {/* Publication URL */}
      {publication.publication_url && (
        <div className="bg-white/5 rounded-lg p-3">
          <a
            href={publication.publication_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 text-sm hover:text-purple-300 flex items-center gap-1.5 break-all"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            {publication.publication_url}
          </a>
        </div>
      )}

      {/* Tags */}
      {(publication.hashtags_used.length > 0 || publication.mentions_used.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {publication.hashtags_used.map(h => (
            <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{h}</span>
          ))}
          {publication.mentions_used.map(m => (
            <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400">{m}</span>
          ))}
        </div>
      )}

      {/* Quick metrics */}
      {(publication.likes_count > 0 || publication.views_count > 0) && (
        <div className="flex gap-4 text-xs text-gray-500">
          {publication.likes_count > 0 && <span>{publication.likes_count.toLocaleString()} likes</span>}
          {publication.comments_count > 0 && <span>{publication.comments_count.toLocaleString()} comentarios</span>}
          {publication.views_count > 0 && <span>{publication.views_count.toLocaleString()} views</span>}
        </div>
      )}

      {/* Screenshot */}
      {publication.publication_screenshot_url && (
        <a
          href={publication.publication_screenshot_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-purple-400 flex items-center gap-1 transition-colors"
        >
          <Eye className="h-3 w-3" />
          Ver screenshot
        </a>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2 border-t border-white/5">
        {showActions && (
          <>
            <button
              onClick={onVerify}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-300 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Check className="h-4 w-4" />
              Verificar
            </button>
            <button
              onClick={onReject}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="h-4 w-4" />
              Rechazar
            </button>
          </>
        )}

        {showRemoveReport && (
          <button
            onClick={onReportRemoved}
            className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            Reportar eliminado
          </button>
        )}

        <button
          onClick={onViewMetrics}
          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-foreground/80 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ml-auto"
        >
          <BarChart3 className="h-4 w-4" />
          Métricas
        </button>
      </div>
    </div>
  );
}
