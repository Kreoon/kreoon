import { useState, useEffect, useCallback } from 'react';
import { Crown, Trophy, Medal, Star, Gift, Share2, X, PartyPopper, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { SeasonRewardClaim } from '@/hooks/useSeasonRewards';
import confetti from 'canvas-confetti';

interface SeasonEndCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonName: string;
  finalRank: number;
  finalPoints: number;
  totalParticipants: number;
  claims: SeasonRewardClaim[];
  userName: string;
  userAvatar?: string;
}

const RANK_CONFIGS: Record<number, { title: string; icon: typeof Crown; gradient: string; confettiColors: string[] }> = {
  1: {
    title: 'Campeon!',
    icon: Crown,
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    confettiColors: ['#FCD34D', '#F59E0B', '#D97706']
  },
  2: {
    title: 'Segundo Lugar!',
    icon: Medal,
    gradient: 'from-slate-300 via-slate-400 to-slate-500',
    confettiColors: ['#94A3B8', '#64748B', '#475569']
  },
  3: {
    title: 'Tercer Lugar!',
    icon: Medal,
    gradient: 'from-orange-400 via-amber-500 to-orange-600',
    confettiColors: ['#FB923C', '#F97316', '#EA580C']
  }
};

export function SeasonEndCelebration({
  open,
  onOpenChange,
  seasonName,
  finalRank,
  finalPoints,
  totalParticipants,
  claims,
  userName,
  userAvatar
}: SeasonEndCelebrationProps) {
  const [showContent, setShowContent] = useState(false);

  const triggerConfetti = useCallback(() => {
    const isPodium = finalRank <= 3;
    const config = RANK_CONFIGS[finalRank];

    // Confetti burst
    const count = isPodium ? 200 : 100;
    const defaults = {
      origin: { y: 0.7 },
      colors: config?.confettiColors || ['#3B82F6', '#8B5CF6', '#EC4899']
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    // Multiple bursts for dramatic effect
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    // Si es campeon, efecto extra
    if (finalRank === 1) {
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: config?.confettiColors
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: config?.confettiColors
        });
      }, 500);
    }
  }, [finalRank]);

  useEffect(() => {
    if (open) {
      // Delay para animacion de entrada
      setTimeout(() => {
        setShowContent(true);
        triggerConfetti();
      }, 300);
    } else {
      setShowContent(false);
    }
  }, [open, triggerConfetti]);

  const isPodium = finalRank <= 3;
  const config = isPodium ? RANK_CONFIGS[finalRank] : null;
  const RankIcon = config?.icon || Star;

  const percentile = Math.round(((totalParticipants - finalRank + 1) / totalParticipants) * 100);

  const handleShare = () => {
    const text = `Termine la temporada "${seasonName}" en el puesto #${finalRank} con ${finalPoints} puntos! ${isPodium ? '' : ''}`;

    if (navigator.share) {
      navigator.share({
        title: 'Mi resultado en Kreoon',
        text
      });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md overflow-hidden',
          isPodium && 'border-2',
          finalRank === 1 && 'border-amber-500',
          finalRank === 2 && 'border-slate-400',
          finalRank === 3 && 'border-orange-500'
        )}
      >
        {/* Header con gradiente */}
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-32 -z-10',
            `bg-gradient-to-b ${config?.gradient || 'from-primary/20 to-transparent'}`
          )}
        />

        <DialogHeader className="text-center pt-4">
          <div className="flex justify-center mb-4">
            <div
              className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center',
                'animate-bounce-slow shadow-2xl',
                isPodium
                  ? `bg-gradient-to-br ${config?.gradient}`
                  : 'bg-gradient-to-br from-primary to-primary/70'
              )}
            >
              <RankIcon className="w-12 h-12 text-white" />
            </div>
          </div>

          <DialogTitle
            className={cn(
              'text-3xl font-bold',
              'animate-in fade-in-50 duration-500',
              !showContent && 'opacity-0'
            )}
          >
            {config?.title || `Top ${percentile}%!`}
          </DialogTitle>

          <DialogDescription
            className={cn(
              'text-lg',
              'animate-in fade-in-50 duration-500 delay-100',
              !showContent && 'opacity-0'
            )}
          >
            Temporada: {seasonName}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            'space-y-6 py-4',
            'animate-in fade-in-50 slide-in-from-bottom-4 duration-500 delay-200',
            !showContent && 'opacity-0 translate-y-4'
          )}
        >
          {/* Avatar y stats */}
          <div className="flex items-center justify-center gap-6">
            <Avatar className="w-16 h-16 border-4 border-background shadow-lg">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="text-xl">
                {userName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="text-left">
              <p className="font-semibold text-lg">{userName}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>#{finalRank} de {totalParticipants}</span>
                <span className="font-bold text-primary">{finalPoints.toLocaleString()} pts</span>
              </div>
            </div>
          </div>

          {/* Premios ganados */}
          {claims.length > 0 && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-500" />
                Premios Ganados
              </h4>

              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: claim.reward?.display_color || '#3B82F6' }}
                    >
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{claim.reward?.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {claim.reward?.reward_type === 'points_bonus' && `+${claim.reward.points_amount} puntos`}
                        {claim.reward?.reward_type === 'monetary' && `$${claim.reward.monetary_amount} ${claim.reward.monetary_currency}`}
                        {claim.reward?.reward_type === 'badge' && 'Badge exclusivo'}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={claim.status === 'delivered' ? 'default' : 'secondary'}
                    className={claim.status === 'delivered' ? 'bg-green-500' : ''}
                  >
                    {claim.status === 'delivered' ? 'Entregado' : 'Pendiente'}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Mensaje motivacional */}
          <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl">
            {isPodium ? (
              <p className="flex items-center justify-center gap-2">
                <PartyPopper className="w-5 h-5 text-amber-500" />
                <span>Increible trabajo! Estas entre los mejores.</span>
                <PartyPopper className="w-5 h-5 text-amber-500" />
              </p>
            ) : percentile >= 50 ? (
              <p className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span>Excelente temporada! Sigue asi.</span>
              </p>
            ) : (
              <p className="flex items-center justify-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span>Cada temporada es una oportunidad. A por la proxima!</span>
              </p>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartir
            </Button>
            <Button
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Continuar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SeasonEndCelebration;
