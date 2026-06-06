import { useParams } from 'react-router-dom';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { SpaceLeaderboard } from '@/components/academy/community/SpaceLeaderboard';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';

export default function AcademiaLeaderboardPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { data: space } = useAcademySpace(spaceSlug);

  if (!space) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">
        Cargando ranking...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>
        <SpaceLeaderboard spaceId={space.id} accentColor={space.accent_color} />
      </div>
    </div>
  );
}
