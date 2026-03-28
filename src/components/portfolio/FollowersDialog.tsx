import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FollowButton } from './FollowButton';

interface FollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  initialTab?: 'followers' | 'following';
}

interface FollowUser {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  is_following?: boolean;
}

export function FollowersDialog({
  open,
  onOpenChange,
  userId,
  initialTab = 'followers'
}: FollowersDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      fetchData();
    }
  }, [open, userId, initialTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch followers (users who follow this profile)
      const { data: followersData } = await supabase
        .from('followers')
        .select('follower_id')
        .eq('following_id', userId);

      if (followersData && followersData.length > 0) {
        const followerIds = followersData.map(f => f.follower_id);
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', followerIds);

        // Check if current user is following each follower
        if (user && followerProfiles) {
          const { data: currentUserFollowing } = await supabase
            .from('followers')
            .select('following_id')
            .eq('follower_id', user.id);

          const followingIds = new Set(currentUserFollowing?.map(f => f.following_id) || []);
          
          setFollowers(followerProfiles.map(p => ({
            ...p,
            is_following: followingIds.has(p.id)
          })));
        } else {
          setFollowers(followerProfiles || []);
        }
      } else {
        setFollowers([]);
      }

      // Fetch following (users this profile follows)
      const { data: followingData } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', userId);

      if (followingData && followingData.length > 0) {
        const followingIds = followingData.map(f => f.following_id);
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', followingIds);

        // Check if current user is following each
        if (user && followingProfiles) {
          const { data: currentUserFollowing } = await supabase
            .from('followers')
            .select('following_id')
            .eq('follower_id', user.id);

          const currentFollowingIds = new Set(currentUserFollowing?.map(f => f.following_id) || []);
          
          setFollowing(followingProfiles.map(p => ({
            ...p,
            is_following: currentFollowingIds.has(p.id)
          })));
        } else {
          setFollowing(followingProfiles || []);
        }
      } else {
        setFollowing([]);
      }
    } catch (error) {
      console.error('Error fetching followers/following:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (profileId: string) => {
    onOpenChange(false);
    navigate(`/p/${profileId}`);
  };

  const handleFollowChange = (profileId: string, isNowFollowing: boolean) => {
    // Update local state
    setFollowers(prev => prev.map(u => 
      u.id === profileId ? { ...u, is_following: isNowFollowing } : u
    ));
    setFollowing(prev => prev.map(u => 
      u.id === profileId ? { ...u, is_following: isNowFollowing } : u
    ));
  };

  const renderUserList = (users: FollowUser[]) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <User className="h-12 w-12 mb-2 opacity-50" />
          <p className="text-sm">
            {activeTab === 'followers' ? 'Sin seguidores aún' : 'No sigue a nadie aún'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {users.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center justify-between p-3 rounded-sm hover:bg-muted/50 transition-colors"
          >
            <button
              onClick={() => handleUserClick(profile.id)}
              className="flex items-center gap-3 flex-1 text-left"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback>
                  {profile.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="font-medium text-sm truncate">{profile.full_name}</p>
                {profile.username && (
                  <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                )}
              </div>
            </button>
            {user && user.id !== profile.id && (
              <FollowButton
                userId={profile.id}
                initialIsFollowing={profile.is_following || false}
                onFollowChange={(isFollowing) => handleFollowChange(profile.id, isFollowing)}
                size="sm"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Conexiones</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'followers' | 'following')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Seguidores ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              Siguiendo ({following.length})
            </TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="followers" className="mt-0">
              {renderUserList(followers)}
            </TabsContent>
            <TabsContent value="following" className="mt-0">
              {renderUserList(following)}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
