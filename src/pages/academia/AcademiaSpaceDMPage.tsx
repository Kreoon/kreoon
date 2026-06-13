import { useParams, Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { AcademyDMPanel } from '@/components/academy/dm/AcademyDMPanel';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';

export default function AcademiaSpaceDMPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { data: space, isLoading } = useAcademySpace(spaceSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center text-zinc-400">
        Cargando mensajes...
      </div>
    );
  }
  if (!space) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Lock className="h-10 w-10" />
        <p>Esta academia no existe.</p>
        <Link to="/academia" className="text-purple-400 hover:text-purple-300">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Mensajes</h1>
        <p className="text-xs text-zinc-500 mb-4">
          Estudiantes y clientes solo pueden chatear con administradores. Creadores y editores pueden chatear libremente.
        </p>
        <AcademyDMPanel spaceId={(space as any).id} />
      </div>
    </div>
  );
}
