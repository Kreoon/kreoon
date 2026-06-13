import { useParams } from 'react-router-dom';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { SpaceMap } from '@/components/academy/community/SpaceMap';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';

const KREOON_PURPLE = '#7c3aed';

export default function AcademiaMapPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { data: space } = useAcademySpace(spaceSlug);

  if (!space) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center text-zinc-400">
        Cargando mundo...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 text-white">
            <span aria-hidden="true">🌎</span> Mundo
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Mapa de los creadores de esta academia
          </p>
        </div>
        <SpaceMap spaceId={space.id} accentColor={KREOON_PURPLE} />
      </div>
    </div>
  );
}
