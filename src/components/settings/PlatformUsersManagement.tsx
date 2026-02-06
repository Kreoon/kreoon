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
  active_role?: AppRole | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned: boolean;
  current_organization_id: string | null;
  organization_name: string | null;
  isPlatformAdmin: boolean;
  hasProfile: boolean;
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
      // Fetch ALL users from Supabase Auth via admin edge function
      const { data: authResult, error: authError } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_users" }
      });

      if (authError) {
        console.error("Auth list error:", authError);
        throw authError;
      }

      const authUsers = authResult?.users || [];

      // Fetch profiles for additional data
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, current_organization_id, active_role');

      // Fetch all user roles
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch organizations
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name');

      setOrganizations(orgsData || []);

      // Fetch org memberships for all users
      const userIds = authUsers.map((u: any) => u.id);
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('user_id, organization_id, role')
        .in('user_id', userIds);

      // Build maps
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const orgNamesMap = new Map(orgsData?.map(o => [o.id, o.name]) || []);
      const platformAdminIds = new Set(
        userRolesData?.filter(r => r.role === 'admin').map(r => r.user_id) || []
      );

      // Build enhanced users from auth users (includes ALL registered users)
      const enhancedUsers: UserData[] = authUsers.map((authUser: any) => {
        const profile = profilesMap.get(authUser.id);
        const userMember = membersData?.find(
          m => m.user_id === authUser.id && m.organization_id === (profile?.current_organization_id || null)
        );
        const userRoles = userRolesData?.filter(r => r.user_id === authUser.id).map(r => r.role) || [];

        // Check if user is platform admin
        const isAdminByRole = platformAdminIds.has(authUser.id);
        const isRootUser = authUser.email === ROOT_EMAIL;

        return {
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.full_name || profile?.full_name || 'Sin nombre',
          avatar_url: authUser.avatar_url || profile?.avatar_url || null,
          active_role: (profile?.active_role as AppRole | null) || null,
          roles: userMember?.role
            ? [userMember.role as AppRole]
            : userRoles.length > 0
              ? userRoles as AppRole[]
              : [],
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at || null,
          email_confirmed_at: authUser.email_confirmed_at || null,
          banned: authUser.banned || false,
          current_organization_id: profile?.current_organization_id || null,
          organization_name: profile?.current_organization_id
            ? orgNamesMap.get(profile.current_organization_id) || null
            : null,
          isPlatformAdmin: isAdminByRole || isRootUser,
          hasProfile: !!profile
        };
      });

      setUsers(enhancedUsers);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos: " + (error.message || "Error desconocido"));
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
      console.log("Assigning user to org:", {
        userId: assignDialog.id,
        organizationId: selectedOrgId,
        assignRole: selectedRole,
      });

      // Use admin edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "assign_to_org",
          userId: assignDialog.id,
          organizationId: selectedOrgId,
          assignRole: selectedRole,
        }
      });

      console.log("Response:", { data, error });

      if (error) {
        // Try to extract error message from FunctionsHttpError
        const errorBody = error.context?.body ? await error.context.json().catch(() => null) : null;
        const errorMsg = errorBody?.error || error.message || "Error desconocido";
        throw new Error(errorMsg);
      }
      if (data?.error) throw new Error(data.error);

      toast.success(`${assignDialog.full_name} asignado a la organización`);
      setAssignDialog(null);
      fetchData();
    } catch (error: any) {
      console.error("Error assigning user:", error);
      toast.error("Error al asignar usuario: " + (error.message || "Error desconocido"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFromOrg = async (user: UserData) => {
    if (!user.current_organization_id) return;

    setActionLoading(user.id);
    try {
      // Use admin edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "remove_from_org",
          userId: user.id,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

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
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "send_password_reset", email: user.email }
      });
      if (error) throw error;
      toast.success(`Email de restablecimiento enviado a ${user.email}`);
    } catch (error: any) {
      toast.error("Error al enviar email de restablecimiento: " + (error.message || "Error desconocido"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateProfile = async (user: UserData) => {
    setActionLoading(user.id);
    try {
      // Create profile via admin edge function (bypasses RLS)
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create_profile",
          userId: user.id,
          email: user.email,
          fullName: user.full_name || user.email.split('@')[0],
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Perfil creado para ${user.full_name || user.email}`);
      fetchData();
    } catch (error: any) {
      toast.error("Error al crear perfil: " + (error.message || "Error desconocido"));
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

  // Users without profiles (trigger failed)
  const usersWithoutProfiles = filteredUsers.filter(u => !u.hasProfile);

  // Users with unconfirmed emails
  const unconfirmedUsers = filteredUsers.filter(u => !u.email_confirmed_at);

  // Stats
  const stats = {
    total: users.length,
    confirmed: users.filter(u => u.email_confirmed_at).length,
    withProfiles: users.filter(u => u.hasProfile).length,
    inOrgs: users.filter(u => u.current_organization_id).length
  };

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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{user.full_name}</p>
            {user.isPlatformAdmin && (
              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Admin Plataforma
              </Badge>
            )}
            {user.banned && (
              <Badge variant="destructive" className="text-xs">
                <Ban className="h-3 w-3 mr-1" />
                Bloqueado
              </Badge>
            )}
            {!user.email_confirmed_at && (
              <Badge variant="secondary" className="text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30">
                Email sin confirmar
              </Badge>
            )}
            {!user.hasProfile && (
              <Badge variant="secondary" className="text-xs text-red-600 bg-red-100 dark:bg-red-900/30">
                Sin perfil
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
            {user.last_sign_in_at && (
              <span className="text-xs text-muted-foreground">
                Último acceso: {format(new Date(user.last_sign_in_at), "d MMM yyyy", { locale: es })}
              </span>
            )}
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
            // Use active_role if available, otherwise fallback to first role
            setSelectedRole(user.active_role || user.roles[0] || "creator");
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
          {!user.hasProfile && (
            <DropdownMenuItem onClick={() => handleCreateProfile(user)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Crear perfil
            </DropdownMenuItem>
          )}
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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total usuarios</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          <div className="text-xs text-muted-foreground">Email confirmado</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-blue-600">{stats.withProfiles}</div>
          <div className="text-xs text-muted-foreground">Con perfil</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-purple-600">{stats.inOrgs}</div>
          <div className="text-xs text-muted-foreground">En organizaciones</div>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            Todos ({filteredUsers.length})
          </TabsTrigger>
          <TabsTrigger value="platform-admins" className="gap-2">
            <Crown className="h-4 w-4" />
            Admins ({platformAdmins.length})
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Sin org ({unassignedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="assigned" className="gap-2">
            <Building2 className="h-4 w-4" />
            En org ({assignedUsers.length})
          </TabsTrigger>
          {usersWithoutProfiles.length > 0 && (
            <TabsTrigger value="no-profile" className="gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              Sin perfil ({usersWithoutProfiles.length})
            </TabsTrigger>
          )}
          {unconfirmedUsers.length > 0 && (
            <TabsTrigger value="unconfirmed" className="gap-2 text-yellow-600">
              <Mail className="h-4 w-4" />
              Sin confirmar ({unconfirmedUsers.length})
            </TabsTrigger>
          )}
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

        <TabsContent value="no-profile" className="mt-4">
          <Card className="mb-4 border-red-500/30 bg-red-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                <XCircle className="h-4 w-4 inline mr-2 text-red-500" />
                Estos usuarios se registraron pero el trigger de creación de perfil falló.
                Usa "Crear perfil" en el menú de acciones para solucionar el problema.
              </p>
            </CardContent>
          </Card>
          {usersWithoutProfiles.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Todos los usuarios tienen perfil
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {usersWithoutProfiles.map(user => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unconfirmed" className="mt-4">
          <Card className="mb-4 border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                <Mail className="h-4 w-4 inline mr-2 text-yellow-500" />
                Estos usuarios no han confirmado su email. Puedes enviarles un reset de contraseña
                que también confirmará su email, o esperar a que completen el proceso.
              </p>
            </CardContent>
          </Card>
          {unconfirmedUsers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Todos los usuarios han confirmado su email
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {unconfirmedUsers.map(user => (
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
                  {(["admin", ...ORG_ASSIGNABLE_ROLES] as AppRole[]).filter((r, i, arr) => arr.indexOf(r) === i).map(role => (
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
