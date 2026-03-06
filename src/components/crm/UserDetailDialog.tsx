import { useState, useCallback, useRef, useEffect } from 'react';
import {
  User, Briefcase, Building2, Shield, Settings,
  Phone, Mail, MapPin, Globe, FileText, Pencil, Check,
  Instagram, Video, Facebook, Linkedin, Twitter, Youtube, Link2,
  Loader2, X, AlertTriangle, BadgeCheck, Calendar, Flag, AtSign, Home,
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
import { useFullUserDetail } from '@/hooks/useCrm';
import { useUpdateUserProfileFields } from '@/hooks/useCrmCustomFields';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { UserWithHealth } from '@/services/crm/platformCrmService';
import { HEALTH_STATUS_LABELS, HEALTH_STATUS_COLORS } from '@/types/crm.types';
import type { HealthStatus } from '@/types/crm.types';
import { AdminActionsSection } from './detail-sections/AdminActionsSection';
import { RolesBadgesSection } from './detail-sections/RolesBadgesSection';
import { OrganizationsListSection } from './detail-sections/OrganizationsListSection';
import { CompaniesSection } from './detail-sections/CompaniesSection';
import { LegalConsentsSection } from './detail-sections/LegalConsentsSection';

const ROOT_EMAILS = ['jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com'];

const hasValidAvatar = (url: string | null | undefined): url is string => {
  return !!(url && url.trim().length > 0);
};

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getHealthColor(score: number) {
  if (score >= 70) return { bg: 'bg-green-500/20', text: 'text-green-400', bar: 'bg-green-500' };
  if (score >= 40) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', bar: 'bg-yellow-500' };
  return { bg: 'bg-red-500/20', text: 'text-red-400', bar: 'bg-red-500' };
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

interface UserDetailDialogProps {
  user: UserWithHealth;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function UserDetailDialog({ user, open, onOpenChange, onUpdate }: UserDetailDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const currentUserEmail = profile?.email || '';
  const isRoot = ROOT_EMAILS.includes(currentUserEmail);

  const { data: full, isLoading: fullLoading } = useFullUserDetail(user.id);
  const updateProfileFields = useUpdateUserProfileFields();

  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);

  // Platform access state
  const [platformAccessUnlocked, setPlatformAccessUnlocked] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (open) {
      supabase
        .from('profiles')
        .select('platform_access_unlocked')
        .eq('id', user.id)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          setPlatformAccessUnlocked(data?.platform_access_unlocked ?? undefined);
        });
    }
  }, [user.id, open]);

  const handleActionComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['full-user-detail', user.id] });
    onUpdate?.();
  }, [queryClient, user.id, onUpdate]);

  const handleFieldSave = useCallback((key: string, value: string | null) => {
    updateProfileFields.mutate(
      { userId: user.id, data: { [key]: value } },
      {
        onSuccess: () => {
          toast.success('Campo actualizado');
          handleActionComplete();
        },
        onError: (err: any) => toast.error(`Error: ${err.message}`),
      }
    );
  }, [user.id, updateProfileFields, handleActionComplete]);

  const healthColor = getHealthColor(user.health_score);
  const healthStatus = (user.health_status || 'healthy') as HealthStatus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] p-0 bg-[#0a0118] border-[#8b5cf6]/20 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {hasValidAvatar(user.avatar_url) ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || ''}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-purple-500/30"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ring-2 ring-purple-500/30"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                >
                  {getInitials(user.full_name)}
                </div>
              )}
              {user.is_platform_admin && (
                <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold text-white truncate">
                {user.full_name || 'Sin nombre'}
              </DialogTitle>
              <p className="text-sm text-white/50 truncate">{user.email}</p>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', HEALTH_STATUS_COLORS[healthStatus])}>
                  {HEALTH_STATUS_LABELS[healthStatus]}
                </span>
                <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', healthColor.bg, healthColor.text)}>
                  <span>Health: {user.health_score}</span>
                </div>
                {user.is_platform_admin && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                    Admin Plataforma
                  </span>
                )}
                {user.is_banned && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-600/20 text-red-500">
                    Bloqueado
                  </span>
                )}
                {full?.onboarding_completed === false && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">
                    Sin onboarding
                  </span>
                )}
                {full?.onboarding_completed === true && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                    Onboarding ✓
                  </span>
                )}
                {user.organization_name && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                    {user.organization_name}
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
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-white rounded-none px-4 text-white/60 gap-2"
              >
                <User className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger
                value="professional"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-white rounded-none px-4 text-white/60 gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Profesional
              </TabsTrigger>
              <TabsTrigger
                value="organization"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-white rounded-none px-4 text-white/60 gap-2"
              >
                <Building2 className="h-4 w-4" />
                Organización
              </TabsTrigger>
              {isRoot && (
                <TabsTrigger
                  value="admin"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-white rounded-none px-4 text-white/60 gap-2"
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
                    <User className="h-4 w-4 text-purple-400" />
                    Datos Personales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <EditableField
                      label="Nombre completo"
                      value={full?.full_name || user.full_name}
                      fieldKey="full_name"
                      icon={User}
                      placeholder="Nombre completo"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Usuario"
                      value={full?.username ? `@${full.username}` : null}
                      fieldKey="username"
                      icon={AtSign}
                      placeholder="@usuario"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Email"
                      value={user.email}
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
                      value={full?.date_of_birth ? (() => {
                        const d = new Date(full.date_of_birth);
                        const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                        return `${format(d, 'd MMM yyyy', { locale: es })} (${age} años)`;
                      })() : null}
                      fieldKey="date_of_birth"
                      icon={Calendar}
                      placeholder="Fecha de nacimiento"
                      isEditing={false}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Nacionalidad"
                      value={full?.nationality}
                      fieldKey="nationality"
                      icon={Flag}
                      placeholder="Nacionalidad"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Documento"
                      value={full?.document_number ? `${full.document_type || ''} ${full.document_number}`.trim() : null}
                      fieldKey="document_number"
                      icon={FileText}
                      placeholder="Número de documento"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Dirección"
                      value={full?.address}
                      fieldKey="address"
                      icon={Home}
                      placeholder="Dirección"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="Ciudad"
                      value={full?.city}
                      fieldKey="city"
                      icon={MapPin}
                      placeholder="Ciudad"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                    <EditableField
                      label="País"
                      value={full?.country}
                      fieldKey="country"
                      icon={Globe}
                      placeholder="País"
                      isEditing={isEditing}
                      onSave={handleFieldSave}
                    />
                  </div>
                </div>

                {/* Social Links */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-purple-400" />
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
                      label="Facebook"
                      value={full?.facebook}
                      fieldKey="facebook"
                      icon={Facebook}
                      placeholder="URL o usuario"
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
                    <EditableField
                      label="Twitter/X"
                      value={full?.social_twitter}
                      fieldKey="social_twitter"
                      icon={Twitter}
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
                  </div>
                </div>

                {/* Activity Stats */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-purple-400" />
                    Actividad
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-white">{user.total_logins}</p>
                      <p className="text-xs text-white/50">Logins totales</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-white">{user.total_actions}</p>
                      <p className="text-xs text-white/50">Acciones</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-white">
                        {user.days_since_last_activity ?? '—'}
                      </p>
                      <p className="text-xs text-white/50">Días inactivo</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-sm font-medium text-white">
                        {user.last_login_at
                          ? format(new Date(user.last_login_at), 'd MMM yyyy', { locale: es })
                          : 'Nunca'}
                      </p>
                      <p className="text-xs text-white/50">Último login</p>
                    </div>
                  </div>
                </div>

                {/* Legal Consents */}
                <div className="rounded-lg border border-white/10 p-4">
                  <LegalConsentsSection
                    userId={user.id}
                    onboardingCompleted={full?.onboarding_completed}
                  />
                </div>
              </TabsContent>

              {/* PROFESSIONAL TAB */}
              <TabsContent value="professional" className="mt-0 space-y-6">
                {/* Bio */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Biografía</h3>
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

                {/* Categories & Roles */}
                {(full?.categories?.length || full?.marketplace_roles?.length) && (
                  <div className="rounded-lg border border-white/10 p-4">
                    <h3 className="text-sm font-semibold text-white mb-4">Especialización</h3>
                    {full?.categories?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-white/40 mb-2">Categorías</p>
                        <div className="flex flex-wrap gap-2">
                          {full.categories.map((cat: string) => (
                            <Badge key={cat} variant="secondary" className="bg-purple-500/20 text-purple-300">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {full?.marketplace_roles?.length > 0 && (
                      <div>
                        <p className="text-xs text-white/40 mb-2">Roles Marketplace</p>
                        <div className="flex flex-wrap gap-2">
                          {full.marketplace_roles.map((role: string) => (
                            <Badge key={role} variant="secondary" className="bg-blue-500/20 text-blue-300">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Creator Profile Stats */}
                {full?.creator_profile_id && (
                  <div className="rounded-lg border border-white/10 p-4">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-blue-400" />
                      Perfil de Creador
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-xl font-bold text-yellow-400">
                          {full.rating_avg?.toFixed(1) || '—'}
                        </p>
                        <p className="text-xs text-white/50">Rating</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-xl font-bold text-white">
                          {full.completed_projects ?? 0}
                        </p>
                        <p className="text-xs text-white/50">Proyectos</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-xl font-bold text-green-400">
                          ${full.total_earned?.toLocaleString() ?? 0}
                        </p>
                        <p className="text-xs text-white/50">Ganado</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-sm font-medium text-white capitalize">
                          {full.level || 'Starter'}
                        </p>
                        <p className="text-xs text-white/50">Nivel</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      {full.is_verified && (
                        <span className="flex items-center gap-1.5 text-xs text-blue-400">
                          <BadgeCheck className="h-4 w-4" />
                          Verificado
                        </span>
                      )}
                      {full.is_available && (
                        <span className="flex items-center gap-1.5 text-xs text-green-400">
                          <Check className="h-4 w-4" />
                          Disponible
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Información del Sistema</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-white/40">Registrado</p>
                      <p className="text-white/70">
                        {format(new Date(user.created_at), 'd MMM yyyy, HH:mm', { locale: es })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Tipo de usuario</p>
                      <p className="text-white/70 capitalize">{user.user_type || 'No definido'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Email confirmado</p>
                      <p className="text-white/70">
                        {user.email_confirmed_at
                          ? format(new Date(user.email_confirmed_at), 'd MMM yyyy', { locale: es })
                          : 'No confirmado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Acceso plataforma</p>
                      <p className={user.platform_access_unlocked ? 'text-green-400' : 'text-red-400'}>
                        {user.platform_access_unlocked ? 'Desbloqueado' : 'Bloqueado'}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ORGANIZATION TAB */}
              <TabsContent value="organization" className="mt-0 space-y-6">
                {/* Roles & Badges */}
                {full && (
                  <div className="rounded-lg border border-white/10 p-4">
                    <RolesBadgesSection
                      roles={full.roles}
                      badges={full.badges}
                      ambassadorLevel={full.ambassador_level}
                    />
                  </div>
                )}

                {/* Organizations */}
                {full && (
                  <div className="rounded-lg border border-white/10 p-4">
                    <OrganizationsListSection
                      organizations={full.organizations || []}
                      userId={user.id}
                      onActionComplete={handleActionComplete}
                    />
                  </div>
                )}

                {/* Companies */}
                {full && (
                  <div className="rounded-lg border border-white/10 p-4">
                    <CompaniesSection
                      companies={full.companies || []}
                      userId={user.id}
                      onActionComplete={handleActionComplete}
                    />
                  </div>
                )}
              </TabsContent>

              {/* ADMIN TAB */}
              {isRoot && (
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
                      userId={user.id}
                      userEmail={user.email}
                      userName={user.full_name}
                      hasProfile={user.has_profile}
                      isPlatformAdmin={user.is_platform_admin}
                      isBanned={user.is_banned}
                      orgId={full?.organization_id || null}
                      orgName={full?.organization_name || user.organization_name || null}
                      isOwner={full?.is_owner ?? false}
                      activeRole={full?.active_role || user.role || null}
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
