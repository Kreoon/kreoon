import { useState, useEffect } from 'react';
import { Mail, Shield, CheckCircle2, AlertCircle, Loader2, Save, Copy, RefreshCw, Send } from 'lucide-react';
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

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  status: string;
  priority?: number;
}

interface EmailSettings {
  sender_name: string;
  sender_email: string;
  support_email: string;
  resend_domain_id: string;
  resend_domain_verified: boolean;
}

export default function WhiteLabelEmailTab() {
  const { profile, user } = useAuth();
  const { capabilities } = useWhiteLabel();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [domainInput, setDomainInput] = useState('');
  const [settings, setSettings] = useState<EmailSettings>({
    sender_name: '',
    sender_email: '',
    support_email: '',
    resend_domain_id: '',
    resend_domain_verified: false,
  });

  const orgId = profile?.current_organization_id;

  useEffect(() => {
    if (!orgId) return;

    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('sender_name, sender_email, support_email, resend_domain_id, resend_domain_verified, name')
        .eq('id', orgId)
        .maybeSingle();

      if (!error && data) {
        setSettings({
          sender_name: data.sender_name || data.name || '',
          sender_email: data.sender_email || '',
          support_email: data.support_email || '',
          resend_domain_id: data.resend_domain_id || '',
          resend_domain_verified: data.resend_domain_verified || false,
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [orgId]);

  const callResendDomainApi = async (action: string, body: Record<string, unknown> = {}) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-domain-management`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organization_id: orgId, action, ...body }),
      }
    );

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `${action} failed`);
    return result;
  };

  const handleSaveSenderInfo = async () => {
    if (!orgId) return;
    setSaving(true);

    const updates: Record<string, string | null> = {
      sender_name: settings.sender_name || null,
    };

    if (capabilities.customSupportEmail) {
      updates.support_email = settings.support_email || null;
    }

    // sender_email is managed via Resend domain verification, not directly editable
    const { error } = await (supabase as any)
      .from('organizations')
      .update(updates)
      .eq('id', orgId);

    if (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' });
    } else {
      toast({ title: 'Guardado', description: 'Configuración de email actualizada' });
    }
    setSaving(false);
  };

  const handleAddDomain = async () => {
    if (!domainInput.trim()) return;
    setAddingDomain(true);

    try {
      const result = await callResendDomainApi('add-domain', { domain: domainInput.trim() });
      setSettings(prev => ({
        ...prev,
        resend_domain_id: result.domain_id || '',
        resend_domain_verified: false,
      }));
      if (result.dns_records) {
        setDnsRecords(result.dns_records);
      }
      toast({ title: 'Dominio agregado', description: 'Configura los registros DNS y luego verifica.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAddingDomain(false);
    }
  };

  const handleGetDnsRecords = async () => {
    try {
      const result = await callResendDomainApi('get-dns-records');
      if (result.dns_records) {
        setDnsRecords(result.dns_records);
      }
      if (result.verified !== undefined) {
        setSettings(prev => ({ ...prev, resend_domain_verified: result.verified }));
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleVerifyDomain = async () => {
    setVerifyingDomain(true);
    try {
      const result = await callResendDomainApi('verify-domain');
      setSettings(prev => ({ ...prev, resend_domain_verified: result.verified || false }));

      if (result.verified) {
        toast({ title: 'Dominio verificado', description: 'Ya puedes enviar emails desde tu dominio.' });
      } else {
        toast({ title: 'No verificado', description: 'Los registros DNS aún no se han propagado. Intenta de nuevo más tarde.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!user?.email) return;
    setSendingTest(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-email-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'magiclink',
            email: user.email,
            organization_id: orgId,
          }),
        }
      );

      if (res.ok) {
        toast({ title: 'Email enviado', description: `Se envió un email de prueba a ${user.email}` });
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'No se pudo enviar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado' });
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
      {/* Sender Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Información del Remitente
          </CardTitle>
          <CardDescription>
            Configura cómo aparecen los emails enviados desde tu organización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {capabilities.customSenderName ? (
            <>
              <div className="space-y-2">
                <Label>Nombre del remitente</Label>
                <Input
                  placeholder="Mi Empresa"
                  value={settings.sender_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, sender_name: e.target.value }))}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  Aparece como: "{settings.sender_name || 'Tu Org'}" &lt;noreply@kreoon.com&gt;
                </p>
              </div>

              {capabilities.customSupportEmail && (
                <div className="space-y-2">
                  <Label>Email de soporte</Label>
                  <Input
                    type="email"
                    placeholder="soporte@tuempresa.com"
                    value={settings.support_email}
                    onChange={(e) => setSettings(prev => ({ ...prev, support_email: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se mostrará en pie de emails y páginas de ayuda
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveSenderInfo} disabled={saving} size="sm">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-sm border border-dashed border-muted-foreground/30 px-4 py-3 opacity-60">
              <p className="text-sm text-muted-foreground">
                Nombre de remitente personalizado disponible desde plan Growth
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Custom Email Domain (Enterprise) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Dominio de Email
            {!capabilities.customSenderDomain && (
              <Badge variant="outline" className="text-xs ml-2">Enterprise</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Envía emails desde tu propio dominio (ej: noreply@tuempresa.com)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {capabilities.customSenderDomain ? (
            <>
              {/* Domain status */}
              {settings.resend_domain_id ? (
                <div className={`flex items-center gap-3 p-3 rounded-sm border ${
                  settings.resend_domain_verified
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                  {settings.resend_domain_verified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {settings.resend_domain_verified ? 'Dominio verificado' : 'Pendiente de verificación'}
                    </p>
                    {settings.sender_email && (
                      <code className="text-xs text-muted-foreground">{settings.sender_email}</code>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleGetDnsRecords}>
                      DNS
                    </Button>
                    {!settings.resend_domain_verified && (
                      <Button size="sm" onClick={handleVerifyDomain} disabled={verifyingDomain}>
                        {verifyingDomain ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                        Verificar
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Agrega tu dominio de email para enviar desde tu propia dirección.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="tuempresa.com"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      className="font-mono"
                    />
                    <Button onClick={handleAddDomain} disabled={addingDomain || !domainInput.trim()}>
                      {addingDomain ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Agregar
                    </Button>
                  </div>
                </div>
              )}

              {/* DNS Records */}
              {dnsRecords.length > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 space-y-3">
                    <h4 className="text-sm font-medium">Registros DNS a configurar</h4>
                    <div className="space-y-2">
                      {dnsRecords.map((record, i) => (
                        <div key={i} className="bg-background rounded-sm p-3 text-xs font-mono space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tipo:</span>
                            <span>{record.type}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground shrink-0">Nombre:</span>
                            <span className="truncate text-right">{record.name}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground shrink-0">Valor:</span>
                            <div className="flex items-center gap-1">
                              <span className="truncate text-right text-primary">{record.value}</span>
                              <button onClick={() => copyToClipboard(record.value)} className="shrink-0 text-muted-foreground hover:text-foreground">
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          {record.priority !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Prioridad:</span>
                              <span>{record.priority}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Estado:</span>
                            <Badge variant={record.status === 'verified' ? 'default' : 'outline'} className="text-[10px]">
                              {record.status === 'verified' ? 'Verificado' : 'Pendiente'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Test Email */}
              {settings.resend_domain_verified && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Enviar email de prueba</p>
                      <p className="text-xs text-muted-foreground">
                        Se enviará un magic link a {user?.email}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSendTestEmail} disabled={sendingTest}>
                      {sendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Enviar prueba
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between rounded-sm border border-dashed border-muted-foreground/30 px-4 py-6 opacity-60">
              <div>
                <p className="text-sm text-muted-foreground">Dominio de email personalizado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Envía emails desde noreply@tudominio.com con marca blanca completa
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
