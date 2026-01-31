import { useState, useCallback, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DroppableKanbanColumn } from "@/components/dashboard/DroppableKanbanColumn";
import { DraggableContentCard } from "@/components/dashboard/DraggableContentCard";
import { ClientContentDetailDialog } from "@/components/content/ClientContentDetailDialog";
import { FullscreenContentViewer } from "@/components/content/FullscreenContentViewer";
import { Search, Eye, AlertCircle, CheckCircle2, Package, FileText, RefreshCw, FileCheck, Scroll, Maximize2 } from "lucide-react";
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Content, ContentStatus, STATUS_LABELS } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Columnas específicas para el cliente: Creado, Guión Aprobado, Entregado, Novedad, Corregido, Aprobado
const CLIENT_COLUMNS: ContentStatus[] = ['draft', 'script_approved', 'delivered', 'issue', 'corrected', 'approved'];

const CLIENT_COLUMN_LABELS: Record<string, string> = {
  draft: 'Creado',
  script_approved: 'Guión Aprobado',
  delivered: 'Entregado',
  issue: 'Novedad',
  corrected: 'Corregido',
  approved: 'Aprobado'
};

const CLIENT_COLUMN_COLORS: Record<string, string> = {
  draft: 'border-t-muted-foreground',
  script_approved: 'border-t-cyan-500',
  delivered: 'border-t-info',
  issue: 'border-t-warning',
  corrected: 'border-t-blue-500',
  approved: 'border-t-success'
};

// Verificar si un movimiento de estado es válido para el cliente
const canClientMoveToStatus = (
  currentStatus: ContentStatus,
  targetStatus: ContentStatus,
  content?: Content
): boolean => {
  // Desde creado (draft) puede ir a guión aprobado SI tiene guión
  if (currentStatus === 'draft' && targetStatus === 'script_approved') {
    // Solo permitir si el contenido tiene guión
    return !!(content?.script && content.script.trim().length > 0);
  }
  
  // Desde entregado puede ir a aprobado o novedad
  if (currentStatus === 'delivered' && targetStatus === 'approved') return true;
  if (currentStatus === 'delivered' && targetStatus === 'issue') return true;
  
  // Desde corregido puede ir a aprobado o novedad
  if (currentStatus === 'corrected' && targetStatus === 'approved') return true;
  if (currentStatus === 'corrected' && targetStatus === 'issue') return true;
  
  // Estados que no pueden cambiar
  if (currentStatus === 'approved') return false;
  if (currentStatus === 'script_approved') return false; // Solo lectura, el equipo lo mueve
  if (currentStatus === 'issue') return false; // Espera corrección del equipo
  
  return false;
};

interface ClientInfo {
  id: string;
  name: string;
}

