import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Castle, Contact, Building2, DollarSign, Search, Plus,
  ChevronDown, Crown, Users as UsersIcon, AlertTriangle,
  Phone, MapPin, Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useUnifiedClients, useOrgClientUsers, useUnassignedClientMembers } from '@/hooks/useUnifiedClients';
import { UnifiedClientCard } from '@/components/clients/UnifiedClientCard';
import { ClientUserCard } from '@/components/clients/ClientUserCard';
import { ViewModeToggle, type ViewMode } from '@/components/crm/ViewModeToggle';
import { ClientDetailDialog } from '@/components/clients/ClientDetailDialog';
import { ContactDetailPanel } from '@/components/crm/ContactDetailPanel';
import { ClientUserDetailPanel } from '@/components/clients/ClientUserDetailPanel';
import { CreateContactModal } from '@/components/crm/CreateContactModal';
import { cn } from '@/lib/utils';
import type { UnifiedClientEntity, ClientUser } from '@/types/unifiedClient.types';
import type { OrgContact } from '@/types/crm.types';

type FilterTab = 'todos' | 'empresas' | 'contactos' | 'usuarios';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'empresas', label: 'Empresas' },
  { key: 'contactos', label: 'Contactos' },
  { key: 'usuarios', label: 'Usuarios' },
];

const VALID_TABS: FilterTab[] = ['todos', 'empresas', 'contactos', 'usuarios'];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Convert a UnifiedClientEntity (contacto) → OrgContact for the ContactDetailPanel */
function entityToOrgContact(e: UnifiedClientEntity, orgId: string): OrgContact {
  return {
    id: e.id,
    organization_id: orgId,
    full_name: e.name,
    email: e.email,
    phone: e.phone,
    company: e.company,
    position: e.position,
    avatar_url: e.avatar_url,
    contact_type: e.contact_type,
    pipeline_stage: e.pipeline_stage,
    deal_value: e.deal_value,
    expected_close_date: e.expected_close_date,
    relationship_strength: e.relationship_strength,
    notes: e.contact_notes,
    tags: e.tags,
    custom_fields: e.custom_fields || {},
    social_links: {},
    created_by: null,
    assigned_to: null,
    created_at: e.created_at,
    updated_at: e.updated_at,
  };
}

