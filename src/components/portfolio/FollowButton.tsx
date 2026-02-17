import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDiscoveryAnalytics } from '@/analytics';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function FollowButton({
  userId,
  initialIsFollowing,
  onFollowChange,
  variant = 'default',
  size = 'sm',
  className,
}: FollowButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackCreatorFollowed, trackCreatorUnfollowed } = useDiscoveryAnalytics();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = async () => {
    if (!user) {
      toast({
        title: 'Inicia sesión',
        description: 'Debes iniciar sesión para seguir a otros usuarios',
        variant: 'destructive',
      });
      return;
    }

    if (user.id === userId) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_follow', {
        _following_id: userId,
      });

      if (error) throw error;

      const newFollowingState = data as boolean;
      setIsFollowing(newFollowingState);
      onFollowChange?.(newFollowingState);
      if (newFollowingState) {
        trackCreatorFollowed(userId, 'profile');
      } else {
        trackCreatorUnfollowed(userId);
      }

      toast({
        title: newFollowingState ? 'Siguiendo' : 'Dejaste de seguir',
        description: newFollowingState
          ? 'Ahora sigues a este usuario'
          : 'Ya no sigues a este usuario',
      });
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Error',
        description: 'No se pudo completar la acción',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't show button for own profile
  if (user?.id === userId) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleToggleFollow}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Siguiendo</span>
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Seguir</span>
        </>
      )}
    </Button>
  );
}
