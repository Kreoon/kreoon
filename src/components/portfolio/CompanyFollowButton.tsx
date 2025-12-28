import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CompanyFollowButtonProps {
  companyId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function CompanyFollowButton({
  companyId,
  initialIsFollowing,
  onFollowChange,
  size = 'default',
  className,
}: CompanyFollowButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [initialized, setInitialized] = useState(initialIsFollowing !== undefined);

  // Check if user is following on mount
  useEffect(() => {
    if (!user?.id || initialized) return;

    const checkFollowing = async () => {
      const { data } = await supabase
        .from('company_followers')
        .select('id')
        .eq('company_id', companyId)
        .eq('follower_id', user.id)
        .single();

      setIsFollowing(!!data);
      setInitialized(true);
    };

    checkFollowing();
  }, [companyId, user?.id, initialized]);

  const handleToggleFollow = async () => {
    if (!user) {
      toast.error('Inicia sesión para seguir empresas');
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('company_followers')
          .delete()
          .eq('company_id', companyId)
          .eq('follower_id', user.id);

        if (error) throw error;
        setIsFollowing(false);
        onFollowChange?.(false);
        toast.success('Dejaste de seguir');
      } else {
        // Follow
        const { error } = await supabase
          .from('company_followers')
          .insert({ company_id: companyId, follower_id: user.id });

        if (error) throw error;
        setIsFollowing(true);
        onFollowChange?.(true);
        toast.success('Siguiendo empresa');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Error al seguir la empresa');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Button size={size} variant="outline" disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (isFollowing) {
    return (
      <Button
        size={size}
        variant="outline"
        onClick={handleToggleFollow}
        className={cn("group", className)}
      >
        <UserMinus className="w-4 h-4 mr-1 hidden group-hover:block" />
        <UserPlus className="w-4 h-4 mr-1 group-hover:hidden" />
        <span className="group-hover:hidden">Siguiendo</span>
        <span className="hidden group-hover:block">Dejar de seguir</span>
      </Button>
    );
  }

  return (
    <Button
      size={size}
      onClick={handleToggleFollow}
      className={className}
    >
      <UserPlus className="w-4 h-4 mr-1" />
      Seguir
    </Button>
  );
}
