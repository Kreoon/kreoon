import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ProjectTypeSelector } from "@/components/projects/ProjectTypeSelector";
import { FillmakerDialog } from "@/components/clients/FillmakerDialog";
import { AlertTriangle, Brain, Loader2, Plus, RefreshCw, Scroll, Settings2, Zap } from "lucide-react";
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
import { Content, ContentStatus, KANBAN_COLUMNS, STATUS_LABELS } from "@/types/database";
import { isProductionOnlyTalent } from "@/lib/creatorScope";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { type SearchableSelectOption } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { type DateRangeValue } from "@/lib/date-presets";
import {
  BoardView,
  BoardConfigDialog,
  BoardCalendarView,
  BoardTableView,
  BoardListView,
  BoardAIPanel,
  ViewSelector,
  CardFieldsCustomizer,
} from "@/components/board";
import { useBoardSettings } from "@/hooks/useBoardSettings";
import { useBoardPersistence } from "@/hooks/useBoardPersistence";
import { useBoardUserPreferences } from "@/hooks/useBoardUserPreferences";
import { useOrgAssignableUsers } from "@/hooks/useOrgAssignableUsers";
import { useContentSocialStatus } from "@/modules/social/hooks/useContentSocialStatus";
import { ContentBoardFilters } from "@/components/content-board/ContentBoardFilters";
import { ContentBoardKanbanView } from "@/components/content-board/ContentBoardKanbanView";
import { BoardToolbar } from "@/components/content-board/BoardToolbar";
import { ShareContentDialog } from "@/components/content-board/ShareContentDialog";
import { useContentMove } from "@/components/content-board/useContentMove";
import { restoreFocusToCard } from "@/components/content-board/kanban/kanbanFocus";
import { DEFAULT_VISIBLE_FIELDS, groupContentByStatus, matchesClientFilters, type BoardClientFilters } from "@/components/content-board/kanban/kanbanUtils";
import type {
  AssigneeKind,
  BoardColumnDef,
  KanbanCardContext,
  KanbanDensity,
  ShareMode,
} from "@/components/content-board/kanban/kanbanTypes";

/** Colores de respaldo cuando la etapa viene de KANBAN_COLUMNS (clases CSS → hex). */
const FALLBACK_COLORS: Record<string, string> = {
  'bg-muted-foreground': '#6b7280',
  'bg-info': '#3b82f6',
  'bg-purple-500': '#8b5cf6',
  'bg-purple-600': '#9333ea',
  'bg-orange-500': '#f97316',
  'bg-cyan-500': '#06b6d4',
  'bg-pink-500': '#ec4899',
  'bg-emerald-500': '#10b981',
  'bg-destructive': '#ef4444',
  'bg-blue-500': '#3b82f6',
  'bg-success': '#22c55e',
};

const CAN_ASSIGN_ROLES = ["admin", "team_leader"];

