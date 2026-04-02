/**
 * Header para la vista de perfil del creador en el marketplace.
 *
 * - Usuario autenticado: Volver, Logo, Guardar, Compartir, Contactar, Avatar
 * - No autenticado: Volver, Logo, Iniciar sesión, Soy Talento, Busco Talento
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Share2, MessageCircle, LogIn, Sparkles, UserPlus } from 'lucide-react';
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
        'border-b border-white/5',
        'bg-[#0a0a0f]/95 backdrop-blur-sm',
        'px-4 md:px-6'
      )}
    >
      {/* Izquierda: Volver + Logo (logo solo para no autenticados) */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/10"
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
            <span className="text-sm font-bold text-white hidden sm:inline">{platformName}</span>
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
                'text-zinc-400 hover:text-white hover:bg-white/10',
                isSaved && 'text-purple-400 hover:text-purple-300'
              )}
            >
              <Bookmark className={cn('h-4 w-4 mr-1.5', isSaved && 'fill-current')} />
              <span className="hidden sm:inline">{isSaved ? 'Guardado' : 'Guardar'}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-zinc-400 hover:text-white hover:bg-white/10"
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Compartir</span>
            </Button>

            <Button
              size="sm"
              onClick={handleContact}
              className="bg-purple-600 hover:bg-purple-700 text-white"
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
              className="text-zinc-400 hover:text-white hover:bg-white/10"
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Compartir</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auth')}
              className="text-zinc-400 hover:text-white hover:bg-white/10"
            >
              <LogIn className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Iniciar sesion</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate('/register?intent=talent')}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Soy Talento</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/register?intent=brand')}
              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hidden md:flex"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Busco Talento
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
