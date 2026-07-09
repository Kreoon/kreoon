import { Home, Search, Sparkles, Bell, UserCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSocialNotifications } from '@/hooks/useSocialNotifications';
import { Badge } from '@/components/ui/badge';

interface MobileBottomNavProps {
  onPublishClick?: () => void;
}

// Bottom tab bar solo para el dominio feed/portfolio/perfil en movil (<768px).
// NO se monta globalmente en MainLayout para no interferir con Kanban/CRM/otros layouts.
export function MobileBottomNav({ onPublishClick }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useSocialNotifications();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14">
        <button
          onClick={() => navigate('/feed')}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3',
            isActive('/feed') ? 'text-primary' : 'text-muted-foreground'
          )}
          aria-label="Feed"
        >
          <Home className="h-5 w-5" />
        </button>

        <button
          onClick={() => navigate('/explore')}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3',
            isActive('/explore') ? 'text-primary' : 'text-muted-foreground'
          )}
          aria-label="Buscar"
        >
          <Search className="h-5 w-5" />
        </button>

        <button
          onClick={onPublishClick}
          className="flex items-center justify-center h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg -mt-1"
          aria-label="Publicar"
        >
          <Sparkles className="h-5 w-5" />
        </button>

        <button
          className="relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3 text-muted-foreground"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute top-1 right-2 h-4 min-w-[16px] p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>

        <button
          onClick={() => navigate('/settings?section=profile')}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3',
            isActive('/settings') ? 'text-primary' : 'text-muted-foreground'
          )}
          aria-label="Perfil"
        >
          <UserCircle className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}
