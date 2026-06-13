import { useParams, Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { SpaceFeed } from '@/components/academy/community/SpaceFeed';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { ActivitySidebar } from '@/components/academy/live/ActivitySidebar';
import { useAcademyLiveContent } from '@/hooks/academy/useAcademyLive';

const KREOON_PURPLE = '#7c3aed';

export default function AcademiaSpaceFeedPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { data: space, isLoading } = useAcademySpace(spaceSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center text-zinc-400">
        Cargando comunidad...
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

  return <FeedWithLive space={space} spaceSlug={spaceSlug!} />;
}

function FeedWithLive({ space, spaceSlug }: { space: any; spaceSlug: string }) {
  // Activa Realtime para posts/comments/points del space.
  useAcademyLiveContent(space.id);

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug} />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <div className="mb-5">
            <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 text-white">
              <span aria-hidden="true">💬</span> Feed
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Lo que comparte la comunidad de {space.name}
            </p>
          </div>
          <SpaceFeed spaceId={space.id} ownerId={space.owner_id} accentColor={KREOON_PURPLE} />
        </div>
        <ActivitySidebar
          spaceId={space.id}
          className="hidden lg:flex h-[calc(100vh-180px)] sticky top-[80px]"
        />
      </div>
    </div>
  );
}
