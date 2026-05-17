import { useState, useMemo } from 'react';
import {
  X, User, Building, Globe, ChevronRight, ChevronLeft, Check, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSocialAccounts } from '../../hooks/useSocialAccounts';
import { useScheduledPosts } from '../../hooks/useScheduledPosts';
import { useAccountGroups } from '../../hooks/useAccountGroups';
import { PlatformIcon } from '../common/PlatformIcon';
import { MediaUploader } from './MediaUploader';
import { HashtagManager } from './HashtagManager';
import { PreviewPanel } from './PreviewPanel';
import { ContentSelector } from './ContentSelector';
import { AICaptionSelector } from './AICaptionSelector';
import type { ApprovedContent } from '../../hooks/useApprovedContent';
import { getBunnyThumbnailUrl, getBunnyVideoUrls, findBestBunnyMp4 } from '@/hooks/useHLSPlayer';
import { PLATFORMS } from '../../config';
import type {
  SocialPostType, ComposerFormData, QuickShareData, CollaborationType,
  SocialPlatform, SocialAccount, TikTokPostSettings,
} from '../../types/social.types';
import { TikTokSettings } from './TikTokSettings';
import { toast } from 'sonner';
import { fromZonedTime } from 'date-fns-tz';
import { useTimezone } from '@/hooks/useTimezone';
import { checkCompliance, DISCLOSURE_PLATFORMS } from '../../lib/platformCompliance';

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

const STEP_INFO = [
  { emoji: '📱', title: '¿Dónde publicas?', subtitle: 'Elige una o más redes sociales' },
  { emoji: '✍️', title: '¿Qué publicas?', subtitle: 'Tu caption, fotos o videos' },
  { emoji: '🚀', title: '¡Revisa y publica!', subtitle: 'Configura y confirma antes de publicar' },
];

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', facebook: '👥', youtube: '▶️',
  twitter: '🐦', linkedin: '💼', threads: '🧵', pinterest: '📌',
};

const POST_TYPE_OPTIONS: Array<{
  value: SocialPostType; emoji: string; label: string; desc: string;
  bg: string; selectedBg: string; dot: string;
}> = [
  {
    value: 'post', emoji: '📸', label: 'Foto / Post', desc: 'Imagen o texto simple',
    bg: 'hover:bg-pink-500/10 border-border hover:border-pink-500/40',
    selectedBg: 'bg-pink-500/15 border-pink-500/60', dot: 'bg-pink-400',
  },
  {
    value: 'reel', emoji: '🎥', label: 'Reel / Short', desc: 'Video vertical corto',
    bg: 'hover:bg-purple-500/10 border-border hover:border-purple-500/40',
    selectedBg: 'bg-purple-500/15 border-purple-500/60', dot: 'bg-purple-400',
  },
  {
    value: 'story', emoji: '⏳', label: 'Historia', desc: 'Desaparece en 24h',
    bg: 'hover:bg-blue-500/10 border-border hover:border-blue-500/40',
    selectedBg: 'bg-blue-500/15 border-blue-500/60', dot: 'bg-blue-400',
  },
  {
    value: 'carousel', emoji: '🎨', label: 'Carrusel', desc: 'Varias imágenes',
    bg: 'hover:bg-amber-500/10 border-border hover:border-amber-500/40',
    selectedBg: 'bg-amber-500/15 border-amber-500/60', dot: 'bg-amber-400',
  },
];

const COLLAB_TYPES: Array<{ value: CollaborationType; emoji: string; label: string }> = [
  { value: 'collab_post', emoji: '🤝', label: 'Post Collab' },
  { value: 'mention', emoji: '@', label: 'Mención' },
  { value: 'tag', emoji: '🏷️', label: 'Etiqueta' },
  { value: 'branded_content', emoji: '⭐', label: 'Patrocinio' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function WizardSteps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-300',
            i < current   ? 'w-4 h-1.5 bg-primary' :
            i === current ? 'w-6 h-1.5 bg-primary' :
                            'w-1.5 h-1.5 bg-muted-foreground/30',
          )}
        />
      ))}
    </div>
  );
}

