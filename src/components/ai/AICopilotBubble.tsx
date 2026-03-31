import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, ChevronRight, Brain, 
  Lightbulb, AlertTriangle, CheckCircle2,
  Zap, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface AINotification {
  id: string;
  type: 'insight' | 'warning' | 'success' | 'suggestion' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: Date;
  read?: boolean;
}

interface AICopilotBubbleProps {
  notifications?: AINotification[];
  onNotificationDismiss?: (id: string) => void;
  onNotificationAction?: (id: string) => void;
  className?: string;
}

const NOTIFICATION_ICONS = {
  insight: Brain,
  warning: AlertTriangle,
  success: CheckCircle2,
  suggestion: Lightbulb,
  info: MessageCircle,
};

const NOTIFICATION_COLORS = {
  insight: 'text-primary border-primary/30 bg-primary/5',
  warning: 'text-amber-500 border-amber-500/30 bg-amber-500/5',
  success: 'text-green-500 border-green-500/30 bg-green-500/5',
  suggestion: 'text-blue-500 border-blue-500/30 bg-blue-500/5',
  info: 'text-muted-foreground border-border bg-muted/50',
};

export function AICopilotBubble({
  notifications = [],
  onNotificationDismiss,
  onNotificationAction,
  className
}: AICopilotBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  // Pulse effect when new notifications arrive
  useEffect(() => {
    if (unreadCount > 0) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const handleDismiss = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onNotificationDismiss?.(id);
  }, [onNotificationDismiss]);

  const handleAction = useCallback((id: string, action: () => void) => {
    action();
    onNotificationAction?.(id);
  }, [onNotificationAction]);

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      <AnimatePresence>
        {/* Notifications Panel */}
        {isExpanded && notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute bottom-20 right-0 w-80 max-h-96 overflow-hidden rounded-sm border border-border bg-card/95 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Copiloto IA</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-72 p-2 space-y-2">
              {notifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type];
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "p-3 rounded-sm border transition-all",
                      NOTIFICATION_COLORS[notification.type],
                      !notification.read && "ring-1 ring-primary/20"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.action && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 mt-2 text-xs gap-1"
                            onClick={() => handleAction(notification.id, notification.action!.onClick)}
                          >
                            {notification.action.label}
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0 opacity-60 hover:opacity-100"
                        onClick={(e) => handleDismiss(notification.id, e)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-border bg-muted/30">
              <p className="text-[10px] text-center text-muted-foreground">
                Asistente IA de ContentForge
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Bubble */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative flex items-center justify-center",
          "w-14 h-14 rounded-full",
          "bg-gradient-to-br from-primary via-primary/90 to-primary/70",
          "shadow-lg shadow-primary/25",
          "border-2 border-primary/30",
          "transition-all duration-300",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
          isExpanded && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
        )}
      >
        {/* Animated Background Glow */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/30 blur-xl"
          animate={{
            scale: showPulse ? [1, 1.5, 1] : isHovered ? 1.3 : 1,
            opacity: showPulse ? [0.5, 0.8, 0.5] : isHovered ? 0.6 : 0.4,
          }}
          transition={{
            duration: showPulse ? 1.5 : 0.3,
            repeat: showPulse ? Infinity : 0,
          }}
        />

        {/* Inner Orb Effect */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />

        {/* Icon */}
        <motion.div
          animate={{
            rotate: isHovered ? 360 : 0,
          }}
          transition={{ duration: 0.5 }}
        >
          {isExpanded ? (
            <Zap className="h-6 w-6 text-primary-foreground drop-shadow-sm" />
          ) : (
            <Sparkles className="h-6 w-6 text-primary-foreground drop-shadow-sm" />
          )}
        </motion.div>

        {/* Notification Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={cn(
                "absolute -top-1 -right-1",
                "flex items-center justify-center",
                "min-w-5 h-5 px-1 rounded-full",
                "bg-destructive text-destructive-foreground",
                "text-xs font-bold shadow-md"
              )}
            >
              {unreadCount}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Particles (decorative) */}
        {isHovered && (
          <>
            <motion.div
              className="absolute w-1.5 h-1.5 rounded-full bg-primary-foreground/60"
              animate={{
                y: [-10, -20],
                x: [0, 10],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <motion.div
              className="absolute w-1 h-1 rounded-full bg-primary-foreground/60"
              animate={{
                y: [-8, -18],
                x: [0, -8],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
            />
          </>
        )}
      </motion.button>

      {/* Tooltip when no notifications */}
      <AnimatePresence>
        {isHovered && !isExpanded && notifications.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-sm bg-popover border border-border shadow-lg whitespace-nowrap"
          >
            <p className="text-xs font-medium">Copiloto IA</p>
            <p className="text-[10px] text-muted-foreground">Sin notificaciones</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
