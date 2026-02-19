import { useState } from 'react';
import { Copy, Check, Share2, Mail, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { SHARE_MESSAGES, REFERRAL_BILATERAL } from '@/lib/finance/constants';
import { PromoBanner } from '@/components/referrals/PromoBanner';
import type { PromotionalCampaign } from '@/types/unified-finance.types';

interface ReferralShareCardProps {
  code: string | null;
  onGenerateCode?: () => Promise<void>;
  isGenerating?: boolean;
  audience?: 'talent' | 'brand';
  activePromo?: PromotionalCampaign | null;
}

export function ReferralShareCard({
  code,
  onGenerateCode,
  isGenerating,
  audience = 'talent',
  activePromo,
}: ReferralShareCardProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const referralUrl = code ? `https://kreoon.com/r/${code}` : '';
  const messages = SHARE_MESSAGES[audience];

  const fillTemplate = (template: string) =>
    template.replace(/{URL}/g, referralUrl).replace(/{CODE}/g, code || '');

  const copyToClipboard = async (text: string, type: 'code' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
      toast.success('Copiado al portapapeles');
    } catch {
      toast.error('Error al copiar');
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(fillTemplate(messages.whatsapp));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareX = () => {
    const text = encodeURIComponent(fillTemplate(messages.twitter));
    window.open(`https://x.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareLinkedIn = () => {
    const text = encodeURIComponent(fillTemplate(messages.linkedin));
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}&summary=${text}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(messages.email_subject);
    const body = encodeURIComponent(fillTemplate(messages.email_body));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  if (!code) {
    return (
      <Card className="p-6">
        <h3 className="text-white font-semibold mb-3">Tu Link de Referido</h3>
        <p className="text-white/50 text-sm mb-4">Genera tu codigo para empezar a invitar personas.</p>
        <Button
          onClick={onGenerateCode}
          disabled={isGenerating}
          variant="glow"
          className="w-full"
        >
          {isGenerating ? 'Generando...' : 'Generar Codigo de Referido'}
        </Button>
      </Card>
    );
  }

  const discountPercent = activePromo?.referred_discount_percent || REFERRAL_BILATERAL.referred_discount_percent;
  const bonusCoins = activePromo?.referred_bonus_coins || REFERRAL_BILATERAL.referred_welcome_coins;

  return (
    <Card className="p-6">
      <h3 className="text-white font-semibold mb-4">Tu Link de Referido</h3>

      {/* Rewards preview */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
          Quien use tu link recibe: {discountPercent}% OFF
        </span>
        <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">
          + {bonusCoins} Kreoon Coins
        </span>
      </div>

      {/* Code display */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-mono text-sm text-purple-300 truncate">
          {code}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => copyToClipboard(code, 'code')}
        >
          {copiedCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      {/* URL display */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/60 truncate">
          {referralUrl}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => copyToClipboard(referralUrl, 'url')}
        >
          {copiedUrl ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      {/* 5 Share buttons */}
      <div className="grid grid-cols-5 gap-2">
        <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-2" onClick={shareWhatsApp}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-green-400" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span className="text-[10px]">WhatsApp</span>
        </Button>

        <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-2" onClick={shareX}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="text-[10px]">X</span>
        </Button>

        <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-2" onClick={shareLinkedIn}>
          <Linkedin className="w-4 h-4 text-blue-400" />
          <span className="text-[10px]">LinkedIn</span>
        </Button>

        <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-2" onClick={shareEmail}>
          <Mail className="w-4 h-4 text-orange-400" />
          <span className="text-[10px]">Email</span>
        </Button>

        <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-2" onClick={() => copyToClipboard(referralUrl, 'url')}>
          <Share2 className="w-4 h-4 text-purple-400" />
          <span className="text-[10px]">Copiar</span>
        </Button>
      </div>

      {/* Active promo badge */}
      {activePromo && (
        <div className="mt-4">
          <PromoBanner campaign={activePromo} compact />
        </div>
      )}
    </Card>
  );
}
