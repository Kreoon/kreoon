import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';

interface FollowButtonProps {
  profileId: string;
  onFollowChange?: (isFollowing: boolean) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function FollowButton({
  profileId,
  onFollowChange,
  variant = 'default',
  size = 'default',
  className,
}: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user || user.id === profileId) {
      setLoading(false);
      return;
    }
    
    checkFollowStatus();
  }, [user, profileId]);

  const checkFollowStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profileId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error('Inicia sesión para seguir perfiles');
      return;
    }

    if (user.id === profileId) return;

    setActionLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profileId);

        if (error) throw error;
        setIsFollowing(false);
        onFollowChange?.(false);
        toast.success('Has dejado de seguir a este perfil');
      } else {
        // Follow
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: user.id,
            following_id: profileId,
          });

        if (error) {
          if (error.code === '23505') {
            // Already following
            setIsFollowing(true);
            return;
          }
          throw error;
        }
        
        setIsFollowing(true);
        onFollowChange?.(true);
        toast.success('Ahora sigues a este perfil');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Error al procesar la solicitud');
    } finally {
      setActionLoading(false);
    }
  };

  // Don't show for own profile or while loading
  if (!user || user.id === profileId) return null;
  if (loading) return <Skeleton size={size} />;

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleFollow}
      disabled={actionLoading}
      className={isFollowing 
        ? `border-border text-foreground hover:bg-background hover:text-red-500 ${className}`
        : `bg-primary hover:bg-primary/90 text-primary-foreground ${className}`
      }
    >
      {actionLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="h-4 w-4 mr-2" />
          Siguiendo
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Seguir
        </>
      )}
    </Button>
  );
}

function Skeleton({ size }: { size?: string }) {
  const sizeClass = size === 'sm' ? 'h-8 w-20' : size === 'lg' ? 'h-12 w-28' : 'h-10 w-24';
  return (
    <div className={`${sizeClass} rounded-sm bg-background animate-pulse`} />
  );
}
