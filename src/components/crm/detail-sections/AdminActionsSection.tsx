import { useState, useEffect } from 'react';
import {
  Building2, ShieldCheck, ShieldOff, KeyRound, Ban, UserX, UserPlus,
  Loader2, AlertTriangle, Trash2, UserCog, Crown, Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DetailSection } from '../DetailSection';
import { supabase } from '@/integrations/supabase/client';
import { ORG_ASSIGNABLE_ROLES, getRoleLabel } from '@/lib/roles';
import type { AppRole } from '@/types/database';

const ROOT_EMAILS = ['jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com'];

// 8 global niche roles for assignment (simplified from 36 marketplace roles)
const ALL_ASSIGNABLE_ROLES: { value: string; label: string }[] =
  ORG_ASSIGNABLE_ROLES.map(r => ({ value: r, label: getRoleLabel(r) }));

interface AdminActionsSectionProps {
  userId: string;
  userEmail: string;
  userName: string | null;
  hasProfile: boolean;
  isPlatformAdmin: boolean;
  isBanned: boolean;
  orgId: string | null;
  orgName: string | null;
  isOwner: boolean;
  activeRole: string | null;
  currentUserEmail: string;
  platformAccessUnlocked?: boolean;
  onActionComplete: () => void;
}

export function AdminActionsSection({
  userId,
  userEmail,
  userName,
  hasProfile,
  isPlatformAdmin,
  isBanned,
  orgId,
  orgName,
  isOwner,
  activeRole,
  currentUserEmail,
  platformAccessUnlocked,
  onActionComplete,
}: AdminActionsSectionProps) {
  const isRoot = ROOT_EMAILS.includes(currentUserEmail);
  const [loading, setLoading] = useState<string | null>(null);

  // Change role state
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [selectedActiveRole, setSelectedActiveRole] = useState<string>(activeRole || 'none');

  // Assign to org state
  const [assignOpen, setAssignOpen] = useState(false);
  const [allOrgs, setAllOrgs] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [assignAsOwner, setAssignAsOwner] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (assignOpen && allOrgs.length === 0) {
      supabase
        .from('organizations')
        .select('id, name')
        .order('name')
        .then(({ data }) => {
          if (data) setAllOrgs(data);
        });
    }
  }, [assignOpen, allOrgs.length]);

  const invokeAdmin = async (action: string, body: Record<string, unknown>) => {
    setLoading(action);
    try {
      // Get auth token for the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action, ...body },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    } finally {
      setLoading(null);
    }
  };

  const handleTogglePlatformAdmin = async () => {
    try {
      await invokeAdmin('update_role', { userId, role: 'admin' });
      toast.success(isPlatformAdmin ? 'Admin plataforma removido' : 'Admin plataforma asignado');
      onActionComplete();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const handleSetActiveRole = async () => {
    if (!selectedActiveRole) return;
    const roleValue = selectedActiveRole === 'none' ? null : selectedActiveRole;
    try {
      await invokeAdmin('set_active_role', { userId, activeRole: roleValue });
      toast.success(roleValue ? `Rol cambiado a ${getRoleLabel(roleValue as AppRole)}` : 'Rol removido');
      setChangeRoleOpen(false);
      onActionComplete();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const handleResetPassword = async () => {
    try {
      await invokeAdmin('send_password_reset', { email: userEmail });
      toast.success('Email de reset enviado');
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const handleToggleBan = async () => {
    try {
      await invokeAdmin('toggle_ban', { userId });
      toast.success(isBanned ? 'Usuario desbloqueado' : 'Usuario bloqueado');
      onActionComplete();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const handleCreateProfile = async () => {
    try {
      await invokeAdmin('create_profile', {
        userId,
        email: userEmail,
        fullName: userName || userEmail.split('@')[0],
      });
      toast.success('Perfil creado');
      onActionComplete();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const handleAssignToOrg = async () => {
    if (!selectedOrgId) return;
    try {
      await invokeAdmin('assign_to_org', {
        userId,
        organizationId: selectedOrgId,
        assignRole: selectedRole && selectedRole !== 'none' ? selectedRole : null,
        makeOwner: assignAsOwner,
      });
      toast.success('Usuario asignado a organización');
      setAssignOpen(false);
      onActionComplete();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const handleToggleOwner = async () => {
    try {
      await invokeAdmin('set_owner', { userId, organizationId: orgId, makeOwner: !isOwner });
      toast.success(isOwner ? 'Propietario removido' : 'Propietario asignado');
      onActionComplete();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const handleRemoveFromOrg = async () => {
    try {
      await invokeAdmin('remove_from_org', { userId });
      toast.success('Usuario removido de organización');
      onActionComplete();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const handleDeleteUser = async () => {
    try {
      await invokeAdmin('delete_user', { userId });
      toast.success('Usuario eliminado');
      setDeleteOpen(false);
      onActionComplete();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const isSelf = userEmail === currentUserEmail;
  const isTargetRoot = ROOT_EMAILS.includes(userEmail);

  return (
    <>
      <DetailSection title="Acciones Admin">
        <div className="space-y-2">
          {/* Change Active Role (works without org) */}
          {!changeRoleOpen ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChangeRoleOpen(true)}
              disabled={!!loading}
              className="w-full justify-start gap-2 h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              <UserCog className="h-3.5 w-3.5 text-purple-400" />
              Cambiar rol {activeRole ? `(${getRoleLabel(activeRole as AppRole)})` : '(Sin rol)'}
            </Button>
          ) : (
            <div className="space-y-2 p-2 rounded-sm bg-white/5 border border-white/10">
              <p className="text-[10px] text-white/40">Seleccionar rol de plataforma</p>
              <Select value={selectedActiveRole} onValueChange={setSelectedActiveRole}>
                <SelectTrigger className="h-8 text-xs bg-transparent border-white/10">
                  <SelectValue placeholder="Rol..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-white/40">Sin rol</span>
                  </SelectItem>
                  {ALL_ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSetActiveRole}
                  disabled={!selectedActiveRole || !!loading}
                  className="h-7 text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
                >
                  {loading === 'set_active_role' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setChangeRoleOpen(false)}
                  className="h-7 text-xs text-white/50"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Toggle Platform Admin */}
          {!isSelf && !isTargetRoot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePlatformAdmin}
              disabled={!!loading}
              className="w-full justify-start gap-2 h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              {loading === 'update_role' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isPlatformAdmin ? (
                <ShieldOff className="h-3.5 w-3.5 text-orange-400" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              )}
              {isPlatformAdmin ? 'Quitar Admin Plataforma' : 'Hacer Admin Plataforma'}
            </Button>
          )}

          {/* Grant Platform Access (Dar Llave) */}
          {!platformAccessUnlocked && !isSelf && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                setLoading('grant_access');
                try {
                  const { data: { user: currentUser } } = await supabase.auth.getUser();
                  if (!currentUser) throw new Error('No autenticado');
                  const { data, error } = await supabase.rpc('grant_platform_access', {
                    p_admin_id: currentUser.id,
                    p_target_user_id: userId,
                  });
                  if (error) throw error;
                  if (data && !(data as any).success) throw new Error((data as any).error || 'Error');
                  toast.success('Acceso a plataforma otorgado');
                  onActionComplete();
                } catch (e: any) {
                  toast.error(`Error: ${e.message}`);
                } finally {
                  setLoading(null);
                }
              }}
              disabled={!!loading}
              className="w-full justify-start gap-2 h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              {loading === 'grant_access' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Key className="h-3.5 w-3.5 text-amber-400" />
              )}
              Dar Llave (desbloquear plataforma)
            </Button>
          )}

          {/* Toggle Owner */}
          {orgId && !isSelf && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleOwner}
              disabled={!!loading}
              className="w-full justify-start gap-2 h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              {loading === 'set_owner' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Crown className={cn('h-3.5 w-3.5', isOwner ? 'text-yellow-400' : 'text-white/40')} />
              )}
              {isOwner ? 'Quitar propietario' : 'Hacer propietario de org'}
            </Button>
          )}

          {/* Assign to Org */}
          {!assignOpen ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAssignOpen(true)}
              disabled={!!loading}
              className="w-full justify-start gap-2 h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              <Building2 className="h-3.5 w-3.5 text-blue-400" />
              {orgId ? 'Cambiar organización' : 'Asignar a organización'}
            </Button>
          ) : (
            <div className="space-y-2 p-2 rounded-sm bg-white/5 border border-white/10">
              <p className="text-[10px] text-white/40">Seleccionar organización y rol</p>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="h-8 text-xs bg-transparent border-white/10">
                  <SelectValue placeholder="Organización..." />
                </SelectTrigger>
                <SelectContent>
                  {allOrgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-8 text-xs bg-transparent border-white/10">
                  <SelectValue placeholder="Rol (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-white/40">Sin rol</span>
                  </SelectItem>
                  {ORG_ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {getRoleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <Checkbox
                  checked={assignAsOwner}
                  onCheckedChange={(v) => setAssignAsOwner(v === true)}
                  className="border-white/20 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                />
                <span className="flex items-center gap-1 text-xs text-white/60">
                  <Crown className="h-3 w-3 text-yellow-400" />
                  Asignar como propietario
                </span>
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAssignToOrg}
                  disabled={!selectedOrgId || !!loading}
                  className="h-7 text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
                >
                  {loading === 'assign_to_org' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Asignar'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAssignOpen(false)}
                  className="h-7 text-xs text-white/50"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Remove from Org */}
          {orgId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFromOrg}
              disabled={!!loading}
              className="w-full justify-start gap-2 h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              {loading === 'remove_from_org' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserX className="h-3.5 w-3.5 text-orange-400" />
              )}
              Remover de {orgName || 'organización'}
            </Button>
          )}

          {/* Reset Password */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetPassword}
            disabled={!!loading}
            className="w-full justify-start gap-2 h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
          >
            {loading === 'send_password_reset' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="h-3.5 w-3.5 text-yellow-400" />
            )}
            Enviar reset de contraseña
          </Button>

          {/* Create Profile */}
          {!hasProfile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateProfile}
              disabled={!!loading}
              className="w-full justify-start gap-2 h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              {loading === 'create_profile' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
              )}
              Crear perfil
            </Button>
          )}

          {/* Toggle Ban */}
          {!isSelf && !isTargetRoot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleBan}
              disabled={!!loading}
              className="w-full justify-start gap-2 h-8 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
            >
              {loading === 'toggle_ban' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              {isBanned ? 'Desbloquear usuario' : 'Bloquear usuario'}
            </Button>
          )}

          {/* Delete User - Root only */}
          {isRoot && !isSelf && !isTargetRoot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              disabled={!!loading}
              className="w-full justify-start gap-2 h-8 text-xs text-red-500/70 hover:text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar usuario
            </Button>
          )}
        </div>
      </DetailSection>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-popover border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Eliminar usuario
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta acción eliminará permanentemente al usuario <strong className="text-white">{userName || userEmail}</strong> y
              todos sus datos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white/60 hover:bg-white/5">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={!!loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading === 'delete_user' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