function OptionCard({
  emoji, label, desc, selected, onClick, bg, selectedBg, dot,
}: {
  emoji: string; label: string; desc: string; selected: boolean;
  onClick: () => void; bg: string; selectedBg: string; dot: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.98]',
        selected ? selectedBg : bg,
      )}
    >
      <span className="text-2xl leading-none select-none">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className={cn(
        'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
        selected ? `${dot} border-transparent` : 'border-muted-foreground/30',
      )}>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
    </button>
  );
}

function BigAccountCard({
  account, selected, disabled, onClick,
}: {
  account: SocialAccount; selected: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Ya hay una cuenta de esta red seleccionada para esta entidad' : undefined}
      className={cn(
        'flex items-center gap-2.5 px-3 py-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98]',
        disabled ? 'opacity-30 cursor-not-allowed border-border' :
        selected  ? 'border-primary bg-primary/10' :
                    'border-border hover:border-primary/40 hover:bg-muted/30',
      )}
    >
      <PlatformIcon platform={account.platform} size="sm" showBg />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">
          {account.platform_display_name || account.platform_username}
        </p>
        {account.platform_page_name && (
          <p className="text-[9px] text-muted-foreground truncate">{account.platform_page_name}</p>
        )}
      </div>
      {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface PostComposerProps {
  initialData?: Partial<QuickShareData>;
  campaignId?: string;
  brandUsername?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function PostComposer({ initialData, campaignId, brandUsername, onSuccess, onClose }: PostComposerProps) {
  const { timezone } = useTimezone();
  const { accounts, personalAccounts, orgAccounts, accountsByClient } = useSocialAccounts();
  const { createPost, publishNow } = useScheduledPosts();
  const { groups } = useAccountGroups();

  // Content
  const [caption, setCaption] = useState(initialData?.caption || '');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>(() => {
    if (!initialData?.videoUrl) return [];
    const bunny = getBunnyVideoUrls(initialData.videoUrl);
    return [bunny?.mp4 || initialData.videoUrl];
  });
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => {
    if (initialData?.thumbnailUrl) return initialData.thumbnailUrl;
    if (initialData?.videoUrl) return getBunnyThumbnailUrl(initialData.videoUrl);
    return null;
  });

  // Accounts
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Settings
  const [postType, setPostType] = useState<SocialPostType>('post');
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [firstComment, setFirstComment] = useState('');
  const [locationName, setLocationName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(!!campaignId);
  const [collabType, setCollabType] = useState<CollaborationType>(brandUsername ? 'collab_post' : 'mention');
  const [collabBrandUser, setCollabBrandUser] = useState(brandUsername || '');
  const [tiktokSettings, setTiktokSettings] = useState<TikTokPostSettings | null>(null);
  const [isSponsoredContent, setIsSponsoredContent] = useState(!!brandUsername);

  // UI
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContentSelector, setShowContentSelector] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ApprovedContent | null>(null);

  // Derived
  const selectedPlatforms = useMemo(() => (
    accounts.filter(a => selectedAccountIds.includes(a.id)).map(a => a.platform)
  ), [accounts, selectedAccountIds]);

  const minCaptionLimit = useMemo(() => {
    if (selectedPlatforms.length === 0) return 5000;
    return Math.min(...selectedPlatforms.map(p => PLATFORMS[p]?.maxCaptionLength || 5000));
  }, [selectedPlatforms]);

  const captionOverLimit = caption.length > minCaptionLimit;
  const hasTikTok = accounts.some(a => selectedAccountIds.includes(a.id) && a.platform === 'tiktok');

  const accountClientId = useMemo(() => {
    const hit = accounts.find(a => selectedAccountIds.includes(a.id) && a.owner_type === 'client' && a.client_id);
    return hit?.client_id || null;
  }, [accounts, selectedAccountIds]);

  const stepCanProceed = [
    selectedAccountIds.length > 0,
    caption.trim().length > 0 || mediaUrls.length > 0,
    true,
  ];

  // Handlers
  const isAccountDisabled = (account: SocialAccount) => {
    if (selectedAccountIds.includes(account.id)) return false;
    const entityKey = getEntityKey(account);
    return accounts.some(a =>
      selectedAccountIds.includes(a.id) && a.platform === account.platform && getEntityKey(a) === entityKey,
    );
  };

  const toggleAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account && isAccountDisabled(account)) return;
    setSelectedAccountIds(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId],
    );
  };

  const handleContentSelect = async (content: ApprovedContent, selectedVideoUrl: string | null) => {
    setSelectedContent(content);
    const parts: string[] = [];
    if (content.title) parts.push(content.title);
    if (content.description) parts.push(content.description);
    if (content.hook) parts.push(content.hook);
    if (content.cta) parts.push(`\n${content.cta}`);
    setCaption(parts.join('\n\n'));
    const rawVideoUrl = selectedVideoUrl || content.video_urls?.[0] || content.video_url || content.bunny_embed_url;
    if (rawVideoUrl) {
      const bestMp4 = await findBestBunnyMp4(rawVideoUrl);
      setMediaUrls([bestMp4]);
      setPostType('reel');
    }
    const thumb = content.thumbnail_url || (rawVideoUrl ? getBunnyThumbnailUrl(rawVideoUrl) : null);
    if (thumb) {
      setThumbnailUrl(thumb);
      if (!rawVideoUrl) { setMediaUrls([thumb]); setPostType('post'); }
    }
  };

  const handleSubmit = async (immediate: boolean) => {
    setIsSubmitting(true);
    try {
      if (hasTikTok && !tiktokSettings?.privacyLevel) {
        toast.error('Completa los ajustes de TikTok antes de publicar');
        return;
      }
      if (hasTikTok && tiktokSettings?.brandContentToggle && !tiktokSettings.brandOrganic && !tiktokSettings.brandedContent) {
        toast.error('Debes indicar el tipo de contenido comercial en TikTok');
        return;
      }

      const finalScheduledAt = publishMode === 'schedule' && scheduledAt
        ? fromZonedTime(scheduledAt, timezone)
        : null;

      const formData: ComposerFormData = {
        caption: caption + (hashtags.length > 0 ? '\n\n' + hashtags.map(t => `#${t}`).join(' ') : ''),
        hashtags,
        mediaUrls,
        thumbnailUrl,
        scheduledAt: immediate ? null : finalScheduledAt,
        postType,
        visibility:
          hasTikTok && tiktokSettings?.privacyLevel === 'SELF_ONLY' ? 'private'
          : hasTikTok && tiktokSettings?.privacyLevel === 'MUTUAL_FOLLOW_FRIENDS' ? 'friends'
          : hasTikTok && tiktokSettings?.privacyLevel === 'FOLLOWER_OF_CREATOR' ? 'followers'
          : visibility,
        firstComment,
        locationName,
        targetAccountIds: selectedAccountIds,
        contentId: selectedContent?.id || initialData?.contentId || null,
        campaignId: campaignId || null,
        tiktokSettings: hasTikTok ? tiktokSettings : null,
        brandCollaboration: collabBrandUser ? {
          brand_account_id: null,
          brand_username: collabBrandUser,
          brand_platform_id: null,
          collaboration_type: collabType,
          require_approval: collabType === 'collab_post' || collabType === 'branded_content',
        } : null,
      };

      const post = await createPost.mutateAsync(formData);

      if (immediate) {
        await publishNow.mutateAsync(post.id);
        toast.success('🚀 Publicando en tus redes...');
      } else if (finalScheduledAt) {
        toast.success('📅 Post programado correctamente');
      } else {
        toast.success('💾 Borrador guardado');
      }

      onSuccess?.();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientGroups = Object.values(accountsByClient);
  const { emoji, title, subtitle } = STEP_INFO[step];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Wizard header */}
      <div className="space-y-3">
        <WizardSteps current={step} total={TOTAL_STEPS} />
        <div className="text-center">
          <p className="text-lg font-bold">{emoji} {title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* ── Paso 0: Cuentas ──────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <span className="text-5xl">🔗</span>
              <p className="font-semibold">¡Conecta tus redes primero!</p>
              <p className="text-sm text-muted-foreground">
                Ve a la pestaña 🔗 Cuentas para conectar Instagram, TikTok y más.
              </p>
            </div>
          ) : (
            <>
              {personalAccounts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Personal
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {personalAccounts.map(account => (
                      <BigAccountCard
                        key={account.id}
                        account={account}
                        selected={selectedAccountIds.includes(account.id)}
                        disabled={isAccountDisabled(account)}
                        onClick={() => toggleAccount(account.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {clientGroups.map(group => (
                <div key={group.clientId} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    {group.clientLogoUrl ? (
                      <img src={group.clientLogoUrl} alt={group.clientName} className="w-3.5 h-3.5 rounded-full object-cover" />
                    ) : (
                      <Building className="w-3.5 h-3.5" />
                    )}
                    {group.clientName}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.accounts.map(account => (
                      <BigAccountCard
                        key={account.id}
                        account={account}
                        selected={selectedAccountIds.includes(account.id)}
                        disabled={isAccountDisabled(account)}
                        onClick={() => toggleAccount(account.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {orgAccounts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Organización
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {orgAccounts.map(account => (
                      <BigAccountCard
                        key={account.id}
                        account={account}
                        selected={selectedAccountIds.includes(account.id)}
                        disabled={isAccountDisabled(account)}
                        onClick={() => toggleAccount(account.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Group quick-select */}
              {groups.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground">O selecciona por grupo:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {groups.map(group => {
                      const groupAccountIds = group.members?.map(m => m.account_id) || [];
                      const allSelected = groupAccountIds.length > 0 && groupAccountIds.every(id => selectedAccountIds.includes(id));
                      return (
                        <button
                          key={group.id}
                          onClick={() => {
                            if (allSelected) {
                              setSelectedAccountIds(prev => prev.filter(id => !groupAccountIds.includes(id)));
                            } else {
                              setSelectedAccountIds(prev => [...new Set([...prev, ...groupAccountIds])]);
                            }
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all',
                            allSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30',
                          )}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                          {group.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Paso 1: Contenido ────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Content picker */}
          {selectedContent ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border-2 border-primary/20">
              {selectedContent.thumbnail_url && (
                <img src={selectedContent.thumbnail_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedContent.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedContent.client_name || selectedContent.creator_name || 'Contenido aprobado'}
                </p>
              </div>
              <button onClick={() => setSelectedContent(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowContentSelector(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.99]"
            >
              <span className="text-2xl">📂</span>
              <div className="text-left">
                <p className="text-sm font-semibold">Usar contenido aprobado</p>
                <p className="text-xs text-muted-foreground">Selecciona un video o imagen de tu biblioteca</p>
              </div>
            </button>
          )}

          {/* AI Caption */}
          {selectedContent?.id && (
            <AICaptionSelector
              contentId={selectedContent.id}
              targetPlatform={selectedPlatforms[0] as SocialPlatform || 'instagram'}
              postType={postType}
              accountClientId={accountClientId}
              onSelect={(aiCaption, aiHashtags, aiFirstComment) => {
                setCaption(aiCaption);
                setHashtags(aiHashtags);
                if (aiFirstComment) setFirstComment(aiFirstComment);
              }}
            />
          )}

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">✍️ Tu caption</p>
              <span className={cn('text-xs', captionOverLimit ? 'text-red-400' : 'text-muted-foreground')}>
                {caption.length}/{minCaptionLimit}
              </span>
            </div>
            <Textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Escribe algo genial aquí... 🔥"
              className="min-h-[120px] resize-none rounded-2xl border-2"
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">#️⃣ Hashtags</p>
            <HashtagManager hashtags={hashtags} onChange={setHashtags} />
          </div>

          {/* Media */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">🖼️ Fotos y videos</p>
            <MediaUploader
              mediaUrls={mediaUrls}
              onMediaChange={setMediaUrls}
              thumbnailUrl={thumbnailUrl}
              onThumbnailChange={setThumbnailUrl}
              maxFiles={10}
            />
          </div>
        </div>
      )}

      {/* ── Paso 2: Configuración + Publicar ─────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">

          {/* Tipo de contenido */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">¿Qué tipo de contenido?</p>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPE_OPTIONS.map(opt => (
                <OptionCard
                  key={opt.value}
                  emoji={opt.emoji}
                  label={opt.label}
                  desc={opt.desc}
                  selected={postType === opt.value}
                  onClick={() => setPostType(opt.value)}
                  bg={opt.bg}
                  selectedBg={opt.selectedBg}
                  dot={opt.dot}
                />
              ))}
            </div>
          </div>

          {/* Cuándo publicar */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">¿Cuándo lo publicas?</p>
            <div className="grid grid-cols-2 gap-2">
              <OptionCard
                emoji="⚡"
                label="Ahora mismo"
                desc="Publica de inmediato"
                selected={publishMode === 'now'}
                onClick={() => setPublishMode('now')}
                bg="hover:bg-green-500/10 border-border hover:border-green-500/40"
                selectedBg="bg-green-500/15 border-green-500/60"
                dot="bg-green-400"
              />
              <OptionCard
                emoji="📅"
                label="Programar"
                desc="Elige fecha y hora"
                selected={publishMode === 'schedule'}
                onClick={() => setPublishMode('schedule')}
                bg="hover:bg-blue-500/10 border-border hover:border-blue-500/40"
                selectedBg="bg-blue-500/15 border-blue-500/60"
                dot="bg-blue-400"
              />
            </div>
            {publishMode === 'schedule' && (
              <div className="space-y-1 pt-1">
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="rounded-xl border-2"
                />
                <p className="text-[10px] text-muted-foreground">Zona horaria: {timezone}</p>
              </div>
            )}
          </div>

          {/* TikTok settings */}
          {hasTikTok && (() => {
            const tiktokAccount = accounts.find(a => selectedAccountIds.includes(a.id) && a.platform === 'tiktok');
            return tiktokAccount ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">🎵 Ajustes de TikTok</p>
                <TikTokSettings
                  accountId={tiktokAccount.id}
                  accountName={tiktokAccount.platform_display_name || tiktokAccount.platform_username || 'TikTok'}
                  onChange={setTiktokSettings}
                />
              </div>
            ) : null;
          })()}

          {/* Opciones avanzadas */}
          <div className="rounded-2xl border-2 border-border overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              <span>🔧 Opciones avanzadas</span>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showAdvanced && 'rotate-180')} />
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs">💬 Primer comentario</Label>
                  <Input
                    value={firstComment}
                    onChange={e => setFirstComment(e.target.value)}
                    placeholder="Comentario automático después de publicar..."
                    className="rounded-xl border-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">📍 Ubicación</Label>
                  <Input
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    placeholder="Nombre del lugar..."
                    className="rounded-xl border-2"
                  />
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    🤝 Colaboración con Marca
                  </Label>
                  <div className="space-y-1.5">
                    <Label className="text-xs">@Usuario de la marca</Label>
                    <Input
                      value={collabBrandUser}
                      onChange={e => setCollabBrandUser(e.target.value)}
                      placeholder="@marca..."
                      className="rounded-xl border-2"
                    />
                  </div>
                  {collabBrandUser && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {COLLAB_TYPES.map(ct => (
                        <button
                          key={ct.value}
                          onClick={() => setCollabType(ct.value)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all',
                            collabType === ct.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30',
                          )}
                        >
                          <span>{ct.emoji}</span> {ct.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Compliance por plataforma */}
          {selectedPlatforms.length > 0 && (
            <div className="rounded-2xl border-2 border-border/50 bg-card/20 p-4 space-y-2">
              <p className="text-sm font-semibold">🛡️ Verificación de políticas</p>
              <div className="space-y-1.5">
                {checkCompliance(selectedPlatforms, caption, hashtags).map(check => {
                  const allOk = check.captionOk && check.hashtagsOk;
                  return (
                    <div key={check.platform} className={cn(
                      'flex items-start gap-2 px-3 py-2 rounded-xl text-xs',
                      allOk ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                    )}>
                      <span className="shrink-0 mt-px">{allOk ? '✅' : '⚠️'}</span>
                      <div className="flex-1 space-y-0.5">
                        <p className="font-semibold capitalize">{check.platform}</p>
                        {!check.captionOk && (
                          <p>Caption muy largo ({check.captionLength}/{check.captionLimit} chars)</p>
                        )}
                        {!check.hashtagsOk && (
                          <p>Demasiados hashtags ({check.hashtagCount}/{check.hashtagLimit})</p>
                        )}
                        {allOk && <p className="opacity-80">Todo en orden</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contenido patrocinado */}
          {selectedPlatforms.some(p => DISCLOSURE_PLATFORMS.includes(p)) && (
            <button
              onClick={() => setIsSponsoredContent(v => !v)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all',
                isSponsoredContent
                  ? 'border-amber-500/60 bg-amber-500/10'
                  : 'border-border hover:border-amber-500/30'
              )}
            >
              <span className="text-2xl">⭐</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">¿Es contenido patrocinado?</p>
                <p className="text-xs text-muted-foreground">
                  Instagram, Facebook y LinkedIn requieren divulgación de pago
                </p>
              </div>
              <div className={cn(
                'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
                isSponsoredContent ? 'bg-amber-400 border-amber-400' : 'border-muted-foreground/30'
              )}>
                {isSponsoredContent && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
            </button>
          )}

          {/* Resumen */}
          {selectedAccountIds.length > 0 && (
            <div className="p-4 rounded-2xl bg-muted/30 border-2 border-white/8 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumen ✅</p>
              <div className="flex flex-wrap gap-1.5">
                {accounts.filter(a => selectedAccountIds.includes(a.id)).map(a => (
                  <div key={a.id} className="flex items-center gap-1 text-xs bg-background/50 rounded-full px-2.5 py-1 border">
                    <span>{PLATFORM_EMOJI[a.platform] || '📱'}</span>
                    <span className="font-medium">{a.platform_display_name || a.platform_username}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {POST_TYPE_OPTIONS.find(o => o.value === postType)?.emoji}{' '}
                {POST_TYPE_OPTIONS.find(o => o.value === postType)?.label}
                {' · '}
                {publishMode === 'now'
                  ? '⚡ Publicar ahora'
                  : scheduledAt
                    ? `📅 ${new Date(scheduledAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                    : '📅 Sin fecha aún'}
              </p>
            </div>
          )}

          {/* Preview */}
          {(caption.trim() || mediaUrls.length > 0 || thumbnailUrl) && (
            <PreviewPanel
              caption={caption}
              hashtags={hashtags}
              mediaUrls={mediaUrls}
              thumbnailUrl={thumbnailUrl}
              platforms={selectedPlatforms as SocialPlatform[]}
              postType={postType}
            />
          )}

          {/* Botones de acción */}
          <div className="space-y-2 pt-1">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-1.5 rounded-xl"
                disabled={isSubmitting}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Atrás
              </Button>
              {publishMode === 'now' ? (
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="flex-1 h-12 text-base rounded-2xl"
                >
                  {isSubmitting ? '⏳ Publicando...' : '🚀 ¡Publicar ahora!'}
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || !scheduledAt}
                  className="flex-1 h-12 text-base rounded-2xl"
                >
                  {isSubmitting ? '⏳ Programando...' : scheduledAt ? '📅 Programar' : 'Elige una fecha 👆'}
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="w-full text-xs text-muted-foreground rounded-xl"
            >
              💾 Guardar como borrador
            </Button>
            {onClose && (
              <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="w-full text-xs rounded-xl">
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Navegación (pasos 0–1) ────────────────────────────────────────────── */}
      {step < 2 && (
        <div className={cn('flex gap-2', step === 0 ? 'justify-end' : 'justify-between')}>
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} className="gap-1.5 rounded-xl">
              <ChevronLeft className="w-3.5 h-3.5" /> Atrás
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setStep(s => s + 1)}
            disabled={!stepCanProceed[step]}
            className="gap-1.5 rounded-xl"
          >
            Siguiente <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <ContentSelector
        open={showContentSelector}
        onClose={() => setShowContentSelector(false)}
        onSelect={handleContentSelect}
      />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEntityKey(account: SocialAccount): string {
  if (account.owner_type === 'client' && account.client_id) return `client:${account.client_id}`;
  if (account.owner_type === 'organization') return 'org';
  return `user:${account.user_id}`;
}
