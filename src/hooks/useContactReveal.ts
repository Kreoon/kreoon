import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const REVEAL_COST = 1; // tokens per reveal
const REVEAL_EXPIRY_DAYS = 8; // days until reveal expires

export function useContactReveal(profileId: string | undefined) {
  const { user } = useAuth();
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userTokens, setUserTokens] = useState(0);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // Check if already revealed and not expired
  useEffect(() => {
    const checkReveal = async () => {
      if (!user?.id || !profileId) {
        setLoading(false);
        return;
      }

      const [{ data: revealData }, { data: profileData }] = await Promise.all([
        supabase
          .from('contact_reveals')
          .select('id, revealed_at')
          .eq('revealer_id', user.id)
          .eq('revealed_profile_id', profileId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('reveal_tokens')
          .eq('id', user.id)
          .single()
      ]);

      // Check if reveal exists and is not expired (8 days)
      if (revealData) {
        const revealedAt = new Date(revealData.revealed_at);
        const expiryDate = new Date(revealedAt.getTime() + REVEAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        const now = new Date();
        
        if (now < expiryDate) {
          setIsRevealed(true);
          setExpiresAt(expiryDate);
        } else {
          // Reveal has expired, delete the old record
          await supabase
            .from('contact_reveals')
            .delete()
            .eq('id', revealData.id);
          setIsRevealed(false);
          setExpiresAt(null);
        }
      } else {
        setIsRevealed(false);
        setExpiresAt(null);
      }

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

      const expiryDate = new Date(Date.now() + REVEAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      setIsRevealed(true);
      setExpiresAt(expiryDate);
      setUserTokens(prev => prev - REVEAL_COST);
      toast.success('Contacto revelado', {
        description: `Disponible por ${REVEAL_EXPIRY_DAYS} días`
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
    expiresAt,
    expiryDays: REVEAL_EXPIRY_DAYS,
  };
}
