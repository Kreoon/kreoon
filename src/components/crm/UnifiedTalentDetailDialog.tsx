import { useState, useCallback, useRef, useEffect } from 'react';
import {
  User, Briefcase, Building2, Shield, Star, Image, Video,
  Phone, Mail, MapPin, Globe, Pencil, Check, BadgeCheck,
  Instagram, Linkedin, Youtube, Link2, Camera, Trash2,
  Loader2, AlertTriangle, DollarSign, Clock, Users,
  Heart, Ban, Plus, X, Settings, Tag, FileText, Upload,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useFullCreatorDetail,
  useFullUserDetail,
  useFullOrgCreatorDetail,
  useUpdateCreatorRelationship,
  useToggleFavoriteCreator,
  useBlockCreator,
} from '@/hooks/useCrm';
import { useUpdateUserProfileFields, useCrmCustomFieldDefs, useUpdateOrgCreatorCustomFields, useUpdateCreatorProfileFields, useUploadCreatorAvatar } from '@/hooks/useCrmCustomFields';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { CreatorWithMetrics } from '@/services/crm/platformCrmService';
import type { OrgCreatorWithStats, CreatorRelationshipType } from '@/types/crm.types';
import { CREATOR_RELATIONSHIP_TYPE_LABELS } from '@/types/crm.types';
import { AdminActionsSection } from './detail-sections/AdminActionsSection';
import { RolesBadgesSection } from './detail-sections/RolesBadgesSection';
import { OrganizationsListSection } from './detail-sections/OrganizationsListSection';
import { CompaniesSection } from './detail-sections/CompaniesSection';
import { CustomFieldsSection } from './detail-sections/CustomFieldsSection';
import { CrmFieldsConfigDialog } from './detail-sections/CrmFieldsConfigDialog';

const ROOT_EMAILS = ['jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com'];

const hasValidAvatar = (url: string | null | undefined): url is string => {
  return !!(url && url.trim().length > 0);
};

