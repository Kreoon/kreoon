import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Shield,
  Ban,
  CheckCircle2,
  Loader2,
  Palette
} from 'lucide-react';
import { OrganizationAISettings } from './OrganizationAISettings';

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
  { value: 'America/Mexico_City', label: 'México (GMT-6)' },
  { value: 'America/Lima', label: 'Perú (GMT-5)' },
  { value: 'America/Santiago', label: 'Chile (GMT-4)' },
  { value: 'America/Buenos_Aires', label: 'Argentina (GMT-3)' },
  { value: 'America/Sao_Paulo', label: 'Brasil (GMT-3)' },
  { value: 'Europe/Madrid', label: 'España (GMT+1)' },
  { value: 'America/New_York', label: 'Eastern US (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Pacific US (GMT-8)' },
];

export function OrganizationProfileEditor({ organizationId, isRootAdmin = false, onUpdate }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      setProfile(data as OrganizationProfile);
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
        is_registration_open: profile.is_registration_open,
        default_role: profile.default_role as any,
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
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
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

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información de la Organización
          </CardTitle>
          <CardDescription>Datos principales de la agencia o comunidad</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input id="slug" value={profile.slug} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                URL: {window.location.origin}/org/{profile.slug}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">URL del Logo</Label>
              <Input
                id="logo_url"
                value={profile.logo_url || ''}
                onChange={(e) => updateField('logo_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Administrador Principal (Root)
          </CardTitle>
          <CardDescription>Datos del administrador principal de la organización</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin_name">Nombre del Administrador</Label>
              <Input
                id="admin_name"
                value={profile.admin_name || ''}
                onChange={(e) => updateField('admin_name', e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_email">Correo Root</Label>
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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
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
          <div className="grid gap-4 md:grid-cols-3">
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
              <Label htmlFor="timezone">Zona Horaria</Label>
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
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social & Web */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Web y Redes Sociales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Sitio Web</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Color Principal</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={profile.primary_color || '#8B5CF6'}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  className="w-14 h-10 p-1"
                />
                <Input
                  value={profile.primary_color || '#8B5CF6'}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  placeholder="#8B5CF6"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_members">Límite de Miembros</Label>
              <Input
                id="max_members"
                type="number"
                value={profile.max_members || ''}
                onChange={(e) => updateField('max_members', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Sin límite"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Registro Público Abierto</Label>
              <p className="text-sm text-muted-foreground">
                Permite que nuevos usuarios se registren en la organización
              </p>
            </div>
            <Switch
              checked={profile.is_registration_open || false}
              onCheckedChange={(checked) => updateField('is_registration_open', checked)}
            />
          </div>

          {profile.is_registration_open && (
            <div className="space-y-2">
              <Label>Rol por Defecto para Nuevos Usuarios</Label>
              <Select
                value={profile.default_role || 'creator'}
                onValueChange={(v) => updateField('default_role', v)}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creator">Creador</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="strategist">Estratega</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Settings */}
      <OrganizationAISettings organizationId={organizationId} />

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div>
          {isRootAdmin && !profile.is_blocked && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Ban className="h-4 w-4" />
                  Bloquear Organización
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Bloquear esta organización?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Los usuarios de esta organización no podrán acceder a la plataforma mientras esté bloqueada.
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
