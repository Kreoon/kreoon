import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { uploadImage } from '@/lib/bunnyUpload';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Copy,
  RefreshCw,
  Link as LinkIcon,
  Lock,
  Unlock,
  Users,
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Palette,
  ImageIcon,
  Upload,
  Building2,
  Plus,
  X,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RegistrationPageConfig {
  welcome_title?: string;
  welcome_message?: string;
  banner_url?: string;
  primary_color?: string;
  show_description?: boolean;
  // Landing page enhancements
  tagline?: string;
  benefits?: string[]; // List of benefits/features
  cta_text?: string;
  social_instagram?: string;
  social_tiktok?: string;
  social_linkedin?: string;
  social_website?: string;
  stats_members?: number;
  stats_campaigns?: number;
  stats_videos?: number;
  show_stats?: boolean;
  banner_overlay_opacity?: number; // 0-100
}

interface OrgRegistrationConfig {
  is_registration_open: boolean;
  registration_code: string | null;
  registration_code_updated_at: string | null;
  registration_require_invite: boolean;
  registration_page_config: RegistrationPageConfig | null;
  default_role: string | null;
  slug: string;
  name: string;
  logo_url: string | null;
  description: string | null;
}

const ROLE_OPTIONS = [
  { value: 'creator', label: 'Creador de Contenido' },
  { value: 'editor', label: 'Productor Audio-Visual' },
  { value: 'strategist', label: 'Estratega' },
  { value: 'trafficker', label: 'Trafficker' },
  { value: 'team_leader', label: 'Líder de Equipo' },
  { value: 'client', label: 'Cliente / Marca' },
];

