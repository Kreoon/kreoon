import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  Paperclip,
  Image,
  FileText,
  AlertTriangle,
  ChevronLeft,
  MoreVertical,
  Archive,
  Phone,
  Video,
  Info,
  Loader2,
  Check,
  CheckCheck,
  Clock,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useMarketplaceConversations,
  useMarketplaceConversation,
  useContactDetection,
} from '@/hooks/useMarketplaceChat';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MarketplaceMessage, MarketplaceConversation } from '@/types/ai-matching';

export default function MarketplaceChatPage() {
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const creatorIdParam = searchParams.get('creator');

  const {
    conversations,
    isLoading: conversationsLoading,
    getOrCreateConversation,
    archiveConversation,
  } = useMarketplaceConversations();

  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(
    conversationId
  );

  const {
    conversation,
    messages,
    otherUser,
    isCompanyView,
    isLoading: chatLoading,
    sendMessage,
    markAsRead,
    isSending,
  } = useMarketplaceConversation(selectedConversationId);

  const { detectExternalContact } = useContactDetection();

  const [messageText, setMessageText] = useState('');
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violations, setViolations] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-create conversation if creator param
  useEffect(() => {
    const createConversation = async () => {
      if (creatorIdParam && !selectedConversationId) {
        try {
          const conv = await getOrCreateConversation(creatorIdParam, true);
          setSelectedConversationId(conv.id);
          navigate(`/marketplace/chat/${conv.id}`, { replace: true });
        } catch (error) {
          console.error('Error creating conversation:', error);
        }
      }
    };
    createConversation();
  }, [creatorIdParam, selectedConversationId, getOrCreateConversation, navigate]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when opening conversation
  useEffect(() => {
    if (selectedConversationId && conversation) {
      markAsRead();
    }
  }, [selectedConversationId, conversation, markAsRead]);

  // Check for external contact violations
  const handleMessageChange = (text: string) => {
    setMessageText(text);
    const detection = detectExternalContact(text);
    if (detection.hasViolation) {
      setViolations(detection.violations);
      setShowViolationWarning(true);
    } else {
      setShowViolationWarning(false);
      setViolations([]);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!messageText.trim() || isSending) return;

    // Warn but allow sending (backend will flag)
    if (showViolationWarning) {
      const confirm = window.confirm(
        'Tu mensaje contiene información de contacto externa. ¿Estás seguro de que quieres enviarlo? Será marcado para revisión.'
      );
      if (!confirm) return;
    }

    try {
      await sendMessage({ content: messageText });
      setMessageText('');
      setShowViolationWarning(false);
      setViolations([]);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (conv: MarketplaceConversation) => {
    setSelectedConversationId(conv.id);
    navigate(`/marketplace/chat/${conv.id}`);
  };

  // Get violation labels
  const getViolationLabel = (type: string): string => {
    const labels: Record<string, string> = {
      phone_number: 'número de teléfono',
      email: 'correo electrónico',
      instagram: 'usuario de Instagram',
      whatsapp: 'WhatsApp',
      external_url: 'enlace externo',
    };
    return labels[type] || type;
  };

  return (
    <div className="h-screen flex bg-social-background">
      {/* Conversations sidebar */}
      <div className={cn(
        "w-80 border-r border-social-border bg-social-card flex flex-col",
        selectedConversationId && "hidden md:flex"
      )}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-social-border">
          <h1 className="text-xl font-bold text-social-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-social-accent" />
            Mensajes
          </h1>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-social-accent" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-social-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tienes conversaciones aún</p>
              <p className="text-sm mt-1">
                Contacta a un creador para empezar
              </p>
            </div>
          ) : (
            <div className="divide-y divide-social-border">
              {conversations.map((conv) => {
                const other = conv.company_user_id === user?.id
                  ? conv.creator_user
                  : conv.company_user;
                const unreadCount = conv.company_user_id === user?.id
                  ? conv.company_unread_count
                  : conv.creator_unread_count;

                return (
                  <motion.button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      "w-full p-4 flex items-start gap-3 text-left transition-colors",
                      "hover:bg-social-muted/50",
                      selectedConversationId === conv.id && "bg-social-muted"
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={other?.avatar_url || undefined} />
                        <AvatarFallback>
                          {other?.full_name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-social-accent text-white text-xs flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "font-medium truncate",
                          unreadCount > 0 ? "text-social-foreground" : "text-social-foreground/80"
                        )}>
                          {other?.full_name}
                        </p>
                        <span className="text-xs text-social-muted-foreground">
                          {conv.last_message_at && formatDistanceToNow(
                            new Date(conv.last_message_at),
                            { addSuffix: false, locale: es }
                          )}
                        </span>
                      </div>
                      {conv.last_message_preview && (
                        <p className={cn(
                          "text-sm truncate mt-0.5",
                          unreadCount > 0
                            ? "text-social-foreground font-medium"
                            : "text-social-muted-foreground"
                        )}>
                          {conv.last_message_preview}
                        </p>
                      )}
                      {conv.proposal && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {conv.proposal.title}
                        </Badge>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      {selectedConversationId ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="p-4 border-b border-social-border bg-social-card flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => {
                setSelectedConversationId(undefined);
                navigate('/marketplace/chat');
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser?.avatar_url || undefined} />
              <AvatarFallback>
                {otherUser?.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-social-foreground truncate">
                {otherUser?.full_name}
              </p>
              {otherUser?.username && (
                <p className="text-sm text-social-muted-foreground">
                  @{otherUser.username}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/profile/${otherUser?.username || otherUser?.id}`)}
                    >
                      <Info className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver perfil</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-social-card border-social-border">
                  <DropdownMenuItem
                    onClick={() => {
                      archiveConversation(selectedConversationId);
                      setSelectedConversationId(undefined);
                      navigate('/marketplace/chat');
                    }}
                    className="text-social-foreground"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archivar conversación
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {chatLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-social-accent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="h-16 w-16 text-social-muted-foreground/30 mb-4" />
                <p className="text-social-muted-foreground">
                  Envía un mensaje para iniciar la conversación
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isOwn = message.sender_id === user?.id;
                  const showAvatar = index === 0 ||
                    messages[index - 1].sender_id !== message.sender_id;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-2",
                        isOwn && "flex-row-reverse"
                      )}
                    >
                      {showAvatar && !isOwn ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.sender?.avatar_url || undefined} />
                          <AvatarFallback>
                            {message.sender?.full_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8" />
                      )}

                      <div className={cn(
                        "max-w-[70%] space-y-1",
                        isOwn && "items-end"
                      )}>
                        <div className={cn(
                          "px-4 py-2 rounded-2xl",
                          isOwn
                            ? "bg-social-accent text-white rounded-br-md"
                            : "bg-social-muted text-social-foreground rounded-bl-md",
                          message.flagged_external_contact && "border-2 border-yellow-500"
                        )}>
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>

                          {message.flagged_external_contact && (
                            <div className={cn(
                              "flex items-center gap-1 mt-2 pt-2 border-t text-xs",
                              isOwn ? "border-white/20 text-white/70" : "border-social-border text-yellow-600"
                            )}>
                              <AlertTriangle className="h-3 w-3" />
                              Mensaje marcado
                            </div>
                          )}
                        </div>

                        <div className={cn(
                          "flex items-center gap-1 text-xs text-social-muted-foreground",
                          isOwn && "justify-end"
                        )}>
                          <span>
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                          {isOwn && (
                            message.is_read ? (
                              <CheckCheck className="h-3 w-3 text-social-accent" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Violation warning */}
          <AnimatePresence>
            {showViolationWarning && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mx-4 mb-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      Información de contacto detectada
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                      Tu mensaje contiene: {violations.map(getViolationLabel).join(', ')}.
                      Para proteger a ambas partes, toda comunicación debe realizarse dentro de Kreoon.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowViolationWarning(false)}
                    className="text-yellow-500 hover:text-yellow-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message input */}
          <div className="p-4 border-t border-social-border bg-social-card">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                placeholder="Escribe un mensaje..."
                value={messageText}
                onChange={(e) => handleMessageChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className={cn(
                  "flex-1 bg-social-muted border-social-border",
                  showViolationWarning && "border-yellow-500 focus-visible:ring-yellow-500"
                )}
              />
              <Button
                onClick={handleSend}
                disabled={!messageText.trim() || isSending}
                className="gap-2"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-social-muted-foreground mt-2 text-center">
              Toda comunicación debe realizarse dentro de Kreoon. No compartas información de contacto externa.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-social-background">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 text-social-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-social-foreground mb-2">
              Tus mensajes
            </h2>
            <p className="text-social-muted-foreground">
              Selecciona una conversación para ver los mensajes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
