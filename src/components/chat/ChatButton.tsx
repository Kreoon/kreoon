import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
  isOpen?: boolean;
}

export function ChatButton({ onClick, unreadCount = 0, isOpen }: ChatButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className={cn(
        "relative h-10 w-10 rounded-full",
        isOpen && "bg-primary text-primary-foreground"
      )}
    >
      <MessageCircle className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
