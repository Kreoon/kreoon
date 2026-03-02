import { useState, useMemo } from 'react';
import {
  Send, Clock, Hash, MapPin, MessageSquare, Calendar as CalendarIcon,
  X, Plus, Sparkles, Eye, ChevronDown, User, Building, Globe, FolderOpen,
  AlertTriangle, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSocialAccounts } from '../../hooks/useSocialAccounts';
import { useScheduledPosts } from '../../hooks/useScheduledPosts';
import { useAccountGroups } from '../../hooks/useAccountGroups';
import { useSocialPostsLimit } from '../../hooks/useSocialPostsLimit';
import { PlatformIcon } from '../common/PlatformIcon';
import { MediaUploader } from './MediaUploader';
import { HashtagManager } from './HashtagManager';
import { PreviewPanel } from './PreviewPanel';
import { ContentSelector } from './ContentSelector';
import { AICaptionSelector } from './AICaptionSelector';
import type { ApprovedContent } from '../../hooks/useApprovedContent';
import { getBunnyThumbnailUrl, getBunnyVideoUrls, findBestBunnyMp4 } from '@/hooks/useHLSPlayer';
import { PLATFORMS } from '../../config';
import { useOrgTimezone } from '@/hooks/useOrgTimezone';
import { formatInTimeZone } from 'date-fns-tz';
import { fromZoned } from '@/lib/utils/timezone';
import type { SocialPostType, ComposerFormData, QuickShareData, CollaborationType, SocialPlatform, SocialAccount } from '../../types/social.types';
import { toast } from 'sonner';

interface PostComposerProps {
  initialData?: Partial<QuickShareData>;
  campaignId?: string;
  brandUsername?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function PostComposer({ initialData, campaignId, brandUsername, onSuccess, onClose }: PostComposerProps) {
  const { accounts, personalAccounts, clientAccounts, orgAccounts, accountsByClient } = useSocialAccounts();
  const { createPost, publishNow } = useScheduledPosts();
  const { groups } = useAccountGroups();
  const orgTz = useOrgTimezone();
  const postsLimit = useSocialPostsLimit();

  const [caption, setCaption] = useState(initialData?.caption || '');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>(() => {
    if (!initialData?.videoUrl) return [];
    // Convert Bunny embed/CDN URLs to direct MP4 for preview playback
    const bunny = getBunnyVideoUrls(initialData.videoUrl);
    return [bunny?.mp4 || initialData.videoUrl];
  });
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => {
    if (initialData?.thumbnailUrl) return initialData.thumbnailUrl;
    // Generate thumbnail from Bunny video URL if available
    if (initialData?.videoUrl) return getBunnyThumbnailUrl(initialData.videoUrl);
    return null;
  });
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [postType, setPostType] = useState<SocialPostType>('post');
  const [visibility, setVisibility] = useState('public');
  const [firstComment, setFirstComment] = useState('');
  const [locationName, setLocationName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(!!campaignId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collabType, setCollabType] = useState<CollaborationType>(brandUsername ? 'collab_post' : 'mention');
  const [collabBrandUser, setCollabBrandUser] = useState(brandUsername || '');
  const [showContentSelector, setShowContentSelector] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ApprovedContent | null>(null);

  // Character counts per platform
  const selectedPlatforms = useMemo(() => {
    return accounts
      .filter(a => selectedAccountIds.includes(a.id))
      .map(a => a.platform);
  }, [accounts, selectedAccountIds]);

  const minCaptionLimit = useMemo(() => {
    if (selectedPlatforms.length === 0) return 5000;
    return Math.min(
      ...selectedPlatforms.map(p => PLATFORMS[p]?.maxCaptionLength || 5000)
    );
  }, [selectedPlatforms]);

  const captionOverLimit = caption.length > minCaptionLimit;

  // Derive client_id from the first selected client-owned account (for AI context)
  const accountClientId = useMemo(() => {
    const clientAccount = accounts.find(
      a => selectedAccountIds.includes(a.id) && a.owner_type === 'client' && a.client_id
    );
    return clientAccount?.client_id || null;
  }, [accounts, selectedAccountIds]);

  // Check if selecting an account would violate the 1-per-platform-per-entity rule
  const isAccountDisabled = (account: SocialAccount) => {
    if (selectedAccountIds.includes(account.id)) return false; // Already selected, allow deselect
    // Find the entity key for this account
    const entityKey = getEntityKey(account);
    // Check if another account with the same platform + entity is already selected
    return accounts.some(a =>
      selectedAccountIds.includes(a.id) &&
      a.platform === account.platform &&
      getEntityKey(a) === entityKey
    );
  };

  const toggleAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account && isAccountDisabled(account)) return;
    setSelectedAccountIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleContentSelect = async (content: ApprovedContent, selectedVideoUrl: string | null) => {
    setSelectedContent(content);
    // Fill caption with title + description
    const parts: string[] = [];
    if (content.title) parts.push(content.title);
    if (content.description) parts.push(content.description);
    if (content.hook) parts.push(content.hook);
    if (content.cta) parts.push(`\n${content.cta}`);
    setCaption(parts.join('\n\n'));
    // Use the explicitly selected video URL, fallback to first available
    const rawVideoUrl = selectedVideoUrl || content.video_urls?.[0] || content.video_url || content.bunny_embed_url;
    if (rawVideoUrl) {
      // Probe Bunny CDN for highest available quality (2160p → 720p)
      const bestMp4 = await findBestBunnyMp4(rawVideoUrl);
      setMediaUrls([bestMp4]);
      setPostType('reel');
    }
    // Resolve thumbnail: explicit > generated from Bunny
    const thumb = content.thumbnail_url || (rawVideoUrl ? getBunnyThumbnailUrl(rawVideoUrl) : null);
    if (thumb) {
      setThumbnailUrl(thumb);
      if (!rawVideoUrl) {
        setMediaUrls([thumb]);
        setPostType('post');
      }
    }
  };

