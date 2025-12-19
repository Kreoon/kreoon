import { useState, useCallback, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DroppableKanbanColumn } from "@/components/dashboard/DroppableKanbanColumn";
import { DraggableContentCard } from "@/components/dashboard/DraggableContentCard";
import { ContentDetailDialog } from "@/components/content/ContentDetailDialog";
import { Search, Eye, AlertCircle, CheckCircle2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Content, ContentStatus, STATUS_LABELS } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

// Columnas específicas para el cliente
const CLIENT_COLUMNS: ContentStatus[] = ['delivered', 'issue', 'approved'];

const CLIENT_COLUMN_LABELS: Record<string, string> = {
  delivered: 'Entregado',
  issue: 'Novedad',
  approved: 'Aprobado'
};

const CLIENT_COLUMN_COLORS: Record<string, string> = {
  delivered: 'border-t-info',
  issue: 'border-t-warning',
  approved: 'border-t-success'
};

// Verificar si un movimiento de estado es válido para el cliente
const canClientMoveToStatus = (
  currentStatus: ContentStatus,
  targetStatus: ContentStatus
): boolean => {
  // Desde entregado puede ir a aprobado o novedad
  if (currentStatus === 'delivered' && targetStatus === 'approved') return true;
  if (currentStatus === 'delivered' && targetStatus === 'issue') return true;
  
  // Desde novedad puede ir a aprobado (después de resolverse)
  if (currentStatus === 'issue' && targetStatus === 'approved') return true;
  
  // Aprobado no puede cambiar a nada - es estado final para el cliente
  if (currentStatus === 'approved') return false;
  
  return false;
};

interface ClientInfo {
  id: string;
  name: string;
}

export default function ClientContentBoard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado de drag
  const [draggingContent, setDraggingContent] = useState<Content | null>(null);
  const [dropTarget, setDropTarget] = useState<ContentStatus | null>(null);
  
  // Dialog para detalle
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  // Fetch client data
  useEffect(() => {
    if (user) {
      fetchClientData();
    }
  }, [user]);

  const fetchClientData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientData) {
        setClientInfo(clientData);

        // Solo traemos contenido en estados relevantes para el cliente
        const { data: contentData } = await supabase
          .from('content')
          .select(`
            *,
            client:clients(*)
          `)
          .eq('client_id', clientData.id)
          .in('status', ['delivered', 'issue', 'approved'])
          .order('created_at', { ascending: false });

        setContent((contentData || []) as unknown as Content[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar contenido por búsqueda
  const filteredContent = useMemo(() => {
    if (!searchTerm) return content;
    
    const term = searchTerm.toLowerCase();
    return content.filter(c => 
      c.title.toLowerCase().includes(term) ||
      c.description?.toLowerCase().includes(term)
    );
  }, [content, searchTerm]);

  // Agrupar contenido por estado
  const getContentByStatus = (status: ContentStatus) => {
    return filteredContent.filter(c => c.status === status);
  };

  // Update content status
  const updateContentStatus = async (contentId: string, newStatus: ContentStatus) => {
    const { error } = await supabase
      .from('content')
      .update({ 
        status: newStatus,
        ...(newStatus === 'approved' ? {
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        } : {})
      })
      .eq('id', contentId);

    if (error) throw error;
    await fetchClientData();
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

    const canMove = canClientMoveToStatus(draggingContent.status, targetStatus);

    if (!canMove) {
      const message = draggingContent.status === 'approved' 
        ? 'El contenido aprobado no puede cambiar de estado'
        : 'No puedes realizar este cambio de estado';
      
      toast({
        title: 'Movimiento no permitido',
        description: message,
        variant: 'destructive'
      });
      setDraggingContent(null);
      return;
    }

    try {
      await updateContentStatus(draggingContent.id, targetStatus);
      toast({
        title: 'Estado actualizado',
        description: `Movido a ${CLIENT_COLUMN_LABELS[targetStatus]}`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive'
      });
    }

    setDraggingContent(null);
  }, [draggingContent, user, toast]);

  const handleDragEnter = useCallback((status: ContentStatus) => {
    setDropTarget(status);
  }, []);

  // Stats
  const deliveredCount = getContentByStatus('delivered').length;
  const issueCount = getContentByStatus('issue').length;
  const approvedCount = getContentByStatus('approved').length;

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!clientInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa vinculada</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Tu cuenta aún no está vinculada a una empresa. Contacta al administrador.
        </p>
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
              {clientInfo.name} - Revisión y aprobación
            </p>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 md:h-10 w-40 md:w-64 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 px-4 md:px-6 pb-4 overflow-x-auto">
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <Eye className="h-3 w-3" />
            {deliveredCount} Entregado{deliveredCount !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 border-warning/50 text-warning">
            <AlertCircle className="h-3 w-3" />
            {issueCount} Novedad{issueCount !== 1 ? 'es' : ''}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 border-success/50 text-success">
            <CheckCircle2 className="h-3 w-3" />
            {approvedCount} Aprobado{approvedCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </header>

      {/* Info Card */}
      {deliveredCount > 0 && (
        <div className="px-4 md:px-6 pt-4">
          <Card className="border-info/30 bg-info/5">
            <CardContent className="p-3 flex items-center gap-3">
              <Eye className="h-5 w-5 text-info flex-shrink-0" />
              <p className="text-sm">
                <span className="font-medium">Arrastra</span> los videos de "Entregado" a "Aprobado" para aprobar, o a "Novedad" si hay correcciones.
                <span className="text-muted-foreground"> Los aprobados no se pueden modificar.</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban Board */}
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {CLIENT_COLUMNS.map((status) => {
            const colorMap: Record<string, string> = {
              delivered: 'bg-info',
              issue: 'bg-warning',
              approved: 'bg-success'
            };
            return (
              <DroppableKanbanColumn
                key={status}
                status={status}
                title={CLIENT_COLUMN_LABELS[status]}
                count={getContentByStatus(status).length}
                isDropTarget={dropTarget === status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
                color={colorMap[status] || 'bg-muted'}
                canDrop={status !== 'approved' || draggingContent?.status !== 'approved'}
              >
                {getContentByStatus(status).map((item) => (
                  <DraggableContentCard
                    key={item.id}
                    content={item}
                    isDragging={draggingContent?.id === item.id}
                    onDragStart={handleDragStart}
                    onClick={() => setSelectedContent(item)}
                  />
                ))}
                
                {getContentByStatus(status).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    {status === 'delivered' && <Eye className="h-8 w-8 mb-2 opacity-50" />}
                    {status === 'issue' && <AlertCircle className="h-8 w-8 mb-2 opacity-50" />}
                    {status === 'approved' && <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />}
                    <p className="text-sm">Sin contenido</p>
                  </div>
                )}
              </DroppableKanbanColumn>
            );
          })}
        </div>
      </div>

      {/* Content Detail Dialog */}
      {selectedContent && (
        <ContentDetailDialog
          content={selectedContent}
          open={!!selectedContent}
          onOpenChange={(open) => !open && setSelectedContent(null)}
          onUpdate={fetchClientData}
        />
      )}
    </div>
  );
}
