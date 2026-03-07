import { useState, useCallback, useRef, useEffect } from 'react';
import {
  User, Briefcase, Building2, Shield, Star, Image, Video,
  Phone, Mail, MapPin, Globe, Pencil, Check, BadgeCheck,
  Instagram, Linkedin, Youtube, Link2, Camera, Trash2,
  Loader2, AlertTriangle, DollarSign, Clock, Users,
  Heart, Ban, Plus, X, Settings, Tag, FileText, Upload,
  Play, Pin, PinOff, ToggleLeft, ToggleRight, Sparkles,
  ImagePlus, VideoIcon, Maximize2, ChevronLeft, ChevronRight,
  Calendar, Activity, TrendingUp, LogIn,
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
import { usePortfolioItems, type PortfolioItemData } from '@/hooks/usePortfolioItems';
import { useCreatorServices } from '@/hooks/useCreatorServices';
import { extractBunnyIds, getBunnyThumbnailUrl, getBunnyVideoUrls } from '@/hooks/useHLSPlayer';

// Helper to get thumbnail URLs for portfolio item (primary + fallback)
function getPortfolioThumbUrls(item: PortfolioItemData): { primary: string | null; fallback: string | null } {
  const BUNNY_CDN_HOST = 'vz-78fcd769-050.b-cdn.net';

  let primary: string | null = null;
  let fallback: string | null = null;

  // For videos, generate thumbnail from bunny_video_id (most reliable)
  if (item.media_type === 'video' && item.bunny_video_id) {
    primary = `https://${BUNNY_CDN_HOST}/${item.bunny_video_id}/thumbnail.jpg`;
  }

  // Use saved thumbnail_url as fallback (may be cdn.kreoon.com or other)
  if (item.thumbnail_url && item.thumbnail_url !== primary) {
    fallback = item.thumbnail_url;
  }

  // If no primary yet, try to extract from media_url
  if (!primary && item.media_type === 'video' && item.media_url) {
    const bunnyThumb = getBunnyThumbnailUrl(item.media_url);
    if (bunnyThumb) primary = bunnyThumb;
  }

  // For images, use media_url directly
  if (item.media_type === 'image' && item.media_url) {
    primary = item.media_url;
  }

  return { primary, fallback };
}
import type { CreatorService, CreatorServiceInput, ServiceType } from '@/types/marketplace';
import type { CreatorWithMetrics, UserWithHealth } from '@/services/crm/platformCrmService';
import type { OrgCreatorWithStats, CreatorRelationshipType } from '@/types/crm.types';
import { CREATOR_RELATIONSHIP_TYPE_LABELS } from '@/types/crm.types';
import { AdminActionsSection } from './detail-sections/AdminActionsSection';
import { RolesBadgesSection } from './detail-sections/RolesBadgesSection';
import { OrganizationsListSection } from './detail-sections/OrganizationsListSection';
import { CompaniesSection } from './detail-sections/CompaniesSection';
import { CustomFieldsSection } from './detail-sections/CustomFieldsSection';
import { CrmFieldsConfigDialog } from './detail-sections/CrmFieldsConfigDialog';
import { LegalConsentsSection } from './detail-sections/LegalConsentsSection';
import { PersonalDataSection } from './detail-sections/PersonalDataSection';

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
  required = false,
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
  required?: boolean;
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

  // Mostrar campos requeridos aunque estén vacíos, ocultar opcionales vacíos
  if (!isEditing && !value && !required) return null;

  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">
          {label}
          {required && !value && <span className="text-red-400 ml-1">*</span>}
        </p>
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
          <p className={cn("text-sm break-words", value ? "text-white/80" : "text-red-400/60 italic")}>
            {value || 'No especificado'}
          </p>
        )}
      </div>
    </div>
  );
}

// Inline editable select component
function EditableSelectField({
  label,
  value,
  fieldKey,
  icon: Icon,
  placeholder,
  isEditing,
  onSave,
  options,
  required = false,
}: {
  label: string;
  value: string | null;
  fieldKey: string;
  icon?: typeof Phone;
  placeholder?: string;
  isEditing: boolean;
  onSave: (key: string, value: string | null) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  const displayValue = options.find(o => o.value === value)?.label || value;

  // Mostrar campos requeridos aunque estén vacíos, ocultar opcionales vacíos
  if (!isEditing && !value && !required) return null;

  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">
          {label}
          {required && !value && <span className="text-red-400 ml-1">*</span>}
        </p>
        {isEditing ? (
          <select
            value={value || ''}
            onChange={(e) => {
              const newValue = e.target.value || null;
              console.log('[CRM Select] onChange:', { fieldKey, newValue, previousValue: value });
              onSave(fieldKey, newValue);
            }}
            className="w-full h-8 text-sm bg-white/5 border border-white/10 text-white rounded-md px-2"
          >
            <option value="" className="bg-[#1a1a2e]">{placeholder || 'Seleccionar...'}</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[#1a1a2e]">
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <p className={cn("text-sm break-words", value ? "text-white/80" : "text-red-400/60 italic")}>
            {displayValue || 'No especificado'}
          </p>
        )}
      </div>
    </div>
  );
}

// Constantes para opciones de select
const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'cc', label: 'Cédula de Ciudadanía' },
  { value: 'ce', label: 'Cédula de Extranjería' },
  { value: 'ti', label: 'Tarjeta de Identidad' },
  { value: 'passport', label: 'Pasaporte' },
  { value: 'dni', label: 'DNI' },
  { value: 'ine', label: 'INE / IFE' },
  { value: 'curp', label: 'CURP' },
  { value: 'rut', label: 'RUT' },
  { value: 'cpf', label: 'CPF' },
  { value: 'ssn', label: 'SSN' },
  { value: 'other', label: 'Otro documento' },
];

