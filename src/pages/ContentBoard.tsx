import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DroppableKanbanColumn } from "@/components/dashboard/DroppableKanbanColumn";
import { DraggableContentCard } from "@/components/dashboard/DraggableContentCard";
import { CreateContentDialog } from "@/components/content/CreateContentDialog";
import { ContentDetailDialog } from "@/components/content/ContentDetailDialog";
import { Search, Plus, Filter, CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useContentWithFilters } from "@/hooks/useContent";
import { Content, ContentStatus, KANBAN_COLUMNS, STATUS_ORDER, STATUS_LABELS } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Columnas del tablero (sin "pagado")
const BOARD_COLUMNS = KANBAN_COLUMNS.filter(col => col.status !== 'paid');

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
  const { toast } = useToast();
  
  // Filtros
  const [filterCreatorId, setFilterCreatorId] = useState<string>('all');
  const [filterEditorId, setFilterEditorId] = useState<string>('all');
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [deadlineFilter, setDeadlineFilter] = useState<Date | undefined>(undefined);
  
  // Listas para filtros
  const [creators, setCreators] = useState<{id: string; name: string}[]>([]);
  const [editors, setEditors] = useState<{id: string; name: string}[]>([]);
  const [clients, setClients] = useState<{id: string; name: string}[]>([]);
  
  // Estado de drag
  const [draggingContent, setDraggingContent] = useState<Content | null>(null);
  const [dropTarget, setDropTarget] = useState<ContentStatus | null>(null);
  
  // Dialog para detalle
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  
  // Dialog para crear contenido
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

  // Cargar listas para filtros (solo admin)
  useEffect(() => {
    if (!isAdmin) return;

    const fetchFilters = async () => {
      const { data: creatorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'creator');
      
      if (creatorRoles?.length) {
        const { data: creatorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorRoles.map(r => r.user_id));
        
        setCreators(creatorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
      }

      const { data: editorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'editor');
      
      if (editorRoles?.length) {
        const { data: editorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', editorRoles.map(r => r.user_id));
        
        setEditors(editorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
      }

      const { data: clientsList } = await supabase
        .from('clients')
        .select('id, name');
      
      setClients(clientsList?.map(c => ({ id: c.id, name: c.name })) || []);
    };

    fetchFilters();
  }, [isAdmin]);

  // Filtrar contenido por búsqueda y fechas
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
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6 gap-2">
          <div className="min-w-0 flex-shrink">
            <h1 className="text-lg md:text-xl font-bold text-foreground truncate">Tablero de Contenido</h1>
            <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">
              Gestiona el flujo de trabajo
            </p>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Buscar contenido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 md:h-10 w-40 md:w-64 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            
            {isAdmin && (
              <Button variant="glow" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Proyecto</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <div className="px-4 pb-3 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Buscar contenido..."
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
          </div>
        )}
      </header>

      <div className="p-4 md:p-6">
        {/* Kanban Board */}
        <div className="rounded-xl border border-border bg-card p-3 md:p-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-base md:text-lg font-semibold text-card-foreground">Flujo de Trabajo</h2>
            <Badge variant="outline" className="text-xs">{filteredContent.length} items</Badge>
          </div>
          
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0">
            {BOARD_COLUMNS.map(column => {
              const columnContent = getContentByStatus(column.status);
              const isCurrentDropTarget = dropTarget === column.status;
              const canDropHere = draggingContent 
                ? canMoveToStatus(primaryRole, draggingContent.status, column.status, draggingContent, user?.id || '')
                : true;

              return (
                <DroppableKanbanColumn
                  key={column.status}
                  status={column.status}
                  title={column.title}
                  count={columnContent.length}
                  color={column.color}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDropTarget={isCurrentDropTarget}
                  canDrop={canDropHere}
                >
                  <div 
                    onDragEnter={() => handleDragEnter(column.status)}
                    className="min-h-[120px] md:min-h-[150px]"
                  >
                    {columnContent.map(item => (
                      <DraggableContentCard
                        key={item.id}
                        content={item}
                        onDragStart={handleDragStart}
                        onClick={setSelectedContent}
                        isDragging={draggingContent?.id === item.id}
                        onPaymentUpdate={refetch}
                      />
                    ))}
                    {columnContent.length === 0 && (
                      <div className="border-2 border-dashed border-border rounded-lg p-4 md:p-8 text-center text-muted-foreground text-xs md:text-sm">
                        Sin contenido
                      </div>
                    )}
                  </div>
                </DroppableKanbanColumn>
              );
            })}
          </div>
        </div>
      </div>

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
