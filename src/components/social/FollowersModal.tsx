import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFollowersList, FollowerProfile } from '@/hooks/useFollowersList';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, UserPlus } from 'lucide-react';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: 'followers' | 'following' | 'likers';
}

function ProfileItem({ profile, onClose }: { profile: FollowerProfile; onClose: () => void }) {
  const navigate = useNavigate();

  const handleClick = () => {
    onClose();
    navigate(`/profile/${profile.id}`);
  };

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-social-muted/50 cursor-pointer transition-colors"
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
      <Button variant="outline" size="sm" className="shrink-0">
        Ver perfil
      </Button>
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
  const [activeTab, setActiveTab] = useState(initialTab);
  const { followers, following, likers, loading, fetchFollowers, fetchFollowing, fetchLikers } = useFollowersList(userId);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as typeof activeTab);
    
    if (tab === 'followers') fetchFollowers();
    else if (tab === 'following') fetchFollowing();
    else if (tab === 'likers') fetchLikers();
  };

  // Fetch initial data when modal opens
  useState(() => {
    if (isOpen) {
      if (initialTab === 'followers') fetchFollowers();
      else if (initialTab === 'following') fetchFollowing();
      else if (initialTab === 'likers') fetchLikers();
    }
  });

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
              Seguidores
            </TabsTrigger>
            <TabsTrigger value="following" className="flex-1 data-[state=active]:bg-social-accent data-[state=active]:text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Siguiendo
            </TabsTrigger>
            <TabsTrigger value="likers" className="flex-1 data-[state=active]:bg-social-accent data-[state=active]:text-white">
              <Heart className="h-4 w-4 mr-2" />
              Likes
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
                    <ProfileItem key={profile.id} profile={profile} onClose={onClose} />
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
