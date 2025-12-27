import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoryUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  has_stories: boolean;
}

interface StoriesBarProps {
  followingIds: string[];
}

export default function StoriesBar({ followingIds }: StoriesBarProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<StoryUser[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchStories = async () => {
      // Get users with active stories
      const { data: stories } = await supabase
        .from('portfolio_stories')
        .select('user_id')
        .gt('expires_at', new Date().toISOString());

      const userIds = [...new Set(stories?.map(s => s.user_id) || [])];
      
      if (userIds.length === 0) {
        setUsers([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      setUsers((profiles || []).map(p => ({
        ...p,
        has_stories: true,
      })));
    };

    fetchStories();
  }, [user?.id, followingIds]);

  return (
    <div className="border-b border-border bg-background">
      <ScrollArea className="w-full">
        <div className="flex gap-4 p-4">
          {/* Add story button */}
          <div className="flex flex-col items-center gap-1 cursor-pointer">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Tu historia</span>
          </div>

          {/* Story avatars */}
          {users.map(u => (
            <div key={u.id} className="flex flex-col items-center gap-1 cursor-pointer">
              <div className={cn(
                "h-16 w-16 rounded-full p-0.5",
                u.has_stories && "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500"
              )}>
                <Avatar className="h-full w-full border-2 border-background">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback>{u.full_name?.[0]}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs truncate max-w-16">{u.full_name?.split(' ')[0]}</span>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
