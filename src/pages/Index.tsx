import { useState, useCallback, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DroppableKanbanColumn } from "@/components/dashboard/DroppableKanbanColumn";
import { DraggableContentCard } from "@/components/dashboard/DraggableContentCard";
import { RecentActivityReal } from "@/components/dashboard/RecentActivityReal";
import { TopCreatorsReal } from "@/components/dashboard/TopCreatorsReal";
import { CreateContentDialog } from "@/components/content/CreateContentDialog";
import { ContentDetailDialog } from "@/components/content/ContentDetailDialog";
import { Video, Users, CheckCircle, Clock, Search, Bell, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useContentWithFilters } from "@/hooks/useContent";
import { Content, ContentStatus, KANBAN_COLUMNS, STATUS_ORDER, STATUS_LABELS } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

// Determinar qué columnas son visibles para cada rol
const getVisibleColumns = (role: string, contentItem?: Content, userId?: string) => {
  // Admin ve todo
  if (role === 'admin') {
    return KANBAN_COLUMNS;
  }

  // Cliente ve: Creado, Guión Aprobado, Asignado, En grabación, Grabado, En Edición, Entregado, Novedad, Aprobado
  if (role === 'client') {
    return KANBAN_COLUMNS;
  }

  // Creador ve: Asignado, En grabación, Grabado (solo su contenido asignado)
  if (role === 'creator') {
    return KANBAN_COLUMNS.filter(col => 
      ['assigned', 'recording', 'recorded', 'editing', 'delivered', 'issue', 'approved'].includes(col.status)
    );
  }

  // Editor ve: Grabado, En Edición, Entregado, Novedad, Aprobado
  if (role === 'editor') {
    return KANBAN_COLUMNS.filter(col => 
      ['recorded', 'editing', 'delivered', 'issue', 'approved'].includes(col.status)
    );
  }

  return KANBAN_COLUMNS;
};

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

  // Admin puede mover a cualquier estado
  if (role === 'admin') {
    return true;
  }

  // Cliente solo puede aprobar guión y contenido
  if (role === 'client') {
    // Solo puede mover a script_approved desde draft
    if (currentStatus === 'draft' && targetStatus === 'script_approved') {
      return true;
    }
    // Solo puede mover a approved desde delivered
    if (currentStatus === 'delivered' && targetStatus === 'approved') {
      return true;
    }
    // Puede marcar novedad desde entregado
    if (currentStatus === 'delivered' && targetStatus === 'issue') {
      return true;
    }
    return false;
  }

  // Creadores solo pueden mover hacia adelante
  if (role === 'creator') {
    // Solo su contenido asignado
    if (content.creator_id !== userId) return false;
    // Solo hacia adelante
    if (targetIndex <= currentIndex) return false;
    // No puede aprobar (eso lo hace el cliente)
    if (targetStatus === 'approved') return false;
    // Flujo válido: assigned -> recording -> recorded
    if (currentStatus === 'assigned' && targetStatus === 'recording') return true;
    if (currentStatus === 'recording' && targetStatus === 'recorded') return true;
    return false;
  }

  // Editores solo pueden mover hacia adelante
  if (role === 'editor') {
    // Solo su contenido asignado
    if (content.editor_id !== userId) return false;
    // Solo hacia adelante
    if (targetIndex <= currentIndex) return false;
    // No puede aprobar (eso lo hace el cliente)
    if (targetStatus === 'approved') return false;
    // Flujo válido: recorded -> editing -> delivered
    if (currentStatus === 'recorded' && targetStatus === 'editing') return true;
    if (currentStatus === 'editing' && targetStatus === 'delivered') return true;
    return false;
  }

  return false;
};

