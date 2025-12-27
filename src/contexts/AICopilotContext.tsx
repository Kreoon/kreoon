import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AINotification } from '@/components/ai/AICopilotBubble';

interface AICopilotContextType {
  notifications: AINotification[];
  addNotification: (notification: Omit<AINotification, 'id' | 'createdAt' | 'read'>) => string;
  dismissNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAllNotifications: () => void;
}

const AICopilotContext = createContext<AICopilotContextType | undefined>(undefined);

export function AICopilotProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AINotification[]>([]);

  const addNotification = useCallback((
    notification: Omit<AINotification, 'id' | 'createdAt' | 'read'>
  ): string => {
    const id = `ai-notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: AINotification = {
      ...notification,
      id,
      createdAt: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 10)); // Max 10 notifications
    return id;
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <AICopilotContext.Provider value={{
      notifications,
      addNotification,
      dismissNotification,
      markAsRead,
      clearAllNotifications,
    }}>
      {children}
    </AICopilotContext.Provider>
  );
}

export function useAICopilot() {
  const context = useContext(AICopilotContext);
  if (context === undefined) {
    throw new Error('useAICopilot must be used within an AICopilotProvider');
  }
  return context;
}
