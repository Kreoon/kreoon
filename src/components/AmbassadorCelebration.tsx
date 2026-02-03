import { useState, useEffect, useMemo, useCallback } from "react";

// Type for webkit prefixed AudioContext (Safari)
interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}
import { Crown, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Confetti particle component
const ConfettiParticle = ({ delay, color, left }: { delay: number; color: string; left: number }) => (
  <div
    className="absolute w-3 h-3 animate-[confetti-fall_3s_ease-out_forwards]"
    style={{
      left: `${left}%`,
      top: '-10px',
      animationDelay: `${delay}s`,
      backgroundColor: color,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      transform: `rotate(${Math.random() * 360}deg)`,
    }}
  />
);

// Play celebration sound using Web Audio API
const playCelebrationSound = () => {
  try {
    const windowWithWebkit = window as WindowWithWebkit;
    const AudioContextClass = window.AudioContext || windowWithWebkit.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    
    // Create a cheerful arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    
    notes.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = audioContext.currentTime + i * 0.1;
      const duration = 0.3;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });

    // Add a little chime at the end
    setTimeout(() => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 1567.98; // G6
      oscillator.type = 'triangle';
      
      const startTime = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.5);
    }, 500);
  } catch (e) {
    console.log('Audio not supported');
  }
};

const confettiColors = [
  '#F59E0B', // amber-500
  '#FBBF24', // amber-400
  '#FCD34D', // amber-300
  '#EAB308', // yellow-500
  '#FACC15', // yellow-400
  '#FEF08A', // yellow-200
  '#F97316', // orange-500
];

export function AmbassadorCelebration() {
  const { user } = useAuth();
  const [showCelebration, setShowCelebration] = useState(false);

  // Generate confetti particles only once
  const confettiParticles = useMemo(() => 
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.5,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      left: Math.random() * 100,
    })), []
  );

  useEffect(() => {
    if (!user?.id) return;

    const checkCelebration = async () => {
      const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];

      // Prefer lookup by auth user id
      let { data: profile } = await supabase
        .from('profiles')
        .select('id, ambassador_celebration_pending')
        .eq('id', user.id)
        .maybeSingle();

      // If not found, try email lookup for root admins (migration ID mismatch)
      if (!profile) {
        const { data: authRes } = await supabase.auth.getUser();
        const email = authRes.user?.email;

        if (email && ROOT_EMAILS.includes(email)) {
          const emailRes = await supabase
            .from('profiles')
            .select('id, ambassador_celebration_pending')
            .eq('email', email)
            .maybeSingle();

          profile = emailRes.data as any;
        }
      }

      if (profile?.ambassador_celebration_pending) {
        setShowCelebration(true);
        // Play sound after a short delay
        setTimeout(playCelebrationSound, 300);
        // Clear the flag
        await supabase
          .from('profiles')
          .update({ ambassador_celebration_pending: false })
          .eq('id', profile.id);
      }
    };

    checkCelebration();
  }, [user?.id]);

  const handleClose = useCallback(() => {
    setShowCelebration(false);
  }, []);

  if (!showCelebration) return null;

  return (
    <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
      <DialogContent className="sm:max-w-md border-amber-500/50 bg-gradient-to-br from-card via-card to-amber-500/10 overflow-hidden">
        {/* Confetti */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiParticles.map((particle) => (
            <ConfettiParticle
              key={particle.id}
              delay={particle.delay}
              color={particle.color}
              left={particle.left}
            />
          ))}
        </div>

        {/* Background sparkles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
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
