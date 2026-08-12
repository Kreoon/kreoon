import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { ProjectTypeSelector } from "@/components/projects/ProjectTypeSelector";
import { FillmakerDialog } from "@/components/clients/FillmakerDialog";
import { Search, Plus, Settings2, Scroll, RotateCcw, Brain, ShoppingBag, Zap } from "lucide-react";
import type { ProjectType } from "@/types/unifiedProject.types";

const UnifiedProjectModal = lazy(() => import('@/components/projects/UnifiedProjectModal'));
import { BulkGenerationDrawer } from "@/components/content/BulkGenerationDrawer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useTrialGuard } from "@/hooks/useTrialGuard";
import { useContentWithFilters } from "@/hooks/useContent";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { KREOON_ORG_ID } from "@/lib/kreoon-org";
import { useInternalOrgContent } from "@/hooks/useInternalOrgContent";
import { Content, ContentStatus, KANBAN_COLUMNS, STATUS_LABELS, Product } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { type SearchableSelectOption } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { updateContentStatusWithUP } from "@/hooks/useContentStatusWithUP";
import { cn } from "@/lib/utils";
import { type DateRangeValue } from "@/lib/date-presets";
import {
  BoardViewSwitcher,
  BoardView,
  BoardConfigDialog,
  BoardCalendarView,
  BoardTableView,
  BoardListView,
  BoardAIPanel,
  ViewSelector
} from "@/components/board";
import { useBoardSettings } from "@/hooks/useBoardSettings";
import { useBoardPersistence } from "@/hooks/useBoardPersistence";
import { useBoardUserPreferences } from "@/hooks/useBoardUserPreferences";
import { useOrgAssignableUsers } from "@/hooks/useOrgAssignableUsers";
import { AutoSaveIndicator } from "@/components/ui/autosave-indicator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useContentSocialStatus } from "@/modules/social/hooks/useContentSocialStatus";
import { canMoveToStatusWithRules } from "@/lib/contentBoardPermissions";
import { ContentBoardFilters } from "@/components/content-board/ContentBoardFilters";
import { ContentBoardKanbanView } from "@/components/content-board/ContentBoardKanbanView";

