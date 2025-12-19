import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Play, Eye, Heart, X, Volume2, VolumeX, Pause, LogIn } from 'lucide-react';
import { AppRole } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';

interface PublishedContent {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  client: { name: string } | null;
  views_count: number;
  likes_count: number;
}

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, rolesLoaded, signIn, signUp, roles } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<AppRole>('creator');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  
  // Content state
  const [content, setContent] = useState<PublishedContent[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    // Wait until roles are resolved before redirecting to avoid mobile redirect loops
    if (user && !authLoading && rolesLoaded) {
      redirectByRole();
    }
  }, [user, authLoading, rolesLoaded, roles]);

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
          thumbnail_url,
          views_count,
          likes_count,
          client_id
        `)
        .eq('is_published', true)
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      if (data && data.length > 0) {
        const clientIds = [...new Set(data.filter(d => d.client_id).map(d => d.client_id))] as string[];
        
        const clientsResult = clientIds.length > 0 
          ? await supabase.from('clients').select('id, name').in('id', clientIds)
          : { data: [] };

        const clientsMap = new Map((clientsResult.data || []).map(c => [c.id, c]));

        const enrichedData = data.map(item => ({
          ...item,
          views_count: item.views_count || 0,
          likes_count: item.likes_count || 0,
          client: item.client_id ? clientsMap.get(item.client_id) || null : null
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
    if (roles.includes('admin')) {
      navigate('/');
    } else if (roles.includes('creator')) {
      navigate('/creator-dashboard');
    } else if (roles.includes('editor')) {
      navigate('/editor-dashboard');
    } else if (roles.includes('client')) {
      navigate('/client-dashboard');
    } else {
      // If no roles are assigned yet, keep user in a safe place
      navigate('/settings');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message === 'Invalid login credentials' 
          ? 'Credenciales inválidas' 
          : error.message,
        variant: 'destructive'
      });
    }

    setLoading(false);
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

    if (role === 'client' && !companyName.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa el nombre de tu empresa',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName, role, role === 'client' ? companyName : undefined);

    if (error) {
      toast({
        title: 'Error al registrarse',
        description: error.message.includes('already registered') 
          ? 'Este correo ya está registrado' 
          : error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Cuenta creada',
        description: role === 'client' 
          ? 'Tu cuenta y empresa han sido creadas exitosamente'
          : 'Tu cuenta ha sido creada exitosamente',
      });
      setShowAuthModal(false);
    }

    setLoading(false);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

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

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-white font-bold text-xl">UGC Colombia</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={openLogin}
              className="text-white hover:bg-white/10"
            >
              Iniciar Sesión
            </Button>
            <Button onClick={openRegister} className="bg-primary hover:bg-primary/90">
              Registrarse
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Contenido UGC de <span className="text-primary">Alta Calidad</span>
          </h2>
          <p className="text-lg text-white/60 mb-8 max-w-2xl mx-auto">
            Descubre nuestro portafolio de videos creados por los mejores creadores de Colombia. 
            Únete como creador, editor o cliente.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={openRegister} className="bg-primary hover:bg-primary/90">
              Comenzar Ahora
            </Button>
            <Button size="lg" variant="outline" onClick={openLogin} className="border-white/30 text-white hover:bg-white/10">
              Ya tengo cuenta
            </Button>
          </div>
        </div>
      </section>

      {/* Video Gallery */}
      <section className="px-4 pb-16">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-6">Nuestro Portafolio</h3>
          
          {contentLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[9/16] rounded-xl bg-white/10 animate-pulse" />
              ))}
            </div>
          ) : content.length === 0 ? (
            <div className="text-center py-16">
              <Play className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/60">Próximamente más contenido</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {content.map((item) => (
                <PublicVideoCard
                  key={item.id}
                  content={item}
                  formatCount={formatCount}
                  onAuthRequired={openLogin}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl font-bold text-white text-center mb-12">¿Cómo funciona?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-white font-semibold mb-2">Creadores</h4>
              <p className="text-white/60 text-sm">
                Graba contenido UGC auténtico y recibe pago por cada video aprobado
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <h4 className="text-white font-semibold mb-2">Editores</h4>
              <p className="text-white/60 text-sm">
                Edita y produce videos de alta calidad para marcas reconocidas
              </p>
            </div>
            <div className="text-center">
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
      <section className="px-4 py-16 bg-gradient-to-r from-primary/20 to-purple-500/20">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            ¿Listo para empezar?
          </h3>
          <p className="text-white/60 mb-8">
            Únete a nuestra comunidad de creadores y marcas
          </p>
          <Button size="lg" onClick={openRegister} className="bg-white text-black hover:bg-white/90">
            Crear Cuenta Gratis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-white/60 text-sm">UGC Colombia</span>
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
            className="w-full max-w-md relative"
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
                <Sparkles className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg">UGC Colombia</span>
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
                      <Label htmlFor="login-password">Contraseña</Label>
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
                  </form>
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
                      <Label htmlFor="register-role">¿Qué eres?</Label>
                      <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tu rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="creator">Creador de contenido</SelectItem>
                          <SelectItem value="editor">Editor de video</SelectItem>
                          <SelectItem value="client">Cliente / Empresa</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {role === 'client' 
                          ? 'Ingresa también el nombre de tu empresa'
                          : 'Selecciona tu rol en la plataforma'}
                      </p>
                    </div>
                    
                    {role === 'client' && (
                      <div className="space-y-2">
                        <Label htmlFor="register-company">Nombre de la Empresa</Label>
                        <Input
                          id="register-company"
                          type="text"
                          placeholder="Mi Empresa S.A.S"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required
                        />
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando cuenta...
                        </>
                      ) : (
                        'Crear Cuenta'
                      )}
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

// Public Video Card with hover/scroll autoplay
interface PublicVideoCardProps {
  content: PublishedContent;
  formatCount: (count: number) => string;
  onAuthRequired: () => void;
}

function PublicVideoCard({ content, formatCount, onAuthRequired }: PublicVideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Intersection Observer for mobile scroll autoplay
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting && entry.intersectionRatio > 0.6);
      },
      { threshold: [0, 0.6, 1] }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle play/pause based on hover (desktop) or scroll (mobile)
  useEffect(() => {
    const shouldPlay = isMobile ? isInView : isHovering;
    
    if (shouldPlay && !isPlaying) {
      setIsPlaying(true);
    } else if (!shouldPlay && isPlaying && !isHovering) {
      // Don't auto-pause if user clicked to play
    }
  }, [isHovering, isInView, isMobile]);

  // Control video playback
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const getThumbnail = () => {
    if (content.thumbnail_url) return content.thumbnail_url;
    const url = content.video_url;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1];
      if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    return null;
  };

  const getVideoSrc = () => {
    const url = content.video_url;
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return url;
    }
    return null;
  };

  const getEmbedUrl = () => {
    const url = content.video_url;
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let embedUrl = url;
      if (url.includes('/shorts/')) {
        embedUrl = url.replace('/shorts/', '/embed/');
      } else if (url.includes('watch?v=')) {
        embedUrl = url.replace('watch?v=', 'embed/');
      } else if (url.includes('youtu.be/')) {
        embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
      }
      return embedUrl + '?autoplay=1&mute=1&modestbranding=1&rel=0&showinfo=0';
    }

    if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }

    return null;
  };

  const thumbnail = getThumbnail();
  const videoSrc = getVideoSrc();
  const embedUrl = getEmbedUrl();

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovering(true);
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovering(false);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }
  };

  const handleClick = () => {
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="group relative rounded-xl overflow-hidden bg-gray-900 border border-white/10 hover:border-white/30 transition-all cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="relative aspect-[9/16] bg-black">
        {!isPlaying ? (
          <>
            {/* Thumbnail */}
            {thumbnail ? (
              <img 
                src={thumbnail} 
                alt={content.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Play className="h-12 w-12 text-white/50" />
              </div>
            )}
            
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                <Play className="h-10 w-10 text-white" fill="white" />
              </div>
            </div>

            {/* Stats */}
            <div className="absolute bottom-2 left-2 flex items-center gap-3">
              <div className="flex items-center gap-1 text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                <Eye className="h-3 w-3" />
                {formatCount(content.views_count)}
              </div>
              <div className="flex items-center gap-1 text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                <Heart className="h-3 w-3" />
                {formatCount(content.likes_count)}
              </div>
            </div>

            {/* Like button - requires auth */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAuthRequired();
              }}
              className="absolute bottom-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-red-500/80 transition-colors"
            >
              <Heart className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            {/* Video Player */}
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-cover"
                muted={isMuted}
                playsInline
                loop
                autoPlay
              />
            ) : embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60">
                <Play className="h-12 w-12" />
              </div>
            )}

            {/* Controls overlay */}
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={handleStop}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <Pause className="h-4 w-4" />
              </button>
              {videoSrc && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-gray-900">
        <h3 className="font-medium text-sm text-white line-clamp-2 mb-1">
          {content.title}
        </h3>
        {content.client && (
          <p className="text-xs text-white/60">{content.client.name}</p>
        )}
      </div>
    </div>
  );
}
