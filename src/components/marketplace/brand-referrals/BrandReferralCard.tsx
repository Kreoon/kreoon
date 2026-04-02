import { useState } from 'react';
import { Copy, Check, Gift, DollarSign, Clock, Share2 } from 'lucide-react';
import { useBrandCredits } from '@/hooks/useMarketplaceCampaigns';
import { BRAND_REFERRAL_CREDIT } from '@/lib/finance/constants';

interface BrandReferralCardProps {
  brandId: string;
  brandSlug?: string;
}

export function BrandReferralCard({ brandId, brandSlug }: BrandReferralCardProps) {
  const { credits, transactions, loading } = useBrandCredits(brandId);
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/marca-referida?ref=${brandSlug || brandId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Te recomiendo KREOON para crear campanas con creadores de contenido. Usa mi link y ambos recibimos $${BRAND_REFERRAL_CREDIT.amount} de credito: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  return (
    <div className="bg-card/80 border border-white/10 rounded-sm p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-sm bg-green-500/15 flex items-center justify-center">
          <Gift className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Referidos B2B</h3>
          <p className="text-gray-500 text-xs">Gana ${BRAND_REFERRAL_CREDIT.amount} {BRAND_REFERRAL_CREDIT.currency} por cada marca referida</p>
        </div>
      </div>

      {/* Credit balance */}
      <div className="bg-white/5 rounded-sm p-4 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs">Credito disponible</p>
          <p className="text-2xl font-bold text-green-400">
            ${credits?.balance?.toFixed(2) || '0.00'} <span className="text-sm text-gray-500">USD</span>
          </p>
        </div>
        <DollarSign className="h-8 w-8 text-green-500/30" />
      </div>

      {/* Referral link */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Tu link de referido</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm text-gray-300 truncate"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/15 text-white text-sm px-3 py-2 rounded-sm transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleShareWhatsApp}
          className="flex-1 flex items-center justify-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-300 text-sm py-2.5 rounded-sm transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          WhatsApp
        </button>
        <button
          onClick={handleShareLinkedIn}
          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-sm py-2.5 rounded-sm transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          LinkedIn
        </button>
      </div>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div>
          <h4 className="text-white font-medium text-xs mb-2">Historial reciente</h4>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-gray-600" />
                  <span className="text-gray-400">{tx.description || tx.source}</span>
                </div>
                <span className={tx.type === 'earned' ? 'text-green-400' : 'text-red-400'}>
                  {tx.type === 'earned' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
