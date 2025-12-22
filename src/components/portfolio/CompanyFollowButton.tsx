import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CompanyFollowButtonProps {
  companyId: string;
  isFollowing: boolean;
  onFollowChange: (isFollowing: boolean) => void;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function CompanyFollowButton({
  companyId,
  isFollowing,
  onFollowChange,
  size = 'default',
  className,
}: CompanyFollowButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = async () => {
    if (!user) {
      toast.error('Inicia sesión para seguir empresas');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_company_follow', {
        _company_id: companyId,
      });

      if (error) throw error;

      onFollowChange(data);
      toast.success(data ? 'Siguiendo empresa' : 'Dejaste de seguir');
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