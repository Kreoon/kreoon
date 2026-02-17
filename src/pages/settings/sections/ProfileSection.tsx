import { useState, useEffect, useRef, useMemo } from 'react';
import {
  User, Globe, Briefcase, FolderOpen, Star, Calendar, Save,
  Loader2, Camera, ImageIcon, X, Palette, CheckCircle2, Circle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getRoleArea, type RoleArea, ROLE_AREA_LABELS } from '@/lib/permissionGroups';
import {
  CreatorExpertiseTab,
  CreatorServicesTab,
  CreatorAvailabilityTab,
  CreatorPricingTab,
  BrandSettingsTabs,
  EXPERIENCE_LEVELS,
} from '@/components/settings/MarketplaceSettings';
import { PortfolioTab } from '@/components/settings/PortfolioTab';
import { ProfileCustomizationTab } from '@/components/settings/ProfileCustomizationTab';

const COUNTRIES = [
  { code: 'CO', name: 'Colombia', flag: '\u{1F1E8}\u{1F1F4}' },
  { code: 'MX', name: 'México', flag: '\u{1F1F2}\u{1F1FD}' },
  { code: 'CL', name: 'Chile', flag: '\u{1F1E8}\u{1F1F1}' },
  { code: 'PE', name: 'Perú', flag: '\u{1F1F5}\u{1F1EA}' },
  { code: 'AR', name: 'Argentina', flag: '\u{1F1E6}\u{1F1F7}' },
  { code: 'EC', name: 'Ecuador', flag: '\u{1F1EA}\u{1F1E8}' },
  { code: 'US', name: 'Estados Unidos', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'ES', name: 'España', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'BR', name: 'Brasil', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'CR', name: 'Costa Rica', flag: '\u{1F1E8}\u{1F1F7}' },
  { code: 'PA', name: 'Panamá', flag: '\u{1F1F5}\u{1F1E6}' },
  { code: 'DO', name: 'Rep. Dominicana', flag: '\u{1F1E9}\u{1F1F4}' },
];

// ─── Main Section ────────────────────────────────────────────────────────────

export default function ProfileSection() {
  const { activeRole } = useAuth();
  const roleArea = getRoleArea(activeRole);
  const isBrand = roleArea === 'client';

  const { profile: userProfile, loading: profileLoading } = useProfile();
  const { exists, createProfile, loading: cpLoading } = useCreatorProfile();
  const [creatingProfile, setCreatingProfile] = useState(false);

  // Auto-create creator_profile if not exists (for non-brand users)
  useEffect(() => {
    if (userProfile && !exists && !cpLoading && !creatingProfile && !isBrand) {
      setCreatingProfile(true);
      createProfile().finally(() => setCreatingProfile(false));
    }
  }, [userProfile, exists, cpLoading, createProfile, creatingProfile, isBrand]);

  if (profileLoading || cpLoading || creatingProfile) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Clients: personal + social tabs, then brand-specific tabs below
  if (isBrand) {
    return (
      <div className="space-y-8">
        <CreatorUnifiedProfile roleArea="client" />
        <BrandSettingsTabs />
      </div>
    );
  }

  return <CreatorUnifiedProfile roleArea={roleArea} />;
}

// ─── Role-Area-Based Tabs ────────────────────────────────────────────────────
// Tab visibility is driven by RoleArea (7 areas), NOT PermissionGroup (6 groups).
// This preserves the distinction between Technology, Education, and Content Creation
// which PermissionGroup merges into 'creator'.

interface TabDef {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  component: React.ComponentType;
  /** Which role areas can see this tab */
  visibleTo: RoleArea[];
}

/** Every area except 'client' */
const ALL_NON_CLIENT: RoleArea[] = ['system', 'content_creation', 'post_production', 'strategy_marketing', 'technology', 'education'];
/** Every area */
const ALL_AREAS: RoleArea[] = [...ALL_NON_CLIENT, 'client'];

