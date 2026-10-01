/**
 * Header para la vista de perfil del creador en el marketplace.
 *
 * - Usuario autenticado: Volver, Logo, Guardar, Compartir, Contactar, Avatar
 * - No autenticado: Volver, Logo, Iniciar sesión, Crear cuenta de creador, Busco Talento
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Share2, MessageCircle, LogIn, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/contexts/BrandingContext';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ProfileHeaderProps {
  creatorId: string;
  creatorName: string;
  onContact?: () => void;
}

export function ProfileHeader({ creatorId, creatorName, onContact }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { branding } = useBranding();
  const { toast } = useToast();
  const { isSaved, toggleSave, isLoading: isSaving } = useSavedItems('creator', creatorId);

  const logoUrl = branding.logo_url || '/favicon.png';
  const platformName = branding.platform_name || 'KREOON';

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/marketplace');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creatorName} en ${platformName}`,
          url,
        });
      } catch (err) {
        // Usuario canceló o error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Enlace copiado',
        description: 'El enlace del perfil se copió al portapapeles.',
      });
    }
  };

  const handleSave = () => {
    toggleSave();
  };

  const handleContact = () => {
    if (onContact) {
      onContact();
    } else {
      // Scroll al bloque de contacto si existe
      const contactSection = document.querySelector('[data-block-type="contact"]');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50',
        'flex h-14 items-center justify-between',
        'border-b border-border/50',
        'bg-background/95 backdrop-blur-sm',
        'px-4 md:px-6'
      )}
    >
      {/* Izquierda: Volver + Logo (logo solo para no autenticados) */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-9 w-9 text-foreground/75 hover:text-foreground hover:bg-muted"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Logo solo para no autenticados (autenticados ya lo tienen en el header principal) */}
        {!user && (
          <button
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-sm overflow-hidden">
              <img src={logoUrl} alt={platformName} className="h-7 w-7 object-cover" loading="lazy" />
            </div>
            <span className="text-sm font-bold text-foreground hidden sm:inline">{platformName}</span>
          </button>
        )}
      </div>

      {/* Derecha: Acciones según estado de auth */}
      <div className="flex items-center gap-2">
        {user ? (
          <>
            {/* Usuario autenticado */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                'text-foreground/75 hover:text-foreground hover:bg-muted',
                isSaved && 'text-primary hover:text-primary'
              )}
            >
              <Bookmark className={cn('h-4 w-4 mr-1.5', isSaved && 'fill-current')} />
              <span className="hidden sm:inline">{isSaved ? 'Guardado' : 'Guardar'}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-foreground/75 hover:text-foreground hover:bg-muted"
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Compartir</span>
            </Button>

            <Button
              size="sm"
              onClick={handleContact}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              Contactar
            </Button>
          </>
        ) : (
          <>
            {/* Usuario no autenticado */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-foreground/75 hover:text-foreground hover:bg-muted"
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Compartir</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auth')}
              className="text-foreground/75 hover:text-foreground hover:bg-muted"
            >
              <LogIn className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Iniciar sesión</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate('/registro')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              <span className="sm:hidden">Crear cuenta</span><span className="hidden sm:inline">Crear cuenta de creador</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
