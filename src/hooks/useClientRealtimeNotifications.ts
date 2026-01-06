import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
}

export function useClientRealtimeNotifications() {
  const { toast } = useToast();
  const { user, roles } = useAuth();
  const isClient = roles.includes('client');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Track clientId in state to properly react to changes
  const [clientId, setClientId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedClientId');
    }
    return null;
  });

  // Listen for storage changes to update clientId
  useEffect(() => {
    const handleStorageChange = () => {
      const newClientId = localStorage.getItem('selectedClientId');
      setClientId(newClientId);
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for same-tab changes
    const interval = setInterval(() => {
      const currentId = localStorage.getItem('selectedClientId');
      if (currentId !== clientId) {
        setClientId(currentId);
      }
    }, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [clientId]);

  const handleContentUpdate = useCallback((payload: RealtimePayload) => {
    const oldVideoUrls = payload.old?.video_urls || [];
    const newVideoUrls = payload.new?.video_urls || [];
    
    // Check if new videos were added
    if (newVideoUrls.length > oldVideoUrls.length) {
      const newVideosCount = newVideoUrls.length - oldVideoUrls.length;
      toast({
        title: '🎬 Nuevos videos disponibles',
        description: `Se ${newVideosCount === 1 ? 'ha subido un nuevo video' : `han subido ${newVideosCount} nuevos videos`} para "${payload.new.title}"`,
        duration: 8000,
      });
      playNotificationSound();
    }

    // Check if status changed to delivered
    if (payload.old?.status !== 'delivered' && payload.new?.status === 'delivered') {
      toast({
        title: '📦 Contenido entregado',
        description: `El contenido "${payload.new.title}" está listo para tu revisión`,
        duration: 8000,
      });
      playNotificationSound();
    }

    // Check if status changed to corrected
    if (payload.old?.status !== 'corrected' && payload.new?.status === 'corrected') {
      toast({
        title: '✅ Corrección completada',
        description: `El contenido "${payload.new.title}" ha sido corregido y está listo para revisión`,
        duration: 8000,
      });
      playNotificationSound();
    }
  }, [toast]);

  useEffect(() => {
    if (!user || !isClient || !clientId) return;

    // Clean up previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Set up realtime channel with unique name based on clientId
    const channel = supabase
      .channel(`client-realtime-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content',
          filter: `client_id=eq.${clientId}`
        },
        handleContentUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_comments'
        },
        async (payload: RealtimePayload) => {
          try {
            // Don't notify for own comments
            if (payload.new?.user_id === user.id) return;

            // Get the content to check if it belongs to this client
            const { data: content, error: contentError } = await supabase
              .from('content')
              .select('title, client_id')
              .eq('id', payload.new.content_id)
              .single();

            if (contentError || content?.client_id !== clientId) return;

            // Get the commenter's name
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', payload.new.user_id)
              .single();

            toast({
              title: '💬 Nuevo comentario',
              description: `${profile?.full_name || 'Un miembro del equipo'} comentó en "${content?.title}"`,
              duration: 8000,
            });

            playNotificationSound();
          } catch (err) {
            // Silently ignore errors in realtime handlers
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, isClient, clientId, toast, handleContentUpdate]);

  return null;
}

function playNotificationSound() {
  try {
    // Create a simple notification beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
}