export default function ContentBoard() {
  const { user, profile, isAdmin, isStrategist, isCreator, isEditor, isClient, activeRole: realActiveRole, roles } = useAuth();
  const { effectiveUserId, effectiveRoles, isImpersonating, impersonationTarget } = useImpersonation();
  const { isPlatformRoot } = useOrgOwner();
  // Derive org ID directly from profile — available immediately without waiting for the RPC
  const currentOrgId = profile?.current_organization_id ?? KREOON_ORG_ID;
  const { toast } = useToast();
  const { guardAction, isReadOnly } = useTrialGuard();

  // Use effective user ID for impersonation
  const targetUserId = isImpersonating ? effectiveUserId : user?.id;

  // Use effective role for impersonation
  const activeRole = isImpersonating && impersonationTarget.role
    ? impersonationTarget.role
    : realActiveRole;

  // Single-org mode: always show internal content board
  const boardMode = 'content' as const;

  // Get ambassador IDs for the organization
  const { ambassadors } = useInternalOrgContent();
  const ambassadorIds = useMemo(() => new Set(ambassadors.map(a => a.id)), [ambassadors]);
  
  // Show admin controls only when user is admin AND not impersonating a non-admin role
  const showAdminControls = isAdmin && (!isImpersonating || impersonationTarget.role === 'admin');
  
  // Board persistence hook - saves view, filters, scroll, selected content
  const persistence = useBoardPersistence({ organizationId: currentOrgId });
  
  // Filtros - using persisted values
  const [filterCreatorId, setFilterCreatorId] = useState<string>(persistence.filters.creatorId);
  const [filterEditorId, setFilterEditorId] = useState<string>(persistence.filters.editorId);
  const [filterClientId, setFilterClientId] = useState<string>(persistence.filters.clientId);
  const [filterProductId, setFilterProductId] = useState<string>(persistence.filters.productId);
  const [searchTerm, setSearchTerm] = useState(persistence.filters.searchTerm);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeValue | null>(
    persistence.filters.startDate && persistence.filters.deadline
      ? { preset: 'custom' as const, from: new Date(persistence.filters.startDate), to: new Date(persistence.filters.deadline) }
      : null
  );
  const startDateFilter = dateRangeFilter?.from;
  const deadlineFilter = dateRangeFilter?.to;
  
  // Sync filters to persistence
  useEffect(() => {
    persistence.setFilters({
      creatorId: filterCreatorId,
      editorId: filterEditorId,
      clientId: filterClientId,
      productId: filterProductId,
      searchTerm: searchTerm,
      startDate: dateRangeFilter?.from?.toISOString(),
      deadline: dateRangeFilter?.to?.toISOString(),
    });
  }, [filterCreatorId, filterEditorId, filterClientId, filterProductId, searchTerm, dateRangeFilter]);
  
  // Listas para filtros
  const [creators, setCreators] = useState<{id: string; name: string}[]>([]);
  const [editors, setEditors] = useState<{id: string; name: string}[]>([]);
  const [clients, setClients] = useState<{id: string; name: string}[]>([]);
  const [products, setProducts] = useState<{id: string; name: string; client_name?: string}[]>([]);

  // For external clients (client_users): force filter by their client_id
  const [externalClientId, setExternalClientId] = useState<string | null>(null);
  useEffect(() => {
    // Use raw profile org ID (no KREOON_ORG_ID fallback) — external clients have no org of their own
    if (!user?.id || !isClient || profile?.current_organization_id) {
      setExternalClientId(null);
      return;
    }
    // User is a client without org - fetch their client_id from client_users
    const fetchClientUser = async () => {
      const { data } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (data?.client_id) {
        setExternalClientId(data.client_id);
      }
    };
    fetchClientUser();
  }, [user?.id, isClient, profile?.current_organization_id]);

  // Memoized options for SearchableSelect
  const creatorOptions = useMemo<SearchableSelectOption[]>(() => [
    { value: 'all', label: 'Todos los creadores' },
    { value: '__unassigned__', label: 'Sin creador asignado' },
    ...creators.map(c => ({ value: c.id, label: c.name })),
  ], [creators]);
  const editorOptions = useMemo<SearchableSelectOption[]>(() => [
    { value: 'all', label: 'Todos los editores' },
    { value: '__unassigned__', label: 'Sin editor asignado' },
    ...editors.map(e => ({ value: e.id, label: e.name })),
  ], [editors]);
  const clientOptions = useMemo<SearchableSelectOption[]>(() => [
    { value: 'all', label: 'Todos los clientes' },
    ...clients.map(c => ({ value: c.id, label: c.name })),
  ], [clients]);
  const productOptions = useMemo<SearchableSelectOption[]>(() => [
    { value: 'all', label: 'Todos los productos' },
    ...products.map(p => ({ value: p.id, label: p.name, hint: p.client_name })),
  ], [products]);

  // Limit visible cards per column to reduce DOM/network load (240+ cards → ~80 visible)
  // El limite en si (CARDS_PER_COLUMN) vive en ContentBoardKanbanView.tsx junto al render.
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
  const toggleColumnExpand = useCallback((status: string) => {
    setExpandedColumns(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status); else next.add(status);
      return next;
    });
  }, []);

  // Estado de drag
  const [draggingContent, setDraggingContent] = useState<Content | null>(null);
  const [dropTarget, setDropTarget] = useState<ContentStatus | string | null>(null);
  
  // Dialog para detalle - using persisted selected content
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  // Deeplink: ?item=ID abre automáticamente el item (usado por la extensión)
  const [searchParams, setSearchParams] = useSearchParams();

  const [showBulkDrawer, setShowBulkDrawer] = useState(false);

  // Dialog para crear contenido
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Project type selector flow
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showUnifiedCreate, setShowUnifiedCreate] = useState(false);
  const [createProjectType, setCreateProjectType] = useState<ProjectType | null>(null);
  const [showFillmakerFromBoard, setShowFillmakerFromBoard] = useState(false);
  
  // AI Panel state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPanelMode, setAIPanelMode] = useState<'card' | 'board'>('board');
  const [aiContentId, setAIContentId] = useState<string | undefined>();
  const [aiContentTitle, setAIContentTitle] = useState<string | undefined>();

  // Vista actual y configuración del board - using persisted view
  const currentView = persistence.currentView;
  const setCurrentView = persistence.setCurrentView;
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [listGroupBy, setListGroupBy] = useState<string>('status');
  
  // Autosave status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Show saving indicator
  useEffect(() => {
    if (persistence.isDirty) {
      setSaveStatus('saving');
    }
  }, [persistence.isDirty]);
  
  useEffect(() => {
    if (persistence.lastSaved) {
      setSaveStatus('saved');
      const timer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [persistence.lastSaved]);
  
  // Reset filters handler
  const handleResetFilters = useCallback(() => {
    setFilterCreatorId('all');
    setFilterEditorId('all');
    setFilterClientId('all');
    setFilterProductId('all');
    setFilterCampaignWeek('');
    setSearchTerm('');
    setDateRangeFilter(null);
    persistence.resetFilters();
    toast({
      title: "Filtros restablecidos",
      description: "Todos los filtros han sido eliminados"
    });
  }, [persistence, toast]);
  
  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return filterCreatorId !== 'all' ||
           filterEditorId !== 'all' ||
           filterClientId !== 'all' ||
           filterProductId !== 'all' ||
           searchTerm !== '' ||
           dateRangeFilter !== null;
  }, [filterCreatorId, filterEditorId, filterClientId, filterProductId, searchTerm, dateRangeFilter]);
  
  // Board settings hook
  const { settings, statuses: orgStatuses, rules, loading: settingsLoading, refetch: refetchSettings, updateSettings } = useBoardSettings(currentOrgId);
  const { creators: assignableCreators, editors: assignableEditors, refetch: refetchAssignable } = useOrgAssignableUsers(currentOrgId);

  // User board preferences hook (hybrid localStorage + Supabase sync)
  const {
    savedViews,
    activeViewId,
    activeView,
    tableConfig,
    preferences: userPreferences,
    isSyncing: isPreferencesSyncing,
    setActiveView: setActiveUserView,
    saveView,
    deleteView,
    renameView,
    updateTableConfig,
    updatePreferences,
  } = useBoardUserPreferences(currentOrgId);

  // Rol efectivo para permisos del board - use impersonated role if active
  const primaryRole = isImpersonating && impersonationTarget.role
    ? impersonationTarget.role
    : (activeRole ||
       (isAdmin ? 'admin' : isStrategist ? 'strategist' : isClient ? 'client' : isCreator ? 'creator' : isEditor ? 'editor' : 'client'));
  
  // UNIFICADO: Todos los roles ven TODAS las columnas. La diferencia está en el CONTENIDO, no en las columnas.
  const allBoardColumns = useMemo(() => {
    if (orgStatuses.length === 0) {
      return KANBAN_COLUMNS.map(col => ({
        ...col,
        sortOrder: KANBAN_COLUMNS.indexOf(col)
      }));
    }
    return orgStatuses
      .filter(s => s.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(s => ({
        status: s.status_key,
        title: s.label,
        color: s.color || '#6b7280',
        sortOrder: s.sort_order
      }));
  }, [orgStatuses]);

  // Toggle "Ocultar pagados" — oculta contenido con creator_paid y editor_paid = true (persistido en localStorage)
  const [hidePaidContent, setHidePaidContentState] = useState(false);
  useEffect(() => {
    const key = `board-hide-paid-${currentOrgId || 'default'}`;
    try {
      const v = localStorage.getItem(key);
      setHidePaidContentState(v === null ? false : v === 'true');
    } catch { /* ignore */ }
  }, [currentOrgId]);
  const setHidePaidContent = useCallback((v: boolean) => {
    setHidePaidContentState(v);
    const key = `board-hide-paid-${currentOrgId || 'default'}`;
    try { localStorage.setItem(key, String(v)); } catch { /* ignore */ }
  }, [currentOrgId]);

  // Toggle "Solo mis asignaciones" para editor/creador (persistido en localStorage)
  const [showOnlyAssigned, setShowOnlyAssignedState] = useState(true);
  useEffect(() => {
    const key = `board-show-only-assigned-${currentOrgId || 'default'}`;
    try {
      const v = localStorage.getItem(key);
      setShowOnlyAssignedState(v === null ? true : v === 'true');
    } catch { /* ignore */ }
  }, [currentOrgId]);
  const setShowOnlyAssigned = useCallback((v: boolean) => {
    setShowOnlyAssignedState(v);
    const key = `board-show-only-assigned-${currentOrgId || 'default'}`;
    try { localStorage.setItem(key, String(v)); } catch { /* ignore */ }
  }, [currentOrgId]);

  // Fetch content según rol - use targetUserId for impersonation
  // For external clients, force their client_id filter
  const effectiveClientId = externalClientId || (filterClientId !== 'all' ? filterClientId : undefined);

  const { content, loading, updateContentStatus, deleteContent, refetch } = useContentWithFilters({
    userId: targetUserId,
    role: primaryRole as any,
    creatorId: filterCreatorId !== 'all' && filterCreatorId !== '__unassigned__' ? filterCreatorId : undefined,
    editorId: filterEditorId !== 'all' && filterEditorId !== '__unassigned__' ? filterEditorId : undefined,
    clientId: effectiveClientId
  });

  // Deeplink: ?item=ID abre automáticamente el item (usado por la extensión Kreoon Capture)
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (!itemId || loading || !content.length) return;
    const found = content.find(c => c.id === itemId);
    if (found) {
      setSelectedContent(found);
      setSearchParams(p => { p.delete('item'); return p; }, { replace: true });
    }
  }, [searchParams, content, loading]);

  const handleDeleteContent = async (contentId: string) => {
    try {
      await deleteContent(contentId);
      toast({
        title: "Proyecto eliminado",
        description: "El proyecto se ha eliminado correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto",
        variant: "destructive"
      });
    }
  };

  // Derive filter lists from useOrgAssignableUsers (avoids duplicate org_members + profiles queries)
  useEffect(() => {
    setCreators(assignableCreators.map(c => ({ id: c.id, name: c.full_name || '' })));
    setEditors(assignableEditors.map(e => ({ id: e.id, name: e.full_name || '' })));
  }, [assignableCreators, assignableEditors]);

  // Fetch clients & products for filter dropdowns (admin only)
  useEffect(() => {
    if (!showAdminControls || !currentOrgId) {
      setClients([]);
      setProducts([]);
      return;
    }
    const fetchClientProducts = async () => {
      // Fetch clients and products in parallel using server-side JOINs
      // (avoids massive .in() clause with 500+ UUIDs that exceeds URL limits)
      const [clientsRes, productsRes] = await Promise.all([
        supabase.from('clients').select('id, name').eq('organization_id', currentOrgId),
        supabase.rpc('get_org_products', { p_organization_id: currentOrgId }),
      ]);
      setClients((clientsRes.data || []).map(c => ({ id: c.id, name: c.name })));
      setProducts((productsRes.data || []).map((p: any) => ({ id: p.id, name: p.name, client_name: p.client_name })));
    };
    fetchClientProducts();
  }, [showAdminControls, currentOrgId]);

  // Batch-fetch social publishing status for all content
  const allContentIds = useMemo(() => content.map(c => c.id), [content]);
  const { data: socialStatusMap } = useContentSocialStatus(allContentIds);

  // Extract unique campaign weeks from content
  const campaignWeeks = useMemo(() => {
    const weeks = new Set<string>();
    content.forEach(c => {
      if (c.campaign_week) weeks.add(c.campaign_week);
    });
    return Array.from(weeks).sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
  }, [content]);

  // Filtrar contenido por búsqueda, fechas, producto, campaña (sin filtrar por visibilidad de estado - todos ven todas las columnas)
  const filteredContent = useMemo(() => content.filter(c => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        (c.title ?? '').toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.client?.name?.toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;
    }

    if (startDateFilter || deadlineFilter) {
      const contentDate = c.created_at ? new Date(c.created_at) : null;
      if (!contentDate) return false;
      if (startDateFilter && contentDate < startDateFilter) return false;
      if (deadlineFilter && contentDate > deadlineFilter) return false;
    }

    // Filtro especial: sin creador asignado
    if (filterCreatorId === '__unassigned__' && c.creator_id) return false;

    // Filtro especial: sin editor asignado
    if (filterEditorId === '__unassigned__' && c.editor_id) return false;

    // Filtro por producto
    if (filterProductId !== 'all') {
      if (c.product_id !== filterProductId) return false;
    }

    // Ocultar contenido archivado (pagado al 100% y cerrado)
    if (hidePaidContent && c.status === 'archived') return false;

    return true;
  }), [content, searchTerm, dateRangeFilter, filterCreatorId, filterEditorId, filterProductId, hidePaidContent]);

  // Agrupar contenido por estado (soporta status personalizados)
  const getContentByStatus = (status: ContentStatus | string) => {
    return filteredContent.filter(c => c.status === status);
  };

  // Handlers de drag and drop
  const handleDragStart = useCallback((e: React.DragEvent, content: Content) => {
    setDraggingContent(content);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: ContentStatus | string) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggingContent || !user) {
      setDraggingContent(null);
      return;
    }

    if (draggingContent.status === targetStatus) {
      setDraggingContent(null);
      return;
    }

    const canMove = canMoveToStatusWithRules(
      primaryRole,
      draggingContent.status,
      targetStatus,
      draggingContent,
      user.id,
      orgStatuses,
      rules,
      roles // Pasar todos los roles para usuarios con permisos combinados
    );

    if (!canMove) {
      toast({
        title: 'Movimiento no permitido',
        description: 'No tienes permisos para realizar este cambio de estado',
        variant: 'destructive'
      });
      setDraggingContent(null);
      return;
    }

    try {
      await updateContentStatus(draggingContent.id, targetStatus as ContentStatus);
      // Get label from orgStatuses for custom statuses, fallback to STATUS_LABELS
      const statusLabel = orgStatuses.find(s => s.status_key === targetStatus)?.label || STATUS_LABELS[targetStatus as ContentStatus] || targetStatus;
      toast({
        title: 'Estado actualizado',
        description: `Movido a ${statusLabel}`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive'
      });
    }

    setDraggingContent(null);
  }, [draggingContent, user, primaryRole, updateContentStatus, toast, orgStatuses, rules]);

  const handleDragEnter = useCallback((status: ContentStatus | string) => {
    setDropTarget(status);
  }, []);

  // Handler for creator status change (assigned -> recording -> recorded) with UP integration
  const handleCreatorStatusChange = useCallback(async (contentId: string, newStatus: 'recording' | 'recorded') => {
    try {
      // Use centralized RPC that handles everything server-side (no prior SELECT needed)
      await updateContentStatusWithUP({
        contentId,
        oldStatus: 'assigned' as ContentStatus, // Will be obtained server-side
        newStatus: newStatus as ContentStatus
      });

      // Refresh the content list
      refetch();

      const statusLabels: Record<string, string> = {
        'recording': 'En Grabación',
        'recorded': 'Grabado'
      };
      toast({
        title: 'Estado actualizado',
        description: `Cambiado a: ${statusLabels[newStatus]}`
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive'
      });
    }
  }, [refetch, toast]);

  const handleAssignCreator = useCallback(
    async (contentId: string, userId: string) => {
      try {
        // Si userId está vacío, desasignar (poner null)
        const creatorId = userId || null;
        const { error } = await supabase.rpc('update_content_by_id', {
          p_content_id: contentId,
          p_updates: { creator_id: creatorId, updated_at: new Date().toISOString() }
        });
        if (error) throw error;
        refetch();
        refetchAssignable();
        toast({ title: creatorId ? "Creador asignado" : "Creador removido" });
      } catch (err) {
        console.error("Error assigning creator:", err);
        toast({ title: "Error al asignar", variant: "destructive" });
      }
    },
    [refetch, refetchAssignable, toast]
  );

  const handleAssignEditor = useCallback(
    async (contentId: string, userId: string) => {
      try {
        // Si userId está vacío, desasignar (poner null)
        const editorId = userId || null;
        const { error } = await supabase.rpc('update_content_by_id', {
          p_content_id: contentId,
          p_updates: { editor_id: editorId, updated_at: new Date().toISOString() }
        });
        if (error) throw error;
        refetch();
        refetchAssignable();
        toast({ title: editorId ? "Editor asignado" : "Editor removido" });
      } catch (err) {
        console.error("Error assigning editor:", err);
        toast({ title: "Error al asignar", variant: "destructive" });
      }
    },
    [refetch, refetchAssignable, toast]
  );

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-sm" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-sm" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header - Kreoon Tech */}
        <PageHeader
          icon={Scroll}
          title="Kreoon Producciones"
          subtitle="Centro de control de tus videos"
          action={
            <div className="flex items-center gap-2">
              {(isAdmin || isClient) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9 hidden sm:flex"
                  onClick={() => setShowBulkDrawer(true)}
                >
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="hidden md:inline">Generar en lote</span>
                </Button>
              )}
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar producción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 md:h-10 w-40 md:w-64 rounded-sm border border-border bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-[hsl(270,100%,60%,0.3)] transition-all placeholder:text-[hsl(270,30%,45%)]"
                />
              </div>
            </div>
          }
        />

        {/* Mobile search */}
        <div className="sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar producción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-sm border border-border bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-[hsl(270,30%,45%)]"
            />
          </div>
        </div>

        <>
        {/* Filtros para admin */}
        {showAdminControls && (
          <ContentBoardFilters
            dateRangeFilter={dateRangeFilter}
            setDateRangeFilter={setDateRangeFilter}
            filterCreatorId={filterCreatorId}
            setFilterCreatorId={setFilterCreatorId}
            creatorOptions={creatorOptions}
            filterEditorId={filterEditorId}
            setFilterEditorId={setFilterEditorId}
            editorOptions={editorOptions}
            filterClientId={filterClientId}
            setFilterClientId={setFilterClientId}
            clientOptions={clientOptions}
            filterProductId={filterProductId}
            setFilterProductId={setFilterProductId}
            productOptions={productOptions}
          />
        )}
        {/* Board Header with View Switcher - 2 rows layout */}
        <div className="rounded-sm border border-border bg-card p-3 md:p-4">
          {/* Row 1: Title + badges */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base md:text-lg font-semibold text-card-foreground">Flujo de Trabajo</h2>
              <Badge variant="outline" className="text-xs">{filteredContent.length} videos</Badge>
              {settings && settings.card_size !== 'normal' && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Settings2 className="h-3 w-3" />
                  {settings.card_size === 'compact' ? 'Compacta' : 'Grande'}
                </Badge>
              )}
              <AutoSaveIndicator status={saveStatus} lastSaved={persistence.lastSaved} />
            </div>
            {/* Primary action buttons always visible */}
            {showAdminControls && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowConfigDialog(true)}
                >
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Configurar</span>
                </Button>
                <Button
                  variant="glow"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => guardAction(() => setShowTypeSelector(true))}
                  disabled={isReadOnly}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nueva Producción</span>
                  <span className="sm:hidden">+</span>
                </Button>
              </div>
            )}
          </div>
          {/* Row 2: View controls + secondary actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasActiveFilters && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={handleResetFilters}
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="hidden sm:inline">Quitar filtros</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Restablecer todos los filtros</TooltipContent>
                </Tooltip>
              )}
              {['creator', 'editor'].includes(primaryRole as string) && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-only-assigned"
                    checked={showOnlyAssigned}
                    onCheckedChange={setShowOnlyAssigned}
                  />
                  <Label htmlFor="show-only-assigned" className="text-xs md:text-sm cursor-pointer whitespace-nowrap">
                    Solo mis asignaciones
                  </Label>
                </div>
              )}
              {showAdminControls && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="hide-paid-content"
                    checked={hidePaidContent}
                    onCheckedChange={setHidePaidContent}
                  />
                  <Label htmlFor="hide-paid-content" className="text-xs md:text-sm cursor-pointer whitespace-nowrap">
                    Ocultar archivados
                  </Label>
                </div>
              )}
              <ViewSelector
                savedViews={savedViews}
                activeViewId={activeViewId}
                currentViewType={currentView}
                onSelectView={(viewId) => {
                  setActiveUserView(viewId);
                  // Si selecciona una vista guardada, cambiar al tipo de vista correspondiente
                  if (viewId) {
                    const view = savedViews.find(v => v.id === viewId);
                    if (view) {
                      setCurrentView(view.type);
                    }
                  }
                }}
                onSaveCurrentView={(name) => {
                  saveView({
                    name,
                    type: currentView,
                    config: {
                      visibleColumns: settings.visible_fields || [],
                      columnOrder: tableConfig.columnOrder,
                      columnWidths: tableConfig.columnWidths,
                      sortBy: userPreferences.defaultSort,
                      cardSize: settings.card_size || 'normal',
                    },
                  });
                }}
                onRenameView={renameView}
                onDeleteView={deleteView}
                isSyncing={isPreferencesSyncing}
              />
              <BoardViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
              {showAdminControls && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1.5"
                        onClick={() => {
                          setAIPanelMode('board');
                          setAIContentId(undefined);
                          setAIContentTitle(undefined);
                          setShowAIPanel(true);
                        }}
                      >
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Analizar IA</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Analizar tablero con IA</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>

          {/* Kanban View - Tech/IA aesthetic - Hierarchical layout */}
          {currentView === 'kanban' && (
            <ContentBoardKanbanView
              allBoardColumns={allBoardColumns}
              getContentByStatus={getContentByStatus}
              dropTarget={dropTarget}
              draggingContent={draggingContent}
              primaryRole={primaryRole as string}
              targetUserId={targetUserId}
              orgStatuses={orgStatuses}
              rules={rules}
              roles={roles}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDragEnter={handleDragEnter}
              handleDragStart={handleDragStart}
              expandedColumns={expandedColumns}
              toggleColumnExpand={toggleColumnExpand}
              settings={settings}
              updateSettings={updateSettings}
              setSelectedContent={setSelectedContent}
              showAdminControls={showAdminControls}
              ambassadorIds={ambassadorIds}
              updateContentStatus={updateContentStatus}
              refetch={refetch}
              setAIPanelMode={setAIPanelMode}
              setAIContentId={setAIContentId}
              setAIContentTitle={setAIContentTitle}
              setShowAIPanel={setShowAIPanel}
              assignableCreators={assignableCreators}
              assignableEditors={assignableEditors}
              handleAssignCreator={handleAssignCreator}
              handleAssignEditor={handleAssignEditor}
              socialStatusMap={socialStatusMap}
            />
          )}
          
          {/* List View - conectado a preferencias de usuario */}
          {currentView === 'list' && (
            <BoardListView
              content={filteredContent}
              onContentClick={setSelectedContent}
              cardSize={settings?.card_size || 'normal'}
              visibleFields={settings?.visible_fields || ['title', 'thumbnail', 'status', 'client', 'responsible', 'deadline']}
              onVisibleFieldsChange={(fields) => updateSettings({ visible_fields: fields })}
              organizationStatuses={orgStatuses}
              ambassadorIds={ambassadorIds}
              showFieldsCustomizer={true}
              groupBy={listGroupBy}
              onGroupByChange={setListGroupBy}
            />
          )}
          
          {/* Calendar View - conectado a preferencias de usuario */}
          {currentView === 'calendar' && (
            <BoardCalendarView
              content={filteredContent}
              currentDate={calendarDate}
              onDateChange={setCalendarDate}
              onContentClick={setSelectedContent}
              cardSize={settings?.card_size || 'normal'}
              visibleFields={settings?.visible_fields || ['title', 'status', 'responsible']}
              onVisibleFieldsChange={(fields) => updateSettings({ visible_fields: fields })}
              organizationStatuses={orgStatuses}
              ambassadorIds={ambassadorIds}
              showFieldsCustomizer={true}
            />
          )}
          
          {/* Table View - conectado a preferencias de usuario */}
          {currentView === 'table' && (
            <BoardTableView
              content={filteredContent}
              onContentClick={setSelectedContent}
              visibleFields={
                tableConfig.visibleColumns.length > 0
                  ? tableConfig.visibleColumns
                  : settings?.visible_fields || ['title', 'thumbnail', 'status', 'client', 'responsible', 'deadline']
              }
              organizationStatuses={orgStatuses}
              ambassadorIds={ambassadorIds}
              columnOrder={tableConfig.columnOrder}
              columnWidths={tableConfig.columnWidths}
              onColumnOrderChange={(order) => updateTableConfig({ columnOrder: order })}
              onColumnWidthsChange={(widths) => updateTableConfig({ columnWidths: widths })}
              onVisibleFieldsChange={(fields) => updateTableConfig({ visibleColumns: fields })}
              enableReorder={true}
              enableResize={true}
              initialSortField={userPreferences.defaultSort?.field as 'title' | 'status' | 'client' | 'creator' | 'deadline' | 'created_at' || 'created_at'}
              initialSortDirection={userPreferences.defaultSort?.direction || 'desc'}
              onSortChange={(field, direction) => updatePreferences({ defaultSort: { field, direction } })}
            />
          )}
        </div>
      </>
      </div>

      {/* Config Dialog */}
      {showAdminControls && (
        <BoardConfigDialog 
          organizationId={currentOrgId}
          open={showConfigDialog}
          onOpenChange={setShowConfigDialog}
          onSettingsChange={refetchSettings}
        />
      )}

      <Suspense fallback={null}>
        <UnifiedProjectModal
          source="content"
          projectId={selectedContent?.id}
          open={!!selectedContent}
          onOpenChange={(open) => !open && setSelectedContent(null)}
          onUpdate={refetch}
          onDelete={handleDeleteContent}
        />
      </Suspense>

      <Suspense fallback={null}>
        <UnifiedProjectModal
          source="content"
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onUpdate={refetch}
          mode="create"
        />
      </Suspense>

      {/* Project type selector */}
      <ProjectTypeSelector
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        onSelect={(type) => {
          if (type === 'content_creation') {
            setShowCreateDialog(true);
          } else {
            setCreateProjectType(type);
            setShowUnifiedCreate(true);
          }
        }}
        onSelectFillmaker={showAdminControls ? () => setShowFillmakerFromBoard(true) : undefined}
      />

      {/* Fillmaker desde el kanban */}
      {showAdminControls && currentOrgId && (
        <FillmakerDialog
          open={showFillmakerFromBoard}
          onOpenChange={setShowFillmakerFromBoard}
          orgId={currentOrgId}
          clientId={filterClientId !== 'all' ? filterClientId : undefined}
          clients={filterClientId === 'all' ? clients : undefined}
        />
      )}

      {/* Unified modal for non-content project types */}
      {showUnifiedCreate && createProjectType && (
        <Suspense fallback={null}>
          <UnifiedProjectModal
            source="marketplace"
            open={showUnifiedCreate}
            onOpenChange={(open) => {
              setShowUnifiedCreate(open);
              if (!open) setCreateProjectType(null);
            }}
            onUpdate={refetch}
            mode="create"
            createProjectType={createProjectType}
          />
        </Suspense>
      )}

      {/* AI Analysis Panel */}
      {showAdminControls && currentOrgId && (
        <BoardAIPanel
          organizationId={currentOrgId}
          open={showAIPanel}
          onClose={() => setShowAIPanel(false)}
          mode={aiPanelMode}
          contentId={aiContentId}
          contentTitle={aiContentTitle}
        />
      )}

      {/* Bulk Generation Drawer */}
      <BulkGenerationDrawer open={showBulkDrawer} onOpenChange={setShowBulkDrawer} clientId={externalClientId ?? undefined} />
    </div>
  );
}
