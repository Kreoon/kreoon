import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SuggestedProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  reason?: string;
}

interface SuggestedProfilesProps {
  variant?: 'card' | 'carousel';
  limit?: number;
  onDismiss?: () => void;
}

export function SuggestedProfiles({ variant = 'carousel', limit = 5, onDismiss }: SuggestedProfilesProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<SuggestedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        // Get who user is already following
        const { data: following } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        const alreadyFollowing = new Set((following || []).map(f => f.following_id));
        setFollowingIds(alreadyFollowing);

        // Get mutual follows (people followed by people you follow)
        const { data: mutualData } = await supabase
          .from('followers')
          .select('following_id')
          .in('follower_id', [...alreadyFollowing])
          .limit(50);

        const mutualCandidates = new Set(
          (mutualData || [])
            .map(m => m.following_id)
            .filter(id => id !== user.id && !alreadyFollowing.has(id))
        );

        // Get popular profiles with recent activity
        const { data: popularProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .neq('id', user.id)
          .limit(20);

        // Combine and deduplicate
        const candidateIds = new Set([
          ...mutualCandidates,
          ...(popularProfiles || []).map(p => p.id)
        ]);

        // Remove already following
        alreadyFollowing.forEach(id => candidateIds.delete(id));

        // Fetch final profiles
        const candidateArray = [...candidateIds].slice(0, limit * 2);
        
        if (candidateArray.length === 0) {
          setProfiles([]);
          setLoading(false);
          return;
        }

        const { data: finalProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .in('id', candidateArray)
          .limit(limit);

        setProfiles(
          (finalProfiles || []).map(p => ({
            ...p,
            reason: mutualCandidates.has(p.id) ? 'Seguido por personas que sigues' : 'Popular',
          }))
        );
      } catch (error) {
        console.error('[SuggestedProfiles] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user?.id, limit]);

  const handleFollow = async (profileId: string) => {
    if (!user?.id) return;

    try {
      await supabase.from('followers').insert({
        follower_id: user.id,
        following_id: profileId,
      });

      setFollowingIds(prev => new Set([...prev, profileId]));
      toast.success('Ahora sigues a este usuario');
    } catch (error) {
      console.error('[SuggestedProfiles] Follow error:', error);
      toast.error('No se pudo seguir al usuario');
    }
  };

  const handleProfileClick = (profileId: string) => {
    navigate(`/profile/${profileId}`);
  };

  if (loading || profiles.length === 0) return null;

  if (variant === 'card') {
    return (
      <Card className="bg-card/50 border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Sugeridos para ti</CardTitle>
          {onDismiss && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {profiles.slice(0, 3).map(profile => (
            <div key={profile.id} className="flex items-center gap-3">
              <button onClick={() => handleProfileClick(profile.id)}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback>{profile.full_name?.[0]}</AvatarFallback>
                </Avatar>
              </button>
              <div className="flex-1 min-w-0">
                <button 
                  onClick={() => handleProfileClick(profile.id)}
                  className="text-sm font-medium truncate block text-left hover:underline"
                >
                  {profile.full_name}
                </button>
                <p className="text-xs text-muted-foreground truncate">{profile.reason}</p>
              </div>
              {!followingIds.has(profile.id) && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => handleFollow(profile.id)}
                >
                  Seguir
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Carousel variant
  return (
    <div className="py-4 border-b border-border">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Sugeridos para ti</h3>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Ocultar
          </Button>
        )}
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-3 px-4 pb-2">
          {profiles.map(profile => (
            <div 
              key={profile.id}
              className="flex-shrink-0 w-36 bg-card/50 border border-border rounded-xl p-3 text-center"
            >
              <button onClick={() => handleProfileClick(profile.id)}>
                <Avatar className="h-16 w-16 mx-auto mb-2">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-lg">{profile.full_name?.[0]}</AvatarFallback>
                </Avatar>
              </button>
              <button 
                onClick={() => handleProfileClick(profile.id)}
                className="text-sm font-medium truncate block w-full hover:underline"
              >
                {profile.full_name}
              </button>
              <p className="text-xs text-muted-foreground truncate mb-2">{profile.reason}</p>
              {!followingIds.has(profile.id) ? (
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleFollow(profile.id)}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Seguir
                </Button>
              ) : (
                <Button size="sm" variant="secondary" className="w-full" disabled>
                  Siguiendo
                </Button>
              )}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
