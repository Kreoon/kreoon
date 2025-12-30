import { useState, useEffect, memo } from 'react';
import { ProfileBlock } from '@/hooks/usePortfolioPermissions';
import { usePortfolioPermissions } from '@/hooks/usePortfolioPermissions';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Play, Image as ImageIcon, Award, Quote, Star, Building2, Users, FileText, CreditCard, Lock, MessageSquare, TrendingUp, Eye, Heart, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';

interface ProfileBlocksRendererProps {
  blocks: ProfileBlock[];
  userId: string;
  isOwner: boolean;
  editMode?: boolean;
}

const ProfileBlocksRenderer = memo(function ProfileBlocksRenderer({
  blocks,
  userId,
  isOwner,
  editMode = false,
}: ProfileBlocksRendererProps) {
  const { canViewBlock } = usePortfolioPermissions();

  const visibleBlocks = blocks
    .filter(block => block.enabled && canViewBlock(block, isOwner, userId))
    .sort((a, b) => a.order - b.order);

  if (visibleBlocks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay contenido para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visibleBlocks.map(block => (
        <BlockRenderer 
          key={block.key} 
          block={block} 
          userId={userId}
          isOwner={isOwner}
          editMode={editMode}
        />
      ))}
    </div>
  );
});

export default ProfileBlocksRenderer;

interface BlockRendererProps {
  block: ProfileBlock;
  userId: string;
  isOwner: boolean;
  editMode: boolean;
}

const BlockRenderer = memo(function BlockRenderer({ 
  block, 
  userId,
  isOwner,
  editMode 
}: BlockRendererProps) {
  const renderBlockContent = () => {
    switch (block.key) {
      case 'portfolio_grid':
        return <PortfolioGridBlock userId={userId} />;
      case 'hero':
        return <HeroBlock userId={userId} isOwner={isOwner} />;
      case 'highlights':
        return <HighlightsBlock userId={userId} />;
      case 'skills':
        return <SkillsBlock userId={userId} />;
      case 'certifications':
        return <CertificationsBlock userId={userId} />;
      case 'testimonials':
        return <TestimonialsBlock userId={userId} />;
      case 'public_stats':
        return <PublicStatsBlock userId={userId} />;
      case 'collections':
        return <CollectionsBlock userId={userId} />;
      // Internal blocks
      case 'internal_verification':
        return <InternalVerificationBlock userId={userId} />;
      case 'private_contact':
        return <PrivateContactBlock userId={userId} />;
      case 'legal_id':
        return <LegalIdBlock userId={userId} />;
      case 'payment_info':
        return <PaymentInfoBlock userId={userId} />;
      case 'internal_notes':
        return <InternalNotesBlock userId={userId} />;
      case 'internal_metrics':
        return <InternalMetricsBlock userId={userId} />;
      default:
        return null;
    }
  };

  const content = renderBlockContent();
  if (!content) return null;

  return (
    <section className={cn(
      editMode && "ring-2 ring-primary/20 ring-offset-2 rounded-lg relative",
      block.is_internal && "bg-yellow-500/5 rounded-lg"
    )}>
      {editMode && (
        <div className="absolute -top-2 -left-2 z-10">
          <Badge variant="secondary" className="text-xs">
            {block.label}
          </Badge>
        </div>
      )}
      {content}
    </section>
  );
});

// =============================================================================
// Block Components
// =============================================================================

interface Post {
  id: string;
  media_url: string;
  media_type: string;
  thumbnail_url: string | null;
  views_count: number | null;
  likes_count: number | null;
}

