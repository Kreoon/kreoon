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
import { Loader2, Sparkles, Play, Heart, X, LogIn, UserPlus, Chrome } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AppRole } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';
import { BunnyVideoCard } from '@/components/content/BunnyVideoCard';
import { FullscreenVideoViewer } from '@/components/content/FullscreenVideoViewer';
import { TikTokFeed } from '@/components/content/TikTokFeed';
import { useIsMobile } from '@/hooks/use-mobile';

interface PublishedContent {
  id: string;
  title: string;
  video_url: string | null;
  video_urls: string[] | null;
  thumbnail_url: string | null;
  client: { name: string } | null;
  creator: { id: string; full_name: string } | null;
  creator_id: string | null;
  views_count: number;
  likes_count: number;
  is_liked: boolean;
}

function getVideoUrls(item: PublishedContent): string[] {
  const urls: string[] = [];
  if (item.video_urls && item.video_urls.length > 0) {
    urls.push(...item.video_urls.filter(u => u && u.trim()));
  }
  if (item.video_url && !urls.includes(item.video_url)) {
    urls.unshift(item.video_url);
  }
  return urls;
}

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
  
  // Content state
  const [content, setContent] = useState<PublishedContent[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  // Viewer ID for likes
  const [viewerId] = useState(() => {
    const stored = localStorage.getItem('auth_viewer_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('auth_viewer_id', newId);
    return newId;
  });

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

  useEffect(() => {
    fetchPublicContent();
  }, []);

  const fetchPublicContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select(`
          id,
          title,
          video_url,
          video_urls,
          thumbnail_url,
          views_count,
          likes_count,
          client_id,
          creator_id
        `)
        .eq('is_published', true)
        .or('video_url.not.is.null,video_urls.not.is.null')
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      if (data && data.length > 0) {
        const clientIds = [...new Set(data.filter(d => d.client_id).map(d => d.client_id))] as string[];
        const creatorIds = [...new Set(data.filter(d => d.creator_id).map(d => d.creator_id))] as string[];
        const contentIds = data.map(d => d.id);
        
        const [clientsResult, creatorsResult, likesResult] = await Promise.all([
          clientIds.length > 0 
            ? supabase.from('clients').select('id, name').in('id', clientIds)
            : Promise.resolve({ data: [] }),
          creatorIds.length > 0 
            ? supabase.from('profiles').select('id, full_name').in('id', creatorIds)
            : Promise.resolve({ data: [] }),
          supabase.from('content_likes').select('content_id').eq('viewer_id', viewerId).in('content_id', contentIds)
        ]);

        const clientsMap = new Map((clientsResult.data || []).map(c => [c.id, c]));
        const creatorsMap = new Map((creatorsResult.data || []).map(c => [c.id, c]));
        const likedSet = new Set((likesResult.data || []).map(l => l.content_id));

        const enrichedData = data.map(item => ({
          id: item.id,
          title: item.title,
          video_url: item.video_url,
          video_urls: item.video_urls,
          thumbnail_url: item.thumbnail_url,
          views_count: item.views_count || 0,
          likes_count: item.likes_count || 0,
          is_liked: likedSet.has(item.id),
          client: item.client_id ? clientsMap.get(item.client_id) || null : null,
          creator: item.creator_id ? creatorsMap.get(item.creator_id) || null : null,
          creator_id: item.creator_id
        }));

        setContent(enrichedData as PublishedContent[]);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setContentLoading(false);
    }
  };

  const redirectByRole = () => {
    if (roles.length === 0) {
      // No roles assigned yet - redirect to pending access
      navigate('/pending-access');
    } else if (roles.includes('admin')) {
      navigate('/');
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
        console.error('[Auth] Sign in error:', error);
        toast({
          title: 'Error al iniciar sesión',
          description: error.message === 'Invalid login credentials' 
            ? 'Credenciales inválidas' 
            : error.message,
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('[Auth] Unexpected error:', err);
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!fullName.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa tu nombre completo',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    // For organizations, require company name
    if (accountType === 'organization' && !companyName.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa el nombre de tu organización',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    // For clients, require company name
    if (accountType === 'individual' && role === 'client' && !companyName.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa el nombre de tu empresa',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    try {
      // Sign up the user
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

      // If it's an organization, create it
      if (authData.user && accountType === 'organization') {
        const orgTypeLabels = { agency: 'Agencia', community: 'Comunidad', academy: 'Academia' };
        
        // Create the organization
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

        if (orgError) {
          console.error('Error creating organization:', orgError);
        } else if (orgData) {
          // Add user as org member and owner
          await supabase.from('organization_members').insert({
            organization_id: orgData.id,
            user_id: authData.user.id,
            role: 'admin',
            is_owner: true,
          });

          // Also insert into organization_member_roles for multi-role support
          await supabase.from('organization_member_roles').insert({
            organization_id: orgData.id,
            user_id: authData.user.id,
            role: 'admin',
          });

          // Update profile with current org
          await supabase
            .from('profiles')
            .update({ current_organization_id: orgData.id })
            .eq('id', authData.user.id);
        }
      }

      toast({
        title: 'Cuenta creada',
        description: accountType === 'organization'
          ? `Tu ${organizationType === 'agency' ? 'agencia' : organizationType === 'community' ? 'comunidad' : 'academia'} ha sido registrada. Tu solicitud será revisada.`
          : 'Tu cuenta ha sido creada. Tu solicitud será revisada por un administrador.',
      });
      setShowAuthModal(false);
    } catch (error: any) {
      toast({
        title: 'Error al registrarse',
        description: error.message?.includes('already registered') 
          ? 'Este correo ya está registrado' 
          : error.message,
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
        options: {
          redirectTo: `${window.location.origin}/auth`,
        }
      });
      
      if (error) {
        toast({
          title: 'Error con Google',
          description: error.message,
          variant: 'destructive'
        });
        setLoading(false);
      }
    } catch (err) {
      console.error('[Auth] Google sign in error:', err);
      toast({
        title: 'Error',
        description: 'No se pudo conectar con Google',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa tu correo electrónico',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: 'Correo enviado',
          description: 'Revisa tu bandeja de entrada para restablecer tu contraseña',
        });
      }
    } catch (err) {
      console.error('[Auth] Reset password error:', err);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al enviar el correo',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (contentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const { data, error } = await supabase.rpc('toggle_content_like', {
        content_uuid: contentId,
        viewer: viewerId
      });

      if (error) throw error;

      setContent(prev => prev.map(item => {
        if (item.id === contentId) {
          return {
            ...item,
            is_liked: data,
            likes_count: data ? item.likes_count + 1 : Math.max(0, item.likes_count - 1)
          };
        }
        return item;
      }));

      toast({ description: data ? '❤️ Me gusta' : 'Ya no te gusta' });
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleView = useCallback(async (contentId: string) => {
    try {
      await supabase.rpc('increment_content_views', { content_uuid: contentId });
      setContent(prev => prev.map(item => {
        if (item.id === contentId) {
          return { ...item, views_count: item.views_count + 1 };
        }
        return item;
      }));
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }, []);

  const handleShare = async (item: PublishedContent) => {
    const url = `${window.location.origin}/portfolio?v=${item.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Mira este video de ${item.client?.name || 'Creartor Studio'}`,
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ description: 'Link copiado al portapapeles' });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const contentWithVideos = useMemo(() => {
    return content.filter(item => getVideoUrls(item).length > 0);
  }, [content]);

  const tikTokVideos = useMemo(() => {
    return contentWithVideos.map(item => ({
      id: item.id,
      title: item.title,
      videoUrls: getVideoUrls(item),
      thumbnailUrl: item.thumbnail_url,
      viewsCount: item.views_count,
      likesCount: item.likes_count,
      isLiked: item.is_liked,
      creatorId: item.creator_id,
      creatorName: item.creator?.full_name
    }));
  }, [contentWithVideos]);

  const openLogin = () => {
    setAuthTab('login');
    setShowAuthModal(true);
  };

  const openRegister = () => {
    setAuthTab('register');
    setShowAuthModal(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mobile TikTok-style view
  if (isMobile && contentWithVideos.length > 0) {
    return (
      <VideoPlayerProvider>
        <div className="h-screen bg-black overflow-hidden">
          {/* Floating header */}
          <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-gold flex items-center justify-center shadow-lg">
                  <span className="text-black font-bold text-sm">C</span>
                </div>
                <span className="text-white font-bold text-sm">Creartor Studio</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={openLogin}
                  className="text-white hover:bg-white/20 h-8 px-3 text-xs"
                >
                  <LogIn className="h-4 w-4 mr-1" />
                  Entrar
                </Button>
                <Button
                  size="sm"
                  onClick={openRegister}
                  className="bg-gradient-gold text-black font-semibold text-xs px-3 h-8"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Registro
                </Button>
              </div>
            </div>
          </div>

          {/* TikTok Feed */}
          <TikTokFeed
            videos={tikTokVideos}
            onLike={(id, e) => handleLike(id, e)}
            onView={(id) => handleView(id)}
            onShare={(video) => handleShare({ id: video.id, title: video.title } as PublishedContent)}
          />

          {/* Auth Modal */}
          {showAuthModal && (
            <div 
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowAuthModal(false)}
            >
              <Card 
                className="w-full max-w-md relative bg-card border-border"
                onClick={e => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAuthModal(false)}
                  className="absolute right-2 top-2 z-10"
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardHeader className="text-center">
                  <CardTitle>Creartor Studio</CardTitle>
                  <CardDescription>Red de creadores de contenido</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as 'login' | 'register')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                      <TabsTrigger value="register">Registrarse</TabsTrigger>
                    </TabsList>
                    <TabsContent value="login" className="space-y-4 mt-4">
                      {showForgotPassword ? (
                        <div className="space-y-4">
                          {resetEmailSent ? (
                            <div className="text-center py-4">
                              <p className="text-sm text-muted-foreground mb-4">
                                Revisa tu correo <span className="font-medium">{email}</span>
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setShowForgotPassword(false);
                                  setResetEmailSent(false);
                                }}
                              >
                                Volver
                              </Button>
                            </div>
                          ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                              <p className="text-sm text-muted-foreground text-center">
                                Ingresa tu correo para recuperar tu contraseña
                              </p>
                              <div className="space-y-2">
                                <Label htmlFor="mobile-reset-email">Email</Label>
                                <Input 
                                  id="mobile-reset-email" 
                                  type="email" 
                                  value={email} 
                                  onChange={(e) => setEmail(e.target.value)} 
                                  required 
                                />
                              </div>
                              <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Enviar enlace
                              </Button>
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="sm"
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
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="password">Contraseña</Label>
                              <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="text-xs text-primary hover:underline"
                              >
                                ¿Olvidaste?
                              </button>
                            </div>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                          </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
                    <TabsContent value="register" className="space-y-4 mt-4">
                      <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nombre completo</Label>
                          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Contraseña</Label>
                          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Tipo de cuenta</Label>
                          <Select value={accountType} onValueChange={(v) => setAccountType(v as 'individual' | 'organization')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="individual">Persona (Creador, Editor, Marca)</SelectItem>
                              <SelectItem value="organization">Organización (Agencia, Comunidad, Academia)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {accountType === 'organization' ? (
                          <>
                            <div className="space-y-2">
                              <Label>Tipo de organización</Label>
                              <Select value={organizationType} onValueChange={(v) => setOrganizationType(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="agency">Agencia</SelectItem>
                                  <SelectItem value="community">Comunidad</SelectItem>
                                  <SelectItem value="academy">Academia</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Nombre de la organización</Label>
                              <Input 
                                value={companyName} 
                                onChange={(e) => setCompanyName(e.target.value)} 
                                placeholder="Nombre de tu agencia, comunidad o academia"
                                required 
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label>¿Cómo quieres unirte?</Label>
                              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="creator">Creador</SelectItem>
                                  <SelectItem value="editor">Editor</SelectItem>
                                  <SelectItem value="client">Marca / Cliente</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {role === 'client' && (
                              <div className="space-y-2">
                                <Label>Nombre de tu empresa</Label>
                                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                              </div>
                            )}
                          </>
                        )}
                        
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
      </VideoPlayerProvider>
    );
  }

  return (
    <VideoPlayerProvider>
      <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-black">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-primary/20">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-gold flex items-center justify-center shadow-lg glow-gold">
                <span className="text-black font-bold text-lg">C</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-xl">Creartor Studio</h1>
                <p className="text-primary text-xs">Red de Creadores</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={openLogin}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                Iniciar Sesión
              </Button>
              <Button onClick={openRegister} className="bg-gradient-gold text-black font-semibold hover:opacity-90 glow-gold">
                Registrarse
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 md:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Contenido de <span className="text-transparent bg-clip-text bg-gradient-gold">Alta Calidad</span>
            </h2>
            <p className="text-lg md:text-xl text-white/60 mb-8 max-w-2xl mx-auto">
              Descubre nuestro portafolio de videos creados por los mejores creadores. 
              Únete como creador, editor o cliente.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={openRegister} className="w-full sm:w-auto bg-gradient-gold text-black font-semibold hover:opacity-90 glow-gold">
                Comenzar Ahora
              </Button>
              <Button size="lg" variant="outline" onClick={openLogin} className="w-full sm:w-auto border-primary/50 text-white hover:bg-primary/20 hover:border-primary">
                Ya tengo cuenta
              </Button>
            </div>
          </div>
        </section>

        {/* Video Gallery */}
        <section className="px-4 pb-16">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Nuestro Portafolio
            </h3>
            
            {contentLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="aspect-[9/16] rounded-xl bg-white/10 animate-pulse" />
                ))}
              </div>
            ) : contentWithVideos.length === 0 ? (
              <div className="text-center py-16">
                <Play className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                <p className="text-white/60">Próximamente más contenido</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {contentWithVideos.map((item, index) => {
                  const videoUrls = getVideoUrls(item);
                  return (
                    <BunnyVideoCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      videoUrls={videoUrls}
                      thumbnailUrl={item.thumbnail_url}
                      viewsCount={item.views_count}
                      likesCount={item.likes_count}
                      isLiked={item.is_liked}
                      creatorId={item.creator_id || undefined}
                      creatorName={item.creator?.full_name}
                      isAdmin={false}
                      onLike={(e) => handleLike(item.id, e)}
                      onView={() => handleView(item.id)}
                      onShare={() => handleShare(item)}
                      onOpenFullscreen={() => setFullscreenIndex(index)}
                      hideControls={true}
                      alwaysShowActions={true}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 py-16 border-t border-primary/20">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-white text-center mb-12">¿Cómo funciona?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-all">
                <div className="w-16 h-16 rounded-full bg-gradient-gold/20 flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-white font-semibold mb-2">Creadores</h4>
                <p className="text-white/60 text-sm">
                  Graba contenido auténtico y recibe pago por cada video aprobado
                </p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                <h4 className="text-white font-semibold mb-2">Editores</h4>
                <p className="text-white/60 text-sm">
                  Edita y produce videos de alta calidad para marcas reconocidas
                </p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-blue-400" />
                </div>
                <h4 className="text-white font-semibold mb-2">Marcas</h4>
                <p className="text-white/60 text-sm">
                  Obtén contenido auténtico que conecta con tu audiencia
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-16 bg-gradient-to-r from-primary/20 via-purple-500/10 to-primary/20">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¿Listo para empezar?
            </h3>
            <p className="text-white/60 mb-8">
              Únete a nuestra comunidad de creadores y marcas
            </p>
            <Button size="lg" onClick={openRegister} className="bg-white text-black hover:bg-white/90 font-semibold shadow-xl">
              Crear Cuenta Gratis
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 py-8 border-t border-primary/20">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-gold flex items-center justify-center">
                <span className="text-black font-bold text-sm">C</span>
              </div>
              <span className="text-white/60 text-sm">Creartor Studio</span>
            </div>
            <p className="text-white/40 text-sm">© 2024 Todos los derechos reservados</p>
          </div>
        </footer>

        {/* Auth Modal */}
        {showAuthModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAuthModal(false)}
          >
            <Card 
              className="w-full max-w-md relative bg-card border-border"
              onClick={e => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2"
                onClick={() => setShowAuthModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <CardHeader className="text-center pt-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-gold flex items-center justify-center">
                    <span className="text-black font-bold">C</span>
                  </div>
                  <span className="font-bold text-lg">Creartor Studio</span>
                </div>
                <CardTitle className="text-2xl">
                  {authTab === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
                </CardTitle>
                <CardDescription>
                  {authTab === 'login' 
                    ? 'Ingresa tus credenciales para continuar' 
                    : 'Completa tus datos para registrarte'}
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
                              Revisa tu bandeja de entrada en <span className="font-medium">{email}</span> y sigue las instrucciones para restablecer tu contraseña.
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setShowForgotPassword(false);
                                setResetEmailSent(false);
                              }}
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
                              {loading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Enviando...
                                </>
                              ) : (
                                'Enviar enlace de recuperación'
                              )}
                            </Button>
                            <Button 
                              type="button"
                              variant="ghost" 
                              onClick={() => setShowForgotPassword(false)}
                              className="w-full"
                            >
                              Volver al inicio de sesión
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
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Iniciando...
                            </>
                          ) : (
                            'Iniciar Sesión'
                          )}
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
                            <SelectItem value="organization">Organización (Agencia, Comunidad, Academia)</SelectItem>
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
                              placeholder="Nombre de tu agencia, comunidad o academia"
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
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Registrando...
                          </>
                        ) : (
                          'Crear Cuenta'
                        )}
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

        {/* Fullscreen Video Viewer */}
        {fullscreenIndex !== null && contentWithVideos.length > 0 && (
          <FullscreenVideoViewer
            videos={contentWithVideos.map(item => ({
              id: item.id,
              title: item.title,
              videoUrls: getVideoUrls(item),
              thumbnailUrl: item.thumbnail_url,
              viewsCount: item.views_count,
              likesCount: item.likes_count,
              isLiked: item.is_liked,
              clientName: item.client?.name,
              creatorName: item.creator?.full_name
            }))}
            initialIndex={fullscreenIndex}
            onClose={() => setFullscreenIndex(null)}
            onLike={(id) => handleLike(id)}
            onView={(id) => handleView(id)}
          />
        )}
      </div>
    </VideoPlayerProvider>
  );
}
