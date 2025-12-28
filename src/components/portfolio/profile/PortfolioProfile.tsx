import { useState, useEffect, memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Edit, Settings, MapPin, Briefcase, Link2, Instagram, 
  Play, Grid, Bookmark, Star, Eye, Heart, Users, Calendar,
  ExternalLink, Mail, Globe, X, Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileData {
  id: string;
  full_name: string;
  username: string;
  bio: string;
  tagline: string;
  avatar_url: string;
  cover_url: string;
  city: string;
  country: string;
  best_at: string;
  specialties_tags: string[];
  content_categories: string[];
  industries: string[];
  languages: string[];
  experience_level: string;
  instagram: string;
  tiktok: string;
  portfolio_url: string;
  is_public: boolean;
}

interface ProfileStats {
  posts_count: number;
  videos_count: number;
  followers_count: number;
  following_count: number;
  views_count: number;
  likes_count: number;
}

interface PortfolioProfileProps {
  userId: string;
  isOwner?: boolean;
  onEditProfile?: () => void;
  onEditBlocks?: () => void;
}

export const PortfolioProfile = memo(function PortfolioProfile({
  userId,
  isOwner = false,
  onEditProfile,
  onEditBlocks,
}: PortfolioProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    posts_count: 0,
    videos_count: 0,
    followers_count: 0,
    following_count: 0,
    views_count: 0,
    likes_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'grid' | 'videos' | 'about'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, postsRes, videosRes, followersRes, followingRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase
            .from('portfolio_posts')
            .select('id, views_count, likes_count', { count: 'exact' })
            .eq('user_id', userId),
          supabase
            .from('portfolio_posts')
            .select('id', { count: 'exact' })
            .eq('user_id', userId)
            .eq('media_type', 'video'),
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', userId),
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', userId),
        ]);

        if (profileRes.data) {
          setProfile(profileRes.data as any);
        }

        const totalViews = postsRes.data?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
        const totalLikes = postsRes.data?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;

        setStats({
          posts_count: postsRes.count || 0,
          videos_count: videosRes.count || 0,
          followers_count: followersRes.count || 0,
          following_count: followingRes.count || 0,
          views_count: totalViews,
          likes_count: totalLikes,
        });
      } catch (error) {
        console.error('[PortfolioProfile] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Perfil no encontrado
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner Section */}
      <section className="relative">
        {/* Cover Image */}
        <div className="h-48 sm:h-64 md:h-80 relative overflow-hidden">
          {profile.cover_url ? (
            <img
              src={profile.cover_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-secondary/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          
          {/* Edit Cover Button */}
          {isOwner && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm"
              onClick={onEditProfile}
            >
              <Camera className="h-4 w-4 mr-2" />
              Editar portada
            </Button>
          )}
        </div>

        {/* Profile Info Overlay */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 -mt-16 sm:-mt-20">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 flex-shrink-0"
            >
              <Avatar className="h-28 w-28 sm:h-36 sm:w-36 ring-4 ring-background shadow-2xl">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                  {profile.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <div className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-success ring-4 ring-background" />
            </motion.div>

            {/* Name & Info */}
            <div className="flex-1 pt-2 sm:pt-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {profile.full_name}
                  </h1>
                  {profile.username && (
                    <p className="text-muted-foreground">@{profile.username}</p>
                  )}
                  {profile.tagline && (
                    <p className="text-lg text-foreground/80 mt-1 max-w-xl">
                      {profile.tagline}
                    </p>
                  )}
                  
                  {/* Location & Links */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                    {(profile.city || profile.country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {[profile.city, profile.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {profile.portfolio_url && (
                      <a 
                        href={profile.portfolio_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <Link2 className="h-4 w-4" />
                        Portfolio
                      </a>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <>
                      <Button variant="outline" size="sm" onClick={onEditProfile}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar perfil
                      </Button>
                      <Button variant="ghost" size="icon" onClick={onEditBlocks}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button className="bg-gradient-to-r from-primary to-primary/80">
                        Seguir
                      </Button>
                      <Button variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Mensaje
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 p-4 bg-card rounded-xl border shadow-sm">
          <StatItem icon={<Grid className="h-4 w-4" />} value={stats.posts_count} label="Posts" />
          <StatItem icon={<Play className="h-4 w-4" />} value={stats.videos_count} label="Videos" />
          <StatItem icon={<Users className="h-4 w-4" />} value={stats.followers_count} label="Seguidores" />
          <StatItem icon={<Users className="h-4 w-4" />} value={stats.following_count} label="Siguiendo" />
          <StatItem icon={<Eye className="h-4 w-4" />} value={stats.views_count} label="Vistas" />
          <StatItem icon={<Heart className="h-4 w-4" />} value={stats.likes_count} label="Likes" />
        </div>
      </section>

      {/* Content Tabs */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-12 p-0 gap-6">
            <TabsTrigger 
              value="grid" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-12 px-1"
            >
              <Grid className="h-4 w-4 mr-2" />
              Galería
            </TabsTrigger>
            <TabsTrigger 
              value="videos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-12 px-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Videos
            </TabsTrigger>
            <TabsTrigger 
              value="about"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-12 px-1"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Sobre mí
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="mt-6">
            <PortfolioMosaic userId={userId} onSelect={setSelectedMedia} />
          </TabsContent>

          <TabsContent value="videos" className="mt-6">
            <PresentationVideoSection userId={userId} isOwner={isOwner} />
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Todos los videos</h3>
              <VideoGallery userId={userId} onSelect={setSelectedMedia} />
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <AboutSection profile={profile} />
          </TabsContent>
        </Tabs>
      </section>

      {/* Media Viewer Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <MediaViewer media={selectedMedia} onClose={() => setSelectedMedia(null)} />
        )}
      </AnimatePresence>
    </div>
  );
});

// =============================================================================
// Sub Components
// =============================================================================

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
      </div>
      <div className="text-xl font-bold">{formatNumber(value)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function PortfolioMosaic({ userId, onSelect }: { userId: string; onSelect: (media: any) => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('portfolio_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      setPosts(data || []);
      setLoading(false);
    };
    fetchPosts();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={cn("rounded-lg", i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square")} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Grid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Sin publicaciones aún</h3>
        <p className="text-sm text-muted-foreground">Las imágenes y videos aparecerán aquí</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 auto-rows-[200px]">
      {posts.map((post, index) => {
        // First item takes 2x2 space
        const isLarge = index === 0;
        // Every 5th item after first takes 2 columns
        const isWide = index > 0 && index % 5 === 0;
        
        return (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(post)}
            className={cn(
              "relative group cursor-pointer overflow-hidden rounded-lg bg-muted",
              isLarge && "col-span-2 row-span-2",
              isWide && "col-span-2"
            )}
          >
            <img
              src={post.thumbnail_url || post.media_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            
            {/* Video indicator */}
            {post.media_type === 'video' && (
              <div className="absolute top-3 right-3">
                <Play className="h-5 w-5 text-white drop-shadow-lg fill-white/60" />
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-4 text-white text-sm">
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  {post.likes_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {post.views_count || 0}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function PresentationVideoSection({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      // Get the first video as presentation
      const { data: firstVideo } = await supabase
        .from('portfolio_posts')
        .select('id, media_url, thumbnail_url, caption, views_count, likes_count, media_type')
        .eq('user_id', userId)
        .eq('media_type', 'video')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setVideo(firstVideo);
      setLoading(false);
    };
    fetchVideo();
  }, [userId]);

  if (loading) {
    return <Skeleton className="aspect-video rounded-xl" />;
  }

  if (!video) {
    return (
      <Card className="aspect-video flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
        <div className="text-center p-8">
          <Play className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Video de presentación</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Muestra tu mejor trabajo con un video destacado
          </p>
          {isOwner && (
            <Button variant="outline">
              <Camera className="h-4 w-4 mr-2" />
              Subir video
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
      <video
        src={video.media_url}
        poster={video.thumbnail_url}
        controls
        className="w-full h-full object-contain"
      />
      <Badge className="absolute top-4 left-4 bg-primary/90">
        <Star className="h-3 w-3 mr-1" />
        Video destacado
      </Badge>
    </div>
  );
}

function VideoGallery({ userId, onSelect }: { userId: string; onSelect: (media: any) => void }) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase
        .from('portfolio_posts')
        .select('*')
        .eq('user_id', userId)
        .eq('media_type', 'video')
        .order('created_at', { ascending: false });

      setVideos(data || []);
      setLoading(false);
    };
    fetchVideos();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[9/16] rounded-lg" />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {videos.map((video, index) => (
        <motion.div
          key={video.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(video)}
          className="aspect-[9/16] relative group cursor-pointer overflow-hidden rounded-lg bg-muted"
        >
          <img
            src={video.thumbnail_url || '/placeholder.svg'}
            alt=""
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="h-12 w-12 text-white" />
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white text-xs">
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {video.views_count || 0}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AboutSection({ profile }: { profile: ProfileData }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Bio Card */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Sobre mí
        </h3>
        {profile.bio ? (
          <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
        ) : (
          <p className="text-muted-foreground italic">Sin descripción</p>
        )}
        
        {profile.best_at && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Lo que mejor hago</h4>
            <p className="text-muted-foreground">{profile.best_at}</p>
          </div>
        )}
      </Card>

      {/* Skills & Tags */}
      <div className="space-y-6">
        {profile.specialties_tags?.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Especialidades</h3>
            <div className="flex flex-wrap gap-2">
              {profile.specialties_tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </Card>
        )}

        {profile.content_categories?.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Categorías de contenido</h3>
            <div className="flex flex-wrap gap-2">
              {profile.content_categories.map((cat) => (
                <Badge key={cat} variant="outline">{cat}</Badge>
              ))}
            </div>
          </Card>
        )}

        {profile.industries?.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Industrias</h3>
            <div className="flex flex-wrap gap-2">
              {profile.industries.map((ind) => (
                <Badge key={ind} variant="outline" className="bg-primary/5">{ind}</Badge>
              ))}
            </div>
          </Card>
        )}

      {/* Social Links */}
        {(profile.instagram || profile.tiktok || profile.portfolio_url) && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Enlaces</h3>
            <div className="space-y-2">
              {profile.instagram && (
                <a 
                  href={`https://instagram.com/${profile.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                  <span>@{profile.instagram}</span>
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              )}
              {profile.tiktok && (
                <a 
                  href={`https://tiktok.com/@${profile.tiktok}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <Play className="h-4 w-4" />
                  <span>@{profile.tiktok}</span>
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              )}
              {profile.portfolio_url && (
                <a 
                  href={profile.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  {new URL(profile.portfolio_url).hostname}
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function MediaViewer({ media, onClose }: { media: any; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="max-w-4xl max-h-[90vh] w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {media.media_type === 'video' ? (
          <video
            src={media.media_url}
            poster={media.thumbnail_url}
            controls
            autoPlay
            className="w-full h-full object-contain rounded-lg"
          />
        ) : (
          <img
            src={media.media_url}
            alt=""
            className="w-full h-full object-contain rounded-lg"
          />
        )}

        {/* Media info */}
        <div className="mt-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {media.likes_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {media.views_count || 0}
            </span>
          </div>
          {media.caption && (
            <p className="text-sm text-white/80 max-w-md truncate">{media.caption}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Skeleton className="h-64 w-full" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16">
        <div className="flex gap-6">
          <Skeleton className="h-36 w-36 rounded-full" />
          <div className="flex-1 pt-8 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default PortfolioProfile;
