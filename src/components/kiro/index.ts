export { KiroWidget } from './KiroWidget';
export { Kiro3D, KIRO_STATES } from './Kiro3D';
export type { KiroState, KiroExpression } from './Kiro3D';
export { ChatBubble } from './ChatBubble';
export { QuickAction } from './QuickAction';
export { KiroChat } from './KiroChat';
export { KiroActions } from './KiroActions';
export { KiroGame } from './KiroGame';
export { KiroNotificationPanel } from './KiroNotificationPanel';
export { useMouseTracking } from './hooks/useMouseTracking';
export { useKiroPersistence, STORAGE_KEYS } from './hooks/useKiroPersistence';
export type { KiroPosition, KiroChatMessage, KiroPreferences } from './hooks/useKiroPersistence';
export {
  useKiroNotifications,
  NOTIFICATIONS_STORAGE_KEY,
  MAX_NOTIFICATIONS,
} from './hooks/useKiroNotifications';
export {
  ZONE_CONFIGS,
  getZoneConfig,
  getZoneActions,
  getZoneGreeting,
  getZoneDisplay,
} from './config/zoneActions';
export type { ZoneAction, ZoneConfig } from './config/zoneActions';

// Notification types and utilities (Fase 4)
export {
  NOTIFICATION_CONFIGS,
  getNotificationConfig,
  generateNotificationId,
  formatRelativeTime,
  filterOldNotifications,
  getPriorityColor,
  shouldShowToast,
} from './types/notifications';
export type {
  KiroNotificationType,
  KiroNotificationPriority,
  KiroNotification,
  NewKiroNotification,
  NotificationConfig,
} from './types/notifications';

// Chat components mejorados (Fase 5)
export { MarkdownRenderer } from './chat/MarkdownRenderer';
export { TypingIndicator } from './chat/TypingIndicator';
export { MessageFeedback } from './chat/MessageFeedback';
export { ChatInput } from './chat/ChatInput';
