/**
 * UnifiedChatPanel - Panel de chat unificado multi-plataforma
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Send,
  MoreVertical,
  Ban,
  Trash2,
  Pin,
  Reply,
  MessageSquare,
  ShoppingBag,
  Gift,
  Users,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { PlatformIcon } from '../shared/PlatformIcon';
import type { StreamingChatMessage, StreamingPlatform } from '@/types/streaming.types';

interface UnifiedChatPanelProps {
  messages: StreamingChatMessage[];
  onSendMessage?: (content: string, platforms?: StreamingPlatform[]) => void;
  onDeleteMessage?: (messageId: string) => void;
  onBanUser?: (authorPlatformId: string, platform: StreamingPlatform) => void;
  onPinMessage?: (messageId: string) => void;
  isLoading?: boolean;
  platforms?: StreamingPlatform[];
  className?: string;
}

type PlatformFilter = 'all' | StreamingPlatform;
type MessageTypeFilter = 'all' | 'text' | 'purchase_notification' | 'donation';

export function UnifiedChatPanel({
  messages,
  onSendMessage,
  onDeleteMessage,
  onBanUser,
  onPinMessage,
  isLoading,
  platforms = [],
  className,
}: UnifiedChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [typeFilter, setTypeFilter] = useState<MessageTypeFilter>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Filter messages
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (platformFilter !== 'all' && msg.source_platform !== platformFilter) {
        return false;
      }
      if (typeFilter !== 'all' && msg.message_type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [messages, platformFilter, typeFilter]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages.length, autoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setAutoScroll(isAtBottom);
  };

  // Send message
  const handleSend = () => {
    if (!inputValue.trim() || !onSendMessage) return;
    onSendMessage(inputValue.trim(), platformFilter === 'all' ? platforms : [platformFilter]);
    setInputValue('');
  };

  // Get message type icon
  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'purchase_notification':
        return <ShoppingBag className="h-4 w-4 text-green-400" />;
      case 'donation':
        return <Gift className="h-4 w-4 text-yellow-400" />;
      default:
        return null;
    }
  };

  // Calculate platform stats
  const platformStats = useMemo(() => {
    const stats: Record<string, number> = {};
    messages.forEach((msg) => {
      stats[msg.source_platform] = (stats[msg.source_platform] || 0) + 1;
    });
    return stats;
  }, [messages]);

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle className="text-lg">Chat en Vivo</CardTitle>
            <Badge variant="secondary" className="text-xs">
              <Users className="mr-1 h-3 w-3" />
              {messages.length}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <Filter className="h-4 w-4" />
                Filtrar
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                Todos los mensajes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('text')}>
                Solo texto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('purchase_notification')}>
                <ShoppingBag className="mr-2 h-4 w-4 text-green-400" />
                Compras
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('donation')}>
                <Gift className="mr-2 h-4 w-4 text-yellow-400" />
                Donaciones
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Platform tabs */}
        {platforms.length > 1 && (
          <Tabs value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all" className="text-xs">
                Todos ({messages.length})
              </TabsTrigger>
              {platforms.map((platform) => (
                <TabsTrigger key={platform} value={platform} className="text-xs gap-1">
                  <PlatformIcon platform={platform} size="sm" />
                  {platformStats[platform] || 0}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        {/* Messages */}
        <ScrollArea
          ref={scrollRef}
          className="flex-1 px-4"
          onScroll={handleScroll}
        >
          <div className="space-y-3 py-4">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {messages.length === 0
                    ? 'No hay mensajes aún'
                    : 'No hay mensajes con este filtro'}
                </p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onDelete={onDeleteMessage}
                  onBan={onBanUser}
                  onPin={onPinMessage}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Scroll to bottom indicator */}
        {!autoScroll && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
            <Button
              variant="secondary"
              size="sm"
              className="shadow-lg"
              onClick={() => {
                setAutoScroll(true);
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
            >
              <ChevronDown className="mr-1 h-4 w-4" />
              Nuevos mensajes
            </Button>
          </div>
        )}

        {/* Input */}
        {onSendMessage && (
          <div className="border-t p-4 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="Escribe un mensaje..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={!inputValue.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {platformFilter !== 'all' && (
              <p className="text-xs text-muted-foreground mt-2">
                Enviando a: {platformFilter}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Individual chat message component
interface ChatMessageProps {
  message: StreamingChatMessage;
  onDelete?: (messageId: string) => void;
  onBan?: (authorPlatformId: string, platform: StreamingPlatform) => void;
  onPin?: (messageId: string) => void;
}

function ChatMessage({ message, onDelete, onBan, onPin }: ChatMessageProps) {
  const isPurchase = message.message_type === 'purchase_notification';
  const isDonation = message.message_type === 'donation';
  const isHighlighted = isPurchase || isDonation || message.is_pinned;

  return (
    <div
      className={cn(
        'group flex gap-3 rounded-sm p-2 transition-colors hover:bg-muted/50',
        isPurchase && 'bg-green-500/10 hover:bg-green-500/20',
        isDonation && 'bg-yellow-500/10 hover:bg-yellow-500/20',
        message.is_pinned && 'bg-blue-500/10 hover:bg-blue-500/20'
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={message.author_avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {message.author_name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{message.author_name}</span>
          <PlatformIcon platform={message.source_platform as StreamingPlatform} size="sm" />
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {message.is_pinned && (
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-xs">
              <Pin className="h-3 w-3" />
            </Badge>
          )}
        </div>

        <div className="flex items-start gap-2 mt-0.5">
          {(isPurchase || isDonation) && (
            <span className="shrink-0 mt-0.5">
              {isPurchase && <ShoppingBag className="h-4 w-4 text-green-400" />}
              {isDonation && <Gift className="h-4 w-4 text-yellow-400" />}
            </span>
          )}
          <p className="text-sm break-words">{message.content}</p>
        </div>

        {/* Purchase metadata */}
        {isPurchase && message.metadata && (
          <div className="mt-1 text-xs text-green-400">
            {(message.metadata as any).quantity}x • ${(message.metadata as any).amount?.toFixed(2)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onPin && (
              <DropdownMenuItem onClick={() => onPin(message.id)}>
                <Pin className="mr-2 h-4 w-4" />
                {message.is_pinned ? 'Desfijar' : 'Fijar'}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(message.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            )}
            {onBan && message.author_platform_id && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() =>
                  onBan(message.author_platform_id!, message.source_platform as StreamingPlatform)
                }
              >
                <Ban className="mr-2 h-4 w-4" />
                Banear usuario
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default UnifiedChatPanel;
