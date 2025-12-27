import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  Search, 
  MoreVertical, 
  Mail, 
  Ban, 
  Trash2, 
  Shield,
  RefreshCw,
  Loader2,
  Building2,
  UserPlus,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Crown
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AppRole } from "@/types/database";
import { ROLE_LABELS, ROLE_BADGE_COLORS, ORG_ASSIGNABLE_ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";

const ROOT_EMAIL = "jacsolucionesgraficas@gmail.com";

interface UserData {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  roles: AppRole[];
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned: boolean;
  current_organization_id: string | null;
  organization_name: string | null;
  isPlatformAdmin: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export function PlatformUsersManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOrg, setFilterOrg] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserData | null>(null);
  const [assignDialog, setAssignDialog] = useState<UserData | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("creator");

  const isRoot = profile?.email === ROOT_EMAIL;

  useEffect(() => {
    if (isRoot) {
      fetchData();
    }
  }, [isRoot]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_users" }
      });
      if (usersError) throw usersError;

      // Fetch organizations
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name');
      
      setOrganizations(orgsData || []);

      // Fetch org memberships for each user
      const userIds = usersData.users?.map((u: any) => u.id) || [];
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('user_id, organization_id, role')
        .in('user_id', userIds);

      // Fetch profiles for org info
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, current_organization_id')
        .in('id', userIds);

      // Fetch platform admin roles from user_roles table
      const { data: platformRolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin')
        .in('user_id', userIds);

      const platformAdminIds = new Set(platformRolesData?.map(r => r.user_id) || []);

      // Build org names map
      const orgNamesMap = new Map(orgsData?.map(o => [o.id, o.name]) || []);

      // Enhance users with org data
      const enhancedUsers = (usersData.users || []).map((user: any) => {
        const userProfile = profilesData?.find(p => p.id === user.id);
        const userMember = membersData?.find(m => m.user_id === user.id && m.organization_id === userProfile?.current_organization_id);
        
        return {
          ...user,
          current_organization_id: userProfile?.current_organization_id || null,
          organization_name: userProfile?.current_organization_id 
            ? orgNamesMap.get(userProfile.current_organization_id) || null 
            : null,
          roles: userMember?.role ? [userMember.role] : user.roles || [],
          isPlatformAdmin: platformAdminIds.has(user.id)
        };
      });

      setUsers(enhancedUsers);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToOrg = async () => {
    if (!assignDialog || !selectedOrgId) {
      toast.error("Selecciona una organización");
      return;
    }

    setActionLoading(assignDialog.id);
    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', selectedOrgId)
        .eq('user_id', assignDialog.id)
        .maybeSingle();

      if (existingMember) {
        // Update role
        await supabase
          .from('organization_members')
          .update({ role: selectedRole })
          .eq('id', existingMember.id);
      } else {
        // Insert new membership
        await supabase
          .from('organization_members')
          .insert({
            organization_id: selectedOrgId,
            user_id: assignDialog.id,
            role: selectedRole,
            is_owner: false,
          });
      }

      // Update current org in profile
      await supabase
        .from('profiles')
        .update({ current_organization_id: selectedOrgId })
        .eq('id', assignDialog.id);

      toast.success(`${assignDialog.full_name} asignado a la organización`);
      setAssignDialog(null);
      fetchData();
    } catch (error: any) {
      console.error("Error assigning user:", error);
      toast.error("Error al asignar usuario");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFromOrg = async (user: UserData) => {
    if (!user.current_organization_id) return;

    setActionLoading(user.id);
    try {
      // Remove from ALL organization_members entries for this user
      const { error: memberError } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', user.id);

      if (memberError) {
        console.error("Error removing from org members:", memberError);
      }

      // Clear current_organization_id in profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ current_organization_id: null })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      toast.success(`${user.full_name} removido de la organización`);
      fetchData();
    } catch (error: any) {
      console.error("Error removing user:", error);
      toast.error("Error al remover usuario: " + (error.message || "Error desconocido"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (userId: string, role: AppRole) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "toggle_role", userId, role }
      });
      if (error) throw error;
      toast.success(data.added ? `Rol ${ROLE_LABELS[role]} agregado` : `Rol ${ROLE_LABELS[role]} removido`);
      fetchData();
    } catch (error: any) {
      toast.error("Error al modificar rol");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePlatformAdmin = async (user: UserData) => {
    setActionLoading(user.id);
    try {
      if (user.isPlatformAdmin) {
        // Remove admin role from user_roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role', 'admin');
        toast.success(`${user.full_name} ya no es administrador de plataforma`);
      } else {
        // Add admin role to user_roles
        await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: 'admin' });
        toast.success(`${user.full_name} ahora es administrador de plataforma`);
      }
      fetchData();
    } catch (error: any) {
      console.error("Error toggling platform admin:", error);
      toast.error("Error al modificar administrador de plataforma");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (user: UserData) => {
    setActionLoading(user.id);
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: "reset_password", userId: user.id }
      });
      if (error) throw error;
      toast.success(`Email de restablecimiento enviado a ${user.email}`);
    } catch (error: any) {
      toast.error("Error al enviar email de restablecimiento");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setActionLoading(deleteConfirm.id);
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete_user", userId: deleteConfirm.id }
      });
      if (error) throw error;
      toast.success(`Usuario ${deleteConfirm.email} eliminado`);
      setDeleteConfirm(null);
      fetchData();
    } catch (error: any) {
      toast.error("Error al eliminar usuario");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOrg = filterOrg === "all" || 
      (filterOrg === "unassigned" && !u.current_organization_id) ||
      u.current_organization_id === filterOrg;

    return matchesSearch && matchesOrg;
  });

  // Split users by assignment status
  const unassignedUsers = filteredUsers.filter(u => !u.current_organization_id);
  const assignedUsers = filteredUsers.filter(u => u.current_organization_id);
  
  // Platform admins are users with 'admin' role in user_roles table (not org-level)
  const platformAdmins = users.filter(u => u.isPlatformAdmin);

  if (!isRoot) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Solo el administrador root puede acceder a esta sección.</p>
        </CardContent>
      </Card>
    );
  }

  const UserCard = ({ user, showPlatformAdminToggle = false }: { user: UserData; showPlatformAdminToggle?: boolean }) => (
    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url || ''} />
          <AvatarFallback>{user.full_name?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{user.full_name}</p>
            {user.isPlatformAdmin && (
              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Admin Plataforma
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {user.organization_name ? (
              <Badge variant="outline" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                {user.organization_name}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs text-orange-600">
                Sin organización
              </Badge>
            )}
            {user.roles.map(role => (
              <Badge key={role} variant="outline" className={cn("text-xs", ROLE_BADGE_COLORS[role])}>
                {ROLE_LABELS[role]}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={actionLoading === user.id}>
            {actionLoading === user.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Platform Admin Toggle */}
          <DropdownMenuItem onClick={() => handleTogglePlatformAdmin(user)}>
            <Crown className="h-4 w-4 mr-2" />
            {user.isPlatformAdmin ? "Quitar Admin Plataforma" : "Hacer Admin Plataforma"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => {
            setAssignDialog(user);
            setSelectedOrgId(user.current_organization_id || "");
            setSelectedRole(user.roles[0] || "creator");
          }}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            {user.current_organization_id ? "Cambiar organización" : "Asignar a organización"}
          </DropdownMenuItem>
          {user.current_organization_id && (
            <DropdownMenuItem onClick={() => handleRemoveFromOrg(user)}>
              <XCircle className="h-4 w-4 mr-2" />
              Remover de organización
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
            <Mail className="h-4 w-4 mr-2" />
            Enviar reset de contraseña
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setDeleteConfirm(user)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar usuario
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Gestión de Usuarios de Plataforma</h2>
        <p className="text-sm text-muted-foreground">
          Administra todos los usuarios y asígnalos a organizaciones
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por org" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las orgs</SelectItem>
            <SelectItem value="unassigned">Sin organización</SelectItem>
            {organizations.map(org => (
              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={fetchData} variant="outline" size="icon">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      <Tabs defaultValue="platform-admins" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="platform-admins" className="gap-2">
            <Crown className="h-4 w-4" />
            Admins Plataforma ({platformAdmins.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            Todos ({filteredUsers.length})
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Sin asignar ({unassignedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="assigned" className="gap-2">
            <Building2 className="h-4 w-4" />
            Asignados ({assignedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform-admins" className="mt-4">
          <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                <Crown className="h-4 w-4 inline mr-2 text-amber-500" />
                Los administradores de plataforma tienen acceso completo para ayudarte a gestionar toda la plataforma. 
                Puedes agregar o quitar este rol desde el menú de acciones de cualquier usuario.
              </p>
            </CardContent>
          </Card>
          {platformAdmins.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No hay administradores de plataforma asignados (aparte de ti)
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {platformAdmins.map(user => (
                <UserCard key={user.id} user={user} showPlatformAdminToggle />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No se encontraron usuarios
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(user => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unassigned" className="mt-4">
          {unassignedUsers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Todos los usuarios están asignados a una organización
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {unassignedUsers.map(user => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assigned" className="mt-4">
          {assignedUsers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No hay usuarios asignados
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {assignedUsers.map(user => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign to Org Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar a Organización</DialogTitle>
            <DialogDescription>
              Asigna a {assignDialog?.full_name} a una organización con un rol específico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Organización</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona organización" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
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
                  {ORG_ASSIGNABLE_ROLES.map(role => (
                    <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignToOrg} disabled={!selectedOrgId || actionLoading === assignDialog?.id}>
              {actionLoading === assignDialog?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente a <strong>{deleteConfirm?.full_name}</strong> ({deleteConfirm?.email}).
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === deleteConfirm?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
