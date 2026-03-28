import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Instagram, 
  Facebook, 
  Linkedin,
  Save,
  Ban,
  Loader2,
  Clock,
  Link2,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  organization_type: string | null;
  admin_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  linkedin: string | null;
  billing_email: string | null;
  timezone: string | null;
  primary_color: string | null;
  max_members: number | null;
  is_blocked: boolean | null;
  blocked_at: string | null;
  blocked_by: string | null;
  blocked_reason: string | null;
  is_registration_open: boolean | null;
  default_role: string | null;
}

interface Props {
  organizationId: string;
  isRootAdmin?: boolean;
  onUpdate?: () => void;
}

const ORG_TYPES = [
  { value: 'agency', label: 'Agencia' },
  { value: 'community', label: 'Comunidad' },
  { value: 'company', label: 'Empresa' },
];

const TIMEZONES = [
  { value: 'America/Bogota', label: 'Colombia (GMT-5)' },
  { value: 'America/Mexico_City', label: 'México Central (GMT-6)' },
  { value: 'America/Lima', label: 'Perú (GMT-5)' },
  { value: 'America/Santiago', label: 'Chile (GMT-4)' },
  { value: 'America/Buenos_Aires', label: 'Argentina (GMT-3)' },
  { value: 'America/Sao_Paulo', label: 'Brasil (GMT-3)' },
  { value: 'America/Guayaquil', label: 'Ecuador (GMT-5)' },
  { value: 'America/Caracas', label: 'Venezuela (GMT-4)' },
  { value: 'America/Panama', label: 'Panamá (GMT-5)' },
  { value: 'America/Costa_Rica', label: 'Costa Rica (GMT-6)' },
  { value: 'America/Chicago', label: 'US Central (GMT-6)' },
  { value: 'Europe/Madrid', label: 'España (GMT+1)' },
  { value: 'America/New_York', label: 'US Eastern (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (GMT-8)' },
];

