import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Profile, UserRole, Client, AppRole } from '@/types/database';
import { 
  Plus, 
  User, 
  Users, 
  Building2, 
  Shield, 
  Trash2,
  Mail,
  Phone,
  Star,
  Loader2,
  Send,
  UserPlus
} from 'lucide-react';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  creator: 'Creador',
  editor: 'Editor',
  client: 'Cliente',
  ambassador: 'Embajador',
  strategist: 'Estratega'
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive/20 text-destructive',
  creator: 'bg-primary/20 text-primary',
  editor: 'bg-purple-500/20 text-purple-500',
  client: 'bg-info/20 text-info',
  ambassador: 'bg-success/20 text-success',
  strategist: 'bg-orange-500/20 text-orange-500'
};

export default function Team() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profiles, setProfiles] = useState<(Profile & { roles: AppRole[] })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newClientDialog, setNewClientDialog] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    user_email: ''
  });
  
  const [addRoleDialog, setAddRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('creator');

  // Invitation state
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'creator' as AppRole
  });
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*');

      // Combine profiles with roles
      const profilesWithRoles = (profilesData || []).map(profile => ({
        ...profile,
        roles: (rolesData || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole)
      }));

      setProfiles(profilesWithRoles as (Profile & { roles: AppRole[] })[]);

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      setClients(clientsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.id,
          role: newRole
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Error',
            description: 'Este usuario ya tiene ese rol',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Rol agregado',
          description: `Se agregó el rol de ${ROLE_LABELS[newRole]} a ${selectedUser.full_name}`
        });
        setAddRoleDialog(false);
        fetchData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el rol',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast({
        title: 'Rol eliminado',
        description: `Se eliminó el rol de ${ROLE_LABELS[role]}`
      });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el rol',
        variant: 'destructive'
      });
    }
  };

  const handleCreateClient = async () => {
    if (!newClientData.name) {
      toast({
        title: 'Error',
        description: 'El nombre del cliente es requerido',
        variant: 'destructive'
      });
      return;
    }

    try {
      let clientUserId = null;

      // If user email provided, find the user
      if (newClientData.user_email) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', newClientData.user_email)
          .single();

        if (userProfile) {
          clientUserId = userProfile.id;
          
          // Add client role to the user
          await supabase
            .from('user_roles')
            .insert({ user_id: userProfile.id, role: 'client' })
            .select();
        }
      }

      const { error } = await supabase
        .from('clients')
        .insert({
          name: newClientData.name,
          contact_email: newClientData.contact_email || null,
          contact_phone: newClientData.contact_phone || null,
          user_id: clientUserId,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Cliente creado',
        description: `${newClientData.name} ha sido agregado`
      });

      setNewClientDialog(false);
      setNewClientData({ name: '', contact_email: '', contact_phone: '', user_email: '' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el cliente',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: 'Cliente eliminado'
      });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el cliente',
        variant: 'destructive'
      });
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteData.email) {
      toast({
        title: 'Error',
        description: 'El email es requerido',
        variant: 'destructive'
      });
      return;
    }

    setSendingInvite(true);
    try {
      const response = await supabase.functions.invoke('send-invitation', {
        body: {
          email: inviteData.email,
          role: inviteData.role,
          inviter_name: user?.email || 'Admin'
        }
      });

      if (response.error) throw response.error;

      toast({
        title: 'Invitación enviada',
        description: `Se envió la invitación a ${inviteData.email}`
      });
      setInviteDialog(false);
      setInviteData({ email: '', role: 'creator' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar la invitación. Verifica la configuración de email.',
        variant: 'destructive'
      });
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const noRole = profiles.filter(p => p.roles.length === 0);
  const admins = profiles.filter(p => p.roles.includes('admin'));
  const strategists = profiles.filter(p => p.roles.includes('strategist'));
  const creators = profiles.filter(p => p.roles.includes('creator'));
  const editors = profiles.filter(p => p.roles.includes('editor'));
  const ambassadors = profiles.filter(p => p.roles.includes('ambassador'));
  const clientUsers = profiles.filter(p => p.roles.includes('client'));

  // Reusable user card component
  const UserCard = ({ profile, showAddRole = true }: { profile: Profile & { roles: AppRole[] }, showAddRole?: boolean }) => (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile.avatar_url || ''} />
          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{profile.full_name}</p>
            {profile.is_ambassador && (
              <Star className="w-4 h-4 text-primary fill-primary" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {profile.roles.length === 0 ? (
          <Badge variant="outline" className="text-muted-foreground">
            Sin rol
          </Badge>
        ) : (
          profile.roles.map(role => (
            <Badge 
              key={role} 
              className={`${ROLE_COLORS[role]} cursor-pointer hover:opacity-75`}
              onClick={() => handleRemoveRole(profile.id, role)}
              title="Clic para eliminar rol"
            >
              {ROLE_LABELS[role]} ×
            </Badge>
          ))
        )}
        {showAddRole && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              setSelectedUser(profile);
              setAddRoleDialog(true);
            }}
          >
            <Plus className="w-3 h-3" />
            Rol
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with invite button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Equipo</h1>
          <p className="text-muted-foreground">Administra usuarios, roles y clientes</p>
        </div>
        <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Invitar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar nuevo usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <Label>Rol</Label>
                <Select 
                  value={inviteData.role} 
                  onValueChange={(v) => setInviteData({ ...inviteData, role: v as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="creator">Creador</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="strategist">Estratega</SelectItem>
                    <SelectItem value="ambassador">Embajador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSendInvitation} disabled={sendingInvite} className="gap-2">
                {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar Invitación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="no-role" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="no-role" className="gap-2">
            <User className="w-4 h-4" />
            Sin Rol ({noRole.length})
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2">
            <Shield className="w-4 h-4" />
            Admins ({admins.length})
          </TabsTrigger>
          <TabsTrigger value="strategists" className="gap-2">
            <Users className="w-4 h-4" />
            Estrategas ({strategists.length})
          </TabsTrigger>
          <TabsTrigger value="creators" className="gap-2">
            <User className="w-4 h-4" />
            Creadores ({creators.length})
          </TabsTrigger>
          <TabsTrigger value="editors" className="gap-2">
            <User className="w-4 h-4" />
            Editores ({editors.length})
          </TabsTrigger>
          <TabsTrigger value="ambassadors" className="gap-2">
            <Star className="w-4 h-4" />
            Embajadores ({ambassadors.length})
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Building2 className="w-4 h-4" />
            Clientes ({clients.length})
          </TabsTrigger>
        </TabsList>

        {/* Sin Rol Tab */}
        <TabsContent value="no-role" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground" />
                Usuarios Sin Rol ({noRole.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {noRole.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Todos los usuarios tienen al menos un rol asignado
                </p>
              ) : (
                <div className="space-y-3">
                  {noRole.map(profile => (
                    <UserCard key={profile.id} profile={profile} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admins Tab */}
        <TabsContent value="admins" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-destructive" />
                Administradores ({admins.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {admins.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay administradores registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {admins.map(profile => (
                    <UserCard key={profile.id} profile={profile} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strategists Tab */}
        <TabsContent value="strategists" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Estrategas ({strategists.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {strategists.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay estrategas registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {strategists.map(profile => (
                    <UserCard key={profile.id} profile={profile} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Creators Tab */}
        <TabsContent value="creators" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Creadores ({creators.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {creators.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay creadores registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {creators.map(profile => (
                    <UserCard key={profile.id} profile={profile} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Editors Tab */}
        <TabsContent value="editors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" />
                Editores ({editors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editors.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay editores registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {editors.map(profile => (
                    <UserCard key={profile.id} profile={profile} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ambassadors Tab */}
        <TabsContent value="ambassadors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-success" />
                Embajadores ({ambassadors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ambassadors.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay embajadores registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {ambassadors.map(profile => (
                    <UserCard key={profile.id} profile={profile} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Clientes ({clients.filter(c => c.id !== '00000000-0000-0000-0000-000000000001').length})
              </CardTitle>
              <Dialog open={newClientDialog} onOpenChange={setNewClientDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nuevo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear nuevo cliente</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="client-name">Nombre de la empresa *</Label>
                      <Input
                        id="client-name"
                        value={newClientData.name}
                        onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                        placeholder="Empresa XYZ"
                      />
                    </div>
                    <div>
                      <Label htmlFor="client-email">Email de contacto</Label>
                      <Input
                        id="client-email"
                        type="email"
                        value={newClientData.contact_email}
                        onChange={(e) => setNewClientData({ ...newClientData, contact_email: e.target.value })}
                        placeholder="contacto@empresa.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="client-phone">Teléfono</Label>
                      <Input
                        id="client-phone"
                        value={newClientData.contact_phone}
                        onChange={(e) => setNewClientData({ ...newClientData, contact_phone: e.target.value })}
                        placeholder="+57 300 123 4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="user-email">Email del usuario (opcional)</Label>
                      <Input
                        id="user-email"
                        type="email"
                        value={newClientData.user_email}
                        onChange={(e) => setNewClientData({ ...newClientData, user_email: e.target.value })}
                        placeholder="usuario@email.com"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Si el cliente ya tiene cuenta, ingresa su email para vincularlo
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewClientDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateClient}>
                      Crear Cliente
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {clients.filter(c => c.id !== '00000000-0000-0000-0000-000000000001').length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay clientes registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {clients
                    .filter(c => c.id !== '00000000-0000-0000-0000-000000000001')
                    .map(client => (
                    <div key={client.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-info/20 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-info" />
                        </div>
                        <div>
                          <p className="font-semibold">{client.name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {client.contact_email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {client.contact_email}
                              </span>
                            )}
                            {client.contact_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {client.contact_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClient(client.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Role Dialog */}
      <Dialog open={addRoleDialog} onOpenChange={setAddRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar rol a {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Seleccionar rol</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="creator">Creador</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="strategist">Estratega</SelectItem>
                  <SelectItem value="ambassador">Embajador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRole}>
              Agregar Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
