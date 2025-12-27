import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { AVAILABLE_REACTIONS, type ReactionSummary } from '@/hooks/useMessageReactions';

interface MessageReactionsProps {
  reactions: ReactionSummary[];
  onToggleReaction: (reaction: string) => void;
  isOwnMessage?: boolean;
}

export function MessageReactions({
  reactions,
  onToggleReaction,
  isOwnMessage = false
}: MessageReactionsProps) {
  const [open, setOpen] = useState(false);

  const handleReactionClick = (reaction: string) => {
    onToggleReaction(reaction);
    setOpen(false);
  };

  return (
    <div className={cn(
      'flex items-center gap-1 flex-wrap',
      isOwnMessage ? 'justify-end' : 'justify-start'
    )}>
      {/* Existing reactions */}
      {reactions.map(({ reaction, count, hasReacted }) => (
        <button
          key={reaction}
          onClick={() => onToggleReaction(reaction)}
          className={cn(
            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors',
            hasReacted 
              ? 'bg-primary/20 text-primary border border-primary/30' 
              : 'bg-muted hover:bg-muted/80 border border-transparent'
          )}
        >
          <span>{reaction}</span>
          <span className="font-medium">{count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <SmilePlus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side={isOwnMessage ? 'left' : 'right'} 
          className="w-auto p-2"
          align="start"
        >
          <div className="flex gap-1">
            {AVAILABLE_REACTIONS.map(reaction => (
              <button
                key={reaction}
                onClick={() => handleReactionClick(reaction)}
                className="p-1.5 hover:bg-muted rounded transition-colors text-lg"
              >
                {reaction}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
