import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sword, Users, Heart, DollarSign, Search, Trophy,
  UserPlus, Send, Loader2, Activity, TrendingDown, AlertCircle,
  ChevronDown, Filter,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useToast } from '@/hooks/use-toast';
import { useTrialGuard } from '@/hooks/useTrialGuard';
import { useUnifiedTalent, useToggleAmbassador } from '@/hooks/useUnifiedTalent';
import { useTalentActivityMetrics } from '@/hooks/useTalentActivityMetrics';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UnifiedTalentCard } from '@/components/talent/UnifiedTalentCard';
import { UnifiedTalentDetailPanel } from '@/components/talent/UnifiedTalentDetailPanel';
import { ViewModeToggle, type ViewMode } from '@/components/crm/ViewModeToggle';
import { TalentRanking } from '@/components/team/TalentRanking';
import { UnifiedRolePicker } from '@/components/roles/UnifiedRolePicker';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedTalentMember } from '@/types/unifiedTalent.types';
import type { AppRole } from '@/types/database';
import { UnifiedClientsContent } from './UnifiedClientsPage';
import { SinAsignarSection } from './Team';

// ── Tipos de tab de nivel superior ────────────────────────────────────────────
type TopTab = 'talento' | 'clientes' | 'sin-asignar';

const TOP_TABS: { key: TopTab; label: string }[] = [
  { key: 'talento',     label: 'Talento' },
  { key: 'clientes',    label: 'Clientes' },
  { key: 'sin-asignar', label: 'Sin Asignar' },
];

// ── Tipos de filtro internos de Talento ───────────────────────────────────────
type FilterTab = 'activos' | 'inactivos' | 'todos' | 'ranking';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'activos',   label: 'Activos' },
  { key: 'inactivos', label: 'Inactivos' },
  { key: 'todos',     label: 'Todos' },
  { key: 'ranking',   label: 'Ranking' },
];

type RoleFilter = 'todos' | 'admins' | 'estrategas' | 'creadores' | 'editores' | 'traffickers' | 'embajadores' | 'externos';

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: 'todos',       label: 'Todos los roles' },
  { key: 'creadores',   label: 'Creadores' },
  { key: 'editores',    label: 'Editores' },
  { key: 'estrategas',  label: 'Estrategas' },
  { key: 'traffickers', label: 'Traffickers' },
  { key: 'admins',      label: 'Admins' },
  { key: 'embajadores', label: 'Embajadores' },
  { key: 'externos',    label: 'Externos' },
];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

