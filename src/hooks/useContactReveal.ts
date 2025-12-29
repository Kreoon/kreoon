import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const REVEAL_COST = 1; // tokens per reveal

export function useContactReveal(profileId: string | undefined) {
  const { user } = useAuth();
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userTokens, setUserTokens] = useState(0);

  // Check if already revealed
  useEffect(() => {
    const checkReveal = async () => {
      if (!user?.id || !profileId) {
        setLoading(false);
        return;
      }

      const [{ data: revealData }, { data: profileData }] = await Promise.all([
        supabase
          .from('contact_reveals')
          .select('id')
          .eq('revealer_id', user.id)
          .eq('revealed_profile_id', profileId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('reveal_tokens')
          .eq('id', user.id)
          .single()
      ]);

      setIsRevealed(!!revealData);
      setUserTokens(profileData?.reveal_tokens || 0);
      setLoading(false);
    };

    checkReveal();
  }, [user?.id, profileId]);

  const revealContact = useCallback(async () => {
    if (!user?.id || !profileId) return false;

    if (userTokens < REVEAL_COST) {
      toast.error('No tienes suficientes tokens', {
        description: `Necesitas ${REVEAL_COST} token para revelar contactos`
      });
      return false;
    }

    try {
      // Deduct tokens
      const { error: tokenError } = await supabase
        .from('profiles')
        .update({ reveal_tokens: userTokens - REVEAL_COST })
        .eq('id', user.id);

      if (tokenError) throw tokenError;

      // Create reveal record
      const { error: revealError } = await supabase
        .from('contact_reveals')
        .insert({
          revealer_id: user.id,
          revealed_profile_id: profileId,
          tokens_spent: REVEAL_COST
        });

      if (revealError) throw revealError;

      // Create notification for the revealed profile
      await supabase
        .from('social_notifications')
        .insert({
          user_id: profileId,
          actor_id: user.id,
          notification_type: 'reveal',
          entity_type: 'profile',
          entity_id: profileId,
          message: 'reveló tus datos de contacto'
        });

      setIsRevealed(true);
      setUserTokens(prev => prev - REVEAL_COST);
      toast.success('Contacto revelado', {
        description: 'Ahora puedes ver los datos de contacto'
      });
      return true;
    } catch (error) {
      console.error('Error revealing contact:', error);
      toast.error('Error al revelar contacto');
      return false;
    }
  }, [user?.id, profileId, userTokens]);

  return {
    isRevealed,
    loading,
    userTokens,
    revealCost: REVEAL_COST,
    revealContact,
  };
}
