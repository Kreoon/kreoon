import { useEffect, useRef } from 'react';
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
  const clientIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user || !isClient) return;

    // Get the client ID from localStorage
    const savedClientId = localStorage.getItem('selectedClientId');
    if (!savedClientId) return;

    clientIdRef.current = savedClientId;

    // Set up realtime channel
    const channel = supabase
      .channel('client-realtime-notifications')
      // Listen to content updates (new videos uploaded)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content',
          filter: `client_id=eq.${savedClientId}`
        },
        (payload: RealtimePayload) => {
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

            // Play notification sound
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
        }
      )
      // Listen to new comments
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_comments'
        },
        async (payload: RealtimePayload) => {
          // Don't notify for own comments
          if (payload.new?.user_id === user.id) return;

          // Get the content to check if it belongs to this client
          const { data: content } = await supabase
            .from('content')
            .select('title, client_id')
            .eq('id', payload.new.content_id)
            .single();

          if (content?.client_id !== savedClientId) return;

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
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, isClient, toast]);

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
