import { useState, useMemo } from 'react';
import {
  Castle, Contact, Building2, DollarSign, Search, Plus,
  ChevronDown, Crown, Users as UsersIcon, AlertTriangle,
  Phone, MapPin, Loader2, Activity, TrendingDown, CalendarDays, X,
  Archive, Tag, Copy,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useUnifiedClients, useOrgClientUsers, useUnassignedClientMembers, useArchivedClients, useUnmarkLead } from '@/hooks/useUnifiedClients';
import { useClientActivityMetrics } from '@/hooks/useClientActivityMetrics';
import { UnifiedClientCard } from '@/components/clients/UnifiedClientCard';
import { ArchivedClientCard } from '@/components/clients/ArchivedClientCard';
import { ClientUserCard } from '@/components/clients/ClientUserCard';
import { LeadCard } from '@/components/clients/LeadCard';
import { MarkAsLeadDialog } from '@/components/clients/MarkAsLeadDialog';
import { ViewModeToggle, type ViewMode } from '@/components/crm/ViewModeToggle';
import { ClientDetailDialog } from '@/components/clients/ClientDetailDialog';
import { ClientUsersDialog } from '@/components/clients/ClientUsersDialog';
import { ClientPackagesDialog } from '@/components/clients/ClientPackagesDialog';
import { ClientVideosDialog } from '@/components/clients/ClientVideosDialog';
import { ClientDeleteDialog } from '@/components/clients/ClientDeleteDialog';
import { ContactDetailPanel } from '@/components/crm/ContactDetailPanel';
import { ClientUserDetailPanel } from '@/components/clients/ClientUserDetailPanel';
import { CreateContactModal } from '@/components/crm/CreateContactModal';
import { cn } from '@/lib/utils';
import type { UnifiedClientEntity, ClientUser } from '@/types/unifiedClient.types';
import type { OrgContact } from '@/types/crm.types';

// Phone y MapPin importados pero usados en tipos derivados — se mantienen para compatibilidad futura
void Phone;
void MapPin;

// ── Filtro de fechas ──────────────────────────────────────────────────────────
type DatePreset = 'todo' | 'hoy' | 'semana' | 'mes' | '3meses' | 'ano' | 'personalizado';
interface DateRange { preset: DatePreset; from: Date | null; to: Date | null }
const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'todo',          label: 'Todo' },
  { key: 'hoy',          label: 'Hoy' },
  { key: 'semana',       label: 'Esta semana' },
  { key: 'mes',          label: 'Este mes' },
  { key: '3meses',       label: 'Últimos 3 meses' },
  { key: 'ano',          label: 'Este año' },
  { key: 'personalizado', label: 'Personalizado' },
];
function getPresetRange(preset: DatePreset): { from: Date | null; to: Date | null } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'todo':  return { from: null, to: null };
    case 'hoy':   return { from: today, to: now };
    case 'semana': {
      const from = new Date(today);
      from.setDate(today.getDate() - today.getDay());
      return { from, to: now };
    }
    case 'mes':    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case '3meses': {
      const from = new Date(now);
      from.setMonth(now.getMonth() - 3);
      return { from, to: now };
    }
    case 'ano':    return { from: new Date(now.getFullYear(), 0, 1), to: now };
    default:       return { from: null, to: null };
  }
}

type FilterTab = 'todos' | 'usuarios' | 'activos' | 'inactivos' | 'prospects' | 'archivadas' | 'leads';

const FILTER_TABS: { key: FilterTab; label: string; adminOnly?: boolean }[] = [
  { key: 'activos', label: 'Activos', adminOnly: true },
  { key: 'inactivos', label: 'Entregados', adminOnly: true },
  { key: 'prospects', label: 'Sin paquetes', adminOnly: true },
  { key: 'todos', label: 'Todos' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'leads', label: 'Leads', adminOnly: true },
  { key: 'archivadas', label: 'Archivadas', adminOnly: true },
];

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

/**
 * Contenido completo de la sección Clientes.
 * Exportado como named export para ser embebido en UnifiedTalentPage
 * sin duplicar lógica.
 *
 * NOTA: no usa useSearchParams para sincronizar el sub-tab interno porque
 * el param ?tab= lo gestiona el padre (UnifiedTalentPage). El estado del
 * filtro interno es local.
 */
