import { useParams } from 'react-router-dom';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { SpaceLeaderboard } from '@/components/academy/community/SpaceLeaderboard';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';

const KREOON_PURPLE = '#7c3aed';

export default function AcademiaLeaderboardPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { data: space } = useAcademySpace(spaceSlug);

  if (!space) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center text-zinc-400">
        Cargando ranking...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 text-white">
            <span aria-hidden="true">👑</span> Ranking
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Los miembros más activos de esta semana, mes y siempre
          </p>
        </div>
        <SpaceLeaderboard spaceId={space.id} accentColor={KREOON_PURPLE} />
      </div>
    </div>
  );
}
