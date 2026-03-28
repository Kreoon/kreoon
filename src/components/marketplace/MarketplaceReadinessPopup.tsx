import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, FolderOpen, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMarketplaceReadiness } from '@/hooks/useMarketplaceReadiness';
import { useAuth } from '@/hooks/useAuth';

/**
 * Popup that shows for talent users who don't meet marketplace requirements:
 * - Must have a profile photo (avatar)
 * - Must have at least 1 portfolio item
 *
 * Shows on every session until requirements are met.
 */
export function MarketplaceReadinessPopup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading, isReady, hasAvatar, hasPortfolio, portfolioCount } = useMarketplaceReadiness();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if user is a talent
  const isTalent = user?.user_metadata?.account_type === 'talent';

  useEffect(() => {
    // Only show for logged-in talent users who are not ready
    if (!loading && isTalent && !isReady && !dismissed) {
      // Small delay to avoid showing immediately on page load
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, isTalent, isReady, dismissed]);

  // Don't render anything if not applicable
  if (!isTalent || loading || isReady) {
    return null;
  }

  const handleGoToProfile = () => {
    setOpen(false);
    setDismissed(true);
    navigate('/settings?section=profile');
  };

  const handleGoToPortfolio = () => {
    setOpen(false);
    setDismissed(true);
    navigate('/settings?section=profile&tab=portfolio');
  };

  const handleDismiss = () => {
    setOpen(false);
    setDismissed(true);
  };

  const requirements = [
    {
      key: 'avatar',
      label: 'Foto de perfil',
      description: 'Sube una foto profesional para que las marcas te reconozcan',
      completed: hasAvatar,
      action: handleGoToProfile,
      actionLabel: 'Subir foto',
      icon: Camera,
    },
    {
      key: 'portfolio',
      label: 'Portafolio creativo',
      description: portfolioCount > 0
        ? `Tienes ${portfolioCount} pieza${portfolioCount > 1 ? 's' : ''} en tu portafolio`
        : 'Sube al menos un video o imagen de tu trabajo (portafolio, contenido publicado, o posts)',
      completed: hasPortfolio,
      action: handleGoToPortfolio,
      actionLabel: 'Subir contenido',
      icon: FolderOpen,
    },
  ];

  const completedCount = requirements.filter(r => r.completed).length;
  const progress = (completedCount / requirements.length) * 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950 border-purple-500/30">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-amber-400" />
          </div>
          <DialogTitle className="text-xl text-white">
            Completa tu perfil para el Marketplace
          </DialogTitle>
          <DialogDescription className="text-white/60 mt-2">
            Para aparecer en el marketplace y recibir propuestas de campañas, necesitas completar estos requisitos:
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="mt-4 mb-6">
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>{completedCount} de {requirements.length} completados</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Requirements list */}
        <div className="space-y-3">
          {requirements.map((req) => {
            const Icon = req.icon;
            return (
              <div
                key={req.key}
                className={cn(
                  "p-4 rounded-sm border transition-all",
                  req.completed
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-white/5 border-white/10 hover:border-purple-500/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0",
                    req.completed ? "bg-emerald-500/20" : "bg-purple-500/20"
                  )}>
                    {req.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Icon className="h-5 w-5 text-purple-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium",
                      req.completed ? "text-emerald-400" : "text-white"
                    )}>
                      {req.label}
                      {req.completed && " ✓"}
                    </p>
                    <p className="text-sm text-white/50 mt-0.5">
                      {req.description}
                    </p>
                  </div>
                  {!req.completed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={req.action}
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 flex-shrink-0"
                    >
                      {req.actionLabel}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="text-white/50 hover:text-white/70"
          >
            Recordarme después
          </Button>
        </div>

        <p className="text-center text-[11px] text-white/30 mt-2">
          Este recordatorio aparecerá cada vez que inicies sesión hasta que completes tu perfil
        </p>
      </DialogContent>
    </Dialog>
  );
}
