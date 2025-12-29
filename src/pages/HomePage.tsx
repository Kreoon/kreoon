import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { 
  Brain, 
  Video, 
  Globe, 
  Bot, 
  Trophy, 
  Users, 
  Palette, 
  Building2, 
  Megaphone, 
  GraduationCap,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  FolderKanban,
  Network,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

function getDashboardPath(roles: string[], activeRole?: string | null): string {
  if (roles.length === 0) return '/pending-access';
  if (activeRole && roles.includes(activeRole)) {
    switch (activeRole) {
      case 'admin':
      case 'ambassador':
        return '/dashboard';
      case 'strategist':
        return '/strategist-dashboard';
      case 'creator':
        return '/creator-dashboard';
      case 'editor':
        return '/editor-dashboard';
      case 'client':
        return '/client-dashboard';
    }
  }
  if (roles.includes('admin')) return '/dashboard';
  if (roles.includes('ambassador')) return '/dashboard';
  if (roles.includes('strategist')) return '/strategist-dashboard';
  if (roles.includes('creator')) return '/creator-dashboard';
  if (roles.includes('editor')) return '/editor-dashboard';
  if (roles.includes('client')) return '/client-dashboard';
  return '/pending-access';
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading, rolesLoaded, roles, activeRole } = useAuth();

  useEffect(() => {
    // SEO (simple per-route metadata without extra deps)
    const title = 'KREOON | Creative Operating System';
    const description = 'KREOON: sistema operativo creativo para gestionar creadores, contenido, proyectos y resultados en un solo lugar.';
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);
  }, []);

  useEffect(() => {
    // If logged in, send the user to the right dashboard (avoid showing landing page)
    if (user && !loading && rolesLoaded) {
      navigate(getDashboardPath(roles, activeRole), { replace: true });
    }
  }, [user, loading, rolesLoaded, roles, activeRole, navigate]);

  const modules = [
    {
      icon: LayoutDashboard,
      name: 'Board',
      description: 'Tablero Kanban inteligente para flujos de trabajo creativos',
    },
    {
      icon: FolderKanban,
      name: 'Projects',
      description: 'Gestión completa de contenido y proyectos',
    },
    {
      icon: Network,
      name: 'Network',
      description: 'Red social profesional y portafolios públicos',
    },
    {
      icon: Bot,
      name: 'IA',
      description: 'Asistentes y automatización con inteligencia artificial',
    },
    {
      icon: Trophy,
      name: 'UP',
      description: 'Gamificación, puntos y ranking de rendimiento',
    }
  ];

  const audiences = [
    {
      icon: Video,
      title: 'Creadores',
      description: 'Gestiona tu contenido, clientes y portafolio profesional',
    },
    {
      icon: Palette,
      title: 'Editores',
      description: 'Organiza proyectos, deadlines y colaboraciones',
    },
    {
      icon: Building2,
      title: 'Agencias',
      description: 'Opera equipos, clientes y producción a escala',
    },
    {
      icon: Megaphone,
      title: 'Marcas',
      description: 'Conecta con creadores y gestiona campañas',
    },
    {
      icon: GraduationCap,
      title: 'Comunidades',
      description: 'Administra miembros, contenido y crecimiento',
    }
  ];

  const features = [
    {
      icon: Brain,
      title: 'Sistema operativo creativo',
      description: 'Todo tu flujo de trabajo en un solo lugar'
    },
    {
      icon: Video,
      title: 'Gestión de contenido',
      description: 'Del brief al video publicado, todo trazable'
    },
    {
      icon: Globe,
      title: 'Red social profesional',
      description: 'Portafolio público y networking'
    },
    {
      icon: Bot,
      title: 'IA integrada',
      description: 'Automatiza guiones, asignaciones y más'
    },
    {
      icon: Trophy,
      title: 'Gamificación',
      description: 'Puntos, logros y rankings que motivan'
    }
  ];

  const dashboardPath = getDashboardPath(roles, activeRole);

  if (user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="px-4 pt-10">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-left"
              aria-label="Ir a inicio"
            >
              <span className="text-lg font-semibold text-gradient-violet">KREOON</span>
            </button>
            <Button variant="outline" onClick={() => navigate('/settings')}>
              Configuración
            </Button>
          </div>
        </header>

        <main className="px-4 py-16">
          <section className="max-w-5xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
              <div className="absolute inset-0 bg-gradient-glow opacity-60 pointer-events-none" />
              <div className="relative p-8 md:p-12">
                <p className="text-sm text-muted-foreground mb-2">Sesión activa</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  Continuar en tu panel
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                  Ya estás logueado. Te llevamos automáticamente a tu dashboard, o puedes entrar manualmente.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button size="lg" onClick={() => navigate(dashboardPath, { replace: true })}>
                    Ir al dashboard
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/social')}>
                    Abrir red social
                  </Button>
                </div>

                <div className="mt-6 text-sm text-muted-foreground">
                  Si te quedas aquí, en segundos te redirigimos automáticamente…
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Hero Section */}
      <main>
        <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-gradient-violet">
              KREOON
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-2xl md:text-4xl font-light text-primary/80 mb-6">
            Creative Operating System
          </p>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Gestiona creadores, contenido, proyectos y resultados desde un solo sistema.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl glow-violet transition-all hover:scale-105"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Crear organización
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/auth')}
              className="border-border text-muted-foreground hover:text-foreground hover:border-primary/50 px-8 py-6 text-lg rounded-xl transition-all hover:scale-105"
            >
              <Users className="w-5 h-5 mr-2" />
              Unirme o crear cuenta
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-border flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
        </section>
      </main>

      {/* What is KREOON Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
              ¿Qué es KREOON?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Un ecosistema completo para operar tu creación como un negocio profesional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="bg-card border-border hover:border-primary/30 transition-all duration-200 group card-hover"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-all">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-foreground font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-24 px-4 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
              Módulos
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Un ecosistema integrado donde cada módulo potencia tu operación
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module, index) => (
              <Card 
                key={index}
                className="bg-card border-border hover:border-primary/30 transition-all duration-200 group card-hover overflow-hidden"
              >
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:bg-primary/20">
                    <module.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{module.name}</h3>
                  <p className="text-muted-foreground">{module.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Who Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
              ¿Para quién es KREOON?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Diseñado para todos los roles del ecosistema creativo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {audiences.map((audience, index) => (
              <Card 
                key={index}
                className="bg-card border-border hover:border-primary/30 transition-all duration-200 group cursor-pointer card-hover"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-all">
                    <audience.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-foreground font-bold mb-2">{audience.title}</h3>
                  <p className="text-muted-foreground text-sm">{audience.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative bg-card border border-border rounded-3xl p-12 md:p-16">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
                <Zap className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
                Empieza a operar tu creación como un sistema
              </h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
                Únete a KREOON y transforma tu proceso creativo en una operación profesional y escalable.
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate('/register')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-7 text-xl rounded-xl glow-violet transition-all hover:scale-105"
              >
                Crear mi organización
                <ArrowRight className="w-6 h-6 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-2xl font-bold text-gradient-violet mb-2">
            KREOON
          </p>
          <p className="text-muted-foreground text-sm">
            Creative Operating System © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
