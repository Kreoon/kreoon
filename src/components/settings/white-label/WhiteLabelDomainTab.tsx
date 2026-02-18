import { useState, useEffect } from 'react';
import { Globe, Copy, ExternalLink, CheckCircle2, AlertCircle, Loader2, Save, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { supabase } from '@/integrations/supabase/client';

export default function WhiteLabelDomainTab() {
  const { profile, user } = useAuth();
  const { capabilities, orgBranding } = useWhiteLabel();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [slug, setSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [savedCustomDomain, setSavedCustomDomain] = useState<string | null>(null);
  const [dnsVerified, setDnsVerified] = useState(false);

  const orgId = profile?.current_organization_id;

  useEffect(() => {
    if (!orgId) return;

    const fetchDomainInfo = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('slug, custom_domain')
        .eq('id', orgId)
        .maybeSingle();

      if (!error && data) {
        setSlug(data.slug || '');
        setCustomDomain(data.custom_domain || '');
        setSavedCustomDomain(data.custom_domain || null);
      }
      setLoading(false);
    };

    fetchDomainInfo();
  }, [orgId]);

  // Sync verified status from branding
  useEffect(() => {
    if (orgBranding) {
      setDnsVerified(!!savedCustomDomain);
    }
  }, [orgBranding, savedCustomDomain]);

  const subdomainUrl = slug ? `${slug}.kreoon.com` : null;

  const handleVerifyAndSave = async () => {
    if (!orgId || !customDomain.trim()) return;
    setVerifying(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-custom-domain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            organization_id: orgId,
            domain: customDomain.trim(),
            action: 'add',
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        toast({
          title: 'Error de verificación',
          description: result.error || 'No se pudo verificar el dominio',
          variant: 'destructive',
        });
      } else {
        setSavedCustomDomain(customDomain.trim());
        setDnsVerified(true);
        toast({
          title: 'Dominio verificado',
          description: `${customDomain.trim()} apunta correctamente a kreoon.com`,
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Error de conexión al verificar el dominio',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!orgId) return;
    setRemoving(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-custom-domain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            organization_id: orgId,
            action: 'remove',
          }),
        }
      );

      if (res.ok) {
        setSavedCustomDomain(null);
        setCustomDomain('');
        setDnsVerified(false);
        toast({ title: 'Dominio eliminado', description: 'Se ha removido el dominio personalizado' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo eliminar el dominio', variant: 'destructive' });
    } finally {
      setRemoving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado', description: 'Texto copiado al portapapeles' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subdominio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Subdominio
          </CardTitle>
          <CardDescription>
            Tu subdominio se genera automáticamente del slug de tu organización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {subdomainUrl ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
              <code className="text-sm font-mono text-primary flex-1">{subdomainUrl}</code>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`https://${subdomainUrl}`)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tu organización no tiene slug configurado. Configúralo en la sección "Organización".
            </p>
          )}

          {!capabilities.subdomain && (
            <p className="text-xs text-amber-400">
              El acceso por subdominio está disponible desde el plan Growth.
            </p>
          )}

          {capabilities.subdomain && subdomainUrl && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Los miembros que accedan por este subdominio verán tu marca automáticamente.</p>
              <p>La autenticación auto-seleccionará tu organización.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Dominio Personalizado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Dominio Personalizado
            {!capabilities.customDomain && (
              <Badge variant="outline" className="text-xs ml-2">Enterprise</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Usa tu propio dominio para acceder a la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {capabilities.customDomain ? (
            <>
              {/* Current saved domain */}
              {savedCustomDomain && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="flex-1">
                    <code className="text-sm font-mono text-green-400">{savedCustomDomain}</code>
                    <p className="text-xs text-muted-foreground mt-0.5">Dominio verificado y activo</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveDomain}
                    disabled={removing}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              )}

              {/* Domain input */}
              <div className="space-y-2">
                <Label>{savedCustomDomain ? 'Cambiar dominio' : 'Nuevo dominio'}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="app.tudominio.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="font-mono"
                  />
                  <Button
                    onClick={handleVerifyAndSave}
                    disabled={verifying || !customDomain.trim()}
                  >
                    {verifying ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Verificar
                  </Button>
                </div>
              </div>

              {/* DNS Instructions */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    Configuración DNS requerida
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Antes de verificar, agrega un registro CNAME en tu proveedor DNS:
                  </p>
                  <div className="bg-background rounded-md p-3 font-mono text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span>CNAME</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre:</span>
                      <span>{customDomain || 'app.tudominio.com'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="text-primary">cname.vercel-dns.com</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La propagación DNS puede tardar hasta 48 horas. Contacta soporte si necesitas ayuda.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/30 px-4 py-6 opacity-60">
              <div>
                <p className="text-sm text-muted-foreground">Dominio personalizado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Usa tu propio dominio (ej: app.tuempresa.com) con marca blanca completa
                </p>
              </div>
              <Badge variant="outline">Plan Enterprise</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
