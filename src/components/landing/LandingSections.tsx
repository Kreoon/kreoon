import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, Lock, Users, Cpu, Database, Eye,
  Building2, UserCircle, Palette, Briefcase, UsersRound,
  Target, Settings, UserPlus, Layers, LineChart,
  Trophy, Star, TrendingUp, Award, Zap,
  Video, Bookmark, Sparkles, Globe, Search,
  CheckCircle2, ArrowRight, MessageSquare, Bell, Ticket, Ban,
  LayoutDashboard, FolderKanban, Network, Bot, Calendar,
  FileText, Play, Heart, Share2, Rocket, Clock, Wand2,
  Mic, Camera, Workflow, BarChart3, PieChart, Mail, Phone,
  CreditCard, Package, ShoppingBag, Radio, Tv, Gift,
  Code, Puzzle, Smartphone, Monitor, CloudUpload, Webhook,
  Brain, Lightbulb, Map, Flag, Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionProps {
  onRegister: () => void;
}

// Section 1: Hero - Tech Futuristic Style
export function HeroSection({ onRegister }: SectionProps) {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center pt-20 pb-16 px-4 overflow-hidden bg-[hsl(240,15%,3%)]">
      {/* Tech Background Effects */}
      <div className="absolute inset-0">
        {/* Gradient mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(270,100%,15%,0.3)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(220,100%,20%,0.2)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(280,100%,15%,0.15)_0%,transparent_40%)]" />
        
        {/* Animated glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[hsl(220,100%,50%)]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Grid Pattern - Subtle tech grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
        
        {/* Scan line effect */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />
      </div>

      {/* Floating tech particles */}
      <div className="absolute top-1/3 left-[10%] w-1.5 h-1.5 bg-primary rounded-full animate-float shadow-lg shadow-primary/50" style={{ animationDuration: '4s' }} />
      <div className="absolute top-1/2 right-[15%] w-2 h-2 bg-[hsl(220,100%,60%)]/60 rounded-full animate-float" style={{ animationDuration: '5s', animationDelay: '0.5s' }} />
      <div className="absolute bottom-1/3 left-[20%] w-1 h-1 bg-primary/40 rounded-full animate-float" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
      <div className="absolute top-1/4 right-[25%] w-1.5 h-1.5 bg-primary/50 rounded-full animate-float" style={{ animationDuration: '4.5s', animationDelay: '2s' }} />

      <div className="relative max-w-5xl mx-auto text-center z-10">
        {/* Badge with glow */}
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium shadow-lg shadow-primary/10">
            <Sparkles className="h-4 w-4" />
            <span>Creative Operating System</span>
            <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
        
        {/* Main Title with gradient */}
        <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
          El sistema donde se construyen{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[hsl(270,100%,70%)] to-[hsl(220,100%,60%)]">
            imperios creativos
          </span>
        </h1>
        
        <p className="mt-6 text-lg sm:text-xl text-white/60 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Gestión integral de contenido, <span className="text-primary">IA</span>, talento, pagos, live streaming y más. 
          Todo en un ecosistema diseñado para <span className="text-white">escalar tu operación creativa</span>.
        </p>
        
        {/* CTA Buttons - Neon style */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button 
            size="lg" 
            onClick={onRegister}
            className="relative w-full sm:w-auto text-lg px-8 py-6 bg-gradient-to-r from-primary via-primary to-[hsl(260,100%,60%)] hover:opacity-90 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:-translate-y-1 border border-primary/50 overflow-hidden group"
          >
            <span className="relative z-10 flex items-center">
              Empezar gratis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => scrollToSection('modulos')}
            className="w-full sm:w-auto text-lg px-8 py-6 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-primary/30 transition-all duration-300"
          >
            Explorar módulos
          </Button>
        </div>

        {/* Stats - Tech glassmorphism */}
        <div className="grid grid-cols-4 gap-4 sm:gap-8 mt-20 pt-10 border-t border-white/10 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {[
            { value: '8+', label: 'Módulos' },
            { value: '100%', label: 'Control' },
            { value: 'IA', label: 'Integrada' },
            { value: '∞', label: 'Escalable' },
          ].map((stat, i) => (
            <div key={i} className="text-center group">
              <div className="text-2xl sm:text-4xl font-bold text-white group-hover:text-primary transition-colors duration-300">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-white/40 mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator - Tech style */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-primary/30 flex items-start justify-center p-2 bg-primary/5">
          <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}

// Section 2: Modules - NUEVA sección detallada de módulos
export function ModulesSection() {
  const modules = [
    {
      icon: LayoutDashboard,
      name: 'Board',
      status: 'live',
      description: 'Tablero Kanban inteligente con estados personalizables',
      features: ['Estados configurables', 'Asignación automática', 'Filtros avanzados', 'Vista calendario']
    },
    {
      icon: FolderKanban,
      name: 'Content',
      status: 'live',
      description: 'Gestión completa de contenido y proyectos',
      features: ['Scripts y guiones', 'Versiones de video', 'Aprobaciones', 'Historial completo']
    },
    {
      icon: Users,
      name: 'Team',
      status: 'live',
      description: 'Administración de creadores, editores y equipo',
      features: ['Roles y permisos', 'Pagos por contenido', 'Métricas individuales', 'Onboarding']
    },
    {
      icon: Briefcase,
      name: 'Clients',
      status: 'live',
      description: 'CRM para marcas y clientes',
      features: ['Paquetes y contratos', 'Productos por cliente', 'Portal de cliente', 'Facturación']
    },
    {
      icon: Globe,
      name: 'Social Network',
      status: 'live',
      description: 'Red social profesional tipo TikTok/Instagram',
      features: ['Feed vertical', 'Portafolios', 'Seguidos/Seguidores', 'Descubrimiento']
    },
    {
      icon: Trophy,
      name: 'Sistema UP',
      status: 'live',
      description: 'Gamificación y ranking de rendimiento',
      features: ['Puntos y niveles', 'Logros desbloqueables', 'Leaderboards', 'Temporadas']
    },
    {
      icon: Bot,
      name: 'IA Integrada',
      status: 'live',
      description: 'Asistentes inteligentes en cada módulo',
      features: ['Chat con contexto', 'Generación de scripts', 'Análisis automático', 'Sugerencias']
    },
    {
      icon: MessageSquare,
      name: 'Chat',
      status: 'live',
      description: 'Mensajería interna con IA',
      features: ['Chats 1:1 y grupales', 'Adjuntos', 'Historial', 'Notificaciones']
    },
    {
      icon: Radio,
      name: 'KREOON Live',
      status: 'live',
      description: 'Live streaming y live shopping',
      features: ['Transmisiones en vivo', 'Ventas en tiempo real', 'Métricas de stream', 'Múltiples canales']
    },
    {
      icon: CreditCard,
      name: 'Pagos',
      status: 'live',
      description: 'Control de pagos a creadores y editores',
      features: ['Registro de pagos', 'Estados de pago', 'Historial por persona', 'Reportes']
    },
  ];

  return (
    <section id="modulos" className="py-24 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Puzzle className="h-3 w-3 mr-1" />
            Módulos del Sistema
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Todo lo que necesitas, integrado
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cada módulo está diseñado para trabajar en conjunto, creando un ecosistema completo para tu operación
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {modules.map((module, i) => (
            <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <module.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-500 bg-green-500/10">
                    ACTIVO
                  </Badge>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{module.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{module.description}</p>
                <ul className="space-y-1">
                  {module.features.slice(0, 3).map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Section 2b: Security - Simplificado
export function SecuritySection() {
  const features = [
    { icon: Database, title: 'Multi-Organización', desc: 'Cada espacio es un ecosistema independiente y aislado' },
    { icon: Lock, title: 'Permisos Granulares', desc: 'Define quién ve, edita y aprueba cada elemento' },
    { icon: Cpu, title: 'IA Privada', desc: 'Asistente exclusivo entrenado con tu contexto' },
    { icon: Shield, title: 'Encriptación', desc: 'Datos protegidos con estándares enterprise' },
    { icon: Eye, title: 'Control de Visibilidad', desc: 'Tú decides qué es público y qué no' },
    { icon: Building2, title: 'White Label Ready', desc: 'Personaliza branding por organización' },
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Shield className="h-3 w-3 mr-1" />
            Seguridad & Control
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Infraestructura de nivel empresarial
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-sm bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Section 3: What is KREOON - Mejorado
export function WhatIsSection() {
  const capabilities = [
    { icon: LayoutDashboard, text: 'Tablero Kanban inteligente' },
    { icon: FolderKanban, text: 'Gestión completa de contenido' },
    { icon: Globe, text: 'Red social profesional' },
    { icon: Trophy, text: 'Sistema de gamificación' },
    { icon: Bot, text: 'IA en cada módulo' },
    { icon: Radio, text: 'Live streaming integrado' },
    { icon: CreditCard, text: 'Control de pagos' },
    { icon: MessageSquare, text: 'Chat interno con IA' },
  ];

  return (
    <section id="que-es" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Creative Operating System
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              ¿Qué es KREOON?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              KREOON es el sistema operativo creativo más completo para agencias, creadores, empresas y comunidades. Centraliza toda tu operación de contenido en un solo lugar.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {capabilities.map((cap, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-sm bg-card/50 border border-border/50 hover:border-primary/30 transition-colors">
                  <cap.icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{cap.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-square rounded-sm bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 border border-border/50">
              <div className="h-full w-full rounded-sm bg-card/80 border border-border/50 p-6 flex flex-col justify-center items-center text-center">
                <div className="h-20 w-20 rounded-sm bg-primary flex items-center justify-center mb-6 shadow-xl shadow-primary/25">
                  <span className="text-primary-foreground font-bold text-4xl">K</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">KREOON</h3>
                <p className="text-muted-foreground">Un sistema, infinitas posibilidades</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Section 4: For Whom - Mejorado
export function ForWhomSection() {
  const audiences = [
    { 
      icon: Building2, 
      title: 'Agencias',
      problem: 'Caos en la gestión de múltiples clientes y creadores',
      solution: 'Dashboard centralizado con permisos granulares',
      result: 'Operación escalable y profesional'
    },
    { 
      icon: UserCircle, 
      title: 'Creadores',
      problem: 'Falta de visibilidad y herramientas profesionales',
      solution: 'Portafolio, métricas y red social integrada',
      result: 'Crecimiento y reconocimiento medible'
    },
    { 
      icon: Palette, 
      title: 'Editores',
      problem: 'Flujos de trabajo desorganizados',
      solution: 'Tableros, scripts y entregas estructuradas',
      result: 'Más proyectos, menos fricción'
    },
    { 
      icon: Briefcase, 
      title: 'Marcas',
      problem: 'Desconexión entre equipos y contenido',
      solution: 'Visibilidad total de su inversión en contenido',
      result: 'ROI claro y contenido de calidad'
    },
    { 
      icon: UsersRound, 
      title: 'Comunidades',
      problem: 'Dificultad para organizar y motivar miembros',
      solution: 'Sistema UP, rankings y logros',
      result: 'Engagement y retención elevados'
    },
  ];

  return (
    <section id="para-quien" className="py-24 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            Audiencias
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            ¿Para quién es KREOON?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {audiences.map((aud, i) => (
            <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <aud.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{aud.title}</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Problema: </span>
                    <span className="text-foreground">{aud.problem}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Solución: </span>
                    <span className="text-foreground">{aud.solution}</span>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-primary font-medium">→ {aud.result}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Section 5: How it Works - Mejorado
export function HowItWorksSection() {
  const steps = [
    { num: '01', icon: Building2, title: 'Crea tu organización', desc: 'Configura tu espacio privado en minutos' },
    { num: '02', icon: Settings, title: 'Personaliza tu tablero', desc: 'Adapta estados, campos y flujos a tu operación' },
    { num: '03', icon: UserPlus, title: 'Invita a tu equipo', desc: 'Asigna roles y permisos específicos' },
    { num: '04', icon: Layers, title: 'Produce contenido', desc: 'Gestiona scripts, videos y entregas' },
    { num: '05', icon: LineChart, title: 'Mide y escala', desc: 'Analiza métricas y optimiza con IA' },
  ];

  return (
    <section id="como-funciona" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            Proceso
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Comienza en 5 pasos
          </h2>
        </div>

        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent hidden md:block" />
          
          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-6 items-start group">
                <div className="relative shrink-0">
                  <div className="h-16 w-16 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {step.num.replace('0', '')}
                  </span>
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Section 6: Sistema UP - Mejorado
export function SistemaUPSection() {
  const features = [
    { icon: Trophy, title: 'Puntos', desc: 'Gana puntos por cada acción' },
    { icon: Star, title: 'Niveles', desc: 'Desbloquea niveles de prestigio' },
    { icon: Award, title: 'Logros', desc: 'Medallas y badges especiales' },
    { icon: TrendingUp, title: 'Rankings', desc: 'Compite en tablas de líderes' },
    { icon: Calendar, title: 'Temporadas', desc: 'Reseteos y competencias' },
    { icon: Zap, title: 'Bonificaciones', desc: 'Multiplicadores y rewards' },
  ];

  return (
    <section id="sistema-up" className="py-24 px-4 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-500">
              <Trophy className="h-3 w-3 mr-1" />
              Gamificación Profesional
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Sistema UP
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              No es un juego, es motivación real. Un sistema que reconoce, mide y recompensa la excelencia de tu equipo.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <div key={i} className="p-4 rounded-sm bg-card/50 border border-border/50 text-center hover:border-amber-500/30 transition-colors">
                  <f.icon className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                  <div className="font-semibold text-foreground text-sm">{f.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-[4/3] rounded-sm bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent p-8 border border-amber-500/20">
              <div className="h-full w-full rounded-sm bg-card/80 border border-border/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                    UP
                  </div>
                  <p className="text-muted-foreground mt-2">Sistema de Prestigio</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Section 7: Social Creators - Mejorado
export function SocialCreatorsSection() {
  const features = [
    { icon: UserCircle, label: 'Portafolios públicos', desc: 'Muestra tu mejor trabajo' },
    { icon: Video, label: 'Feed vertical', desc: 'Videos estilo TikTok' },
    { icon: Sparkles, label: 'Stories 24h', desc: 'Contenido efímero' },
    { icon: Bookmark, label: 'Guardados', desc: 'Organiza inspiración' },
    { icon: Heart, label: 'Likes y follows', desc: 'Construye audiencia' },
    { icon: Search, label: 'Descubrimiento', desc: 'Encuentra talento' },
  ];

  return (
    <section id="social" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Globe className="h-3 w-3 mr-1" />
            Red Social Profesional
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Social Creators
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tu perfil no es un CV, es un activo digital que trabaja por ti.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 group">
              <CardContent className="p-6">
                <f.icon className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-foreground font-medium block">{f.label}</span>
                <span className="text-xs text-muted-foreground">{f.desc}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// NEW Section: KREOON Live
export function KreoonLiveSection() {
  const features = [
    { icon: Radio, label: 'Transmisiones en vivo', desc: 'Streaming profesional' },
    { icon: ShoppingBag, label: 'Live Shopping', desc: 'Ventas en tiempo real' },
    { icon: BarChart3, label: 'Métricas en vivo', desc: 'Analytics instantáneos' },
    { icon: Tv, label: 'Multi-canal', desc: 'Múltiples streams' },
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-red-500/30 text-red-500">
            <Radio className="h-3 w-3 mr-1" />
            Live Streaming
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            KREOON Live
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transmite en vivo, vende productos y conecta con tu audiencia en tiempo real
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div key={i} className="rounded-sm p-6 bg-card/50 border border-border/50 hover:border-red-500/30 transition-all duration-300 text-center group">
              <f.icon className="h-8 w-8 text-red-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-foreground font-medium block">{f.label}</span>
              <span className="text-xs text-muted-foreground">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// NEW Section: Roadmap - Lo que viene
export function RoadmapSection() {
  const upcoming = [
    {
      quarter: 'Q1 2025',
      status: 'in-progress',
      features: [
        { name: 'App Móvil iOS/Android', icon: Smartphone, desc: 'Acceso completo desde tu móvil' },
        { name: 'Integraciones Externas', icon: Webhook, desc: 'Zapier, Make, API pública' },
        { name: 'Marketplace de Talento', icon: ShoppingBag, desc: 'Contratación directa de creadores' },
      ]
    },
    {
      quarter: 'Q2 2025',
      status: 'planned',
      features: [
        { name: 'IA Generativa Avanzada', icon: Brain, desc: 'Generación de videos y thumbnails' },
        { name: 'Facturación Automática', icon: FileText, desc: 'Facturas y cobros integrados' },
        { name: 'White Label Completo', icon: Package, desc: 'Tu marca, tu dominio, tu app' },
      ]
    },
    {
      quarter: 'Q3 2025',
      status: 'planned',
      features: [
        { name: 'Pagos Integrados', icon: CreditCard, desc: 'Pagos automáticos a creadores' },
        { name: 'Afiliados y Embajadores', icon: Gift, desc: 'Sistema de referidos avanzado' },
        { name: 'Analíticas Predictivas', icon: PieChart, desc: 'IA que predice rendimiento' },
      ]
    },
  ];

  return (
    <section id="roadmap" className="py-24 px-4 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Rocket className="h-3 w-3 mr-1" />
            Roadmap
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Lo que viene
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            KREOON evoluciona constantemente. Esto es lo que estamos construyendo para ti.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {upcoming.map((quarter, i) => (
            <div key={i} className="relative">
              <div className="flex items-center gap-3 mb-6">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "px-3 py-1",
                    quarter.status === 'in-progress' 
                      ? "border-green-500/30 text-green-500 bg-green-500/10" 
                      : "border-border/50 text-muted-foreground"
                  )}
                >
                  {quarter.status === 'in-progress' ? (
                    <>
                      <Timer className="h-3 w-3 mr-1 animate-pulse" />
                      En desarrollo
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Planeado
                    </>
                  )}
                </Badge>
                <span className="text-lg font-bold text-foreground">{quarter.quarter}</span>
              </div>

              <div className="space-y-4">
                {quarter.features.map((feature, j) => (
                  <Card key={j} className={cn(
                    "border-border/50 transition-all duration-300",
                    quarter.status === 'in-progress' 
                      ? "bg-green-500/5 hover:border-green-500/30" 
                      : "bg-card/50 hover:border-primary/30"
                  )}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-sm flex items-center justify-center shrink-0",
                        quarter.status === 'in-progress' ? "bg-green-500/10" : "bg-primary/10"
                      )}>
                        <feature.icon className={cn(
                          "h-5 w-5",
                          quarter.status === 'in-progress' ? "text-green-500" : "text-primary"
                        )} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{feature.name}</h4>
                        <p className="text-xs text-muted-foreground">{feature.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            ¿Tienes una idea o necesitas algo específico?
          </p>
          <Button variant="outline" asChild>
            <a href="mailto:hola@kreoon.com">
              <Lightbulb className="h-4 w-4 mr-2" />
              Sugerir funcionalidad
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

// Section 8: Pricing - Organizations
export function PricingSection({ onRegister }: SectionProps) {
  const orgPlans = [
    {
      name: 'Starter',
      badge: 'Ideal para equipos pequeños',
      price: '$59',
      period: '/mes',
      hasTrial: true,
      features: [
        { icon: Users, text: 'Hasta 10 usuarios' },
        { icon: Layers, text: 'Tablero configurable' },
        { icon: Cpu, text: 'IA integrada' },
        { icon: Lock, text: 'Permisos por rol' },
        { icon: Video, text: 'Gestión de contenido' },
        { icon: Trophy, text: 'Sistema UP' },
        { icon: MessageSquare, text: 'Chat interno + IA' },
        { icon: Globe, text: 'Red social' },
      ],
      cta: 'Empezar gratis',
      featured: false,
    },
    {
      name: 'Growth',
      badge: 'Más popular',
      price: '$139',
      period: '/mes',
      hasTrial: true,
      features: [
        { icon: Users, text: '10 a 30 usuarios' },
        { icon: CheckCircle2, text: 'Todo lo Starter +' },
        { icon: Cpu, text: 'IA avanzada' },
        { icon: LineChart, text: 'Dashboards custom' },
        { icon: Radio, text: 'KREOON Live' },
        { icon: Bell, text: 'Notificaciones smart' },
      ],
      cta: 'Empezar gratis',
      featured: true,
    },
    {
      name: 'Scale',
      badge: 'Equipos grandes',
      price: '$279',
      period: '/mes',
      hasTrial: true,
      features: [
        { icon: Users, text: '30 a 50 usuarios' },
        { icon: CheckCircle2, text: 'Todo lo Growth +' },
        { icon: Cpu, text: 'IA entrenable' },
        { icon: Lock, text: 'Permisos ultra detallados' },
        { icon: LineChart, text: 'Analytics avanzados' },
      ],
      cta: 'Empezar gratis',
      featured: false,
    },
    {
      name: 'Enterprise',
      badge: 'Personalizado',
      price: 'Contactar',
      period: '',
      hasTrial: false,
      features: [
        { icon: Users, text: '+50 usuarios' },
        { icon: Cpu, text: 'IA dedicada' },
        { icon: Settings, text: 'Integraciones custom' },
        { icon: Shield, text: 'SLA garantizado' },
      ],
      cta: 'Contactar',
      featured: false,
      isEnterprise: true,
    },
  ];

  return (
    <section id="precios" className="py-24 px-4 bg-[#0B0B0F]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Building2 className="h-3 w-3 mr-1" />
            Planes
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Planes para Organizaciones
          </h2>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">1 mes gratis en todos los planes</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {orgPlans.map((plan, i) => (
            <div 
              key={i} 
              className={cn(
                "relative rounded-sm p-6 transition-all duration-300 group",
                "bg-[#12121A] border border-border/30",
                "hover:shadow-[0_0_30px_hsl(252_100%_68%/0.15)] hover:border-primary/40",
                plan.featured && "border-primary/50 shadow-[0_0_40px_hsl(252_100%_68%/0.2)]"
              )}
            >
              {plan.hasTrial && (
                <div className="absolute -top-3 -right-2 z-10">
                  <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3 py-1 text-xs font-bold shadow-lg shadow-primary/30">
                    1 mes gratis
                  </Badge>
                </div>
              )}
              
              {plan.featured && (
                <div className="absolute -top-3 left-4">
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              {!plan.featured && (
                <Badge variant="outline" className="mb-4 text-xs border-border/50 text-muted-foreground">
                  {plan.badge}
                </Badge>
              )}
              
              <h3 className={cn(
                "text-2xl font-bold text-foreground mb-2",
                plan.featured && "mt-4"
              )}>
                {plan.name}
              </h3>
              
              <div className="flex items-baseline gap-1 mb-4">
                <span className={cn(
                  "text-4xl font-bold",
                  plan.featured ? "text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70" : "text-foreground"
                )}>
                  {plan.isEnterprise ? '' : 'USD '}{plan.price}
                </span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm">
                    <feature.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className={cn(
                  "w-full",
                  plan.featured 
                    ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                    : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                )}
                onClick={onRegister}
              >
                {plan.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Section 8b: Individual Plans
export function IndividualPlansSection({ onRegister }: SectionProps) {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      features: [
        'Perfil público',
        'Subir videos e imágenes',
        'Stories 24h',
        'Guardados',
        'Likes y seguidores',
        'Aparición en recomendaciones',
      ],
      note: 'No incluye contacto directo.',
      cta: 'Crear perfil gratis',
    },
    {
      name: 'Pro',
      price: '$12',
      period: '/mes',
      featured: true,
      features: [
        'Todo lo Free +',
        '📊 Estadísticas de perfil',
        '🧠 IA para optimizar perfil',
        '🖼️ Portafolio avanzado',
        '🔗 Contacto profesional',
        '🏆 Sistema UP personal',
      ],
      cta: 'Mejorar a Pro',
    },
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-[#0B0B0F] to-muted/10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <UserCircle className="h-3 w-3 mr-1" />
            Planes Individuales
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Para Creadores Independientes
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan, i) => (
            <div 
              key={i} 
              className={cn(
                "relative rounded-sm p-8 transition-all duration-300 group",
                "bg-[#12121A] border border-border/30",
                "hover:shadow-[0_0_30px_hsl(252_100%_68%/0.15)] hover:border-primary/40",
                plan.featured && "border-primary/50"
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 right-6">
                  <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                    Recomendado
                  </Badge>
                </div>
              )}
              
              <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
              
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-foreground">USD {plan.price}</span>
                {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              
              {plan.note && (
                <p className="text-xs text-muted-foreground mb-6 italic">
                  ⚠️ {plan.note}
                </p>
              )}
              
              <Button 
                className={cn(
                  "w-full",
                  plan.featured 
                    ? "bg-gradient-to-r from-primary to-primary/80" 
                    : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                )}
                onClick={onRegister}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Section 8c: Talent Access
export function TalentAccessSection() {
  const rules = [
    {
      icon: Building2,
      title: 'Creador en organización',
      desc: 'El contacto se gestiona vía la organización a la que pertenece.',
    },
    {
      icon: UserCircle,
      title: 'Creador independiente',
      desc: 'El contacto directo requiere tokens. Sin spam, sin DMs desordenados.',
    },
    {
      icon: Shield,
      title: 'Todo registrado',
      desc: 'Cada interacción queda protegida y documentada.',
    },
  ];

  return (
    <section className="py-24 px-4 bg-[#0B0B0F]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Lock className="h-3 w-3 mr-1" />
            Acceso al Talento
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Contacto profesional, sin spam
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {rules.map((rule, i) => (
            <div 
              key={i} 
              className="rounded-sm p-6 bg-[#12121A] border border-border/30 hover:border-primary/40 transition-all duration-300 group"
            >
              <div className="h-12 w-12 rounded-sm bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <rule.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{rule.title}</h3>
              <p className="text-sm text-muted-foreground">{rule.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Section 8d: Token System
export function TokenSystemSection({ onRegister }: SectionProps) {
  const tokenPackages = [
    { name: 'Starter', tokens: 5, price: 9 },
    { name: 'Growth', tokens: 20, price: 29 },
    { name: 'Scale', tokens: 50, price: 59 },
    { name: 'Pro', tokens: 100, price: 99 },
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-muted/10 to-[#0B0B0F]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-500">
            <Ticket className="h-3 w-3 mr-1" />
            Sistema de Tokens
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Tokens de Contacto
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
            Accede a datos de contacto de forma profesional.
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-amber-500/10 border border-amber-500/20">
            <Ban className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-400">Los tokens no hacen parte del periodo de prueba</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {tokenPackages.map((pkg, i) => (
            <div 
              key={i} 
              className="rounded-sm p-6 bg-[#12121A] border border-amber-500/20 hover:border-amber-500/40 transition-all text-center"
            >
              <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-500">
                {pkg.name}
              </Badge>
              <div className="text-4xl font-bold text-foreground mb-2">
                🎟️ {pkg.tokens}
              </div>
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 mb-4">
                USD ${pkg.price}
              </div>
              <Button 
                variant="outline"
                className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                onClick={onRegister}
              >
                Comprar
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Section 8e: Why This Model
export function WhyThisModelSection() {
  const reasons = [
    { icon: Shield, title: 'Protege creadores', desc: 'Datos seguros' },
    { icon: Ban, title: 'Evita spam', desc: 'Solo contactos serios' },
    { icon: Briefcase, title: 'Profesionaliza', desc: 'Proceso ordenado' },
    { icon: Layers, title: 'Documenta', desc: 'Todo registrado' },
    { icon: TrendingUp, title: 'Escala', desc: 'Sin fricción' },
  ];

  return (
    <section className="py-24 px-4 bg-[#0B0B0F]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Sparkles className="h-3 w-3 mr-1" />
            Filosofía
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            ¿Por qué este modelo?
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {reasons.map((reason, i) => (
            <div key={i} className="rounded-sm p-5 bg-[#12121A] border border-border/30 text-center hover:border-primary/40 transition-all">
              <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <reason.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{reason.title}</h3>
              <p className="text-xs text-muted-foreground">{reason.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Section 9: Privacy
export function PrivacySection() {
  const features = [
    { icon: Database, title: 'Datos por Organización', desc: 'Base de datos aislada por cada org' },
    { icon: Eye, title: 'Control de Visibilidad', desc: 'Decide qué es público y qué privado' },
    { icon: Globe, title: 'Red Social Configurable', desc: 'Pública o solo para tu organización' },
    { icon: Lock, title: 'Permisos Avanzados', desc: 'Control granular por rol y usuario' },
  ];

  return (
    <section id="seguridad" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-green-500/30 text-green-500">
            <Shield className="h-3 w-3 mr-1" />
            Privacidad
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Tu datos, tu control
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="bg-card/50 border-border/50 hover:border-green-500/30 transition-all group">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="h-12 w-12 rounded-sm bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                  <f.icon className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Section 10: CTA
export function CTASection({ onRegister }: SectionProps) {
  return (
    <section id="contacto" className="py-24 px-4 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-4xl mx-auto text-center">
        <Badge variant="outline" className="mb-6 border-primary/30 text-primary">
          Comienza Ahora
        </Badge>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
          Construye tu{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
            imperio creativo
          </span>
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
          Esto no es otra app. Es un sistema serio para construir algo grande.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            onClick={onRegister}
            className="w-full sm:w-auto text-lg px-10 py-6 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25"
          >
            Empezar gratis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="w-full sm:w-auto text-lg px-10 py-6"
            asChild
          >
            <a href="mailto:hola@kreoon.com">Contactar ventas</a>
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mt-8">
          ¿Preguntas? <a href="mailto:hola@kreoon.com" className="text-primary hover:underline">hola@kreoon.com</a>
        </p>
      </div>
    </section>
  );
}

// Footer
export function LandingFooter() {
  return (
    <footer className="py-12 px-4 border-t border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-sm bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">K</span>
            </div>
            <span className="text-foreground font-semibold">KREOON</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Términos</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidad</a>
            <a href="mailto:hola@kreoon.com" className="hover:text-foreground transition-colors">Soporte</a>
          </div>
          
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} KREOON
          </p>
        </div>
      </div>
    </footer>
  );
}
