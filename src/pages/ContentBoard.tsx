import { useState, useCallback, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DroppableKanbanColumn } from "@/components/dashboard/DroppableKanbanColumn";
import { DraggableContentCard } from "@/components/dashboard/DraggableContentCard";
import { ContentDetailDialog } from "@/components/content/ContentDetailDialog/index";
import { Search, Plus, Filter, CalendarIcon, X, Settings2, Scroll, RotateCcw, Brain } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useTrialGuard } from "@/hooks/useTrialGuard";
import { useContentWithFilters } from "@/hooks/useContent";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useInternalOrgContent } from "@/hooks/useInternalOrgContent";
import { Content, ContentStatus, KANBAN_COLUMNS, STATUS_ORDER, STATUS_LABELS, Product } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { updateContentStatusWithUP } from "@/hooks/useContentStatusWithUP";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { 
  BoardViewSwitcher, 
  BoardView, 
  BoardConfigDialog, 
  BoardCalendarView, 
  BoardTableView, 
  BoardListView,
  EnhancedKanbanColumn,
  EnhancedContentCard,
  BoardAIPanel
} from "@/components/board";
import { useBoardSettings } from "@/hooks/useBoardSettings";
import { useBoardPersistence } from "@/hooks/useBoardPersistence";
import { AutoSaveIndicator } from "@/components/ui/autosave-indicator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Columnas base del Kanban
const BOARD_COLUMNS = KANBAN_COLUMNS;

// Columnas para editores: solo desde 'recorded' en adelante
const EDITOR_COLUMNS = KANBAN_COLUMNS.filter(col => 
  ['recorded', 'editing', 'delivered', 'issue', 'approved'].includes(col.status)
);

// Columnas para creadores: solo desde 'assigned' en adelante
const CREATOR_COLUMNS = KANBAN_COLUMNS.filter(col => 
  ['assigned', 'recording', 'recorded', 'editing', 'delivered', 'approved', 'paid'].includes(col.status)
);

// Helper types for movement rules
interface StatusRule {
  status_id: string;
  can_advance_roles: string[];
  can_retreat_roles: string[];
  can_view_roles: string[];
}

interface OrgStatus {
  id: string;
  status_key: string;
  sort_order: number;
}

// Verificar si un movimiento de estado es válido según el rol y las reglas configuradas
const canMoveToStatusWithRules = (
  role: string,
  currentStatus: ContentStatus,
  targetStatus: ContentStatus,
  content: Content,
  userId: string,
  orgStatuses: OrgStatus[],
  rules: StatusRule[]
): boolean => {
  // Admin siempre puede mover
  if (role === 'admin') return true;

  // Encontrar los estados en la configuración de la organización
  const currentOrgStatus = orgStatuses.find(s => s.status_key === currentStatus);
  const targetOrgStatus = orgStatuses.find(s => s.status_key === targetStatus);
  
  // Si no hay configuración de estados, usar lógica legacy
  if (!currentOrgStatus || !targetOrgStatus || rules.length === 0) {
    return canMoveToStatusLegacy(role, currentStatus, targetStatus, content, userId);
  }

  // Buscar las reglas para el estado actual
  const currentRule = rules.find(r => r.status_id === currentOrgStatus.id);

  // Si no hay regla para el estado actual, permitir por defecto
  if (!currentRule) {
    return true;
  }

  // Determinar si es avance o retroceso basado en sort_order
  const isForward = targetOrgStatus.sort_order > currentOrgStatus.sort_order;

  // Verificar permisos según dirección desde el estado actual
  if (isForward) {
    const canAdvanceRoles = currentRule.can_advance_roles || [];
    if (canAdvanceRoles.length === 0) return true; // Sin restricciones
    return canAdvanceRoles.includes(role);
  } else {
    const canRetreatRoles = currentRule.can_retreat_roles || [];
    if (canRetreatRoles.length === 0) return true; // Sin restricciones
    return canRetreatRoles.includes(role);
  }
};

