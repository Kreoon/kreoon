import { useParams, Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { SpaceFeed } from '@/components/academy/community/SpaceFeed';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';

export default function AcademiaSpaceFeedPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { data: space, isLoading } = useAcademySpace(spaceSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">
        Cargando comunidad...
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Lock className="h-10 w-10" />
        <p>Esta academia no existe o no es pública.</p>
        <Link to="/academia" className="text-purple-400 hover:text-purple-300">
          Volver a Academia
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <SpaceFeed spaceId={space.id} ownerId={space.owner_id} accentColor={space.accent_color} />
      </div>
    </div>
  );
}
