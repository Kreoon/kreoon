import { useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Loader2, 
  Check, 
  CheckCheck, 
  Bot, 
  Users, 
  User,
  MoreVertical,
  UserPlus,
  BellOff,
  Flag,
  Settings,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  Circle,
  ChevronLeft
} from 'lucide-react';
import { ChatConversation, ChatMessage } from '@/hooks/useChat';
import { AIMessage } from '@/hooks/useAIChat';

interface ChatConversationViewProps {
  conversation: ChatConversation;
  messages: ChatMessage[];
  aiMessages: AIMessage[];
  currentUserId?: string;
  isAIConversation: boolean;
  isLoading: boolean;
  typingUsers: { user_id: string; full_name: string }[];
  assistantConfig?: { name: string; isEnabled: boolean } | null;
  onSendMessage: (content: string) => void;
  onSubmitFeedback?: (messageId: string, rating: 'helpful' | 'not_helpful') => void;
  onBack?: () => void;
  onFileSelect?: (file: File) => void;
  uploading?: boolean;
  showBackButton?: boolean;
  isAdmin?: boolean;
}

export function ChatConversationView({
  conversation,
  messages,
  aiMessages,
  currentUserId,
  isAIConversation,
  isLoading,
  typingUsers,
  assistantConfig,
  onSendMessage,
  onSubmitFeedback,
  onBack,
  onFileSelect,
  uploading,
  showBackButton = false,
  isAdmin = false
}: ChatConversationViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiMessages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim());
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConversationName = () => {
    if (isAIConversation) return conversation.name || assistantConfig?.name || 'Asistente IA';
    if (conversation.is_group) return conversation.name || 'Grupo';
    const otherParticipant = conversation.participants?.find(p => p.user_id !== currentUserId);
    return otherParticipant?.profile?.full_name || 'Chat';
  };

  const getConversationAvatar = () => {
    if (isAIConversation || conversation.is_group) return null;
    const otherParticipant = conversation.participants?.find(p => p.user_id !== currentUserId);
    return otherParticipant?.profile?.avatar_url;
  };

  const getIcon = () => {
    if (isAIConversation) return <Bot className="h-5 w-5" />;
    if (conversation.is_group) return <Users className="h-5 w-5" />;
    return <User className="h-5 w-5" />;
  };

  const renderMessageStatus = (msg: ChatMessage) => {
    if (msg.sender_id !== currentUserId) return null;
    if (msg.read_at) return <CheckCheck className="h-3 w-3 text-blue-500" />;
    if (msg.delivered_at) return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    return <Check className="h-3 w-3 text-muted-foreground" />;
  };

  const displayMessages = isAIConversation ? aiMessages : messages;
  const showEmptyState = displayMessages.length === 0 && !isLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-card shrink-0">
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="shrink-0 md:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        
        <Avatar className={cn(
          "h-10 w-10 shrink-0",
          isAIConversation && "border-2 border-primary"
        )}>
          <AvatarImage src={getConversationAvatar() || ''} />
          <AvatarFallback className={cn(
            isAIConversation && "bg-primary text-primary-foreground"
          )}>
            {getIcon()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{getConversationName()}</span>
            {isAIConversation && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                🤖 IA
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Circle className={cn(
              "h-2 w-2 fill-current",
              isAIConversation ? "text-green-500" : "text-muted-foreground"
            )} />
            <span>{isAIConversation ? 'Siempre disponible' : 'En línea'}</span>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation.is_group && (
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4 mr-2" />
                Ver miembros
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <BellOff className="h-4 w-4 mr-2" />
              Silenciar
            </DropdownMenuItem>
            {isAdmin && !isAIConversation && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Ver reglas
                </DropdownMenuItem>
              </>
            )}
            {isAIConversation && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Flag className="h-4 w-4 mr-2" />
                  Reportar problema
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            {isAIConversation ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{assistantConfig?.name || 'Asistente IA'}</h3>
                <p className="text-muted-foreground text-sm mt-1">¿En qué puedo ayudarte hoy?</p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">No hay mensajes aún</p>
                <p className="text-sm text-muted-foreground mt-1">Envía el primer mensaje</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {isAIConversation ? (
              // AI Messages
              aiMessages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2',
                    msg.role === 'user' && 'flex-row-reverse'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 shrink-0 border-2 border-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2',
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-br-md' 
                      : 'bg-muted rounded-bl-md'
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className={cn(
                      'flex items-center gap-2 mt-1',
                      msg.role === 'user' ? 'justify-end' : 'justify-between'
                    )}>
                      <span className={cn(
                        'text-[10px]',
                        msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
                        {format(msg.timestamp, 'HH:mm', { locale: es })}
                      </span>
                      {msg.role === 'assistant' && !msg.feedback && onSubmitFeedback && (
                        <div className="flex gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-green-500/10"
                            onClick={() => onSubmitFeedback(msg.id, 'helpful')}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-red-500/10"
                            onClick={() => onSubmitFeedback(msg.id, 'not_helpful')}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {msg.feedback && (
                        <span className="text-[10px] text-muted-foreground">
                          {msg.feedback === 'helpful' ? '👍' : '👎'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Regular Messages
              messages.map(msg => {
                const isOwn = msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-2',
                      isOwn && 'flex-row-reverse'
                    )}
                  >
                    {!isOwn && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={msg.sender?.avatar_url || ''} />
                        <AvatarFallback>
                          {msg.sender?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2',
                      isOwn 
                        ? 'bg-primary text-primary-foreground rounded-br-md' 
                        : 'bg-muted rounded-bl-md'
                    )}>
                      {!isOwn && conversation.is_group && (
                        <p className="text-xs font-medium mb-1 opacity-80">
                          {msg.sender?.full_name}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      
                      {/* Attachment preview */}
                      {msg.attachment_url && msg.attachment_type === 'image' && (
                        <img 
                          src={msg.attachment_url} 
                          alt="Imagen" 
                          className="max-w-full rounded-lg mt-2 cursor-pointer"
                          onClick={() => window.open(msg.attachment_url!, '_blank')}
                        />
                      )}
                      
                      <div className={cn(
                        'flex items-center gap-1 mt-1',
                        isOwn ? 'justify-end' : 'justify-start'
                      )}>
                        <span className={cn(
                          'text-[10px]',
                          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                        </span>
                        {renderMessageStatus(msg)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Typing indicator */}
      {typingUsers.length > 0 && !isAIConversation && (
        <div className="px-4 py-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            {typingUsers.map(u => u.full_name).join(', ')} escribiendo...
          </span>
        </div>
      )}

      {/* AI thinking indicator */}
      {isLoading && isAIConversation && (
        <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary animate-pulse" />
          <span>IA está pensando...</span>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-card shrink-0">
        <div className="flex items-end gap-2">
          {!isAIConversation && onFileSelect && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-10 w-10 rounded-full shrink-0"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
            </>
          )}
          
          <div className="flex-1">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAIConversation ? 'Pregúntale al asistente...' : 'Escribe un mensaje...'}
              className="rounded-full bg-muted border-0"
              disabled={isLoading && isAIConversation}
            />
          </div>
          
          <Button 
            size="icon" 
            onClick={handleSend} 
            disabled={!newMessage.trim() || (isAIConversation && isLoading)}
            className="h-10 w-10 rounded-full shrink-0"
          >
            {isLoading && isAIConversation ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