export function UnifiedClientsContent() {
  const { isAdmin, isTeamLeader } = useAuth();
  const { currentOrgId } = useOrgOwner();
  const { data: entities = [], isLoading, refetch } = useUnifiedClients(currentOrgId);
  const { data: clientUsers = [], isLoading: clientUsersLoading, refetch: refetchClientUsers } = useOrgClientUsers(currentOrgId);
  const { data: unassignedMembers = [], refetch: refetchUnassigned } = useUnassignedClientMembers(currentOrgId);
  const { data: activityMetrics = [] } = useClientActivityMetrics(currentOrgId);
  const { data: archivedClients = [], isLoading: archivedLoading, refetch: refetchArchived } = useArchivedClients(currentOrgId);
  const unmarkLead = useUnmarkLead();

  const canSeeInternal = isAdmin || isTeamLeader;

  // Estado local — no sincronizamos con URL para evitar colisión con el
  // param ?tab= del tab de nivel superior en UnifiedTalentPage.
  const defaultTab: FilterTab = canSeeInternal ? 'activos' : 'todos';
  const [filter, setFilter] = useState<FilterTab>(defaultTab);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [dateRange, setDateRange] = useState<DateRange>({ preset: 'todo', from: null, to: null });
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Selection state
  const [selectedEntity, setSelectedEntity] = useState<UnifiedClientEntity | null>(null);
  const [selectedClientUser, setSelectedClientUser] = useState<ClientUser | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({ name: '', contact_email: '', contact_phone: '', notes: '' });
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [selectedForUsers, setSelectedForUsers] = useState<UnifiedClientEntity | null>(null);
  const [packagesDialogOpen, setPackagesDialogOpen] = useState(false);
  const [videosDialogOpen, setVideosDialogOpen] = useState(false);
  const [selectedForQuickDialog, setSelectedForQuickDialog] = useState<UnifiedClientEntity | null>(null);
  const [clientDialogInitialTab, setClientDialogInitialTab] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<UnifiedClientEntity | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [markLeadDialogOpen, setMarkLeadDialogOpen] = useState(false);
  const [selectedForMarkLead, setSelectedForMarkLead] = useState<ClientUser | null>(null);
  const { toast } = useToast();

  // Handle tab change (solo estado local)
  const handleFilterChange = (tab: FilterTab) => {
    setFilter(tab);
    // Clear selections when switching tabs
    setSelectedEntity(null);
    setSelectedClientUser(null);
    setClientDialogOpen(false);
  };

  // IDs de empresas archivadas — usado para ocultarlas de todas las demás pestañas,
  // como defensa adicional por si get_unified_clients aún no filtra deleted_at.
  const archivedIds = useMemo(() => new Set(archivedClients.map(c => c.id)), [archivedClients]);

  // Stats
  const stats = useMemo(() => {
    const empresas = entities.filter(e => e.entity_type === 'empresa' && !archivedIds.has(e.id));
    const contactos = entities.filter(e => e.entity_type === 'contacto');
    const vip = empresas.filter(e => e.is_vip);
    const pipelineValue = contactos.reduce((sum, e) => sum + (e.deal_value || 0), 0);
    const activos = activityMetrics.filter(m => m.activity_status === 'active').length;
    const inactivos = activityMetrics.filter(m => m.activity_status === 'inactive').length;
    const prospects = activityMetrics.filter(m => m.activity_status === 'prospect').length;
    return {
      empresas: empresas.length,
      contactos: contactos.length,
      vip: vip.length,
      pipelineValue,
      usuarios: clientUsers.length,
      activos,
      inactivos,
      prospects,
    };
  }, [entities, clientUsers, activityMetrics, archivedIds]);

  // Mapa rápido de activity_status por client_id
  const activityMap = useMemo(() => {
    const map = new Map<string, string>();
    activityMetrics.forEach(m => map.set(m.client_id, m.activity_status));
    return map;
  }, [activityMetrics]);

  // Filtered entities (empresas + contactos + leads)
  const filtered = useMemo(() => {
    let list = entities;

    // Empresas archivadas nunca aparecen en las demás pestañas (defensa adicional
    // por si get_unified_clients aún no filtra deleted_at del lado del backend).
    list = list.filter(e => e.entity_type !== 'empresa' || !archivedIds.has(e.id));

    if (!canSeeInternal) {
      list = list.filter(e => e.entity_type === 'contacto');
    }

    // Filtros de actividad (solo empresas)
    if (filter === 'activos') {
      list = list.filter(e => e.entity_type === 'empresa' && activityMap.get(e.id) === 'active');
    }
    if (filter === 'inactivos') {
      list = list.filter(e => e.entity_type === 'empresa' && activityMap.get(e.id) === 'inactive');
    }
    if (filter === 'prospects') {
      list = list.filter(e => e.entity_type === 'empresa' && activityMap.get(e.id) === 'prospect');
    }
    // Pestaña Leads: contactos marcados explícitamente como lead (contact_type='lead')
    if (filter === 'leads') {
      list = list.filter(e => e.entity_type === 'contacto' && e.contact_type === 'lead');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.company?.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q)),
      );
    }

    // Filtro de fechas (por fecha de creación del cliente)
    if (dateRange.from || dateRange.to) {
      list = list.filter(e => {
        const date = new Date(e.created_at);
        if (dateRange.from && date < dateRange.from) return false;
        if (dateRange.to && date > dateRange.to) return false;
        return true;
      });
    }

    return list;
  }, [entities, filter, search, canSeeInternal, activityMap, dateRange, archivedIds]);

  // Filtered client users
  const filteredClientUsers = useMemo(() => {
    let list = clientUsers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.linked_companies.some(c => c.client_name.toLowerCase().includes(q)),
      );
    }
    // Filtro de fechas (por fecha de registro del usuario)
    if (dateRange.from || dateRange.to) {
      list = list.filter(u => {
        const date = new Date(u.created_at);
        if (dateRange.from && date < dateRange.from) return false;
        if (dateRange.to && date > dateRange.to) return false;
        return true;
      });
    }
    return list;
  }, [clientUsers, search, dateRange]);

  // Filtered archived companies
  const filteredArchived = useMemo(() => {
    if (!search.trim()) return archivedClients;
    const q = search.toLowerCase();
    return archivedClients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.contact_email?.toLowerCase().includes(q),
    );
  }, [archivedClients, search]);

  // Handle click on entity
  const handleEntityClick = (entity: UnifiedClientEntity) => {
    setSelectedClientUser(null);
    if (entity.entity_type === 'empresa') {
      setSelectedEntity(entity);
      setClientDialogInitialTab(undefined);
      setClientDialogOpen(true);
    } else {
      setSelectedEntity(entity);
    }
  };

  const handleOpenClientTab = (entity: UnifiedClientEntity, tab: string) => {
    setSelectedClientUser(null);
    setSelectedEntity(entity);
    setClientDialogInitialTab(tab);
    setClientDialogOpen(true);
  };

  const handleOpenPackages = (entity: UnifiedClientEntity) => {
    setSelectedForQuickDialog(entity);
    setPackagesDialogOpen(true);
  };

  const handleOpenVideos = (entity: UnifiedClientEntity) => {
    setSelectedForQuickDialog(entity);
    setVideosDialogOpen(true);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la empresa';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setCreatingCompany(false);
    }
  };

  // Handle open delete/archive dialog for a company
  const handleOpenDelete = (entity: UnifiedClientEntity) => {
    setSelectedForDelete(entity);
    setDeleteDialogOpen(true);
  };

  // Handle restore of an archived company
  const handleRestore = async (clientId: string) => {
    setRestoringId(clientId);
    try {
      const { error } = await supabase.rpc('admin_restore_client' as any, { p_client_id: clientId });
      if (error) throw error;
      toast({ title: 'Empresa restaurada', description: 'Ya vuelve a aparecer en las listas' });
      refetchArchived();
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo restaurar la empresa';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setRestoringId(null);
    }
  };

  // Handle mark/unmark a client user as lead
  const handleOpenMarkAsLead = (user: ClientUser) => {
    setSelectedForMarkLead(user);
    setMarkLeadDialogOpen(true);
  };

  const handleUnmarkLead = (user: ClientUser) => {
    if (!user.lead_contact_id || !currentOrgId) return;
    unmarkLead.mutate({ contactId: user.lead_contact_id, orgId: currentOrgId });
  };

  // Handle copy all filtered lead emails to clipboard (para remarketing)
  const handleCopyLeadEmails = async () => {
    const emails = filtered.filter(e => e.email).map(e => e.email as string);
    if (emails.length === 0) {
      toast({ title: 'Sin correos', description: 'Ninguno de los leads filtrados tiene correo registrado', variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(emails.join(', '));
      toast({
        title: 'Correos copiados',
        description: `${emails.length} correo${emails.length !== 1 ? 's' : ''} listo${emails.length !== 1 ? 's' : ''} para pegar en tu herramienta de correo o publicidad`,
      });
    } catch {
      toast({ title: 'Error', description: 'No se pudo copiar al portapapeles', variant: 'destructive' });
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
    : FILTER_TABS.filter(t => !t.adminOnly);

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

  // Determine which sub-tab we're showing
  const showUsuarios = filter === 'usuarios';
  const showArchivadas = filter === 'archivadas';
  const showLeads = filter === 'leads';

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader icon={Castle} title="Clientes" subtitle="Gestión de empresas, contactos y usuarios" />

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Building2 className="h-3.5 w-3.5" />
              Clientes
            </div>
            <p className="text-xl font-bold text-card-foreground">{stats.empresas}</p>
          </div>
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <UsersIcon className="h-3.5 w-3.5" />
              Con acceso
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
              Valor contratado
            </div>
            <p className="text-xl font-bold text-card-foreground">{formatCurrency(stats.pipelineValue)}</p>
          </div>
        </div>

        {/* Seguimiento de actividad — solo admins */}
        {canSeeInternal && activityMetrics.length > 0 && !showArchivadas && !showLeads && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleFilterChange('activos')}
              className={cn(
                'rounded-sm border p-3 text-left transition-all',
                filter === 'activos'
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-border bg-card hover:border-green-500/30',
              )}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Activity className="h-3.5 w-3.5 text-green-400" />
                Activos
              </div>
              <p className="text-xl font-bold text-green-400">{stats.activos}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Contenido pendiente</p>
            </button>
            <button
              onClick={() => handleFilterChange('inactivos')}
              className={cn(
                'rounded-sm border p-3 text-left transition-all',
                filter === 'inactivos'
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-border bg-card hover:border-amber-500/30',
              )}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
                Entregados
              </div>
              <p className="text-xl font-bold text-amber-400">{stats.inactivos}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Todo completado</p>
            </button>
            <button
              onClick={() => handleFilterChange('prospects')}
              className={cn(
                'rounded-sm border p-3 text-left transition-all',
                filter === 'prospects'
                  ? 'border-blue-500/50 bg-blue-500/10'
                  : 'border-border bg-card hover:border-blue-500/30',
              )}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <UsersIcon className="h-3.5 w-3.5 text-blue-400" />
                Sin paquetes
              </div>
              <p className="text-xl font-bold text-blue-400">{stats.prospects}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sin paquete contratado</p>
            </button>
          </div>
        )}


        {/* Filter tabs + search + actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-wrap gap-1">
            {availableTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-1',
                  filter === tab.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                {tab.key === 'archivadas' && <Archive className="h-3 w-3" />}
                {tab.key === 'leads' && <Tag className="h-3 w-3" />}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Date range filter */}
            {!showArchivadas && (
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(
                    'h-8 gap-1.5 text-xs',
                    dateRange.preset !== 'todo' && 'border-primary/50 bg-primary/10 text-primary',
                  )}>
                    <CalendarDays className="h-3 w-3" />
                    {dateRange.preset === 'todo'
                      ? 'Fecha'
                      : DATE_PRESETS.find(p => p.key === dateRange.preset)?.label ?? 'Fecha'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="end">
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Fecha de registro
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {DATE_PRESETS.map(p => (
                        <button
                          key={p.key}
                          onClick={() => {
                            if (p.key === 'personalizado') {
                              setDateRange(prev => ({ ...prev, preset: 'personalizado' }));
                            } else {
                              const { from, to } = getPresetRange(p.key);
                              setDateRange({ preset: p.key, from, to });
                              if (p.key === 'todo') setDatePopoverOpen(false);
                            }
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-sm text-xs font-medium transition-all',
                            dateRange.preset === p.key
                              ? 'bg-primary text-white'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {dateRange.preset === 'personalizado' && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Desde</p>
                          <input
                            type="date"
                            value={dateRange.from ? dateRange.from.toISOString().split('T')[0] : ''}
                            onChange={e => {
                              const from = e.target.value ? new Date(e.target.value) : null;
                              setDateRange(prev => ({ ...prev, from }));
                            }}
                            className="w-full h-8 px-2 rounded-sm text-xs bg-muted border border-border text-foreground"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Hasta</p>
                          <input
                            type="date"
                            value={dateRange.to ? dateRange.to.toISOString().split('T')[0] : ''}
                            onChange={e => {
                              const to = e.target.value ? new Date(e.target.value + 'T23:59:59') : null;
                              setDateRange(prev => ({ ...prev, to }));
                            }}
                            className="w-full h-8 px-2 rounded-sm text-xs bg-muted border border-border text-foreground"
                          />
                        </div>
                      </div>
                    )}

                    {dateRange.preset !== 'todo' && (
                      <button
                        onClick={() => {
                          setDateRange({ preset: 'todo', from: null, to: null });
                          setDatePopoverOpen(false);
                        }}
                        className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-1.5 border-t border-border mt-1"
                      >
                        <X className="h-3 w-3" />
                        Limpiar filtro
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-8 h-8 w-48 bg-muted border-border text-foreground placeholder:text-muted-foreground text-xs"
              />
            </div>
            {!showArchivadas && !showLeads && <ViewModeToggle value={viewMode} onChange={setViewMode} />}

            {canSeeInternal && !showArchivadas && !showLeads && (
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
            {showLeads ? (
              /* ===== LEADS TAB ===== */
              <>
                {/* Contador + acción de remarketing */}
                <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{filtered.length}</strong> lead{filtered.length !== 1 ? 's' : ''}
                    {' '}— cuentas que aún no compran, listas para remarketing
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleCopyLeadEmails}
                    disabled={filtered.length === 0}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar correos
                  </Button>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-40 rounded-sm bg-muted" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-sm">
                    <Tag className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search ? 'No se encontraron leads' : 'Aún no hay leads marcados'}
                    </p>
                    {!search && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Marca usuarios como lead desde la pestaña "Usuarios"
                      </p>
                    )}
                    {search && (
                      <button onClick={() => setSearch('')} className="text-xs text-[#8b5cf6] hover:underline mt-1">
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(e => (
                      <LeadCard
                        key={e.id}
                        lead={e}
                        onClick={() => handleEntityClick(e)}
                        isSelected={selectedEntity?.id === e.id}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : showArchivadas ? (
              /* ===== ARCHIVADAS TAB ===== */
              <>
                {archivedLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-40 rounded-sm bg-muted" />
                    ))}
                  </div>
                ) : filteredArchived.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-sm">
                    <Archive className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search ? 'No se encontraron empresas archivadas' : 'No hay empresas archivadas'}
                    </p>
                    {search && (
                      <button onClick={() => setSearch('')} className="text-xs text-[#8b5cf6] hover:underline mt-1">
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredArchived.map(c => (
                      <ArchivedClientCard
                        key={c.id}
                        client={c}
                        onRestore={() => handleRestore(c.id)}
                        restoring={restoringId === c.id}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : showUsuarios ? (
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
                    <UsersIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
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
                        onMarkAsLead={canSeeInternal ? handleOpenMarkAsLead : undefined}
                        onUnmarkLead={canSeeInternal ? handleUnmarkLead : undefined}
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
                          {canSeeInternal && (
                            <th className="text-center p-3 text-muted-foreground font-medium">Lead</th>
                          )}
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
                            {canSeeInternal && (
                              <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                                {u.es_lead ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-400 border-amber-500/20">
                                      Lead
                                    </Badge>
                                    <button
                                      onClick={() => handleUnmarkLead(u)}
                                      className="text-[10px] text-muted-foreground hover:text-destructive underline"
                                    >
                                      Quitar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleOpenMarkAsLead(u)}
                                    className="text-[10px] text-primary hover:underline"
                                  >
                                    Marcar como lead
                                  </button>
                                )}
                              </td>
                            )}
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
                    <Castle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
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
                        orgId={currentOrgId}
                        activityMetrics={e.entity_type === 'empresa' ? activityMetrics.find(m => m.client_id === e.id) : undefined}
                        onOpenUsers={e.entity_type === 'empresa' ? (entity) => {
                          setSelectedForUsers(entity);
                          setUsersDialogOpen(true);
                        } : undefined}
                        onOpenProjects={e.entity_type === 'empresa' ? handleOpenPackages : undefined}
                        onOpenVideos={e.entity_type === 'empresa' ? handleOpenVideos : undefined}
                        onOpenDelete={e.entity_type === 'empresa' && isAdmin ? handleOpenDelete : undefined}
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
                                  : e.contact_type === 'lead'
                                    ? 'bg-amber-500/15 text-amber-400'
                                    : 'bg-purple-500/15 text-purple-400',
                              )}>
                                {e.entity_type === 'empresa' ? 'Empresa' : e.contact_type === 'lead' ? 'Lead' : 'Contacto'}
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
              organization_id: currentOrgId,
            }}
            open={clientDialogOpen}
            onOpenChange={(open) => {
              setClientDialogOpen(open);
              if (!open) { setSelectedEntity(null); setClientDialogInitialTab(undefined); }
            }}
            onUpdate={() => refetch()}
            initialTab={clientDialogInitialTab}
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

        {/* Paquetes Dialog */}
        {selectedForQuickDialog && (
          <ClientPackagesDialog
            clientId={selectedForQuickDialog.id}
            clientName={selectedForQuickDialog.name}
            orgId={currentOrgId}
            open={packagesDialogOpen}
            onOpenChange={(open) => { setPackagesDialogOpen(open); if (!open) setSelectedForQuickDialog(null); }}
          />
        )}

        {/* Videos Dialog */}
        {selectedForQuickDialog && (
          <ClientVideosDialog
            clientId={selectedForQuickDialog.id}
            clientName={selectedForQuickDialog.name}
            open={videosDialogOpen}
            onOpenChange={(open) => { setVideosDialogOpen(open); if (!open) setSelectedForQuickDialog(null); }}
          />
        )}

        {/* Client Users / WA Notifications Dialog */}
        {selectedForUsers && (
          <ClientUsersDialog
            clientId={selectedForUsers.id}
            clientName={selectedForUsers.name}
            organizationId={currentOrgId}
            open={usersDialogOpen}
            onOpenChange={(open) => {
              setUsersDialogOpen(open);
              if (!open) setSelectedForUsers(null);
            }}
            onUpdate={() => refetch()}
          />
        )}

        {/* Archivar / Eliminar Empresa Dialog */}
        {selectedForDelete && (
          <ClientDeleteDialog
            clientId={selectedForDelete.id}
            clientName={selectedForDelete.name}
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) setSelectedForDelete(null);
            }}
            onArchived={() => {
              refetch();
              refetchArchived();
              if (selectedEntity?.id === selectedForDelete.id) {
                setSelectedEntity(null);
                setClientDialogOpen(false);
              }
            }}
            onDeleted={() => {
              refetch();
              if (selectedEntity?.id === selectedForDelete.id) {
                setSelectedEntity(null);
                setClientDialogOpen(false);
              }
            }}
          />
        )}

        {/* Marcar usuario como Lead Dialog */}
        {selectedForMarkLead && currentOrgId && (
          <MarkAsLeadDialog
            open={markLeadDialogOpen}
            onOpenChange={(open) => {
              setMarkLeadDialogOpen(open);
              if (!open) setSelectedForMarkLead(null);
            }}
            userId={selectedForMarkLead.user_id}
            userName={selectedForMarkLead.full_name}
            orgId={currentOrgId}
            onSuccess={() => setSelectedForMarkLead(null)}
          />
        )}

      </div>
    </div>
  );
}

/**
 * Default export — wrapper mínimo para cuando la ruta /clients-hub
 * o una navegación directa carga esta página de forma autónoma.
 * Una vez que App.tsx redirige /clients-hub → /talent?tab=clientes,
 * este wrapper ya no se usa en producción, pero se mantiene para
 * no romper el lazy import existente en App.tsx.
 */
const UnifiedClientsPage = () => <UnifiedClientsContent />;

export default UnifiedClientsPage;
