import { memo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Bot, Users, User, Circle } from 'lucide-react';
import { ChatConversation } from '@/hooks/useChat';
import { getPrimaryRole, getRoleLabelShort } from '@/lib/roles';

interface ChatListItemProps {
  conversation: ChatConversation;
  isActive: boolean;
  currentUserId?: string;
  onClick: () => void;
}

export const ChatListItem = memo(function ChatListItem({
  conversation,
  isActive,
  currentUserId,
  onClick
}: ChatListItemProps) {
  const isAI = conversation.chat_type === 'ai_assistant';
  const isGroup = conversation.is_group;
  
  const otherParticipant = conversation.participants?.find(p => p.user_id !== currentUserId);
  const participantName = isAI 
    ? conversation.name || 'Asistente IA' 
    : isGroup 
      ? conversation.name || 'Grupo' 
      : otherParticipant?.profile?.full_name || 'Chat';
  
  const avatarUrl = isAI || isGroup ? null : otherParticipant?.profile?.avatar_url;
  
  const getIcon = () => {
    if (isAI) return <Bot className="h-5 w-5" />;
    if (isGroup) return <Users className="h-5 w-5" />;
    return <User className="h-5 w-5" />;
  };

  const lastMessage = conversation.last_message;
  const unreadCount = conversation.unread_count || 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer transition-all duration-200",
        "hover:bg-accent/50",
        isActive && "bg-accent",
        isAI && "border-l-2 border-l-primary"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className={cn(
          "h-12 w-12 border-2",
          isAI ? "border-primary bg-primary/10" : "border-transparent"
        )}>
          <AvatarImage src={avatarUrl || ''} />
          <AvatarFallback className={cn(
            isAI && "bg-primary text-primary-foreground"
          )}>
            {getIcon()}
          </AvatarFallback>
        </Avatar>
        
        {/* Online indicator - not shown for AI */}
        {!isAI && !isGroup && (
          <Circle 
            className={cn(
              "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background",
              "fill-muted-foreground text-muted-foreground" // Default to offline, could be dynamic
            )} 
          />
        )}
        
        {/* AI always available indicator */}
        {isAI && (
          <Circle 
            className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background fill-green-500 text-green-500" 
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              "font-medium truncate",
              unreadCount > 0 && "font-semibold"
            )}>
              {participantName}
            </span>
            
            {/* Role badge for non-AI, non-group */}
            {!isAI && !isGroup && otherParticipant?.profile && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                {/* Would need to fetch roles - simplified for now */}
                Usuario
              </Badge>
            )}
            
            {/* AI badge */}
            {isAI && (
              <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-primary/20 text-primary border-0">
                🤖 IA
              </Badge>
            )}
          </div>
          
          {/* Time */}
          {lastMessage && (
            <span className="text-xs text-muted-foreground shrink-0">
              {format(new Date(lastMessage.created_at), 'HH:mm', { locale: es })}
            </span>
          )}
        </div>
        
        {/* Preview */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            "text-sm truncate",
            unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {lastMessage?.content || (isAI ? '¿En qué puedo ayudarte?' : 'Sin mensajes')}
          </p>
          
          {/* Unread badge */}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="h-5 min-w-[20px] px-1.5 shrink-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});
