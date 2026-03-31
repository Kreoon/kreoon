/**
 * StreamingStudioPage - Estudio de transmisión en vivo
 * Panel de control completo durante el live
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  MessageSquare,
  ShoppingBag,
  Layers,
  BarChart3,
  Users,
  Settings,
  Maximize,
  Minimize,
} from 'lucide-react';

// Streaming V2 hooks
import { useStreamingSession } from '@/hooks/useStreamingSession';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { useStreamingProducts } from '@/hooks/useStreamingProducts';
import { useStreamingOverlays } from '@/hooks/useStreamingOverlays';
import { useStreamingAnalytics } from '@/hooks/useStreamingAnalytics';
import { useOBSConnection } from '@/hooks/useOBSConnection';

// Streaming V2 components
import {
  LiveControlPanel,
  UnifiedChatPanel,
  ProductShowcase,
  OverlayEditor,
  LiveAnalyticsDashboard,
  SessionStatusBadge,
  StreamTimer,
} from '@/components/streaming-v2';

type PanelView = 'chat' | 'products' | 'overlays' | 'analytics' | 'guests';

export function StreamingStudioPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [activePanel, setActivePanel] = useState<PanelView>('chat');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const organizationId = profile?.current_organization_id || '';

  // Get session details
  const {
    sessions,
    startSession,
    pauseSession,
    stopSession,
  } = useStreamingSession(organizationId);

  const session = sessions.find((s) => s.id === sessionId);

  // Chat hook
  const {
    messages,
    isLoading: chatLoading,
    sendMessage,
    deleteMessage,
  } = useStreamingChat(sessionId || '');

  // Products hook
  const {
    products,
    isLoading: productsLoading,
    featureProduct,
    unfeatureProduct,
    createFlashOffer,
    endFlashOffer,
  } = useStreamingProducts(sessionId || '');

  // Overlays hook
  const {
    overlays,
    isLoading: overlaysLoading,
    updateOverlay,
    deleteOverlay,
    createOverlay,
  } = useStreamingOverlays(sessionId || '');

  // Analytics hook
  const {
    analytics,
    isLoading: analyticsLoading,
  } = useStreamingAnalytics(sessionId || '', { livePolling: session?.status === 'live' });

  // OBS connection
  const obsConnection = useOBSConnection();

  // Redirect if session not found
  useEffect(() => {
    if (!sessionId) {
      navigate('/streaming');
    }
  }, [sessionId, navigate]);

  // Handle start
  const handleStart = useCallback(async () => {
    if (!sessionId) return;
    try {
      await startSession(sessionId);
      toast({
        title: '¡En vivo!',
        description: 'Tu transmisión ha comenzado',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la transmisión',
        variant: 'destructive',
      });
    }
  }, [sessionId, startSession, toast]);

  // Handle pause
  const handlePause = useCallback(async () => {
    if (!sessionId) return;
    try {
      await pauseSession(sessionId);
      toast({
        title: 'Pausado',
        description: 'Tu transmisión está en pausa',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo pausar la transmisión',
        variant: 'destructive',
      });
    }
  }, [sessionId, pauseSession, toast]);

  // Handle stop
  const handleStop = useCallback(async () => {
    if (!sessionId) return;
    try {
      await stopSession(sessionId);
      toast({
        title: 'Finalizado',
        description: 'Tu transmisión ha terminado',
      });
      navigate(`/streaming/recap/${sessionId}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo detener la transmisión',
        variant: 'destructive',
      });
    }
  }, [sessionId, stopSession, toast, navigate]);

  // Handle send message
  const handleSendMessage = useCallback(async (content: string) => {
    try {
      await sendMessage(content, 'kreoon');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive',
      });
    }
  }, [sendMessage, toast]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  const isLive = session.status === 'live';
  const isPaused = session.status === 'paused';

  return (
    <div className={cn('min-h-screen bg-background', isFullscreen && 'p-0')}>
      {/* Top bar */}
      <div className="border-b bg-card/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/streaming')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold truncate max-w-[200px] sm:max-w-none">
                  {session.title}
                </h1>
                <SessionStatusBadge status={session.status} />
              </div>
              {(isLive || isPaused) && (
                <StreamTimer
                  startedAt={session.started_at || undefined}
                  isPaused={isPaused}
                  size="sm"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/streaming/settings')}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left panel - Control */}
          <div className="lg:col-span-1 space-y-6">
            <LiveControlPanel
              session={session}
              channels={session.channels}
              obsState={obsConnection.state}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleStart}
              onStop={handleStop}
              onOpenChat={() => setActivePanel('chat')}
              onOpenProducts={() => setActivePanel('products')}
            />
          </div>

          {/* Right panel - Tabs */}
          <div className="lg:col-span-2">
            <Tabs value={activePanel} onValueChange={(v) => setActivePanel(v as PanelView)}>
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="chat" className="gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Chat</span>
                </TabsTrigger>
                {session.is_shopping_enabled && (
                  <TabsTrigger value="products" className="gap-1">
                    <ShoppingBag className="h-4 w-4" />
                    <span className="hidden sm:inline">Productos</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="overlays" className="gap-1">
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">Overlays</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="guests" className="gap-1">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Invitados</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="mt-4">
                <UnifiedChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onDeleteMessage={deleteMessage}
                  platforms={session.channels?.map((c) => c.channel?.platform).filter(Boolean) as any[] || []}
                  className="h-[500px]"
                />
              </TabsContent>

              {session.is_shopping_enabled && (
                <TabsContent value="products" className="mt-4">
                  <ProductShowcase
                    products={products}
                    onFeature={featureProduct}
                    onUnfeature={unfeatureProduct}
                    onCreateFlashOffer={(id, price, stock, duration) =>
                      createFlashOffer(id, price, stock, duration)
                    }
                    onEndFlashOffer={endFlashOffer}
                    className="h-[500px]"
                  />
                </TabsContent>
              )}

              <TabsContent value="overlays" className="mt-4">
                <OverlayEditor
                  overlays={overlays}
                  onSave={updateOverlay}
                  onDelete={deleteOverlay}
                  onCreate={createOverlay}
                />
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                <LiveAnalyticsDashboard
                  analytics={analytics}
                  currentViewers={session.total_viewers || 0}
                  peakViewers={session.peak_viewers || 0}
                  totalMessages={session.total_messages || 0}
                  totalRevenue={session.total_revenue_usd || 0}
                />
              </TabsContent>

              <TabsContent value="guests" className="mt-4">
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Gestión de invitados próximamente</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StreamingStudioPage;
