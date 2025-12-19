import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, X } from "lucide-react";

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">
            ¡Bienvenido, {userName}!
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Has iniciado sesión como <span className="font-semibold text-foreground">{roleName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {roleDescription}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Explorar solo
          </Button>
          <Button onClick={onStartTour} className="gap-2">
            Iniciar tour guiado
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
