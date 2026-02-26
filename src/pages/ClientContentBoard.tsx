import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Search, Eye, AlertCircle, CheckCircle2, Package, FileText, RefreshCw,
  FileCheck, Scroll, Maximize2, Download, Share2, Presentation, Bell,
  Crown
} from "lucide-react";
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from "@/components/ui/button";
// Tabs removed — only Kanban view remains
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Content, ContentStatus, STATUS_LABELS } from "@/types/database";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useBoardSettings } from "@/hooks/useBoardSettings";
import { useSubscription } from "@/hooks/useSubscription";
import { getPlanById } from "@/lib/finance/constants";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { updateContentStatusWithUP } from "@/hooks/useContentStatusWithUP";
import { Card, CardContent } from "@/components/ui/card";

// Unified components
import { UnifiedContentViewer, SocialSharePanel, ContentNotificationsDropdown, PresentationMode } from "@/components/content/unified";
import { UnifiedContentItem, useDownload, useContentNotifications } from "@/hooks/unified";

// Legacy components for Kanban view
import { DroppableKanbanColumn } from "@/components/dashboard/DroppableKanbanColumn";
import { DraggableContentCard } from "@/components/dashboard/DraggableContentCard";
import { ClientContentDetailDialog } from "@/components/content/ClientContentDetailDialog";

// Fallback cuando no hay configuración de organización
const CLIENT_COLUMNS_FALLBACK: ContentStatus[] = ['draft', 'script_approved', 'delivered', 'issue', 'corrected', 'approved'];
const CLIENT_COLUMN_LABELS_FALLBACK: Record<string, string> = {
  draft: 'Creado',
  script_approved: 'Guión Aprobado',
  delivered: 'Entregado',
  issue: 'Novedad',
  corrected: 'Corregido',
  approved: 'Aprobado'
};

// Usar reglas configuradas para cliente
const canClientMoveWithRules = (
  currentStatus: string,
  targetStatus: string,
  orgStatuses: { id: string; status_key: string; sort_order: number }[],
  rules: { status_id: string; can_advance_roles?: string[]; can_retreat_roles?: string[] }[]
): boolean => {
  const currentOrgStatus = orgStatuses.find(s => s.status_key === currentStatus);
  const targetOrgStatus = orgStatuses.find(s => s.status_key === targetStatus);
  if (!currentOrgStatus || !targetOrgStatus) return false;
  const currentRule = rules.find(r => r.status_id === currentOrgStatus.id);
  if (!currentRule) return false;
  const isForward = targetOrgStatus.sort_order > currentOrgStatus.sort_order;
  const roles = isForward ? (currentRule.can_advance_roles || []) : (currentRule.can_retreat_roles || []);
  if (roles.length === 0) return false;
  return roles.includes('client');
};

// Verificar si un movimiento de estado es válido para el cliente (fallback cuando no hay reglas)
const canClientMoveToStatusFallback = (
  currentStatus: ContentStatus,
  targetStatus: ContentStatus,
  content?: Content
): boolean => {
  if (currentStatus === 'draft' && targetStatus === 'script_approved') {
    return !!(content?.script && content.script.trim().length > 0);
  }
  if (currentStatus === 'delivered' && ['approved', 'issue'].includes(targetStatus)) return true;
  if (currentStatus === 'corrected' && ['approved', 'issue'].includes(targetStatus)) return true;
  if (['approved', 'script_approved', 'issue'].includes(currentStatus)) return false;
  return false;
};