const UnifiedClientsPage = () => {
  const { isAdmin, isTeamLeader } = useAuth();
  const { currentOrgId } = useOrgOwner();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: entities = [], isLoading, refetch } = useUnifiedClients(currentOrgId);
  const { data: clientUsers = [], isLoading: clientUsersLoading, refetch: refetchClientUsers } = useOrgClientUsers(currentOrgId);
  const { data: unassignedMembers = [], refetch: refetchUnassigned } = useUnassignedClientMembers(currentOrgId);

  const canSeeInternal = isAdmin || isTeamLeader;

  // Read tab from URL, fallback to default
  const tabFromUrl = searchParams.get('tab') as FilterTab | null;
  const defaultTab = canSeeInternal ? 'todos' : 'contactos';
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : defaultTab;

  const [filter, setFilter] = useState<FilterTab>(initialTab);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Selection state
  const [selectedEntity, setSelectedEntity] = useState<UnifiedClientEntity | null>(null);
  const [selectedClientUser, setSelectedClientUser] = useState<ClientUser | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({ name: '', contact_email: '', contact_phone: '', notes: '' });
  const [creatingCompany, setCreatingCompany] = useState(false);
  const { toast } = useToast();

  // Handle tab change with URL sync
  const handleFilterChange = (tab: FilterTab) => {
    setFilter(tab);
    setSearchParams(tab === 'todos' ? {} : { tab }, { replace: true });
    // Clear selections when switching tabs
    setSelectedEntity(null);
    setSelectedClientUser(null);
    setClientDialogOpen(false);
  };

  // Stats
  const stats = useMemo(() => {
    const empresas = entities.filter(e => e.entity_type === 'empresa');
    const contactos = entities.filter(e => e.entity_type === 'contacto');
    const vip = empresas.filter(e => e.is_vip);
    const pipelineValue = contactos.reduce((sum, e) => sum + (e.deal_value || 0), 0);
    return {
      empresas: empresas.length,
      contactos: contactos.length,
      vip: vip.length,
      pipelineValue,
      usuarios: clientUsers.length,
    };
  }, [entities, clientUsers]);

  // Filtered entities (empresas + contactos)
  const filtered = useMemo(() => {
    let list = entities;

    if (!canSeeInternal) {
      list = list.filter(e => e.entity_type === 'contacto');
    }

    if (filter === 'empresas') list = list.filter(e => e.entity_type === 'empresa');
    if (filter === 'contactos') list = list.filter(e => e.entity_type === 'contacto');

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.company?.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [entities, filter, search, canSeeInternal]);

  // Filtered client users
  const filteredClientUsers = useMemo(() => {
    if (!search.trim()) return clientUsers;
    const q = search.toLowerCase();
    return clientUsers.filter(u =>
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.linked_companies.some(c => c.client_name.toLowerCase().includes(q)),
    );
  }, [clientUsers, search]);

  // Handle click on entity
  const handleEntityClick = (entity: UnifiedClientEntity) => {
    setSelectedClientUser(null); // Clear client user selection
    if (entity.entity_type === 'empresa') {
      setSelectedEntity(entity);
      setClientDialogOpen(true);
    } else {
      setSelectedEntity(entity);
    }
  };

  // Handle click on client user
  const handleClientUserClick = (user: ClientUser) => {
    setSelectedEntity(null); // Clear entity selection
    setSelectedClientUser(user);
  };

  const handleCreateCompany = async () => {
    if (!newCompanyData.name.trim()) {
      toast({ title: 'Error', description: 'El nombre de la empresa es requerido', variant: 'destructive' });
      return;
    }
    setCreatingCompany(true);
    try {
      const { error } = await supabase.from('clients').insert({
        name: newCompanyData.name.trim(),
        contact_email: newCompanyData.contact_email || null,
        contact_phone: newCompanyData.contact_phone || null,
        notes: newCompanyData.notes || null,
        organization_id: currentOrgId,
      });
      if (error) throw error;
      toast({ title: 'Empresa creada', description: `${newCompanyData.name} ha sido creada exitosamente` });
      setCreateCompanyOpen(false);
      setNewCompanyData({ name: '', contact_email: '', contact_phone: '', notes: '' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo crear la empresa', variant: 'destructive' });
    } finally {
      setCreatingCompany(false);
    }
  };

  // Active contact for side panel (only contactos)
  const activeContact = selectedEntity?.entity_type === 'contacto'
    ? entities.find(e => e.id === selectedEntity.id) || selectedEntity
    : null;

  // Active client user for side panel
  const activeClientUser = selectedClientUser
    ? clientUsers.find(u => u.user_id === selectedClientUser.user_id) || selectedClientUser
    : null;

  // Is any side panel open?
  const hasSidePanel = !!activeContact || !!activeClientUser;

  const availableTabs = canSeeInternal
    ? FILTER_TABS
    : FILTER_TABS.filter(t => t.key === 'todos' || t.key === 'contactos' || t.key === 'usuarios');

  // Companies list for linking in the detail panel
  const allCompanies = useMemo(() => {
    return entities
      .filter(e => e.entity_type === 'empresa')
      .map(e => ({ id: e.id, name: e.name }));
  }, [entities]);

  if (!currentOrgId) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <PageHeader icon={Castle} title="Clientes" subtitle="Gestión de empresas, contactos y usuarios" />
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">Selecciona una organización</p>
        </div>
      </div>
    );
  }

  // Determine if we're showing the usuarios tab
  const showUsuarios = filter === 'usuarios';

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader icon={Castle} title="Clientes" subtitle="Gestión de empresas, contactos y usuarios" />

        {/* Stats Row */}
        <div className={cn('grid gap-3', canSeeInternal ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-3')}>
          {canSeeInternal && (
            <div className="rounded-sm border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Building2 className="h-3.5 w-3.5" />
                Empresas
              </div>
              <p className="text-xl font-bold text-card-foreground">{stats.empresas}</p>
            </div>
          )}
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Contact className="h-3.5 w-3.5" />
              Contactos
            </div>
            <p className="text-xl font-bold text-card-foreground">{stats.contactos}</p>
          </div>
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <UsersIcon className="h-3.5 w-3.5" />
              Usuarios
            </div>
            <p className="text-xl font-bold text-card-foreground">{stats.usuarios}</p>
          </div>
          {canSeeInternal && (
            <div className="rounded-sm border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Crown className="h-3.5 w-3.5" />
                VIP
              </div>
              <p className="text-xl font-bold text-card-foreground">{stats.vip}</p>
            </div>
          )}
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Pipeline
            </div>
            <p className="text-xl font-bold text-card-foreground">{formatCurrency(stats.pipelineValue)}</p>
          </div>
        </div>

        {/* Filter tabs + search + actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-wrap gap-1">
            {availableTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-sm text-xs font-medium transition-all',
                  filter === tab.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-8 h-8 w-48 bg-muted border-border text-white placeholder:text-muted-foreground text-xs"
              />
            </div>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />

            {canSeeInternal && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-8 gap-1 bg-primary hover:bg-primary/90 text-white text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Nuevo
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCreateCompanyOpen(true)}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Nueva Empresa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreateContactOpen(true)}>
                    <Contact className="h-4 w-4 mr-2" />
                    Nuevo Contacto
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex gap-4">
          <div className={cn('flex-1 min-w-0', hasSidePanel && 'md:mr-[440px]')}>
            {showUsuarios ? (
              /* ===== USUARIOS CLIENTE TAB ===== */
              <>
                {/* Unassigned alert */}
                {canSeeInternal && unassignedMembers.length > 0 && (
                  <div className="mb-4 flex items-center gap-2 p-3 rounded-sm border border-amber-500/30 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-400">
                      <strong>{unassignedMembers.length}</strong> usuario{unassignedMembers.length !== 1 ? 's' : ''} con rol cliente sin empresa asignada
                      {unassignedMembers.length <= 5 && (
                        <span className="text-muted-foreground ml-1">
                          ({unassignedMembers.map(u => u.full_name || u.email).join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {clientUsersLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-40 rounded-sm bg-muted" />
                    ))}
                  </div>
                ) : filteredClientUsers.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-sm">
                    <UsersIcon className="h-8 w-8 text-white/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search ? 'No se encontraron usuarios' : 'No hay usuarios cliente vinculados a empresas'}
                    </p>
                    {search && (
                      <button onClick={() => setSearch('')} className="text-xs text-[#8b5cf6] hover:underline mt-1">
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                ) : viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClientUsers.map(u => (
                      <ClientUserCard
                        key={u.user_id}
                        user={u}
                        onClick={() => handleClientUserClick(u)}
                        isSelected={selectedClientUser?.user_id === u.user_id}
                      />
                    ))}
                  </div>
                ) : (
                  /* Table view for client users */
                  <div className="rounded-sm border border-border overflow-hidden overflow-x-auto">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          <th className="text-left p-3 text-muted-foreground font-medium">Nombre</th>
                          <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Email</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">Empresas</th>
                          <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Teléfono</th>
                          <th className="text-left p-3 text-muted-foreground font-medium hidden md:table-cell">Ciudad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClientUsers.map(u => (
                          <tr
                            key={u.user_id}
                            onClick={() => handleClientUserClick(u)}
                            className={cn(
                              'border-b border-border hover:bg-muted cursor-pointer transition-colors',
                              selectedClientUser?.user_id === u.user_id && 'bg-primary/10',
                            )}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                                ) : (
                                  <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <UsersIcon className="h-3.5 w-3.5 text-emerald-400" />
                                  </div>
                                )}
                                <span className="text-foreground font-medium truncate max-w-[150px]">{u.full_name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground truncate max-w-[160px] hidden sm:table-cell">{u.email}</td>
                            <td className="p-3">
                              {u.linked_companies.length > 0 ? (
                                <div className="flex gap-1 flex-wrap">
                                  {u.linked_companies.slice(0, 2).map(c => (
                                    <span
                                      key={c.client_id}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 truncate max-w-[80px]"
                                    >
                                      {c.client_name}
                                    </span>
                                  ))}
                                  {u.linked_companies.length > 2 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground">
                                      +{u.linked_companies.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-amber-400">Sin empresa</span>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground hidden sm:table-cell">{u.phone || '—'}</td>
                            <td className="p-3 text-muted-foreground hidden md:table-cell">{u.city || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              /* ===== EMPRESAS + CONTACTOS TABS ===== */
              <>
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-40 rounded-sm bg-muted" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-sm">
                    <Castle className="h-8 w-8 text-white/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No se encontraron clientes</p>
                    {search && (
                      <button onClick={() => setSearch('')} className="text-xs text-[#8b5cf6] hover:underline mt-1">
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                ) : viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(e => (
                      <UnifiedClientCard
                        key={`${e.entity_type}-${e.id}`}
                        entity={e}
                        onClick={() => handleEntityClick(e)}
                        isSelected={selectedEntity?.id === e.id}
                        canEdit={canSeeInternal}
                        onUpdate={() => refetch()}
                      />
                    ))}
                  </div>
                ) : (
                  /* Table view */
                  <div className="rounded-sm border border-border overflow-hidden overflow-x-auto">
                    <table className="w-full text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          <th className="text-left p-3 text-muted-foreground font-medium">Nombre</th>
                          <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Tipo</th>
                          <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Email</th>
                          <th className="text-center p-3 text-muted-foreground font-medium">Contenido</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(e => (
                          <tr
                            key={`${e.entity_type}-${e.id}`}
                            onClick={() => handleEntityClick(e)}
                            className={cn(
                              'border-b border-border hover:bg-muted cursor-pointer transition-colors',
                              selectedEntity?.id === e.id && 'bg-primary/10',
                            )}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {e.entity_type === 'empresa' ? (
                                  e.avatar_url ? (
                                    <img src={e.avatar_url} alt="" className="h-7 w-7 rounded-sm object-cover" />
                                  ) : (
                                    <div className="h-7 w-7 rounded-sm bg-blue-500/10 flex items-center justify-center">
                                      <Building2 className="h-3.5 w-3.5 text-blue-400" />
                                    </div>
                                  )
                                ) : (
                                  e.avatar_url ? (
                                    <img src={e.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                                  ) : (
                                    <div className="h-7 w-7 rounded-full bg-purple-500/10 flex items-center justify-center">
                                      <Contact className="h-3.5 w-3.5 text-purple-400" />
                                    </div>
                                  )
                                )}
                                <div className="min-w-0">
                                  <span className="text-foreground font-medium truncate block max-w-[150px]">{e.name}</span>
                                  {e.entity_type === 'contacto' && e.company && (
                                    <span className="text-[10px] text-muted-foreground">{e.company}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 hidden sm:table-cell">
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-medium',
                                e.entity_type === 'empresa'
                                  ? 'bg-blue-500/15 text-blue-400'
                                  : 'bg-purple-500/15 text-purple-400',
                              )}>
                                {e.entity_type === 'empresa' ? 'Empresa' : 'Contacto'}
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground truncate max-w-[160px] hidden sm:table-cell">{e.email || '—'}</td>
                            <td className="p-3 text-center text-muted-foreground">
                              {e.entity_type === 'empresa' ? e.content_count : '—'}
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              {e.entity_type === 'contacto' && e.deal_value
                                ? formatCurrency(e.deal_value)
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile backdrop */}
          {hasSidePanel && (
            <div
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={() => { setSelectedEntity(null); setSelectedClientUser(null); }}
            />
          )}

          {/* Contact Side Panel */}
          {activeContact && currentOrgId && (
            <div className="fixed inset-y-0 right-0 w-full md:w-auto z-40">
              <ContactDetailPanel
                contact={entityToOrgContact(activeContact, currentOrgId)}
                organizationId={currentOrgId}
                onClose={() => setSelectedEntity(null)}
                onUpdate={() => refetch()}
              />
            </div>
          )}

          {/* Client User Side Panel */}
          {activeClientUser && currentOrgId && (
            <div className="fixed inset-y-0 right-0 w-full md:w-auto z-40">
              <ClientUserDetailPanel
                user={activeClientUser}
                organizationId={currentOrgId}
                allCompanies={allCompanies}
                onClose={() => setSelectedClientUser(null)}
                onUpdate={() => {
                  refetchClientUsers();
                  refetchUnassigned();
                  refetch();
                }}
              />
            </div>
          )}
        </div>

        {/* Empresa Dialog */}
        {selectedEntity?.entity_type === 'empresa' && (
          <ClientDetailDialog
            client={{
              id: selectedEntity.id,
              name: selectedEntity.name,
              logo_url: selectedEntity.avatar_url,
              contact_email: selectedEntity.email,
              contact_phone: selectedEntity.phone,
              notes: selectedEntity.client_notes,
              is_vip: selectedEntity.is_vip,
              username: selectedEntity.username,
            }}
            open={clientDialogOpen}
            onOpenChange={(open) => {
              setClientDialogOpen(open);
              if (!open) setSelectedEntity(null);
            }}
            onUpdate={() => refetch()}
          />
        )}

        {/* Create Company Dialog */}
        <Dialog open={createCompanyOpen} onOpenChange={setCreateCompanyOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nueva Empresa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nombre de la empresa *</Label>
                <Input
                  id="company-name"
                  placeholder="Ej: Empresa XYZ"
                  value={newCompanyData.name}
                  onChange={(e) => setNewCompanyData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-email">Email de contacto</Label>
                <Input
                  id="company-email"
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={newCompanyData.contact_email}
                  onChange={(e) => setNewCompanyData(prev => ({ ...prev, contact_email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">Teléfono de contacto</Label>
                <Input
                  id="company-phone"
                  placeholder="+57 300 123 4567"
                  value={newCompanyData.contact_phone}
                  onChange={(e) => setNewCompanyData(prev => ({ ...prev, contact_phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-notes">Notas</Label>
                <Textarea
                  id="company-notes"
                  placeholder="Notas adicionales sobre la empresa..."
                  value={newCompanyData.notes}
                  onChange={(e) => setNewCompanyData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setCreateCompanyOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateCompany} disabled={creatingCompany}>
                  {creatingCompany ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</> : 'Crear Empresa'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Contact Modal */}
        <CreateContactModal
          open={createContactOpen}
          onOpenChange={setCreateContactOpen}
          organizationId={currentOrgId}
        />
      </div>
    </div>
  );
};

export default UnifiedClientsPage;
