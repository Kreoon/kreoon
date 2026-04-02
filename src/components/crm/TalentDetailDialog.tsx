import { useState, useCallback, useRef, useEffect } from 'react';
import {
  User, Briefcase, Building2, Shield, Star, Image, Video,
  Phone, Mail, MapPin, Globe, Pencil, Check, BadgeCheck,
  Instagram, Facebook, Linkedin, Twitter, Youtube, Link2,
  Loader2, AlertTriangle, DollarSign, Clock, Users,
} from 'lucide-react';
import { format } from 'date-fns';
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
import { useFullCreatorDetail, useFullUserDetail } from '@/hooks/useCrm';
import { useUpdateUserProfileFields } from '@/hooks/useCrmCustomFields';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { CreatorWithMetrics } from '@/services/crm/platformCrmService';
import { AdminActionsSection } from './detail-sections/AdminActionsSection';
import { RolesBadgesSection } from './detail-sections/RolesBadgesSection';
import { OrganizationsListSection } from './detail-sections/OrganizationsListSection';
import { CompaniesSection } from './detail-sections/CompaniesSection';

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

interface TalentDetailDialogProps {
  creator: CreatorWithMetrics;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function TalentDetailDialog({ creator, open, onOpenChange, onUpdate }: TalentDetailDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const currentUserEmail = profile?.email || '';
  const isRoot = ROOT_EMAILS.includes(currentUserEmail);

  const { data: full, isLoading: fullLoading } = useFullCreatorDetail(creator.id);
  const userId = full?.user_id || full?.id;
  const { data: userDetail } = useFullUserDetail(userId);
  const updateProfileFields = useUpdateUserProfileFields();

  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);

  // Platform access state
  const [platformAccessUnlocked, setPlatformAccessUnlocked] = useState<boolean | undefined>(undefined);
  const [isBanned, setIsBanned] = useState(false);
  const [isPlatformAdminUser, setIsPlatformAdminUser] = useState(false);
  const [hasProfile, setHasProfile] = useState(true);

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

