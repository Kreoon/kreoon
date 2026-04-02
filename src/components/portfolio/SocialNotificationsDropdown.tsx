import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageCircle, UserPlus, Check, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSocialNotifications, SocialNotification } from '@/hooks/useSocialNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const notificationIcons = {
  follow: UserPlus,
  like: Heart,
  comment: MessageCircle,
  mention: MessageCircle,
  share: Share2,
};

const notificationColors = {
  follow: 'text-blue-500',
  like: 'text-red-500',
  comment: 'text-green-500',
  mention: 'text-purple-500',
  share: 'text-orange-500',
};

const notificationMessages = {
  follow: 'te siguió',
  like: 'le gustó tu publicación',
  comment: 'comentó en tu publicación',
  mention: 'te mencionó',
  share: 'compartió tu publicación',
};

export function SocialNotificationsDropdown() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useSocialNotifications();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (notification: SocialNotification) => {
    markAsRead(notification.id);

    if (notification.type === 'follow') {
      navigate(`/profile/${notification.actor_id}`);
    } else if (notification.content_id) {
      navigate(`/marketplace#post-${notification.content_id}`);
    }

    setOpen(false);
  };

  const renderNotification = (notification: SocialNotification) => {
    const Icon = notificationIcons[notification.type];
    const colorClass = notificationColors[notification.type];
    const message = notificationMessages[notification.type];

    return (
      <div
        key={notification.id}
        className={cn(
          "flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors rounded-sm",
          !notification.is_read && "bg-primary/5"
        )}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={notification.actor?.avatar_url || undefined} />
            <AvatarFallback>
              {notification.actor?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute -bottom-1 -right-1 p-1 rounded-full bg-background",
            colorClass
          )}>
            <Icon className="h-3 w-3" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-medium">{notification.actor?.full_name}</span>{' '}
            <span className="text-muted-foreground">{message}</span>
          </p>
          {notification.message && notification.type === 'comment' && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              "{notification.message}"
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: es
            })}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            deleteNotification(notification.id);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <h4 className="font-semibold">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllAsRead()}
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todo
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">
                No tienes notificaciones
              </p>
            </div>
          ) : (
            <div className="p-1">
              {notifications.map(renderNotification)}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
