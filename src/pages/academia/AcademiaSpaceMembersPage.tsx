import { useParams, Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { MembersGrid } from '@/components/academy/community/MembersGrid';
import { OnlineIndicator } from '@/components/academy/community/OnlineIndicator';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';

const KREOON_PURPLE = '#7c3aed';

export default function AcademiaSpaceMembersPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { data: space, isLoading } = useAcademySpace(spaceSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center text-zinc-400">
        Cargando creadores...
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

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 text-white">
              <span aria-hidden="true">👥</span> Creadores
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {space.member_count} miembros en {space.name}
            </p>
          </div>
          <OnlineIndicator spaceId={space.id} />
        </div>
        <MembersGrid
          spaceId={space.id}
          spaceOwnerId={space.owner_id}
          accentColor={KREOON_PURPLE}
        />
      </div>
    </div>
  );
}