export function OrganizationProfileEditor({ organizationId, isRootAdmin = false, onUpdate }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [organizationId]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      toast.error('Error al cargar perfil de organización');
      console.error(error);
    } else {
      const org = data as OrganizationProfile;
      // Auto-detect timezone from browser if not set
      if (!org.timezone) {
        try {
          org.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
          org.timezone = 'America/Bogota';
        }
      }
      setProfile(org);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        name: profile.name,
        description: profile.description,
        logo_url: profile.logo_url,
        organization_type: profile.organization_type as any,
        admin_name: profile.admin_name,
        admin_email: profile.admin_email,
        admin_phone: profile.admin_phone,
        address: profile.address,
        city: profile.city,
        country: profile.country,
        website: profile.website,
        instagram: profile.instagram,
        tiktok: profile.tiktok,
        facebook: profile.facebook,
        linkedin: profile.linkedin,
        billing_email: profile.billing_email,
        timezone: profile.timezone as any,
        primary_color: profile.primary_color as any,
        max_members: profile.max_members,
      })
      .eq('id', organizationId);

    setSaving(false);

    if (error) {
      toast.error('Error al guardar');
      console.error(error);
    } else {
      toast.success('Perfil actualizado');
      onUpdate?.();
    }
  };

  const handleBlock = async () => {
    if (!profile || !user) return;

    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        is_blocked: true,
        blocked_at: new Date().toISOString(),
        blocked_by: user.id,
        blocked_reason: blockReason || 'Bloqueado por administrador',
      })
      .eq('id', organizationId);

    setSaving(false);

    if (error) {
      toast.error('Error al bloquear');
    } else {
      toast.success('Organización bloqueada');
      fetchProfile();
      onUpdate?.();
    }
  };

  const handleUnblock = async () => {
    if (!profile) return;

    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        is_blocked: false,
        blocked_at: null,
        blocked_by: null,
        blocked_reason: null,
      })
      .eq('id', organizationId);

    setSaving(false);

    if (error) {
      toast.error('Error al desbloquear');
    } else {
      toast.success('Organización desbloqueada');
      fetchProfile();
      onUpdate?.();
    }
  };

  const updateField = (field: keyof OrganizationProfile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizationId) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizationId}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('organizations')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('organizations')
        .getPublicUrl(fileName);

      // Add cache buster to force refresh
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;
      updateField('logo_url', urlWithCacheBuster);
      toast.success('Logo subido correctamente');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Error al subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Organización no encontrada
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {profile.is_blocked && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-sm p-4 flex items-center gap-3">
          <Ban className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Organización Bloqueada</p>
            <p className="text-sm text-muted-foreground">{profile.blocked_reason}</p>
          </div>
          {isRootAdmin && (
            <Button variant="outline" size="sm" onClick={handleUnblock} disabled={saving}>
              Desbloquear
            </Button>
          )}
        </div>
      )}

      {/* Información Principal */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Información Principal
          </CardTitle>
          <CardDescription>Datos básicos de la organización</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Organización *</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Nombre de tu agencia o comunidad"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={profile.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe tu organización..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org_type">Tipo de Organización</Label>
            <Select
              value={profile.organization_type || 'agency'}
              onValueChange={(v) => updateField('organization_type', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input id="slug" value={profile.slug} disabled className="bg-muted font-mono text-sm" />
            <p className="text-xs text-muted-foreground">
              URL de acceso: {window.location.origin}/org/{profile.slug}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Logo de la Organización</Label>
            <div className="flex items-center gap-4">
              {profile.logo_url ? (
                <div className="relative h-20 w-20 rounded-sm border overflow-hidden bg-muted">
                  <img 
                    src={profile.logo_url} 
                    alt="Logo" 
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-sm border border-dashed flex items-center justify-center bg-muted">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="text-xs text-muted-foreground">
                  PNG, JPG hasta 5MB
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacto del Administrador */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Administrador Principal
          </CardTitle>
          <CardDescription>Datos del responsable de la organización</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin_name">Nombre Completo</Label>
            <Input
              id="admin_name"
              value={profile.admin_name || ''}
              onChange={(e) => updateField('admin_name', e.target.value)}
              placeholder="Nombre del administrador"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_email">Correo Electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="admin_email"
                type="email"
                value={profile.admin_email || ''}
                onChange={(e) => updateField('admin_email', e.target.value)}
                placeholder="admin@organizacion.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_phone">Teléfono (WhatsApp)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="admin_phone"
                value={profile.admin_phone || ''}
                onChange={(e) => updateField('admin_phone', e.target.value)}
                placeholder="+57 300 123 4567"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_email">Correo de Facturación</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="billing_email"
                type="email"
                value={profile.billing_email || ''}
                onChange={(e) => updateField('billing_email', e.target.value)}
                placeholder="facturacion@organizacion.com"
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ubicación y Zona Horaria */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={profile.address || ''}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Calle, número, edificio..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              value={profile.city || ''}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Ciudad"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Input
              id="country"
              value={profile.country || ''}
              onChange={(e) => updateField('country', e.target.value)}
              placeholder="País"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Zona Horaria
            </Label>
            <Select
              value={profile.timezone || 'America/Bogota'}
              onValueChange={(v) => updateField('timezone', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
                {/* If current timezone isn't in the preset list, show it as detected */}
                {profile.timezone && !TIMEZONES.some(tz => tz.value === profile.timezone) && (
                  <SelectItem value={profile.timezone}>
                    {profile.timezone} (detectado)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Redes Sociales */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Web y Redes Sociales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website">Sitio Web</Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                value={profile.website || ''}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://www.tuorganizacion.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <div className="relative">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="instagram"
                value={profile.instagram || ''}
                onChange={(e) => updateField('instagram', e.target.value)}
                placeholder="@tuorganizacion"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiktok">TikTok</Label>
            <Input
              id="tiktok"
              value={profile.tiktok || ''}
              onChange={(e) => updateField('tiktok', e.target.value)}
              placeholder="@tuorganizacion"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <div className="relative">
              <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="facebook"
                value={profile.facebook || ''}
                onChange={(e) => updateField('facebook', e.target.value)}
                placeholder="tuorganizacion"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <div className="relative">
              <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="linkedin"
                value={profile.linkedin || ''}
                onChange={(e) => updateField('linkedin', e.target.value)}
                placeholder="company/tuorganizacion"
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <div>
          {isRootAdmin && !profile.is_blocked && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Ban className="h-4 w-4" />
                  Bloquear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Bloquear esta organización?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Los usuarios no podrán acceder mientras esté bloqueada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Label htmlFor="block_reason">Motivo del bloqueo</Label>
                  <Textarea
                    id="block_reason"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Describe el motivo..."
                    className="mt-2"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground">
                    Bloquear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
