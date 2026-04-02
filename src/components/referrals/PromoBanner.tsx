import { useEffect, useState } from 'react';
import { Clock, Gift, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { PromotionalCampaign } from '@/types/unified-finance.types';

interface PromoBannerProps {
  campaign: PromotionalCampaign;
  compact?: boolean;
}

function useCountdown(endDate: string) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const now = Date.now();
      const end = new Date(endDate).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Finalizado');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    }

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  return timeLeft;
}

export function PromoBanner({ campaign, compact = false }: PromoBannerProps) {
  const timeLeft = useCountdown(campaign.end_date);
  const badgeColor = campaign.promo_badge_color || '#9333ea';

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${badgeColor}20`, color: badgeColor }}
      >
        <Sparkles className="w-3 h-3" />
        {campaign.promo_badge_text || campaign.name}
        <span className="opacity-60">| {timeLeft}</span>
      </div>
    );
  }

  return (
    <Card
      className="relative overflow-hidden p-5"
      style={{
        background: `linear-gradient(135deg, ${badgeColor}15, ${badgeColor}05)`,
        borderColor: `${badgeColor}30`,
      }}
    >
      {/* Badge */}
      <div
        className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
        style={{ backgroundColor: `${badgeColor}30`, color: badgeColor }}
      >
        {campaign.promo_badge_text || 'PROMO'}
      </div>

      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${badgeColor}20` }}
        >
          <Gift className="w-5 h-5" style={{ color: badgeColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm">{campaign.name}</h3>
          {campaign.description && (
            <p className="text-white/50 text-xs mt-1 line-clamp-2">{campaign.description}</p>
          )}

          {/* Benefits */}
          <div className="flex flex-wrap gap-2 mt-3">
            {campaign.referred_discount_percent > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-medium">
                {campaign.referred_discount_percent}% OFF
              </span>
            )}
            {campaign.referred_bonus_coins > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-medium">
                +{campaign.referred_bonus_coins} Tokens IA
              </span>
            )}
            {campaign.referral_extra_free_months > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-medium">
                +{campaign.referral_extra_free_months} {campaign.referral_extra_free_months === 1 ? 'mes' : 'meses'} gratis
              </span>
            )}
          </div>

          {/* Countdown + availability */}
          <div className="flex items-center gap-3 mt-3 text-[10px] text-white/40">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Termina en {timeLeft}
            </span>
            {campaign.max_redemptions && (
              <span>
                {campaign.max_redemptions - campaign.current_redemptions} cupos disponibles
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
