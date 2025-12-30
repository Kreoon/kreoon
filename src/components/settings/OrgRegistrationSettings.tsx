import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrgRegistrationConfig {
  is_registration_open: boolean;
  registration_code: string | null;
  registration_code_updated_at: string | null;
  registration_require_invite: boolean;
  default_role: string | null;
  slug: string;
  name: string;
}

const ROLE_OPTIONS = [
  { value: 'creator', label: 'Creador' },
  { value: 'editor', label: 'Editor' },
  { value: 'client', label: 'Cliente' },
];

export function OrgRegistrationSettings() {
  const { profile } = useAuth();
  const { currentOrgId, isOrgOwner, isPlatformRoot, loading: orgLoading } = useOrgOwner();
  
  const [config, setConfig] = useState<OrgRegistrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const canManage = isOrgOwner || isPlatformRoot;

  useEffect(() => {
    if (currentOrgId && canManage) {
      fetchConfig();
    }
  }, [currentOrgId, canManage]);

  const fetchConfig = async () => {
    if (!currentOrgId) return;
    
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('is_registration_open, registration_code, registration_code_updated_at, registration_require_invite, default_role, slug, name')
        .eq('id', currentOrgId)
        .single();

      if (error) throw error;
      setConfig(data as OrgRegistrationConfig);
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
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
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
              <div className="p-4 rounded-lg border bg-card space-y-3">
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
                  <div className="flex-1 flex items-center gap-2 p-3 rounded-md bg-muted font-mono text-lg tracking-widest">
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
