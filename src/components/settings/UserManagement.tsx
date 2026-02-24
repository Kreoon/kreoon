import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
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
  CheckCircle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AppRole } from "@/types/database";
import { getRoleLabel, getRoleBadgeColor, SELECTABLE_ROLES } from "@/lib/roles";

const ROOT_EMAIL = "jacsolucionesgraficas@gmail.com";

// Roles that can be assigned in user management (all roles including system)
const ASSIGNABLE_ROLES = SELECTABLE_ROLES;

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
}

export function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserData | null>(null);

  const isRoot = profile?.email === ROOT_EMAIL;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_users" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setUsers(data.users || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRoot) {
      fetchUsers();
    }
  }, [isRoot]);

  const handleSendPasswordReset = async (email: string) => {
    setActionLoading(`reset-${email}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: "send_password_reset", email },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      toast.success(`Correo de recuperación enviado a ${email}`);
    } catch (error: any) {
      toast.error("Error al enviar correo de recuperación");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBan = async (userId: string, currentlyBanned: boolean) => {
    setActionLoading(`ban-${userId}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "toggle_ban", userId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, banned: data.banned } : u
      ));
      
      toast.success(data.banned ? "Usuario bloqueado" : "Usuario desbloqueado");
    } catch (error: any) {
      toast.error("Error al cambiar estado del usuario");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (userId: string, role: AppRole) => {
    setActionLoading(`role-${userId}-${role}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_role", userId, role },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u;
        return {
          ...u,
          roles: data.added 
            ? [...u.roles, role]
            : u.roles.filter(r => r !== role)
        };
      }));
      
      toast.success(data.added ? `Rol ${getRoleLabel(role)} agregado` : `Rol ${getRoleLabel(role)} removido`);
    } catch (error: any) {
      toast.error("Error al cambiar rol");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    
    setActionLoading(`delete-${deleteConfirm.id}`);
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete_user", userId: deleteConfirm.id }
      });

      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id));
      toast.success("Usuario eliminado");
    } catch (error: any) {
      toast.error("Error al eliminar usuario");
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  };

  if (!isRoot) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No tienes permisos para acceder a esta sección</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Usuarios
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchUsers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No se encontraron usuarios
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{user.full_name}</p>
                          {user.email === ROOT_EMAIL && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
                              Root
                            </Badge>
                          )}
                          {user.banned && (
                            <Badge variant="destructive" className="text-xs">
                              Bloqueado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {user.email_confirmed_at ? (
                            <span className="flex items-center gap-1 text-xs text-green-500">
                              <CheckCircle className="h-3 w-3" />
                              Verificado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-500">
                              <XCircle className="h-3 w-3" />
                              Sin verificar
                            </span>
                          )}
                          {user.last_sign_in_at && (
                            <span className="text-xs text-muted-foreground">
                              · Último acceso: {format(new Date(user.last_sign_in_at), "dd MMM yyyy", { locale: es })}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {user.roles.map(role => (
                            <Badge 
                              key={role} 
                              variant="outline" 
                              className={`text-xs ${getRoleBadgeColor(role)}`}
                            >
                              {getRoleLabel(role)}
                            </Badge>
                          ))}
                          {user.roles.length === 0 && (
                            <span className="text-xs text-muted-foreground">Sin roles asignados</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {user.email !== ROOT_EMAIL && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            onClick={() => handleSendPasswordReset(user.email)}
                            disabled={actionLoading === `reset-${user.email}`}
                          >
                            {actionLoading === `reset-${user.email}` ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4 mr-2" />
                            )}
                            Enviar reseteo de contraseña
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => handleToggleBan(user.id, user.banned)}
                            disabled={actionLoading === `ban-${user.id}`}
                          >
                            {actionLoading === `ban-${user.id}` ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Ban className="h-4 w-4 mr-2" />
                            )}
                            {user.banned ? "Desbloquear usuario" : "Bloquear usuario"}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Roles</DropdownMenuLabel>
                          
                          {SELECTABLE_ROLES.map(role => (
                            <DropdownMenuCheckboxItem
                              key={role}
                              checked={user.roles.includes(role)}
                              onCheckedChange={() => handleToggleRole(user.id, role)}
                              disabled={actionLoading === `role-${user.id}-${role}`}
                            >
                              {getRoleLabel(role)}
                            </DropdownMenuCheckboxItem>
                          ))}

                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            onClick={() => setDeleteConfirm(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar usuario
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta de{" "}
              <strong>{deleteConfirm?.email}</strong> y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading?.startsWith("delete-") ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
