import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { UserPlus, X, Building2, UserCircle, Palette, Film, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface SuggestedProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  reason?: string;
  role?: string;
  organization_name?: string;
  is_independent?: boolean;
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

        // Fetch final profiles with organization info
        const { data: finalProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .in('id', candidateArray)
          .limit(limit);

        // Fetch organization membership for these profiles
        const { data: membershipData } = await supabase
          .from('organization_members')
          .select(`
            user_id,
            role,
            organization:organization_id (name)
          `)
          .in('user_id', candidateArray);

        const membershipMap = new Map(
          (membershipData || []).map(m => [m.user_id, { 
            role: m.role, 
            organization_name: (m.organization as any)?.name 
          }])
        );

        setProfiles(
          (finalProfiles || []).map(p => {
            const membership = membershipMap.get(p.id);
            return {
              ...p,
              reason: mutualCandidates.has(p.id) ? 'Seguido por personas que sigues' : 'Popular',
              role: membership?.role,
              organization_name: membership?.organization_name,
              is_independent: !membership,
            };
          })
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
                <div className="flex items-center gap-1 flex-wrap">
                  {profile.role && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {profile.role === 'creator' && <Palette className="h-2.5 w-2.5 mr-0.5" />}
                      {profile.role === 'editor' && <Film className="h-2.5 w-2.5 mr-0.5" />}
                      {profile.role === 'strategist' && <Target className="h-2.5 w-2.5 mr-0.5" />}
                      {profile.role === 'editor' ? 'Productor AV' : profile.role === 'creator' ? 'Creador' : profile.role === 'strategist' ? 'Estratega' : profile.role}
                    </Badge>
                  )}
                  {profile.is_independent ? (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      <UserCircle className="h-2.5 w-2.5 mr-0.5" />
                      Indep.
                    </Badge>
                  ) : profile.organization_name && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      <Building2 className="h-2.5 w-2.5 mr-0.5" />
                      {profile.organization_name}
                    </Badge>
                  )}
                </div>
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
              <div className="flex items-center justify-center gap-1 flex-wrap mb-1">
                {profile.role && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    {profile.role === 'editor' ? 'Productor AV' : profile.role === 'creator' ? 'Creador' : profile.role === 'strategist' ? 'Estratega' : profile.role}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate mb-2">
                {profile.is_independent ? 'Independiente' : profile.organization_name || ''}
              </p>
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