const ALL_TABS: TabDef[] = [
  {
    value: 'personal', icon: User, label: 'Personal',
    component: PersonalInfoTab,
    visibleTo: ALL_AREAS,
  },
  {
    value: 'public', icon: Globe, label: 'Perfil Público',
    component: PublicProfileTab,
    visibleTo: ALL_NON_CLIENT,
  },
  {
    value: 'social', icon: Globe, label: 'Redes',
    component: SocialLinksTab,
    visibleTo: ALL_AREAS,
  },
  {
    value: 'expertise', icon: Briefcase, label: 'Especialización',
    component: CreatorExpertiseTab,
    visibleTo: ALL_NON_CLIENT,
  },
  {
    value: 'portfolio', icon: FolderOpen, label: 'Portafolio',
    component: PortfolioTab,
    visibleTo: ALL_NON_CLIENT,
  },
  {
    value: 'services', icon: Star, label: 'Servicios',
    component: CreatorServicesTab,
    visibleTo: ALL_NON_CLIENT,
  },
  {
    value: 'availability', icon: Calendar, label: 'Disponibilidad',
    component: AvailabilityAndPricingTab,
    visibleTo: ALL_NON_CLIENT,
  },
  {
    value: 'customization', icon: Palette, label: 'Personalización',
    component: ProfileCustomizationTab,
    visibleTo: ALL_NON_CLIENT,
  },
];

// ─── Profile Completion Card ─────────────────────────────────────────────────

