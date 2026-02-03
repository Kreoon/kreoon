import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, Search, Plus, Trash2, Crown, Shield, Eye, Loader2 } from 'lucide-react';

interface ClientUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface AvailableUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface Props {
  clientId: string;
  clientName: string;
  organizationId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  viewer: 'Visor'
};

const ROLE_ICONS: Record<string, any> = {
  owner: Crown,
  admin: Shield,
  viewer: Eye
};

export function ClientUsersDialog({ clientId, clientName, organizationId, open, onOpenChange, onUpdate }: Props) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('viewer');
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (open && clientId) {
      fetchClientUsers();
      fetchAvailableUsers();
    }
  }, [open, clientId]);

  const fetchClientUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_users')
        .select('id, user_id, role, created_at')
        .eq('client_id', clientId);

      if (error) throw error;

      // Fetch profiles for these users
      const userIds = data?.map(u => u.user_id) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        const usersWithProfiles = data?.map(u => ({
          ...u,
          profile: profiles?.find(p => p.id === u.user_id) || { 
            id: u.user_id, 
            full_name: 'Usuario', 
            email: '', 
            avatar_url: null 
          }
        })) || [];

        setUsers(usersWithProfiles);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching client users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    if (!organizationId) {
      setAvailableUsers([]);
      return;
    }

    try {
      // Get users with "client" role in the current organization
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('role', 'client');

if (!orgMembers || orgMembers.length === 0) {
        setAvailableUsers([]);
        return;
      }

      const clientRoleUserIds = orgMembers.map(m => m.user_id);

      // Get current users of this client to exclude them
      const currentUserIds = users.map(u => u.user_id);

      // Filter to only include client-role users not already linked to this company
      const availableUserIds = clientRoleUserIds.filter(id => !currentUserIds.includes(id));

      if (availableUserIds.length === 0) {
        setAvailableUsers([]);
        return;
      }

      // Fetch profiles for available users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', availableUserIds)
        .order('full_name');

      setAvailableUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching available users:', error);
      setAvailableUsers([]);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Selecciona un usuario',
        variant: 'destructive'
      });
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from('client_users')
        .insert({
          client_id: clientId,
          user_id: selectedUserId,
          role: selectedRole
        });

      if (error) throw error;

      toast({
        title: 'Usuario agregado',
        description: 'El usuario ha sido vinculado a la empresa'
      });

      setSelectedUserId('');
      setSelectedRole('viewer');
      setShowAddForm(false);
      fetchClientUsers();
      onUpdate?.();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({
          title: 'Usuario ya vinculado',
          description: 'Este usuario ya está vinculado a esta empresa',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo agregar el usuario',
          variant: 'destructive'
        });
      }
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('client_users')
        .update({ role: newRole })
        .eq('client_id', clientId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Rol actualizado',
        description: 'El rol del usuario ha sido actualizado'
      });

      fetchClientUsers();
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el rol',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('client_id', clientId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Usuario eliminado',
        description: 'El usuario ha sido desvinculado de la empresa'
      });

      fetchClientUsers();
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el usuario',
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = users.filter(u =>
    u.profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.profile.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unlinkedUsers = availableUsers.filter(
    u => !users.some(cu => cu.user_id === u.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios de {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Add */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Add User Form */}
          {showAddForm && isAdmin && (
            <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
              <p className="text-sm font-medium">Agregar usuario</p>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.full_name}</span>
                        <span className="text-muted-foreground">({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                  {unlinkedUsers.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No hay usuarios disponibles
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      Propietario
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      Administrador
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      Visor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAddUser}
                  disabled={adding || !selectedUserId}
                >
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Agregar'}
                </Button>
              </div>
            </div>
          )}

          {/* Users List */}
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios vinculados'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map(user => {
                  const RoleIcon = ROLE_ICONS[user.role] || Eye;
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.profile.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.profile.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.profile.email}</p>
                      </div>
                      
                      {isAdmin ? (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleUpdateRole(user.user_id, value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">
                              <div className="flex items-center gap-2">
                                <Crown className="h-3 w-3 text-amber-500" />
                                Propietario
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3 w-3 text-blue-500" />
                                Administrador
                              </div>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <Eye className="h-3 w-3" />
                                Visor
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <RoleIcon className="h-3 w-3" />
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      )}

                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esto desvinculará a {user.profile.full_name} de {clientName}.
                                El usuario ya no tendrá acceso a esta empresa.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveUser(user.user_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
