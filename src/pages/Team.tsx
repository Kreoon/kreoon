import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
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
import { Profile, UserRole, AppRole } from '@/types/database';
import { AmbassadorBadge } from '@/components/ui/ambassador-badge';
import { 
  Plus, 
  User, 
  Users, 
  Shield, 
  Star,
  Loader2,
  Send,
  UserPlus,
  Search,
  Swords,
  Building2
} from 'lucide-react';
import { MedievalBanner } from '@/components/layout/MedievalBanner';

import { ROLE_LABELS, ROLE_COLORS, ORG_ASSIGNABLE_ROLES, getRoleLabel } from '@/lib/roles';

export default function Team() {
  const { user, profile: authProfile } = useAuth();
  const { toast } = useToast();
  const { currentOrg } = useOrganizations();
  
  const [profiles, setProfiles] = useState<(Profile & { roles: AppRole[]; isOrgMember: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [addRoleDialog, setAddRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(Profile & { roles: AppRole[] }) | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('creator');
  const [roleAction, setRoleAction] = useState<'add' | 'replace'>('replace'); // Default to replace

  // Invitation state
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'creator' as AppRole
  });
  const [sendingInvite, setSendingInvite] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get current organization from profile or localStorage
  const currentOrgId = authProfile?.current_organization_id || currentOrg?.id;

  useEffect(() => {
    if (currentOrgId) {
      fetchData();
    }
  }, [currentOrgId]);

  const fetchData = async () => {
    if (!currentOrgId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch organization members
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('user_id, is_owner')
        .eq('organization_id', currentOrgId);

      const memberUserIds = membersData?.map(m => m.user_id) || [];

      if (memberUserIds.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      // Fetch multiple roles from the new organization_member_roles table
      const { data: memberRolesData } = await supabase
        .from('organization_member_roles')
        .select('user_id, role')
        .eq('organization_id', currentOrgId);

      // Group roles by user_id
      const rolesByUser = new Map<string, AppRole[]>();
      (memberRolesData || []).forEach(mr => {
        const existing = rolesByUser.get(mr.user_id) || [];
        existing.push(mr.role as AppRole);
        rolesByUser.set(mr.user_id, existing);
      });

      // Fetch profiles only for organization members
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberUserIds)
        .order('created_at', { ascending: false });

      // Combine profiles with roles from organization_member_roles
      const profilesWithRoles = (profilesData || []).map(profile => {
        const member = membersData?.find(m => m.user_id === profile.id);
        const userRoles = rolesByUser.get(profile.id) || [];
        return {
          ...profile,
          roles: userRoles,
          isOrgMember: true,
          isOwner: member?.is_owner || false
        };
      });

      setProfiles(profilesWithRoles as (Profile & { roles: AppRole[]; isOrgMember: boolean })[]); 

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !currentOrgId) return;

    try {
      if (roleAction === 'replace') {
        // Delete all existing roles for this user in this org
        await supabase
          .from('organization_member_roles')
          .delete()
          .eq('user_id', selectedUser.id)
          .eq('organization_id', currentOrgId);
      }

      // Insert the new role (upsert to handle duplicates)
      const { error } = await supabase
        .from('organization_member_roles')
        .upsert({
          organization_id: currentOrgId,
          user_id: selectedUser.id,
          role: newRole,
          assigned_by: user?.id
        }, { onConflict: 'organization_id,user_id,role' });

      if (error) throw error;

      // Also update the main role in organization_members for backward compatibility
      await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('user_id', selectedUser.id)
        .eq('organization_id', currentOrgId);

      toast({
        title: roleAction === 'replace' ? 'Rol actualizado' : 'Rol agregado',
        description: roleAction === 'replace' 
          ? `Se cambió el rol de ${selectedUser.full_name} a ${ROLE_LABELS[newRole]}`
          : `Se agregó el rol ${ROLE_LABELS[newRole]} a ${selectedUser.full_name}`
      });
      setAddRoleDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error managing role:', error);
      toast({
        title: 'Error',
        description: 'No se pudo gestionar el rol',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    if (!currentOrgId) return;
    
    try {
      // Remove the specific role from organization_member_roles
      const { error } = await supabase
        .from('organization_member_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', currentOrgId)
        .eq('role', role);

      if (error) throw error;

      // Check if user has any remaining roles
      const { data: remainingRoles } = await supabase
        .from('organization_member_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', currentOrgId)
        .limit(1);

      // Update the main role in organization_members for backward compatibility
      if (remainingRoles && remainingRoles.length > 0) {
        await supabase
          .from('organization_members')
          .update({ role: remainingRoles[0].role })
          .eq('user_id', userId)
          .eq('organization_id', currentOrgId);
      }

      toast({
        title: 'Rol eliminado',
        description: `Se eliminó el rol ${ROLE_LABELS[role]}`
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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{profile.full_name}</p>
            {(profile.is_ambassador || profile.roles.includes('ambassador')) && (
              <AmbassadorBadge size="sm" variant="default" />
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

  if (!currentOrgId) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin organización seleccionada</h3>
            <p className="text-muted-foreground">
              Selecciona una organización para ver sus miembros
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Medieval Banner with org info */}
      <MedievalBanner
        icon={Swords}
        title={currentOrg?.name ? `Equipo de ${currentOrg.name}` : "Equipo"}
        subtitle={`Administra los miembros de tu organización (${profiles.length} miembros)`}
        action={
          <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-medieval">
                <UserPlus className="w-4 h-4" />
                Invitar Vasallo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar nuevo usuario a {currentOrg?.name}</DialogTitle>
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
        }
      />

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuarios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
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
            <User className="w-4 h-4" />
            Clientes ({clientUsers.length})
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

        {/* Client Users Tab */}
        <TabsContent value="clients" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-info" />
                Usuarios Clientes ({clientUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay usuarios con rol de cliente
                </p>
              ) : (
                <div className="space-y-3">
                  {clientUsers.map(profile => (
                    <UserCard key={profile.id} profile={profile} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Change Role Dialog */}
      <Dialog open={addRoleDialog} onOpenChange={setAddRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.roles.length ? 'Cambiar rol de' : 'Agregar rol a'} {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser?.roles.length ? (
              <div className="p-3 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-2">Roles actuales:</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedUser.roles.map(role => (
                    <Badge key={role} className={ROLE_COLORS[role]}>
                      {ROLE_LABELS[role]}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            
            <div>
              <Label>Nuevo rol</Label>
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

            {selectedUser?.roles.length ? (
              <div>
                <Label>Acción</Label>
                <Select value={roleAction} onValueChange={(v) => setRoleAction(v as 'add' | 'replace')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replace">Reemplazar roles existentes</SelectItem>
                    <SelectItem value="add">Agregar rol adicional</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {roleAction === 'replace' 
                    ? 'Se eliminarán los roles actuales y se asignará solo el nuevo rol.'
                    : 'El usuario tendrá múltiples roles simultáneamente.'}
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRole}>
              {selectedUser?.roles.length && roleAction === 'replace' ? 'Cambiar Rol' : 'Agregar Rol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
