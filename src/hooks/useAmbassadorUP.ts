import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrgOwner } from "@/hooks/useOrgOwner";

export function useAmbassadorUP() {
  const { toast } = useToast();
  const { currentOrgId } = useOrgOwner();

  /**
   * Get the UP configuration for ambassador content events
   */
  const getAmbassadorUPConfig = async (eventKey: string) => {
    if (!currentOrgId) return null;

    const { data, error } = await supabase
      .from('ambassador_up_config')
      .select('*')
      .eq('organization_id', currentOrgId)
      .eq('event_key', eventKey)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching ambassador UP config:', error);
      return null;
    }

    return data;
  };

  /**
   * Check if content qualifies for ambassador UP rewards
   */
  const checkAmbassadorContentReward = async (contentId: string): Promise<{
    qualifies: boolean;
    userId: string | null;
    eventKey: string | null;
  }> => {
    const { data: content } = await supabase
      .from('content')
      .select('creator_id, is_ambassador_content, content_type, status')
      .eq('id', contentId)
      .maybeSingle();

    if (!content || !content.is_ambassador_content || content.content_type !== 'ambassador_internal') {
      return { qualifies: false, userId: null, eventKey: null };
    }

    let eventKey: string | null = null;
    if (content.status === 'approved') {
      eventKey = 'ambassador_content_approved';
    }

    return {
      qualifies: eventKey !== null,
      userId: content.creator_id,
      eventKey
    };
  };

  return {
    getAmbassadorUPConfig,
    checkAmbassadorContentReward
  };
}
