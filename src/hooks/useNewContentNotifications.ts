import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface NewContentPayload {
  new: {
    id: string;
    title: string;
    status: string;
    client_id: string;
    product_id: string;
    organization_id: string;
  };
}

/**
 * Hook that listens for new content (projects) created in the organization
 * and notifies strategists/admins in real-time
 */
export function useNewContentNotifications() {
  const { user, roles } = useAuth();
  const notifiedIds = useRef<Set<string>>(new Set());

  // Only notify strategists, admins, and team leaders
  const shouldNotify = roles?.some(role => 
    ['admin', 'strategist', 'team_leader'].includes(role)
  );

  useEffect(() => {
    if (!user || !shouldNotify) return;

    const channel = supabase
      .channel('new-content-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content',
        },
        async (payload: { new: Record<string, any> }) => {
          const newContent = payload.new as NewContentPayload['new'];
          
          // Avoid duplicate notifications
          if (notifiedIds.current.has(newContent.id)) return;
          notifiedIds.current.add(newContent.id);

          // Only notify for draft status (new projects waiting for strategist)
          if (newContent.status !== 'draft') return;

          // Fetch client name for better notification
          let clientName = 'Cliente';
          if (newContent.client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('name')
              .eq('id', newContent.client_id)
              .single();
            if (client) clientName = client.name;
          }

          toast.info('🎬 Nuevo proyecto creado', {
            description: `${newContent.title} - ${clientName}`,
            action: {
              label: 'Ver en Board',
              onClick: () => {
                window.location.href = '/board';
              },
            },
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, shouldNotify]);
}
