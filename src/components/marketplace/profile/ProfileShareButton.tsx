import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileShareDialog } from './ProfileShareDialog';

interface ProfileShareButtonProps {
  profile: {
    slug: string;
    display_name: string;
    primary_role?: string | null;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ProfileShareButton({
  profile,
  variant = 'outline',
  size = 'sm',
  className,
}: ProfileShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
        aria-label="Compartir perfil"
      >
        <Share2 className="h-4 w-4" />
        {size !== 'icon' && <span className="ml-2">Compartir</span>}
      </Button>

      <ProfileShareDialog
        open={open}
        onOpenChange={setOpen}
        profile={profile}
      />
    </>
  );
}
