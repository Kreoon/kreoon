import { useState, useRef, useEffect } from 'react';
import { useChat, ChatConversation, ChatUser } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  MessageCircle, 
  Send, 
  X, 
  ChevronLeft, 
  Plus, 
  Search,
  Users,
  User,
  Circle,
  Loader2,
  Trash2,
  Check,
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onActiveConversationChange?: (conversationId: string | null) => void;
}

export function ChatPanel({ isOpen, onClose, onActiveConversationChange }: ChatPanelProps) {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    availableUsers,
    loading,
    loadingMessages,
    sendMessage,
    startConversation,
    deleteConversation,
    isAdmin
  } = useChat();

  // Notify parent when active conversation changes
  useEffect(() => {
    onActiveConversationChange?.(activeConversation?.id || null);
  }, [activeConversation?.id, onActiveConversationChange]);

  const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    await sendMessage(newMessage.trim());
    setNewMessage('');
  };

  const handleStartConversation = async (userId: string) => {
    const conv = await startConversation([userId]);
    if (conv) {
      setActiveConversation(conv as ChatConversation);
      setView('chat');
    }
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length < 1 || !groupName.trim()) return;
    const conv = await startConversation(selectedUsers, groupName.trim(), true);
    if (conv) {
      setActiveConversation(conv as ChatConversation);
      setSelectedUsers([]);
      setGroupName('');
      setView('chat');
    }
  };

  const getConversationName = (conv: ChatConversation) => {
    if (conv.is_group) return conv.name || 'Grupo';
    const otherParticipant = conv.participants?.find(p => p.user_id !== user?.id);
    return otherParticipant?.profile?.full_name || 'Chat';
  };

  const getConversationAvatar = (conv: ChatConversation) => {
    if (conv.is_group) return null;
    const otherParticipant = conv.participants?.find(p => p.user_id !== user?.id);
    return otherParticipant?.profile?.avatar_url;
  };

  const filteredUsers = availableUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes('admin')) return 'Admin';
    if (roles.includes('strategist')) return 'Estratega';
    if (roles.includes('editor')) return 'Editor';
    if (roles.includes('creator')) return 'Creador';
    if (roles.includes('client')) return 'Cliente';
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-80 md:w-96 bg-card border-l border-border shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {view !== 'list' && (
            <Button variant="ghost" size="icon" onClick={() => {
              setView('list');
              setActiveConversation(null);
            }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">
            {view === 'list' && 'Mensajes'}
            {view === 'chat' && getConversationName(activeConversation!)}
            {view === 'new' && 'Nueva conversación'}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {view === 'list' && (
            <Button variant="ghost" size="icon" onClick={() => setView('new')}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {view === 'chat' && isAdmin && activeConversation && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará permanentemente la conversación y todos sus mensajes. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await deleteConversation(activeConversation.id);
                      setView('list');
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Conversations List */}
        {view === 'list' && (
          <ScrollArea className="h-full">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No tienes conversaciones</p>
                <Button variant="outline" className="mt-4" onClick={() => setView('new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Iniciar chat
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex-1 flex items-center gap-3"
                        onClick={() => {
                          setActiveConversation(conv);
                          setView('chat');
                        }}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getConversationAvatar(conv) || ''} />
                          <AvatarFallback>
                            {conv.is_group ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{getConversationName(conv)}</p>
                            {conv.last_message && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(conv.last_message.created_at), 'HH:mm', { locale: es })}
                              </span>
                            )}
                          </div>
                          {conv.last_message && (
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.last_message.content}
                            </p>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente la conversación y todos sus mensajes.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteConversation(conv.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {/* Chat View */}
        {view === 'chat' && activeConversation && (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No hay mensajes aún</p>
                  <p className="text-sm">Envía el primer mensaje</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map(msg => {
                    const isOwn = msg.sender_id === user?.id;
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
                          'max-w-[70%] rounded-lg px-3 py-2',
                          isOwn 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        )}>
                          {!isOwn && (
                            <p className="text-xs font-medium mb-1">{msg.sender?.full_name}</p>
                          )}
                          <p className="text-sm">{msg.content}</p>
                          <div className={cn(
                            'flex items-center gap-1 mt-1',
                            isOwn ? 'justify-end' : 'justify-start'
                          )}>
                            <span className={cn(
                              'text-xs',
                              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            )}>
                              {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                            </span>
                            {isOwn && (
                              <span className={cn(
                                'flex items-center',
                                msg.read_at ? 'text-blue-400' : 'text-primary-foreground/50'
                              )}>
                                {msg.read_at ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                />
                <Button size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* New Conversation View */}
        {view === 'new' && (
          <div className="flex flex-col h-full">
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar usuarios..."
                  className="pl-10"
                />
              </div>

              {selectedUsers.length > 1 && (
                <div className="space-y-2">
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Nombre del grupo..."
                  />
                  <Button 
                    className="w-full" 
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim()}
                  >
                    Crear grupo ({selectedUsers.length} participantes)
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            <ScrollArea className="flex-1">
              <div className="divide-y divide-border">
                {filteredUsers.map(chatUser => (
                  <div
                    key={chatUser.id}
                    onClick={() => {
                      if (selectedUsers.length === 0) {
                        handleStartConversation(chatUser.id);
                      } else {
                        setSelectedUsers(prev => 
                          prev.includes(chatUser.id) 
                            ? prev.filter(id => id !== chatUser.id)
                            : [...prev, chatUser.id]
                        );
                      }
                    }}
                    className={cn(
                      'p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                      selectedUsers.includes(chatUser.id) && 'bg-primary/10'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={chatUser.avatar_url || ''} />
                          <AvatarFallback>{chatUser.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {chatUser.is_online && (
                          <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-success text-success" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{chatUser.full_name}</p>
                          {getRoleBadge(chatUser.roles) && (
                            <Badge variant="secondary" className="text-xs">
                              {getRoleBadge(chatUser.roles)}
                            </Badge>
                          )}
                        </div>
                        {chatUser.is_online && chatUser.current_page && (
                          <p className="text-xs text-muted-foreground">
                            En: {chatUser.current_page}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {selectedUsers.length === 0 && (
              <div className="p-4 border-t text-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedUsers(['placeholder'])}
                  className="text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Seleccionar múltiples para grupo
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
