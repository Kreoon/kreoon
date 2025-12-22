import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, X, Play, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
  userName: string;
  roleName: string;
  roleDescription: string;
}

export function WelcomeDialog({
  isOpen,
  onClose,
  onStartTour,
  userName,
  roleName,
  roleDescription,
}: WelcomeDialogProps) {
  const benefits = [
    "Conoce las funciones principales de tu rol",
    "Aprende a navegar la plataforma fácilmente", 
    "Descubre atajos y consejos útiles"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30 animate-in zoom-in duration-500">
              <Sparkles className="h-10 w-10 text-primary-foreground" />
            </div>
            <DialogTitle className="text-2xl font-bold">
              ¡Bienvenido, {userName}! 👋
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Has iniciado sesión como{" "}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-primary/20 text-primary">
                {roleName}
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 pt-2 space-y-5">
          {/* Role description */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {roleDescription}
            </p>
          </div>

          {/* Benefits list */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">El tour te ayudará a:</p>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <li 
                  key={index}
                  className={cn(
                    "flex items-center gap-3 text-sm text-muted-foreground",
                    "animate-in slide-in-from-left duration-300"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={onStartTour} 
              size="lg"
              className="w-full gap-2 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
            >
              <Play className="h-5 w-5" />
              Iniciar Tour Guiado
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Explorar por mi cuenta
            </Button>
          </div>

          {/* Footer hint */}
          <p className="text-xs text-center text-muted-foreground/70">
            💡 Puedes reiniciar el tour en cualquier momento desde Configuración
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}