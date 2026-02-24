import { useState, useMemo } from 'react';
import {
  Hash, AtSign, Clock, Gift, Shield, Info, Plus, X,
  Eye, Camera, FileCheck, UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { PriceInput } from '@/components/ui/PriceInput';
import type { BrandActivationConfig, SocialPlatform, VerificationMethod } from '@/components/marketplace/types/brandActivation';
import { SOCIAL_PLATFORMS } from '@/components/marketplace/types/brandActivation';

interface ActivationCampaignConfigProps {
  config: BrandActivationConfig;
  onChange: (config: BrandActivationConfig) => void;
}

const PLATFORM_OPTIONS: SocialPlatform[] = [
  'instagram_reels',
  'instagram_feed',
  'instagram_stories',
  'tiktok',
  'youtube_shorts',
  'youtube',
  'facebook',
  'twitter',
  'linkedin',
  'threads',
];

const VERIFICATION_METHODS: { value: VerificationMethod; label: string; icon: typeof Eye }[] = [
  { value: 'manual', label: 'Manual', icon: Eye },
  { value: 'screenshot', label: 'Screenshot', icon: Camera },
  { value: 'creator_confirm', label: 'Confirmación creador', icon: UserCheck },
  { value: 'api', label: 'API automática', icon: FileCheck },
];

const DEFAULT_BONUS = {
  enabled: false,
  per_1k_likes: 0,
  per_1k_comments: 0,
  per_1k_shares: 0,
  per_1k_views: 0,
  max_bonus: 500000,
};

export function ActivationCampaignConfig({ config, onChange }: ActivationCampaignConfigProps) {
  const [newHashtag, setNewHashtag] = useState('');
  const [newMention, setNewMention] = useState('');

  // Deduplica plataformas base para min_followers (instagram_reels + instagram_feed → "instagram" una sola vez)
  const uniqueBaseKeys = useMemo(() => {
    const seen = new Map<string, SocialPlatform>();
    for (const p of config.required_platforms || []) {
      const base = p.split('_')[0]; // instagram, tiktok, youtube, etc
      if (!seen.has(base)) seen.set(base, p);
    }
    return Array.from(seen.entries()); // [['instagram', 'instagram_reels'], ...]
  }, [config.required_platforms]);

  const bonus = config.engagement_bonus || DEFAULT_BONUS;

  const togglePlatform = (platform: SocialPlatform) => {
    const current = config.required_platforms || [];
    const updated = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform];
    onChange({ ...config, required_platforms: updated });
  };

  const updateMinFollowers = (baseKey: string, value: number) => {
    onChange({
      ...config,
      min_followers: { ...config.min_followers, [baseKey]: value },
    });
  };

  const updateBonus = (partial: Partial<typeof DEFAULT_BONUS>) => {
    onChange({
      ...config,
      engagement_bonus: { ...bonus, ...partial },
    });
  };

  const addHashtag = () => {
    if (!newHashtag.trim()) return;
    const tag = newHashtag.startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`;
    if (!config.required_hashtags.includes(tag)) {
      onChange({ ...config, required_hashtags: [...config.required_hashtags, tag] });
    }
    setNewHashtag('');
  };

  const removeHashtag = (tag: string) => {
    onChange({ ...config, required_hashtags: config.required_hashtags.filter(t => t !== tag) });
  };

  const addMention = () => {
    if (!newMention.trim()) return;
    const mention = newMention.startsWith('@') ? newMention.trim() : `@${newMention.trim()}`;
    if (!config.required_mentions.includes(mention)) {
      onChange({ ...config, required_mentions: [...config.required_mentions, mention] });
    }
    setNewMention('');
  };

  const removeMention = (mention: string) => {
    onChange({ ...config, required_mentions: config.required_mentions.filter(m => m !== mention) });
  };

  return (
    <div className="space-y-8">
      {/* ── Plataformas requeridas ──────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          Plataformas de publicación
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Selecciona dónde deben publicar los creadores
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {PLATFORM_OPTIONS.map(platform => {
            const info = SOCIAL_PLATFORMS[platform];
            const isSelected = config.required_platforms?.includes(platform);

            return (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={cn(
                  'p-3 rounded-xl border transition-all text-left',
                  isSelected
                    ? 'border-purple-500/60 bg-purple-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20',
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', info.bgColor)}>
                  <span className="text-white text-xs font-bold">
                    {info.label.charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-medium text-foreground">{info.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Seguidores mínimos (deduplicado por plataforma base) ──────── */}
      {uniqueBaseKeys.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Seguidores mínimos requeridos
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Solo creadores que cumplan estos requisitos podrán aplicar
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {uniqueBaseKeys.map(([baseKey, samplePlatform]) => {
              // Muestra el nombre de la plataforma base (ej: "Instagram")
              const baseName = baseKey.charAt(0).toUpperCase() + baseKey.slice(1);
              const info = SOCIAL_PLATFORMS[samplePlatform];

              return (
                <div key={baseKey} className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', info.bgColor)}>
                    <span className="text-white text-sm font-bold">{baseName.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-foreground/80">{baseName}</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={config.min_followers?.[baseKey] || 0}
                        onChange={e => updateMinFollowers(baseKey, parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                        placeholder="Ej: 5000"
                      />
                      <span className="text-xs text-gray-500 shrink-0">seguidores</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Hashtags obligatorios ───────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Hash className="w-4 h-4 text-purple-400" />
          Hashtags obligatorios
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Hashtags que el creador debe incluir en su publicación
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newHashtag}
            onChange={e => setNewHashtag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
            placeholder="#ad, #publi, #tumarca"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={addHashtag}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.required_hashtags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/15 text-blue-400 rounded-full text-sm"
            >
              {tag}
              <button type="button" onClick={() => removeHashtag(tag)} className="hover:text-blue-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {config.required_hashtags.length === 0 && (
            <span className="text-xs text-gray-500">Sin hashtags requeridos</span>
          )}
        </div>

        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
          <Info className="w-3.5 h-3.5 inline mr-1.5" />
          Recuerda incluir #ad o #publi para cumplir con regulaciones de publicidad
        </div>
      </section>

      {/* ── Menciones obligatorias ──────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <AtSign className="w-4 h-4 text-purple-400" />
          Menciones obligatorias
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Cuentas que el creador debe etiquetar
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newMention}
            onChange={e => setNewMention(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMention())}
            placeholder="@tumarca"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={addMention}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.required_mentions.map(mention => (
            <span
              key={mention}
              className="inline-flex items-center gap-1 px-3 py-1 bg-pink-500/15 text-pink-400 rounded-full text-sm"
            >
              {mention}
              <button type="button" onClick={() => removeMention(mention)} className="hover:text-pink-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {config.required_mentions.length === 0 && (
            <span className="text-xs text-gray-500">Sin menciones requeridas</span>
          )}
        </div>
      </section>

      {/* ── Duración mínima del post ───────────────────────────────────── */}
      <section>
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          Duración mínima del post
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Tiempo que el post debe permanecer publicado
        </p>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={365}
            value={config.min_post_duration_days || 30}
            onChange={e => onChange({ ...config, min_post_duration_days: parseInt(e.target.value) || 30 })}
            className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          />
          <span className="text-sm text-gray-400">días mínimo</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Si el creador elimina el post antes de este tiempo, se considera una violación
        </p>
      </section>

      {/* ── Derechos de uso ─────────────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-purple-400" />
          Derechos de uso del contenido
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Tiempo que la marca puede usar el contenido del creador
        </p>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={3650}
            value={config.usage_rights_duration_days || 90}
            onChange={e => onChange({ ...config, usage_rights_duration_days: parseInt(e.target.value) || 90 })}
            className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          />
          <span className="text-sm text-gray-400">días de licencia</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          0 = solo durante la campaña. 365 = un año completo.
        </p>
      </section>

      {/* ── Método de verificación ──────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-400" />
          Método de verificación
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Cómo se verificará que la publicación cumple los requisitos
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {VERIFICATION_METHODS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...config, verification_method: value })}
              className={cn(
                'p-3 rounded-xl border transition-all text-center',
                config.verification_method === value
                  ? 'border-purple-500/60 bg-purple-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20',
              )}
            >
              <Icon className={cn('w-5 h-5 mx-auto mb-1.5', config.verification_method === value ? 'text-purple-400' : 'text-gray-500')} />
              <span className="text-xs font-medium text-foreground/80">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Bonus por engagement ────────────────────────────────────────── */}
      <section className="p-5 bg-green-500/5 border border-green-500/20 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-green-400 flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Bonus por Engagement
          </h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={bonus.enabled}
              onChange={e => updateBonus({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
          </label>
        </div>

        {bonus.enabled && (
          <div className="space-y-4">
            <p className="text-xs text-green-300/80">
              Incentiva a los creadores con pagos adicionales basados en el rendimiento de su post
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {([
                ['per_1k_likes', 'Por cada 1K likes'],
                ['per_1k_comments', 'Por cada 1K comentarios'],
                ['per_1k_shares', 'Por cada 1K shares'],
                ['per_1k_views', 'Por cada 1K views'],
              ] as const).map(([key, label]) => (
                <PriceInput
                  key={key}
                  label={label}
                  valueUsd={bonus[key] || 0}
                  onChangeUsd={v => updateBonus({ [key]: v })}
                  inputClassName="focus:border-green-500"
                />
              ))}
            </div>

            <PriceInput
              label="Bonus máximo por creador"
              valueUsd={bonus.max_bonus}
              onChangeUsd={v => updateBonus({ max_bonus: v })}
              inputClassName="focus:border-green-500 w-40"
            />
          </div>
        )}
      </section>

      {/* ── Opciones adicionales ────────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-semibold text-white mb-4">Opciones adicionales</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-white/20 transition-colors">
            <input
              type="checkbox"
              checked={config.content_approval_required}
              onChange={e => onChange({ ...config, content_approval_required: e.target.checked })}
              className="w-4 h-4 rounded text-purple-600 bg-white/10 border-white/20"
            />
            <div>
              <span className="text-sm font-medium text-foreground">Aprobar contenido antes de publicar</span>
              <p className="text-xs text-gray-500">El creador debe enviar el contenido para tu aprobación antes de publicarlo</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-white/20 transition-colors">
            <input
              type="checkbox"
              checked={config.allow_reshare_brand}
              onChange={e => onChange({ ...config, allow_reshare_brand: e.target.checked })}
              className="w-4 h-4 rounded text-purple-600 bg-white/10 border-white/20"
            />
            <div>
              <span className="text-sm font-medium text-foreground">Permitir que la marca re-comparta</span>
              <p className="text-xs text-gray-500">Tu marca podrá republicar el contenido en sus propias redes</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-white/20 transition-colors">
            <input
              type="checkbox"
              checked={config.requires_insights_screenshot}
              onChange={e => onChange({ ...config, requires_insights_screenshot: e.target.checked })}
              className="w-4 h-4 rounded text-purple-600 bg-white/10 border-white/20"
            />
            <div>
              <span className="text-sm font-medium text-foreground">Requerir screenshot de insights</span>
              <p className="text-xs text-gray-500">El creador debe enviar captura de las métricas de su publicación</p>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}
