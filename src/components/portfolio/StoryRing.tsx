import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoryRingProps {
  avatarUrl?: string | null;
  name: string;
  hasStories: boolean;
  hasUnseenStories?: boolean;
  isOwn?: boolean;
  onClick: () => void;
  onAddClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function StoryRing({
  avatarUrl,
  name,
  hasStories,
  hasUnseenStories = false,
  isOwn = false,
  onClick,
  onAddClick,
  size = 'md',
}: StoryRingProps) {
  const sizeClasses = {
    sm: 'h-14 w-14',
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
  };

  const ringClasses = {
    sm: 'p-0.5',
    md: 'p-[2px]',
    lg: 'p-[3px]',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <button
          onClick={onClick}
          className={cn(
            'rounded-full',
            hasStories && hasUnseenStories && 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600',
            hasStories && !hasUnseenStories && 'bg-white/30',
            !hasStories && 'bg-transparent',
            ringClasses[size]
          )}
        >
          <Avatar className={cn(sizeClasses[size], 'ring-2 ring-black')}>
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-zinc-800 text-white">
              {name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        </button>

        {isOwn && onAddClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddClick();
            }}
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center border-2 border-black"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
      <span className="text-white/70 text-xs truncate max-w-16">
        {isOwn ? 'Tu historia' : name?.split(' ')[0]}
      </span>
    </div>
  );
}
