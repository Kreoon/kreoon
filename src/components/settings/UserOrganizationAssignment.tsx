import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Users, 
  Building2, 
  Search, 
  UserPlus,
  UserMinus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import type { AppRole } from '@/types/database';

interface UserWithOrg {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  roles: AppRole[];
  current_organization_id: string | null;
  organization_name: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  organization_type: string | null;
}

import { ROLE_LABELS_SHORT as ROLE_LABELS } from '@/lib/roles';

export function UserOrganizationAssignment() {
  const { hasRole } = useAuth();
  const isAdminUser = hasRole('admin');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithOrg[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrg, setFilterOrg] = useState<string>('all');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithOrg | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('creator');
  const [isAssigning, setIsAssigning] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  useEffect(() => {
    if (isAdminUser) {
      fetchData();
    }
  }, [isAdminUser]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch organizations
    const { data: orgsData } = await supabase
      .from('organizations')
      .select('id, name, slug, organization_type')
      .order('name');
    
    setOrganizations(orgsData || []);

    // Fetch users with their org memberships
    const { data: profilesData, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, current_organization_id')
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
      return;
    }

    // Get organization members with roles
    const userIds = profilesData?.map(p => p.id) || [];
    const { data: membersData } = await supabase
      .from('organization_members')
      .select('user_id, role, organization_id')
      .in('user_id', userIds);

    // Get org names
    const orgIds = [...new Set(profilesData?.filter(p => p.current_organization_id).map(p => p.current_organization_id))] as string[];
    const { data: orgNamesData } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds);

    const orgNamesMap = new Map(orgNamesData?.map(o => [o.id, o.name]) || []);
    
    // Build roles map from organization_members
    const rolesMap = new Map<string, AppRole[]>();
    membersData?.forEach(m => {
      if (m.role) {
        const existing = rolesMap.get(m.user_id) || [];
        if (!existing.includes(m.role)) {
          rolesMap.set(m.user_id, [...existing, m.role]);
        }
      }
    });

    const usersWithOrgs: UserWithOrg[] = (profilesData || []).map(p => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      roles: rolesMap.get(p.id) || [],
      current_organization_id: p.current_organization_id,
      organization_name: p.current_organization_id ? orgNamesMap.get(p.current_organization_id) || null : null,
    }));

    setUsers(usersWithOrgs);
    setLoading(false);
  };

  const handleAssignToOrg = async () => {
    if (!selectedUser || !selectedOrgId) {
      toast.error('Selecciona un usuario y una organización');
      return;
    }

    setIsAssigning(true);

    try {
      // Check if already a member
      const { data: existingMember, error: checkError } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', selectedOrgId)
        .eq('user_id', selectedUser.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking membership:', checkError);
        toast.error(`Error verificando membresía: ${checkError.message}`);
        setIsAssigning(false);
        return;
      }

      if (existingMember) {
        // Update role in organization_members
        const { error: updateError } = await supabase
          .from('organization_members')
          .update({ role: selectedRole })
          .eq('id', existingMember.id);

        if (updateError) {
          console.error('Error updating member:', updateError);
          toast.error(`Error actualizando rol: ${updateError.message}`);
          setIsAssigning(false);
          return;
        }

        // Also update organization_member_roles - delete old roles and insert new one
        await supabase
          .from('organization_member_roles')
          .delete()
          .eq('organization_id', selectedOrgId)
          .eq('user_id', selectedUser.id);

        await supabase
          .from('organization_member_roles')
          .insert({
            organization_id: selectedOrgId,
            user_id: selectedUser.id,
            role: selectedRole,
          });
      } else {
        // Add as member
        const { error: insertError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: selectedOrgId,
            user_id: selectedUser.id,
            role: selectedRole,
            is_owner: false,
          });

        if (insertError) {
          console.error('Error inserting member:', insertError);
          toast.error(`Error asignando usuario: ${insertError.message}`);
          setIsAssigning(false);
          return;
        }

        // Also insert into organization_member_roles
        const { error: rolesInsertError } = await supabase
          .from('organization_member_roles')
          .insert({
            organization_id: selectedOrgId,
            user_id: selectedUser.id,
            role: selectedRole,
          });

        if (rolesInsertError) {
          console.error('Error inserting member role:', rolesInsertError);
          // Non-critical, continue
        }
      }

      // Update current org in profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ current_organization_id: selectedOrgId })
        .eq('id', selectedUser.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        toast.error(`Error actualizando perfil: ${profileError.message}`);
        setIsAssigning(false);
        return;
      }

      toast.success(`${selectedUser.full_name} asignado a la organización`);
      setShowAssignDialog(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      console.error('Error assigning user:', error);
      toast.error('Error inesperado al asignar usuario');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveFromOrg = async (user: UserWithOrg) => {
    if (!user.current_organization_id) return;

    try {
      // Remove from organization_members
      await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', user.current_organization_id)
        .eq('user_id', user.id);

      // Clear current org
      await supabase
        .from('profiles')
        .update({ current_organization_id: null })
        .eq('id', user.id);

      toast.success(`${user.full_name} removido de la organización`);
      fetchData();
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Error al remover usuario');
    }
  };

  const openAssignDialog = (user: UserWithOrg) => {
    setSelectedUser(user);
    setSelectedOrgId(user.current_organization_id || '');
    setSelectedRole(user.roles[0] || 'creator');
    setShowAssignDialog(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOrg = filterOrg === 'all' || user.current_organization_id === filterOrg;
    const matchesUnassigned = !filterUnassigned || !user.current_organization_id;

    return matchesSearch && matchesOrg && matchesUnassigned;
  });

  if (!isAdminUser) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        Solo administradores pueden acceder a esta sección
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Asignación de Usuarios a Organizaciones</h3>
        <p className="text-sm text-muted-foreground">
          Asigna creadores, editores y marcas a agencias, comunidades o academias
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por org" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las organizaciones</SelectItem>
            {organizations.map(org => (
              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={filterUnassigned ? "default" : "outline"}
          onClick={() => setFilterUnassigned(!filterUnassigned)}
          className="gap-2"
        >
          <UserMinus className="h-4 w-4" />
          Sin asignar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Total usuarios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{users.filter(u => u.current_organization_id).length}</div>
            <p className="text-xs text-muted-foreground">Asignados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500">{users.filter(u => !u.current_organization_id).length}</div>
            <p className="text-xs text-muted-foreground">Sin asignar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{organizations.length}</div>
            <p className="text-xs text-muted-foreground">Organizaciones</p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron usuarios
          </div>
        ) : (
          filteredUsers.map(user => (
            <Card key={user.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {user.roles.map(role => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {ROLE_LABELS[role] || role}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {user.organization_name ? (
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {user.organization_name}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Sin asignar</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAssignDialog(user)}
                      className="gap-1"
                    >
                      <UserPlus className="h-4 w-4" />
                      {user.current_organization_id ? 'Cambiar' : 'Asignar'}
                    </Button>
                    {user.current_organization_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveFromOrg(user)}
                        className="text-destructive hover:text-destructive"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar a Organización</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>Asignar a <strong>{selectedUser.full_name}</strong> a una organización</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Organización</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una organización" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {org.name}
                        {org.organization_type && (
                          <span className="text-xs text-muted-foreground">
                            ({org.organization_type === 'agency' ? 'Agencia' : 
                              org.organization_type === 'community' ? 'Comunidad' : 'Academia'})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rol en la organización</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creator">Creador</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="strategist">Estratega</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignToOrg} disabled={!selectedOrgId || isAssigning}>
              {isAssigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
