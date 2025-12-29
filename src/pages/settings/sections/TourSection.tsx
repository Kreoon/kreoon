import { Button } from '@/components/ui/button';
import { Sparkles, Play } from 'lucide-react';
import { useTour } from '@/hooks/useTour';

export default function TourSection() {
  const { resetTour } = useTour();

  const handleStartTour = () => {
    resetTour();
    window.location.href = '/dashboard';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Tour Guiado</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            ¿Quieres volver a ver el tour de introducción? Te mostraremos las funcionalidades principales de la plataforma según tu rol.
          </p>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button onClick={handleStartTour} size="lg" className="gap-2">
          <Play className="h-5 w-5" />
          Iniciar Tour Guiado
        </Button>
      </div>
      
      <div className="mt-8 p-4 rounded-lg bg-muted/50 border max-w-md mx-auto">
        <h3 className="font-medium text-sm text-foreground mb-2">El tour incluye:</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Navegación por las secciones principales</li>
          <li>• Funcionalidades específicas de tu rol</li>
          <li>• Tips para aprovechar la plataforma</li>
        </ul>
      </div>
    </div>
  );
}