const Index = () => {
  const { user, isAdmin, isCreator, isEditor, isClient, roles, profile } = useAuth();
  const { toast } = useToast();
  
  // Filtros
  const [filterCreatorId, setFilterCreatorId] = useState<string>('all');
  const [filterEditorId, setFilterEditorId] = useState<string>('all');
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
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
  const { content, loading, updateContentStatus, refetch } = useContentWithFilters({
    userId: user?.id,
    role: primaryRole as any,
    creatorId: filterCreatorId !== 'all' ? filterCreatorId : undefined,
    editorId: filterEditorId !== 'all' ? filterEditorId : undefined,
    clientId: filterClientId !== 'all' ? filterClientId : undefined
  });

  // Cargar listas para filtros (solo admin)
  useEffect(() => {
    if (!isAdmin) return;

    const fetchFilters = async () => {
      // Creadores
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

      // Editores
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

      // Clientes
      const { data: clientsList } = await supabase
        .from('clients')
        .select('id, name');
      
      setClients(clientsList?.map(c => ({ id: c.id, name: c.name })) || []);
    };

    fetchFilters();
  }, [isAdmin]);

  // Columnas visibles
  const visibleColumns = getVisibleColumns(primaryRole);

  // Filtrar contenido por búsqueda
  const filteredContent = content.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.title.toLowerCase().includes(term) ||
      c.description?.toLowerCase().includes(term) ||
      c.client?.name?.toLowerCase().includes(term) ||
      c.creator?.full_name?.toLowerCase().includes(term)
    );
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

    // No hacer nada si es el mismo estado
    if (draggingContent.status === targetStatus) {
      setDraggingContent(null);
      return;
    }

    // Verificar si el movimiento es válido
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

  // Stats
  const totalActive = content.filter(c => !['approved', 'paid'].includes(c.status)).length;
  const inProgress = content.filter(c => ['recording', 'editing'].includes(c.status)).length;
  const completed = content.filter(c => c.status === 'approved').length;
  const pending = content.filter(c => ['draft', 'script_approved', 'assigned'].includes(c.status)).length;

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Bienvenido, {profile?.full_name || 'Usuario'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Buscar contenido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-64 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
              </Button>
              
              {isAdmin && (
                <Button variant="glow" className="gap-2" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Nuevo Proyecto
                </Button>
              )}
            </div>
          </div>

          {/* Filtros para admin */}
          {isAdmin && (
            <div className="flex items-center gap-3 px-6 pb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterCreatorId} onValueChange={setFilterCreatorId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos los creadores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los creadores</SelectItem>
                  {creators.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterEditorId} onValueChange={setFilterEditorId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos los editores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los editores</SelectItem>
                  {editors.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterClientId} onValueChange={setFilterClientId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos los clientes" />
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

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard 
              title="Contenido Activo" 
              value={totalActive} 
              icon={<Video className="h-6 w-6" />}
            />
            <StatsCard 
              title="En Proceso" 
              value={inProgress} 
              icon={<Clock className="h-6 w-6" />}
            />
            <StatsCard 
              title="Pendientes" 
              value={pending} 
              icon={<Users className="h-6 w-6" />}
            />
            <StatsCard 
              title="Completados" 
              value={completed} 
              icon={<CheckCircle className="h-6 w-6" />}
            />
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Kanban Board */}
            <div className="xl:col-span-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-card-foreground">Tablero de Contenido</h2>
                  <Badge variant="outline">{filteredContent.length} items</Badge>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {visibleColumns.map(column => {
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
                          className="min-h-[150px]"
                        >
                          {columnContent.map(item => (
                            <DraggableContentCard
                              key={item.id}
                              content={item}
                              onDragStart={handleDragStart}
                              onClick={setSelectedContent}
                              isDragging={draggingContent?.id === item.id}
                            />
                          ))}
                          {columnContent.length === 0 && (
                            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
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

            {/* Sidebar Widgets */}
            <div className="space-y-6">
              <TopCreatorsReal />
              <RecentActivityReal />
            </div>
          </div>
        </div>
      </div>

      {/* Content Detail Dialog */}
      <ContentDetailDialog
        content={selectedContent}
        open={!!selectedContent}
        onOpenChange={(open) => !open && setSelectedContent(null)}
        onUpdate={refetch}
      />

      {/* Create Content Dialog */}
      <CreateContentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={refetch}
      />
    </MainLayout>
  );
};

export default Index;
