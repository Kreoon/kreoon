import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const DEFAULT_REVEAL_COST = 1; // Default token cost if AI hasn't evaluated
const REVEAL_EXPIRY_DAYS = 8; // days until reveal expires

export function useContactReveal(profileId: string | undefined) {
  const { user } = useAuth();
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userTokens, setUserTokens] = useState(0);
  const [revealCost, setRevealCost] = useState(DEFAULT_REVEAL_COST);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // Check if already revealed and not expired, and get the target profile's token cost
  useEffect(() => {
    const checkReveal = async () => {
      if (!user?.id || !profileId) {
        setLoading(false);
        return;
      }

      const [{ data: revealData }, { data: userProfileData }, { data: targetProfileData }] = await Promise.all([
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
          .single(),
        supabase
          .from('profiles')
          .select('ai_token_cost')
          .eq('id', profileId)
          .single()
      ]);

      // Get the AI-calculated token cost for this profile, default to 1 if not set
      const profileTokenCost = targetProfileData?.ai_token_cost || DEFAULT_REVEAL_COST;
      setRevealCost(profileTokenCost);

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

      setUserTokens(userProfileData?.reveal_tokens || 0);
      setLoading(false);
    };

    checkReveal();
  }, [user?.id, profileId]);

  const revealContact = useCallback(async () => {
    if (!user?.id || !profileId) return false;

    if (userTokens < revealCost) {
      toast.error('No tienes suficientes tokens', {
        description: `Necesitas ${revealCost} token${revealCost > 1 ? 's' : ''} para revelar este contacto`
      });
      return false;
    }

    try {
      // Deduct tokens using the AI-calculated cost
      const { error: tokenError } = await supabase
        .from('profiles')
        .update({ reveal_tokens: userTokens - revealCost })
        .eq('id', user.id);

      if (tokenError) throw tokenError;

      // Create reveal record with the actual cost spent
      const { error: revealError } = await supabase
        .from('contact_reveals')
        .insert({
          revealer_id: user.id,
          revealed_profile_id: profileId,
          tokens_spent: revealCost
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
      setUserTokens(prev => prev - revealCost);
      toast.success('Contacto revelado', {
        description: `Disponible por ${REVEAL_EXPIRY_DAYS} días`
      });
      return true;
    } catch (error) {
      console.error('Error revealing contact:', error);
      toast.error('Error al revelar contacto');
      return false;
    }
  }, [user?.id, profileId, userTokens, revealCost]);

  return {
    isRevealed,
    loading,
    userTokens,
    revealCost,
    revealContact,
    expiresAt,
    expiryDays: REVEAL_EXPIRY_DAYS,
  };
}