interface ClientInfo {
  id: string;
  name: string;
  organization_id?: string;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'published';

// Map subscription tier → plan ID to get contentPerMonth limits
const TIER_TO_PLAN: Record<string, string> = {
  brand_free: 'marcas-free',
  brand_starter: 'marcas-starter',
  brand_pro: 'marcas-pro',
  brand_business: 'marcas-business',
};

export default function ClientContentBoard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isImpersonating, effectiveClientId, effectiveUserId } = useImpersonation();
  const { toast } = useToast();
  const { currentOrgId } = useOrgOwner();
  const { statuses: orgStatuses, rules, statePermissions } = useBoardSettings(currentOrgId);
  const { download, canDownload, isDownloading } = useDownload();

  // Subscription check for plan gating — client users have personal subscriptions (not org)
  const { currentTier, isLoading: subLoading } = useSubscription();
  const currentPlan = useMemo(() => {
    const planId = TIER_TO_PLAN[currentTier] || 'marcas-free';
    return getPlanById(planId);
  }, [currentTier]);
  const contentLimit = currentPlan?.contentPerMonth;

  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Estado de drag (para modo Kanban)
  const [draggingContent, setDraggingContent] = useState<Content | null>(null);
  const [dropTarget, setDropTarget] = useState<ContentStatus | null>(null);

  // Dialog para detalle
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  // Unified viewer state
  const [showViewer, setShowViewer] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const [viewerItems, setViewerItems] = useState<UnifiedContentItem[]>([]);
  const [viewerMode, setViewerMode] = useState<'review' | 'browse'>('browse');

  // Share panel state
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareItem, setShareItem] = useState<UnifiedContentItem | null>(null);

  // Presentation mode state
  const [showPresentation, setShowPresentation] = useState(false);

  // Notifications hook
  const { notifications, unreadCount } = useContentNotifications({
    enabled: true,
    showToasts: true,
    clientId: clientInfo?.id
  });

  // Fetch client data - react to impersonation changes
  useEffect(() => {
    if (user) {
      fetchClientData();
    }
  }, [user, isImpersonating, effectiveClientId]);

  const fetchClientData = async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      let clientId: string | null = null;

      // IMPERSONATION MODE: Use effectiveClientId directly
      if (isImpersonating && effectiveClientId) {
        clientId = effectiveClientId;
      } else {
        // Normal mode: Check for selected client from localStorage first
        const savedClientId = localStorage.getItem('selectedClientId');

        if (savedClientId) {
          // Verify user has access to this client
          const { data: association, error: assocError } = await supabase
            .from('client_users')
            .select('client_id')
            .eq('user_id', user.id)
            .eq('client_id', savedClientId)
            .maybeSingle();

          if (assocError) {
            console.error('Error checking client access:', assocError);
          }

          if (association) {
            clientId = savedClientId;
          }
        }

        // If no saved client or invalid, get first associated client
        if (!clientId) {
          const { data: associations, error: listError } = await supabase
            .from('client_users')
            .select('client_id')
            .eq('user_id', user.id)
            .limit(1);

          if (listError) {
            console.error('Error listing client associations:', listError);
            toast({
              title: 'Error de acceso',
              description: 'No se pudo verificar tu vinculación. Contacta al administrador.',
              variant: 'destructive'
            });
          }

          if (associations && associations.length > 0) {
            clientId = associations[0].client_id;
            localStorage.setItem('selectedClientId', clientId);
          }
        }
      }

      if (clientId) {
        // Get client info WITH organization_id
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id, name, organization_id')
          .eq('id', clientId)
          .maybeSingle();

        if (clientError) {
          console.error('Error fetching client:', clientError);
          toast({
            title: 'Error de acceso',
            description: 'No se pudo cargar la información de la empresa. Contacta al administrador.',
            variant: 'destructive'
          });
          return;
        }

        if (clientData) {
          setClientInfo(clientData);

          // Verify client has organization_id
          if (!clientData.organization_id) {
            console.error('Client has no organization_id:', clientData);
            toast({
              title: 'Error de configuración',
              description: 'La empresa no está vinculada a una organización. Contacta al administrador.',
              variant: 'destructive'
            });
            return;
          }

          // Use RPC get_org_content with client filter (bypasses RLS timeout issues)
          const { data: contentData, error: contentError } = await supabase
            .rpc('get_org_content', {
              p_organization_id: clientData.organization_id,
              p_role: 'client',
              p_user_id: user.id,
              p_client_id: clientData.id,
              p_limit: 500
            });

          if (contentError) {
            console.error('Error fetching content:', contentError);
            // Fallback: try direct query with error logging
            console.log('Attempting fallback direct query...');
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('content')
              .select('*')
              .eq('client_id', clientData.id)
              .order('created_at', { ascending: false });

            if (fallbackError) {
              console.error('Fallback query also failed:', fallbackError);
              toast({
                title: 'Error de permisos',
                description: 'No tienes acceso al contenido. Verifica que estés correctamente vinculado a la empresa.',
                variant: 'destructive'
              });
            }
            setContent((fallbackData || []) as unknown as Content[]);
          } else {
            setContent((contentData || []) as unknown as Content[]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Convert Content to UnifiedContentItem
  const toUnifiedItem = useCallback((c: Content): UnifiedContentItem => ({
    id: c.id,
    type: 'work',
    title: c.title,
    description: c.description || undefined,
    media_url: c.video_urls?.[0] || c.video_url || c.bunny_embed_url || '',
    media_type: 'video',
    thumbnail_url: c.thumbnail_url || undefined,
    video_urls: c.video_urls || undefined,
    bunny_embed_url: c.bunny_embed_url || undefined,
    status: c.status,
    is_published: c.is_published,
    creator_id: c.creator_id || undefined,
    user_id: c.creator_id || undefined,
    user_name: (c as any).profiles?.full_name,
    user_avatar: (c as any).profiles?.avatar_url,
    creator: (c as any).profiles || undefined,
    client_id: c.client_id || undefined,
    client_name: c.client?.name,
    views_count: c.views_count || 0,
    likes_count: c.likes_count || 0,
    comments_count: 0,
    script: c.script,
    created_at: c.created_at,
    updated_at: c.updated_at || undefined
  }), []);

  // Filtrar contenido por búsqueda y tab
  const filteredContent = useMemo(() => {
    let filtered = content;

    // Filtro por tab
    switch (filterTab) {
      case 'pending':
        filtered = filtered.filter(c => ['delivered', 'corrected'].includes(c.status));
        break;
      case 'approved':
        filtered = filtered.filter(c => c.status === 'approved');
        break;
      case 'published':
        filtered = filtered.filter(c => c.is_published);
        break;
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [content, searchTerm, filterTab]);

  // Convert filtered content to unified items
  const unifiedItems = useMemo(() =>
    filteredContent.map(toUnifiedItem),
    [filteredContent, toUnifiedItem]
  );

  // Get reviewable content (delivered + corrected)
  const reviewableContent = useMemo(() =>
    filteredContent.filter(c => c.status === 'delivered' || c.status === 'corrected'),
    [filteredContent]
  );

  // UNIFICADO: Cliente ve TODAS las columnas (mismo tablero que internos). El contenido ya está filtrado a su cliente.
  const clientColumns = useMemo(() => {
    if (!orgStatuses?.length) {
      return CLIENT_COLUMNS_FALLBACK.map(s => ({ status: s, label: CLIENT_COLUMN_LABELS_FALLBACK[s], color: '#6b7280' }));
    }
    return orgStatuses
      .filter(s => s.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(s => ({ status: s.status_key, label: s.label, color: s.color || '#6b7280' }));
  }, [orgStatuses]);

  // Agrupar contenido por estado
  const getContentByStatus = (status: ContentStatus | string) => {
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

  // Handlers de drag and drop (para modo Kanban)
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

    const canMove = (orgStatuses?.length && rules?.length)
      ? canClientMoveWithRules(draggingContent.status, targetStatus as string, orgStatuses, rules)
      : canClientMoveToStatusFallback(draggingContent.status, targetStatus, draggingContent);

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
        description: `Movido a ${clientColumns.find(c => c.status === targetStatus)?.label || targetStatus}`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive'
      });
    }

    setDraggingContent(null);
  }, [draggingContent, user, toast, orgStatuses, rules, clientColumns]);

  const handleDragEnter = useCallback((status: ContentStatus) => {
    setDropTarget(status);
  }, []);

  // Open viewer for an item
  const openViewer = useCallback((items: UnifiedContentItem[], startIndex: number, mode: 'review' | 'browse' = 'browse') => {
    setViewerItems(items);
    setViewerStartIndex(startIndex);
    setViewerMode(mode);
    setShowViewer(true);
  }, []);

  // Handle item click from grid
  const handleItemClick = useCallback((item: UnifiedContentItem, index: number) => {
    // For content pending review, open in review mode
    if (item.status === 'delivered' || item.status === 'corrected') {
      const reviewItems = unifiedItems.filter(i =>
        i.status === 'delivered' || i.status === 'corrected'
      );
      const reviewIndex = reviewItems.findIndex(i => i.id === item.id);
      openViewer(reviewItems, reviewIndex >= 0 ? reviewIndex : 0, 'review');
    } else {
      // Browse mode for other content
      openViewer(unifiedItems, index, 'browse');
    }
  }, [unifiedItems, openViewer]);

  // Handle approve in viewer
  const handleApprove = useCallback(async (item: UnifiedContentItem) => {
    await updateContentStatus(item.id, 'approved');
    toast({ title: 'Contenido aprobado', description: 'El contenido ha sido aprobado exitosamente' });
  }, [toast, updateContentStatus]);

  // Handle reject in viewer
  const handleReject = useCallback(async (item: UnifiedContentItem, feedback: string) => {
    const { data: currentContent } = await supabase
      .from('content')
      .select('status')
      .eq('id', item.id)
      .single();

    if (currentContent) {
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
  }, [user, toast]);

  // Handle download
  const handleDownload = useCallback((item: UnifiedContentItem) => {
    download({
      contentId: item.id,
      videoUrl: item.media_url,
      videoUrls: item.video_urls,
      title: item.title
    });
  }, [download]);

  // Handle share
  const handleShare = useCallback((item: UnifiedContentItem) => {
    setShareItem(item);
    setShowSharePanel(true);
  }, []);

  // Stats
  const draftCount = getContentByStatus('draft').length;
  const scriptApprovedCount = getContentByStatus('script_approved').length;
  const deliveredCount = getContentByStatus('delivered').length;
  const issueCount = getContentByStatus('issue').length;
  const correctedCount = getContentByStatus('corrected').length;
  const approvedCount = getContentByStatus('approved').length;
  const publishedCount = content.filter(c => c.is_published).length;

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
      <div className="p-4 md:p-6 space-y-4">
        {/* Page Header */}
        <PageHeader
          icon={Scroll}
          title="Mi Contenido"
          subtitle={`${clientInfo.name} - Revisión y aprobación de proyectos`}
        />

        {/* Stats */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs">
            <FileText className="h-3 w-3" />
            {content.length} total
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs border-info/50 text-info">
            <Eye className="h-3 w-3" />
            {deliveredCount + correctedCount} por revisar
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs border-success/50 text-success">
            <CheckCircle2 className="h-3 w-3" />
            {approvedCount} aprobados
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs border-purple-500/50 text-purple-500">
            <Share2 className="h-3 w-3" />
            {publishedCount} publicados
          </Badge>
          {contentLimit != null && (
            <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs border-amber-500/50 text-amber-500">
              <Crown className="h-3 w-3" />
              {content.length}/{contentLimit} del plan
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
            {/* Review All Button */}
            {reviewableContent.length > 0 && (
              <Button
                onClick={() => {
                  const items = reviewableContent.map(toUnifiedItem);
                  openViewer(items, 0, 'review');
                }}
                className="gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                <span className="hidden sm:inline">Revisar</span>
                <Badge variant="secondary" className="ml-1">
                  {reviewableContent.length}
                </Badge>
              </Button>
            )}

            {/* Presentation Mode Button */}
            {unifiedItems.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowPresentation(true)}
                className="gap-2"
              >
                <Presentation className="h-4 w-4" />
                <span className="hidden sm:inline">Presentación</span>
              </Button>
            )}

            {/* Notifications Dropdown */}
            <ContentNotificationsDropdown clientId={clientInfo?.id} />

            {/* Refresh */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchClientData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
        </div>

        {/* Kanban View */}
        <>
            {/* Search */}
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 md:h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
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

            {/* Kanban Board */}
            <div
              className="p-3 md:p-5 rounded-xl flex overflow-x-auto gap-4"
              style={{
                background: "linear-gradient(180deg, #0a0118 0%, #0d0220 100%)",
                height: "calc(100vh - 320px)",
                minHeight: "400px",
              }}
            >
              {clientColumns.map((col) => {
                const canDropHere = draggingContent
                  ? (orgStatuses?.length && rules?.length)
                    ? canClientMoveWithRules(draggingContent.status, col.status, orgStatuses, rules)
                    : canClientMoveToStatusFallback(draggingContent.status, col.status as ContentStatus, draggingContent)
                  : true;
                return (
                  <DroppableKanbanColumn
                    key={col.status}
                    status={col.status as ContentStatus}
                    title={col.label}
                    count={getContentByStatus(col.status).length}
                    isDropTarget={dropTarget === col.status}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.status as ContentStatus)}
                    color={col.color}
                    canDrop={canDropHere}
                  >
                    {getContentByStatus(col.status).map((item, itemIndex) => (
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
                              description: `Movido a ${clientColumns.find(c => c.status === newStatus)?.label || STATUS_LABELS[newStatus as ContentStatus] || newStatus}`
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
                            const reviewItems = reviewableContent.map(toUnifiedItem);
                            const index = reviewItems.findIndex(i => i.id === item.id);
                            openViewer(reviewItems, index >= 0 ? index : 0, 'review');
                          } else {
                            setSelectedContent(item);
                          }
                        }}
                      />
                    ))}

                    {getContentByStatus(col.status).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <p className="text-xs">Vacío</p>
                      </div>
                    )}
                  </DroppableKanbanColumn>
                );
              })}
            </div>
        </>
      </div>

      {/* Content Detail Dialog - For non-review content in Kanban mode */}
      {selectedContent && (
        <ClientContentDetailDialog
          content={selectedContent}
          open={!!selectedContent}
          onOpenChange={(open) => !open && setSelectedContent(null)}
          onUpdate={fetchClientData}
        />
      )}

      {/* Unified Content Viewer */}
      <UnifiedContentViewer
        items={viewerItems}
        initialIndex={viewerStartIndex}
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
        mode={viewerMode}
        onApprove={viewerMode === 'review' ? handleApprove : undefined}
        onReject={viewerMode === 'review' ? handleReject : undefined}
        showDownload={true}
        showShare={true}
        showComments={true}
        showStats={true}
        allowKreoonShare={true}
      />

      {/* Share Panel */}
      {shareItem && (
        <SocialSharePanel
          open={showSharePanel}
          onOpenChange={setShowSharePanel}
          contentId={shareItem.id}
          url={`${window.location.origin}/content/${shareItem.id}`}
          title={shareItem.title || 'Mira este contenido'}
          description={shareItem.description}
          allowKreoonShare={canDownload(shareItem.status || '', shareItem.is_published)}
          creatorId={shareItem.creator_id}
          clientId={shareItem.client_id}
        />
      )}

      {/* Presentation Mode */}
      <PresentationMode
        items={unifiedItems}
        isOpen={showPresentation}
        onClose={() => setShowPresentation(false)}
        autoPlay={true}
        autoAdvance={false}
        showControls={true}
        showBranding={true}
        brandingName={clientInfo?.name}
        onApprove={handleApprove}
        onReject={(item) => handleReject(item, 'Requiere correcciones')}
      />
    </div>
  );
}
