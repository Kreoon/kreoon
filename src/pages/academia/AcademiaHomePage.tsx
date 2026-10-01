import { Link } from 'react-router-dom';
import { GraduationCap, Sparkles, Users, Award, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePublicAcademySpaces } from '@/hooks/academy/useAcademySpaces';
import { useMyEnrollments } from '@/hooks/academy/useAcademyEnrollment';
import { useAuth } from '@/hooks/useAuth';

export default function AcademiaHomePage() {
  const { user } = useAuth();
  const { data: spaces = [], isLoading } = usePublicAcademySpaces();
  const { data: enrollments = [] } = useMyEnrollments();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/10 p-8 md:p-12 mb-10">
          <div className="absolute -top-20 -right-20 h-60 w-60 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs uppercase tracking-wider mb-3">
                <Sparkles className="h-3 w-3" /> Academia
              </div>
              <h1 className="text-3xl md:text-5xl font-bold mb-2">Aprende. Enseña. Certifícate.</h1>
              <p className="text-muted-foreground max-w-2xl">
                Cursos, evaluaciones y certificados para creadores. Crea tu academia o aprende con los mejores mentores.
              </p>
            </div>
            <Link to="/academia/crear">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" /> Crea tu Academia
              </Button>
            </Link>
          </div>
        </div>

        {/* Mis cursos */}
        {user && enrollments.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Continúa aprendiendo</h2>
              <Link to="/academia/dashboard" className="text-sm text-primary hover:text-primary/80">
                Ver todo
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrollments.slice(0, 6).map((en) => (
                <Card
                  key={en.id}
                  className="overflow-hidden bg-muted/50 border-border hover:border-primary/40 transition-colors"
                >
                  <Link to={`/academia/${en.course?.space?.slug}/${en.course?.slug}/learn`}>
                    {en.course?.cover_image_url ? (
                      <img src={en.course.cover_image_url} alt="" className="h-32 w-full object-cover" />
                    ) : (
                      <div className="h-32 w-full bg-gradient-to-br from-primary/30 to-cyan-500/20 flex items-center justify-center">
                        <GraduationCap className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">{en.course?.space?.name}</div>
                      <h3 className="font-semibold text-foreground mt-1 line-clamp-2">{en.course?.title}</h3>
                      <div className="mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${en.completion_pct}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{Math.round(en.completion_pct)}% completado</div>
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Explorar academias */}
        <section>
          <h2 className="text-xl font-bold mb-4">Explora academias</h2>
          {isLoading ? (
            <div className="text-muted-foreground">Cargando...</div>
          ) : spaces.length === 0 ? (
            <Card className="p-8 text-center bg-muted/50 border-border">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Aún no hay academias públicas.</p>
              <Link to="/academia/crear">
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  Crea la primera
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {spaces.map((space) => (
                <Link to={`/academia/${space.slug}`} key={space.id}>
                  <Card className="overflow-hidden bg-muted/50 border-border hover:border-primary/40 transition-colors h-full">
                    {space.cover_image_url ? (
                      <img src={space.cover_image_url} alt="" className="h-32 w-full object-cover" />
                    ) : (
                      <div
                        className="h-32 w-full"
                        style={{
                          background: `linear-gradient(135deg, ${space.accent_color}40, transparent)`,
                        }}
                      />
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {space.logo_url && (
                          <img src={space.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        )}
                        <h3 className="font-semibold text-foreground">{space.name}</h3>
                      </div>
                      {space.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{space.description}</p>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {space.member_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="h-3 w-3" /> {space.plan_slug === 'pro' ? 'Pro' : 'Hobby'}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
