import { useState, useEffect } from 'react';
import { Building2, Save, Loader2, Users, Mail, Phone, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useBrandClient } from '@/hooks/useBrandClient';
import { supabase } from '@/integrations/supabase/client';

interface ClientInfo {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  bio: string | null;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

export default function ClientCompanySection() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { brandClient, loading: brandLoading, activeBrand } = useBrandClient();

  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
    bio: ''
  });

  // Detect independent brand member
  const isBrandMember = !!(profile as any)?.active_brand_id || (profile as any)?.active_role === 'client';
  const hasOrganization = !!(profile as any)?.current_organization_id;
  const isIndependentBrand = isBrandMember && !hasOrganization;

  // Fetch client data using same logic as ClientDashboard
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (brandLoading) return;

    fetchClientInfo();
  }, [user, brandLoading, brandClient?.id]);

  const fetchClientInfo = async () => {
    if (!user) return;
    setLoading(true);

    try {
      let clientId: string | null = null;

      // Method 1: Independent brand member - use brandClient
      if (isIndependentBrand && brandClient) {
        clientId = brandClient.id;
      }

      // Method 2: Check localStorage for saved selection
      if (!clientId) {
        const savedClientId = localStorage.getItem('selectedClientId');
        if (savedClientId) {
          // Verify user has access to this client
          const { data: hasAccess } = await supabase
            .from('client_users')
            .select('client_id')
            .eq('client_id', savedClientId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (hasAccess) {
            clientId = savedClientId;
          }
        }
      }

      // Method 3: Get from client_users table
      if (!clientId) {
        const { data: associations } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('user_id', user.id)
          .limit(1);

        if (associations && associations.length > 0) {
          clientId = associations[0].client_id;
        }
      }

      // Method 4: Fallback to legacy user_id relationship
      if (!clientId) {
        const { data: legacyClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (legacyClient) {
          clientId = legacyClient.id;
        }
      }

      if (!clientId) {
        setLoading(false);
        return;
      }

      // Fetch full client info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, logo_url, contact_email, contact_phone, notes, bio')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      if (client) {
        setClientInfo(client);
        setForm({
          name: client.name || '',
          contact_email: client.contact_email || '',
          contact_phone: client.contact_phone || '',
          notes: client.notes || '',
          bio: client.bio || ''
        });
      }

      // Fetch team members
      const { data: members, error: membersError } = await supabase
        .from('client_users')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profile:profiles!client_users_user_id_fkey(full_name, avatar_url, email)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (!membersError && members) {
        setTeamMembers(members as unknown as TeamMember[]);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast({ title: 'Error', description: 'No se pudo cargar la información', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clientInfo) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: form.name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          notes: form.notes,
          bio: form.bio
        })
        .eq('id', clientInfo.id);

      if (error) throw error;

      setClientInfo(prev => prev ? { ...prev, ...form } : null);
      toast({ title: 'Guardado', description: 'Los datos de tu empresa se actualizaron correctamente' });
    } catch (error) {
      console.error('Error saving company:', error);
      toast({ title: 'Error', description: 'No se pudo guardar la información', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      owner: { label: 'Propietario', variant: 'default' },
      admin: { label: 'Admin', variant: 'secondary' },
      member: { label: 'Miembro', variant: 'outline' },
      viewer: { label: 'Visualizador', variant: 'outline' }
    };
    return roleLabels[role] || { label: role, variant: 'outline' as const };
  };

  if (loading || brandLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientInfo) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold">Mi Empresa</h2>
          <p className="text-sm text-muted-foreground">
            Administra la información de tu marca y empresa
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No se encontró información de empresa</p>
            <p className="text-xs text-muted-foreground mt-2">
              Contacta a tu administrador si crees que esto es un error
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Mi Empresa</h2>
        <p className="text-sm text-muted-foreground">
          Administra la información de tu marca y equipo
        </p>
      </div>

      {/* Company Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {clientInfo.logo_url ? (
              <img src={clientInfo.logo_url} alt={clientInfo.name} className="h-12 w-12 rounded-sm object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <CardTitle>{clientInfo.name}</CardTitle>
              <CardDescription>Datos de la empresa</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-name">
                <Building2 className="inline h-4 w-4 mr-1" />
                Nombre de la empresa
              </Label>
              <Input
                id="company-name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre de tu empresa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">
                <Mail className="inline h-4 w-4 mr-1" />
                Email de contacto
              </Label>
              <Input
                id="contact-email"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="email@empresa.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-phone">
                <Phone className="inline h-4 w-4 mr-1" />
                Teléfono de contacto
              </Label>
              <Input
                id="contact-phone"
                value={form.contact_phone}
                onChange={(e) => setForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="+57 300 000 0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">
              <FileText className="inline h-4 w-4 mr-1" />
              Descripción de la empresa
            </Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Describe brevemente tu empresa..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              <FileText className="inline h-4 w-4 mr-1" />
              Notas adicionales
            </Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Información adicional sobre tu empresa..."
              rows={2}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Equipo</CardTitle>
                <CardDescription>Personas con acceso a esta empresa</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay miembros del equipo registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const role = getRoleBadge(member.role);
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-sm bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.profile?.avatar_url || ''} />
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {member.profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.profile?.full_name || 'Usuario'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.profile?.email || 'Sin email'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={role.variant}>{role.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