  const clearSelectedContent = () => {
    setSelectedContent(null);
  };

  const handleSubmit = async (immediate: boolean) => {
    if (selectedAccountIds.length === 0) {
      toast.error('Selecciona al menos una cuenta');
      return;
    }
    if (!caption.trim() && mediaUrls.length === 0) {
      toast.error('Agrega un caption o media');
      return;
    }
    // Check posts limit
    if (!postsLimit.canCreatePost) {
      toast.error(`Has alcanzado el límite de ${postsLimit.limit} posts/mes de tu plan ${postsLimit.planName}. Actualiza tu plan para continuar.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const formData: ComposerFormData = {
        caption: caption + (hashtags.length > 0 ? '\n\n' + hashtags.map(t => `#${t}`).join(' ') : ''),
        hashtags,
        mediaUrls,
        thumbnailUrl,
        scheduledAt: immediate ? null : (scheduledAt ? fromZoned(scheduledAt, orgTz) : null),
        postType,
        visibility,
        firstComment,
        locationName,
        targetAccountIds: selectedAccountIds,
        contentId: selectedContent?.id || initialData?.contentId || null,
        campaignId: campaignId || null,
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
        toast.success('Publicando en tus redes...');
      } else if (scheduledAt) {
        toast.success('Post programado correctamente');
      } else {
        toast.success('Borrador guardado');
      }

      // Refresh posts limit counter
      postsLimit.refresh();
      onSuccess?.();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullCaption = caption + (hashtags.length > 0 ? '\n\n' + hashtags.map(t => `#${t}`).join(' ') : '');

  const clientGroups = Object.values(accountsByClient);
  const hasAnySections = personalAccounts.length > 0 || clientGroups.length > 0 || orgAccounts.length > 0;

  return (
    <div className="space-y-6">
      {/* Posts limit banner */}
      {!postsLimit.isUnlimited && !postsLimit.loading && (
        <div className={cn(
          "flex items-center justify-between gap-3 p-3 rounded-lg border text-sm",
          postsLimit.canCreatePost
            ? postsLimit.percentUsed >= 80
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
              : "bg-muted/30 border-border text-muted-foreground"
            : "bg-red-500/10 border-red-500/30 text-red-200"
        )}>
          <div className="flex items-center gap-2">
            {postsLimit.canCreatePost ? (
              postsLimit.percentUsed >= 80 ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : null
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>
              {postsLimit.canCreatePost
                ? `${postsLimit.usedThisMonth}/${postsLimit.limit} posts este mes`
                : `Límite de ${postsLimit.limit} posts alcanzado`
              }
              {!postsLimit.canCreatePost && (
                <span className="ml-1 opacity-70">
                  — Plan {postsLimit.planName}
                </span>
              )}
            </span>
          </div>
          {(postsLimit.percentUsed >= 80 || !postsLimit.canCreatePost) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 shrink-0"
              onClick={() => window.location.href = '/settings/planes'}
            >
              <Zap className="w-3 h-3" />
              Mejorar plan
            </Button>
          )}
        </div>
      )}

      {/* Account selector - grouped by entity */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Publicar en</Label>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tienes cuentas conectadas. Ve a la pestaña "Cuentas" para conectar tus redes.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Personal accounts */}
            {personalAccounts.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <User className="w-3 h-3" />
                  Personal
                </div>
                <div className="flex flex-wrap gap-2">
                  {personalAccounts.map(account => (
                    <AccountButton
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

            {/* Client (empresa) accounts - grouped by client */}
            {clientGroups.map(group => (
              <div key={group.clientId} className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  {group.clientLogoUrl ? (
                    <img
                      src={group.clientLogoUrl}
                      alt={group.clientName}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <Building className="w-3 h-3" />
                  )}
                  {group.clientName}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.accounts.map(account => (
                    <AccountButton
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

            {/* Organization accounts */}
            {orgAccounts.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Globe className="w-3 h-3" />
                  Organización
                </div>
                <div className="flex flex-wrap gap-2">
                  {orgAccounts.map(account => (
                    <AccountButton
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

            {/* Uncategorized accounts (brand or missing owner_type) */}
            {accounts.filter(a =>
              a.owner_type !== 'user' && a.owner_type !== 'client' && a.owner_type !== 'organization' &&
              !(a.owner_type === 'user' && a.user_id)
            ).length > 0 && !hasAnySections && (
              <div className="flex flex-wrap gap-2">
                {accounts.map(account => (
                  <AccountButton
                    key={account.id}
                    account={account}
                    selected={selectedAccountIds.includes(account.id)}
                    disabled={isAccountDisabled(account)}
                    onClick={() => toggleAccount(account.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content selector */}
      <div className="space-y-2">
        {selectedContent ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            {selectedContent.thumbnail_url && (
              <img
                src={selectedContent.thumbnail_url}
                alt=""
                className="w-12 h-12 rounded-md object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedContent.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedContent.client_name || selectedContent.creator_name || 'Contenido aprobado'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={clearSelectedContent}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={() => setShowContentSelector(true)}
          >
            <FolderOpen className="w-4 h-4" />
            Seleccionar contenido aprobado
          </Button>
        )}
      </div>

      {/* AI Caption Generator - only when content is selected */}
      {selectedContent?.id && (
        <AICaptionSelector
          contentId={selectedContent.id}
          targetPlatform={selectedPlatforms[0] as SocialPlatform || 'instagram'}
          postType={postType}
          accountClientId={accountClientId}
          onSelect={(aiCaption, aiHashtags, aiFirstComment) => {
            setCaption(aiCaption);
            setHashtags(aiHashtags);
            if (aiFirstComment) {
              setFirstComment(aiFirstComment);
              setShowAdvanced(true);
            }
          }}
        />
      )}

      {/* Caption */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Caption</Label>
          <span className={cn(
            'text-xs',
            captionOverLimit ? 'text-red-400' : 'text-muted-foreground'
          )}>
            {caption.length}/{minCaptionLimit}
          </span>
        </div>
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Escribe tu publicación..."
          className="min-h-[120px] resize-none"
        />
      </div>

      {/* Hashtags (v2 enhanced) */}
      <HashtagManager hashtags={hashtags} onChange={setHashtags} />

      {/* Media Upload (v2) */}
      <MediaUploader
        mediaUrls={mediaUrls}
        onMediaChange={setMediaUrls}
        thumbnailUrl={thumbnailUrl}
        onThumbnailChange={setThumbnailUrl}
        maxFiles={10}
        postType={postType}
      />

      {/* Schedule */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Programar
        </Label>
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          min={formatInTimeZone(new Date(), orgTz, "yyyy-MM-dd'T'HH:mm")}
        />
        <p className="text-[10px] text-muted-foreground">
          Zona horaria: {orgTz.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Post type */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Tipo de publicación</Label>
        <Select value={postType} onValueChange={(v) => setPostType(v as SocialPostType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="post">Post</SelectItem>
            <SelectItem value="reel">Reel / Short</SelectItem>
            <SelectItem value="story">Historia</SelectItem>
            <SelectItem value="carousel">Carrusel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced options */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={cn('w-3 h-3 transition-transform', showAdvanced && 'rotate-180')} />
        Opciones avanzadas
      </button>

      {showAdvanced && (
        <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
          <div className="space-y-2">
            <Label className="text-xs">Primer comentario</Label>
            <Input
              value={firstComment}
              onChange={(e) => setFirstComment(e.target.value)}
              placeholder="Comentario automático después de publicar..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Ubicación</Label>
            <Input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Nombre del lugar..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Visibilidad</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Público</SelectItem>
                <SelectItem value="private">Privado</SelectItem>
                <SelectItem value="unlisted">No listado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Brand collaboration section */}
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Colaboración con Marca
            </Label>
            <div className="space-y-2">
              <Label className="text-xs">@Usuario de la marca</Label>
              <Input
                value={collabBrandUser}
                onChange={(e) => setCollabBrandUser(e.target.value)}
                placeholder="@marca (sin @)..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo de colaboración</Label>
              <Select value={collabType} onValueChange={(v) => setCollabType(v as CollaborationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collab_post">Post colaborativo (Instagram Collab)</SelectItem>
                  <SelectItem value="branded_content">Contenido de marca (Branded Content)</SelectItem>
                  <SelectItem value="mention">Mención en caption</SelectItem>
                  <SelectItem value="tag">Etiqueta en media</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {collabBrandUser && (
              <p className="text-[10px] text-muted-foreground">
                Se agregará @{collabBrandUser} como {collabType === 'collab_post' ? 'colaborador' : collabType === 'branded_content' ? 'marca patrocinadora' : 'mención'} en las publicaciones.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Group quick-select (v2) */}
      {groups.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Seleccionar por grupo</Label>
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
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all',
                    allSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/30'
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

      <Separator />

      {/* Preview (v2) */}
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

      {/* Actions */}
      <div className="flex gap-3">
        {onClose && (
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting || selectedAccountIds.length === 0 || !postsLimit.canCreatePost}
          className="flex-1"
        >
          {scheduledAt ? (
            <>
              <Clock className="w-4 h-4 mr-2" />
              Programar
            </>
          ) : (
            'Guardar borrador'
          )}
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting || selectedAccountIds.length === 0 || !postsLimit.canCreatePost}
          className="flex-1"
        >
          <Send className="w-4 h-4 mr-2" />
          Publicar ahora
        </Button>
      </div>

      {/* Content selector dialog */}
      <ContentSelector
        open={showContentSelector}
        onClose={() => setShowContentSelector(false)}
        onSelect={handleContentSelect}
      />
    </div>
  );
}

// ── Helper: entity key for max-1-per-platform validation ──
function getEntityKey(account: SocialAccount): string {
  if (account.owner_type === 'client' && account.client_id) return `client:${account.client_id}`;
  if (account.owner_type === 'organization') return 'org';
  return `user:${account.user_id}`;
}

// ── Reusable account toggle button ──
function AccountButton({
  account,
  selected,
  disabled,
  onClick,
}: {
  account: SocialAccount;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Ya hay una cuenta de esta red seleccionada para esta entidad' : undefined}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : disabled
            ? 'border-border bg-muted/50 text-muted-foreground opacity-50 cursor-not-allowed'
            : 'border-border bg-card hover:border-primary/30'
      )}
    >
      <PlatformIcon platform={account.platform} size="xs" />
      <span className="truncate max-w-[120px]">
        {account.platform_display_name || account.platform_username}
      </span>
      {account.platform_page_name && (
        <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
          ({account.platform_page_name})
        </span>
      )}
    </button>
  );
}