export default function ClientContentBoard() {
  const { user, profile } = useAuth();
  const { isImpersonating, effectiveClientId, effectiveUserId } = useImpersonation();
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
  
  // Fullscreen viewer state
  const [showFullscreenViewer, setShowFullscreenViewer] = useState(false);
  const [fullscreenStartIndex, setFullscreenStartIndex] = useState(0);

  // Fetch client data - react to impersonation changes
  useEffect(() => {
    if (user) {
      fetchClientData();
    }
  }, [user, isImpersonating, effectiveClientId]);

  const fetchClientData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let clientId: string | null = null;
      
      // IMPERSONATION MODE: Use effectiveClientId directly
      if (isImpersonating && effectiveClientId) {
        clientId = effectiveClientId;
      } else {
        // Normal mode: Check for selected client from localStorage first
        const savedClientId = localStorage.getItem('selectedClientId');
        
        if (savedClientId) {
          // Verify user has access to this client
          const { data: association } = await supabase
            .from('client_users')
            .select('client_id')
            .eq('user_id', user.id)
            .eq('client_id', savedClientId)
            .maybeSingle();
          
          if (association) {
            clientId = savedClientId;
          }
        }
        
        // If no saved client or invalid, get first associated client
        if (!clientId) {
          const { data: associations } = await supabase
            .from('client_users')
            .select('client_id')
            .eq('user_id', user.id)
            .limit(1);
          
          if (associations && associations.length > 0) {
            clientId = associations[0].client_id;
            localStorage.setItem('selectedClientId', clientId);
          }
        }
      }
      
      if (clientId) {
        // Get client info
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name')
          .eq('id', clientId)
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
            .in('status', ['draft', 'script_approved', 'delivered', 'issue', 'corrected', 'approved'])
            .order('created_at', { ascending: false });

          setContent((contentData || []) as unknown as Content[]);
        }
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
    // Get current status for UP integration
    const { data: currentContent } = await supabase
      .from('content')
      .select('status')
      .eq('id', contentId)
      .single();
    
    if (!currentContent) throw new Error('Content not found');
    
    // Use centralized status update with UP points integration
    const { updateContentStatusWithUP } = await import('@/hooks/useContentStatusWithUP');
    await updateContentStatusWithUP({
      contentId,
      oldStatus: currentContent.status as ContentStatus,
      newStatus
    });
    
    // Handle additional fields for approval/script approval
    if (newStatus === 'approved' || newStatus === 'script_approved') {
      const additionalUpdates: any = {};
      if (newStatus === 'approved') {
        additionalUpdates.approved_by = user?.id;
      }
      if (newStatus === 'script_approved') {
        additionalUpdates.script_approved_by = user?.id;
      }
      
      if (Object.keys(additionalUpdates).length > 0) {
        await supabase
          .from('content')
          .update(additionalUpdates)
          .eq('id', contentId);
      }
    }

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

    const canMove = canClientMoveToStatus(draggingContent.status, targetStatus, draggingContent);

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
  const draftCount = getContentByStatus('draft').length;
  const scriptApprovedCount = getContentByStatus('script_approved').length;
  const deliveredCount = getContentByStatus('delivered').length;
  const issueCount = getContentByStatus('issue').length;
  const correctedCount = getContentByStatus('corrected').length;
  const approvedCount = getContentByStatus('approved').length;

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
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
      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <PageHeader
          icon={Scroll}
          title="KREOON Projects"
          subtitle={`${clientInfo.name} - Revisión y aprobación de proyectos`}
        />

        {/* Search and Review All Button */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 md:h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          
          {/* Review All Button - Shows when there's content to review */}
          {(deliveredCount + correctedCount) > 0 && (
            <Button
              onClick={() => {
                setFullscreenStartIndex(0);
                setShowFullscreenViewer(true);
              }}
              className="gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              <span className="hidden sm:inline">Revisar todo</span>
              <Badge variant="secondary" className="ml-1">
                {deliveredCount + correctedCount}
              </Badge>
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs">
            <FileText className="h-3 w-3" />
            {draftCount}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs border-cyan-500/50 text-cyan-500">
            <FileCheck className="h-3 w-3" />
            {scriptApprovedCount}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs border-info/50 text-info">
            <Eye className="h-3 w-3" />
            {deliveredCount}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs border-warning/50 text-warning">
            <AlertCircle className="h-3 w-3" />
            {issueCount}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs border-blue-500/50 text-blue-500">
            <RefreshCw className="h-3 w-3" />
            {correctedCount}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs border-success/50 text-success">
            <CheckCircle2 className="h-3 w-3" />
            {approvedCount}
          </Badge>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <p className="text-sm">
              <span className="font-medium">Flujo de trabajo:</span> Arrastra contenido de <span className="text-muted-foreground">"Creado"</span> a <span className="text-cyan-500">"Guión Aprobado"</span> para aprobar guiones. 
              Desde <span className="text-info">"Entregado"</span> o <span className="text-blue-500">"Corregido"</span> puedes mover a <span className="text-success">"Aprobado"</span> o <span className="text-warning">"Novedad"</span>.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board - Tech/IA aesthetic - Hierarchical layout */}
      <div 
        className="p-5 rounded-xl flex overflow-x-auto gap-4"
        style={{ 
          background: "linear-gradient(180deg, #0a0118 0%, #0d0220 100%)",
          height: "calc(100vh - 180px)",
        }}
      >
          {CLIENT_COLUMNS.map((status) => {
            const colorMap: Record<string, string> = {
              draft: 'bg-muted-foreground',
              script_approved: 'bg-cyan-500',
              delivered: 'bg-info',
              issue: 'bg-warning',
              corrected: 'bg-blue-500',
              approved: 'bg-success'
            };
            // El cliente puede arrastrar hacia: script_approved (desde draft), approved o issue (desde delivered/corrected)
            const canDropHere = status === 'script_approved' || status === 'approved' || status === 'issue';
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
                canDrop={canDropHere}
              >
                {getContentByStatus(status).map((item, itemIndex) => (
                  <DraggableContentCard
                    key={item.id}
                    content={item}
                    isDragging={draggingContent?.id === item.id}
                    onDragStart={handleDragStart}
                    onStatusChange={async (contentId, newStatus) => {
                      try {
                        await updateContentStatus(contentId, newStatus as ContentStatus);
                        toast({
                          title: 'Estado actualizado',
                          description: `Movido a ${CLIENT_COLUMN_LABELS[newStatus as keyof typeof CLIENT_COLUMN_LABELS] || newStatus}`
                        });
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'No se pudo actualizar el estado',
                          variant: 'destructive'
                        });
                      }
                    }}
                    onClick={() => {
                      // Para contenido entregado o corregido, abrir visor fullscreen
                      if (item.status === 'delivered' || item.status === 'corrected') {
                        const reviewableContent = filteredContent.filter(c => 
                          c.status === 'delivered' || c.status === 'corrected'
                        );
                        const index = reviewableContent.findIndex(c => c.id === item.id);
                        setFullscreenStartIndex(index >= 0 ? index : 0);
                        setShowFullscreenViewer(true);
                      } else {
                        setSelectedContent(item);
                      }
                    }}
                  />
                ))}
                
                {getContentByStatus(status).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    {status === 'draft' && <FileText className="h-6 w-6 mb-1 opacity-50" />}
                    {status === 'script_approved' && <FileCheck className="h-6 w-6 mb-1 opacity-50" />}
                    {status === 'delivered' && <Eye className="h-6 w-6 mb-1 opacity-50" />}
                    {status === 'issue' && <AlertCircle className="h-6 w-6 mb-1 opacity-50" />}
                    {status === 'corrected' && <RefreshCw className="h-6 w-6 mb-1 opacity-50" />}
                    {status === 'approved' && <CheckCircle2 className="h-6 w-6 mb-1 opacity-50" />}
                    <p className="text-xs">Vacío</p>
                  </div>
                )}
              </DroppableKanbanColumn>
            );
          })}
      </div>

      {/* Content Detail Dialog - For non-review content */}
      {selectedContent && (
        <ClientContentDetailDialog
          content={selectedContent}
          open={!!selectedContent}
          onOpenChange={(open) => !open && setSelectedContent(null)}
          onUpdate={fetchClientData}
        />
      )}

      {/* Fullscreen Viewer - For delivered/corrected content */}
      {showFullscreenViewer && (
        <FullscreenContentViewer
          items={filteredContent
            .filter(c => c.status === 'delivered' || c.status === 'corrected')
            .map(c => ({
              id: c.id,
              title: c.title,
              thumbnail_url: c.thumbnail_url,
              video_url: c.video_url,
              video_urls: c.video_urls,
              bunny_embed_url: c.bunny_embed_url,
              status: c.status,
              creator: c.creator,
              script: c.script,
              description: c.description
            }))}
          initialIndex={fullscreenStartIndex}
          onClose={() => setShowFullscreenViewer(false)}
          onApprove={async (item) => {
            await updateContentStatus(item.id, 'approved');
            toast({ title: 'Contenido aprobado', description: 'El contenido ha sido aprobado exitosamente' });
          }}
          onReject={async (item, feedback) => {
            // Get current status for UP integration
            const { data: currentContent } = await supabase
              .from('content')
              .select('status')
              .eq('id', item.id)
              .single();
            
            if (currentContent) {
              const { updateContentStatusWithUP } = await import('@/hooks/useContentStatusWithUP');
              await updateContentStatusWithUP({
                contentId: item.id,
                oldStatus: currentContent.status as ContentStatus,
                newStatus: 'issue' as ContentStatus
              });
              
              // Update notes separately
              await supabase
                .from('content')
                .update({ notes: feedback })
                .eq('id', item.id);
              
              await supabase.from('content_comments').insert({
                content_id: item.id,
                user_id: user?.id,
                comment: `Novedad reportada: ${feedback}`
              });
            }
            
            await fetchClientData();
            toast({ title: 'Novedad reportada', description: 'El equipo revisará y corregirá el contenido' });
          }}
          onDownload={async (item) => {
            try {
              const videoUrl = item.video_url || item.bunny_embed_url || (item.video_urls && item.video_urls[0]);
              if (!videoUrl) {
                toast({ title: 'Sin video disponible', variant: 'destructive' });
                return;
              }
              
              const { data, error } = await supabase.functions.invoke('bunny-download', {
                body: { content_id: item.id, video_url: videoUrl }
              });
              
              if (error) throw error;
              
              if (data.download_url) {
                const link = document.createElement('a');
                link.href = data.download_url;
                link.download = `${item.title}.mp4`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast({ title: 'Descarga iniciada' });
              }
            } catch (error) {
              console.error('Download error:', error);
              toast({ title: 'Error al descargar', variant: 'destructive' });
            }
          }}
          showActions={true}
          mode="review"
        />
      )}
    </div>
  );
}
