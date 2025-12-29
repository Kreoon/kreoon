import { useState, useEffect, memo, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Edit, Settings, MapPin, Briefcase, Link2, Instagram, 
  Play, Grid, Bookmark, Star, Eye, Heart, Users, Calendar,
  ExternalLink, Mail, Globe, X, Camera, Plus, Upload, Sparkles,
  Image as ImageIcon, Video, FolderOpen, Wand2, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfileTrustBadges } from './ProfileTrustBadges';
import FeedGridModal from '@/components/portfolio/feed/FeedGridModal';

// FeedItem interface for modal compatibility
interface FeedItem {
  id: string;
  type: 'work' | 'post';
  title?: string;
  caption?: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

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
  portfolio_count: number;
  videos_count: number;
  followers_count: number;
  following_count: number;
  views_count: number;
  likes_count: number;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
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
    portfolio_count: 0,
    videos_count: 0,
    followers_count: 0,
    following_count: 0,
    views_count: 0,
    likes_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'posts' | 'videos' | 'badges' | 'about'>('portfolio');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showAIProfileDialog, setShowAIProfileDialog] = useState(false);
  
  // Modal state for FeedGridModal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, postsRes, portfolioRes, videosRes, followersRes, followingRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase
            .from('portfolio_posts')
            .select('id, views_count, likes_count', { count: 'exact' })
            .eq('user_id', userId)
            .eq('post_type', 'personal'),
          supabase
            .from('portfolio_posts')
            .select('id', { count: 'exact' })
            .eq('user_id', userId)
            .eq('post_type', 'portfolio'),
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
          portfolio_count: portfolioRes.count || 0,
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
    <div className="min-h-screen bg-social-background text-social-foreground">
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
            <div className="w-full h-full bg-gradient-to-br from-social-accent/30 via-social-accent/20 to-social-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-social-background via-social-background/50 to-transparent" />
          
          {/* Edit Cover Button */}
          {isOwner && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 bg-social-card/80 backdrop-blur-sm text-social-foreground border-social-border hover:bg-social-muted"
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
              <Avatar className="h-28 w-28 sm:h-36 sm:w-36 ring-4 ring-social-background shadow-2xl">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-social-accent to-social-accent/60 text-social-accent-foreground">
                  {profile.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <div className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-green-500 ring-4 ring-social-background" />
            </motion.div>

            {/* Name & Info */}
            <div className="flex-1 pt-2 sm:pt-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {profile.full_name}
                  </h1>
                  {profile.username && (
                    <p className="text-social-muted-foreground">@{profile.username}</p>
                  )}
                  {profile.tagline && (
                    <p className="text-lg text-social-foreground/80 mt-1 max-w-xl">
                      {profile.tagline}
                    </p>
                  )}
                  
                  {/* Location & Links */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-social-muted-foreground">
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
                        className="flex items-center gap-1 hover:text-social-accent transition-colors"
                      >
                        <Link2 className="h-4 w-4" />
                        Portfolio
                      </a>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isOwner ? (
                    <>
                      <Button onClick={() => setShowUploadDialog(true)} className="bg-social-accent hover:bg-social-accent/90 text-social-accent-foreground">
                        <Plus className="h-4 w-4 mr-2" />
                        Subir contenido
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowAIProfileDialog(true)} className="border-social-border text-social-foreground hover:bg-social-muted">
                        <Sparkles className="h-4 w-4 mr-2" />
                        IA Perfil
                      </Button>
                      <Button variant="outline" size="sm" onClick={onEditProfile} className="border-social-border text-social-foreground hover:bg-social-muted">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      {onEditBlocks && (
                        <Button variant="ghost" size="icon" onClick={onEditBlocks} className="text-social-foreground hover:bg-social-muted">
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button className="bg-social-accent hover:bg-social-accent/90 text-social-accent-foreground">
                        Seguir
                      </Button>
                      <Button variant="outline" className="border-social-border text-social-foreground hover:bg-social-muted">
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

      {/* Trust Badges - Compact version under avatar */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-4">
        <ProfileTrustBadges userId={userId} compact />
      </section>

      {/* Stats Bar */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-4 p-4 bg-social-card rounded-xl border border-social-border shadow-sm hover:shadow-md transition-shadow duration-300">
          <StatItem icon={<FolderOpen className="h-4 w-4" />} value={stats.portfolio_count} label="Portafolio" />
          <StatItem icon={<Grid className="h-4 w-4" />} value={stats.posts_count} label="Posts" />
          <StatItem icon={<Play className="h-4 w-4" />} value={stats.videos_count} label="Videos" />
          <StatItem icon={<Users className="h-4 w-4" />} value={stats.followers_count} label="Seguidores" />
          <StatItem icon={<Users className="h-4 w-4" />} value={stats.following_count} label="Siguiendo" className="hidden sm:block" />
          <StatItem icon={<Eye className="h-4 w-4" />} value={stats.views_count} label="Vistas" className="hidden sm:block" />
          <StatItem icon={<Heart className="h-4 w-4" />} value={stats.likes_count} label="Likes" className="hidden sm:block" />
        </div>
      </section>

      {/* Content Tabs */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full justify-start bg-transparent border-b border-social-border rounded-none h-12 p-0 gap-2 sm:gap-4 overflow-x-auto">
            <TabsTrigger 
              value="portfolio" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-social-accent data-[state=active]:text-social-accent data-[state=active]:bg-transparent text-social-muted-foreground h-12 px-2 whitespace-nowrap transition-all duration-200 hover:text-social-foreground"
            >
              <FolderOpen className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Portafolio</span>
            </TabsTrigger>
            <TabsTrigger 
              value="posts" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-social-accent data-[state=active]:text-social-accent data-[state=active]:bg-transparent text-social-muted-foreground h-12 px-2 whitespace-nowrap transition-all duration-200 hover:text-social-foreground"
            >
              <Grid className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="videos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-social-accent data-[state=active]:text-social-accent data-[state=active]:bg-transparent text-social-muted-foreground h-12 px-2 whitespace-nowrap transition-all duration-200 hover:text-social-foreground"
            >
              <Play className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="badges"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-social-accent data-[state=active]:text-social-accent data-[state=active]:bg-transparent text-social-muted-foreground h-12 px-2 whitespace-nowrap transition-all duration-200 hover:text-social-foreground"
            >
              <Star className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Logros</span>
            </TabsTrigger>
            <TabsTrigger 
              value="about"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-social-accent data-[state=active]:text-social-accent data-[state=active]:bg-transparent text-social-muted-foreground h-12 px-2 whitespace-nowrap transition-all duration-200 hover:text-social-foreground"
            >
              <Briefcase className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Sobre mí</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="mt-6">
            <PortfolioWorkSection 
              userId={userId} 
              isOwner={isOwner} 
              onSelect={(items, index) => {
                setFeedItems(items);
                setSelectedIndex(index);
                setModalOpen(true);
              }} 
              onUpload={() => setShowUploadDialog(true)} 
            />
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <PersonalFeedSection 
              userId={userId} 
              isOwner={isOwner} 
              onSelect={(items, index) => {
                setFeedItems(items);
                setSelectedIndex(index);
                setModalOpen(true);
              }} 
              onUpload={() => setShowUploadDialog(true)} 
            />
          </TabsContent>

          <TabsContent value="videos" className="mt-6">
            <PresentationVideoSection userId={userId} isOwner={isOwner} />
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-social-foreground mb-4">Todos los videos</h3>
              <VideoGallery 
                userId={userId} 
                onSelect={(items, index) => {
                  setFeedItems(items);
                  setSelectedIndex(index);
                  setModalOpen(true);
                }} 
              />
            </div>
          </TabsContent>

          <TabsContent value="badges" className="mt-6">
            <ProfileTrustBadges userId={userId} />
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <AboutSection profile={profile} />
          </TabsContent>
        </Tabs>
      </section>

      {/* Feed Grid Modal - same as main feed */}
      <FeedGridModal
        items={feedItems}
        initialIndex={selectedIndex}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={() => {}}
        isSaved={() => false}
      />

      {/* Upload Dialog */}
      <UploadContentDialog 
        open={showUploadDialog} 
        onOpenChange={setShowUploadDialog}
        userId={userId}
      />

      {/* AI Profile Generator */}
      <AIProfileDialog
        open={showAIProfileDialog}
        onOpenChange={setShowAIProfileDialog}
        profile={profile}
        onApply={(updates) => {
          setProfile(prev => prev ? { ...prev, ...updates } : null);
        }}
      />
    </div>
  );
});

// =============================================================================
// Sub Components
// =============================================================================

function StatItem({ icon, value, label, className }: { icon: React.ReactNode; value: number; label: string; className?: string }) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className={cn("text-center group cursor-default", className)}>
      <div className="flex items-center justify-center gap-1 text-social-muted-foreground mb-1 group-hover:text-social-accent transition-colors duration-200">
        {icon}
      </div>
      <div className="text-lg sm:text-xl font-bold text-social-foreground group-hover:scale-105 transition-transform duration-200">{formatNumber(value)}</div>
      <div className="text-xs text-social-muted-foreground">{label}</div>
    </div>
  );
}

// Portfolio Work Section (Professional work)
function PortfolioWorkSection({ userId, isOwner, onSelect, onUpload }: { userId: string; isOwner: boolean; onSelect: (items: FeedItem[], index: number) => void; onUpload: () => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      // Fetch portfolio posts (default type for backwards compatibility)
      const { data } = await supabase
        .from('portfolio_posts')
        .select('id, media_url, thumbnail_url, caption, media_type, views_count, likes_count, post_type, created_at')
        .eq('user_id', userId)
        .neq('post_type', 'personal')
        .order('created_at', { ascending: false })
        .limit(20);

      setPosts(data || []);
      setLoading(false);
    };
    fetchPosts();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Tu portafolio profesional</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Sube tus mejores trabajos, proyectos y colaboraciones para mostrar tu talento
        </p>
        {isOwner && (
          <Button onClick={onUpload} size="lg">
            <Upload className="h-5 w-5 mr-2" />
            Subir primer trabajo
          </Button>
        )}
      </Card>
    );
  }

  // Convert posts to FeedItem format
  const feedItems: FeedItem[] = posts.map(post => ({
    id: post.id,
    type: 'post' as const,
    caption: post.caption,
    media_url: post.media_url,
    media_type: post.media_type || 'image',
    thumbnail_url: post.thumbnail_url,
    user_id: userId,
    views_count: post.views_count || 0,
    likes_count: post.likes_count || 0,
    comments_count: 0,
    created_at: post.created_at,
  }));

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex justify-end">
          <Button onClick={onUpload} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Agregar trabajo
          </Button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-1">
        {posts.map((post, index) => (
          <div
            key={post.id}
            onClick={() => onSelect(feedItems, index)}
            className="aspect-square relative group cursor-pointer overflow-hidden bg-muted"
          >
            <img
              src={post.thumbnail_url || post.media_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            
            {post.media_type === 'video' && (
              <>
                <div className="absolute top-2 right-2">
                  <Play className="h-5 w-5 text-white drop-shadow-lg fill-white/30" />
                </div>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-medium drop-shadow-lg">
                  <Play className="h-3 w-3" fill="currentColor" />
                  <span>{formatCount(post.views_count || 0)}</span>
                </div>
              </>
            )}

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
              {(post.likes_count || 0) > 0 && (
                <span className="flex items-center gap-1 text-sm font-semibold">
                  <Heart className="h-5 w-5 fill-white" />
                  {formatCount(post.likes_count || 0)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Personal Feed Section (Casual posts)
function PersonalFeedSection({ userId, isOwner, onSelect, onUpload }: { userId: string; isOwner: boolean; onSelect: (items: FeedItem[], index: number) => void; onUpload: () => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('portfolio_posts')
        .select('id, media_url, thumbnail_url, caption, media_type, views_count, likes_count, post_type, created_at')
        .eq('user_id', userId)
        .eq('post_type', 'personal')
        .order('created_at', { ascending: false })
        .limit(30);

      setPosts(data || []);
      setLoading(false);
    };
    fetchPosts();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <Grid className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Tu feed personal</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Comparte momentos, detrás de cámaras y contenido más casual
        </p>
        {isOwner && (
          <Button onClick={onUpload} size="lg" variant="outline">
            <Upload className="h-5 w-5 mr-2" />
            Crear post
          </Button>
        )}
      </Card>
    );
  }

  // Convert posts to FeedItem format
  const feedItems: FeedItem[] = posts.map(post => ({
    id: post.id,
    type: 'post' as const,
    caption: post.caption,
    media_url: post.media_url,
    media_type: post.media_type || 'image',
    thumbnail_url: post.thumbnail_url,
    user_id: userId,
    views_count: post.views_count || 0,
    likes_count: post.likes_count || 0,
    comments_count: 0,
    created_at: post.created_at,
  }));

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex justify-end">
          <Button onClick={onUpload} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo post
          </Button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-1">
        {posts.map((post, index) => (
          <div
            key={post.id}
            onClick={() => onSelect(feedItems, index)}
            className="aspect-square relative group cursor-pointer overflow-hidden bg-muted"
          >
            <img
              src={post.thumbnail_url || post.media_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            
            {post.media_type === 'video' && (
              <>
                <div className="absolute top-2 right-2">
                  <Play className="h-5 w-5 text-white drop-shadow-lg fill-white/30" />
                </div>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-medium drop-shadow-lg">
                  <Play className="h-3 w-3" fill="currentColor" />
                  <span>{formatCount(post.views_count || 0)}</span>
                </div>
              </>
            )}

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
              {(post.likes_count || 0) > 0 && (
                <span className="flex items-center gap-1 text-sm font-semibold">
                  <Heart className="h-5 w-5 fill-white" />
                  {formatCount(post.likes_count || 0)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PresentationVideoSection({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
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
      <Card className="aspect-video flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 border-dashed">
        <div className="text-center p-8">
          <Play className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Video de presentación</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Muestra tu mejor trabajo con un video destacado
          </p>
          {isOwner && (
            <Button variant="outline">
              <Video className="h-4 w-4 mr-2" />
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

function VideoGallery({ userId, onSelect }: { userId: string; onSelect: (items: FeedItem[], index: number) => void }) {
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

  // Convert videos to FeedItem format
  const feedItems: FeedItem[] = videos.map(video => ({
    id: video.id,
    type: 'post' as const,
    caption: video.caption,
    media_url: video.media_url,
    media_type: 'video' as const,
    thumbnail_url: video.thumbnail_url,
    user_id: userId,
    views_count: video.views_count || 0,
    likes_count: video.likes_count || 0,
    comments_count: 0,
    created_at: video.created_at,
  }));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {videos.map((video, index) => (
        <motion.div
          key={video.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(feedItems, index)}
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
                  <span>{(() => { try { return new URL(profile.portfolio_url).hostname; } catch { return profile.portfolio_url; } })()}</span>
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

// Upload Content Dialog
function UploadContentDialog({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (open: boolean) => void; userId: string }) {
  const [uploading, setUploading] = useState(false);
  const [postType, setPostType] = useState<'portfolio' | 'personal'>('portfolio');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Solo se permiten imágenes y videos');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máx 100MB)');
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const ext = selectedFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(fileName);

      const mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';

      const { error: insertError } = await supabase
        .from('portfolio_posts')
        .insert({
          user_id: userId,
          media_url: urlData.publicUrl,
          media_type: mediaType,
          post_type: postType,
          caption: caption || null,
        });

      if (insertError) throw insertError;

      toast.success('Contenido subido exitosamente');
      onOpenChange(false);
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
    } catch (error) {
      console.error('[Upload] Error:', error);
      toast.error('Error al subir contenido');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir contenido</DialogTitle>
          <DialogDescription>
            Comparte tu trabajo o momentos con tu audiencia
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Post Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={postType === 'portfolio' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setPostType('portfolio')}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Portafolio
            </Button>
            <Button
              variant={postType === 'personal' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setPostType('personal')}
            >
              <Grid className="h-4 w-4 mr-2" />
              Post personal
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              preview ? "border-primary" : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            {preview ? (
              <div className="relative">
                {selectedFile?.type.startsWith('video/') ? (
                  <video src={preview} className="max-h-64 mx-auto rounded" controls />
                ) : (
                  <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded" />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Haz clic para seleccionar una imagen o video
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Máximo 100MB
                </p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Caption */}
          <div>
            <Label htmlFor="caption">Descripción (opcional)</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={postType === 'portfolio' ? 'Describe tu trabajo...' : 'Escribe algo...'}
              rows={3}
            />
          </div>

          {/* Upload Button */}
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Publicar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// AI Profile Generator Dialog
function AIProfileDialog({ 
  open, 
  onOpenChange, 
  profile,
  onApply 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  profile: ProfileData;
  onApply: (updates: Partial<ProfileData>) => void;
}) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    bio?: string;
    tagline?: string;
    best_at?: string;
  } | null>(null);
  const [context, setContext] = useState('');

  const generateProfile = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('portfolio-ai', {
        body: {
          action: 'bio',
          payload: {
            current_bio: profile.bio || '',
            profession: profile.tagline || 'Creador de contenido',
            skills: profile.specialties_tags?.join(', ') || '',
            context: context,
            language: 'es'
          }
        }
      });

      if (error) throw error;

      // Also generate tagline
      const { data: taglineData } = await supabase.functions.invoke('portfolio-ai', {
        body: {
          action: 'bio',
          payload: {
            current_bio: profile.tagline || '',
            profession: 'Tagline profesional corto',
            skills: profile.specialties_tags?.join(', ') || '',
            context: `Genera solo un tagline de máximo 10 palabras. ${context}`,
            language: 'es'
          }
        }
      });

      setSuggestions({
        bio: data?.data?.improved_bio || '',
        tagline: taglineData?.data?.improved_bio || '',
      });

    } catch (error) {
      console.error('[AI Profile] Error:', error);
      toast.error('Error al generar perfil con IA');
    } finally {
      setGenerating(false);
    }
  };

  const applyChanges = async () => {
    if (!suggestions || !user?.id) return;

    try {
      const updates: any = {};
      if (suggestions.bio) updates.bio = suggestions.bio;
      if (suggestions.tagline) updates.tagline = suggestions.tagline;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      onApply(updates);
      toast.success('Perfil actualizado con IA');
      onOpenChange(false);
      setSuggestions(null);
    } catch (error) {
      toast.error('Error al guardar cambios');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generar perfil con IA
          </DialogTitle>
          <DialogDescription>
            Deja que la IA mejore tu bio y tagline profesional
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="context">Contexto adicional (opcional)</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ej: Enfócate en mi experiencia en moda, soy carismático y creativo..."
              rows={2}
            />
          </div>

          {!suggestions ? (
            <Button onClick={generateProfile} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generar sugerencias
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              {suggestions.tagline && (
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-2">Tagline sugerido</h4>
                  <p className="text-muted-foreground">{suggestions.tagline}</p>
                </Card>
              )}

              {suggestions.bio && (
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-2">Bio sugerida</h4>
                  <p className="text-muted-foreground text-sm">{suggestions.bio}</p>
                </Card>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSuggestions(null)} className="flex-1">
                  Regenerar
                </Button>
                <Button onClick={applyChanges} className="flex-1">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