// Lógica legacy como fallback
const canMoveToStatusLegacy = (
  role: string,
  currentStatus: ContentStatus,
  targetStatus: ContentStatus,
  content: Content,
  userId: string
): boolean => {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const targetIndex = STATUS_ORDER.indexOf(targetStatus);

  if (role === 'admin') return true;

  if (role === 'client') {
    if (currentStatus === 'draft' && targetStatus === 'script_approved') return true;
    if (currentStatus === 'delivered' && targetStatus === 'approved') return true;
    if (currentStatus === 'delivered' && targetStatus === 'issue') return true;
    return false;
  }

  if (role === 'creator') {
    if (content.creator_id !== userId) return false;
    if (targetStatus === 'paid' || targetStatus === 'approved') return false;
    if (targetIndex <= currentIndex) return false;
    if (currentStatus === 'assigned' && targetStatus === 'recording') return true;
    if (currentStatus === 'recording' && targetStatus === 'recorded') return true;
    return false;
  }

  if (role === 'editor') {
    if (content.editor_id !== userId) return false;
    if (targetStatus === 'paid' || targetStatus === 'approved') return false;
    if (targetIndex <= currentIndex) return false;
    if (currentStatus === 'recorded' && targetStatus === 'editing') return true;
    if (currentStatus === 'editing' && targetStatus === 'delivered') return true;
    return false;
  }

  return false;
};

