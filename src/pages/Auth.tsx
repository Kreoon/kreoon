import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Chrome } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AppRole } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LandingHeader,
  HeroSection,
  SecuritySection,
  WhatIsSection,
  ForWhomSection,
  HowItWorksSection,
  SistemaUPSection,
  SocialCreatorsSection,
  PricingSection,
  IndividualPlansSection,
  TalentAccessSection,
  TokenSystemSection,
  WhyThisModelSection,
  PrivacySection,
  CTASection,
  LandingFooter
} from '@/components/landing';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, rolesLoaded, signIn, signUp, roles } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<AppRole>('creator');
  const [accountType, setAccountType] = useState<'individual' | 'organization'>('individual');
  const [organizationType, setOrganizationType] = useState<'agency' | 'community' | 'academy'>('agency');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (user && !authLoading && rolesLoaded && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      redirectByRole();
    }
  }, [user, authLoading, rolesLoaded, roles]);

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

  const redirectByRole = () => {
    if (roles.length === 0) {
      navigate('/pending-access');
    } else if (roles.includes('admin')) {
      navigate('/dashboard');
    } else if (roles.includes('creator')) {
      navigate('/creator-dashboard');
    } else if (roles.includes('editor')) {
      navigate('/editor-dashboard');
    } else if (roles.includes('client')) {
      navigate('/client-dashboard');
    } else if (roles.includes('strategist')) {
      navigate('/strategist-dashboard');
    } else {
      navigate('/pending-access');
    }
  };

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!fullName.trim()) {
      toast({ title: 'Error', description: 'Por favor ingresa tu nombre completo', variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (accountType === 'organization' && !companyName.trim()) {
      toast({ title: 'Error', description: 'Por favor ingresa el nombre de tu organización', variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (accountType === 'individual' && role === 'client' && !companyName.trim()) {
      toast({ title: 'Error', description: 'Por favor ingresa el nombre de tu empresa', variant: 'destructive' });
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: fullName,
            account_type: accountType,
            organization_type: accountType === 'organization' ? organizationType : null,
            requested_role: accountType === 'individual' ? role : 'admin',
            company_name: companyName || null,
          }
        }
      });

      if (error) throw error;

      if (authData.user && accountType === 'organization') {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: companyName,
            slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            organization_type: organizationType,
            admin_name: fullName,
            admin_email: email,
            is_registration_open: false,
          })
          .select('id')
          .single();

        if (!orgError && orgData) {
          await supabase.from('organization_members').insert({
            organization_id: orgData.id,
            user_id: authData.user.id,
            role: 'admin',
            is_owner: true,
          });

          await supabase.from('organization_member_roles').insert({
            organization_id: orgData.id,
            user_id: authData.user.id,
            role: 'admin',
          });

          await supabase
            .from('profiles')
            .update({ current_organization_id: orgData.id })
            .eq('id', authData.user.id);
        }
      }

      toast({
        title: 'Cuenta creada',
        description: accountType === 'organization'
          ? `Tu ${organizationType === 'agency' ? 'agencia' : organizationType === 'community' ? 'comunidad' : 'academia'} ha sido registrada.`
          : 'Tu cuenta ha sido creada. Tu solicitud será revisada por un administrador.',
      });
      setShowAuthModal(false);
    } catch (error: any) {
      toast({
        title: 'Error al registrarse',
        description: error.message?.includes('already registered') ? 'Este correo ya está registrado' : error.message,
        variant: 'destructive'
      });
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth` }
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
        redirectTo: `${window.location.origin}/auth?type=recovery`,
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
    setAuthTab('login');
    setShowAuthModal(true);
  };

  const openRegister = () => {
    setAuthTab('register');
    setShowAuthModal(true);
  };

  const handleSectionClick = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                  <span className="text-primary-foreground font-bold text-xl">K</span>
                </div>
              </div>
              <CardTitle className="text-2xl">
                {authTab === 'login' ? 'Bienvenido de vuelta' : 'Únete a KREOON'}
              </CardTitle>
              <CardDescription>
                {authTab === 'login' 
                  ? 'Ingresa a tu sistema creativo' 
                  : 'Crea tu cuenta y comienza a construir'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as 'login' | 'register')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                  <TabsTrigger value="register">Registrarse</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
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
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nombre completo</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Tu nombre"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Correo electrónico</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Contraseña</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tipo de cuenta</Label>
                      <Select value={accountType} onValueChange={(v) => setAccountType(v as 'individual' | 'organization')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Persona (Creador, Editor, Marca)</SelectItem>
                          <SelectItem value="organization">Organización (Agencia, Comunidad)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {accountType === 'organization' ? (
                      <>
                        <div className="space-y-2">
                          <Label>Tipo de organización</Label>
                          <Select value={organizationType} onValueChange={(v) => setOrganizationType(v as any)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="agency">Agencia</SelectItem>
                              <SelectItem value="community">Comunidad</SelectItem>
                              <SelectItem value="academy">Academia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-org-name">Nombre de la organización</Label>
                          <Input
                            id="register-org-name"
                            type="text"
                            placeholder="Nombre de tu organización"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="register-role">¿Cómo quieres unirte?</Label>
                          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="creator">Creador de Contenido</SelectItem>
                              <SelectItem value="editor">Editor de Video</SelectItem>
                              <SelectItem value="client">Marca / Cliente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {role === 'client' && (
                          <div className="space-y-2">
                            <Label htmlFor="register-company">Nombre de tu empresa</Label>
                            <Input
                              id="register-company"
                              type="text"
                              placeholder="Tu empresa"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              required
                            />
                          </div>
                        )}
                      </>
                    )}
                    
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Crear Cuenta
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
