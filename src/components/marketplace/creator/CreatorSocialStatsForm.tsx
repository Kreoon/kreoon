import { useState, useEffect, useCallback } from 'react';
import { Check, AlertCircle, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { useBrandActivation } from '@/hooks/useBrandActivation';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { cn } from '@/lib/utils';
import type { SocialPlatform, CreatorSocialStats } from '@/components/marketplace/types/brandActivation';
import { SOCIAL_PLATFORMS } from '@/components/marketplace/types/brandActivation';
import type { UpdateSocialStatsData } from '@/hooks/useBrandActivation';

const PLATFORMS_TO_SHOW: SocialPlatform[] = [
  'instagram_reels',
  'tiktok',
  'youtube_shorts',
  'youtube',
];

const EMPTY_FORM: UpdateSocialStatsData = {
  platform: 'instagram_reels',
  username: '',
  profile_url: '',
  followers_count: 0,
  following_count: 0,
  posts_count: 0,
  avg_likes_per_post: 0,
  avg_comments_per_post: 0,
  avg_views_per_reel: 0,
  engagement_rate: undefined,
  is_verified: false,
};

export function CreatorSocialStatsForm() {
  const { profile: creatorProfile } = useCreatorProfile();
  const { getCreatorSocialStats, updateSocialStats, loading: saving } = useBrandActivation();
  const [stats, setStats] = useState<CreatorSocialStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlatform, setEditingPlatform] = useState<SocialPlatform | null>(null);
  const [formData, setFormData] = useState<UpdateSocialStatsData>(EMPTY_FORM);

  const loadStats = useCallback(async () => {
    if (!creatorProfile?.id) return;
    setLoading(true);
    const data = await getCreatorSocialStats(creatorProfile.id);
    setStats(data);
    setLoading(false);
  }, [creatorProfile?.id, getCreatorSocialStats]);

  useEffect(() => {
    if (creatorProfile?.id) {
      loadStats();
    }
  }, [creatorProfile?.id, loadStats]);

  const getStatForPlatform = (platform: SocialPlatform) => {
    return stats.find(s => s.platform === platform);
  };

  const handleEdit = (platform: SocialPlatform) => {
    const existing = getStatForPlatform(platform);
    if (existing) {
      setFormData({
        platform,
        username: existing.username || '',
        profile_url: existing.profile_url || '',
        followers_count: existing.followers_count,
        following_count: existing.following_count,
        posts_count: existing.posts_count,
        avg_likes_per_post: existing.avg_likes_per_post,
        avg_comments_per_post: existing.avg_comments_per_post,
        avg_views_per_reel: existing.avg_views_per_reel,
        engagement_rate: existing.engagement_rate ?? undefined,
        is_verified: existing.is_verified,
      });
    } else {
      setFormData({ ...EMPTY_FORM, platform });
    }
    setEditingPlatform(platform);
  };

  const handleSave = async () => {
    if (!creatorProfile?.id || !editingPlatform) return;

    const ok = await updateSocialStats(creatorProfile.id, formData);
    if (ok) {
      await loadStats();
      setEditingPlatform(null);
      setFormData(EMPTY_FORM);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Mis Redes Sociales</h2>
          <p className="text-sm text-gray-400">
            Conecta tus redes para aplicar a campañas de activación de marca
          </p>
        </div>
        <button
          onClick={loadStats}
          className="p-2 text-gray-500 hover:text-foreground hover:bg-white/5 rounded-sm transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {PLATFORMS_TO_SHOW.map(platform => {
          const info = SOCIAL_PLATFORMS[platform];
          const stat = getStatForPlatform(platform);
          const isEditing = editingPlatform === platform;

          return (
            <div
              key={platform}
              className={cn(
                'border rounded-sm p-4 transition-all',
                stat?.is_verified
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-white/10 bg-white/5',
                isEditing && 'ring-2 ring-purple-500',
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-sm flex items-center justify-center', info.bgColor)}>
                    <span className="text-white font-bold">{info.label.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{info.label}</h3>
                    {stat?.username && (
                      <a
                        href={stat.profile_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-purple-400 flex items-center gap-1"
                      >
                        @{stat.username}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {stat?.is_verified && (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/15 px-2 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5" />
                    Verificado
                  </span>
                )}
              </div>

              {/* Edit form */}
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-400">Usuario</label>
                    <input
                      type="text"
                      value={formData.username || ''}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      placeholder="@tuusuario"
                      className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white text-sm mt-1 placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-400">Seguidores</label>
                    <input
                      type="number"
                      value={formData.followers_count || ''}
                      onChange={e => setFormData({ ...formData, followers_count: parseInt(e.target.value) || 0 })}
                      placeholder="10000"
                      className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white text-sm mt-1 placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-400">Promedio de likes por post</label>
                    <input
                      type="number"
                      value={formData.avg_likes_per_post || ''}
                      onChange={e => setFormData({ ...formData, avg_likes_per_post: parseInt(e.target.value) || 0 })}
                      placeholder="500"
                      className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white text-sm mt-1 placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-400">URL del perfil</label>
                    <input
                      type="url"
                      value={formData.profile_url || ''}
                      onChange={e => setFormData({ ...formData, profile_url: e.target.value })}
                      placeholder="https://instagram.com/tuusuario"
                      className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white text-sm mt-1 placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPlatform(null);
                        setFormData(EMPTY_FORM);
                      }}
                      className="px-4 py-2 border border-white/10 text-gray-400 rounded-sm hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {stat ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Seguidores</span>
                        <span className="font-semibold text-foreground">
                          {stat.followers_count?.toLocaleString() || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Avg. likes</span>
                        <span className="font-semibold text-foreground">
                          {stat.avg_likes_per_post?.toLocaleString() || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Engagement</span>
                        <span className="font-semibold text-foreground">
                          {stat.engagement_rate ? `${stat.engagement_rate}%` : '-'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleEdit(platform)}
                        className="w-full mt-3 px-4 py-2 border border-purple-500/30 text-purple-400 rounded-sm hover:bg-purple-500/10 transition-colors text-sm"
                      >
                        Actualizar datos
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-500 mb-3">
                        Agrega tu cuenta para aplicar a campañas
                      </p>
                      <button
                        onClick={() => handleEdit(platform)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-sm hover:bg-purple-700 transition-colors text-sm"
                      >
                        Conectar cuenta
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-sm">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-300 text-sm">
              ¿Por qué necesitamos tus estadísticas?
            </h4>
            <p className="text-xs text-amber-300/70 mt-1">
              Las campañas de activación de marca requieren que publiques en tus redes sociales.
              Las marcas buscan creadores con una audiencia mínima para garantizar el alcance de sus campañas.
              Mantén tus datos actualizados para acceder a más oportunidades.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
