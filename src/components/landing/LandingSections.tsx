import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, Lock, Users, Cpu, Database, Eye,
  Building2, UserCircle, Palette, Briefcase, UsersRound,
  Target, Settings, UserPlus, Layers, LineChart,
  Trophy, Star, TrendingUp, Award, Zap,
  Video, Bookmark, Sparkles, Globe, Search,
  CheckCircle2, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionProps {
  onRegister: () => void;
}

// Section 1: Hero
export function HeroSection({ onRegister }: SectionProps) {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center pt-20 pb-16 px-4 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-[150px]" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />

      {/* Floating Elements */}
      <div className="absolute top-1/3 left-[10%] w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
      <div className="absolute top-1/2 right-[15%] w-3 h-3 bg-primary/30 rounded-full animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
      <div className="absolute bottom-1/3 left-[20%] w-2 h-2 bg-primary/20 rounded-full animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />

      <div className="relative max-w-5xl mx-auto text-center">
        <div className="animate-fade-in">
          <Badge variant="outline" className="mb-6 px-4 py-2 text-sm border-primary/30 text-primary bg-primary/5 backdrop-blur-sm">
            <Sparkles className="h-3 w-3 mr-2" />
            Creative Operating System
          </Badge>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight tracking-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          KREOON es el sistema donde se construyen{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-primary/50 animate-pulse" style={{ animationDuration: '3s' }}>
            imperios creativos
          </span>
        </h1>
        
        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Gestión, contenido, IA, talento y control. Todo en un solo sistema diseñado para escalar tu operación creativa.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button 
            size="lg" 
            onClick={onRegister}
            className="w-full sm:w-auto text-lg px-8 py-6 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            Crear cuenta
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => scrollToSection('como-funciona')}
            className="w-full sm:w-auto text-lg px-8 py-6 border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all duration-300"
          >
            Ver cómo funciona
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-border/30 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="text-center group">
            <div className="text-3xl sm:text-4xl font-bold text-foreground group-hover:text-primary transition-colors">100%</div>
            <div className="text-sm text-muted-foreground mt-1">Control Total</div>
          </div>
          <div className="text-center group">
            <div className="text-3xl sm:text-4xl font-bold text-foreground group-hover:text-primary transition-colors">∞</div>
            <div className="text-sm text-muted-foreground mt-1">Escalabilidad</div>
          </div>
          <div className="text-center group">
            <div className="text-3xl sm:text-4xl font-bold text-foreground group-hover:text-primary transition-colors">24/7</div>
            <div className="text-sm text-muted-foreground mt-1">IA Activa</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}