const hasValidUrl = (url: string | null | undefined): url is string => {
  return !!(url && url.trim().length > 0);
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const RELATIONSHIP_COLORS: Record<CreatorRelationshipType, string> = {
  favorite: 'bg-pink-500/20 text-pink-400',
  blocked: 'bg-red-500/20 text-red-400',
  team_member: 'bg-blue-500/20 text-blue-400',
  contacted: 'bg-yellow-500/20 text-yellow-400',
  worked_with: 'bg-green-500/20 text-green-400',
};

// Inline editable field component
function EditableField({
  label,
  value,
  fieldKey,
  icon: Icon,
  type = 'text',
  placeholder,
  isEditing,
  onSave,
  multiline = false,
}: {
  label: string;
  value: string | null;
  fieldKey: string;
  icon?: typeof Phone;
  type?: string;
  placeholder?: string;
  isEditing: boolean;
  onSave: (key: string, value: string | null) => void;
  multiline?: boolean;
}) {
  const [local, setLocal] = useState(value || '');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocal(value || '');
  }, [value]);

  const debouncedSave = useCallback(
    (v: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSave(fieldKey, v.trim() || null);
      }, 1200);
    },
    [fieldKey, onSave],
  );

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!isEditing && !value) return null;

  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">{label}</p>
        {isEditing ? (
          multiline ? (
            <Textarea
              value={local}
              onChange={(e) => {
                setLocal(e.target.value);
                debouncedSave(e.target.value);
              }}
              placeholder={placeholder}
              rows={3}
              className="text-sm bg-white/5 border-white/10 text-white placeholder:text-white/20 resize-none"
            />
          ) : (
            <Input
              value={local}
              onChange={(e) => {
                setLocal(e.target.value);
                debouncedSave(e.target.value);
              }}
              placeholder={placeholder}
              type={type}
              className="h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          )
        ) : (
          <p className="text-sm text-white/80 break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

// =====================================================
// PROPS - supports both platform and org contexts
// =====================================================

interface UnifiedTalentDetailDialogProps {
  // For platform context (CreatorWithMetrics)
  creator?: CreatorWithMetrics;
  // For org context (OrgCreatorWithStats)
  orgCreator?: OrgCreatorWithStats;
  organizationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function UnifiedTalentDetailDialog({
  creator,
  orgCreator,
  organizationId,
  open,
  onOpenChange,
  onUpdate,
}: UnifiedTalentDetailDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const currentUserEmail = profile?.email || '';
  const isRoot = ROOT_EMAILS.includes(currentUserEmail);
  const isOrgContext = !!orgCreator && !!organizationId;

  // Normalize data from either source
  const creatorId = creator?.id || orgCreator?.creator_id;
  const creatorProfileId = creator?.id; // For platform, this IS the creator_profile id
  const creatorName = creator?.full_name || orgCreator?.creator_name || '';
  const creatorEmail = creator?.email || orgCreator?.creator_email || '';
  const creatorAvatar = creator?.avatar_url || orgCreator?.creator_avatar;
  const creatorUsername = creator?.username;

  // Fetch full details
  const { data: fullPlatform, isLoading: loadingPlatform } = useFullCreatorDetail(
    isOrgContext ? undefined : creatorProfileId
  );
  const { data: fullOrg, isLoading: loadingOrg } = useFullOrgCreatorDetail(
    isOrgContext ? organizationId : undefined,
    isOrgContext ? creatorId : undefined
  );

  const full = isOrgContext ? fullOrg : fullPlatform;
  const fullLoading = isOrgContext ? loadingOrg : loadingPlatform;

  // userId: use creator.user_id directly (for platform) or creatorId (for org), fallback to full data
  const userId = creator?.user_id || creatorId || full?.user_id || full?.id;
  const { data: userDetail } = useFullUserDetail(userId);
  const updateProfileFields = useUpdateUserProfileFields();

  // Org-specific hooks
  const updateRelationship = useUpdateCreatorRelationship(organizationId || '');
  const toggleFavorite = useToggleFavoriteCreator(organizationId || '');
  const blockCreator = useBlockCreator(organizationId || '');
  const { data: fieldDefs = [] } = useCrmCustomFieldDefs(organizationId || '', 'org_creator');
  const updateCustomFields = useUpdateOrgCreatorCustomFields(organizationId || '');

  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadCreatorAvatar();
  const updateCreatorProfile = useUpdateCreatorProfileFields();

  // Platform access state
  const [platformAccessUnlocked, setPlatformAccessUnlocked] = useState<boolean | undefined>(undefined);
  const [isBanned, setIsBanned] = useState(false);
  const [isPlatformAdminUser, setIsPlatformAdminUser] = useState(false);
  const [hasProfile, setHasProfile] = useState(true);

  // Org relationship state
  const [tags, setTags] = useState<string[]>(orgCreator?.internal_tags || []);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState(orgCreator?.internal_notes || '');
  const customFieldsRef = useRef<Record<string, unknown>>(fullOrg?.custom_fields || {});
  if (fullOrg?.custom_fields) customFieldsRef.current = { ...customFieldsRef.current, ...fullOrg.custom_fields };

  const isFavorite = orgCreator?.relationship_type === 'favorite';
  const isBlocked = orgCreator?.relationship_type === 'blocked';

  useEffect(() => {
    if (!userId || !open) return;
    supabase
      .from('profiles')
      .select('platform_access_unlocked, is_platform_admin')
      .eq('id', userId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setPlatformAccessUnlocked(data?.platform_access_unlocked ?? undefined);
        setIsPlatformAdminUser(data?.is_platform_admin ?? false);
        setHasProfile(!!data);
      });
  }, [userId, open]);

  useEffect(() => {
    if (userDetail) {
      setIsBanned(userDetail.is_banned ?? false);
      setIsPlatformAdminUser(userDetail.is_platform_admin ?? false);
    }
  }, [userDetail]);

  useEffect(() => {
    if (orgCreator) {
      setTags(orgCreator.internal_tags || []);
      setNotes(orgCreator.internal_notes || '');
    }
  }, [orgCreator?.id]);

  const handleActionComplete = useCallback(() => {
    if (creatorProfileId) {
      queryClient.invalidateQueries({ queryKey: ['full-creator-detail', creatorProfileId] });
    }
    if (organizationId && creatorId) {
      queryClient.invalidateQueries({ queryKey: ['full-org-creator-detail', organizationId, creatorId] });
    }
    queryClient.invalidateQueries({ queryKey: ['full-user-detail', userId] });
    onUpdate?.();
  }, [queryClient, creatorProfileId, organizationId, creatorId, userId, onUpdate]);

  const handleFieldSave = useCallback((key: string, value: string | null) => {
    if (!userId) return;
    updateProfileFields.mutate(
      { userId, data: { [key]: value } },
      {
        onSuccess: () => {
          toast.success('Campo actualizado');
          handleActionComplete();
        },
        onError: (err: any) => toast.error(`Error: ${err.message}`),
      }
    );
  }, [userId, updateProfileFields, handleActionComplete]);

  // Creator profile field save (for marketplace-specific fields)
  const handleCreatorFieldSave = useCallback((key: string, value: unknown) => {
    if (!creatorProfileId) return;
    updateCreatorProfile.mutate(
      { creatorProfileId, data: { [key]: value } },
      {
        onSuccess: () => {
          toast.success('Campo de marketplace actualizado');
          handleActionComplete();
        },
        onError: (err: any) => toast.error(`Error: ${err.message}`),
      }
    );
  }, [creatorProfileId, updateCreatorProfile, handleActionComplete]);

  // Avatar upload handler
  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    uploadAvatar.mutate(
      { userId, file },
      { onSuccess: handleActionComplete }
    );
    // Reset input
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }, [userId, uploadAvatar, handleActionComplete]);

  // Org relationship handlers
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const saveNotes = useCallback(
    (value: string) => {
      if (!orgCreator) return;
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      notesTimerRef.current = setTimeout(() => {
        updateRelationship.mutate(
          { id: orgCreator.id, data: { internal_notes: value } },
          { onSuccess: handleActionComplete },
        );
      }, 1500);
    },
    [orgCreator?.id, updateRelationship, handleActionComplete],
  );

  const handleNotesChange = (value: string) => {
    setNotes(value);
    saveNotes(value);
  };

  const addTag = () => {
    if (!orgCreator) return;
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput('');
      updateRelationship.mutate(
        { id: orgCreator.id, data: { internal_tags: newTags } },
        { onSuccess: handleActionComplete },
      );
    }
  };

  const removeTag = (tag: string) => {
    if (!orgCreator) return;
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    updateRelationship.mutate(
      { id: orgCreator.id, data: { internal_tags: newTags } },
      { onSuccess: handleActionComplete },
    );
  };

  const handleToggleFavorite = () => {
    if (!creatorId) return;
    toggleFavorite.mutate(
      { creatorId, isFavorite },
      { onSuccess: handleActionComplete },
    );
  };

  const handleBlock = () => {
    if (!creatorId || isBlocked) return;
    if (!confirm('¿Bloquear este talento? No aparecerá en búsquedas.')) return;
    blockCreator.mutate(
      { creatorId },
      { onSuccess: handleActionComplete },
    );
  };

  const handleCustomFieldChange = useCallback((key: string, value: unknown) => {
    if (!orgCreator) return;
    const updated = { ...customFieldsRef.current, [key]: value };
    customFieldsRef.current = updated;
    updateCustomFields.mutate({ relationshipId: orgCreator.id, fields: updated });
  }, [orgCreator?.id, updateCustomFields]);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get stats from either source
  const ratingAvg = creator?.rating_avg ?? full?.rating_avg ?? 0;
  const ratingCount = creator?.rating_count ?? full?.rating_count ?? 0;
  const completedProjects = creator?.completed_projects ?? full?.completed_projects ?? 0;
  const totalEarned = creator?.total_earned ?? full?.total_earned ?? 0;
  const basePrice = creator?.base_price ?? full?.base_price;
  const level = creator?.level ?? full?.level ?? 'starter';
  const isVerified = creator?.is_verified ?? full?.is_verified ?? false;
  const isActive = creator?.is_active ?? full?.is_active ?? true;
  const isAvailable = creator?.is_available ?? full?.is_available ?? false;
  const categories = creator?.categories ?? full?.categories ?? [];
  const contentTypes = creator?.content_types ?? full?.content_types ?? [];
  const marketplaceRoles = creator?.marketplace_roles ?? full?.marketplace_roles ?? [];
  const platforms = creator?.platforms ?? full?.platforms ?? [];
  const createdAt = creator?.created_at ?? full?.created_at ?? orgCreator?.created_at;
  const currency = creator?.currency ?? full?.currency ?? 'USD';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 bg-[#0a0118] border-[#8b5cf6]/20 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0 group">
              {hasValidAvatar(creatorAvatar) ? (
                <img
                  src={creatorAvatar}
                  alt={creatorName}
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-pink-500/30"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ring-2 ring-pink-500/30"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
                >
                  {getInitials(creatorName)}
                </div>
              )}
              {isVerified && !isEditing && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              )}
              {/* Avatar upload button (edit mode) */}
              {isEditing && (
                <>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadAvatar.isPending}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploadAvatar.isPending ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold text-white truncate">
                {creatorName}
              </DialogTitle>
              <p className="text-sm text-white/50 truncate">
                {creatorUsername ? `@${creatorUsername}` : creatorEmail}
              </p>

              {/* Stats Row */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-yellow-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-semibold">
                    {ratingAvg > 0 ? ratingAvg.toFixed(1) : 'N/A'}
                  </span>
                  <span className="text-xs text-white/40">({ratingCount})</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/70">
                  <Briefcase className="h-4 w-4" />
                  <span>{completedProjects} proyectos</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400">
                  <DollarSign className="h-4 w-4" />
                  <span>{formatCurrency(totalEarned)}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 capitalize">
                  {level}
                </span>
                {isVerified && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                    Verificado
                  </span>
                )}
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'
                )}>
                  {isActive ? 'Activo' : 'Inactivo'}
                </span>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  isAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'
                )}>
                  {isAvailable ? 'Disponible' : 'No disponible'}
                </span>
                {isOrgContext && orgCreator?.relationship_type && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    RELATIONSHIP_COLORS[orgCreator.relationship_type]
                  )}>
                    {CREATOR_RELATIONSHIP_TYPE_LABELS[orgCreator.relationship_type]}
                  </span>
                )}
                {isPlatformAdminUser && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                    Admin Plataforma
                  </span>
                )}
                {isBanned && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-600/20 text-red-500">
                    Bloqueado
                  </span>
                )}
              </div>
            </div>

            {/* Edit toggle (root only) */}
            {isRoot && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  'shrink-0 gap-2',
                  isEditing
                    ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                )}
              >
                {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {isEditing ? 'Listo' : 'Editar'}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b border-white/10">
            <TabsList className="bg-transparent h-12 p-0 gap-0">
              <TabsTrigger
                value="general"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:text-white rounded-none px-4 text-white/60 gap-2"
              >
                <User className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger
                value="portfolio"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:text-white rounded-none px-4 text-white/60 gap-2"
              >
                <Image className="h-4 w-4" />
                Portafolio
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:text-white rounded-none px-4 text-white/60 gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Servicios
              </TabsTrigger>
              {isOrgContext && (
                <TabsTrigger
                  value="relationship"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:text-white rounded-none px-4 text-white/60 gap-2"
                >
                  <Heart className="h-4 w-4" />
                  Relación
                </TabsTrigger>
              )}
              <TabsTrigger
                value="organization"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:text-white rounded-none px-4 text-white/60 gap-2"
              >
                <Building2 className="h-4 w-4" />
                Organización
              </TabsTrigger>
              {isRoot && (
                <TabsTrigger
                  value="admin"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:text-white rounded-none px-4 text-white/60 gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              {fullLoading && (
                <div className="space-y-4">
                  <Skeleton className="h-20 rounded-lg bg-white/5" />
                  <Skeleton className="h-16 rounded-lg bg-white/5" />
                  <Skeleton className="h-24 rounded-lg bg-white/5" />
                </div>
              )}

              {/* GENERAL TAB */}
              <TabsContent value="general" className="mt-0 space-y-6">
                {/* Personal Data */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-pink-400" />
                    Datos Personales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <EditableField
                      label="Email"
                      value={creatorEmail}
                      fieldKey="email"
                      icon={Mail}
                      type="email"
                      placeholder="correo@email.com"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Teléfono"
                      value={full?.phone}
                      fieldKey="phone"
                      icon={Phone}
                      type="tel"
                      placeholder="+57 300..."
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="País"
                      value={full?.location_country ?? full?.country}
                      fieldKey="country"
                      icon={Globe}
                      placeholder="País"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Ciudad"
                      value={full?.location_city ?? full?.city}
                      fieldKey="city"
                      icon={MapPin}
                      placeholder="Ciudad"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Biografía</h3>
                  <EditableField
                    label="Tagline"
                    value={full?.tagline}
                    fieldKey="tagline"
                    placeholder="Una línea que te define..."
                    isEditing={isEditing}
                    onSave={handleFieldSave}
                  />
                  <EditableField
                    label="Bio corta"
                    value={full?.bio}
                    fieldKey="bio"
                    placeholder="Una breve descripción..."
                    isEditing={isEditing}
                    onSave={handleFieldSave}
                    multiline
                  />
                  <EditableField
                    label="Bio completa"
                    value={full?.bio_full}
                    fieldKey="bio_full"
                    placeholder="Descripción detallada..."
                    isEditing={isEditing}
                    onSave={handleFieldSave}
                    multiline
                  />
                </div>

                {/* Social Links */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-pink-400" />
                    Redes Sociales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <EditableField
                      label="Instagram"
                      value={full?.instagram}
                      fieldKey="instagram"
                      icon={Instagram}
                      placeholder="@usuario"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="TikTok"
                      value={full?.tiktok}
                      fieldKey="tiktok"
                      icon={Video}
                      placeholder="@usuario"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="YouTube"
                      value={full?.social_youtube}
                      fieldKey="social_youtube"
                      icon={Youtube}
                      placeholder="URL del canal"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="LinkedIn"
                      value={full?.social_linkedin}
                      fieldKey="social_linkedin"
                      icon={Linkedin}
                      placeholder="URL de perfil"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                  </div>
                </div>

                {/* Specialization */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Especialización</h3>
                  {categories?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-white/40 mb-2">Categorías</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="bg-pink-500/20 text-pink-300">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {contentTypes?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-white/40 mb-2">Tipos de contenido</p>
                      <div className="flex flex-wrap gap-2">
                        {contentTypes.map((t: string) => (
                          <Badge key={t} variant="secondary" className="bg-purple-500/20 text-purple-300">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {marketplaceRoles?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-2">Roles Marketplace</p>
                      <div className="flex flex-wrap gap-2">
                        {marketplaceRoles.map((role: string) => (
                          <Badge key={role} variant="secondary" className="bg-blue-500/20 text-blue-300">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Marketplace Stats */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Estadísticas Marketplace</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-yellow-400">
                        {ratingAvg > 0 ? ratingAvg.toFixed(1) : '—'}
                      </p>
                      <p className="text-xs text-white/50">Rating ({ratingCount})</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-white">
                        {completedProjects}
                      </p>
                      <p className="text-xs text-white/50">Proyectos</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(totalEarned)}
                      </p>
                      <p className="text-xs text-white/50">Total ganado</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(basePrice)}
                      </p>
                      <p className="text-xs text-white/50">Precio base</p>
                    </div>
                  </div>
                  {full && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {full.response_time_hours && (
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <Clock className="h-4 w-4 text-white/40" />
                          <span>Respuesta: {full.response_time_hours}h</span>
                        </div>
                      )}
                      {full.on_time_delivery_pct && (
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <Check className="h-4 w-4 text-green-400" />
                          <span>A tiempo: {full.on_time_delivery_pct}%</span>
                        </div>
                      )}
                      {full.repeat_clients_pct && (
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <Users className="h-4 w-4 text-white/40" />
                          <span>Recurrentes: {full.repeat_clients_pct}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Marketplace Configuration (edit mode) */}
                {isEditing && (
                  <div className="rounded-lg border border-pink-500/30 bg-pink-500/5 p-4">
                    <h3 className="text-sm font-semibold text-pink-300 mb-4 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Configuración Marketplace
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Base Price */}
                      <div className="space-y-2">
                        <label className="text-xs text-white/60">Precio Base (USD)</label>
                        <Input
                          type="number"
                          min="0"
                          defaultValue={basePrice || ''}
                          placeholder="Ej: 100"
                          className="bg-white/5 border-white/20"
                          onBlur={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            handleCreatorFieldSave('base_price', val);
                          }}
                        />
                      </div>
                      {/* Currency */}
                      <div className="space-y-2">
                        <label className="text-xs text-white/60">Moneda</label>
                        <select
                          defaultValue={full?.currency || 'USD'}
                          className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white text-sm"
                          onChange={(e) => handleCreatorFieldSave('currency', e.target.value)}
                        >
                          <option value="USD">USD - Dólar</option>
                          <option value="COP">COP - Peso Colombiano</option>
                          <option value="MXN">MXN - Peso Mexicano</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="ARS">ARS - Peso Argentino</option>
                          <option value="CLP">CLP - Peso Chileno</option>
                          <option value="PEN">PEN - Sol Peruano</option>
                        </select>
                      </div>
                      {/* Active Toggle */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div>
                          <p className="text-sm text-white">Perfil Activo</p>
                          <p className="text-xs text-white/50">Visible en el marketplace</p>
                        </div>
                        <button
                          onClick={() => handleCreatorFieldSave('is_active', !isActive)}
                          className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                            isActive ? 'bg-green-500' : 'bg-white/20'
                          )}
                        >
                          <span className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            isActive ? 'translate-x-6' : 'translate-x-1'
                          )} />
                        </button>
                      </div>
                      {/* Available Toggle */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div>
                          <p className="text-sm text-white">Disponible</p>
                          <p className="text-xs text-white/50">Aceptando nuevos proyectos</p>
                        </div>
                        <button
                          onClick={() => handleCreatorFieldSave('is_available', !isAvailable)}
                          className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                            isAvailable ? 'bg-emerald-500' : 'bg-white/20'
                          )}
                        >
                          <span className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            isAvailable ? 'translate-x-6' : 'translate-x-1'
                          )} />
                        </button>
                      </div>
                      {/* Accepts Exchange Toggle */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 md:col-span-2">
                        <div>
                          <p className="text-sm text-white">Acepta Canje de Productos</p>
                          <p className="text-xs text-white/50">Intercambio de productos por contenido</p>
                        </div>
                        <button
                          onClick={() => handleCreatorFieldSave('accepts_product_exchange', !(full?.accepts_product_exchange))}
                          className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                            full?.accepts_product_exchange ? 'bg-purple-500' : 'bg-white/20'
                          )}
                        >
                          <span className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            full?.accepts_product_exchange ? 'translate-x-6' : 'translate-x-1'
                          )} />
                        </button>
                      </div>
                      {/* Level */}
                      <div className="space-y-2">
                        <label className="text-xs text-white/60">Nivel</label>
                        <select
                          defaultValue={level || 'bronze'}
                          className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white text-sm"
                          onChange={(e) => handleCreatorFieldSave('level', e.target.value)}
                        >
                          <option value="bronze">Bronze</option>
                          <option value="silver">Silver</option>
                          <option value="gold">Gold</option>
                          <option value="elite">Elite</option>
                        </select>
                      </div>
                      {/* Verified Toggle */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div>
                          <p className="text-sm text-white">Verificado</p>
                          <p className="text-xs text-white/50">Mostrar badge de verificación</p>
                        </div>
                        <button
                          onClick={() => handleCreatorFieldSave('is_verified', !isVerified)}
                          className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                            isVerified ? 'bg-blue-500' : 'bg-white/20'
                          )}
                        >
                          <span className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            isVerified ? 'translate-x-6' : 'translate-x-1'
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* PORTFOLIO TAB */}
              <TabsContent value="portfolio" className="mt-0 space-y-6">
                {/* Quick actions */}
                {isEditing && creatorProfileId && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                    <p className="text-sm text-pink-300">
                      Gestiona el portafolio desde el perfil público del creador
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-pink-500/30 text-pink-300 hover:bg-pink-500/20"
                      onClick={() => window.open(`/marketplace/creator/${creatorProfileId}`, '_blank')}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Ver Perfil
                    </Button>
                  </div>
                )}
                {full?.portfolio && full.portfolio.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {full.portfolio.map((item: any) => (
                      <div key={item.id} className="group relative">
                        <div className="aspect-video rounded-lg bg-white/5 overflow-hidden">
                          {hasValidUrl(item.thumbnail_url) ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.title || ''}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {item.media_type === 'video' ? (
                                <Video className="h-8 w-8 text-white/20" />
                              ) : (
                                <Image className="h-8 w-8 text-white/20" />
                              )}
                            </div>
                          )}
                        </div>
                        {item.is_featured && (
                          <div className="absolute top-2 right-2 bg-amber-500/90 rounded-full p-1">
                            <Star className="h-3 w-3 text-white fill-white" />
                          </div>
                        )}
                        {item.title && (
                          <p className="text-sm text-white/70 truncate mt-2">{item.title}</p>
                        )}
                        {item.category && (
                          <Badge variant="secondary" className="mt-1 text-[10px] bg-white/10">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Image className="h-12 w-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/40">Sin elementos en el portafolio</p>
                    {isEditing && creatorProfileId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4 border-pink-500/30 text-pink-300 hover:bg-pink-500/20"
                        onClick={() => window.open(`/marketplace/creator/${creatorProfileId}`, '_blank')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar desde Perfil
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* SERVICES TAB */}
              <TabsContent value="services" className="mt-0 space-y-6">
                {/* Quick actions */}
                {isEditing && userId && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-sm text-purple-300">
                      Gestiona los servicios desde la configuración del creador
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                      onClick={() => window.open(`/settings?tab=services&user=${userId}`, '_blank')}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                  </div>
                )}
                {full?.services && full.services.length > 0 ? (
                  <div className="space-y-4">
                    {full.services.map((service: any) => (
                      <div
                        key={service.id}
                        className="rounded-lg border border-white/10 p-4 hover:border-pink-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-white truncate">{service.title}</h4>
                              {service.is_active === false && (
                                <Badge variant="secondary" className="bg-white/10 text-white/50 text-[10px]">
                                  Inactivo
                                </Badge>
                              )}
                            </div>
                            {service.description && (
                              <p className="text-sm text-white/60 mt-1 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                            {(service.category || service.service_type) && (
                              <Badge variant="secondary" className="mt-2 bg-pink-500/20 text-pink-300">
                                {service.category || service.service_type}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-green-400">
                              {formatCurrency(service.price || service.price_amount)}
                            </p>
                            {(service.delivery_time || service.delivery_days) && (
                              <p className="text-xs text-white/40">
                                {service.delivery_time || service.delivery_days} días
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/40">Sin servicios configurados</p>
                    {isEditing && userId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                        onClick={() => window.open(`/settings?tab=services&user=${userId}`, '_blank')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Servicios
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* RELATIONSHIP TAB (org only) */}
              {isOrgContext && (
                <TabsContent value="relationship" className="mt-0 space-y-6">
                  {/* Relationship controls */}
                  <div className="rounded-lg border border-white/10 p-4">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-400" />
                      Relación
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleFavorite}
                        disabled={toggleFavorite.isPending}
                        className={cn(
                          'h-8 px-3 text-xs border transition-all',
                          isFavorite
                            ? 'bg-pink-500/20 border-pink-500/30 text-pink-400 hover:bg-pink-500/30'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/30',
                        )}
                      >
                        <Heart className={cn('h-3.5 w-3.5 mr-1.5', isFavorite && 'fill-current')} />
                        {isFavorite ? 'Favorito' : 'Agregar favorito'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleBlock}
                        disabled={blockCreator.isPending || isBlocked}
                        className={cn(
                          'h-8 px-3 text-xs border transition-all',
                          isBlocked
                            ? 'bg-red-500/20 border-red-500/30 text-red-400'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30',
                        )}
                      >
                        <Ban className="h-3.5 w-3.5 mr-1.5" />
                        {isBlocked ? 'Bloqueado' : 'Bloquear'}
                      </Button>
                    </div>
                  </div>

                  {/* Collaboration Stats */}
                  {orgCreator && (
                    <div className="rounded-lg border border-white/10 p-4">
                      <h3 className="text-sm font-semibold text-white mb-4">Estadísticas de Colaboración</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <p className="text-2xl font-bold text-blue-400">{orgCreator.times_worked_together}</p>
                          <p className="text-xs text-white/50">Colaboraciones</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <p className="text-2xl font-bold text-green-400">{formatCurrency(orgCreator.total_paid)}</p>
                          <p className="text-xs text-white/50">Pagado</p>
                        </div>
                        {orgCreator.average_rating_given != null && (
                          <div className="text-center p-3 rounded-lg bg-white/5">
                            <p className="text-2xl font-bold text-amber-400">{orgCreator.average_rating_given.toFixed(1)}</p>
                            <p className="text-xs text-white/50">Rating dado</p>
                          </div>
                        )}
                        {orgCreator.last_collaboration_at && (
                          <div className="text-center p-3 rounded-lg bg-white/5">
                            <p className="text-sm font-medium text-white/70">
                              {formatDistanceToNow(new Date(orgCreator.last_collaboration_at), { addSuffix: true, locale: es })}
                            </p>
                            <p className="text-xs text-white/50">Última colaboración</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="rounded-lg border border-white/10 p-4">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-pink-400" />
                      Etiquetas
                    </h3>
                    <div className="flex items-center gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="Agregar etiqueta..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-9 flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={addTag}
                        className="h-9 w-9 bg-white/5 hover:bg-white/10 text-white/50"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => removeTag(tag)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#8b5cf6]/20 text-[#c084fc] border border-[#8b5cf6]/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
                            title="Click para eliminar"
                          >
                            {tag}
                            <X className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="rounded-lg border border-white/10 p-4">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-pink-400" />
                      Notas internas
                    </h3>
                    <Textarea
                      value={notes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Notas sobre este talento..."
                      rows={4}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                    />
                    {updateRelationship.isPending && (
                      <p className="text-xs text-white/30 mt-1">Guardando...</p>
                    )}
                  </div>

                  {/* Custom Fields */}
                  {fieldDefs.filter(d => d.is_active).length > 0 && (
                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white">Campos personalizados</h3>
                        <button
                          onClick={() => setShowFieldsConfig(true)}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                          title="Configurar campos"
                        >
                          <Settings className="h-4 w-4 text-white/40 hover:text-white/60" />
                        </button>
                      </div>
                      <CustomFieldsSection
                        customFields={customFieldsRef.current}
                        fieldDefs={fieldDefs.filter(d => d.is_active)}
                        onChange={handleCustomFieldChange}
                      />
                    </div>
                  )}
                </TabsContent>
              )}

              {/* ORGANIZATION TAB */}
              <TabsContent value="organization" className="mt-0 space-y-6">
                {/* Roles & Badges */}
                {userDetail && (
                  <div className="rounded-lg border border-white/10 p-4">
                    <RolesBadgesSection
                      roles={userDetail.roles}
                      badges={userDetail.badges}
                      ambassadorLevel={userDetail.ambassador_level}
                    />
                  </div>
                )}

                {/* Organizations */}
                {userDetail && userId && (
                  <div className="rounded-lg border border-white/10 p-4">
                    <OrganizationsListSection
                      organizations={userDetail.organizations || []}
                      userId={userId}
                      onActionComplete={handleActionComplete}
                    />
                  </div>
                )}

                {/* Companies */}
                {userDetail && userId && (
                  <div className="rounded-lg border border-white/10 p-4">
                    <CompaniesSection
                      companies={userDetail.companies || []}
                      userId={userId}
                      onActionComplete={handleActionComplete}
                    />
                  </div>
                )}

                {/* System Info */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Información del Sistema</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-white/40">Registrado</p>
                      <p className="text-white/70">
                        {createdAt && format(new Date(createdAt), 'd MMM yyyy, HH:mm', { locale: es })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Nivel</p>
                      <p className="text-white/70 capitalize">{level}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Moneda</p>
                      <p className="text-white/70">{currency}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Plataformas</p>
                      <p className="text-white/70">
                        {platforms?.join(', ') || 'No especificadas'}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ADMIN TAB */}
              {isRoot && userId && (
                <TabsContent value="admin" className="mt-0">
                  <div className="rounded-lg border border-red-500/20 p-4 bg-red-500/5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <h3 className="text-sm font-semibold text-red-400">
                        Acciones Administrativas
                      </h3>
                    </div>
                    <p className="text-xs text-white/50 mb-4">
                      Estas acciones afectan directamente al usuario. Úsalas con precaución.
                    </p>
                    <AdminActionsSection
                      userId={userId}
                      userEmail={creatorEmail}
                      userName={creatorName}
                      hasProfile={hasProfile}
                      isPlatformAdmin={isPlatformAdminUser}
                      isBanned={isBanned}
                      orgId={userDetail?.organization_id || null}
                      orgName={userDetail?.organization_name || null}
                      isOwner={userDetail?.is_owner ?? false}
                      activeRole={userDetail?.active_role || null}
                      currentUserEmail={currentUserEmail}
                      platformAccessUnlocked={platformAccessUnlocked}
                      onActionComplete={handleActionComplete}
                    />
                  </div>
                </TabsContent>
              )}
            </div>
          </ScrollArea>
        </Tabs>

        {/* Custom Fields Config Dialog (org only) */}
        {showFieldsConfig && organizationId && (
          <CrmFieldsConfigDialog
            open={showFieldsConfig}
            onOpenChange={setShowFieldsConfig}
            entityType="org_creator"
            organizationId={organizationId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
