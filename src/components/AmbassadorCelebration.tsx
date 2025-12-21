import { useState, useEffect } from "react";
import { Crown, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AmbassadorCelebration() {
  const { user } = useAuth();
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const checkCelebration = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('ambassador_celebration_pending')
        .eq('id', user.id)
        .single();

      if (profile?.ambassador_celebration_pending) {
        setShowCelebration(true);
        // Clear the flag
        await supabase
          .from('profiles')
          .update({ ambassador_celebration_pending: false })
          .eq('id', user.id);
      }
    };

    checkCelebration();
  }, [user?.id]);

  const handleClose = () => {
    setShowCelebration(false);
  };

  if (!showCelebration) return null;

  return (
    <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
      <DialogContent className="sm:max-w-md border-amber-500/50 bg-gradient-to-br from-card via-card to-amber-500/10 overflow-hidden">
        {/* Background particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-[float_3s_ease-in-out_infinite]"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              <Sparkles 
                className="h-3 w-3 text-amber-400/40" 
                style={{ transform: `rotate(${Math.random() * 360}deg)` }}
              />
            </div>
          ))}
        </div>

        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-radial from-amber-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex flex-col items-center text-center py-8 px-4">
          {/* Crown animation */}
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping">
              <Crown className="h-20 w-20 text-amber-500/30" />
            </div>
            <div className="relative animate-[scale-in_0.5s_ease-out]">
              <Crown className="h-20 w-20 text-amber-500 fill-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
            </div>
            {/* Stars around crown */}
            <Star className="absolute -top-2 -left-4 h-4 w-4 text-amber-400 fill-amber-400 animate-pulse" />
            <Star className="absolute -top-3 right-0 h-3 w-3 text-amber-300 fill-amber-300 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <Star className="absolute top-2 -right-6 h-5 w-5 text-amber-400 fill-amber-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-2 animate-fade-in bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            ¡Felicitaciones!
          </h2>

          {/* Message */}
          <p className="text-lg text-foreground mb-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Ahora eres parte del programa de
          </p>
          
          <div className="flex items-center gap-2 mb-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <span className="text-xl font-bold bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Embajadores
            </span>
            <Crown className="h-5 w-5 text-amber-500 fill-amber-500" />
          </div>

          <p className="text-sm text-muted-foreground mb-6 max-w-xs animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Ahora puedes invitar a otros creadores y ganar comisiones por cada referido activo.
          </p>

          {/* CTA Button */}
          <Button 
            onClick={handleClose}
            className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 font-semibold hover:shadow-lg hover:shadow-amber-500/30 transition-all animate-fade-in"
            style={{ animationDelay: '0.5s' }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            ¡Comenzar!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
