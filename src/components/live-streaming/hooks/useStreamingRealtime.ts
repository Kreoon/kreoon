import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { StreamingEvent } from '@/hooks/useLiveStreaming';

interface RealtimeMetrics {
  currentViewers: number;
  peakViewers: number;
  totalViews: number;
  chatMessages: number;
  reactions: number;
  productClicks: number;
}

export function useStreamingRealtime(eventId?: string) {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    currentViewers: 0,
    peakViewers: 0,
    totalViews: 0,
    chatMessages: 0,
    reactions: 0,
    productClicks: 0,
  });
  const [isLive, setIsLive] = useState(false);
  const [liveEvents, setLiveEvents] = useState<StreamingEvent[]>([]);

  // Subscribe to live events changes
  useEffect(() => {
    const channel = supabase
      .channel('streaming-events-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streaming_events',
          filter: 'status=eq.live',
        },
        (payload) => {
          console.log('Live event change:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const event = payload.new as StreamingEvent;
            if (event.status === 'live') {
              setLiveEvents(prev => {
                const exists = prev.some(e => e.id === event.id);
                if (exists) {
                  return prev.map(e => e.id === event.id ? event : e);
                }
                return [...prev, event];
              });
            } else {
              setLiveEvents(prev => prev.filter(e => e.id !== event.id));
            }
          } else if (payload.eventType === 'DELETE') {
            const oldEvent = payload.old as StreamingEvent;
            setLiveEvents(prev => prev.filter(e => e.id !== oldEvent.id));
          }
        }
      )
      .subscribe();

    // Fetch initial live events
    const fetchLiveEvents = async () => {
      const { data } = await supabase
        .from('streaming_events')
        .select('*, client:clients(name)')
        .eq('status', 'live');
      if (data) {
        setLiveEvents(data as StreamingEvent[]);
      }
    };
    fetchLiveEvents();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Subscribe to specific event metrics
  useEffect(() => {
    if (!eventId) return;

    const fetchEventStatus = async () => {
      const { data } = await supabase
        .from('streaming_events')
        .select('status, peak_viewers, total_views')
        .eq('id', eventId)
        .single();
      
      if (data) {
        setIsLive(data.status === 'live');
        setMetrics(prev => ({
          ...prev,
          peakViewers: data.peak_viewers || 0,
          totalViews: data.total_views || 0,
        }));
      }
    };
    fetchEventStatus();

    const channel = supabase
      .channel(`streaming-event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streaming_events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const event = payload.new as StreamingEvent;
          setIsLive(event.status === 'live');
          setMetrics(prev => ({
            ...prev,
            peakViewers: event.peak_viewers || prev.peakViewers,
            totalViews: event.total_views || prev.totalViews,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Simulate real-time viewer updates (in production this would come from streaming provider)
  const updateViewerCount = useCallback(async (eventId: string, viewers: number) => {
    try {
      const { data: event } = await supabase
        .from('streaming_events')
        .select('peak_viewers, total_views')
        .eq('id', eventId)
        .single();

      const newPeak = Math.max(event?.peak_viewers || 0, viewers);
      
      await supabase
        .from('streaming_events')
        .update({ 
          peak_viewers: newPeak,
          total_views: (event?.total_views || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      setMetrics(prev => ({
        ...prev,
        currentViewers: viewers,
        peakViewers: newPeak,
      }));
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }
  }, []);

  // Track product click
  const trackProductClick = useCallback(async (productId: string) => {
    try {
      const { data } = await supabase
        .from('streaming_event_products')
        .select('clicks_count')
        .eq('id', productId)
        .single();

      await supabase
        .from('streaming_event_products')
        .update({ 
          clicks_count: (data?.clicks_count || 0) + 1,
        })
        .eq('id', productId);

      setMetrics(prev => ({
        ...prev,
        productClicks: prev.productClicks + 1,
      }));
    } catch (error) {
      console.error('Error tracking product click:', error);
    }
  }, []);

  return {
    metrics,
    isLive,
    liveEvents,
    updateViewerCount,
    trackProductClick,
  };
}
