import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export default function HomePage() {
  const navigate = useNavigate();

  const modules = [
    {
      icon: LayoutDashboard,
      name: 'KREOON Board',
      description: 'Tablero Kanban inteligente para flujos de trabajo creativos',
      color: 'from-violet-500 to-purple-600'
    },
    {
      icon: FolderKanban,
      name: 'KREOON Projects',
      description: 'Gestión completa de contenido y proyectos',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Network,
      name: 'KREOON Network',
      description: 'Red social profesional y portafolios públicos',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: Bot,
      name: 'KREOON IA',
      description: 'Asistentes y automatización con inteligencia artificial',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      icon: Trophy,
      name: 'KREOON UP',
      description: 'Gamificación, puntos y ranking de rendimiento',
      color: 'from-amber-500 to-orange-500'
    }
  ];

  const audiences = [
    {
      icon: Video,
      title: 'Creadores',
      description: 'Gestiona tu contenido, clientes y portafolio profesional',
      gradient: 'from-pink-500/20 to-rose-500/20'
    },
    {
      icon: Palette,
      title: 'Editores',
      description: 'Organiza proyectos, deadlines y colaboraciones',
      gradient: 'from-violet-500/20 to-purple-500/20'
    },
    {
      icon: Building2,
      title: 'Agencias',
      description: 'Opera equipos, clientes y producción a escala',
      gradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      icon: Megaphone,
      title: 'Marcas',
      description: 'Conecta con creadores y gestiona campañas',
      gradient: 'from-emerald-500/20 to-teal-500/20'
    },
    {
      icon: GraduationCap,
      title: 'Comunidades',
      description: 'Administra miembros, contenido y crecimiento',
      gradient: 'from-amber-500/20 to-orange-500/20'
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-violet-500/5 to-transparent rounded-full" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-transparent">
              KREOON
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-2xl md:text-4xl font-light text-violet-200 mb-6">
            The Creative Operating System
          </p>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Gestiona creadores, contenido, proyectos y resultados desde un solo sistema.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Crear organización
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/auth')}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-6 text-lg rounded-xl transition-all hover:scale-105"
            >
              <Users className="w-5 h-5 mr-2" />
              Unirme a una organización
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-slate-700 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-violet-500 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* What is KREOON Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              ¿Qué es KREOON?
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Un ecosistema completo para operar tu creación como un negocio profesional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all duration-300 group hover:scale-105"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 group-hover:from-violet-500/30 group-hover:to-purple-500/30 transition-all">
                    <feature.icon className="w-7 h-7 text-violet-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-24 px-4 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Módulos de KREOON
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Un ecosistema integrado donde cada módulo potencia tu operación
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module, index) => (
              <Card 
                key={index}
                className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition-all duration-300 group overflow-hidden"
              >
                <CardContent className="p-8">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 transition-transform group-hover:scale-110",
                    module.color
                  )}>
                    <module.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{module.name}</h3>
                  <p className="text-slate-400">{module.description}</p>
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
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              ¿Para quién es KREOON?
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Diseñado para todos los roles del ecosistema creativo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {audiences.map((audience, index) => (
              <Card 
                key={index}
                className={cn(
                  "bg-gradient-to-br border-slate-800 hover:border-slate-700 transition-all duration-300 group cursor-pointer hover:scale-105",
                  audience.gradient
                )}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-4 group-hover:bg-slate-700/80 transition-all">
                    <audience.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-2">{audience.title}</h3>
                  <p className="text-slate-300 text-sm">{audience.description}</p>
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
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
            
            <div className="relative bg-slate-900/80 border border-slate-800 rounded-3xl p-12 md:p-16">
              <Zap className="w-16 h-16 mx-auto mb-8 text-violet-400" />
              <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-transparent">
                Empieza a operar tu creación como un sistema
              </h2>
              <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
                Únete a KREOON y transforma tu proceso creativo en una operación profesional y escalable.
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-12 py-7 text-xl rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105"
              >
                Crear mi organización en KREOON
                <ArrowRight className="w-6 h-6 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
            KREOON
          </p>
          <p className="text-slate-500 text-sm">
            The Creative Operating System © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
