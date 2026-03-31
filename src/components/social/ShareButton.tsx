import { useState } from 'react';
import { Share2, Copy, Link2, Twitter, Send, Check, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ShareButtonProps {
  url?: string;
  title?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onShare?: () => void;
}

export function ShareButton({
  url,
  title = '',
  description = '',
  className,
  size = 'md',
  onShare,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
      onShare?.();
    } catch {
      toast.error('Error al copiar el link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
        onShare?.();
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(title || description);
    const encodedUrl = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`, '_blank');
    onShare?.();
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`${title}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    onShare?.();
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(title);
    const encodedUrl = encodeURIComponent(shareUrl);
    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${text}`, '_blank');
    onShare?.();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 text-muted-foreground transition-all duration-200",
            "hover:text-foreground hover:scale-110 active:scale-95",
            className
          )}
        >
          <Share2 className={sizes[size]} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="bg-card border border-border border-white/10 min-w-[200px]"
        align="center"
        side="top"
        sideOffset={8}
      >
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <DropdownMenuItem
              onClick={handleCopyLink}
              className="flex items-center gap-3 cursor-pointer hover:bg-white/10"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              <span>{copied ? 'Copiado!' : 'Copiar link'}</span>
            </DropdownMenuItem>

            {typeof navigator !== 'undefined' && navigator.share && (
              <DropdownMenuItem
                onClick={handleNativeShare}
                className="flex items-center gap-3 cursor-pointer hover:bg-white/10"
              >
                <Share2 className="h-4 w-4" />
                <span>Compartir...</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={handleWhatsAppShare}
              className="flex items-center gap-3 cursor-pointer hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4 text-green-500" />
              <span>WhatsApp</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleTwitterShare}
              className="flex items-center gap-3 cursor-pointer hover:bg-white/10"
            >
              <Twitter className="h-4 w-4 text-blue-400" />
              <span>Twitter / X</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleTelegramShare}
              className="flex items-center gap-3 cursor-pointer hover:bg-white/10"
            >
              <Send className="h-4 w-4 text-blue-500" />
              <span>Telegram</span>
            </DropdownMenuItem>
          </motion.div>
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
