import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Plus, Users, BookOpen, Award, ClipboardCheck, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useMyAcademySpaces } from '@/hooks/academy/useAcademySpaces';
import { useMyCertificates } from '@/hooks/academy/useAcademyCertificate';
import { useMyEnrollments } from '@/hooks/academy/useAcademyEnrollment';
import { ManualReviewQueue } from '@/components/academy/ManualReviewQueue';

type Tab = 'aprendiendo' | 'mis-academias' | 'certificados' | 'revisiones';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'aprendiendo', label: 'Aprendiendo', icon: BookOpen },
  { id: 'mis-academias', label: 'Mis academias', icon: GraduationCap },
  { id: 'certificados', label: 'Certificados', icon: Award },
  { id: 'revisiones', label: 'Revisiones', icon: ClipboardCheck },
];

export default function AcademiaDashboardPage() {
  const [tab, setTab] = useState<Tab>('aprendiendo');
  const { data: enrollments = [] } = useMyEnrollments();
  const { data: spaces = [] } = useMyAcademySpaces();
  const { data: certificates = [] } = useMyCertificates();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Mi panel de Academia</h1>
            <p className="text-sm text-zinc-400 mt-1">Gestiona tus cursos, academias y certificados</p>
          </div>
          <Link to="/academia/crear">
            <Button className="bg-purple-500 hover:bg-purple-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> Nueva academia
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Stat icon={BookOpen} label="Inscripciones" value={enrollments.length.toString()} />
          <Stat icon={GraduationCap} label="Mis academias" value={spaces.length.toString()} />
          <Stat icon={Award} label="Certificados" value={certificates.length.toString()} />
          <Stat
            icon={Trophy}
            label="Completados"
            value={enrollments.filter((e) => e.completed_at).length.toString()}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/10 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap',
                tab === id
                  ? 'border-purple-500 text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'aprendiendo' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.length === 0 ? (
              <EmptyState text="Aún no estás inscrito en ningún curso." />
            ) : (
              enrollments.map((en) => (
                <Card
                  key={en.id}
                  className="overflow-hidden bg-white/5 border-white/10 hover:border-purple-500/40 transition-colors"
                >
                  <Link to={`/academia/${en.course?.space?.slug}/${en.course?.slug}/learn`}>
                    {en.course?.cover_image_url ? (
                      <img src={en.course.cover_image_url} alt="" className="h-32 w-full object-cover" />
                    ) : (
                      <div className="h-32 w-full bg-gradient-to-br from-purple-500/20 to-cyan-500/10" />
                    )}
                    <div className="p-4">
                      <div className="text-xs text-zinc-500">{en.course?.space?.name}</div>
                      <h3 className="font-semibold text-zinc-100 mt-1 line-clamp-2">{en.course?.title}</h3>
                      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{ width: `${en.completion_pct}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{Math.round(en.completion_pct)}% completado</div>
                    </div>
                  </Link>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'mis-academias' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.length === 0 ? (
              <EmptyState text="Aún no has creado una academia." />
            ) : (
              spaces.map((s) => (
                <Card
                  key={s.id}
                  className="overflow-hidden bg-white/5 border-white/10 hover:border-purple-500/40 transition-colors"
                >
                  <Link to={`/academia/${s.slug}`}>
                    <div
                      className="h-24"
                      style={{
                        background: s.cover_image_url
                          ? `url(${s.cover_image_url}) center/cover`
                          : `linear-gradient(135deg, ${s.accent_color}40, transparent)`,
                      }}
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-zinc-100">{s.name}</h3>
                      <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {s.member_count}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                          {s.plan_slug === 'pro' ? 'Pro' : 'Hobby'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'certificados' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.length === 0 ? (
              <EmptyState text="Aún no has obtenido certificados." />
            ) : (
              certificates.map((c) => (
                <Card
                  key={c.id}
                  className="overflow-hidden bg-gradient-to-br from-purple-500/10 to-cyan-500/5 border-white/10 hover:border-purple-500/40 transition-colors"
                >
                  <Link to={`/cert/${c.cert_code}`}>
                    <div className="p-5">
                      <Award className="h-8 w-8 text-purple-400 mb-3" />
                      <div className="text-xs text-zinc-500 uppercase tracking-wide">
                        {(c as any).course?.space?.name}
                      </div>
                      <h3 className="font-bold text-zinc-100 mt-1 line-clamp-2">{c.course_title}</h3>
                      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                        <span>#{c.cert_code}</span>
                        <span>{new Date(c.issued_at).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                  </Link>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'revisiones' && (
          <div>
            {spaces.length === 0 ? (
              <EmptyState text="Necesitas tener al menos una academia con cursos." />
            ) : (
              <RevisionsByCourse spaceIds={spaces.map((s) => s.id)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4 bg-white/5 border-white/10">
      <Icon className="h-5 w-5 text-purple-400 mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-wide mt-0.5">{label}</div>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="col-span-full p-12 text-center bg-white/5 border-white/10 text-zinc-500">
      {text}
    </Card>
  );
}

function RevisionsByCourse({ spaceIds }: { spaceIds: string[] }) {
  // Por simplicidad, en MVP mostramos las revisiones del primer space
  // El instructor verá las pendientes de todos sus cursos via RLS
  void spaceIds;
  return (
    <div className="text-zinc-400 text-sm space-y-4">
      <p>
        Aquí aparecerán las preguntas abiertas y entregas de archivo que requieren tu revisión.
      </p>
      {/* En producción, agregar un selector de curso. Por ahora, pasamos un string vacío
          que filtrará por RLS basado en el instructor */}
      <ManualReviewQueue courseId="" />
    </div>
  );
}
