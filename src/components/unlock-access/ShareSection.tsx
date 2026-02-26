import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Share2, X, MessageCircle, Send, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Mensaje amigable pre-personalizado
const SHARE_MESSAGE = `Hey! Encontré esta plataforma increíble donde puedes monetizar tu talento creando contenido. Se llama KREOON y están dando acceso anticipado con beneficios exclusivos GRATIS. Únete conmigo:`;

interface ShareSectionProps {
  referralLink: string;
}

export const ShareSection = memo(function ShareSection({
  referralLink
}: ShareSectionProps) {
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${SHARE_MESSAGE}\n\n${referralLink}`);
      setCopied(true);
      toast.success('¡Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Error al copiar');
    }
  };

  const handleShare = async () => {
    // Si el navegador soporta Web Share API, usarla directamente
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Únete a KREOON',
          text: SHARE_MESSAGE,
          url: referralLink
        });
        return;
      } catch {
        // User cancelled or error, fall through to show options
      }
    }
    // Si no, mostrar opciones manuales
    setShowOptions(true);
  };

  const shareOnWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${SHARE_MESSAGE}\n\n${referralLink}`)}`;
    window.open(url, '_blank');
    setShowOptions(false);
  };

  const shareOnTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(SHARE_MESSAGE)}`;
    window.open(url, '_blank');
    setShowOptions(false);
  };

  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${SHARE_MESSAGE}\n\n${referralLink}`)}`;
    window.open(url, '_blank');
    setShowOptions(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      {/* Main share button */}
      <motion.button
        onClick={handleShare}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'w-full py-4 px-6 rounded-2xl',
          'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500',
          'bg-[length:200%_100%]',
          'animate-gradient-x',
          'text-white font-bold text-lg',
          'shadow-lg shadow-purple-500/30',
          'hover:shadow-xl hover:shadow-purple-500/40',
          'flex items-center justify-center gap-3',
          'transition-shadow'
        )}
      >
        <Share2 className="w-5 h-5" />
        Invitar amigos
      </motion.button>

      <p className="text-xs text-white/40 mt-3">
        Comparte tu link y gana llaves cuando se registren
      </p>

      {/* Options modal */}
      <AnimatePresence>
        {showOptions && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptions(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
                'w-[90%] max-w-sm p-5',
                'bg-background border border-white/10 rounded-2xl',
                'shadow-2xl'
              )}
            >
              {/* Close button */}
              <button
                onClick={() => setShowOptions(false)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>

              <h3 className="text-lg font-bold text-white mb-4 text-center">
                Compartir en
              </h3>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {/* WhatsApp */}
                <motion.button
                  onClick={shareOnWhatsApp}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs text-white/70">WhatsApp</span>
                </motion.button>

                {/* Telegram */}
                <motion.button
                  onClick={shareOnTelegram}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs text-white/70">Telegram</span>
                </motion.button>

                {/* Twitter/X */}
                <motion.button
                  onClick={shareOnTwitter}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-white/20">
                    <span className="text-white font-bold text-lg">𝕏</span>
                  </div>
                  <span className="text-xs text-white/70">Twitter</span>
                </motion.button>
              </div>

              {/* Copy link option */}
              <motion.button
                onClick={handleCopyLink}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl',
                  'bg-white/5 hover:bg-white/10 border border-white/10',
                  'transition-colors',
                  copied && 'bg-green-500/10 border-green-500/20'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/70">Copiar link</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
