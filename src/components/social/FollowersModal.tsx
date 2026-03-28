import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFollowersList, FollowerProfile } from '@/hooks/useFollowersList';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: 'followers' | 'following' | 'likers';
}

interface ProfileItemProps {
  profile: FollowerProfile;
  onClose: () => void;
  showUnfollow?: boolean;
  onUnfollow?: (profileId: string) => Promise<void>;
}

function ProfileItem({ profile, onClose, showUnfollow, onUnfollow }: ProfileItemProps) {
  const navigate = useNavigate();
  const [unfollowing, setUnfollowing] = useState(false);

  const handleClick = () => {
    onClose();
    navigate(`/profile/${profile.id}`);
  };

  const handleUnfollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUnfollow) return;
    
    setUnfollowing(true);
    try {
      await onUnfollow(profile.id);
    } finally {
      setUnfollowing(false);
    }
  };

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-sm hover:bg-social-muted/50 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback className="bg-social-muted text-social-foreground">
          {profile.full_name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-social-foreground truncate">{profile.full_name}</p>
        {profile.username && (
          <p className="text-sm text-social-muted-foreground truncate">@{profile.username}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showUnfollow && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={handleUnfollow}
            disabled={unfollowing}
          >
            {unfollowing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4" />
            )}
          </Button>
        )}
        <Button variant="outline" size="sm" className="shrink-0" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
          Ver perfil
        </Button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ type }: { type: 'followers' | 'following' | 'likers' }) {
  const messages = {
    followers: { icon: Users, text: 'Aún no tiene seguidores' },
    following: { icon: UserPlus, text: 'Aún no sigue a nadie' },
    likers: { icon: Heart, text: 'Aún no hay likes' }
  };

  const { icon: Icon, text } = messages[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-social-muted-foreground">
      <Icon className="h-12 w-12 mb-4 opacity-50" />
      <p>{text}</p>
    </div>
  );
}

export function FollowersModal({ isOpen, onClose, userId, initialTab = 'followers' }: FollowersModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const { followers, following, likers, loading, fetchFollowers, fetchFollowing, fetchLikers } = useFollowersList(userId);
  
  // Check if viewing own profile
  const isOwnProfile = user?.id === userId;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as typeof activeTab);
    
    if (tab === 'followers') fetchFollowers();
    else if (tab === 'following') fetchFollowing();
    else if (tab === 'likers') fetchLikers();
  };

  // Fetch all data when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Fetch all data to show correct counts in tabs
      fetchFollowers();
      fetchFollowing();
      fetchLikers();
    }
  }, [isOpen, initialTab]);

  // Handle unfollow action (only for "following" tab on own profile)
  const handleUnfollow = async (profileId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profileId);
      
      if (error) throw error;
      
      toast.success('Dejaste de seguir a este usuario');
      // Refresh the following list
      fetchFollowing();
    } catch (error) {
      console.error('Error unfollowing:', error);
      toast.error('Error al dejar de seguir');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-social-card border-social-border">
        <DialogHeader>
          <DialogTitle className="text-social-foreground">Conexiones</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full bg-social-muted">
            <TabsTrigger value="followers" className="flex-1 data-[state=active]:bg-social-accent data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Seguidores ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following" className="flex-1 data-[state=active]:bg-social-accent data-[state=active]:text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Siguiendo ({following.length})
            </TabsTrigger>
            <TabsTrigger value="likers" className="flex-1 data-[state=active]:bg-social-accent data-[state=active]:text-white">
              <Heart className="h-4 w-4 mr-2" />
              Likes ({likers.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="followers" className="mt-0">
              {loading ? (
                <LoadingSkeleton />
              ) : followers.length === 0 ? (
                <EmptyState type="followers" />
              ) : (
                <div className="space-y-1">
                  {followers.map(profile => (
                    <ProfileItem key={profile.id} profile={profile} onClose={onClose} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="following" className="mt-0">
              {loading ? (
                <LoadingSkeleton />
              ) : following.length === 0 ? (
                <EmptyState type="following" />
              ) : (
                <div className="space-y-1">
                  {following.map(profile => (
                    <ProfileItem 
                      key={profile.id} 
                      profile={profile} 
                      onClose={onClose}
                      showUnfollow={isOwnProfile}
                      onUnfollow={handleUnfollow}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="likers" className="mt-0">
              {loading ? (
                <LoadingSkeleton />
              ) : likers.length === 0 ? (
                <EmptyState type="likers" />
              ) : (
                <div className="space-y-1">
                  {likers.map(profile => (
                    <ProfileItem key={profile.id} profile={profile} onClose={onClose} />
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
