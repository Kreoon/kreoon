/**
 * Wrapper para perfiles del marketplace.
 * Proporciona layout consistente: botón back, SEO, etc.
 */

import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MarketplaceProfileWrapperProps {
  children: ReactNode;
  showBackButton?: boolean;
  className?: string;
}

export function MarketplaceProfileWrapper({
  children,
  showBackButton = true,
  className,
}: MarketplaceProfileWrapperProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // Si hay historial, volver atrás; si no, ir al marketplace
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/marketplace');
    }
  };

  return (
    <div className={cn('min-h-screen bg-zinc-950', className)}>
      {/* Botón flotante de volver */}
      {showBackButton && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className={cn(
              'h-10 w-10 rounded-full',
              'bg-black/50 backdrop-blur-sm',
              'text-white hover:bg-black/70 hover:text-white',
              'border border-white/10',
              'shadow-lg',
            )}
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Contenido del perfil */}
      {children}
    </div>
  );
}

export default MarketplaceProfileWrapper;
