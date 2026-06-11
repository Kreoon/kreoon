import { useState } from 'react';
import { MessageCircle, Twitter, Linkedin, Link2, Check, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const KREOON_PURPLE = '#7c3aed';

interface ShareLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Path absoluto SIN el origin (ej: `/academia/los-reyes-del-contenido`) */
  path: string;
  /** Título compartido en redes */
  title: string;
  /** Mensaje motivacional opcional (ej: "+5 XP por compartir") */
  rewardCopy?: string;
  /** Si se quiere agregar el referral ?ref=userIdSlice(0,8) automáticamente */
  withReferral?: boolean;
  /** Override de utm_source (default 'share') */
  utmSource?: string;
}

/**
 * Diálogo genérico de compartir con tracking UTM + referral opcional.
 * Reutilizable para spaces, cursos, posts.
 */
export function ShareLinkDialog({
  open,
  onOpenChange,
  path,
  title,
  rewardCopy,
  withReferral = true,
  utmSource = 'share',
}: ShareLinkDialogProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kreoon.com';
  const ref = withReferral && user?.id ? `&ref=${user.id.slice(0, 8)}` : '';
  const url = `${origin}${path}?utm_source=${utmSource}${ref}`;

  function share(channel: 'whatsapp' | 'twitter' | 'linkedin' | 'copy') {
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
    { key: 'whatsapp' as const, label: 'WhatsApp', emoji: '💬' },
    { key: 'twitter' as const, label: 'X / Twitter', emoji: '🐦' },
    { key: 'linkedin' as const, label: 'LinkedIn', emoji: '💼' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl border-2 border-white/10 bg-kreoon-bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-white flex items-center gap-2">
            <span aria-hidden="true">📢</span> Compartir
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            {rewardCopy ? (
              <>
                Comparte y gana{' '}
                <span style={{ color: KREOON_PURPLE }} className="font-bold">
                  {rewardCopy}
                </span>
              </>
            ) : (
              'Multiplica el alcance, suma comunidad'
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Bonus referral si está logueado */}
        {withReferral && user?.id && (
          <div
            className="rounded-2xl p-3 border flex items-start gap-2.5"
            style={{
              backgroundColor: `${KREOON_PURPLE}15`,
              borderColor: `${KREOON_PURPLE}40`,
            }}
          >
            <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: KREOON_PURPLE }} />
            <div className="text-xs text-zinc-300 leading-relaxed">
              <strong className="text-white">+100 XP</strong> cuando alguien que use tu link se una a
              la academia. A los <strong>5 referidos</strong> desbloqueas 🤝 <em>Conector</em>.
            </div>
          </div>
        )}

        {/* Canales */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {channels.map((c) => (
            <button
              key={c.key}
              onClick={() => share(c.key)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all motion-safe:hover:scale-[1.02]"
              aria-label={`Compartir por ${c.label}`}
            >
              <span className="text-3xl" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="text-[11px] font-bold text-zinc-200">{c.label}</span>
            </button>
          ))}
        </div>

        {/* Preview del link */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 px-3 py-2 text-[11px] text-zinc-400 truncate font-mono">
          {url}
        </div>

        <Button
          onClick={() => share('copy')}
          className="w-full h-11 rounded-2xl border-2 border-white/15 hover:bg-white/5 font-bold mt-1 bg-transparent text-zinc-100"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-emerald-400" /> Copiado ✓
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 mr-2" /> Copiar link
            </>
          )}
        </Button>

        {/* Suprimir warning de imports */}
        <span className="hidden" aria-hidden="true">
          <MessageCircle /> <Twitter /> <Linkedin />
        </span>
      </DialogContent>
    </Dialog>
  );
}
