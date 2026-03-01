/**
 * AdminOnlyFeature - Wrapper que muestra contenido solo para admins
 * Para otros usuarios muestra una página "En construcción"
 */

import { ReactNode } from 'react';
import { Construction, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface AdminOnlyFeatureProps {
  children: ReactNode;
  featureName?: string;
  description?: string;
}

export function AdminOnlyFeature({
  children,
  featureName = 'Esta función',
  description = 'Estamos trabajando para traerte una experiencia increíble. ¡Vuelve pronto!',
}: AdminOnlyFeatureProps) {
  const { activeRole, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();

  const isAdmin = activeRole === 'admin' || isPlatformAdmin;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Animated construction icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full animate-pulse" />
          <div className="relative flex items-center justify-center w-full h-full">
            <Construction className="h-12 w-12 text-yellow-500" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-yellow-400 animate-bounce" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            En Construcción
          </h1>
          <p className="text-lg text-muted-foreground">
            {featureName} estará disponible muy pronto
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">
          {description}
        </p>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full animate-pulse"
              style={{ width: '75%' }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Progreso: 75%</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button
            onClick={() => navigate('/marketplace')}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            Ir al Marketplace
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/60 pt-4">
          ¿Tienes preguntas? Contáctanos en soporte@kreoon.com
        </p>
      </div>
    </div>
  );
}
