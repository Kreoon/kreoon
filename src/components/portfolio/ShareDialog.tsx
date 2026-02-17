import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy, Check, Share2, Twitter, Facebook, Linkedin, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolioAnalytics } from '@/analytics';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
  description?: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  url,
  title = 'Mira esto',
  description = '',
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const { trackPortfolioShared } = usePortfolioAnalytics();

  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareLinks = [
    {
      name: 'Twitter',
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'hover:bg-sky-500 hover:text-white',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:bg-blue-600 hover:text-white',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'hover:bg-blue-700 hover:text-white',
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color: 'hover:bg-green-500 hover:text-white',
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      trackPortfolioShared('unknown', 'clipboard');
      toast.success('Enlace copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Error al copiar');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: fullUrl,
        });
      } catch (error) {
        // User cancelled or error
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartir
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Native share button (mobile) */}
          {navigator.share && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleNativeShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartir...
            </Button>
          )}

          {/* Social share buttons */}
          <div className="grid grid-cols-4 gap-2">
            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-lg border transition-colors",
                  link.color
                )}
              >
                <link.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{link.name}</span>
              </a>
            ))}
          </div>

          {/* Copy link */}
          <div className="flex gap-2">
            <Input
              value={fullUrl}
              readOnly
              className="text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
