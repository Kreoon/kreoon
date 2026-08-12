import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { useIsMobile } from '@/hooks/use-mobile';

interface AccountMenuProps {
  trigger: React.ReactNode;
}

// Fix del bug confirmado: el avatar navegaba a /p/${user.id} (uuid), pero /p/:username
// busca por creator_profiles.slug/username -> "Perfil no encontrado" para el propio usuario.
// Aca se resuelve el link real solo si existe un slug; si no, se ofrece completar el perfil.
export function AccountMenu({ trigger }: AccountMenuProps) {
  const isMobile = useIsMobile();
  const { profile, signOut } = useAuth();
  const { profile: creatorProfile } = useCreatorProfile();
  const navigate = useNavigate();

  const hasPublicSlug = !!creatorProfile?.slug;

  const handleProfileClick = () => {
    if (hasPublicSlug) navigate(`/p/${creatorProfile!.slug}`);
    else navigate('/settings?section=profile');
  };

  const body = (
    <div className="space-y-1">
      <div className="flex items-center gap-3 px-1 pb-3 mb-2 border-b border-border">
        <Avatar className="h-11 w-11">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || 'Usuario'}</p>
        </div>
      </div>

      <button
        onClick={handleProfileClick}
        className="w-full flex items-center gap-3 min-h-[44px] px-2 rounded-sm hover:bg-muted/50 text-left"
      >
        <UserCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{hasPublicSlug ? 'Mi Perfil' : 'Completa tu perfil'}</span>
      </button>

      <button
        onClick={() => navigate('/settings')}
        className="w-full flex items-center gap-3 min-h-[44px] px-2 rounded-sm hover:bg-muted/50 text-left"
      >
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-foreground">Configuración</span>
      </button>

      <button
        onClick={() => signOut()}
        className="w-full flex items-center gap-3 min-h-[44px] px-2 rounded-sm hover:bg-destructive/10 text-left text-destructive"
      >
        <LogOut className="h-4 w-4" />
        <span className="text-sm">Cerrar sesión</span>
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="sr-only">Mi cuenta</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {body}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