// Section 2: Security
export function SecuritySection() {
  const features = [
    { icon: Database, title: 'Infraestructura Escalable', desc: 'Arquitectura diseñada para crecer contigo' },
    { icon: Building2, title: 'Control por Organización', desc: 'Cada espacio es un ecosistema independiente' },
    { icon: Lock, title: 'Permisos por Rol', desc: 'Define quién ve, edita y aprueba cada cosa' },
    { icon: Cpu, title: 'IA Privada', desc: 'Asistente exclusivo para tu organización' },
    { icon: Shield, title: 'Seguridad de Datos', desc: 'Encriptación y backups automáticos' },
    { icon: Eye, title: 'Control de Contenido', desc: 'Tú decides qué es público y qué no' },
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Shield className="h-3 w-3 mr-1" />
            Seguridad & Confianza
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Construido para empresas serias
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Infraestructura de nivel empresarial con la flexibilidad que necesitas
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
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

// Section 3: What is KREOON
export function WhatIsSection() {
  const capabilities = [
    'Gestión de proyectos y flujos',
    'Sistema de contenido completo',
    'Red social profesional',
    'Gamificación integrada',
    'IA en cada módulo',
    'Control total de operaciones'
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
              KREOON es un sistema operativo creativo para agencias, creadores, empresas y comunidades que necesitan control total sobre su operación de contenido.
            </p>
            <ul className="space-y-4">
              {capabilities.map((cap, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-foreground">{cap}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 border border-border/50">
              <div className="h-full w-full rounded-xl bg-card/80 backdrop-blur border border-border/50 p-6 flex flex-col justify-center items-center text-center">
                <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-xl shadow-primary/25">
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

// Section 4: For Whom
export function ForWhomSection() {
  const audiences = [
    { 
      icon: Building2, 
      title: 'Agencias',
      problem: 'Caos en la gestión de múltiples clientes y creadores',
      control: 'Dashboard centralizado con permisos granulares',
      result: 'Operación escalable y profesional'
    },
    { 
      icon: UserCircle, 
      title: 'Creadores',
      problem: 'Falta de visibilidad y herramientas profesionales',
      control: 'Portafolio, métricas y red social integrada',
      result: 'Crecimiento y reconocimiento medible'
    },
    { 
      icon: Palette, 
      title: 'Editores',
      problem: 'Flujos de trabajo desorganizados',
      control: 'Tableros, scripts y entregas estructuradas',
      result: 'Más proyectos, menos fricción'
    },
    { 
      icon: Briefcase, 
      title: 'Empresas',
      problem: 'Desconexión entre equipos y contenido',
      control: 'Visibilidad total de su inversión en contenido',
      result: 'ROI claro y contenido de calidad'
    },
    { 
      icon: UsersRound, 
      title: 'Comunidades',
      problem: 'Dificultad para organizar y motivar miembros',
      control: 'Sistema UP, rankings y logros',
      result: 'Engagement y retención elevados'
    },
  ];

  return (
    <section id="para-quien" className="py-24 px-4 bg-gradient-to-b from-muted/20 to-background">
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
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
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
                    <span className="text-muted-foreground">Control: </span>
                    <span className="text-foreground">{aud.control}</span>
                  </div>
                  <div>
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

// Section 5: How it Works
export function HowItWorksSection() {
  const steps = [
    { num: '01', icon: Building2, title: 'Crea o únete a una organización', desc: 'Tu espacio privado con control total' },
    { num: '02', icon: Settings, title: 'Configura tu tablero y flujos', desc: 'Adapta KREOON a tu forma de trabajar' },
    { num: '03', icon: UserPlus, title: 'Asigna roles y permisos', desc: 'Cada persona ve lo que necesita' },
    { num: '04', icon: Layers, title: 'Produce contenido', desc: 'Scripts, videos, entregas estructuradas' },
    { num: '05', icon: LineChart, title: 'Mide, escala y optimiza con IA', desc: 'Decisiones basadas en datos' },
  ];

  return (
    <section id="como-funciona" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            Proceso
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            ¿Cómo funciona?
          </h2>
        </div>

        <div className="relative">
          {/* Connection Line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent hidden md:block" />
          
          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-6 items-start group">
                <div className="relative shrink-0">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
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

// Section 6: Sistema UP
export function SistemaUPSection() {
  const features = [
    { icon: Trophy, title: 'Prestigio', desc: 'Reconocimiento visible por logros' },
    { icon: Star, title: 'Reputación', desc: 'Tu historial te respalda' },
    { icon: TrendingUp, title: 'Progreso', desc: 'Niveles y evolución constante' },
    { icon: Award, title: 'Rankings', desc: 'Competencia sana y motivación' },
    { icon: Zap, title: 'Incentivos', desc: 'Recompensas por rendimiento' },
  ];

  return (
    <section id="sistema-up" className="py-24 px-4 bg-gradient-to-b from-background to-muted/20">
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
              No es un juego. Es un sistema de motivación profesional que reconoce, mide y recompensa la excelencia de tu equipo.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <div key={i} className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
                  <f.icon className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                  <div className="font-semibold text-foreground text-sm">{f.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent p-8 border border-amber-500/20">
              <div className="h-full w-full rounded-xl bg-card/80 backdrop-blur border border-border/50 flex items-center justify-center">
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

// Section 7: Social Creators
export function SocialCreatorsSection() {
  const features = [
    { icon: UserCircle, label: 'Portafolios Profesionales' },
    { icon: Video, label: 'Videos estilo TikTok' },
    { icon: Sparkles, label: 'Historias efímeras' },
    { icon: Bookmark, label: 'Contenido guardado' },
    { icon: Cpu, label: 'Recomendaciones IA' },
    { icon: Search, label: 'Descubrimiento de talento' },
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
            Tu perfil no es un CV, es un activo.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <f.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <span className="text-foreground font-medium">{f.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Section 8: Pricing
export function PricingSection({ onRegister }: SectionProps) {
  return (
    <section id="precios" className="py-24 px-4 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            Planes
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Precios simples y transparentes
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-foreground mb-2">Demo</h3>
              <p className="text-muted-foreground mb-6">Explora la plataforma</p>
              <div className="text-4xl font-bold text-foreground mb-6">
                Gratis
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Acceso limitado a funciones
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  1 organización de prueba
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Soporte por comunidad
                </li>
              </ul>
              <Button variant="outline" className="w-full" onClick={onRegister}>
                Comenzar gratis
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="bg-gradient-to-b from-primary/10 to-card border-primary/30 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Badge className="bg-primary text-primary-foreground">Popular</Badge>
            </div>
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-foreground mb-2">Organización</h3>
              <p className="text-muted-foreground mb-6">Para equipos serios</p>
              <div className="text-4xl font-bold text-foreground mb-6">
                Personalizado
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Acceso completo a todas las funciones
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Usuarios ilimitados
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  IA personalizada
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Soporte prioritario
                </li>
              </ul>
              <Button className="w-full" onClick={onRegister}>
                Solicitar acceso
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

// Section 9: Security & Privacy
export function PrivacySection() {
  const features = [
    { icon: Database, title: 'Datos por Organización', desc: 'Cada organización tiene su propia base de datos aislada' },
    { icon: Eye, title: 'Control de Visibilidad', desc: 'Decide qué contenido es público y cuál es privado' },
    { icon: Globe, title: 'Red Social Configurable', desc: 'Elige si tu red social es pública o privada' },
    { icon: Lock, title: 'Permisos Avanzados', desc: 'Control granular de acceso por rol y usuario' },
  ];

  return (
    <section id="seguridad" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-green-500/30 text-green-500">
            <Shield className="h-3 w-3 mr-1" />
            Privacidad & Control
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Tu datos, tu control
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Seguridad de nivel empresarial para que te enfoques en crear
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="bg-card/50 border-border/50 hover:border-green-500/30 transition-all duration-300 group">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
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

// Section 10: Contact / CTA Final
export function CTASection({ onRegister }: SectionProps) {
  return (
    <section id="contacto" className="py-24 px-4 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-4xl mx-auto text-center">
        <Badge variant="outline" className="mb-6 border-primary/30 text-primary">
          Comienza Ahora
        </Badge>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
          Empieza a construir tu{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
            sistema creativo
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
            Crear cuenta ahora
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
          ¿Tienes preguntas? Escríbenos a <a href="mailto:hola@kreoon.com" className="text-primary hover:underline">hola@kreoon.com</a>
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
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">K</span>
            </div>
            <span className="text-foreground font-semibold">KREOON</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Términos</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidad</a>
            <a href="#" className="hover:text-foreground transition-colors">Soporte</a>
          </div>
          
          <p className="text-sm text-muted-foreground">
            © 2024 KREOON. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
