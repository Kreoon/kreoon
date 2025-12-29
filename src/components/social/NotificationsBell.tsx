import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, Heart, MessageCircle, UserPlus, Unlock, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSocialNotifications, SocialNotification } from '@/hooks/useSocialNotifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const notificationIcons: Record<string, React.ReactNode> = {
  follow: <UserPlus className="h-4 w-4 text-blue-500" />,
  like: <Heart className="h-4 w-4 text-red-500" />,
  comment: <MessageCircle className="h-4 w-4 text-green-500" />,
  reveal: <Unlock className="h-4 w-4 text-amber-500" />,
  mention: <AtSign className="h-4 w-4 text-purple-500" />,
};

const notificationMessages: Record<string, string> = {
  follow: 'comenzó a seguirte',
  like: 'le dio me gusta a tu publicación',
  comment: 'comentó en tu publicación',
  reveal: 'reveló tus datos de contacto',
  mention: 'te mencionó',
};

function NotificationItem({ 
  notification, 
  onRead, 
  onNavigate 
}: { 
  notification: SocialNotification; 
  onRead: () => void;
  onNavigate: () => void;
}) {
  const handleClick = () => {
    if (!notification.is_read) {
      onRead();
    }
    onNavigate();
  };

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-social-muted/50 cursor-pointer transition-colors rounded-lg",
        !notification.is_read && "bg-social-accent/5"
      )}
      onClick={handleClick}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={notification.actor?.avatar_url || undefined} />
        <AvatarFallback className="bg-social-muted text-social-foreground text-sm">
          {notification.actor?.full_name?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {notificationIcons[(notification as any).notification_type || notification.type] || notificationIcons.follow}
          <p className="text-sm text-social-foreground">
            <span className="font-semibold">{notification.actor?.full_name || 'Alguien'}</span>
            {' '}
            <span className="text-social-muted-foreground">
              {notification.message || notificationMessages[(notification as any).notification_type || notification.type]}
            </span>
          </p>
        </div>
        <p className="text-xs text-social-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>

      {!notification.is_read && (
        <div className="h-2 w-2 rounded-full bg-social-accent shrink-0 mt-2" />
      )}
    </div>
  );
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useSocialNotifications();
  const [open, setOpen] = useState(false);

  const handleNavigate = (notification: SocialNotification) => {
    setOpen(false);
    
    const notificationType = (notification as any).notification_type || notification.type;
    
    // Navigate based on notification type
    if (notificationType === 'follow' && notification.actor_id) {
      navigate(`/profile/${notification.actor_id}`);
    } else if ((notification as any).entity_id || notification.content_id) {
      navigate(`/social`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-social-muted-foreground hover:text-social-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-red-500 text-white text-xs font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        align="end" 
        className="w-96 p-0 bg-social-card border-social-border"
      >
        <div className="flex items-center justify-between p-4 border-b border-social-border">
          <h3 className="font-semibold text-social-foreground">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-social-muted-foreground hover:text-social-foreground"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Marcar todo como leído
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-social-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-social-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-50" />
              <p>No tienes notificaciones</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                  onNavigate={() => handleNavigate(notification)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
