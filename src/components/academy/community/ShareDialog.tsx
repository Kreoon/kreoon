import { useState } from 'react';
import { MessageCircle, Twitter, Linkedin, Link2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTrackShare } from '@/hooks/academy/useAcademyJoinSpace';

const KREOON_PURPLE = '#7c3aed';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postTitle?: string | null;
  postSummary?: string;
  spaceSlug: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  postId,
  postTitle,
  postSummary,
  spaceSlug,
}: ShareDialogProps) {
  const track = useTrackShare();
  const [copied, setCopied] = useState(false);

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/academia/${spaceSlug}/feed?post=${postId}&utm_source=share`
    : `/academia/${spaceSlug}/feed?post=${postId}`;

  const title = (postTitle ?? postSummary ?? '¡Mira este post de la comunidad!').slice(0, 200);

  function share(channel: 'whatsapp' | 'twitter' | 'linkedin' | 'copy') {
    track.mutate({ postId, sharedTo: channel });

    if (channel === 'whatsapp') {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
        '_blank',
        'noopener,noreferrer'
      );
    } else if (channel === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
        '_blank',
        'noopener,noreferrer'
      );
    } else if (channel === 'linkedin') {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        '_blank',
        'noopener,noreferrer'
      );
    } else if (channel === 'copy') {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  const channels = [
    { key: 'whatsapp' as const, label: 'WhatsApp', emoji: '💬', icon: MessageCircle, color: '#25D366' },
    { key: 'twitter' as const, label: 'X / Twitter', emoji: '🐦', icon: Twitter, color: '#000000' },
    { key: 'linkedin' as const, label: 'LinkedIn', emoji: '💼', icon: Linkedin, color: '#0A66C2' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl border-2 border-white/10 bg-kreoon-bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-white flex items-center gap-2">
            <span aria-hidden="true">📢</span> Compartir
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            Multiplica el alcance — y ganas <span style={{ color: KREOON_PURPLE }} className="font-bold">+5 XP</span> por compartir.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 mt-2">
          {channels.map((c) => (
            <button
              key={c.key}
              onClick={() => share(c.key)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all motion-safe:hover:scale-[1.02]"
            >
              <span className="text-3xl" aria-hidden="true">{c.emoji}</span>
              <span className="text-[11px] font-bold text-zinc-200">{c.label}</span>
            </button>
          ))}
        </div>

        <Button
          onClick={() => share('copy')}
          variant="outline"
          className="w-full h-11 rounded-2xl border-2 border-white/15 hover:bg-white/5 font-bold mt-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-emerald-400" /> Copiado
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 mr-2" /> Copiar link
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
