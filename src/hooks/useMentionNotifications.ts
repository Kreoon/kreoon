import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useMentionNotifications() {
  const { profile } = useAuth();
  const organizationId = profile?.current_organization_id;

  /**
   * Extract mentioned user IDs from message text
   * Matches @username patterns and finds corresponding user IDs
   */
  const extractMentionedUserIds = useCallback(async (
    text: string,
    participantIds: string[]
  ): Promise<string[]> => {
    const mentionPattern = /@(\S+)/g;
    const matches = text.match(mentionPattern);
    
    if (!matches || matches.length === 0 || participantIds.length === 0) {
      return [];
    }

    // Get profiles for participants to match names
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', participantIds);

    if (!profiles) return [];

    const mentionedUserIds: string[] = [];

    for (const match of matches) {
      const mentionName = match.slice(1).toLowerCase(); // Remove @
      
      // Find user whose name matches the mention
      const matchedUser = profiles.find(p => {
        const nameParts = (p.full_name || '').toLowerCase().split(' ');
        // Match first name, last name, or full name
        return nameParts.some(part => part === mentionName) ||
               (p.full_name || '').toLowerCase().replace(/\s+/g, '') === mentionName;
      });

      if (matchedUser && !mentionedUserIds.includes(matchedUser.id)) {
        mentionedUserIds.push(matchedUser.id);
      }
    }

    return mentionedUserIds;
  }, []);

  /**
   * Create notifications for mentioned users
   */
  const notifyMentionedUsers = useCallback(async (
    mentionedUserIds: string[],
    senderName: string,
    messagePreview: string,
    conversationId: string,
    conversationName?: string | null
  ) => {
    if (!organizationId || mentionedUserIds.length === 0) return;

    const truncatedMessage = messagePreview.length > 50 
      ? messagePreview.substring(0, 50) + '...' 
      : messagePreview;

    const notifications = mentionedUserIds.map(userId => ({
      user_id: userId,
      organization_id: organizationId,
      type: 'mention' as const,
      title: `${senderName} te mencionó`,
      message: conversationName 
        ? `En ${conversationName}: "${truncatedMessage}"`
        : `"${truncatedMessage}"`,
      entity_type: 'chat_conversation',
      entity_id: conversationId,
      is_read: false
    }));

    const { error } = await supabase
      .from('user_notifications')
      .insert(notifications);

    if (error) {
      console.error('Error creating mention notifications:', error);
    }
  }, [organizationId]);

  return {
    extractMentionedUserIds,
    notifyMentionedUsers
  };
}
