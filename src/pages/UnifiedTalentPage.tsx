import { useState, useMemo } from 'react';
import {
  Sword, Users, Heart, DollarSign, Search, Trophy,
  UserPlus, Send, Loader2,
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

type FilterTab = 'todos' | 'admins' | 'estrategas' | 'creadores' | 'editores' | 'traffickers' | 'embajadores' | 'leads' | 'externos' | 'ranking';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'admins', label: 'Admins' },
  { key: 'estrategas', label: 'Estrategas' },
  { key: 'creadores', label: 'Creadores' },
  { key: 'editores', label: 'Editores' },
  { key: 'traffickers', label: 'Traffickers' },
  { key: 'embajadores', label: 'Embajadores' },
  { key: 'leads', label: 'Leads' },
  { key: 'externos', label: 'Externos' },
  { key: 'ranking', label: 'Ranking' },
];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

const UnifiedTalentPage = () => {
  const { isAdmin, isTeamLeader, user } = useAuth();
  const { currentOrgId } = useOrgOwner();
  const { toast } = useToast();
  const { guardAction, isReadOnly } = useTrialGuard();
  const { data: members = [], isLoading, refetch } = useUnifiedTalent(currentOrgId);
  const toggleAmbassador = useToggleAmbassador(currentOrgId);

  const canSeeInternal = isAdmin || isTeamLeader;

  const [filter, setFilter] = useState<FilterTab>(canSeeInternal ? 'todos' : 'externos');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedMember, setSelectedMember] = useState<UnifiedTalentMember | null>(null);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'creator' as AppRole });
  const [sendingInvite, setSendingInvite] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const internal = members.filter(m => m.source !== 'external');
    const external = members.filter(m => m.source !== 'internal');
    const favorites = members.filter(m => m.relationship_type === 'favorite');
    const leads = members.filter(m => m.source !== 'external' && (!m.all_roles || m.all_roles.length === 0) && !m.is_owner);
    const totalInvested = members.reduce((sum, m) => sum + (m.total_paid || 0), 0);
    return { internal: internal.length, external: external.length, favorites: favorites.length, leads: leads.length, totalInvested };
  }, [members]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = members;

    // Role-based filter for non-admin
    if (!canSeeInternal) {
      list = list.filter(m => m.source !== 'internal');
    }

    // Tab filter
    switch (filter) {
      case 'todos':
        // Exclude leads (no roles, not owner) from "Todos" — they have their own tab
        list = list.filter(m => m.source === 'external' || (m.all_roles && m.all_roles.length > 0) || m.is_owner);
        break;
      case 'admins':
        list = list.filter(m => m.source !== 'external' && (m.org_role === 'admin' || m.org_role === 'team_leader' || m.is_owner));
        break;
      case 'estrategas':
        list = list.filter(m => m.source !== 'external' && m.all_roles?.includes('strategist'));
        break;
      case 'creadores':
        list = list.filter(m => m.source !== 'external' && m.all_roles?.includes('creator'));
        break;
      case 'editores':
        list = list.filter(m => m.source !== 'external' && m.all_roles?.includes('editor'));
        break;
      case 'traffickers':
        list = list.filter(m => m.source !== 'external' && m.all_roles?.includes('trafficker'));
        break;
      case 'embajadores':
        list = list.filter(m => m.is_ambassador);
        break;
      case 'leads':
        list = list.filter(m => m.source !== 'external' && (!m.all_roles || m.all_roles.length === 0) && !m.is_owner);
        break;
      case 'externos':
        list = list.filter(m => m.source !== 'internal');
        break;
      // 'ranking' shows all
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
  }, [members, filter, search, canSeeInternal]);

  // Keep selected member in sync with refreshed data
  const activeMember = selectedMember
    ? members.find(m => m.id === selectedMember.id) || selectedMember
    : null;

  const availableTabs = canSeeInternal
    ? FILTER_TABS
    : FILTER_TABS.filter(t => t.key === 'todos' || t.key === 'externos');

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
      toast({ description: `Invitaci\u00f3n enviada a ${inviteData.email}` });
      setInviteOpen(false);
      setInviteData({ email: '', role: 'creator' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo enviar la invitaci\u00f3n', variant: 'destructive' });
    } finally {
      setSendingInvite(false);
    }
  };

  if (!currentOrgId) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <PageHeader icon={Sword} title="Talento" subtitle="Gestion de equipo interno y talento externo" />
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">Selecciona una organizaci\u00f3n</p>
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
                        showSystemRoles={true}
                        showClientRoles={false}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Para agregar clientes, usa la secci\u00f3n Clientes
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
          {canSeeInternal && (
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Users className="h-3.5 w-3.5" />
                Equipo
              </div>
              <p className="text-xl font-bold text-card-foreground">{stats.internal}</p>
            </div>
          )}
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Sword className="h-3.5 w-3.5" />
              Externos
            </div>
            <p className="text-xl font-bold text-card-foreground">{stats.external}</p>
          </div>
          {canSeeInternal && stats.leads > 0 && (
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <UserPlus className="h-3.5 w-3.5" />
                Leads
              </div>
              <p className="text-xl font-bold text-card-foreground">{stats.leads}</p>
            </div>
          )}
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Heart className="h-3.5 w-3.5" />
              Favoritos
            </div>
            <p className="text-xl font-bold text-card-foreground">{stats.favorites}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Invertido
            </div>
            <p className="text-xl font-bold text-card-foreground">{formatCurrency(stats.totalInvested)}</p>
          </div>
        </div>

        {/* Filter tabs + search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-wrap gap-1">
            {availableTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
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
                    <Skeleton key={i} className="h-48 rounded-xl bg-muted" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <Sword className="h-8 w-8 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No se encontr\u00f3 talento</p>
                  {search && (
                    <button onClick={() => setSearch('')} className="text-xs text-[#8b5cf6] hover:underline mt-1">
                      Limpiar b\u00fasqueda
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
                <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs min-w-[550px]">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        <th className="text-left p-3 text-muted-foreground font-medium">Nombre</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Origen</th>
                        <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Rol</th>
                        <th className="text-center p-3 text-muted-foreground font-medium hidden sm:table-cell">Contenido</th>
                        <th className="text-center p-3 text-muted-foreground font-medium hidden md:table-cell">Rating</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">Pagado</th>
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
                          <td className="p-3">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-medium',
                              m.source === 'internal' ? 'bg-blue-500/15 text-blue-400' :
                              m.source === 'external' ? 'bg-pink-500/15 text-pink-400' :
                              'bg-purple-500/15 text-purple-400',
                            )}>
                              {m.source === 'internal' ? 'Equipo' : m.source === 'external' ? 'Externo' : 'Ambos'}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground hidden sm:table-cell">
                            {m.org_role ? getRoleLabel(m.org_role) : '\u2014'}
                          </td>
                          <td className="p-3 text-center text-muted-foreground hidden sm:table-cell">{m.content_count || '\u2014'}</td>
                          <td className="p-3 text-center text-muted-foreground hidden md:table-cell">
                            {m.avg_star_rating ? m.avg_star_rating.toFixed(1) : m.average_rating_given ? m.average_rating_given.toFixed(1) : '\u2014'}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {m.total_paid > 0 ? formatCurrency(m.total_paid) : '\u2014'}
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
};

export default UnifiedTalentPage;
