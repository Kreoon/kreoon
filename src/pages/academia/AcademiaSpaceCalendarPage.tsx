import { useParams } from 'react-router-dom';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { SpaceCalendarView } from '@/components/academy/calendar/SpaceCalendarView';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { useAuth } from '@/hooks/useAuth';

export default function AcademiaSpaceCalendarPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { user } = useAuth();
  const { data: space } = useAcademySpace(spaceSlug);
  const isOwner = !!user && !!space && user.id === space.owner_id;

  if (!space) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">
        Cargando calendario...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <h1 className="text-2xl font-bold mb-6">Calendario</h1>
        <SpaceCalendarView spaceId={space.id} isOwner={isOwner} accentColor={space.accent_color} />
      </div>
    </div>
  );
}
