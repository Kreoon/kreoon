import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StoryViewer } from '@/components/portfolio/StoryViewer';
import { useStoryViews } from '@/hooks/useStoryViews';
import { usePortfolioAnalytics } from '@/analytics';

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  music_url?: string | null;
  music_name?: string | null;
  mute_video_audio?: boolean;
  music_volume?: number;
  video_volume?: number;
}

interface StoryUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  stories: Story[];
}

interface StoriesBarProps {
  followingIds: string[];
  onAddStory?: () => void;
}

export default function StoriesBar({ followingIds, onAddStory }: StoriesBarProps) {
  const { user } = useAuth();
  const { markStoryAsViewed, hasUnseenStories } = useStoryViews();
  const { trackStoryViewed } = usePortfolioAnalytics();
  const [users, setUsers] = useState<StoryUser[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [selectedUser, setSelectedUser] = useState<StoryUser | null>(null);
  const [showOwnStories, setShowOwnStories] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchStories = async () => {
      // Get all active stories (not expired)
      const { data: stories } = await supabase
        .from('portfolio_stories')
        .select('id, user_id, media_url, media_type, created_at, music_url, music_name, mute_video_audio, music_volume, video_volume')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (!stories || stories.length === 0) {
        setUsers([]);
        setMyStories([]);
        return;
      }

      // Group stories by user
      const userStoriesMap = new Map<string, Story[]>();
      stories.forEach(s => {
        const existing = userStoriesMap.get(s.user_id) || [];
        existing.push({
          id: s.id,
          media_url: s.media_url,
          media_type: s.media_type,
          created_at: s.created_at,
          music_url: s.music_url,
          music_name: s.music_name,
          mute_video_audio: s.mute_video_audio ?? false,
          music_volume: s.music_volume ?? 0.5,
          video_volume: s.video_volume ?? 1,
        });
        userStoriesMap.set(s.user_id, existing);
      });

      // Get my stories
      const myStoriesData = userStoriesMap.get(user.id) || [];
      setMyStories(myStoriesData);

      // Get other users' IDs (exclude self)
      const otherUserIds = [...userStoriesMap.keys()].filter(id => id !== user.id);

      if (otherUserIds.length === 0) {
        setUsers([]);
        return;
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', otherUserIds);

      // Build users array, prioritizing following users
      const usersWithStories: StoryUser[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name || 'Usuario',
        avatar_url: p.avatar_url || undefined,
        stories: userStoriesMap.get(p.id) || [],
      }));

      // Sort: following first, then by recency of latest story
      usersWithStories.sort((a, b) => {
        const aFollowing = followingIds.includes(a.id) ? 1 : 0;
        const bFollowing = followingIds.includes(b.id) ? 1 : 0;
        if (aFollowing !== bFollowing) return bFollowing - aFollowing;
        
        const aLatest = Math.max(...a.stories.map(s => new Date(s.created_at).getTime()));
        const bLatest = Math.max(...b.stories.map(s => new Date(s.created_at).getTime()));
        return bLatest - aLatest;
      });

      setUsers(usersWithStories);
    };

    fetchStories();
  }, [user?.id, followingIds]);

  const handleUserClick = (storyUser: StoryUser) => {
    setSelectedUser(storyUser);
  };

  const handleOwnStoriesClick = () => {
    if (myStories.length > 0) {
      setShowOwnStories(true);
    }
  };

  const handleStoryViewed = (storyId: string) => {
    markStoryAsViewed(storyId);
    trackStoryViewed(storyId, 'stories_bar');
  };

  return (
    <>
      <div className="border-b border-border bg-background">
        <ScrollArea className="w-full">
          <div className="flex gap-4 p-4">
            {/* My story / Add story button */}
            <div className="flex flex-col items-center gap-1">
              {myStories.length > 0 ? (
                <button
                  onClick={handleOwnStoriesClick}
                  className={cn(
                    "h-16 w-16 rounded-full p-0.5 relative",
                    hasUnseenStories(myStories.map(s => s.id)) 
                      ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                      : "bg-white/30"
                  )}
                >
                  <Avatar className="h-full w-full ring-2 ring-background">
                    <AvatarImage src={user?.user_metadata?.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-zinc-800 text-white">
                      {user?.email?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {onAddStory && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddStory();
                      }}
                      className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </button>
              ) : (
                <button
                  onClick={onAddStory}
                  className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center hover:border-primary/50 transition-colors"
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </button>
              )}
              <span className="text-xs text-muted-foreground">Tu historia</span>
            </div>

            {/* Other users' stories */}
            {users.map(u => {
              const unseenStories = hasUnseenStories(u.stories.map(s => s.id));
              return (
                <button
                  key={u.id}
                  onClick={() => handleUserClick(u)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={cn(
                    "h-16 w-16 rounded-full p-0.5 transition-all",
                    unseenStories 
                      ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                      : "bg-white/30"
                  )}>
                    <Avatar className="h-full w-full ring-2 ring-background">
                      <AvatarImage src={u.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-zinc-800 text-white">
                        {u.full_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-xs truncate max-w-16 text-foreground/70">
                    {u.full_name?.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Story Viewer for selected user */}
      {selectedUser && (
        <StoryViewer
          stories={selectedUser.stories}
          userName={selectedUser.full_name}
          userAvatar={selectedUser.avatar_url}
          onClose={() => setSelectedUser(null)}
          onViewed={handleStoryViewed}
        />
      )}

      {/* Story Viewer for own stories */}
      {showOwnStories && myStories.length > 0 && (
        <StoryViewer
          stories={myStories}
          userName="Tu historia"
          userAvatar={user?.user_metadata?.avatar_url}
          onClose={() => setShowOwnStories(false)}
          onViewed={handleStoryViewed}
        />
      )}
    </>
  );
}