function ProfileCompletionCard() {
  const { profile: userProfile } = useProfile();
  const { profile: creatorProfile } = useCreatorProfile();

  const checks = useMemo(() => {
    if (!userProfile) return [];
    return [
      { label: 'Nombre completo', done: !!userProfile.full_name, required: true },
      { label: 'Foto de perfil', done: !!userProfile.avatar_url, required: true },
      { label: 'Bio / Tagline', done: !!(creatorProfile?.bio), required: false },
      { label: 'Al menos 1 rol', done: (creatorProfile?.marketplace_roles?.length || 0) > 0, required: false },
      { label: 'Categorías', done: (creatorProfile?.categories?.length || 0) > 0, required: false },
      { label: 'Portafolio', done: false, required: false }, // Would need portfolio count
      { label: 'Al menos 1 servicio', done: false, required: false }, // Would need services count
    ];
  }, [userProfile, creatorProfile]);

  const doneCount = checks.filter(c => c.done).length;
  const pct = Math.round((doneCount / checks.length) * 100);

  if (pct === 100) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Completitud del perfil</p>
          <span className="text-xs font-semibold text-primary">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2 mb-3" />
        <div className="grid grid-cols-2 gap-1">
          {checks.map(check => (
            <div key={check.label} className="flex items-center gap-1.5 text-xs">
              {check.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={check.done ? 'text-muted-foreground line-through' : ''}>
                {check.label}{check.required ? ' *' : ''}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Creator Unified Profile ─────────────────────────────────────────────────

function CreatorUnifiedProfile({ roleArea }: { roleArea: RoleArea }) {
  const [activeTab, setActiveTab] = useState('personal');
  const showCompletion = roleArea !== 'client';

  const visibleTabs = useMemo(
    () => ALL_TABS.filter(tab => tab.visibleTo.includes(roleArea)),
    [roleArea]
  );

  // Reset to first visible tab if current is not visible
  useEffect(() => {
    if (!visibleTabs.some(t => t.value === activeTab)) {
      setActiveTab(visibleTabs[0]?.value || 'personal');
    }
  }, [visibleTabs, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 p-6 border border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <User className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Mi Perfil</h2>
            <p className="text-muted-foreground">
              {ROLE_AREA_LABELS[roleArea]} — Personaliza tu perfil, portafolio y servicios
            </p>
          </div>
        </div>
      </div>

      {/* Completion indicator for creators/editors */}
      {showCompletion && <ProfileCompletionCard />}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full h-auto p-1 overflow-x-auto">
          {visibleTabs.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2 py-2.5 px-3 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            <tab.component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── Tab 1: Personal Info ────────────────────────────────────────────────────

function PersonalInfoTab() {
  const { profile, loading, saving, updateField, save } = useProfile();

  if (loading || !profile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Personal</CardTitle>
        <CardDescription>Datos privados de tu cuenta. No se muestran públicamente excepto el nombre.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              value={profile.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" value={profile.email} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={profile.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+57 300 000 0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">Tipo de documento</Label>
            <Input
              id="document_type"
              value={profile.document_type}
              onChange={(e) => updateField('document_type', e.target.value)}
              placeholder="CC, CE, NIT..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_number">Número de documento</Label>
            <Input
              id="document_number"
              value={profile.document_number}
              onChange={(e) => updateField('document_number', e.target.value)}
              placeholder="123456789"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={profile.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Tu dirección"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={save} disabled={saving} className="min-w-[120px]">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Guardar</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tab 2: Public Profile ───────────────────────────────────────────────────

function PublicProfileTab() {
  const {
    profile: userProfile, loading: profileLoading, saving: profileSaving,
    usernameError, checkingUsername, updateField: updateProfileField, save: saveProfile, uploadAvatar,
  } = useProfile();

  const {
    profile: creatorProfile, loading: cpLoading, saving: cpSaving,
    updateField: updateCreatorField, updateFields: updateCreatorFields, save: saveCreator,
  } = useCreatorProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [tagline, setTagline] = useState('');
  const [bioExtended, setBioExtended] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(true);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Sync from DB
  useEffect(() => {
    if (creatorProfile) {
      setTagline(creatorProfile.bio || '');
      setBioExtended(creatorProfile.bio_full || '');
      setMarketplaceEnabled(creatorProfile.is_active);
      setBannerUrl(creatorProfile.banner_url || null);
    }
  }, [creatorProfile]);

  // Sync experience level from profiles table
  useEffect(() => {
    if (userProfile?.experience_level) {
      const level = EXPERIENCE_LEVELS.find(l => l.value === userProfile.experience_level);
      if (level) setYearsExperience(level.years);
    }
  }, [userProfile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const newAvatarUrl = await uploadAvatar(file);
    if (creatorProfile && newAvatarUrl) {
      // Update local state
      updateCreatorField('avatar_url', newAvatarUrl);
      // Also persist to creator_profiles DB immediately (don't wait for "Guardar")
      await (supabase as any)
        .from('creator_profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', creatorProfile.id);
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5MB');
      return;
    }
    setUploadingBanner(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const userId = userProfile?.id || creatorProfile?.user_id || 'unknown';
      const storagePath = `marketplace/banners/${userId}/${uniqueSuffix}.${ext}`;

      // Get Bunny Storage upload credentials
      const { data: creds, error: credsError } = await supabase.functions.invoke('bunny-raw-upload', {
        body: { storagePath },
      });
      if (credsError || !creds?.success) {
        throw new Error(credsError?.message || creds?.error || 'Error al obtener credenciales');
      }

      // Upload directly to Bunny Storage
      const uploadResponse = await fetch(creds.uploadUrl, {
        method: 'PUT',
        headers: { 'AccessKey': creds.accessKey, 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.statusText}`);

      setBannerUrl(creds.cdnUrl);
      updateCreatorField('banner_url', creds.cdnUrl);
      toast.success('Banner actualizado');
    } catch (err) {
      console.error('[PublicProfileTab] Banner upload error:', err);
      toast.error('Error al subir el banner');
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleRemoveBanner = () => {
    setBannerUrl(null);
    updateCreatorField('banner_url', null);
  };

  const handleSave = async () => {
    // Save to profiles
    await saveProfile();

    // Save to creator_profiles
    if (creatorProfile) {
      updateCreatorFields({
        bio: tagline,
        bio_full: bioExtended,
        is_active: marketplaceEnabled,
        banner_url: bannerUrl,
        display_name: userProfile?.full_name || creatorProfile.display_name,
        avatar_url: creatorProfile.avatar_url || userProfile?.avatar_url,
        location_city: userProfile?.city || creatorProfile.location_city,
        location_country: userProfile?.country || creatorProfile.location_country,
      });
      setTimeout(() => saveCreator(), 50);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  if (profileLoading || cpLoading || !userProfile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const saving = profileSaving || cpSaving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil Público</CardTitle>
        <CardDescription>Información visible para marcas y otros creadores en el marketplace</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Marketplace enabled */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div>
            <p className="font-medium">Visible en el Marketplace</p>
            <p className="text-sm text-muted-foreground">Aparecerás en las búsquedas de marcas</p>
          </div>
          <Switch checked={marketplaceEnabled} onCheckedChange={setMarketplaceEnabled} />
        </div>

        {/* Banner */}
        <div className="space-y-2">
          <Label>Banner de perfil</Label>
          <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border bg-muted group">
            {bannerUrl ? (
              <>
                <img
                  src={bannerUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                  >
                    {uploadingBanner ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Camera className="h-4 w-4 mr-1" />}
                    Cambiar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveBanner}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Quitar
                  </Button>
                </div>
              </>
            ) : (
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                {uploadingBanner ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <ImageIcon className="h-8 w-8" />
                )}
                <span className="text-sm font-medium">
                  {uploadingBanner ? 'Subiendo...' : 'Subir banner (1500x500 recomendado)'}
                </span>
              </button>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              className="hidden"
            />
          </div>
          <p className="text-xs text-muted-foreground">Se mostrará en la parte superior de tu perfil público. Max 5MB.</p>
        </div>

        {/* Avatar + username */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-border">
              <AvatarImage src={userProfile.avatar_url} alt={userProfile.full_name} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(userProfile.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="username"
                  value={userProfile.username}
                  onChange={(e) => updateProfileField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="tu_username"
                  className={cn(
                    'pl-7',
                    usernameError ? 'border-destructive' : userProfile.username && !checkingUsername ? 'border-green-500' : ''
                  )}
                  maxLength={30}
                />
                {checkingUsername && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
              {!usernameError && userProfile.username && !checkingUsername && (
                <p className="text-xs text-green-500">Username disponible</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={userProfile.city}
                  onChange={(e) => updateProfileField('city', e.target.value)}
                  placeholder="Tu ciudad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Select value={userProfile.country} onValueChange={(v) => updateProfileField('country', v)}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Selecciona tu país" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <Label>Tu tagline profesional</Label>
          <Input
            placeholder="Ej: Creador de contenido lifestyle | Especialista en reels"
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground text-right">{tagline.length}/100</p>
        </div>

        {/* Bio extended */}
        <div className="space-y-2">
          <Label>Biografía extendida</Label>
          <Textarea
            placeholder="Cuéntanos tu historia, experiencia y qué te hace único como creador..."
            value={bioExtended}
            onChange={e => setBioExtended(e.target.value)}
            className="min-h-[150px]"
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">{bioExtended.length}/1000</p>
        </div>

        {/* Experience level */}
        <div className="space-y-3">
          <Label>Nivel de experiencia</Label>
          <div className="grid grid-cols-2 gap-3">
            {EXPERIENCE_LEVELS.map(level => {
              const isSelected =
                (yearsExperience >= 1 && yearsExperience < 2 && level.value === 'beginner') ||
                (yearsExperience >= 2 && yearsExperience < 4 && level.value === 'intermediate') ||
                (yearsExperience >= 4 && yearsExperience < 6 && level.value === 'advanced') ||
                (yearsExperience >= 6 && level.value === 'expert');

              return (
                <button
                  key={level.value}
                  onClick={() => {
                    setYearsExperience(level.years);
                    updateProfileField('experience_level', level.value);
                  }}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/50',
                  )}
                >
                  <p className="font-medium text-sm">{level.label}</p>
                  <p className="text-xs text-muted-foreground">{level.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Guardar Perfil</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tab 3: Social Links ─────────────────────────────────────────────────────

function SocialLinksTab() {
  const { activeRole } = useAuth();
  const isClient = getRoleArea(activeRole) === 'client';
  const {
    profile, loading, saving, updateField, save,
  } = useProfile();

  const {
    profile: creatorProfile, loading: cpLoading, saving: cpSaving,
    updateField: updateCreatorField, save: saveCreator,
  } = useCreatorProfile();

  const handleSave = async () => {
    // Save to profiles table
    await save();

    // Sync to creator_profiles.social_links (skip for clients)
    if (!isClient && creatorProfile && profile) {
      const socialLinks: Record<string, string> = {};
      if (profile.instagram) socialLinks.instagram = profile.instagram;
      if (profile.tiktok) socialLinks.tiktok = profile.tiktok;
      if (profile.facebook) socialLinks.facebook = profile.facebook;
      if (profile.social_linkedin) socialLinks.linkedin = profile.social_linkedin;
      if (profile.social_youtube) socialLinks.youtube = profile.social_youtube;
      if (profile.social_twitter) socialLinks.twitter = profile.social_twitter;
      if (profile.portfolio_url) socialLinks.portfolio = profile.portfolio_url;

      updateCreatorField('social_links', socialLinks);
      setTimeout(() => saveCreator(), 50);
    }
  };

  if (loading || cpLoading || !profile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isSaving = saving || cpSaving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redes Sociales</CardTitle>
        <CardDescription>Conecta tus redes sociales y portfolio para que las marcas te encuentren</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={profile.instagram}
              onChange={(e) => updateField('instagram', e.target.value)}
              placeholder="@usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktok">TikTok</Label>
            <Input
              id="tiktok"
              value={profile.tiktok}
              onChange={(e) => updateField('tiktok', e.target.value)}
              placeholder="@usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              value={profile.facebook}
              onChange={(e) => updateField('facebook', e.target.value)}
              placeholder="facebook.com/usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="social_linkedin">LinkedIn</Label>
            <Input
              id="social_linkedin"
              value={profile.social_linkedin}
              onChange={(e) => updateField('social_linkedin', e.target.value)}
              placeholder="linkedin.com/in/usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="social_youtube">YouTube</Label>
            <Input
              id="social_youtube"
              value={profile.social_youtube}
              onChange={(e) => updateField('social_youtube', e.target.value)}
              placeholder="youtube.com/@usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="social_twitter">X (Twitter)</Label>
            <Input
              id="social_twitter"
              value={profile.social_twitter}
              onChange={(e) => updateField('social_twitter', e.target.value)}
              placeholder="@usuario"
            />
          </div>
        </div>

        {/* Portfolio URL */}
        <div className="space-y-2">
          <Label htmlFor="portfolio_url">URL de Portafolio</Label>
          <Input
            id="portfolio_url"
            value={profile.portfolio_url}
            onChange={(e) => updateField('portfolio_url', e.target.value)}
            placeholder="https://mi-portfolio.com"
          />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Guardar Redes</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tab 7: Availability and Pricing (merged) ───────────────────────────────

function AvailabilityAndPricingTab() {
  const { profile, loading, saving, updateFields, save, exists, createProfile } = useCreatorProfile();

  const [availableForHire, setAvailableForHire] = useState(true);
  const [responseTimeHours, setResponseTimeHours] = useState('24');
  const [basePrice, setBasePrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [acceptsExchange, setAcceptsExchange] = useState(false);
  const [exchangeConditions, setExchangeConditions] = useState('');

  useEffect(() => {
    if (profile) {
      setAvailableForHire(profile.is_available);
      setResponseTimeHours(String(profile.response_time_hours));
      setBasePrice(profile.base_price != null ? String(profile.base_price) : '');
      setCurrency(profile.currency || 'USD');
      setAcceptsExchange(profile.accepts_product_exchange);
      setExchangeConditions(profile.exchange_conditions || '');
    }
  }, [profile]);

  const handleSave = async () => {
    const data = {
      is_available: availableForHire,
      response_time_hours: parseInt(responseTimeHours),
      base_price: basePrice ? parseFloat(basePrice) : null,
      currency,
      accepts_product_exchange: acceptsExchange,
      exchange_conditions: acceptsExchange ? exchangeConditions : null,
    };
    if (!exists) {
      await createProfile(data);
      return;
    }
    updateFields(data);
    setTimeout(() => save(), 50);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Disponibilidad</CardTitle>
          <CardDescription>Indica cuándo estás disponible para nuevos proyectos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <p className="font-medium">Disponible para contratación</p>
              <p className="text-sm text-muted-foreground">Aparecerás como disponible en el marketplace</p>
            </div>
            <Switch checked={availableForHire} onCheckedChange={setAvailableForHire} />
          </div>

          <div className="space-y-2">
            <Label>Tiempo de respuesta típico</Label>
            <Select value={responseTimeHours} onValueChange={setResponseTimeHours}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Menos de 1 hora</SelectItem>
                <SelectItem value="4">Unas horas</SelectItem>
                <SelectItem value="24">En el día</SelectItem>
                <SelectItem value="48">1-2 días</SelectItem>
                <SelectItem value="72">2-3 días</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm">
              <strong>Tip:</strong> Los creadores con tiempos de respuesta más rápidos
              tienen un 40% más de probabilidades de ser contactados por marcas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Precios y Pagos</CardTitle>
          <CardDescription>Configura tus tarifas y preferencias de pago</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Precio base por video</Label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="Precio base"
                  value={basePrice}
                  onChange={e => setBasePrice(e.target.value)}
                  className="pl-7"
                />
              </div>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <p className="font-medium">Acepta canje de producto</p>
              <p className="text-sm text-muted-foreground">Recibe productos en lugar de pago monetario</p>
            </div>
            <Switch checked={acceptsExchange} onCheckedChange={setAcceptsExchange} />
          </div>

          {acceptsExchange && (
            <div className="space-y-2">
              <Label>Condiciones de canje</Label>
              <Textarea
                placeholder="Ej: Acepto productos de moda y skincare con valor mínimo de $150.000 COP"
                value={exchangeConditions}
                onChange={e => setExchangeConditions(e.target.value)}
                maxLength={500}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button className="w-full sm:w-auto" onClick={handleSave} disabled={saving}>
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</>
        ) : (
          <><Save className="mr-2 h-4 w-4" />Guardar Disponibilidad y Precios</>
        )}
      </Button>
    </div>
  );
}
