import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  X, 
  Chrome, 
  ArrowRight
} from 'lucide-react';
import {
  LandingHeader,
  HeroSection,
  ModulesSection,
  SecuritySection,
  WhatIsSection,
  ForWhomSection,
  HowItWorksSection,
  SistemaUPSection,
  SocialCreatorsSection,
  KreoonLiveSection,
  RoadmapSection,
  PricingSection,
  IndividualPlansSection,
  TalentAccessSection,
  TokenSystemSection,
  WhyThisModelSection,
  PrivacySection,
  CTASection,
  LandingFooter
} from '@/components/landing';

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
  const { user, loading: authLoading, rolesLoaded, signIn, roles, activeRole } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    const title = 'KREOON | Creative Operating System';
    const description = 'KREOON: sistema operativo creativo para gestionar creadores, contenido, proyectos y resultados en un solo lugar.';
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);
  }, []);

  useEffect(() => {
    if (user && !authLoading && rolesLoaded && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigate(getDashboardPath(roles, activeRole), { replace: true });
    }
  }, [user, authLoading, rolesLoaded, roles, activeRole, navigate]);

  useEffect(() => {
    if (!user) {
      hasRedirectedRef.current = false;
    }
  }, [user]);

  // Intersection Observer for active section tracking
  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: 'Error al iniciar sesión',
          description: error.message === 'Invalid login credentials' ? 'Credenciales inválidas' : error.message,
          variant: 'destructive',
        });
        return;
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` }
      });
      
      if (error) {
        toast({ title: 'Error con Google', description: error.message, variant: 'destructive' });
        setLoading(false);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo conectar con Google', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Por favor ingresa tu correo electrónico', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setResetEmailSent(true);
        toast({ title: 'Correo enviado', description: 'Revisa tu bandeja de entrada para restablecer tu contraseña' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Ocurrió un error al enviar el correo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openLogin = () => {
    setShowAuthModal(true);
  };

  const openRegister = () => {
    navigate('/register');
  };

  const handleSectionClick = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const dashboardPath = getDashboardPath(roles, activeRole);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If logged in, show a simple redirect screen
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
                  Ya estás logueado. Te llevamos automáticamente a tu dashboard.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button size="lg" onClick={() => navigate(dashboardPath, { replace: true })}>
                    Ir al dashboard
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/social')}>
                    Abrir red social
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Landing Header */}
      <LandingHeader
        onLogin={openLogin}
        onRegister={openRegister}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
      />

      {/* Landing Sections */}
      <main>
        <HeroSection onRegister={openRegister} />
        <SecuritySection />
        <WhatIsSection />
        <ForWhomSection />
        <HowItWorksSection />
        <SistemaUPSection />
        <SocialCreatorsSection />
        <PricingSection onRegister={openRegister} />
        <IndividualPlansSection onRegister={openRegister} />
        <TalentAccessSection />
        <TokenSystemSection onRegister={openRegister} />
        <WhyThisModelSection />
        <PrivacySection />
        <CTASection onRegister={openRegister} />
      </main>

      <LandingFooter />

      {/* Auth Modal */}
      {showAuthModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <Card 
            className="w-full max-w-md relative bg-card border-border max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10"
              onClick={() => setShowAuthModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <CardHeader className="text-center pt-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-xl overflow-hidden shadow-lg shadow-primary/25">
                  <img src="/favicon.png" alt="KREOON" className="h-10 w-10 object-cover" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                Bienvenido de vuelta
              </CardTitle>
              <CardDescription>
                Ingresa a tu sistema creativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showForgotPassword ? (
                <div className="space-y-4">
                  {resetEmailSent ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h4 className="font-semibold mb-2">Correo enviado</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Revisa tu bandeja de entrada en <span className="font-medium">{email}</span>
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }}
                        className="w-full"
                      >
                        Volver al inicio de sesión
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="text-center mb-4">
                        <h4 className="font-semibold mb-1">¿Olvidaste tu contraseña?</h4>
                        <p className="text-sm text-muted-foreground">
                          Ingresa tu correo y te enviaremos un enlace para restablecerla.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Correo electrónico</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="tu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Enviar enlace de recuperación
                      </Button>
                      <Button 
                        type="button"
                        variant="ghost" 
                        onClick={() => setShowForgotPassword(false)}
                        className="w-full"
                      >
                        Volver
                      </Button>
                    </form>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Correo electrónico</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Contraseña</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Iniciar Sesión
                  </Button>
                  
                  <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                      o continúa con
                    </span>
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <Chrome className="w-4 h-4 mr-2" />
                    Google
                  </Button>
                </form>
              )}
            
              <div className="mt-6 text-center border-t border-border pt-6">
                <p className="text-sm text-muted-foreground mb-3">¿No tienes cuenta?</p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => { setShowAuthModal(false); navigate('/register'); }}
                >
                  Crear cuenta nueva
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