export default function ContentBoard() {
  const { user, isAdmin, isStrategist, isCreator, isEditor, isClient, activeRole: realActiveRole } = useAuth();
  const { effectiveUserId, effectiveRoles, isImpersonating, impersonationTarget } = useImpersonation();
  const { currentOrgId, loading: orgLoading } = useOrgOwner();
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
  const [filterCampaignWeek, setFilterCampaignWeek] = useState<string>(persistence.filters.campaignWeek);
  const [searchTerm, setSearchTerm] = useState(persistence.filters.searchTerm);
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(
    persistence.filters.startDate ? new Date(persistence.filters.startDate) : undefined
  );
  const [deadlineFilter, setDeadlineFilter] = useState<Date | undefined>(
    persistence.filters.deadline ? new Date(persistence.filters.deadline) : undefined
  );
  
  // Sync filters to persistence
  useEffect(() => {
    persistence.setFilters({
      creatorId: filterCreatorId,
      editorId: filterEditorId,
      clientId: filterClientId,
      productId: filterProductId,
      campaignWeek: filterCampaignWeek,
      searchTerm: searchTerm,
      startDate: startDateFilter?.toISOString(),
      deadline: deadlineFilter?.toISOString(),
    });
  }, [filterCreatorId, filterEditorId, filterClientId, filterProductId, filterCampaignWeek, searchTerm, startDateFilter, deadlineFilter]);
  
  // Listas para filtros
  const [creators, setCreators] = useState<{id: string; name: string}[]>([]);
  const [editors, setEditors] = useState<{id: string; name: string}[]>([]);
  const [clients, setClients] = useState<{id: string; name: string}[]>([]);
  const [products, setProducts] = useState<{id: string; name: string; client_name?: string}[]>([]);
  
  // Estado de drag
  const [draggingContent, setDraggingContent] = useState<Content | null>(null);
  const [dropTarget, setDropTarget] = useState<ContentStatus | null>(null);
  
  // Dialog para detalle - using persisted selected content
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  
  // Dialog para crear contenido
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
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
    setStartDateFilter(undefined);
    setDeadlineFilter(undefined);
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
           filterCampaignWeek !== '' || 
           searchTerm !== '' ||
           startDateFilter !== undefined ||
           deadlineFilter !== undefined;
  }, [filterCreatorId, filterEditorId, filterClientId, filterProductId, filterCampaignWeek, searchTerm, startDateFilter, deadlineFilter]);
  
  // Board settings hook
  const { settings, statuses: orgStatuses, rules, loading: settingsLoading, refetch: refetchSettings } = useBoardSettings(currentOrgId);

  // Rol efectivo para permisos del board - use impersonated role if active
  const primaryRole = isImpersonating && impersonationTarget.role
    ? impersonationTarget.role
    : (activeRole ||
       (isAdmin ? 'admin' : isStrategist ? 'strategist' : isClient ? 'client' : isCreator ? 'creator' : isEditor ? 'editor' : 'client'));
  
  // Helper function to check if a status is visible for the current role
  const isStatusVisibleForRole = useCallback((statusKey: string): boolean => {
    // Admin always sees everything (but NOT when impersonating as non-admin)
    if (primaryRole === 'admin' && !isImpersonating) return true;

    // Find the org status for this status key
    const orgStatus = orgStatuses.find(s => s.status_key === statusKey);
    if (!orgStatus) return true; // If no org status config, show by default

    // Find the rule for this status
    const rule = rules.find(r => r.status_id === orgStatus.id);
    if (!rule) return true; // If no rule, show by default

    // Check if user's role can view this status
    const canViewRoles = (rule as any).can_view_roles as string[] | undefined;

    // If explicitly configured empty => nobody sees this status
    if (Array.isArray(canViewRoles) && canViewRoles.length === 0) return false;

    const effectiveCanViewRoles = canViewRoles || ['admin', 'strategist', 'creator', 'editor', 'trafficker', 'designer', 'client'];
    return effectiveCanViewRoles.includes(primaryRole);
  }, [primaryRole, orgStatuses, rules, isImpersonating]);

  // Fetch content según rol - use targetUserId for impersonation
  const { content, loading, updateContentStatus, deleteContent, refetch } = useContentWithFilters({
    userId: targetUserId,
    role: primaryRole as any,
    creatorId: filterCreatorId !== 'all' ? filterCreatorId : undefined,
    editorId: filterEditorId !== 'all' ? filterEditorId : undefined,
    clientId: filterClientId !== 'all' ? filterClientId : undefined
  });

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

  // Cargar listas para filtros (solo admin) - siempre scope por organización actual
  useEffect(() => {
    // Wait for org context
    if (orgLoading) return;

    if (!showAdminControls || !currentOrgId) {
      setCreators([]);
      setEditors([]);
      setClients([]);
      setProducts([]);
      return;
    }

    const fetchFilters = async () => {
      // Users from this org only
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', currentOrgId);

      const creatorIds = (membersData || [])
        .filter(m => m.role === 'creator')
        .map(m => m.user_id);

      const editorIds = (membersData || [])
        .filter(m => m.role === 'editor')
        .map(m => m.user_id);

      if (creatorIds.length) {
        const { data: creatorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);

        setCreators(creatorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
      } else {
        setCreators([]);
      }

      if (editorIds.length) {
        const { data: editorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', editorIds);

        setEditors(editorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
      } else {
        setEditors([]);
      }

      const { data: clientsList } = await supabase
        .from('clients')
        .select('id, name')
        .eq('organization_id', currentOrgId);

      setClients(clientsList?.map(c => ({ id: c.id, name: c.name })) || []);

      // Products only from clients in this org
      const { data: productsList } = await supabase
        .from('products')
        .select('id, name, client_id, clients!inner(name, organization_id)')
        .eq('clients.organization_id', currentOrgId)
        .order('name');

      setProducts(
        productsList?.map(p => ({
          id: p.id,
          name: p.name,
          client_name: (p.clients as any)?.name,
        })) || []
      );
    };

    fetchFilters();
  }, [showAdminControls, currentOrgId]);

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

  // Filtrar contenido por búsqueda, fechas, producto, campaña Y visibilidad de estado
  const filteredContent = useMemo(() => content.filter(c => {
    // First check if this content's status is visible to the user
    if (!isStatusVisibleForRole(c.status)) return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        c.title.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.client?.name?.toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;
    }
    
    if (startDateFilter) {
      const contentStartDate = c.start_date ? new Date(c.start_date) : null;
      if (!contentStartDate || contentStartDate < startDateFilter) return false;
    }
    
    if (deadlineFilter) {
      const contentDeadline = c.deadline ? new Date(c.deadline) : null;
      if (!contentDeadline || contentDeadline > deadlineFilter) return false;
    }

    // Filtro por producto
    if (filterProductId !== 'all') {
      if (c.product_id !== filterProductId) return false;
    }

    // Filtro por campaña/semana
    if (filterCampaignWeek) {
      if (c.campaign_week !== filterCampaignWeek) return false;
    }
    
    return true;
  }), [content, isStatusVisibleForRole, searchTerm, startDateFilter, deadlineFilter, filterProductId, filterCampaignWeek]);

  // Agrupar contenido por estado
  const getContentByStatus = (status: ContentStatus) => {
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

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: ContentStatus) => {
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
      rules
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
      await updateContentStatus(draggingContent.id, targetStatus);
      toast({
        title: 'Estado actualizado',
        description: `Movido a ${STATUS_LABELS[targetStatus]}`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive'
      });
    }

    setDraggingContent(null);
  }, [draggingContent, user, primaryRole, updateContentStatus, toast]);

  const handleDragEnter = useCallback((status: ContentStatus) => {
    setDropTarget(status);
  }, []);

  // Handler for creator status change (assigned -> recording -> recorded) with UP integration
  const handleCreatorStatusChange = useCallback(async (contentId: string, newStatus: 'recording' | 'recorded') => {
    try {
      // First get the current status
      const { data: currentContent } = await supabase
        .from('content')
        .select('status')
        .eq('id', contentId)
        .single();

      if (!currentContent) throw new Error('Content not found');

      // Use centralized status change with UP points
      await updateContentStatusWithUP({
        contentId,
        oldStatus: currentContent.status as ContentStatus,
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

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <PageHeader
          icon={Scroll}
          title="KREOON Projects"
          subtitle="Gestiona todos los proyectos y contenidos"
          action={
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Buscar proyecto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 md:h-10 w-40 md:w-64 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {showAdminControls && (
                <Button 
                  variant="glow" 
                  size="sm" 
                  className="gap-1 md:gap-2 text-xs md:text-sm" 
                  onClick={() => guardAction(() => setShowCreateDialog(true))}
                  disabled={isReadOnly}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nuevo Proyecto</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              )}
            </div>
          }
        />

        {/* Mobile search */}
        <div className="sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Buscar proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Filtros para admin */}
        {showAdminControls && (
          <div className="flex flex-wrap items-center gap-2 md:gap-3 px-4 md:px-6 pb-4 overflow-x-auto">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[140px] md:w-[180px] justify-start text-left font-normal text-xs md:text-sm",
                    !startDateFilter && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  {startDateFilter ? format(startDateFilter, "dd/MM/yy", { locale: es }) : "Fecha inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateFilter}
                  onSelect={setStartDateFilter}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {startDateFilter && (
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0" onClick={() => setStartDateFilter(undefined)}>
                <X className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[140px] md:w-[180px] justify-start text-left font-normal text-xs md:text-sm",
                    !deadlineFilter && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  {deadlineFilter ? format(deadlineFilter, "dd/MM/yy", { locale: es }) : "Fecha entrega"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadlineFilter}
                  onSelect={setDeadlineFilter}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {deadlineFilter && (
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0" onClick={() => setDeadlineFilter(undefined)}>
                <X className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            )}

            <div className="h-6 w-px bg-border hidden md:block" />

            <Select value={filterCreatorId} onValueChange={setFilterCreatorId}>
              <SelectTrigger className="w-[130px] md:w-[180px] h-8 md:h-9 text-xs md:text-sm">
                <SelectValue placeholder="Creadores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los creadores</SelectItem>
                {creators.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterEditorId} onValueChange={setFilterEditorId}>
              <SelectTrigger className="w-[130px] md:w-[180px] h-8 md:h-9 text-xs md:text-sm">
                <SelectValue placeholder="Editores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los editores</SelectItem>
                {editors.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterClientId} onValueChange={setFilterClientId}>
              <SelectTrigger className="w-[130px] md:w-[180px] h-8 md:h-9 text-xs md:text-sm">
                <SelectValue placeholder="Clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-6 w-px bg-border hidden md:block" />

            <Select value={filterProductId} onValueChange={setFilterProductId}>
              <SelectTrigger className="w-[130px] md:w-[180px] h-8 md:h-9 text-xs md:text-sm">
                <SelectValue placeholder="Productos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los productos</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.client_name && <span className="text-muted-foreground">({p.client_name})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="text"
              placeholder="Campaña/Semana"
              value={filterCampaignWeek}
              onChange={(e) => setFilterCampaignWeek(e.target.value)}
              className="w-[100px] md:w-[120px] h-8 md:h-9 text-xs md:text-sm"
            />
            {filterCampaignWeek && (
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0" onClick={() => setFilterCampaignWeek('')}>
                <X className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            )}
          </div>
        )}
        {/* Board Header with View Switcher */}
        <div className="rounded-xl border border-border bg-card p-3 md:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 md:mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base md:text-lg font-semibold text-card-foreground">Flujo de Trabajo</h2>
              <Badge variant="outline" className="text-xs">{filteredContent.length} items</Badge>
              {settings && settings.card_size !== 'normal' && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Settings2 className="h-3 w-3" />
                  {settings.card_size === 'compact' ? 'Compacta' : 'Grande'}
                </Badge>
              )}
              <AutoSaveIndicator status={saveStatus} lastSaved={persistence.lastSaved} />
            </div>
            <div className="flex items-center gap-2">
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
                      <span className="hidden sm:inline">Reset</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Restablecer todos los filtros</TooltipContent>
                </Tooltip>
              )}
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1.5"
                    onClick={() => setShowConfigDialog(true)}
                  >
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Configurar</span>
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Kanban View */}
          {currentView === 'kanban' && (
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0">
              {(primaryRole === 'admin' && !isImpersonating ? BOARD_COLUMNS : (orgStatuses.length > 0 && rules.length > 0 ? BOARD_COLUMNS : (primaryRole === 'creator' ? CREATOR_COLUMNS : primaryRole === 'editor' ? EDITOR_COLUMNS : BOARD_COLUMNS)))
                // Filter columns by visibility permissions (board config)
                .filter((column) => isStatusVisibleForRole(column.status))
                .map(column => {
                const columnContent = getContentByStatus(column.status);
                const isCurrentDropTarget = dropTarget === column.status;
                const canDropHere = draggingContent 
                  ? canMoveToStatusWithRules(primaryRole, draggingContent.status, column.status, draggingContent, targetUserId || '', orgStatuses, rules)
                  : true;
                
                // Get dynamic color and title from organization settings
                const orgStatus = orgStatuses.find(s => s.status_key === column.status);
                const columnTitle = orgStatus?.label || column.title;
                
                // Convert CSS class to hex for fallback, or use orgStatus color
                const fallbackColors: Record<string, string> = {
                  'bg-muted-foreground': '#6b7280',
                  'bg-info': '#3b82f6',
                  'bg-purple-500': '#8b5cf6',
                  'bg-orange-500': '#f97316',
                  'bg-cyan-500': '#06b6d4',
                  'bg-pink-500': '#ec4899',
                  'bg-emerald-500': '#10b981',
                  'bg-destructive': '#ef4444',
                  'bg-blue-500': '#3b82f6',
                  'bg-success': '#22c55e'
                };
                const columnColor = orgStatus?.color || fallbackColors[column.color] || '#6b7280';

                return (
                  <EnhancedKanbanColumn
                    key={column.status}
                    id={column.status}
                    title={columnTitle}
                    count={columnContent.length}
                    color={columnColor}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.status)}
                    onDragEnter={() => handleDragEnter(column.status)}
                    isDropTarget={isCurrentDropTarget}
                    canDrop={canDropHere}
                  >
                    {columnContent.map(item => (
                      <EnhancedContentCard
                        key={item.id}
                        content={item}
                        cardSize={settings?.card_size || 'normal'}
                        visibleFields={settings?.visible_fields || ['title', 'status', 'client', 'deadline', 'responsible']}
                        onClick={() => setSelectedContent(item)}
                        onDragStart={(e) => handleDragStart(e, item)}
                        isDragging={draggingContent?.id === item.id}
                        showAIIndicators={showAdminControls}
                        organizationStatuses={orgStatuses}
                        userRole={primaryRole as any}
                        userId={targetUserId}
                        onStatusChange={async (contentId, newStatus) => {
                          await updateContentStatus(contentId, newStatus);
                          refetch();
                        }}
                        showStatusControls={true}
                        ambassadorIds={ambassadorIds}
                        onAnalyzeWithAI={showAdminControls ? (contentId, title) => {
                          setAIPanelMode('card');
                          setAIContentId(contentId);
                          setAIContentTitle(title);
                          setShowAIPanel(true);
                        } : undefined}
                      />
                    ))}
                    {columnContent.length === 0 && (
                      <div className="border-2 border-dashed border-border rounded-lg p-4 md:p-8 text-center text-muted-foreground text-xs md:text-sm">
                        Sin contenido
                      </div>
                    )}
                  </EnhancedKanbanColumn>
                );
              })}
            </div>
          )}
          
          {/* List View */}
          {currentView === 'list' && (
            <BoardListView 
              content={filteredContent} 
              onContentClick={setSelectedContent}
              cardSize={settings?.card_size || 'normal'}
              visibleFields={settings?.visible_fields || ['title', 'thumbnail', 'status', 'client', 'responsible', 'deadline']}
              organizationStatuses={orgStatuses}
              ambassadorIds={ambassadorIds}
            />
          )}
          
          {/* Calendar View */}
          {currentView === 'calendar' && (
            <BoardCalendarView 
              content={filteredContent} 
              currentDate={calendarDate}
              onDateChange={setCalendarDate}
              onContentClick={setSelectedContent}
              cardSize={settings?.card_size || 'normal'}
              visibleFields={settings?.visible_fields || ['title', 'status', 'responsible']}
              organizationStatuses={orgStatuses}
              ambassadorIds={ambassadorIds}
            />
          )}
          
          {/* Table View */}
          {currentView === 'table' && (
            <BoardTableView 
              content={filteredContent} 
              onContentClick={setSelectedContent}
              visibleFields={settings?.visible_fields || ['title', 'thumbnail', 'status', 'client', 'responsible', 'deadline']}
              organizationStatuses={orgStatuses}
              ambassadorIds={ambassadorIds}
            />
          )}
        </div>
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

      <ContentDetailDialog
        content={selectedContent}
        open={!!selectedContent}
        onOpenChange={(open) => !open && setSelectedContent(null)}
        onUpdate={refetch}
        onDelete={handleDeleteContent}
      />

      <ContentDetailDialog
        content={null}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onUpdate={refetch}
        mode="create"
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
    </div>
  );
}
