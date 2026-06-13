import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useJoinSpace } from '@/hooks/academy/useAcademyJoinSpace';
import { useToast } from '@/hooks/use-toast';

const KREOON_PURPLE = '#7c3aed';

interface JoinSpaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceSlug: string;
  spaceName: string;
  spaceDescription?: string | null;
  spaceLogoUrl?: string | null;
  onJoined: () => void;
}

/**
 * Modal de "Unirme a la academia".
 * - Si el usuario no está autenticado → redirige a /auth con redirect.
 * - Si está autenticado → consent + join RPC + invoca onJoined.
 */
export function JoinSpaceModal({
  open,
  onOpenChange,
  spaceSlug,
  spaceName,
  spaceDescription,
  spaceLogoUrl,
  onJoined,
}: JoinSpaceModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const join = useJoinSpace();
  const [consent, setConsent] = useState(true);

  const referrerId = searchParams.get('ref') || null;
  const source = searchParams.get('utm_source') || searchParams.get('source') || null;

  async function handleJoin() {
    if (!user) {
      const redirectTo = `/academia/${spaceSlug}`;
      navigate(`/register?role=student&redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    try {
      const result = await join.mutateAsync({
        spaceSlug,
        consent,
        referrerId,
        source,
      });
      toast({
        title:
          result.status === 'joined'
            ? '🎉 ¡Bienvenido a la comunidad!'
            : result.status === 'reactivated'
              ? '👋 Te reactivamos en la academia'
              : 'Ya eras miembro',
        description:
          result.status === 'joined'
            ? `Acabas de unirte a ${spaceName}`
            : undefined,
      });
      onOpenChange(false);
      onJoined();
    } catch (e: any) {
      toast({
        title: 'No pudimos unirte',
        description: e?.message ?? 'Intenta de nuevo en un momento',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-2 border-white/10 bg-kreoon-bg-card">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-3">
            {spaceLogoUrl ? (
              <img
                src={spaceLogoUrl}
                alt={spaceName}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-white/10 shadow-xl"
              />
            ) : (
              <div
                className="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl border-2 border-white/10 shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${KREOON_PURPLE}40, ${KREOON_PURPLE}10)`,
                }}
                aria-hidden="true"
              >
                🎓
              </div>
            )}
            <div>
              <DialogTitle className="text-2xl font-extrabold text-white">
                Únete a {spaceName}
              </DialogTitle>
              {spaceDescription && (
                <DialogDescription className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  {spaceDescription}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Beneficios */}
          <ul className="space-y-2.5 text-sm">
            {[
              { emoji: '🎬', text: 'Acceso a todos los cursos gratuitos' },
              { emoji: '💬', text: 'Conversa con la comunidad' },
              { emoji: '🎥', text: 'Asiste a los lives semanales' },
              { emoji: '🏆', text: 'Sube de nivel y gana insignias' },
            ].map(({ emoji, text }) => (
              <li key={text} className="flex items-center gap-3 text-zinc-200">
                <span className="text-xl" aria-hidden="true">
                  {emoji}
                </span>
                {text}
              </li>
            ))}
          </ul>

          {user && (
            <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-purple-600"
              />
              <span className="text-xs text-zinc-300 leading-relaxed">
                Quiero recibir novedades por email de esta academia. Puedo desuscribirme en cualquier momento.
              </span>
            </label>
          )}

          <Button
            disabled={join.isPending}
            onClick={handleJoin}
            className="w-full h-12 rounded-2xl font-bold text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${KREOON_PURPLE}, #a855f7)`,
              boxShadow: `0 8px 24px -4px ${KREOON_PURPLE}80`,
            }}
          >
            {join.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : user ? (
              <>
                <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
                Unirme gratis
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
                Crear cuenta y unirme
              </>
            )}
          </Button>

          <p className="text-[10px] text-zinc-500 text-center">
            Al unirte aceptas los términos de uso de KREOON
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
