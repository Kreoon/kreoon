import { useState, useCallback, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DroppableKanbanColumn } from "@/components/dashboard/DroppableKanbanColumn";
import { DraggableContentCard } from "@/components/dashboard/DraggableContentCard";
import { CreateContentDialog } from "@/components/content/CreateContentDialog";
import { ContentDetailDialog } from "@/components/content/ContentDetailDialog";
import { Search, Plus, Filter, CalendarIcon, X, Settings2, Scroll } from "lucide-react";
import { MedievalBanner } from "@/components/layout/MedievalBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useContentWithFilters } from "@/hooks/useContent";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { Content, ContentStatus, KANBAN_COLUMNS, STATUS_ORDER, STATUS_LABELS, Product } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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
  EnhancedContentCard
} from "@/components/board";
import { useBoardSettings } from "@/hooks/useBoardSettings";

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

// Verificar si un movimiento de estado es válido según el rol
const canMoveToStatus = (
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
  const { user, isAdmin, isCreator, isEditor, isClient, profile } = useAuth();
  const { currentOrgId, loading: orgLoading } = useOrgOwner();
  const { toast } = useToast();
  
  // Filtros
  const [filterCreatorId, setFilterCreatorId] = useState<string>('all');
  const [filterEditorId, setFilterEditorId] = useState<string>('all');
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [filterProductId, setFilterProductId] = useState<string>('all');
  const [filterCampaignWeek, setFilterCampaignWeek] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [deadlineFilter, setDeadlineFilter] = useState<Date | undefined>(undefined);
  
  // Listas para filtros
  const [creators, setCreators] = useState<{id: string; name: string}[]>([]);
  const [editors, setEditors] = useState<{id: string; name: string}[]>([]);
  const [clients, setClients] = useState<{id: string; name: string}[]>([]);
  const [products, setProducts] = useState<{id: string; name: string; client_name?: string}[]>([]);
  
  // Estado de drag
  const [draggingContent, setDraggingContent] = useState<Content | null>(null);
  const [dropTarget, setDropTarget] = useState<ContentStatus | null>(null);
  
  // Dialog para detalle
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  
  // Dialog para crear contenido
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Vista actual y configuración del board
  const [currentView, setCurrentView] = useState<BoardView>('kanban');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  
  // Board settings hook
  const { settings, statuses, loading: settingsLoading } = useBoardSettings(currentOrgId);

  // Determinar el rol principal del usuario
  const primaryRole = isAdmin ? 'admin' : isClient ? 'client' : isCreator ? 'creator' : isEditor ? 'editor' : 'admin';

  // Fetch content según rol
  const { content, loading, updateContentStatus, deleteContent, refetch } = useContentWithFilters({
    userId: user?.id,
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

    if (!isAdmin || !currentOrgId) {
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
  }, [isAdmin, currentOrgId]);

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

  // Filtrar contenido por búsqueda, fechas, producto y campaña
  const filteredContent = content.filter(c => {
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
  });

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

    const canMove = canMoveToStatus(
      primaryRole,
      draggingContent.status,
      targetStatus,
      draggingContent,
      user.id
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

  // Handler for creator status change (assigned -> recording -> recorded)
  const handleCreatorStatusChange = useCallback(async (contentId: string, newStatus: 'recording' | 'recorded') => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'recorded') {
        updateData.recorded_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('content')
        .update(updateData)
        .eq('id', contentId);

      if (error) throw error;
      
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
        {/* Medieval Banner */}
        <MedievalBanner
          icon={Scroll}
          title="Mesa de Batallas"
          subtitle="Gestiona las misiones del reino"
          action={
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Buscar misión..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 md:h-10 w-40 md:w-64 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {isAdmin && (
                <Button variant="glow" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm font-medieval" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nueva Misión</span>
                  <span className="sm:hidden">Nueva</span>
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
              placeholder="Buscar misión..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Filtros para admin */}
        {isAdmin && (
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
            <div className="flex items-center gap-3">
              <h2 className="text-base md:text-lg font-semibold text-card-foreground">Flujo de Trabajo</h2>
              <Badge variant="outline" className="text-xs">{filteredContent.length} items</Badge>
            </div>
            <div className="flex items-center gap-2">
              <BoardViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5"
                  onClick={() => setShowConfigDialog(true)}
                >
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Configurar</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Kanban View */}
          {currentView === 'kanban' && (
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0">
              {(isCreator && !isAdmin ? CREATOR_COLUMNS : isEditor && !isAdmin ? EDITOR_COLUMNS : BOARD_COLUMNS).map(column => {
                const columnContent = getContentByStatus(column.status);
                const isCurrentDropTarget = dropTarget === column.status;
                const canDropHere = draggingContent 
                  ? canMoveToStatus(primaryRole, draggingContent.status, column.status, draggingContent, user?.id || '')
                  : true;

                return (
                  <EnhancedKanbanColumn
                    key={column.status}
                    id={column.status}
                    title={column.title}
                    count={columnContent.length}
                    color={column.color}
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
                        onClick={() => setSelectedContent(item)}
                        onDragStart={(e) => handleDragStart(e, item)}
                        isDragging={draggingContent?.id === item.id}
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
            />
          )}
          
          {/* Calendar View */}
          {currentView === 'calendar' && (
            <BoardCalendarView 
              content={filteredContent} 
              currentDate={calendarDate}
              onDateChange={setCalendarDate}
              onContentClick={setSelectedContent}
            />
          )}
          
          {/* Table View */}
          {currentView === 'table' && (
            <BoardTableView 
              content={filteredContent} 
              onContentClick={setSelectedContent}
            />
          )}
        </div>
      </div>
      
      {/* Config Dialog */}
      {isAdmin && (
        <BoardConfigDialog 
          organizationId={currentOrgId}
          open={showConfigDialog}
          onOpenChange={setShowConfigDialog}
        />
      )}

      <ContentDetailDialog
        content={selectedContent}
        open={!!selectedContent}
        onOpenChange={(open) => !open && setSelectedContent(null)}
        onUpdate={refetch}
        onDelete={handleDeleteContent}
      />

      <CreateContentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={refetch}
      />
    </div>
  );
}
