// ============================================================================
// Guard de acceso a páginas internas de academia (feed, classroom, calendar,
// leaderboard, members, map, etc.). Si el user NO es owner ni miembro activo,
// muestra SpaceJoinGate (gate de pago/registro).
//
// Defensa en profundidad: aunque alguien conozca la URL, no puede entrar sin
// suscripción activa. Combinado con webhooks de Stripe + cron de
// reconciliación, garantiza que cuando una sub se vence, el acceso se
// cierra automáticamente.
// ============================================================================

import { Lock } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { useMyMembership } from '@/hooks/academy/useAcademyJoinSpace';
import { useAuth } from '@/hooks/useAuth';
import { SpaceJoinGate } from '@/components/academy/join/SpaceJoinGate';
import { MandatoryOnboardingGate } from '@/components/academy/join/MandatoryOnboardingGate';

interface Props { children: React.ReactNode; }

export function RequireAcademyAccess({ children }: Props) {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const { data: space, isLoading: spaceLoading } = useAcademySpace(spaceSlug);
  const { data: myMembership, isLoading: memLoading } = useMyMembership(
    (space as any)?.id
  );

  if (authLoading || spaceLoading || memLoading) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center text-zinc-400">
        Cargando...
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Lock className="h-10 w-10" />
        <p>Esta academia no existe o no es pública.</p>
        <Link to="/academia" className="text-purple-400 hover:text-purple-300">
          Volver a Academia
        </Link>
      </div>
    );
  }

  const isOwner = !!user && (space as any).owner_id === user.id;
  const isActiveMember = !!myMembership?.is_active;

  if (!isOwner && !isActiveMember) {
    return <SpaceJoinGate space={space} />;
  }

  // Onboarding obligatorio para miembros (owner queda exento).
  if (!isOwner && isActiveMember && !myMembership?.onboarding_completed_at) {
    return (
      <MandatoryOnboardingGate
        spaceId={(space as any).id}
        spaceName={(space as any).name}
      />
    );
  }

  return <>{children}</>;
}
