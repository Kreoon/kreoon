import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Share2, MessageCircle } from 'lucide-react';
import { GAME_SHARE_MESSAGES } from '@/lib/unlock-access/game-constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SummoningScrollProps {
  referralLink: string;
  onShare?: (method: string) => void;
}

type MessageStyle = keyof typeof GAME_SHARE_MESSAGES;

export const SummoningScroll = memo(function SummoningScroll({
  referralLink,
  onShare
}: SummoningScrollProps) {
  const [selectedStyle, setSelectedStyle] = useState<MessageStyle>('casual');
  const [copied, setCopied] = useState(false);
  const [isUnrolled, setIsUnrolled] = useState(true);

  const currentMessage = GAME_SHARE_MESSAGES[selectedStyle];
  const fullMessage = `${currentMessage.text}\n\n${referralLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      toast.success('Mensaje copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
      onShare?.('copy');
    } catch {
      toast.error('Error al copiar');
    }
  };

  const handleWhatsAppShare = () => {
    const encodedMessage = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    onShare?.('whatsapp');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Unete a KREOON',
          text: currentMessage.text,
          url: referralLink
        });
        onShare?.('native');
      } catch {
        // User cancelled
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Magical aura */}
      <motion.div
        animate={{
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.02, 1]
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent rounded-3xl blur-xl"
      />

      {/* Scroll container */}
      <div className={cn(
        'relative rounded-3xl overflow-hidden',
        'bg-gradient-to-b from-amber-900/20 via-amber-950/30 to-slate-900/80',
        'border-2 border-amber-700/30'
      )}>
        {/* Scroll header */}
        <motion.div
          onClick={() => setIsUnrolled(!isUnrolled)}
          className={cn(
            'cursor-pointer p-4 sm:p-5',
            'bg-gradient-to-r from-amber-800/30 via-amber-700/20 to-amber-800/30',
            'border-b border-amber-700/20'
          )}
          whileHover={{ backgroundColor: 'rgba(180, 83, 9, 0.2)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ rotate: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-2xl"
              >
                📜
              </motion.span>
              <div>
                <h3 className="font-bold text-amber-200 text-lg">
                  Pergamino de Invocacion
                </h3>
                <p className="text-xs text-amber-300/60">
                  Usa este hechizo para convocar Guardianes
                </p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: isUnrolled ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-amber-400/50"
            >
              ▼
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll content */}
        <AnimatePresence>
          {isUnrolled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 sm:p-6 space-y-5">
                {/* Message style selector */}
                <div>
                  <label className="text-xs text-amber-300/70 block mb-2">
                    Estilo del hechizo:
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(GAME_SHARE_MESSAGES) as MessageStyle[]).map((style) => {
                      const msg = GAME_SHARE_MESSAGES[style];
                      return (
                        <motion.button
                          key={style}
                          onClick={() => setSelectedStyle(style)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            'px-3 py-2 rounded-sm text-sm font-medium',
                            'border transition-all',
                            selectedStyle === style
                              ? 'bg-purple-500/30 border-purple-400/50 text-purple-200'
                              : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                          )}
                        >
                          <span className="mr-1.5">{msg.emoji}</span>
                          {msg.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Message preview */}
                <div className={cn(
                  'relative p-4 rounded-sm',
                  'bg-gradient-to-br from-slate-800/50 to-slate-900/50',
                  'border border-white/10'
                )}>
                  <div className="absolute top-2 right-2">
                    <span className="text-xl">{currentMessage.emoji}</span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed pr-8">
                    {currentMessage.text}
                  </p>
                  <div className={cn(
                    'mt-3 p-2 rounded-sm',
                    'bg-purple-500/10 border border-purple-500/20'
                  )}>
                    <p className="text-purple-300 text-xs font-mono truncate">
                      {referralLink}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Copy button */}
                  <motion.button
                    onClick={handleCopy}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 px-4 rounded-sm',
                      'font-medium text-sm',
                      'transition-all',
                      copied
                        ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                        : 'bg-white/10 border border-white/20 text-white hover:bg-white/15'
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar
                      </>
                    )}
                  </motion.button>

                  {/* WhatsApp button */}
                  <motion.button
                    onClick={handleWhatsAppShare}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 px-4 rounded-sm',
                      'font-medium text-sm',
                      'bg-green-600/20 border border-green-500/30',
                      'text-green-300 hover:bg-green-600/30',
                      'transition-all'
                    )}
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </motion.button>

                  {/* Native share (if available) */}
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <motion.button
                      onClick={handleNativeShare}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'flex items-center justify-center gap-2 py-3 px-4 rounded-sm',
                        'font-medium text-sm',
                        'bg-purple-500/20 border border-purple-500/30',
                        'text-purple-300 hover:bg-purple-500/30',
                        'transition-all',
                        'col-span-2 sm:col-span-1'
                      )}
                    >
                      <Share2 className="w-4 h-4" />
                      Compartir
                    </motion.button>
                  )}
                </div>

                {/* Magic hint */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center text-xs text-amber-400/50"
                >
                  ✨ Cada Guardian invocado te acerca al titulo de Fundador ✨
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
