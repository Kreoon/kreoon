import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useTrialGuard } from '@/hooks/useTrialGuard';
import { useUsersWithHealth } from '@/hooks/useCrm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Profile, AppRole } from '@/types/database';
import { AmbassadorBadge } from '@/components/ui/ambassador-badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { ViewModeToggle, type ViewMode } from '@/components/crm/ViewModeToggle';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/roles';
import { getPermissionGroup } from '@/lib/permissionGroups';
import { UnifiedRolePicker } from '@/components/roles/UnifiedRolePicker';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, User, Users, Shield, Camera, Film, TrendingUp, Palette,
  Loader2, Send, UserPlus, Search, Swords, Building2, Activity,
  Clock, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserWithHealth } from '@/services/crm/platformCrmService';

type MemberProfile = Profile & { roles: AppRole[]; isOrgMember: boolean; isOwner?: boolean };

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const text = score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={cn('text-xs font-medium tabular-nums', text)}>{score}</span>
    </div>
  );
}

/**
 * Sección "Sin Asignar" extraída de Team.tsx para ser embebida en UnifiedTalentPage.
 *
 * Contiene:
 * - Fetching de org members con roles = []
 * - Health bar via useUsersWithHealth
 * - Dialog de asignación de rol (add/replace) vía UnifiedRolePicker
 * - UserCard simple: avatar + nombre + email + última actividad + health bar + botón Rol
 *
 * Toda la lógica de handlers está DENTRO de la función (no como props).
 */
