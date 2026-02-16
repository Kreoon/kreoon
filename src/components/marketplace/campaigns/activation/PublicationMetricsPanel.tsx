import { useState } from 'react';
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark,
  Eye, Users, BarChart3, Gift, Loader2, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandActivation } from '@/hooks/useBrandActivation';
import { SOCIAL_PLATFORMS, VERIFICATION_STATUS_CONFIG } from '@/components/marketplace/types/brandActivation';
import type { ActivationPublication } from '@/components/marketplace/types/brandActivation';

interface PublicationMetricsPanelProps {
  publication: ActivationPublication;
  onBack: () => void;
  onRefresh: () => void;
}

export function PublicationMetricsPanel({ publication, onBack, onRefresh }: PublicationMetricsPanelProps) {
  const { updatePublicationMetrics, loading } = useBrandActivation();

  const [likes, setLikes] = useState(publication.likes_count);
  const [comments, setComments] = useState(publication.comments_count);
  const [shares, setShares] = useState(publication.shares_count);
  const [saves, setSaves] = useState(publication.saves_count);
  const [views, setViews] = useState(publication.views_count);
  const [reach, setReach] = useState(publication.reach_count);
  const [impressions, setImpressions] = useState(publication.impressions_count);
  const [editing, setEditing] = useState(false);

  const platformInfo = SOCIAL_PLATFORMS[publication.platform];
  const statusConfig = VERIFICATION_STATUS_CONFIG[publication.verification_status];

  const handleSave = async () => {
    const ok = await updatePublicationMetrics(publication.id, {
      likes_count: likes,
      comments_count: comments,
      shares_count: shares,
      saves_count: saves,
      views_count: views,
      reach_count: reach,
      impressions_count: impressions,
    });
    if (ok) {
      setEditing(false);
      onRefresh();
    }
  };

  const metrics = [
    { label: 'Likes', value: likes, setter: setLikes, icon: Heart, color: 'text-red-400' },
    { label: 'Comentarios', value: comments, setter: setComments, icon: MessageCircle, color: 'text-blue-400' },
    { label: 'Shares', value: shares, setter: setShares, icon: Share2, color: 'text-green-400' },
    { label: 'Guardados', value: saves, setter: setSaves, icon: Bookmark, color: 'text-yellow-400' },
    { label: 'Views', value: views, setter: setViews, icon: Eye, color: 'text-purple-400' },
    { label: 'Alcance', value: reach, setter: setReach, icon: Users, color: 'text-cyan-400' },
    { label: 'Impresiones', value: impressions, setter: setImpressions, icon: BarChart3, color: 'text-orange-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', platformInfo.bgColor)}>
            <span className="text-white font-bold">{platformInfo.label.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Métricas de Publicación</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-gray-500 text-xs">{platformInfo.label}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', statusConfig.bgColor, statusConfig.color)}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement rate */}
      {publication.engagement_rate != null && (
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-white">{publication.engagement_rate}%</p>
          <p className="text-gray-400 text-sm mt-1">Tasa de Engagement</p>
          {publication.followers_at_post != null && (
            <p className="text-gray-500 text-xs mt-0.5">
              {publication.followers_at_post.toLocaleString()} seguidores al momento de publicar
            </p>
          )}
        </div>
      )}

      {/* Bonus info */}
      {(publication.base_payment != null || publication.engagement_bonus != null) && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
            <Gift className="h-4 w-4" />
            Compensación
          </h3>
          <div className="flex gap-6 text-sm">
            {publication.base_payment != null && (
              <div>
                <p className="text-gray-500 text-xs">Pago base</p>
                <p className="text-white font-medium">${publication.base_payment.toLocaleString()}</p>
              </div>
            )}
            {publication.engagement_bonus != null && publication.engagement_bonus > 0 && (
              <div>
                <p className="text-gray-500 text-xs">Bonus engagement</p>
                <p className="text-green-400 font-medium">+${publication.engagement_bonus.toLocaleString()}</p>
              </div>
            )}
            {publication.total_payment != null && (
              <div>
                <p className="text-gray-500 text-xs">Total</p>
                <p className="text-white font-bold">${publication.total_payment.toLocaleString()}</p>
              </div>
            )}
          </div>
          {publication.bonus_calculated_at && (
            <p className="text-gray-600 text-xs">
              Calculado: {new Date(publication.bonus_calculated_at).toLocaleDateString('es-CO')}
            </p>
          )}
        </div>
      )}

      {/* Metrics grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Métricas</h3>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Editar métricas
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center gap-1 transition-colors"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-gray-400 hover:text-white px-3 py-1 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map(({ label, value, setter, icon: Icon, color }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn('h-3.5 w-3.5', color)} />
                <span className="text-gray-500 text-xs">{label}</span>
              </div>
              {editing ? (
                <input
                  type="number"
                  min={0}
                  value={value}
                  onChange={e => setter(parseInt(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              ) : (
                <p className="text-white font-semibold text-lg">{value.toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>

        {publication.metrics_last_updated && (
          <p className="text-gray-600 text-xs mt-2 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Última actualización: {new Date(publication.metrics_last_updated).toLocaleDateString('es-CO')}
          </p>
        )}
      </div>
    </div>
  );
}
