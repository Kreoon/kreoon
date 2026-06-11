import { useParams } from 'react-router-dom';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { SpaceCalendarView } from '@/components/academy/calendar/SpaceCalendarView';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { useAuth } from '@/hooks/useAuth';

const KREOON_PURPLE = '#7c3aed';

export default function AcademiaSpaceCalendarPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { user } = useAuth();
  const { data: space } = useAcademySpace(spaceSlug);
  const isOwner = !!user && !!space && user.id === space.owner_id;

  if (!space) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center text-zinc-400">
        Cargando calendario...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 text-white">
            <span aria-hidden="true">🎥</span> Lives
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Eventos en vivo, workshops y sesiones programadas
          </p>
        </div>
        <SpaceCalendarView spaceId={space.id} isOwner={isOwner} accentColor={KREOON_PURPLE} />
      </div>
    </div>
  );
}