const COUNTRY_OPTIONS = [
  { value: 'CO', label: 'Colombia' },
  { value: 'MX', label: 'México' },
  { value: 'AR', label: 'Argentina' },
  { value: 'PE', label: 'Perú' },
  { value: 'CL', label: 'Chile' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'DO', label: 'Rep. Dominicana' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'HN', label: 'Honduras' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'NI', label: 'Nicaragua' },
  { value: 'CR', label: 'Costa Rica' },
  { value: 'PA', label: 'Panamá' },
  { value: 'CU', label: 'Cuba' },
  { value: 'PR', label: 'Puerto Rico' },
  { value: 'BR', label: 'Brasil' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'ES', label: 'España' },
];

// =====================================================
// PROPS - supports both platform and org contexts
// =====================================================

interface UnifiedTalentDetailDialogProps {
  // For platform context (CreatorWithMetrics)
  creator?: CreatorWithMetrics;
  // For platform user context (UserWithHealth) - users without creator profile
  user?: UserWithHealth;
  // For org context (OrgCreatorWithStats)
  orgCreator?: OrgCreatorWithStats;
  organizationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function UnifiedTalentDetailDialog({
  creator,
  user,
  orgCreator,
  organizationId,
  open,
  onOpenChange,
  onUpdate,
}: UnifiedTalentDetailDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const currentUserEmail = profile?.email || '';
  // Root access: either in ROOT_EMAILS list or is_platform_admin
  const isRoot = ROOT_EMAILS.includes(currentUserEmail) || profile?.is_platform_admin === true;
  const isOrgContext = !!orgCreator && !!organizationId;
  const isUserContext = !!user && !creator && !orgCreator;

  // Normalize data from either source (creator, user, or orgCreator)
  const creatorId = creator?.id || orgCreator?.creator_id;
  const displayName = creator?.full_name || user?.full_name || orgCreator?.creator_name || '';
  const displayEmail = creator?.email || user?.email || orgCreator?.creator_email || '';
  const displayAvatar = creator?.avatar_url || user?.avatar_url || orgCreator?.creator_avatar;
  const creatorUsername = creator?.username;

  // Fetch full details (skip for user-only context)
  const { data: fullPlatform, isLoading: loadingPlatform } = useFullCreatorDetail(
    isOrgContext || isUserContext ? undefined : creator?.id
  );
  const { data: fullOrg, isLoading: loadingOrg } = useFullOrgCreatorDetail(
    isOrgContext ? organizationId : undefined,
    isOrgContext ? creatorId : undefined
  );

  const fullBase = isOrgContext ? fullOrg : (isUserContext ? null : fullPlatform);

  // userId: use creator.user_id (for platform creator), user.id (for user), or creatorId (for org), fallback to full data
  const userId = creator?.user_id || user?.id || creatorId || fullBase?.user_id || fullBase?.id;
  const { data: userDetail, isLoading: loadingUserDetail } = useFullUserDetail(userId);

  // Combinar datos: SIEMPRE priorizar userDetail para campos de perfil personal,
  // y fullBase para campos de marketplace/organización
  const full = userDetail && fullBase
    ? { ...fullBase, ...userDetail } // userDetail sobrescribe campos de perfil
    : (userDetail || fullBase);
  const fullLoading = isOrgContext ? loadingOrg : (loadingUserDetail || loadingPlatform);
  const updateProfileFields = useUpdateUserProfileFields();

  // creatorProfileId: for platform use creator.id, for org use fullOrg.creator_profile_id, for user use userDetail
  const creatorProfileId = creator?.id || (fullOrg as any)?.creator_profile_id || userDetail?.creator_profile_id;

  // Org-specific hooks
  const updateRelationship = useUpdateCreatorRelationship(organizationId || '');
  const toggleFavorite = useToggleFavoriteCreator(organizationId || '');
  const blockCreator = useBlockCreator(organizationId || '');
  const { data: fieldDefs = [] } = useCrmCustomFieldDefs(organizationId || '', 'org_creator');
  const updateCustomFields = useUpdateOrgCreatorCustomFields(organizationId || '');

  // Portfolio and Services hooks for inline CRUD (use creatorProfileId once available)
  const portfolioHook = usePortfolioItems({ creatorProfileId: creatorProfileId || undefined });
  const servicesHook = useCreatorServices({ userId });

  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);

