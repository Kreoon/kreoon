/**
 * Hook para obtener el conteo de contenido pendiente de revisión para clientes
 * Se usa en el layout global para mostrar el banner de revisión
 * Soporta modo impersonation
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBrandClient } from '@/hooks/useBrandClient';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { supabase } from '@/integrations/supabase/client';

interface PendingReviewCounts {
  scriptCount: number;
  videoCount: number;
  total: number;
  loading: boolean;
  clientId: string | null;
}

export function useClientPendingReviews(): PendingReviewCounts {
  const { user, isClient } = useAuth();
  const { brandClient } = useBrandClient();
  const { isImpersonating, effectiveClientId, effectiveRole } = useImpersonation();

  const [counts, setCounts] = useState<PendingReviewCounts>({
    scriptCount: 0,
    videoCount: 0,
    total: 0,
    loading: true,
    clientId: null,
  });

  // Determinar si estamos en modo cliente (directo o impersonation)
  const isClientMode = isClient || (isImpersonating && effectiveRole === 'client');

  useEffect(() => {
    if (!user?.id || !isClientMode) {
      setCounts({ scriptCount: 0, videoCount: 0, total: 0, loading: false, clientId: null });
      return;
    }

    const fetchPendingReviews = async () => {
      try {
        // Get client ID - try impersonation first, then brand client, then associations
        let clientId = effectiveClientId || brandClient?.id || null;

        if (!clientId) {
          const { data: association } = await supabase
            .from('client_users')
            .select('client_id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

          clientId = association?.client_id || null;
        }

        if (!clientId) {
          // Fallback to legacy user_id relationship
          const { data: legacyClient } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          clientId = legacyClient?.id || null;
        }

        if (!clientId) {
          setCounts({ scriptCount: 0, videoCount: 0, total: 0, loading: false, clientId: null });
          return;
        }

        // Count pending scripts (draft or script_pending with a script)
        const { count: scriptCount } = await supabase
          .from('content')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .in('status', ['draft', 'script_pending'])
          .not('script', 'is', null);

        // Count pending videos (review, delivered, or issue)
        const { count: videoCount } = await supabase
          .from('content')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .in('status', ['review', 'delivered', 'issue']);

        const sc = scriptCount || 0;
        const vc = videoCount || 0;

        setCounts({
          scriptCount: sc,
          videoCount: vc,
          total: sc + vc,
          loading: false,
          clientId,
        });
      } catch (error) {
        console.error('[useClientPendingReviews] Error:', error);
        setCounts({ scriptCount: 0, videoCount: 0, total: 0, loading: false, clientId: null });
      }
    };

    fetchPendingReviews();

    // Subscribe to content changes for this client
    const channel = supabase
      .channel('client-pending-reviews')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
        },
        () => {
          // Refetch on any content change
          fetchPendingReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isClientMode, brandClient?.id, effectiveClientId]);

  return counts;
}