// ── Sección interna de Talento ─────────────────────────────────────────────────
function TalentoSection() {
  const { isAdmin, isTeamLeader, user } = useAuth();
  const { currentOrgId } = useOrgOwner();
  const { toast } = useToast();
  const { guardAction, isReadOnly } = useTrialGuard();
  const { data: members = [], isLoading, refetch } = useUnifiedTalent(currentOrgId);
  const toggleAmbassador = useToggleAmbassador(currentOrgId);
  const { data: activityMetrics } = useTalentActivityMetrics(currentOrgId);

  const canSeeInternal = isAdmin || isTeamLeader;

  const [filter, setFilter] = useState<FilterTab>(canSeeInternal ? 'activos' : 'todos');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('todos');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedMember, setSelectedMember] = useState<UnifiedTalentMember | null>(null);

  // Map talent_id → metrics for O(1) lookup
  const activityMap = useMemo(() => {
    const map = new Map<string, typeof activityMetrics[0]>();
    activityMetrics?.forEach(m => map.set(m.talent_id, m));
    return map;
  }, [activityMetrics]);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'creator' as AppRole });
  const [sendingInvite, setSendingInvite] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const internal = members.filter(m => m.source !== 'external');
    const external = members.filter(m => m.source !== 'internal');
    const favorites = members.filter(m => m.relationship_type === 'favorite');
    const totalInvested = members.reduce((sum, m) => sum + (m.total_paid || 0), 0);
    const activos = activityMetrics?.filter(m => m.activity_status === 'active').length ?? 0;
    const inactivos = activityMetrics?.filter(m => m.activity_status === 'inactive').length ?? 0;
    const pendingPayment = activityMetrics?.reduce((sum, m) => sum + (m.pending_payment_amount || 0), 0) ?? 0;
    return { internal: internal.length, external: external.length, favorites: favorites.length, totalInvested, activos, inactivos, pendingPayment };
  }, [members, activityMetrics]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = members;

    if (!canSeeInternal) {
      list = list.filter(m => m.source !== 'internal');
    }

    // Activity tab filter (uses activity metrics)
    if (filter === 'activos') {
      list = list.filter(m => m.source !== 'external' && activityMap.get(m.id)?.activity_status === 'active');
    } else if (filter === 'inactivos') {
      list = list.filter(m => m.source !== 'external' && activityMap.get(m.id)?.activity_status === 'inactive');
    } else if (filter === 'todos') {
      list = list.filter(m => m.source === 'external' || (m.all_roles && m.all_roles.length > 0) || m.is_owner);
    }
    // 'ranking' shows all

    // Role dropdown filter
    if (roleFilter !== 'todos') {
      switch (roleFilter) {
        case 'admins':
          list = list.filter(m => ['admin', 'team_leader'].includes(m.org_role || '') || m.is_owner);
          break;
        case 'estrategas':
          list = list.filter(m => m.all_roles?.some(r => ['digital_strategist', 'creative_strategist', 'community_manager', 'strategist'].includes(r)));
          break;
        case 'creadores':
          list = list.filter(m => m.all_roles?.some(r => ['content_creator', 'creator'].includes(r)));
          break;
        case 'editores':
          list = list.filter(m => m.all_roles?.some(r => ['editor', 'video_editor'].includes(r)));
          break;
        case 'traffickers':
          list = list.filter(m => m.all_roles?.some(r => ['digital_strategist', 'trafficker'].includes(r)));
          break;
        case 'embajadores':
          list = list.filter(m => m.is_ambassador);
          break;
        case 'externos':
          list = list.filter(m => m.source !== 'internal');
          break;
      }
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.full_name.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.categories?.some(c => c.toLowerCase().includes(q)) ||
        m.internal_tags?.some(t => t.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [members, filter, roleFilter, search, canSeeInternal, activityMap]);

  // Keep selected member in sync with refreshed data
  const activeMember = selectedMember
    ? members.find(m => m.id === selectedMember.id) || selectedMember
    : null;

  const availableTabs = canSeeInternal
    ? FILTER_TABS
    : FILTER_TABS.filter(t => t.key === 'todos' || t.key === 'ranking');

  // Invite handler
  const handleSendInvitation = async () => {
    if (isReadOnly) { guardAction(() => {}); return; }
    if (!inviteData.email) {
      toast({ title: 'Error', description: 'El email es requerido', variant: 'destructive' });
      return;
    }
    setSendingInvite(true);
    try {
      const response = await supabase.functions.invoke('send-invitation', {
        body: { email: inviteData.email, role: inviteData.role, inviter_name: user?.email || 'Admin' },
      });
      if (response.error) throw response.error;
      toast({ description: `Invitación enviada a ${inviteData.email}` });
      setInviteOpen(false);
      setInviteData({ email: '', role: 'creator' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo enviar la invitación', variant: 'destructive' });
    } finally {
      setSendingInvite(false);
    }
  };

  if (!currentOrgId) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <PageHeader icon={Sword} title="Talento" subtitle="Gestion de equipo interno y talento externo" />
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">Selecciona una organización</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          icon={Sword}
          title="Talento"
          subtitle="Gestion de equipo interno y talento externo"
          action={
            isAdmin ? (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs"
                    onClick={(e) => {
                      if (isReadOnly) { e.preventDefault(); guardAction(() => {}); }
                    }}
                    disabled={isReadOnly}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Invitar Miembro
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invitar nuevo miembro</DialogTitle>
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
                      <UnifiedRolePicker
                        value={inviteData.role}
                        onChange={(v) => setInviteData({ ...inviteData, role: (Array.isArray(v) ? v[0] : v) as AppRole })}
                        showClientRoles={false}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Para agregar clientes, usa la sección Clientes
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSendInvitation} disabled={sendingInvite} className="gap-2">
                      {sendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Enviar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : undefined
          }
        />

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" />
              Equipo
            </div>
            <p className="text-xl font-bold text-card-foreground">{stats.internal}</p>
          </div>
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Heart className="h-3.5 w-3.5" />
              Favoritos
            </div>
            <p className="text-xl font-bold text-card-foreground">{stats.favorites}</p>
          </div>
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Invertido
            </div>
            <p className="text-xl font-bold text-card-foreground">{formatCurrency(stats.totalInvested)}</p>
          </div>
          {canSeeInternal && stats.pendingPayment > 0 && (
            <div className="rounded-sm border border-warning/30 bg-warning/5 p-3">
              <div className="flex items-center gap-2 text-xs text-warning mb-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Por pagar
              </div>
              <p className="text-xl font-bold text-warning">{formatCurrency(stats.pendingPayment)}</p>
            </div>
          )}
        </div>

        {/* Actividad — solo admins */}
        {canSeeInternal && (activityMetrics?.length ?? 0) > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFilter('activos')}
              className={cn(
                'rounded-sm border p-3 text-left transition-all',
                filter === 'activos'
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-border bg-card hover:border-green-500/30',
              )}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Activity className="h-3.5 w-3.5 text-green-400" />
                Talento activo
              </div>
              <p className="text-xl font-bold text-green-400">{stats.activos}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Con contenido en proceso</p>
            </button>
            <button
              onClick={() => setFilter('inactivos')}
              className={cn(
                'rounded-sm border p-3 text-left transition-all',
                filter === 'inactivos'
                  ? 'border-red-500/50 bg-red-500/10'
                  : 'border-border bg-card hover:border-red-500/30',
              )}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                Sin actividad
              </div>
              <p className="text-xl font-bold text-red-400">{stats.inactivos}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sin piezas en progreso</p>
            </button>
          </div>
        )}

        {/* Filter tabs + rol + search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-wrap gap-1">
            {availableTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-sm text-xs font-medium transition-all',
                  filter === tab.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                {tab.key === 'ranking' && <Trophy className="h-3 w-3 inline mr-1" />}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {filter !== 'ranking' && (
              <>
                {/* Role dropdown filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={cn(
                      'h-8 gap-1.5 text-xs',
                      roleFilter !== 'todos' && 'border-primary/50 bg-primary/10 text-primary',
                    )}>
                      <Filter className="h-3 w-3" />
                      {ROLE_FILTERS.find(r => r.key === roleFilter)?.label ?? 'Rol'}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {ROLE_FILTERS.map(r => (
                      <DropdownMenuCheckboxItem
                        key={r.key}
                        checked={roleFilter === r.key}
                        onCheckedChange={() => setRoleFilter(r.key)}
                        className="text-xs"
                      >
                        {r.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar talento..."
                    className="pl-8 h-8 w-48 bg-muted border-border text-white placeholder:text-muted-foreground text-xs"
                  />
                </div>
                <ViewModeToggle value={viewMode} onChange={setViewMode} />
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {filter === 'ranking' ? (
          <TalentRanking />
        ) : (
          <div className="flex gap-4">
            {/* Grid / Table */}
            <div className={cn('flex-1 min-w-0', activeMember && 'md:mr-[440px]')}>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-sm bg-muted" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-sm">
                  <Sword className="h-8 w-8 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No se encontró talento</p>
                  {search && (
                    <button onClick={() => setSearch('')} className="text-xs text-[#8b5cf6] hover:underline mt-1">
                      Limpiar búsqueda
                    </button>
                  )}
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map(m => (
                    <UnifiedTalentCard
                      key={m.id}
                      member={m}
                      onClick={() => setSelectedMember(m)}
                      activityMetrics={activityMap.get(m.id)}
                      onAmbassadorToggle={() =>
                        toggleAmbassador.mutate({
                          userId: m.id,
                          currentlyAmbassador: m.is_ambassador,
                        })
                      }
                      isAdmin={isAdmin}
                      isSelected={activeMember?.id === m.id}
                    />
                  ))}
                </div>
              ) : (
                /* Table view */
                <div className="rounded-sm border border-border overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs min-w-[550px]">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        <th className="text-left p-3 text-muted-foreground font-medium">Nombre</th>
                        <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Rol</th>
                        <th className="text-center p-3 text-muted-foreground font-medium">Estado</th>
                        <th className="text-center p-3 text-muted-foreground font-medium hidden md:table-cell">En proceso</th>
                        <th className="text-center p-3 text-muted-foreground font-medium hidden md:table-cell">Sin pagar</th>
                        <th className="text-center p-3 text-muted-foreground font-medium hidden lg:table-cell">&Uacute;lt. entrega</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">Invertido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(m => (
                        <tr
                          key={m.id}
                          onClick={() => setSelectedMember(m)}
                          className={cn(
                            'border-b border-border hover:bg-muted cursor-pointer transition-colors',
                            activeMember?.id === m.id && 'bg-primary/10',
                          )}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {m.avatar_url ? (
                                <img src={m.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                  {m.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="text-foreground font-medium truncate max-w-[150px]">{m.full_name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground hidden sm:table-cell">
                            {m.org_role ? getRoleLabel(m.org_role) : '—'}
                          </td>
                          <td className="p-3 text-center">
                            {(() => {
                              const am = activityMap.get(m.id);
                              if (!am) return <span className="text-muted-foreground">—</span>;
                              return (
                                <span className={cn(
                                  'px-2 py-0.5 rounded-full text-[10px] font-medium border',
                                  am.activity_status === 'active'
                                    ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                    : 'bg-muted text-muted-foreground border-border',
                                )}>
                                  {am.activity_status === 'active' ? 'Activo' : 'Inactivo'}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-3 text-center text-muted-foreground hidden md:table-cell">
                            {activityMap.get(m.id)?.active_content_count || '—'}
                          </td>
                          <td className="p-3 text-center hidden md:table-cell">
                            {(() => {
                              const pending = activityMap.get(m.id)?.pending_payment_count ?? 0;
                              return pending > 0
                                ? <span className="text-warning font-medium">{pending}</span>
                                : <span className="text-muted-foreground">—</span>;
                            })()}
                          </td>
                          <td className="p-3 text-center text-muted-foreground hidden lg:table-cell">
                            {(() => {
                              const days = activityMap.get(m.id)?.days_since_last_delivery;
                              if (days === null || days === undefined) return '—';
                              return days === 0 ? 'Hoy' : `Hace ${days}d`;
                            })()}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {m.total_paid > 0 ? formatCurrency(m.total_paid) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Mobile backdrop */}
            {activeMember && (
              <div
                className="fixed inset-0 bg-black/50 z-30 md:hidden"
                onClick={() => setSelectedMember(null)}
              />
            )}

            {/* Detail Side Panel */}
            {activeMember && currentOrgId && (
              <div className="fixed inset-y-0 right-0 w-full md:w-auto z-40">
                <UnifiedTalentDetailPanel
                  member={activeMember}
                  organizationId={currentOrgId}
                  onClose={() => setSelectedMember(null)}
                  onUpdate={() => refetch()}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
const UnifiedTalentPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // El param ?tab= controla qué sección de nivel superior se muestra.
  // Los valores válidos son: talento | clientes | sin-asignar
  const rawTab = searchParams.get('tab');
  const activeTab: TopTab =
    rawTab === 'clientes' || rawTab === 'sin-asignar' ? rawTab : 'talento';

  const handleTabChange = (key: TopTab) => {
    if (key === 'talento') {
      // Limpia el param para URL más limpia: /talent
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: key }, { replace: true });
    }
  };

  return (
    <div className="min-h-screen">
      {/* ── Tabs de nivel superior ─────────────────────────────────────────── */}
      <div className="flex border-b border-border px-4 md:px-6 pt-4">
        {TOP_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            aria-selected={activeTab === tab.key}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Contenido condicional por tab ─────────────────────────────────── */}
      {activeTab === 'clientes'    && <UnifiedClientsContent />}
      {activeTab === 'sin-asignar' && <SinAsignarSection />}
      {activeTab === 'talento'     && <TalentoSection />}
    </div>
  );
};

export default UnifiedTalentPage;
