import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Achievement } from '@/hooks/useAchievements';
import { AchievementUnlockToast } from './AchievementUnlockToast';

interface AchievementNotificationContextType {
  showAchievement: (achievement: Achievement) => void;
}

const AchievementNotificationContext = createContext<AchievementNotificationContextType>({
  showAchievement: () => {},
});

export const useAchievementNotification = () => useContext(AchievementNotificationContext);

export const AchievementNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  // Subscribe to new achievements for current user
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('new-achievements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          // Fetch the achievement details
          const { data: achievement } = await supabase
            .from('achievements')
            .select('*')
            .eq('id', payload.new.achievement_id)
            .single();

          if (achievement) {
            setQueue(prev => [...prev, achievement as Achievement]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Process queue
  useEffect(() => {
    if (!currentAchievement && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrentAchievement(next);
      setQueue(rest);
    }
  }, [currentAchievement, queue]);

  const handleClose = useCallback(() => {
    setCurrentAchievement(null);
  }, []);

  const showAchievement = useCallback((achievement: Achievement) => {
    setQueue(prev => [...prev, achievement]);
  }, []);

  return (
    <AchievementNotificationContext.Provider value={{ showAchievement }}>
      {children}
      {currentAchievement && (
        <AchievementUnlockToast 
          achievement={currentAchievement} 
          onClose={handleClose} 
        />
      )}
    </AchievementNotificationContext.Provider>
  );
};
