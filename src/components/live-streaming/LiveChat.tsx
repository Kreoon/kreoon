/**
 * LiveChat - Chat en tiempo real para streams en vivo
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import type { LiveStreamComment } from '@/types/live-streaming.types';

interface LiveChatProps {
  comments: LiveStreamComment[];
  onSendComment: (message: string) => Promise<void>;
  isSending?: boolean;
  isDisabled?: boolean;
  className?: string;
  maxHeight?: string;
}

export function LiveChat({
  comments,
  onSendComment,
  isSending = false,
  isDisabled = false,
  className,
  maxHeight = '400px',
}: LiveChatProps) {
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al nuevo mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending || isDisabled) return;

    const text = message.trim();
    setMessage('');
    await onSendComment(text);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn('flex flex-col bg-background border rounded-sm', className)}>
      {/* Chat messages */}
      <ScrollArea
        ref={scrollRef}
        className="flex-1 p-3"
        style={{ maxHeight }}
      >
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Sé el primero en comentar
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={comment.user_avatar} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(comment.user_name || 'A')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium text-primary">
                      {comment.user_name || 'Anónimo'}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {comment.message}
                    </span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isDisabled ? 'Inicia sesión para comentar' : 'Escribe un mensaje...'}
            disabled={isDisabled || isSending}
            maxLength={200}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isSending || isDisabled}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * LiveChatOverlay - Chat superpuesto sobre el video
 */
interface LiveChatOverlayProps {
  comments: LiveStreamComment[];
  maxMessages?: number;
}

export function LiveChatOverlay({ comments, maxMessages = 5 }: LiveChatOverlayProps) {
  const recentComments = comments.slice(-maxMessages);

  return (
    <div className="absolute bottom-20 left-4 right-4 space-y-2 pointer-events-none">
      {recentComments.map((comment, index) => (
        <div
          key={comment.id}
          className="bg-black/50 backdrop-blur-sm rounded-sm px-3 py-1.5 animate-in slide-in-from-bottom-2"
          style={{
            opacity: 0.5 + (index / maxMessages) * 0.5,
          }}
        >
          <p className="text-sm text-white">
            <span className="font-medium">{comment.user_name || 'Anónimo'}</span>
            <span className="ml-2 text-white/80">{comment.message}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