  const handleActionComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['full-creator-detail', creator.id] });
    queryClient.invalidateQueries({ queryKey: ['full-user-detail', userId] });
    onUpdate?.();
  }, [queryClient, creator.id, userId, onUpdate]);

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

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-4xl h-[90dvh] sm:h-[90vh] p-0 bg-[#0a0118] border-[#8b5cf6]/20 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-white/10">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {hasValidAvatar(creator.avatar_url) ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.full_name}
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-pink-500/30"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ring-2 ring-pink-500/30"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
                >
                  {getInitials(creator.full_name)}
                </div>
              )}
              {creator.is_verified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold text-white truncate">
                {creator.full_name}
              </DialogTitle>
              <p className="text-sm text-white/50 truncate">
                {creator.username ? `@${creator.username}` : creator.email}
              </p>

              {/* Stats Row */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-yellow-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-semibold">
                    {creator.rating_avg > 0 ? creator.rating_avg.toFixed(1) : 'N/A'}
                  </span>
                  <span className="text-xs text-white/40">({creator.rating_count})</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/70">
                  <Briefcase className="h-4 w-4" />
                  <span>{creator.completed_projects} proyectos</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400">
                  <DollarSign className="h-4 w-4" />
                  <span>{formatCurrency(creator.total_earned)}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 capitalize">
                  {creator.level}
                </span>
                {creator.is_verified && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                    Verificado
                  </span>
                )}
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  creator.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'
                )}>
                  {creator.is_active ? 'Activo' : 'Inactivo'}
                </span>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  creator.is_available ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'
                )}>
                  {creator.is_available ? 'Disponible' : 'No disponible'}
                </span>
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
          <div className="px-4 sm:px-6 border-b border-white/10">
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
            <div className="p-4 sm:p-6">
              {fullLoading && (
                <div className="space-y-4">
                  <Skeleton className="h-20 rounded-sm bg-white/5" />
                  <Skeleton className="h-16 rounded-sm bg-white/5" />
                  <Skeleton className="h-24 rounded-sm bg-white/5" />
                </div>
              )}

              {/* GENERAL TAB */}
              <TabsContent value="general" className="mt-0 space-y-6">
                {/* Personal Data */}
                <div className="rounded-sm border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-pink-400" />
                    Datos Personales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <EditableField
                      label="Email"
                      value={creator.email}
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
                      value={full?.location_country ?? creator.location_country}
                      fieldKey="country"
                      icon={Globe}
                      placeholder="País"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Ciudad"
                      value={full?.location_city ?? creator.location_city}
                      fieldKey="city"
                      icon={MapPin}
                      placeholder="Ciudad"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="rounded-sm border border-white/10 p-4">
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
                <div className="rounded-sm border border-white/10 p-4">
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
                <div className="rounded-sm border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Especialización</h3>
                  {(full?.categories ?? creator.categories)?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-white/40 mb-2">Categorías</p>
                      <div className="flex flex-wrap gap-2">
                        {(full?.categories ?? creator.categories).map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="bg-pink-500/20 text-pink-300">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(full?.content_types ?? creator.content_types)?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-white/40 mb-2">Tipos de contenido</p>
                      <div className="flex flex-wrap gap-2">
                        {(full?.content_types ?? creator.content_types).map((t: string) => (
                          <Badge key={t} variant="secondary" className="bg-purple-500/20 text-purple-300">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(full?.marketplace_roles ?? creator.marketplace_roles)?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-2">Roles Marketplace</p>
                      <div className="flex flex-wrap gap-2">
                        {(full?.marketplace_roles ?? creator.marketplace_roles).map((role: string) => (
                          <Badge key={role} variant="secondary" className="bg-blue-500/20 text-blue-300">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Marketplace Stats */}
                <div className="rounded-sm border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Estadísticas Marketplace</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-sm bg-white/5">
                      <p className="text-2xl font-bold text-yellow-400">
                        {creator.rating_avg > 0 ? creator.rating_avg.toFixed(1) : '—'}
                      </p>
                      <p className="text-xs text-white/50">Rating ({creator.rating_count})</p>
                    </div>
                    <div className="text-center p-3 rounded-sm bg-white/5">
                      <p className="text-2xl font-bold text-white">
                        {creator.completed_projects}
                      </p>
                      <p className="text-xs text-white/50">Proyectos</p>
                    </div>
                    <div className="text-center p-3 rounded-sm bg-white/5">
                      <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(creator.total_earned)}
                      </p>
                      <p className="text-xs text-white/50">Total ganado</p>
                    </div>
                    <div className="text-center p-3 rounded-sm bg-white/5">
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(creator.base_price)}
                      </p>
                      <p className="text-xs text-white/50">Precio base</p>
                    </div>
                  </div>
                  {full && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
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
              </TabsContent>

              {/* PORTFOLIO TAB */}
              <TabsContent value="portfolio" className="mt-0 space-y-6">
                {full?.portfolio && full.portfolio.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {full.portfolio.map((item: any) => (
                      <div key={item.id} className="group relative">
                        <div className="aspect-video rounded-sm bg-white/5 overflow-hidden">
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
                  </div>
                )}
              </TabsContent>

              {/* SERVICES TAB */}
              <TabsContent value="services" className="mt-0 space-y-6">
                {full?.services && full.services.length > 0 ? (
                  <div className="space-y-4">
                    {full.services.map((service: any) => (
                      <div
                        key={service.id}
                        className="rounded-sm border border-white/10 p-4 hover:border-pink-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate">{service.title}</h4>
                            {service.description && (
                              <p className="text-sm text-white/60 mt-1 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                            {service.category && (
                              <Badge variant="secondary" className="mt-2 bg-pink-500/20 text-pink-300">
                                {service.category}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-green-400">
                              {formatCurrency(service.price)}
                            </p>
                            {service.delivery_time && (
                              <p className="text-xs text-white/40">
                                {service.delivery_time} días
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
                  </div>
                )}
              </TabsContent>

              {/* ORGANIZATION TAB */}
              <TabsContent value="organization" className="mt-0 space-y-6">
                {/* Roles & Badges */}
                {userDetail && (
                  <div className="rounded-sm border border-white/10 p-4">
                    <RolesBadgesSection
                      roles={userDetail.roles}
                      badges={userDetail.badges}
                      ambassadorLevel={userDetail.ambassador_level}
                    />
                  </div>
                )}

                {/* Organizations */}
                {userDetail && userId && (
                  <div className="rounded-sm border border-white/10 p-4">
                    <OrganizationsListSection
                      organizations={userDetail.organizations || []}
                      userId={userId}
                      onActionComplete={handleActionComplete}
                    />
                  </div>
                )}

                {/* Companies */}
                {userDetail && userId && (
                  <div className="rounded-sm border border-white/10 p-4">
                    <CompaniesSection
                      companies={userDetail.companies || []}
                      userId={userId}
                      onActionComplete={handleActionComplete}
                    />
                  </div>
                )}

                {/* System Info */}
                <div className="rounded-sm border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Información del Sistema</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-white/40">Registrado</p>
                      <p className="text-white/70">
                        {format(new Date(creator.created_at), 'd MMM yyyy, HH:mm', { locale: es })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Nivel</p>
                      <p className="text-white/70 capitalize">{creator.level}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Moneda</p>
                      <p className="text-white/70">{creator.currency}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Plataformas</p>
                      <p className="text-white/70">
                        {creator.platforms?.join(', ') || 'No especificadas'}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ADMIN TAB */}
              {isRoot && userId && (
                <TabsContent value="admin" className="mt-0">
                  <div className="rounded-sm border border-red-500/20 p-4 bg-red-500/5">
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
                      userEmail={creator.email}
                      userName={creator.full_name}
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
      </DialogContent>
    </Dialog>
  );
}
