import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { SHARE_MESSAGES, type ShareMessage } from '@/lib/unlock-access/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ShareMessageCardProps {
  referralUrl: string;
  onCopy?: (messageType: string) => void;
}

function MessageCard({
  message,
  referralUrl,
  onCopy
}: {
  message: ShareMessage;
  referralUrl: string;
  onCopy?: (messageType: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const fullText = `${message.text}\n\n${referralUrl}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      onCopy?.(message.id);
      toast.success('Mensaje copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-200',
        copied
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{message.emoji}</span>
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              copied ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-white/70'
            )}>
              {message.label}
            </span>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            {message.text}
          </p>
        </div>
        <div className={cn(
          'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
          copied ? 'bg-emerald-500/30' : 'bg-white/5'
        )}>
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4 text-white/40" />
          )}
        </div>
      </div>
    </motion.button>
  );
}

export function ShareMessageCards({ referralUrl, onCopy }: ShareMessageCardProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/50 flex items-center gap-2">
        <span>Mensajes sugeridos - click para copiar</span>
      </p>
      {SHARE_MESSAGES.map((message) => (
        <MessageCard
          key={message.id}
          message={message}
          referralUrl={referralUrl}
          onCopy={onCopy}
        />
      ))}
    </div>
  );
}
