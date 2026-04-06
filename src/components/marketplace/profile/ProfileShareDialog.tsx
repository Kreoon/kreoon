import { useState } from 'react';
import { Copy, Check, Twitter, Facebook, Linkedin, MessageCircle, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProfileShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    slug: string;
    display_name: string;
    primary_role?: string | null;
  };
}

interface ShareOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  hoverColor: string;
  getUrl: (shareUrl: string, shareText: string) => string;
}

// ─── Share Options ─────────────────────────────────────────────────────────────

const SHARE_OPTIONS: ShareOption[] = [
  {
    id: 'twitter',
    label: 'Twitter / X',
    icon: Twitter,
    color: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
    getUrl: (url, text) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    color: 'bg-[#1877F2]',
    hoverColor: 'hover:bg-[#166FE5]',
    getUrl: (url) => `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-[#0A66C2]',
    hoverColor: 'hover:bg-[#004182]',
    getUrl: (url) => `https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    color: 'bg-[#25D366]',
    hoverColor: 'hover:bg-[#20BD5A]',
    getUrl: (url, text) =>
      `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function ProfileShareDialog({
  open,
  onOpenChange,
  profile,
}: ProfileShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shareUrl = `https://kreoon.com/@${profile.slug}`;
  const shareText = `${profile.display_name}${profile.primary_role ? ` - ${profile.primary_role}` : ''} en Kreoon`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link copiado',
        description: 'El enlace se ha copiado al portapapeles',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el enlace',
        variant: 'destructive',
      });
    }
  };

  const handleShare = (option: ShareOption) => {
    const url = option.getUrl(shareUrl, shareText);
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Compartir perfil</DialogTitle>
          <DialogDescription className="text-gray-400">
            Comparte el perfil de {profile.display_name} en tus redes sociales
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-2">
            {SHARE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.id}
                  onClick={() => handleShare(option)}
                  className={`${option.color} ${option.hoverColor} text-white justify-start gap-2`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>

          {/* Copy link */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400">O copia el enlace directo:</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  readOnly
                  value={shareUrl}
                  className="pl-9 bg-gray-900 border-gray-700 text-gray-300 text-sm"
                />
              </div>
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="border-gray-700 hover:bg-gray-800"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