export default function ContentBoard() {
  const { user, profile, isAdmin, isStrategist, isCreator, isEditor, isClient, activeRole: realActiveRole, roles } = useAuth();
  const { effectiveUserId, isImpersonating, impersonationTarget } = useImpersonation();
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
  // Rango sobre la fecha de CREACIÓN (created_at). Las claves persistidas (startDate/deadline) se conservan por compatibilidad.
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeValue | null>(
    persistence.filters.startDate && persistence.filters.deadline
      ? { preset: 'custom' as const, from: new Date(persistence.filters.startDate), to: new Date(persistence.filters.deadline) }
      : null
  );
  const createdFromFilter = dateRangeFilter?.from;
  const createdToFilter = dateRangeFilter?.to;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Detalle: UN solo modal montado (antes había dos idénticos). Se recuerda qué tarjeta lo abrió para devolver el foco.
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const returnFocusIdRef = useRef<string | null>(null);

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

  // Compartir (diálogo único, solo montado cuando hay una producción seleccionada)
  const [shareTarget, setShareTarget] = useState<{ content: Content; mode: ShareMode } | null>(null);

  // Vista actual y configuración del board - using persisted view
  const currentView = persistence.currentView;
  const setCurrentView = persistence.setCurrentView;
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [listGroupBy, setListGroupBy] = useState<string>('status');

  // Reset filters handler
  const handleResetFilters = useCallback(() => {
    setFilterCreatorId('all');
    setFilterEditorId('all');
    setFilterClientId('all');
    setFilterProductId('all');
    setSearchTerm('');
    setDateRangeFilter(null);
    persistence.resetFilters();
    toast({
      title: "Filtros restablecidos",
      description: "Todos los filtros han sido eliminados"
    });
  }, [persistence, toast]);

  // Board settings hook
  const { settings, statuses: orgStatuses, rules, refetch: refetchSettings, updateSettings } = useBoardSettings(currentOrgId);
  const { creators: assignableCreators, editors: assignableEditors, refetch: refetchAssignable } = useOrgAssignableUsers(currentOrgId);

  // User board preferences hook (hybrid localStorage + Supabase sync)
  const {
    savedViews,
    activeViewId,
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
  const allBoardColumns = useMemo<BoardColumnDef[]>(() => {
    if (orgStatuses.length === 0) {
      return KANBAN_COLUMNS.map((col, i) => ({
        status: col.status as string,
        title: col.title,
        color: FALLBACK_COLORS[col.color] || '#6b7280',
        sortOrder: i,
      }));
    }
    return orgStatuses
      .filter(s => s.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(s => ({
        status: s.status_key,
        // Si la org guardó la clave cruda como nombre ("archived"), mostrar la etiqueta en español
        title: !s.label || s.label === s.status_key ? STATUS_LABELS[s.status_key as ContentStatus] || s.label : s.label,
        color: s.color || '#6b7280',
        sortOrder: s.sort_order,
      }));
  }, [orgStatuses]);

  // Toggle "Ocultar archivados" — oculta contenido con status 'archived' (persistido en localStorage)
  const [hidePaidContent, setHidePaidContentState] = useState(false);
  useEffect(() => {
    const key = `board-hide-paid-${currentOrgId || 'default'}`;
    try {
      const v = localStorage.getItem(key);
      // Creador/editor: por defecto solo el trabajo activo; el historial queda a un clic
      setHidePaidContentState(v === null ? isProductionOnlyTalent(roles) : v === 'true');
    } catch { /* ignore */ }
  }, [currentOrgId, roles]);
  const setHidePaidContent = useCallback((v: boolean) => {
    setHidePaidContentState(v);
    const key = `board-hide-paid-${currentOrgId || 'default'}`;
    try { localStorage.setItem(key, String(v)); } catch { /* ignore */ }
  }, [currentOrgId]);

  // Densidad Cómoda/Compacta: preferencia VISUAL por usuario (localStorage). No cambia datos ni permisos.
  const densityKey = `kreoon:board-density:${currentOrgId || 'default'}`;
  const [density, setDensityState] = useState<KanbanDensity>('compact');
  useEffect(() => {
    try {
      const v = localStorage.getItem(densityKey);
      if (v === 'comfortable' || v === 'compact') setDensityState(v);
    } catch { /* ignore */ }
  }, [densityKey]);
  const setDensity = useCallback((d: KanbanDensity) => {
    setDensityState(d);
    try { localStorage.setItem(densityKey, d); } catch { /* ignore */ }
  }, [densityKey]);

  // Fetch content según rol - use targetUserId for impersonation
  // For external clients, force their client_id filter
  const effectiveClientId = externalClientId || (filterClientId !== 'all' ? filterClientId : undefined);

  const {
    content, loading, error, deleteContent, refetch, moveContentStatus, hasMore, loadingMore, loadMore,
  } = useContentWithFilters({
    userId: targetUserId,
    role: primaryRole as any,
    creatorId: filterCreatorId !== 'all' && filterCreatorId !== '__unassigned__' ? filterCreatorId : undefined,
    editorId: filterEditorId !== 'all' && filterEditorId !== '__unassigned__' ? filterEditorId : undefined,
    clientId: effectiveClientId
  });

  // Los refetch (filtros de servidor, asignar, cerrar el detalle) mantienen el tablero montado para no perder
  // búsqueda, foco ni posición de scroll; el esqueleto solo aparece cuando aún no hay nada que mostrar.
  // Cargando y sin nada que mostrar → esqueleto (nunca columnas en cero ni «sin producciones» mientras se carga).
  const showSkeleton = loading && content.length === 0;
  const refreshing = loading && !showSkeleton;

  // Abrir detalle recordando qué tarjeta lo abrió (para devolver el foco al cerrar)
  const openDetail = useCallback((c: Content) => {
    returnFocusIdRef.current = c.id;
    setSelectedContent(c);
  }, []);

  const handleDetailOpenChange = useCallback((open: boolean) => {
    if (open) return;
    setSelectedContent(null);
    // El detalle es un diálogo sin disparador asociado: al cerrarse el foco cae en <body>; se devuelve a la tarjeta.
    if (returnFocusIdRef.current) restoreFocusToCard(returnFocusIdRef.current);
  }, []);

  // Deeplink: ?item=ID abre automáticamente el item (usado por la extensión Kreoon Capture)
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (!itemId || loading || !content.length) return;
    const found = content.find(c => c.id === itemId);
    if (found) {
      setSelectedContent(found);
      setSearchParams(p => { p.delete('item'); return p; }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Filtros de cliente (sobre lo cargado). Creador/Editor/Cliente concretos ya vienen resueltos por el servidor.
  const clientFilters = useMemo<BoardClientFilters>(() => ({
    searchTerm,
    createdFrom: createdFromFilter,
    createdTo: createdToFilter,
    creatorId: filterCreatorId,
    editorId: filterEditorId,
    productId: filterProductId,
    hideArchived: hidePaidContent,
  }), [searchTerm, createdFromFilter, createdToFilter, filterCreatorId, filterEditorId, filterProductId, hidePaidContent]);

  const filteredContent = useMemo(
    () => content.filter(c => matchesClientFilters(c, clientFilters)),
    [content, clientFilters],
  );

  // Agrupar por estado UNA sola vez (un recorrido), no un filter() por columna en cada render
  const columnKeys = useMemo(() => allBoardColumns.map(c => c.status), [allBoardColumns]);
  const grouped = useMemo(() => groupContentByStatus(filteredContent, columnKeys), [filteredContent, columnKeys]);
  const contentById = useMemo(() => new Map(content.map(c => [c.id, c])), [content]);

  // Filtros activos (para «Quitar filtros»): incluye los de servidor y de cliente
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterCreatorId !== 'all') n++;
    if (filterEditorId !== 'all') n++;
    if (filterClientId !== 'all') n++;
    if (filterProductId !== 'all') n++;
    if (searchTerm !== '') n++;
    if (dateRangeFilter !== null) n++;
    return n;
  }, [filterCreatorId, filterEditorId, filterClientId, filterProductId, searchTerm, dateRangeFilter]);

  // Cambios de estado: arrastre, «Mover a…» y acciones rápidas comparten el mismo flujo
  const handleShare = useCallback((c: Content, mode: ShareMode) => setShareTarget({ content: c, mode }), []);
  const move = useContentMove({
    contentById,
    columns: allBoardColumns,
    userId: targetUserId,
    primaryRole: primaryRole as string,
    roles,
    orgStatuses,
    rules,
    moveContentStatus,
    filters: clientFilters,
    onOpenDetail: openDetail,
    onShare: handleShare,
  });

  const { requestMove } = move;
  const handleMove = useCallback((contentId: string, target: string) => requestMove(contentId, target), [requestMove]);

  const handleAssign = useCallback(
    async (kind: AssigneeKind, contentId: string, userId: string) => {
      const field = kind === 'creator' ? 'creator_id' : 'editor_id';
      const label = kind === 'creator' ? 'Creador' : 'Editor';
      try {
        // Si userId está vacío, desasignar (poner null)
        const value = userId || null;
        const { error } = await supabase.rpc('update_content_by_id', {
          p_content_id: contentId,
          p_updates: { [field]: value, updated_at: new Date().toISOString() },
        });
        if (error) throw error;
        refetch();
        refetchAssignable();
        toast({ title: value ? `${label} asignado` : `${label} removido` });
      } catch (err) {
        console.error(`Error assigning ${kind}:`, err);
        toast({ title: "Error al asignar", description: "No se guardó el cambio. Inténtalo de nuevo.", variant: "destructive" });
      }
    },
    [refetch, refetchAssignable, toast]
  );

  const handleAnalyze = useCallback((contentId: string, title: string) => {
    setAIPanelMode('card');
    setAIContentId(contentId);
    setAIContentTitle(title);
    setShowAIPanel(true);
  }, []);

  // Contexto ESTABLE de las tarjetas (memoizado: no se recrea en cada render del tablero)
  const cardCtx = useMemo<KanbanCardContext>(() => ({
    columns: allBoardColumns,
    userId: targetUserId,
    userRole: primaryRole as string,
    // Igual que antes: handlers solo para admin (sin suplantar otro rol) o team_leader, y el rol efectivo debe poder asignar
    canAssign: (showAdminControls || (primaryRole as string) === 'team_leader') && CAN_ASSIGN_ROLES.includes(primaryRole as string),
    creators: assignableCreators,
    editors: assignableEditors,
    getMoveTargets: move.getMoveTargets,
    onOpen: openDetail,
    onMove: handleMove,
    onQuickStatus: move.quickStatus,
    onAssign: handleAssign,
    onShare: handleShare,
    onAnalyze: showAdminControls ? handleAnalyze : undefined,
  }), [allBoardColumns, targetUserId, primaryRole, showAdminControls, assignableCreators, assignableEditors,
    move.getMoveTargets, move.quickStatus, openDetail, handleMove, handleAssign, handleShare, handleAnalyze]);

  const visibleFields = settings?.visible_fields && settings.visible_fields.length > 0 ? settings.visible_fields : DEFAULT_VISIBLE_FIELDS;

  const canCreate = showAdminControls;
  const loadedCount = content.length;
  const searchHint = (() => {
    // Un error de carga NUNCA se presenta como «0 producciones»
    if (error && loadedCount === 0) return 'No se pudieron cargar los proyectos.';
    const shown = filteredContent.length;
    const base = shown === loadedCount
      ? `${loadedCount} ${loadedCount === 1 ? 'proyecto' : 'proyectos'}`
      : `${shown} de ${loadedCount} proyectos`;
    const orphan = currentView === 'kanban' && grouped.orphanCount > 0
      ? ` · ${grouped.orphanCount} en estados sin etapa configurada (no se muestran en el tablero)`
      : '';
    const scope = hasMore ? ' · Hay más sin cargar: la búsqueda y los filtros de fecha/producto solo cubren las ya cargadas.' : '';
    return `${base}${orphan}${scope}`;
  })();

  const statusLine = (
    <>
      {refreshing && (
        <span className="inline-flex items-center gap-1.5" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Actualizando…
        </span>
      )}
      {hasMore && (
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Cargar más proyectos
        </Button>
      )}
      {persistence.lastSaved && !isProductionOnlyTalent(roles) && (
        <span title="Última vez que se guardaron la vista y los filtros de este tablero">
          Vista guardada {formatDistanceToNow(persistence.lastSaved, { addSuffix: true, locale: es })}
        </span>
      )}
    </>
  );

  const boardIsEmpty = !loading && !error && content.length === 0 && activeFilterCount === 0;
  // Creador/editor: tablero en modo simple (sin densidad, vistas guardadas ni calendario/tabla)
  const talentView = isProductionOnlyTalent(roles);
  useEffect(() => {
    if (talentView && currentView !== 'kanban' && currentView !== 'list') setCurrentView('kanban');
  }, [talentView, currentView, setCurrentView]);
  const archivedCount = useMemo(() => content.filter(c => c.status === 'archived').length, [content]);

  return (
    <div className="min-h-screen">
      <div className="space-y-4 p-4 md:p-6">
        <PageHeader
          icon={Scroll}
          title="Proyectos"
          subtitle="Tus videos y en qué etapa va cada uno"
          action={
            <div className="flex items-center gap-2">
              {(isAdmin || isClient) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden h-10 gap-1.5 sm:flex"
                  onClick={() => setShowBulkDrawer(true)}
                >
                  <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="hidden xl:inline">Generar en lote</span>
                  <span className="sr-only xl:hidden">Generar en lote</span>
                </Button>
              )}
              {canCreate && (
                <Button
                  size="sm"
                  className="h-10 gap-1.5"
                  onClick={() => guardAction(() => setShowTypeSelector(true))}
                  disabled={isReadOnly}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Nueva producción
                </Button>
              )}
            </div>
          }
        />

        <BoardToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchHint={searchHint}
          filters={showAdminControls ? (
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
          ) : undefined}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
          view={currentView as BoardView}
          onViewChange={setCurrentView}
          density={density}
          onDensityChange={setDensity}
          hideArchived={showAdminControls ? { checked: hidePaidContent, onChange: setHidePaidContent } : undefined}
          statusLine={statusLine}
          simple={talentView}
          actions={talentView ? undefined : 
            <>
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
              {currentView === 'kanban' && (
                <CardFieldsCustomizer
                  visibleFields={visibleFields}
                  onFieldsChange={(fields) => updateSettings({ visible_fields: fields })}
                  className="h-10 w-10 border border-border/60 bg-background text-muted-foreground opacity-100 hover:bg-muted hover:text-foreground"
                />
              )}
              {showAdminControls && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-1.5"
                    onClick={() => {
                      setAIPanelMode('board');
                      setAIContentId(undefined);
                      setAIContentTitle(undefined);
                      setShowAIPanel(true);
                    }}
                    title="Analizar tablero con IA"
                  >
                    <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="hidden 2xl:inline">Analizar IA</span>
                    <span className="sr-only 2xl:hidden">Analizar tablero con IA</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-1.5"
                    onClick={() => setShowConfigDialog(true)}
                    title="Configurar tablero"
                  >
                    <Settings2 className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden 2xl:inline">Configurar</span>
                    <span className="sr-only 2xl:hidden">Configurar tablero</span>
                  </Button>
                </>
              )}
            </>
          }
        />

        {/* Error de carga: nunca se muestra como «0 producciones» */}
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control,0.75rem)] border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              {content.length === 0
                ? 'No se pudieron cargar las producciones. Esto no significa que no existan.'
                : 'No se pudo actualizar el tablero. Se muestran los datos cargados antes y pueden estar desactualizados.'}
            </span>
            <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => void refetch()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        )}

        {boardIsEmpty && currentView === 'kanban' && (
          <div className="rounded-[var(--radius-card,1.25rem)] border border-dashed border-border bg-card/60 p-8 text-center">
            <p className="text-base font-semibold text-foreground">Aún no hay producciones</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canCreate ? 'Crea la primera producción para verla en el tablero.' : 'Cuando te asignen una producción aparecerá aquí.'}
            </p>
            {canCreate && (
              <Button className="mt-4 gap-1.5" onClick={() => guardAction(() => setShowTypeSelector(true))} disabled={isReadOnly}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nueva producción
              </Button>
            )}
          </div>
        )}

        {showSkeleton && (
          <div className="flex gap-3 overflow-hidden" role="status" aria-busy="true" aria-label="Cargando producciones">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="w-72 shrink-0 space-y-2 rounded-[var(--radius-card,1.25rem)] bg-muted/40 p-2">
                <Skeleton className="h-6 w-32" />
                {[0, 1, 2].map(j => <Skeleton key={j} className="h-36 w-full rounded-[var(--radius-control,0.75rem)]" />)}
              </div>
            ))}
          </div>
        )}

        {/* Historial oculto y nada activo: decirlo claro en vez de un tablero vacío */}
        {!showSkeleton && !boardIsEmpty && hidePaidContent && filteredContent.length === 0 && archivedCount > 0 && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="font-semibold text-foreground">No tienes trabajos pendientes</p>
              <p className="text-sm text-muted-foreground">Tus trabajos terminados y pagados están en el historial.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setHidePaidContent(false)}>
              Ver trabajos anteriores ({archivedCount})
            </Button>
          </div>
        )}

        {/* Creador/editor con historial visible: volver a solo pendientes */}
        {!showSkeleton && !boardIsEmpty && !showAdminControls && !hidePaidContent && archivedCount > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setHidePaidContent(true)}
              className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Ver solo pendientes
            </button>
          </div>
        )}

        {!showSkeleton && !boardIsEmpty && !(error && content.length === 0) && !(hidePaidContent && filteredContent.length === 0 && archivedCount > 0) && (
          <>
            {currentView === 'kanban' && (
              <ContentBoardKanbanView
                columns={allBoardColumns}
                grouped={grouped}
                contentById={contentById}
                density={density}
                visibleFields={visibleFields}
                ctx={cardCtx}
                socialStatusMap={socialStatusMap}
                movingIds={move.movingIds}
                pinnedId={move.pinnedId}
                canMove={move.canMove}
                onMove={handleMove}
              />
            )}

            {/* List View - conectado a preferencias de usuario */}
            {currentView === 'list' && (
              <BoardListView
                content={filteredContent}
                onContentClick={openDetail}
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
                onContentClick={openDetail}
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
                onContentClick={openDetail}
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
          </>
        )}
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

      {/* Detalle: un único modal (UnifiedProjectModal conserva todas sus acciones) */}
      <Suspense fallback={null}>
        <UnifiedProjectModal
          source="content"
          projectId={selectedContent?.id}
          open={!!selectedContent}
          onOpenChange={handleDetailOpenChange}
          onUpdate={refetch}
          onDelete={handleDeleteContent}
        />
      </Suspense>

      {/* Crear producción: solo se monta al abrirse */}
      {showCreateDialog && (
        <Suspense fallback={null}>
          <UnifiedProjectModal
            source="content"
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onUpdate={refetch}
            mode="create"
          />
        </Suspense>
      )}

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

      {/* Compartir en redes (un solo diálogo para todo el tablero) */}
      <ShareContentDialog
        content={shareTarget?.content ?? null}
        mode={shareTarget?.mode ?? 'full'}
        onOpenChange={(open) => { if (!open) setShareTarget(null); }}
      />

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
