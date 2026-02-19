import { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface ReferralShareCardProps {
  code: string | null;
  onGenerateCode?: () => Promise<void>;
  isGenerating?: boolean;
}

export function ReferralShareCard({ code, onGenerateCode, isGenerating }: ReferralShareCardProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const referralUrl = code ? `https://kreoon.com/r/${code}` : '';

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
    const text = encodeURIComponent(`Unete a KREOON con mi link de referido: ${referralUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareX = () => {
    const text = encodeURIComponent(`Unete a KREOON, la plataforma para creadores: ${referralUrl}`);
    window.open(`https://x.com/intent/tweet?text=${text}`, '_blank');
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

  return (
    <Card className="p-6">
      <h3 className="text-white font-semibold mb-4">Tu Link de Referido</h3>

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

      {/* Share buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={shareWhatsApp}>
          <Share2 className="w-4 h-4" />
          WhatsApp
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={shareX}>
          <Share2 className="w-4 h-4" />
          X (Twitter)
        </Button>
      </div>
    </Card>
  );
}