export function SinAsignarSection() {
  const { user, profile: authProfile } = useAuth();
  const { toast } = useToast();
  const { currentOrg } = useOrganizations();
  const { data: healthData = [] } = useUsersWithHealth();

  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchTerm, setSearchTerm] = useState('');

  const [addRoleDialog, setAddRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MemberProfile | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('content_creator');
  const [roleAction, setRoleAction] = useState<'add' | 'replace'>('replace');

  const currentOrgId = authProfile?.current_organization_id || currentOrg?.id;

  // Health map para O(1) lookup
  const healthMap = useMemo(() => {
    const m = new Map<string, UserWithHealth>();
    healthData.forEach(u => m.set(u.id, u));
    return m;
  }, [healthData]);

  useEffect(() => {
    if (currentOrgId) fetchData();
  }, [currentOrgId]);

  const fetchData = async () => {
    if (!currentOrgId) { setLoading(false); return; }
    try {
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('user_id, is_owner, role')
        .eq('organization_id', currentOrgId);

      const memberUserIds = membersData?.map(m => m.user_id) || [];
      if (memberUserIds.length === 0) { setProfiles([]); setLoading(false); return; }

      const { data: memberRolesData } = await supabase
        .from('organization_member_roles')
        .select('user_id, role')
        .eq('organization_id', currentOrgId);

      const rolesByUser = new Map<string, AppRole[]>();
      (memberRolesData || []).forEach(mr => {
        const existing = rolesByUser.get(mr.user_id) || [];
        existing.push(mr.role as AppRole);
        rolesByUser.set(mr.user_id, existing);
      });

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberUserIds)
        .order('full_name', { ascending: true });

      const combined = (profilesData || []).map(profile => {
        const member = membersData?.find(m => m.user_id === profile.id);
        return {
          ...profile,
          roles: rolesByUser.get(profile.id) || [],
          isOrgMember: true,
          isOwner: member?.is_owner || false,
        };
      });
      setProfiles(combined as MemberProfile[]);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !currentOrgId) return;
    try {
      if (roleAction === 'replace') {
        await supabase.from('organization_member_roles').delete()
          .eq('user_id', selectedUser.id).eq('organization_id', currentOrgId);
      }
      const { error } = await supabase.from('organization_member_roles').upsert({
        organization_id: currentOrgId, user_id: selectedUser.id,
        role: newRole, assigned_by: user?.id,
      }, { onConflict: 'organization_id,user_id,role' });
      if (error) throw error;
      await supabase.from('organization_members').update({ role: newRole })
        .eq('user_id', selectedUser.id).eq('organization_id', currentOrgId);
      toast({ description: `Rol ${roleAction === 'replace' ? 'actualizado' : 'agregado'} a ${selectedUser.full_name}` });
      setAddRoleDialog(false);
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'No se pudo gestionar el rol', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentOrgId) {
    return (
      <div className="p-4 md:p-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin organización seleccionada</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filtro de búsqueda
  const filtered = searchTerm
    ? profiles.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : profiles;

  // Solo los que no tienen roles
  const noRole = filtered.filter(p => p.roles.length === 0);

  // Stats de la vista
  const activeCount = noRole.filter(p => {
    const h = healthMap.get(p.id);
    return h && h.health_score >= 70;
  }).length;
  const atRisk = noRole.filter(p => {
    const h = healthMap.get(p.id);
    return h && h.health_score < 40;
  }).length;

  // ---- Componente UserCard (vista cards) ----
  const UserCard = ({ profile }: { profile: MemberProfile }) => {
    const health = healthMap.get(profile.id);
    const lastLogin = health?.last_login_at
      ? formatDistanceToNow(new Date(health.last_login_at), { addSuffix: true, locale: es })
      : null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/50 rounded-sm border border-border/50 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{profile.full_name || '(sin nombre)'}</p>
              {profile.is_ambassador && <AmbassadorBadge size="sm" variant="default" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            {lastLogin && (
              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> {lastLogin}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
          {health && <HealthBar score={health.health_score} />}
          <Badge variant="outline" className="text-muted-foreground text-xs">Sin rol</Badge>
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs"
            onClick={() => { setSelectedUser(profile); setAddRoleDialog(true); }}>
            <Plus className="w-3 h-3" /> Rol
          </Button>
        </div>
      </div>
    );
  };

  // ---- Componente UserRow (vista tabla) ----
  const UserRow = ({ profile }: { profile: MemberProfile }) => {
    const health = healthMap.get(profile.id);
    const lastLogin = health?.last_login_at
      ? formatDistanceToNow(new Date(health.last_login_at), { addSuffix: true, locale: es })
      : '—';
    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium leading-none">{profile.full_name || '(sin nombre)'}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">Sin rol</Badge>
        </TableCell>
        <TableCell>
          {health ? <HealthBar score={health.health_score} /> : <span className="text-xs text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{lastLogin}</TableCell>
        <TableCell className="text-xs text-muted-foreground text-right">
          {health?.total_actions ?? '—'}
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
            onClick={() => { setSelectedUser(profile); setAddRoleDialog(true); }}>
            <Plus className="w-3 h-3" /> Rol
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        icon={Swords}
        title="Gestión de Equipo"
        subtitle={`${noRole.length} sin asignar · ${activeCount} activos · ${atRisk} en riesgo`}
        action={<ViewModeToggle value={viewMode} onChange={setViewMode} />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-yellow-500/20 flex items-center justify-center">
              <Activity className="h-4 w-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{noRole.length}</p>
              <p className="text-xs text-muted-foreground">Sin asignar</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Activos (salud &ge;70)</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{atRisk}</p>
              <p className="text-xs text-muted-foreground">En riesgo (salud &lt;40)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o email..." value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* Lista de miembros sin rol */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-muted-foreground" />
            Sin Asignar ({noRole.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {noRole.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">
              {searchTerm ? 'No se encontraron miembros sin rol' : 'Todos los miembros tienen rol asignado'}
            </p>
          ) : viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Salud</TableHead>
                  <TableHead>Última actividad</TableHead>
                  <TableHead className="text-right">Acciones totales</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {noRole.map(p => <UserRow key={p.id} profile={p} />)}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-2">
              {noRole.map(p => <UserCard key={p.id} profile={p} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Management Dialog */}
      <Dialog open={addRoleDialog} onOpenChange={setAddRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Asignar rol a {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant={roleAction === 'replace' ? 'default' : 'outline'}
                onClick={() => setRoleAction('replace')}>Reemplazar</Button>
              <Button size="sm" variant={roleAction === 'add' ? 'default' : 'outline'}
                onClick={() => setRoleAction('add')}>Agregar</Button>
            </div>
            <UnifiedRolePicker value={newRole}
              onChange={v => setNewRole((Array.isArray(v) ? v[0] : v) as AppRole)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoleDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddRole}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Default export de Team.tsx — versión completa de gestión de equipo.
 * La ruta /team en App.tsx redirige a /talent?tab=sin-asignar,
 * por lo que este componente solo se activa si se navega directamente.
 */
export default function Team() {
  const { user, profile: authProfile } = useAuth();
  const { toast } = useToast();
  const { currentOrg } = useOrganizations();
  const { guardAction, isReadOnly } = useTrialGuard();
  const { data: healthData = [] } = useUsersWithHealth();

  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchTerm, setSearchTerm] = useState('');

  const [addRoleDialog, setAddRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MemberProfile | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('content_creator');
  const [roleAction, setRoleAction] = useState<'add' | 'replace'>('replace');

  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'content_creator' as AppRole });
  const [sendingInvite, setSendingInvite] = useState(false);

  const currentOrgId = authProfile?.current_organization_id || currentOrg?.id;

  // Health map for O(1) lookup
  const healthMap = useMemo(() => {
    const m = new Map<string, UserWithHealth>();
    healthData.forEach(u => m.set(u.id, u));
    return m;
  }, [healthData]);

  useEffect(() => {
    if (currentOrgId) fetchData();
  }, [currentOrgId]);

  const fetchData = async () => {
    if (!currentOrgId) { setLoading(false); return; }
    try {
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('user_id, is_owner, role')
        .eq('organization_id', currentOrgId);

      const memberUserIds = membersData?.map(m => m.user_id) || [];
      if (memberUserIds.length === 0) { setProfiles([]); setLoading(false); return; }

      const { data: memberRolesData } = await supabase
        .from('organization_member_roles')
        .select('user_id, role')
        .eq('organization_id', currentOrgId);

      const rolesByUser = new Map<string, AppRole[]>();
      (memberRolesData || []).forEach(mr => {
        const existing = rolesByUser.get(mr.user_id) || [];
        existing.push(mr.role as AppRole);
        rolesByUser.set(mr.user_id, existing);
      });

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberUserIds)
        .order('full_name', { ascending: true });

      const combined = (profilesData || []).map(profile => {
        const member = membersData?.find(m => m.user_id === profile.id);
        return {
          ...profile,
          roles: rolesByUser.get(profile.id) || [],
          isOrgMember: true,
          isOwner: member?.is_owner || false,
        };
      });
      setProfiles(combined as MemberProfile[]);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !currentOrgId) return;
    try {
      if (roleAction === 'replace') {
        await supabase.from('organization_member_roles').delete()
          .eq('user_id', selectedUser.id).eq('organization_id', currentOrgId);
      }
      const { error } = await supabase.from('organization_member_roles').upsert({
        organization_id: currentOrgId, user_id: selectedUser.id,
        role: newRole, assigned_by: user?.id,
      }, { onConflict: 'organization_id,user_id,role' });
      if (error) throw error;
      await supabase.from('organization_members').update({ role: newRole })
        .eq('user_id', selectedUser.id).eq('organization_id', currentOrgId);
      toast({ description: `Rol ${roleAction === 'replace' ? 'actualizado' : 'agregado'} a ${selectedUser.full_name}` });
      setAddRoleDialog(false);
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'No se pudo gestionar el rol', variant: 'destructive' });
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    if (!currentOrgId) return;
    try {
      await supabase.from('organization_member_roles').delete()
        .eq('user_id', userId).eq('organization_id', currentOrgId).eq('role', role);
      toast({ description: `Rol ${getRoleLabel(role)} eliminado` });
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el rol', variant: 'destructive' });
    }
  };

  const handleSendInvitation = async () => {
    if (isReadOnly) { guardAction(() => {}); return; }
    if (!inviteData.email) {
      toast({ title: 'Error', description: 'El email es requerido', variant: 'destructive' }); return;
    }
    setSendingInvite(true);
    try {
      const response = await supabase.functions.invoke('send-invitation', {
        body: { email: inviteData.email, role: inviteData.role, inviter_name: user?.email || 'Admin' },
      });
      if (response.error) throw response.error;
      toast({ description: `Invitación enviada a ${inviteData.email}` });
      setInviteDialog(false);
      setInviteData({ email: '', role: 'content_creator' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo enviar la invitación', variant: 'destructive' });
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

  // Filtro de búsqueda
  const filtered = searchTerm
    ? profiles.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : profiles;

  // Agrupaciones por los 7 roles base
  const noRole     = filtered.filter(p => p.roles.length === 0);
  const admins     = filtered.filter(p => p.roles.some(r => getPermissionGroup(r) === 'admin'));
  const creators   = filtered.filter(p => p.roles.some(r => ['content_creator', 'creator'].includes(r)));
  const editors    = filtered.filter(p => p.roles.some(r => ['editor', 'video_editor'].includes(r)));
  const digital    = filtered.filter(p => p.roles.some(r => ['digital_strategist', 'strategist', 'trafficker'].includes(r)));
  const creative   = filtered.filter(p => p.roles.some(r => r === 'creative_strategist'));
  const community  = filtered.filter(p => p.roles.some(r => r === 'community_manager'));
  const clients    = filtered.filter(p => p.roles.some(r => getPermissionGroup(r) === 'client'));

  // Stats
  const activeCount = filtered.filter(p => {
    const h = healthMap.get(p.id);
    return h && h.health_score >= 70;
  }).length;
  const atRisk = filtered.filter(p => {
    const h = healthMap.get(p.id);
    return h && h.health_score < 40;
  }).length;

  // ---- Componente UserCard (vista cards) ----
  const UserCard = ({ profile }: { profile: MemberProfile }) => {
    const health = healthMap.get(profile.id);
    const lastLogin = health?.last_login_at
      ? formatDistanceToNow(new Date(health.last_login_at), { addSuffix: true, locale: es })
      : null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/50 rounded-sm border border-border/50 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{profile.full_name || '(sin nombre)'}</p>
              {profile.is_ambassador && <AmbassadorBadge size="sm" variant="default" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            {lastLogin && (
              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> {lastLogin}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
          {health && <HealthBar score={health.health_score} />}
          {profile.roles.length === 0 ? (
            <Badge variant="outline" className="text-muted-foreground text-xs">Sin rol</Badge>
          ) : (
            profile.roles.map(role => (
              <Badge key={role} className={cn(getRoleBadgeColor(role), 'cursor-pointer text-xs hover:opacity-75')}
                onClick={() => handleRemoveRole(profile.id, role)} title="Clic para eliminar rol">
                {getRoleLabel(role)} ×
              </Badge>
            ))
          )}
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs"
            onClick={() => { setSelectedUser(profile); setAddRoleDialog(true); }}>
            <Plus className="w-3 h-3" /> Rol
          </Button>
        </div>
      </div>
    );
  };

  // ---- Componente UserRow (vista tabla) ----
  const UserRow = ({ profile }: { profile: MemberProfile }) => {
    const health = healthMap.get(profile.id);
    const lastLogin = health?.last_login_at
      ? formatDistanceToNow(new Date(health.last_login_at), { addSuffix: true, locale: es })
      : '—';
    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium leading-none">{profile.full_name || '(sin nombre)'}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {profile.roles.length === 0 ? (
              <Badge variant="outline" className="text-xs">Sin rol</Badge>
            ) : profile.roles.map(role => (
              <Badge key={role} className={cn(getRoleBadgeColor(role), 'text-xs cursor-pointer hover:opacity-75')}
                onClick={() => handleRemoveRole(profile.id, role)} title="Clic para eliminar">
                {getRoleLabel(role)} ×
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell>
          {health ? <HealthBar score={health.health_score} /> : <span className="text-xs text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{lastLogin}</TableCell>
        <TableCell className="text-xs text-muted-foreground text-right">
          {health?.total_actions ?? '—'}
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
            onClick={() => { setSelectedUser(profile); setAddRoleDialog(true); }}>
            <Plus className="w-3 h-3" /> Rol
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  const MemberList = ({ list }: { list: MemberProfile[] }) => {
    if (list.length === 0) {
      return <p className="text-muted-foreground text-center py-8 text-sm">Sin miembros en esta categoría</p>;
    }
    if (viewMode === 'table') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Salud</TableHead>
              <TableHead>Última actividad</TableHead>
              <TableHead className="text-right">Acciones totales</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map(p => <UserRow key={p.id} profile={p} />)}
          </TableBody>
        </Table>
      );
    }
    return (
      <div className="space-y-2">
        {list.map(p => <UserCard key={p.id} profile={p} />)}
      </div>
    );
  };

  if (!currentOrgId) {
    return (
      <div className="p-4 md:p-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin organización seleccionada</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        icon={Swords}
        title="Gestión de Equipo"
        subtitle={`${filtered.length} miembros · ${noRole.length} sin asignar · ${atRisk} en riesgo`}
        action={
          <div className="flex items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={isReadOnly}
                  onClick={(e) => { if (isReadOnly) { e.preventDefault(); guardAction(() => {}); } }}>
                  <UserPlus className="w-4 h-4" /> Invitar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Invitar nuevo miembro</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invite-email">Email *</Label>
                    <Input id="invite-email" type="email" value={inviteData.email}
                      onChange={e => setInviteData({ ...inviteData, email: e.target.value })}
                      placeholder="usuario@ejemplo.com" />
                  </div>
                  <div>
                    <Label>Rol</Label>
                    <UnifiedRolePicker value={inviteData.role}
                      onChange={v => setInviteData({ ...inviteData, role: (Array.isArray(v) ? v[0] : v) as AppRole })}
                      showClientRoles={false} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialog(false)}>Cancelar</Button>
                  <Button onClick={handleSendInvitation} disabled={sendingInvite} className="gap-2">
                    {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-purple-500/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <div><p className="text-xl font-bold">{filtered.length}</p><p className="text-xs text-muted-foreground">Total</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            <div><p className="text-xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Activos (salud &ge;70)</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div><p className="text-xl font-bold">{atRisk}</p><p className="text-xs text-muted-foreground">En riesgo (salud &lt;40)</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-yellow-500/20 flex items-center justify-center">
              <Activity className="h-4 w-4 text-yellow-400" />
            </div>
            <div><p className="text-xl font-bold">{noRole.length}</p><p className="text-xs text-muted-foreground">Sin asignar</p></div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o email..." value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="no-role" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="no-role" className="gap-1.5">
            <User className="w-3.5 h-3.5" /> Sin Asignar ({noRole.length})
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Admins ({admins.length})
          </TabsTrigger>
          <TabsTrigger value="creators" className="gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Creadores ({creators.length})
          </TabsTrigger>
          <TabsTrigger value="editors" className="gap-1.5">
            <Film className="w-3.5 h-3.5" /> Editores ({editors.length})
          </TabsTrigger>
          <TabsTrigger value="digital" className="gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Estrategas ({digital.length})
          </TabsTrigger>
          <TabsTrigger value="creative" className="gap-1.5">
            <Palette className="w-3.5 h-3.5" /> Creativos ({creative.length})
          </TabsTrigger>
          <TabsTrigger value="community" className="gap-1.5">
            <Users className="w-3.5 h-3.5" /> Community ({community.length})
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Clientes ({clients.length})
          </TabsTrigger>
        </TabsList>

        {[
          { key: 'no-role',   label: 'Sin Asignar',            list: noRole,   icon: User,       color: 'text-muted-foreground' },
          { key: 'admins',    label: 'Administradores',         list: admins,   icon: Shield,     color: 'text-purple-500' },
          { key: 'creators',  label: 'Creadores de Contenido',  list: creators, icon: Camera,     color: 'text-pink-500' },
          { key: 'editors',   label: 'Editores',                list: editors,  icon: Film,       color: 'text-blue-500' },
          { key: 'digital',   label: 'Estrategas Digitales',    list: digital,  icon: TrendingUp, color: 'text-green-500' },
          { key: 'creative',  label: 'Estrategas Creativos',    list: creative, icon: Palette,    color: 'text-orange-500' },
          { key: 'community', label: 'Community Managers',      list: community,icon: Users,      color: 'text-teal-500' },
          { key: 'clients',   label: 'Clientes / Marcas',       list: clients,  icon: Building2,  color: 'text-amber-500' },
        ].map(({ key, label, list, icon: Icon, color }) => (
          <TabsContent key={key} value={key} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className={cn('w-4 h-4', color)} />
                  {label} ({list.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MemberList list={list} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Role Management Dialog */}
      <Dialog open={addRoleDialog} onOpenChange={setAddRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.roles.length ? 'Cambiar rol de' : 'Asignar rol a'} {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser?.roles.length ? (
              <div className="p-3 bg-muted/50 rounded-sm border">
                <p className="text-sm text-muted-foreground mb-2">Roles actuales:</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedUser.roles.map(role => (
                    <Badge key={role} className={getRoleBadgeColor(role)}>{getRoleLabel(role)}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button size="sm" variant={roleAction === 'replace' ? 'default' : 'outline'}
                onClick={() => setRoleAction('replace')}>Reemplazar</Button>
              <Button size="sm" variant={roleAction === 'add' ? 'default' : 'outline'}
                onClick={() => setRoleAction('add')}>Agregar</Button>
            </div>
            <UnifiedRolePicker value={newRole}
              onChange={v => setNewRole((Array.isArray(v) ? v[0] : v) as AppRole)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoleDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddRole}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