  // Portfolio CRUD state
  const portfolioVideoRef = useRef<HTMLInputElement>(null);
  const portfolioImageRef = useRef<HTMLInputElement>(null);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [portfolioFilter, setPortfolioFilter] = useState<'all' | 'video' | 'image'>('all');
  // Track thumbnail failures: 0 = try primary, 1 = try fallback, 2 = show placeholder
  const [thumbAttempts, setThumbAttempts] = useState<Map<string, number>>(new Map());

  // Services CRUD state
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<CreatorService | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [serviceFormData, setServiceFormData] = useState<Partial<CreatorServiceInput>>({
    service_type: 'ugc_video',
    title: '',
    description: '',
    price_amount: undefined,
    price_currency: 'USD',
    delivery_days: 7,
    is_active: true,
  });

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
    if (!userId) {
      console.error('[CRM] handleFieldSave: No userId');
      return;
    }
    console.log('[CRM] handleFieldSave:', { key, value, userId });
    updateProfileFields.mutate(
      { userId, data: { [key]: value } },
      {
        onSuccess: () => {
          console.log('[CRM] Field saved successfully:', key);
          toast.success('Campo actualizado');
          handleActionComplete();
        },
        onError: (err: any) => {
          console.error('[CRM] Field save error:', key, err);
          toast.error(`Error: ${err.message}`);
        },
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

  // =====================================================
  // PORTFOLIO CRUD HANDLERS
  // =====================================================

  const handlePortfolioVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !creatorProfileId) return;
    await portfolioHook.uploadVideo(file, creatorProfileId, { title: file.name.replace(/\.[^.]+$/, '') });
    handleActionComplete();
    if (portfolioVideoRef.current) portfolioVideoRef.current.value = '';
  }, [creatorProfileId, portfolioHook, handleActionComplete]);

  const handlePortfolioImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !creatorProfileId) return;
    await portfolioHook.uploadImage(file, creatorProfileId, { title: file.name.replace(/\.[^.]+$/, '') });
    handleActionComplete();
    if (portfolioImageRef.current) portfolioImageRef.current.value = '';
  }, [creatorProfileId, portfolioHook, handleActionComplete]);

  const handleDeletePortfolioItem = useCallback(async (itemId: string) => {
    if (!confirm('¿Eliminar este contenido del portafolio?')) return;
    setDeletingPortfolioId(itemId);
    await portfolioHook.deleteItem(itemId);
    setDeletingPortfolioId(null);
    handleActionComplete();
  }, [portfolioHook, handleActionComplete]);

  const handleTogglePortfolioPin = useCallback(async (itemId: string) => {
    await portfolioHook.togglePin(itemId);
    handleActionComplete();
  }, [portfolioHook, handleActionComplete]);

  // =====================================================
  // SERVICES CRUD HANDLERS
  // =====================================================

  const resetServiceForm = useCallback(() => {
    setServiceFormData({
      service_type: 'ugc_video',
      title: '',
      description: '',
      price_amount: undefined,
      price_currency: 'USD',
      delivery_days: 7,
      is_active: true,
    });
    setEditingService(null);
    setShowServiceForm(false);
  }, []);

  const handleEditService = useCallback((service: CreatorService) => {
    setEditingService(service);
    setServiceFormData({
      service_type: service.service_type,
      title: service.title,
      description: service.description || '',
      price_amount: service.price_amount || undefined,
      price_currency: service.price_currency || 'USD',
      delivery_days: service.delivery_days || 7,
      is_active: service.is_active,
    });
    setShowServiceForm(true);
  }, []);

  const handleSaveService = useCallback(async () => {
    if (!serviceFormData.title?.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    try {
      if (editingService) {
        await servicesHook.updateService({ id: editingService.id, ...serviceFormData });
      } else {
        await servicesHook.createService(serviceFormData as CreatorServiceInput);
      }
      resetServiceForm();
      handleActionComplete();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  }, [serviceFormData, editingService, servicesHook, resetServiceForm, handleActionComplete]);

  const handleDeleteService = useCallback(async (serviceId: string) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    setDeletingServiceId(serviceId);
    try {
      await servicesHook.deleteService(serviceId);
      handleActionComplete();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
    setDeletingServiceId(null);
  }, [servicesHook, handleActionComplete]);

  const handleToggleServiceActive = useCallback(async (serviceId: string, isActive: boolean) => {
    await servicesHook.toggleActive(serviceId, !isActive);
    handleActionComplete();
  }, [servicesHook, handleActionComplete]);

  const handleToggleServiceFeatured = useCallback(async (serviceId: string, isFeatured: boolean) => {
    await servicesHook.toggleFeatured(serviceId, !isFeatured);
    handleActionComplete();
  }, [servicesHook, handleActionComplete]);

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
              {hasValidAvatar(displayAvatar) ? (
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-pink-500/30"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ring-2 ring-pink-500/30"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
                >
                  {getInitials(displayName)}
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
                {displayName}
              </DialogTitle>
              <p className="text-sm text-white/50 truncate">
                {creatorUsername ? `@${creatorUsername}` : displayEmail}
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
              <TabsTrigger
                value="legal"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:text-white rounded-none px-4 text-white/60 gap-2"
              >
                <FileText className="h-4 w-4" />
                Legal
              </TabsTrigger>
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
                      label="Nombre completo"
                      value={full?.full_name}
                      fieldKey="full_name"
                      icon={User}
                      placeholder="Nombre completo"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Username"
                      value={full?.username ? `@${full.username}` : null}
                      fieldKey="username"
                      icon={User}
                      placeholder="@usuario"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Email"
                      value={displayEmail}
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
                      label="Fecha de nacimiento"
                      value={full?.date_of_birth ? format(new Date(full.date_of_birth), 'd MMM yyyy', { locale: es }) : null}
                      fieldKey="date_of_birth"
                      icon={Calendar}
                      placeholder="Fecha de nacimiento"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                      required
                    />
                    <EditableSelectField
                      label="Sexo"
                      value={full?.gender}
                      fieldKey="gender"
                      icon={User}
                      placeholder="Selecciona sexo"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                      options={GENDER_OPTIONS}
                      required
                    />
                  </div>
                </div>

                {/* Location & Identity */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-400" />
                    Ubicación e Identidad
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <EditableSelectField
                      label="País"
                      value={full?.location_country ?? full?.country}
                      fieldKey="country"
                      icon={Globe}
                      placeholder="Selecciona país"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                      options={COUNTRY_OPTIONS}
                      required
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
                    <EditableField
                      label="Dirección"
                      value={full?.address}
                      fieldKey="address"
                      icon={MapPin}
                      placeholder="Dirección completa"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                      required
                    />
                    <EditableSelectField
                      label="Nacionalidad"
                      value={full?.nationality}
                      fieldKey="nationality"
                      icon={Globe}
                      placeholder="Selecciona nacionalidad"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                      options={COUNTRY_OPTIONS}
                      required
                    />
                    <EditableSelectField
                      label="Tipo de documento"
                      value={full?.document_type}
                      fieldKey="document_type"
                      icon={FileText}
                      placeholder="Selecciona tipo"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                      options={DOCUMENT_TYPE_OPTIONS}
                      required
                    />
                    <EditableField
                      label="Número de documento"
                      value={full?.document_number}
                      fieldKey="document_number"
                      icon={FileText}
                      placeholder="Número de documento"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                      required
                    />
                  </div>
                </div>

                {/* Social Networks */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-400" />
                    Redes Sociales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <EditableField
                      label="Instagram"
                      value={full?.instagram ? `@${full.instagram}` : null}
                      fieldKey="instagram"
                      icon={Instagram}
                      placeholder="@usuario"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="TikTok"
                      value={full?.tiktok ? `@${full.tiktok}` : null}
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
                      placeholder="youtube.com/@canal"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="LinkedIn"
                      value={full?.social_linkedin}
                      fieldKey="social_linkedin"
                      icon={Linkedin}
                      placeholder="linkedin.com/in/usuario"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Facebook"
                      value={full?.social_facebook}
                      fieldKey="social_facebook"
                      icon={Globe}
                      placeholder="facebook.com/usuario"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="X (Twitter)"
                      value={full?.social_twitter ? `@${full.social_twitter}` : null}
                      fieldKey="social_twitter"
                      icon={Globe}
                      placeholder="@usuario"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                  </div>
                </div>

                {/* Activity & Metrics */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-400" />
                    Actividad y Métricas
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Fecha de registro */}
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                        <Calendar className="h-3 w-3" />
                        Registro
                      </div>
                      <p className="text-white font-medium text-sm">
                        {userDetail?.created_at
                          ? format(new Date(userDetail.created_at), 'd MMM yyyy', { locale: es })
                          : '—'}
                      </p>
                    </div>

                    {/* Último ingreso */}
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                        <LogIn className="h-3 w-3" />
                        Último ingreso
                      </div>
                      <p className={cn(
                        'font-medium text-sm',
                        userDetail?.last_login_at
                          ? (userDetail.days_since_last_activity ?? 0) > 14 ? 'text-red-400' : 'text-white'
                          : 'text-white/40'
                      )}>
                        {userDetail?.last_login_at
                          ? formatDistanceToNow(new Date(userDetail.last_login_at), { addSuffix: true, locale: es })
                          : 'Nunca'}
                      </p>
                    </div>

                    {/* Días inactivo */}
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                        <Clock className="h-3 w-3" />
                        Días inactivo
                      </div>
                      <p className={cn(
                        'font-medium text-sm',
                        (userDetail?.days_since_last_activity ?? 0) > 14 ? 'text-red-400' :
                        (userDetail?.days_since_last_activity ?? 0) > 7 ? 'text-yellow-400' : 'text-white'
                      )}>
                        {userDetail?.days_since_last_activity ?? '—'}
                      </p>
                    </div>

                    {/* Total logins */}
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                        <TrendingUp className="h-3 w-3" />
                        Total ingresos
                      </div>
                      <p className="text-white font-medium text-sm">
                        {userDetail?.total_logins ?? 0}
                      </p>
                    </div>
                  </div>

                  {/* Health Status Row */}
                  {userDetail && (
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 text-xs">Estado de salud:</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          userDetail.health_status === 'healthy' ? 'bg-green-500/20 text-green-400' :
                          userDetail.health_status === 'at_risk' ? 'bg-yellow-500/20 text-yellow-400' :
                          userDetail.health_status === 'churned' ? 'bg-red-500/20 text-red-400' :
                          'bg-white/10 text-white/50'
                        )}>
                          {userDetail.health_status === 'healthy' ? 'Saludable' :
                           userDetail.health_status === 'at_risk' ? 'En riesgo' :
                           userDetail.health_status === 'churned' ? 'Inactivo' :
                           userDetail.health_status || 'Desconocido'}
                        </span>
                      </div>
                      {userDetail.needs_attention && (
                        <span className="flex items-center gap-1 text-amber-400 text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          Requiere atención
                        </span>
                      )}
                      {userDetail.health_score != null && (
                        <span className="text-white/40 text-xs">
                          Score: {userDetail.health_score}/100
                        </span>
                      )}
                    </div>
                  )}
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

                {/* Organization Stats */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-400" />
                    Estadísticas Organizaciones
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-blue-400">
                        {full?.organizations?.length || 0}
                      </p>
                      <p className="text-xs text-white/50">Organizaciones</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-purple-400">
                        {full?.roles?.length || 0}
                      </p>
                      <p className="text-xs text-white/50">Roles</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-yellow-400">
                        {full?.badges?.length || 0}
                      </p>
                      <p className="text-xs text-white/50">Badges</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-green-400">
                        {full?.companies?.length || 0}
                      </p>
                      <p className="text-xs text-white/50">Empresas</p>
                    </div>
                  </div>
                  {full?.organizations && full.organizations.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-white/40 uppercase tracking-wide">Miembro de:</p>
                      <div className="flex flex-wrap gap-2">
                        {full.organizations.map((org: any) => (
                          <Badge
                            key={org.organization_id}
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              org.is_owner
                                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                                : "bg-blue-500/20 text-blue-300"
                            )}
                          >
                            {org.is_owner && <Star className="h-3 w-3 mr-1" />}
                            {org.organization_name}
                            {org.role && <span className="ml-1 opacity-60">({org.role})</span>}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {full?.badges && full.badges.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-white/40 uppercase tracking-wide">Badges:</p>
                      <div className="flex flex-wrap gap-2">
                        {full.badges.map((badge: any, idx: number) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              badge.level === 'gold' && "bg-yellow-500/20 text-yellow-300",
                              badge.level === 'silver' && "bg-gray-400/20 text-gray-300",
                              badge.level === 'bronze' && "bg-orange-500/20 text-orange-300",
                              !badge.level && "bg-purple-500/20 text-purple-300"
                            )}
                          >
                            {badge.badge} {badge.level && `(${badge.level})`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Stats */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    Estadísticas Financieras
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(full?.total_earned || totalEarned || 0)}
                      </p>
                      <p className="text-xs text-white/50">Total ganado</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-red-400">
                        {formatCurrency(full?.total_spent || 0)}
                      </p>
                      <p className="text-xs text-white/50">Total gastado</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-blue-400">
                        {full?.total_applications || 0}
                      </p>
                      <p className="text-xs text-white/50">Aplicaciones</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-purple-400">
                        {full?.total_completed_projects || completedProjects || 0}
                      </p>
                      <p className="text-xs text-white/50">Proyectos completados</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                      <TrendingUp className={cn("h-4 w-4", (full?.net_balance || 0) >= 0 ? "text-green-400" : "text-red-400")} />
                      <div>
                        <p className={cn("text-sm font-medium", (full?.net_balance || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                          {formatCurrency(full?.net_balance || 0)}
                        </p>
                        <p className="text-xs text-white/50">Balance neto</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                      <Activity className="h-4 w-4 text-yellow-400" />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {full?.conversion_rate
                            ? `${Math.round(full.conversion_rate)}%`
                            : '—'
                          }
                        </p>
                        <p className="text-xs text-white/50">Tasa conversión</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                      <DollarSign className="h-4 w-4 text-purple-400" />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {full?.avg_per_project
                            ? formatCurrency(full.avg_per_project)
                            : '—'
                          }
                        </p>
                        <p className="text-xs text-white/50">Promedio por proyecto</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Marketplace Configuration (edit mode) */}
                {isEditing && (
                  <div className="rounded-lg border border-pink-500/30 bg-pink-500/5 p-4">
                    <h3 className="text-sm font-semibold text-pink-300 mb-4 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Configuración Marketplace
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* PORTFOLIO TAB - VERTICAL FORMAT WITH PREVIEW */}
              <TabsContent value="portfolio" className="mt-0 space-y-4">
                {/* Header with filters and upload */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Filter tabs */}
                  <div className="flex gap-2">
                    {(['all', 'video', 'image'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setPortfolioFilter(filter)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs transition-colors',
                          portfolioFilter === filter
                            ? 'bg-white text-black font-semibold'
                            : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                        )}
                      >
                        {filter === 'all' ? 'Todo' : filter === 'video' ? 'Videos' : 'Fotos'}
                        <span className="ml-1 text-[10px] opacity-60">
                          ({filter === 'all'
                            ? portfolioHook.items.length
                            : portfolioHook.items.filter(i => i.media_type === filter).length})
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Upload buttons (edit mode) */}
                  {isEditing && creatorProfileId && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-pink-500/30 text-pink-300 hover:bg-pink-500/20 h-8"
                        onClick={() => portfolioImageRef.current?.click()}
                        disabled={portfolioHook.adding}
                      >
                        {portfolioHook.adding ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Imagen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20 h-8"
                        onClick={() => portfolioVideoRef.current?.click()}
                        disabled={portfolioHook.adding}
                      >
                        {portfolioHook.adding ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <VideoIcon className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Video
                      </Button>
                      <input
                        ref={portfolioImageRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePortfolioImageUpload}
                        className="hidden"
                      />
                      <input
                        ref={portfolioVideoRef}
                        type="file"
                        accept="video/*"
                        onChange={handlePortfolioVideoUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Portfolio grid - vertical masonry style */}
                {portfolioHook.loading ? (
                  <div className="columns-2 md:columns-3 gap-3 space-y-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton
                        key={i}
                        className={cn(
                          'w-full rounded-xl bg-white/5 break-inside-avoid',
                          i % 3 === 0 ? 'aspect-[9/16]' : 'aspect-[3/4]'
                        )}
                      />
                    ))}
                  </div>
                ) : (() => {
                  const filteredItems = portfolioFilter === 'all'
                    ? portfolioHook.items
                    : portfolioHook.items.filter(i => i.media_type === portfolioFilter);

                  if (filteredItems.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <Image className="h-12 w-12 text-white/10 mx-auto mb-3" />
                        <p className="text-white/40">
                          {portfolioFilter === 'all'
                            ? 'Sin elementos en el portafolio'
                            : `Sin ${portfolioFilter === 'video' ? 'videos' : 'fotos'} en el portafolio`}
                        </p>
                        {isEditing && creatorProfileId && portfolioFilter === 'all' && (
                          <div className="flex justify-center gap-3 mt-4">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-pink-500/30 text-pink-300 hover:bg-pink-500/20"
                              onClick={() => portfolioImageRef.current?.click()}
                            >
                              <ImagePlus className="h-4 w-4 mr-2" />
                              Subir Imagen
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                              onClick={() => portfolioVideoRef.current?.click()}
                            >
                              <VideoIcon className="h-4 w-4 mr-2" />
                              Subir Video
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Masonry grid - vertical format */}
                      <div className="columns-2 md:columns-3 gap-3 space-y-3">
                        {filteredItems.map((item, index) => {
                          const isLarge = index % 6 === 0 || index % 6 === 3;
                          const { primary, fallback } = getPortfolioThumbUrls(item);
                          const attempts = thumbAttempts.get(item.id) || 0;
                          // Select URL based on attempts: 0 = primary, 1 = fallback, 2+ = none
                          const thumbUrl = attempts === 0 ? primary : attempts === 1 ? fallback : null;

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                'relative group rounded-xl overflow-hidden cursor-pointer break-inside-avoid',
                                isLarge ? 'aspect-[9/16]' : 'aspect-[3/4]'
                              )}
                              onClick={() => !isEditing && setPreviewIndex(index)}
                            >
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={item.title || ''}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  onError={() => setThumbAttempts(prev => {
                                    const next = new Map(prev);
                                    next.set(item.id, (prev.get(item.id) || 0) + 1);
                                    return next;
                                  })}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-b from-purple-900/40 to-black/60 flex items-center justify-center">
                                  {item.media_type === 'video' ? (
                                    <div className="flex flex-col items-center gap-2">
                                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                        <Play className="h-6 w-6 text-white/60 fill-white/60" />
                                      </div>
                                      <span className="text-[10px] text-white/40">Video</span>
                                    </div>
                                  ) : (
                                    <Image className="h-8 w-8 text-white/30" />
                                  )}
                                </div>
                              )}

                              {/* Hover overlay for preview */}
                              {!isEditing && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                  <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}

                              {/* Video badge */}
                              {item.media_type === 'video' && (
                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                                  <Play className="h-3 w-3 fill-white" />
                                  Video
                                </div>
                              )}

                              {/* Featured badge */}
                              {item.is_featured && (
                                <div className="absolute top-2 left-2 bg-amber-500/90 rounded-full p-1.5">
                                  <Star className="h-3 w-3 text-white fill-white" />
                                </div>
                              )}

                              {/* Edit mode overlay */}
                              {isEditing && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setPreviewIndex(index); }}
                                    className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                                    title="Ver"
                                  >
                                    <Maximize2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleTogglePortfolioPin(item.id); }}
                                    className={cn(
                                      'p-2 rounded-full transition-colors',
                                      item.is_featured ? 'bg-amber-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                                    )}
                                    title={item.is_featured ? 'Quitar destacado' : 'Destacar'}
                                  >
                                    {item.is_featured ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeletePortfolioItem(item.id); }}
                                    disabled={deletingPortfolioId === item.id}
                                    className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-600 transition-colors"
                                    title="Eliminar"
                                  >
                                    {deletingPortfolioId === item.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              )}

                              {/* Title overlay - hide if title looks like a UUID */}
                              {item.title && !/^[a-f0-9-]{36}$/i.test(item.title) && (
                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                  <p className="text-xs text-white truncate">{item.title}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Inline Lightbox Preview */}
                      {previewIndex !== null && (
                        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
                          {/* Close button */}
                          <button
                            onClick={() => setPreviewIndex(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                          >
                            <X className="h-6 w-6 text-white" />
                          </button>

                          {/* Navigation arrows */}
                          {previewIndex > 0 && (
                            <button
                              onClick={() => setPreviewIndex(previewIndex - 1)}
                              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                            >
                              <ChevronLeft className="h-6 w-6 text-white" />
                            </button>
                          )}
                          {previewIndex < filteredItems.length - 1 && (
                            <button
                              onClick={() => setPreviewIndex(previewIndex + 1)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                            >
                              <ChevronRight className="h-6 w-6 text-white" />
                            </button>
                          )}

                          {/* Content */}
                          <div className="max-w-md max-h-[85vh] w-full mx-4">
                            {(() => {
                              const item = filteredItems[previewIndex];
                              if (!item) return null;

                              if (item.media_type === 'video') {
                                // Extract video ID and library ID from media_url or bunny_video_id
                                const extracted = extractBunnyIds(item.media_url);
                                const videoId = item.bunny_video_id || extracted?.videoId;
                                // Use library ID from URL if available, fallback to default
                                const libraryId = extracted?.libraryId || '292927';

                                if (videoId) {
                                  return (
                                    <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-black">
                                      <iframe
                                        src={`https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true&muted=false&preload=true&responsive=true&loop=true`}
                                        className="absolute inset-0 w-full h-full"
                                        allow="autoplay; fullscreen"
                                        allowFullScreen
                                      />
                                    </div>
                                  );
                                }
                                // Fallback to native video player
                                return (
                                  <video
                                    src={item.media_url}
                                    controls
                                    autoPlay
                                    className="w-full max-h-[85vh] rounded-xl"
                                  />
                                );
                              }

                              // Image preview
                              return (
                                <img
                                  src={item.media_url}
                                  alt={item.title || ''}
                                  className="w-full max-h-[85vh] object-contain rounded-xl"
                                />
                              );
                            })()}

                            {/* Info bar */}
                            <div className="mt-3 flex items-center justify-between">
                              <div>
                                {filteredItems[previewIndex]?.title &&
                                 !/^[a-f0-9-]{36}$/i.test(filteredItems[previewIndex].title) && (
                                  <p className="text-white font-medium">{filteredItems[previewIndex].title}</p>
                                )}
                                {filteredItems[previewIndex]?.category && (
                                  <Badge variant="secondary" className="mt-1 text-[10px] bg-white/10">
                                    {filteredItems[previewIndex].category}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-white/40 text-sm">
                                {previewIndex + 1} / {filteredItems.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </TabsContent>

              {/* SERVICES TAB - INLINE CRUD */}
              <TabsContent value="services" className="mt-0 space-y-6">
                {/* Add service button (edit mode) */}
                {isEditing && userId && !showServiceForm && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-sm text-purple-300">
                      {servicesHook.services.length} servicio(s) configurado(s)
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                      onClick={() => {
                        resetServiceForm();
                        setShowServiceForm(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Servicio
                    </Button>
                  </div>
                )}

                {/* Service form (create/edit) */}
                {showServiceForm && (
                  <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-purple-300">
                        {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
                      </h4>
                      <button
                        onClick={resetServiceForm}
                        className="text-white/40 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-white/60">Tipo de Servicio</label>
                        <select
                          value={serviceFormData.service_type || 'ugc_video'}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, service_type: e.target.value as ServiceType }))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white text-sm"
                        >
                          <option value="ugc_video">UGC Video</option>
                          <option value="reels_tiktok">Reels/TikTok</option>
                          <option value="review">Review</option>
                          <option value="unboxing">Unboxing</option>
                          <option value="testimonial">Testimonial</option>
                          <option value="tutorial">Tutorial</option>
                          <option value="vsl">VSL</option>
                          <option value="photography">Fotografía</option>
                          <option value="live_streaming">Live Streaming</option>
                          <option value="consulting">Consultoría</option>
                          <option value="other">Otro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-white/60">Título *</label>
                        <Input
                          value={serviceFormData.title || ''}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Ej: Video UGC para redes"
                          className="bg-white/5 border-white/20"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs text-white/60">Descripción</label>
                        <Textarea
                          value={serviceFormData.description || ''}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe qué incluye este servicio..."
                          rows={2}
                          className="bg-white/5 border-white/20 resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-white/60">Precio (USD)</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={serviceFormData.price_amount || ''}
                            onChange={(e) => setServiceFormData(prev => ({ ...prev, price_amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                            placeholder="100"
                            className="bg-white/5 border-white/20 flex-1"
                          />
                          <span className="px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white/60 text-sm flex items-center">
                            USD
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-white/60">Días de entrega</label>
                        <Input
                          type="number"
                          min="1"
                          value={serviceFormData.delivery_days || ''}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, delivery_days: e.target.value ? parseInt(e.target.value) : undefined }))}
                          placeholder="7"
                          className="bg-white/5 border-white/20"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={serviceFormData.is_active !== false}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="rounded border-white/20 bg-white/5"
                        />
                        <span className="text-sm text-white/70">Activo</span>
                      </label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={resetServiceForm}
                          className="border-white/20 text-white/70"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveService}
                          disabled={servicesHook.isCreating || servicesHook.isUpdating}
                          className="bg-purple-500 hover:bg-purple-600 text-white"
                        >
                          {(servicesHook.isCreating || servicesHook.isUpdating) ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          {editingService ? 'Guardar' : 'Crear'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Services list */}
                {servicesHook.isLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-24 rounded-lg bg-white/5" />
                    ))}
                  </div>
                ) : servicesHook.services.length > 0 ? (
                  <div className="space-y-4">
                    {servicesHook.services.map((service) => (
                      <div
                        key={service.id}
                        className={cn(
                          'rounded-lg border p-4 transition-colors',
                          service.is_active
                            ? 'border-white/10 hover:border-purple-500/30'
                            : 'border-white/5 bg-white/5 opacity-60'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-white truncate">{service.title}</h4>
                              {!service.is_active && (
                                <Badge variant="secondary" className="bg-white/10 text-white/50 text-[10px]">
                                  Inactivo
                                </Badge>
                              )}
                              {service.is_featured && (
                                <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 text-[10px]">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Destacado
                                </Badge>
                              )}
                            </div>
                            {service.description && (
                              <p className="text-sm text-white/60 mt-1 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                            <Badge variant="secondary" className="mt-2 bg-purple-500/20 text-purple-300">
                              {service.service_type}
                            </Badge>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-2">
                            <p className="text-lg font-bold text-green-400">
                              {formatCurrency(service.price_amount)}
                            </p>
                            {service.delivery_days && (
                              <p className="text-xs text-white/40">
                                {service.delivery_days} días
                              </p>
                            )}
                            {/* Edit mode actions */}
                            {isEditing && (
                              <div className="flex items-center gap-1 mt-2">
                                <button
                                  onClick={() => handleToggleServiceActive(service.id, service.is_active)}
                                  className={cn(
                                    'p-1.5 rounded transition-colors',
                                    service.is_active ? 'text-green-400 hover:bg-green-500/20' : 'text-white/40 hover:bg-white/10'
                                  )}
                                  title={service.is_active ? 'Desactivar' : 'Activar'}
                                >
                                  {service.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => handleToggleServiceFeatured(service.id, service.is_featured)}
                                  className={cn(
                                    'p-1.5 rounded transition-colors',
                                    service.is_featured ? 'text-amber-400 hover:bg-amber-500/20' : 'text-white/40 hover:bg-white/10'
                                  )}
                                  title={service.is_featured ? 'Quitar destacado' : 'Destacar'}
                                >
                                  <Sparkles className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleEditService(service)}
                                  className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteService(service.id)}
                                  disabled={deletingServiceId === service.id}
                                  className="p-1.5 rounded text-red-400 hover:bg-red-500/20 transition-colors"
                                  title="Eliminar"
                                >
                                  {deletingServiceId === service.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
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
                        onClick={() => {
                          resetServiceForm();
                          setShowServiceForm(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Primer Servicio
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
                      <p className="text-white/70">USD</p>
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
                      userEmail={displayEmail}
                      userName={displayName}
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

              {/* LEGAL TAB */}
              <TabsContent value="legal" className="mt-0 space-y-6">
                {/* Datos Personales Completos */}
                <PersonalDataSection
                  phone={full?.phone ?? null}
                  email={displayEmail}
                  documentType={full?.document_type ?? null}
                  documentNumber={full?.document_number ?? null}
                  address={full?.address ?? null}
                  city={full?.location_city ?? full?.city ?? null}
                  country={full?.location_country ?? full?.country ?? null}
                  nationality={full?.nationality ?? null}
                  dateOfBirth={full?.date_of_birth ?? null}
                  username={full?.username ?? null}
                />

                {/* Consentimientos Legales */}
                <LegalConsentsSection
                  userId={userId}
                  onboardingCompleted={userDetail?.onboarding_completed ?? full?.onboarding_completed ?? false}
                />
              </TabsContent>
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
