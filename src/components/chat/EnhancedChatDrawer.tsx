import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat, ChatConversation, ChatUser } from '@/hooks/useChat';
import { useChatTyping } from '@/hooks/useChatTyping';
import { useChatAttachments } from '@/hooks/useChatAttachments';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useAIChat } from '@/hooks/useAIChat';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  X, 
  Plus, 
  Search,
  Users,
  MessageCircle,
  Loader2,
  Check,
  Bell
} from 'lucide-react';
import { ChatListItem } from './ChatListItem';
import { ChatConversationView } from './ChatConversationView';
import { PresenceIndicator } from './PresenceIndicator';
import { getPrimaryRole, getRoleLabelShort } from '@/lib/roles';

interface EnhancedChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onActiveConversationChange?: (conversationId: string | null) => void;
}

export function EnhancedChatDrawer({ 
  isOpen, 
  onClose, 
  onActiveConversationChange 
}: EnhancedChatDrawerProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
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
    isAdmin,
    userRole
  } = useChat();

  const { 
    messages: aiMessages, 
    isLoading: aiLoading, 
    assistantConfig,
    sendMessage: sendAIMessage,
    loadHistory: loadAIHistory,
    submitFeedback: submitAIFeedback
  } = useAIChat();

  const { typingUsers, handleTyping, stopTyping } = useChatTyping(activeConversation?.id || null);
  const { uploadAttachment, uploading, formatFileSize } = useChatAttachments();
  const { requestPermission, unreadCount } = useChatNotifications(!!activeConversation?.id);

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);
  const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  const isAIConversation = activeConversation?.chat_type === 'ai_assistant';

  // Notify parent when active conversation changes
  useEffect(() => {
    onActiveConversationChange?.(activeConversation?.id || null);
  }, [activeConversation?.id, onActiveConversationChange]);

  // Load AI history when entering AI conversation
  useEffect(() => {
    if (isAIConversation) {
      loadAIHistory();
    }
  }, [isAIConversation, loadAIHistory]);

  // On desktop, reset to list when drawer opens
  useEffect(() => {
    if (isOpen && !isMobile) {
      // Keep the view as is on desktop (split view)
    }
  }, [isOpen, isMobile]);

  const handleSelectConversation = (conv: ChatConversation) => {
    setActiveConversation(conv);
    if (isMobile) {
      setView('chat');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    if (isAIConversation) {
      await sendAIMessage(content.trim());
      return;
    }
    
    stopTyping();
    await sendMessage(content.trim());
  };

  const handleFileSelect = async (file: File) => {
    if (!activeConversation) return;
    const attachment = await uploadAttachment(file, activeConversation.id);
    if (attachment) {
      await sendMessage(`📎 ${attachment.name}`, attachment);
    }
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

  const handleBack = () => {
    setView('list');
    setActiveConversation(null);
  };

  const filteredUsers = availableUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort conversations: AI first, then by last message
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.chat_type === 'ai_assistant') return -1;
    if (b.chat_type === 'ai_assistant') return 1;
    return 0;
  });

  const getRoleBadge = useCallback((roles: string[]) => {
    const primary = getPrimaryRole(roles as any);
    return primary ? getRoleLabelShort(primary) : null;
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              "fixed z-50 flex flex-col bg-background shadow-2xl border-l border-border",
              "right-0 top-0 h-screen",
              isMobile ? "w-full" : "w-[600px] max-w-[90vw]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Chat</h2>
                {conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0) > 0 && (
                  <Badge variant="destructive" className="h-5">
                    {conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setView('new')}
                  className="h-9 w-9"
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="h-9 w-9"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content - Split or Single View */}
            <div className="flex-1 flex overflow-hidden">
              {/* List Panel - Always visible on desktop, conditional on mobile */}
              {(view === 'list' || view === 'new' || !isMobile) && (
                <div className={cn(
                  "flex flex-col border-r",
                  isMobile ? "w-full" : "w-[280px] shrink-0",
                  (!isMobile && activeConversation) && "border-r"
                )}>
                  {view === 'new' ? (
                    // New Conversation View
                    <div className="flex flex-col h-full">
                      <div className="p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          {isMobile && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setView('list')}
                            >
                              ← Atrás
                            </Button>
                          )}
                          <h3 className="font-medium">Nueva conversación</h3>
                        </div>
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
                              size="sm"
                            >
                              Crear grupo ({selectedUsers.length})
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <Separator />
                      
                      <ScrollArea className="flex-1">
                        {filteredUsers.length === 0 ? (
                          <div className="p-6 text-center text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay usuarios disponibles</p>
                          </div>
                        ) : (
                          <div className="divide-y">
                            {filteredUsers.map(chatUser => (
                              <div
                                key={chatUser.id}
                                onClick={() => {
                                  if (!chatUser.can_chat) return;
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
                                  'p-3 flex items-center gap-3 transition-colors',
                                  chatUser.can_chat 
                                    ? 'hover:bg-accent cursor-pointer' 
                                    : 'opacity-50 cursor-not-allowed',
                                  selectedUsers.includes(chatUser.id) && 'bg-primary/10'
                                )}
                              >
                                <div className="relative">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={chatUser.avatar_url || ''} />
                                    <AvatarFallback>{chatUser.full_name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="absolute -bottom-0.5 -right-0.5">
                                    <PresenceIndicator isOnline={chatUser.is_online || false} size="md" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">{chatUser.full_name}</span>
                                    {getRoleBadge(chatUser.roles) && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                                        {getRoleBadge(chatUser.roles)}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {chatUser.is_online ? 'En línea' : 'Desconectado'}
                                  </p>
                                </div>
                                {selectedUsers.includes(chatUser.id) && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  ) : (
                    // Conversations List
                    <ScrollArea className="flex-1">
                      {loading ? (
                        <div className="flex items-center justify-center h-32">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No tienes conversaciones</p>
                          <Button 
                            variant="outline" 
                            className="mt-4" 
                            onClick={() => setView('new')}
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Iniciar chat
                          </Button>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {sortedConversations.map(conv => (
                            <ChatListItem
                              key={conv.id}
                              conversation={conv}
                              isActive={activeConversation?.id === conv.id}
                              currentUserId={user?.id}
                              onClick={() => handleSelectConversation(conv)}
                            />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  )}
                </div>
              )}

              {/* Conversation Panel */}
              {(view === 'chat' || (!isMobile && activeConversation)) && activeConversation && (
                <div className={cn(
                  "flex-1",
                  isMobile ? "w-full" : ""
                )}>
                  <ChatConversationView
                    conversation={activeConversation}
                    messages={messages}
                    aiMessages={aiMessages}
                    currentUserId={user?.id}
                    isAIConversation={isAIConversation}
                    isLoading={isAIConversation ? aiLoading : loadingMessages}
                    typingUsers={typingUsers}
                    assistantConfig={assistantConfig}
                    onSendMessage={handleSendMessage}
                    onSubmitFeedback={submitAIFeedback}
                    onBack={handleBack}
                    onFileSelect={handleFileSelect}
                    uploading={uploading}
                    showBackButton={isMobile}
                    isAdmin={isAdmin}
                  />
                </div>
              )}

              {/* Empty State for Desktop when no conversation selected */}
              {!isMobile && !activeConversation && view === 'list' && (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Selecciona una conversación</p>
                  <p className="text-sm">O inicia una nueva</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
