import { Sparkles, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoMode } from '@/contexts/DemoModeContext';

export function DemoBanner() {
  const { startTour } = useDemoMode();

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 px-4 py-2.5">
      {/* Animated shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

      <div className="relative flex items-center justify-between gap-3 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-white text-xs font-semibold tracking-wide">
            <Sparkles className="h-3 w-3" />
            MODO DEMO
          </div>
          <p className="text-white text-sm font-medium truncate">
            Estás viendo la plataforma KREOON con datos de demostración.{' '}
            <span className="opacity-80 hidden sm:inline">Esta es tu cuenta de prueba para explorar todas las funciones.</span>
          </p>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={startTour}
          className="shrink-0 text-white border border-white/30 hover:bg-white/20 hover:text-white gap-1.5 text-xs font-medium"
        >
          <Play className="h-3 w-3" />
          Ver guía
        </Button>
      </div>
    </div>
  );
}