function PortfolioGridBlock({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('portfolio_posts')
        .select('id, media_url, media_type, thumbnail_url, views_count, likes_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(12);

      if (!error && data) {
        setPosts(data);
      }
      setLoading(false);
    };

    fetchPosts();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5]" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No hay publicaciones aún</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map(post => {
        // Get Bunny CDN thumbnail for videos (same as main feed)
        const bunnyUrls = post.media_type === 'video' ? getBunnyVideoUrls(post.media_url) : null;
        const effectiveThumbnail = bunnyUrls?.thumbnail || post.thumbnail_url;
        
        return (
          <div
            key={post.id}
            className="aspect-[4/5] relative group cursor-pointer overflow-hidden rounded-sm bg-muted"
          >
            {post.media_type === 'video' ? (
              <>
                {effectiveThumbnail ? (
                  <img
                    src={effectiveThumbnail}
                    alt="Post"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Play className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {/* Video indicator - glassmorphism style like main feed */}
                <div className="absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md bg-black/30 border border-white/10">
                  <Play className="h-3.5 w-3.5 text-white fill-white" />
                </div>
                {/* Views count */}
                {(post.views_count ?? 0) > 0 && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-black/40 border border-white/10">
                    <Eye className="h-3 w-3 text-white/80" />
                    <span className="text-white text-xs font-medium">{post.views_count}</span>
                  </div>
                )}
              </>
            ) : (
              <img
                src={post.media_url}
                alt="Post"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            )}
            
            {/* Hover overlay with stats - glassmorphism style */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="flex items-center gap-4 px-4 py-2 rounded-full backdrop-blur-xl bg-white/10 border border-white/20">
                {(post.likes_count ?? 0) >= 0 && (
                  <span className="flex items-center gap-1.5 text-white text-sm font-semibold">
                    <Heart className="h-4 w-4 text-red-400 fill-red-400" />
                    {post.likes_count ?? 0}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HeroBlock({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, avatar_url, bio, city, country')
      .eq('id', userId)
      .single()
      .then(({ data }) => setProfile(data));
  }, [userId]);

  if (!profile) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-6">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Avatar className="h-20 w-20 ring-4 ring-background">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback className="text-2xl">{profile.full_name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold">{profile.full_name}</h2>
          {profile.city && profile.country && (
            <p className="text-sm text-muted-foreground">📍 {profile.city}, {profile.country}</p>
          )}
          {profile.bio && (
            <p className="text-sm mt-2 max-w-md">{profile.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HighlightsBlock({ userId }: { userId: string }) {
  const [highlights, setHighlights] = useState<any[]>([]);

  useEffect(() => {
    // TODO: Fetch highlights/stories that are pinned
    setHighlights([]);
  }, [userId]);

  if (highlights.length === 0) {
    return (
      <div className="flex gap-4 overflow-x-auto py-2 px-1">
        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
          <span className="text-2xl">+</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto py-2 px-1">
      {highlights.map((h, i) => (
        <div key={i} className="flex-shrink-0 w-16 h-16 rounded-full ring-2 ring-primary overflow-hidden">
          <img src={h.cover_url} alt={h.title} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

function SkillsBlock({ userId }: { userId: string }) {
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => {
    // Skills/categories could be fetched from a different table or profile metadata
    // For now, show placeholder
    setSkills([]);
  }, [userId]);

  if (skills.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4" /> Skills & Categorías
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay skills configuradas</p>
        </CardContent>
      </Card>
    );
  }

  if (skills.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Star className="h-4 w-4" /> Skills & Categorías
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, i) => (
            <Badge key={i} variant="secondary">{skill}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CertificationsBlock({ userId }: { userId: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Award className="h-4 w-4" /> Certificaciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">No hay certificaciones aún</p>
      </CardContent>
    </Card>
  );
}

function TestimonialsBlock({ userId }: { userId: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Quote className="h-4 w-4" /> Testimonios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground italic">"Próximamente..."</p>
      </CardContent>
    </Card>
  );
}

function PublicStatsBlock({ userId }: { userId: string }) {
  const [stats, setStats] = useState({ views: 0, likes: 0, followers: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [postsRes, followersRes] = await Promise.all([
        supabase
          .from('portfolio_posts')
          .select('views_count, likes_count')
          .eq('user_id', userId),
        supabase
          .from('followers')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId),
      ]);

      const posts = postsRes.data || [];
      const totalViews = posts.reduce((sum, p) => sum + (p.views_count || 0), 0);
      const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);

      setStats({
        views: totalViews,
        likes: totalLikes,
        followers: followersRes.count || 0,
      });
    };

    fetchStats();
  }, [userId]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="text-center py-4">
        <div className="text-2xl font-bold">{stats.views}</div>
        <div className="text-xs text-muted-foreground">Vistas</div>
      </Card>
      <Card className="text-center py-4">
        <div className="text-2xl font-bold">{stats.likes}</div>
        <div className="text-xs text-muted-foreground">Likes</div>
      </Card>
      <Card className="text-center py-4">
        <div className="text-2xl font-bold">{stats.followers}</div>
        <div className="text-xs text-muted-foreground">Seguidores</div>
      </Card>
    </div>
  );
}

function CollectionsBlock({ userId }: { userId: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Marcas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Marcas con las que ha trabajado</p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Internal Blocks (Admin only)
// =============================================================================

function InternalVerificationBlock({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('is_verified, verification_date')
      .eq('id', userId)
      .single()
      .then(({ data }) => setProfile(data));
  }, [userId]);

  return (
    <Card className="border-yellow-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
          <Lock className="h-4 w-4" /> Verificación
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant={profile?.is_verified ? 'default' : 'secondary'}>
          {profile?.is_verified ? '✓ Verificado' : 'No verificado'}
        </Badge>
      </CardContent>
    </Card>
  );
}

function PrivateContactBlock({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('phone, email')
      .eq('id', userId)
      .single()
      .then(({ data }) => setProfile(data));
  }, [userId]);

  return (
    <Card className="border-yellow-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
          <Users className="h-4 w-4" /> Contacto privado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p>📧 {profile?.email || 'No disponible'}</p>
        <p>📱 {profile?.phone || 'No disponible'}</p>
      </CardContent>
    </Card>
  );
}

function LegalIdBlock({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('document_type, document_number')
      .eq('id', userId)
      .single()
      .then(({ data }) => setProfile(data));
  }, [userId]);

  return (
    <Card className="border-yellow-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
          <FileText className="h-4 w-4" /> Documento Legal
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <p>{profile?.document_type || 'N/A'}: {profile?.document_number || 'No registrado'}</p>
      </CardContent>
    </Card>
  );
}

function PaymentInfoBlock({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('payment_method, payment_account')
      .eq('id', userId)
      .single()
      .then(({ data }) => setProfile(data));
  }, [userId]);

  return (
    <Card className="border-yellow-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
          <CreditCard className="h-4 w-4" /> Info de Pago
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <p>{profile?.payment_method || 'No configurado'}</p>
        <p className="text-muted-foreground">{profile?.payment_account || ''}</p>
      </CardContent>
    </Card>
  );
}

function InternalNotesBlock({ userId }: { userId: string }) {
  return (
    <Card className="border-yellow-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
          <MessageSquare className="h-4 w-4" /> Notas Internas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Sin notas</p>
      </CardContent>
    </Card>
  );
}

function InternalMetricsBlock({ userId }: { userId: string }) {
  const [metrics, setMetrics] = useState({ content: 0, earnings: 0 });

  useEffect(() => {
    supabase
      .from('content')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', userId)
      .then(({ count }) => {
        setMetrics(prev => ({ ...prev, content: count || 0 }));
      });
  }, [userId]);

  return (
    <Card className="border-yellow-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
          <TrendingUp className="h-4 w-4" /> Métricas Internas
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-xl font-bold">{metrics.content}</div>
          <div className="text-xs text-muted-foreground">Contenidos</div>
        </div>
        <div>
          <div className="text-xl font-bold">$0</div>
          <div className="text-xs text-muted-foreground">Pagos</div>
        </div>
      </CardContent>
    </Card>
  );
}