export function OrgRegistrationSettings() {
  const { profile } = useAuth();
  const { currentOrgId, isOrgOwner, isPlatformRoot, loading: orgLoading } = useOrgOwner();
  
  const [config, setConfig] = useState<OrgRegistrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [pageConfig, setPageConfig] = useState<RegistrationPageConfig>({});
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [newBenefit, setNewBenefit] = useState('');

  const canManage = isOrgOwner || isPlatformRoot;

  useEffect(() => {
    if (currentOrgId && canManage) {
      fetchConfig();
    } else if (!orgLoading) {
      // If we're not loading org data and either no org or no permission, stop loading
      setLoading(false);
    }
  }, [currentOrgId, canManage, orgLoading]);

  const fetchConfig = async () => {
    if (!currentOrgId) return;
    
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('is_registration_open, registration_code, registration_code_updated_at, registration_require_invite, registration_page_config, default_role, slug, name, logo_url, description')
        .eq('id', currentOrgId)
        .single();

      if (error) throw error;
      setConfig(data as OrgRegistrationConfig);
      if (data.registration_page_config) {
        setPageConfig(data.registration_page_config as RegistrationPageConfig);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRegistration = async (enabled: boolean) => {
    if (!currentOrgId || !config) return;
    
    setSaving(true);
    try {
      // If enabling and no code exists, generate one
      let newCode = config.registration_code;
      if (enabled && !newCode) {
        const { data: codeData, error: codeError } = await supabase.rpc('regenerate_org_registration_code', {
          org_id: currentOrgId
        });
        if (codeError) throw codeError;
        newCode = codeData;
      }

      const { error } = await supabase
        .from('organizations')
        .update({ is_registration_open: enabled })
        .eq('id', currentOrgId);

      if (error) throw error;

      setConfig(prev => prev ? { ...prev, is_registration_open: enabled, registration_code: newCode } : null);
      toast.success(enabled ? 'Registro habilitado' : 'Registro deshabilitado');
    } catch (error) {
      console.error('Error toggling registration:', error);
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRequireInvite = async (required: boolean) => {
    if (!currentOrgId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ registration_require_invite: required })
        .eq('id', currentOrgId);

      if (error) throw error;

      setConfig(prev => prev ? { ...prev, registration_require_invite: required } : null);
      toast.success(required ? 'Código de invitación requerido' : 'Registro sin código habilitado');
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeDefaultRole = async (role: 'creator' | 'editor' | 'client' | 'admin' | 'strategist' | 'ambassador') => {
    if (!currentOrgId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ default_role: role })
        .eq('id', currentOrgId);

      if (error) throw error;

      setConfig(prev => prev ? { ...prev, default_role: role } : null);
      toast.success('Rol por defecto actualizado');
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!currentOrgId) return;
    
    setRegenerating(true);
    try {
      const { data, error } = await supabase.rpc('regenerate_org_registration_code', {
        org_id: currentOrgId
      });

      if (error) throw error;

      setConfig(prev => prev ? { 
        ...prev, 
        registration_code: data,
        registration_code_updated_at: new Date().toISOString()
      } : null);
      toast.success('Nuevo código generado. El código anterior ya no es válido.');
    } catch (error) {
      console.error('Error regenerating code:', error);
      toast.error('Error al regenerar código');
    } finally {
      setRegenerating(false);
    }
  };

  const handleUpdatePageConfig = async (updates: Partial<RegistrationPageConfig>) => {
    if (!currentOrgId) return;
    
    const newConfig = { ...pageConfig, ...updates };
    setPageConfig(newConfig);
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ registration_page_config: newConfig })
        .eq('id', currentOrgId);

      if (error) throw error;
      toast.success('Configuración guardada');
    } catch (error) {
      console.error('Error updating page config:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrgId) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    setUploadingBanner(true);
    try {
      // Upload to Bunny CDN
      const result = await uploadImage(file, currentOrgId);
      await handleUpdatePageConfig({ banner_url: result.cdnUrl });
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Error al subir imagen');
    } finally {
      setUploadingBanner(false);
    }
  };

  const BASE_URL = 'https://kreoon.com';

  const copyCode = () => {
    if (config?.registration_code) {
      navigator.clipboard.writeText(config.registration_code);
      toast.success('Código copiado');
    }
  };

  const copyLink = () => {
    if (config?.slug) {
      const link = `${BASE_URL}/auth/org/${config.slug}`;
      navigator.clipboard.writeText(link);
      toast.success('Link copiado');
    }
  };

  if (orgLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acceso restringido</h3>
          <p className="text-muted-foreground">
            Solo el propietario de la organización puede gestionar el registro
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-warning mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin organización</h3>
          <p className="text-muted-foreground">
            No se encontró la configuración de la organización
          </p>
        </CardContent>
      </Card>
    );
  }

  const registrationUrl = `${BASE_URL}/auth/org/${config.slug}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Registro & Accesos</h2>
        <p className="text-muted-foreground">
          Controla cómo las personas se registran en tu organización
        </p>
      </div>

      {/* Estado del registro */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.is_registration_open ? (
                <div className="p-2 rounded-full bg-success/10">
                  <Unlock className="h-5 w-5 text-success" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-muted">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <CardTitle>Página de Registro</CardTitle>
                <CardDescription>
                  {config.is_registration_open 
                    ? 'Los usuarios pueden registrarse en tu organización' 
                    : 'El registro está cerrado'}
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={config.is_registration_open || false}
              onCheckedChange={handleToggleRegistration}
              disabled={saving}
            />
          </div>
        </CardHeader>
        {config.is_registration_open && (
          <CardContent className="space-y-4">
            {/* URL de registro */}
            <div className="p-4 rounded-sm bg-muted/50 space-y-3">
              <Label className="text-sm font-medium">URL de Registro</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={registrationUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href={registrationUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Comparte este link con las personas que quieras invitar
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Control de código de invitación */}
      {config.is_registration_open && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Código de Invitación</CardTitle>
                  <CardDescription>
                    {config.registration_require_invite 
                      ? 'Los usuarios necesitan un código para registrarse' 
                      : 'Cualquiera con el link puede registrarse'}
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={config.registration_require_invite || true}
                onCheckedChange={handleToggleRequireInvite}
                disabled={saving}
              />
            </div>
          </CardHeader>
          {config.registration_require_invite && (
            <CardContent className="space-y-4">
              {/* Código actual */}
              <div className="p-4 rounded-sm border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Código Actual</Label>
                  {config.registration_code_updated_at && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Actualizado: {format(new Date(config.registration_code_updated_at), "d 'de' MMMM, HH:mm", { locale: es })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 p-3 rounded-sm bg-muted font-mono text-lg tracking-widest">
                    {config.registration_code || 'Sin código'}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyCode} disabled={!config.registration_code}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleRegenerateCode}
                  disabled={regenerating}
                  className="w-full gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating ? 'Generando...' : 'Regenerar Código'}
                </Button>
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Al regenerar, el código anterior quedará inválido inmediatamente
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Rol por defecto */}
      {config.is_registration_open && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-accent/10">
                <Users className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle>Rol por Defecto</CardTitle>
                <CardDescription>
                  Rol que se asigna automáticamente a los nuevos usuarios
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              value={config.default_role || 'creator'}
              onValueChange={handleChangeDefaultRole}
              disabled={saving}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Personalización visual */}
      {config.is_registration_open && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Personalización Visual</CardTitle>
                <CardDescription>
                  Personaliza la apariencia de tu página de registro
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview */}
            <div className="p-4 rounded-sm border bg-muted/30 space-y-3">
              <Label className="text-sm font-medium">Vista previa</Label>
              <div className="rounded-sm border bg-card p-4 space-y-3">
                {pageConfig.banner_url && (
                  <div className="h-24 rounded-sm overflow-hidden">
                    <img 
                      src={pageConfig.banner_url} 
                      alt="Banner" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={config.logo_url || ''} />
                    <AvatarFallback>
                      <Building2 className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{pageConfig.welcome_title || config.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pageConfig.welcome_message || config.description || 'Únete a nuestra organización'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner */}
            <div className="space-y-2">
              <Label>Banner de cabecera</Label>
              <div className="flex items-center gap-3">
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                />
                {pageConfig.banner_url ? (
                  <div className="relative h-20 w-40 rounded-sm overflow-hidden border">
                    <img 
                      src={pageConfig.banner_url} 
                      alt="Banner" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-40 rounded-sm border-2 border-dashed flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingBanner ? 'Subiendo...' : 'Subir imagen'}
                  </Button>
                  {pageConfig.banner_url && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleUpdatePageConfig({ banner_url: undefined })}
                      className="text-destructive"
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Recomendado: 1200x300px, máx 5MB
              </p>
            </div>

            {/* Welcome title */}
            <div className="space-y-2">
              <Label>Título de bienvenida</Label>
              <Input
                value={pageConfig.welcome_title || ''}
                onChange={(e) => setPageConfig(prev => ({ ...prev, welcome_title: e.target.value }))}
                onBlur={() => handleUpdatePageConfig({ welcome_title: pageConfig.welcome_title })}
                placeholder={config.name}
              />
              <p className="text-xs text-muted-foreground">
                Déjalo vacío para usar el nombre de la organización
              </p>
            </div>

            {/* Welcome message */}
            <div className="space-y-2">
              <Label>Mensaje de bienvenida</Label>
              <Textarea
                value={pageConfig.welcome_message || ''}
                onChange={(e) => setPageConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
                onBlur={() => handleUpdatePageConfig({ welcome_message: pageConfig.welcome_message })}
                placeholder={config.description || 'Únete a nuestra organización'}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Texto que verán los usuarios en la página de registro
              </p>
            </div>

            {/* Show description toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Mostrar descripción</Label>
                <p className="text-sm text-muted-foreground">
                  Mostrar la descripción completa de la organización
                </p>
              </div>
              <Switch
                checked={pageConfig.show_description || false}
                onCheckedChange={(checked) => handleUpdatePageConfig({ show_description: checked })}
                disabled={saving}
              />
            </div>

            {/* Banner opacity control */}
            <div className="space-y-2">
              <Label>Opacidad del banner ({pageConfig.banner_overlay_opacity ?? 40}%)</Label>
              <input
                type="range"
                min="10"
                max="100"
                value={pageConfig.banner_overlay_opacity ?? 40}
                onChange={(e) => setPageConfig(prev => ({ ...prev, banner_overlay_opacity: Number(e.target.value) }))}
                onMouseUp={() => handleUpdatePageConfig({ banner_overlay_opacity: pageConfig.banner_overlay_opacity })}
                onTouchEnd={() => handleUpdatePageConfig({ banner_overlay_opacity: pageConfig.banner_overlay_opacity })}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Ajusta qué tanto se ve el banner de fondo (mayor = más visible)
              </p>
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <Label>Tagline / Eslogan</Label>
              <Input
                value={pageConfig.tagline || ''}
                onChange={(e) => setPageConfig(prev => ({ ...prev, tagline: e.target.value }))}
                onBlur={() => handleUpdatePageConfig({ tagline: pageConfig.tagline })}
                placeholder="Ej: La comunidad de creadores más grande de LATAM"
              />
              <p className="text-xs text-muted-foreground">
                Una frase corta que describe tu organización
              </p>
            </div>

            {/* CTA Text */}
            <div className="space-y-2">
              <Label>Texto del botón de registro</Label>
              <Input
                value={pageConfig.cta_text || ''}
                onChange={(e) => setPageConfig(prev => ({ ...prev, cta_text: e.target.value }))}
                onBlur={() => handleUpdatePageConfig({ cta_text: pageConfig.cta_text })}
                placeholder="Crear cuenta"
              />
              <p className="text-xs text-muted-foreground">
                Texto del botón principal (por defecto: "Crear cuenta")
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Benefits/Features */}
      {config.is_registration_open && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Beneficios y Características</CardTitle>
                <CardDescription>
                  Lista de beneficios que se muestran en la landing de registro
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current benefits */}
            <div className="space-y-2">
              {(pageConfig.benefits || []).map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-sm bg-muted/50">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <span className="flex-1 text-sm">{benefit}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      const newBenefits = (pageConfig.benefits || []).filter((_, i) => i !== index);
                      handleUpdatePageConfig({ benefits: newBenefits });
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add new benefit */}
            <div className="flex items-center gap-2">
              <Input
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                placeholder="Ej: Acceso a campañas exclusivas"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBenefit.trim()) {
                    handleUpdatePageConfig({
                      benefits: [...(pageConfig.benefits || []), newBenefit.trim()]
                    });
                    setNewBenefit('');
                  }
                }}
              />
              <Button
                variant="outline"
                size="icon"
                disabled={!newBenefit.trim()}
                onClick={() => {
                  if (newBenefit.trim()) {
                    handleUpdatePageConfig({
                      benefits: [...(pageConfig.benefits || []), newBenefit.trim()]
                    });
                    setNewBenefit('');
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Máximo 6 beneficios recomendados
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {config.is_registration_open && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Estadísticas</CardTitle>
                  <CardDescription>
                    Números que demuestran el valor de tu organización
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={pageConfig.show_stats || false}
                onCheckedChange={(checked) => handleUpdatePageConfig({ show_stats: checked })}
                disabled={saving}
              />
            </div>
          </CardHeader>
          {pageConfig.show_stats && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Miembros activos</Label>
                  <Input
                    type="number"
                    min="0"
                    value={pageConfig.stats_members || ''}
                    onChange={(e) => setPageConfig(prev => ({ ...prev, stats_members: Number(e.target.value) || undefined }))}
                    onBlur={() => handleUpdatePageConfig({ stats_members: pageConfig.stats_members })}
                    placeholder="150"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Campañas realizadas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={pageConfig.stats_campaigns || ''}
                    onChange={(e) => setPageConfig(prev => ({ ...prev, stats_campaigns: Number(e.target.value) || undefined }))}
                    onBlur={() => handleUpdatePageConfig({ stats_campaigns: pageConfig.stats_campaigns })}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Videos producidos</Label>
                  <Input
                    type="number"
                    min="0"
                    value={pageConfig.stats_videos || ''}
                    onChange={(e) => setPageConfig(prev => ({ ...prev, stats_videos: Number(e.target.value) || undefined }))}
                    onBlur={() => handleUpdatePageConfig({ stats_videos: pageConfig.stats_videos })}
                    placeholder="500"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Deja en blanco los campos que no quieras mostrar
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Información de seguridad */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Seguridad Activa</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Máximo 5 intentos fallidos por hora (por IP)</li>
                <li>• Los códigos antiguos se invalidan al regenerar</li>
                <li>• Los usuarios quedan vinculados automáticamente a tu organización</li>
                <li>• Registro de todos los intentos para auditoría</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
