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
  Image as ImageIcon, Video, FolderOpen, Wand2, Loader2, Coins,
  Building2, UserCircle, Palette, Film, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pin } from 'lucide-react';
import { PostActionsMenu } from '@/components/portfolio/PostActionsMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfileTrustBadges } from './ProfileTrustBadges';
import FeedGridModal from '@/components/portfolio/feed/FeedGridModal';
import { FollowersModal } from '@/components/social/FollowersModal';
import { RevealContactButton } from '@/components/social/RevealContactButton';
import { FollowButton } from '@/components/social/FollowButton';
import { FeaturedVideoUploader } from '@/components/social/FeaturedVideoUploader';
import { FounderBadge, FounderAvatarRing } from '@/components/social/FounderBadge';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';

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
  email: string;
  phone: string;
  is_public: boolean;
  featured_video_url?: string;
  featured_video_thumbnail?: string;
  // Founder status
  is_platform_founder?: boolean;
  founder_badge_type?: string;
  ai_token_cost?: number;
}

interface OrganizationInfo {
  id: string;
  name: string;
  logo_url?: string;
}

interface MembershipInfo {
  role: string;
  organization: OrganizationInfo | null;
  is_independent: boolean;
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
  const [membership, setMembership] = useState<MembershipInfo>({ role: '', organization: null, is_independent: true });
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
  
  // Followers modal state
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following' | 'likers'>('followers');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, postsRes, portfolioRes, videosRes, followersRes, followingRes, membershipRes] = await Promise.all([
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
          // Fetch organization membership info
          supabase
            .from('organization_members')
            .select(`
              role,
              organization:organization_id (
                id,
                name,
                logo_url
              )
            `)
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle(),
        ]);

        if (profileRes.data) {
          setProfile(profileRes.data as any);
        }

        // Set membership info
        if (membershipRes.data) {
          const orgData = membershipRes.data.organization as any;
          setMembership({
            role: membershipRes.data.role || '',
            organization: orgData ? {
              id: orgData.id,
              name: orgData.name,
              logo_url: orgData.logo_url,
            } : null,
            is_independent: false,
          });
        } else {
          setMembership({ role: '', organization: null, is_independent: true });
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
              {profile.is_platform_founder ? (
                <FounderAvatarRing badgeType={profile.founder_badge_type}>
                  <Avatar className="h-28 w-28 sm:h-36 sm:w-36 ring-4 ring-social-background shadow-2xl">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                      {profile.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </FounderAvatarRing>
              ) : (
                <>
                  <Avatar className="h-28 w-28 sm:h-36 sm:w-36 ring-4 ring-social-background shadow-2xl">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-social-accent to-social-accent/60 text-social-accent-foreground">
                      {profile.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <div className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-green-500 ring-4 ring-social-background" />
                </>
              )}
            </motion.div>

            {/* Name & Info */}
            <div className="flex-1 pt-2 sm:pt-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      {profile.full_name}
                    </h1>
                    {profile.is_platform_founder && (
                      <FounderBadge 
                        badgeType={profile.founder_badge_type} 
                        size="md" 
                        showLabel 
                      />
                    )}
                  </div>
                  
                  {/* Username, Role & Organization in one line */}
                  <div className="flex items-center gap-2 flex-wrap text-sm text-social-muted-foreground">
                    {profile.username && (
                      <span>@{profile.username}</span>
                    )}
                    {profile.username && (membership.role || membership.organization || membership.is_independent) && (
                      <span className="text-social-muted-foreground/50">•</span>
                    )}
                    {membership.role && (
                      <span className="flex items-center gap-1">
                        {membership.role === 'creator' && <Palette className="h-3 w-3" />}
                        {membership.role === 'editor' && <Film className="h-3 w-3" />}
                        {membership.role === 'strategist' && <Target className="h-3 w-3" />}
                        {membership.role === 'admin' && <Settings className="h-3 w-3" />}
                        {membership.role === 'editor' ? 'Productor AV' : membership.role === 'creator' ? 'Creador' : membership.role === 'strategist' ? 'Estratega' : membership.role === 'admin' ? 'Admin' : membership.role}
                      </span>
                    )}
                    {membership.role && (membership.organization || membership.is_independent) && (
                      <span className="text-social-muted-foreground/50">•</span>
                    )}
                    {membership.is_independent ? (
                      <span className="flex items-center gap-1">
                        <UserCircle className="h-3 w-3" />
                        Independiente
                      </span>
                    ) : membership.organization && (
                      <span className="flex items-center gap-1">
                        {membership.organization.logo_url ? (
                          <img 
                            src={membership.organization.logo_url} 
                            alt={membership.organization.name}
                            className="h-3 w-3 rounded-sm object-cover"
                          />
                        ) : (
                          <Building2 className="h-3 w-3" />
                        )}
                        {membership.organization.name}
                      </span>
                    )}
                  </div>

                  {profile.tagline && (
                    <p className="text-lg text-social-foreground/80 mt-2 max-w-xl">
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
                      <FollowButton profileId={userId} />
                      <RevealContactButton 
                        profileId={userId}
                        profileData={{
                          instagram: profile.instagram,
                          tiktok: profile.tiktok,
                          portfolio_url: profile.portfolio_url,
                          email: profile.email,
                          phone: profile.phone,
                        }}
                      />
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

      {/* Stats Bar - Glassmorphism */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-4 p-4 glass-card">
          <StatItem icon={<FolderOpen className="h-4 w-4" />} value={stats.portfolio_count} label="Portafolio" />
          <StatItem icon={<Grid className="h-4 w-4" />} value={stats.posts_count} label="Posts" />
          <StatItem icon={<Play className="h-4 w-4" />} value={stats.videos_count} label="Videos" />
          <StatItem 
            icon={<Users className="h-4 w-4" />} 
            value={stats.followers_count} 
            label="Seguidores" 
            className="cursor-pointer hover:text-social-accent"
            onClick={() => { setFollowersModalTab('followers'); setFollowersModalOpen(true); }}
          />
          <StatItem 
            icon={<Users className="h-4 w-4" />} 
            value={stats.following_count} 
            label="Siguiendo" 
            className="hidden sm:block cursor-pointer hover:text-social-accent"
            onClick={() => { setFollowersModalTab('following'); setFollowersModalOpen(true); }}
          />
          <StatItem icon={<Eye className="h-4 w-4" />} value={stats.views_count} label="Vistas" className="hidden sm:block" />
          <StatItem 
            icon={<Heart className="h-4 w-4" />} 
            value={stats.likes_count} 
            label="Likes" 
            className="hidden sm:block cursor-pointer hover:text-social-accent"
            onClick={() => { setFollowersModalTab('likers'); setFollowersModalOpen(true); }}
          />
        </div>
      </section>

      {/* Followers Modal */}
      <FollowersModal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        userId={userId}
        initialTab={followersModalTab}
      />

      {/* Content Tabs - Glassmorphism */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full justify-start glass-social rounded-xl p-1 h-auto gap-1 overflow-x-auto border border-white/10">
            <TabsTrigger 
              value="portfolio" 
              className="rounded-lg px-3 py-2 data-[state=active]:bg-social-accent data-[state=active]:text-white data-[state=active]:shadow-lg text-social-muted-foreground whitespace-nowrap transition-all duration-200 hover:text-social-foreground hover:bg-white/5"
            >
              <FolderOpen className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Portafolio</span>
            </TabsTrigger>
            <TabsTrigger 
              value="posts" 
              className="rounded-lg px-3 py-2 data-[state=active]:bg-social-accent data-[state=active]:text-white data-[state=active]:shadow-lg text-social-muted-foreground whitespace-nowrap transition-all duration-200 hover:text-social-foreground hover:bg-white/5"
            >
              <Grid className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="videos"
              className="rounded-lg px-3 py-2 data-[state=active]:bg-social-accent data-[state=active]:text-white data-[state=active]:shadow-lg text-social-muted-foreground whitespace-nowrap transition-all duration-200 hover:text-social-foreground hover:bg-white/5"
            >
              <Play className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="badges"
              className="rounded-lg px-3 py-2 data-[state=active]:bg-social-accent data-[state=active]:text-white data-[state=active]:shadow-lg text-social-muted-foreground whitespace-nowrap transition-all duration-200 hover:text-social-foreground hover:bg-white/5"
            >
              <Star className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Logros</span>
            </TabsTrigger>
            <TabsTrigger 
              value="about"
              className="rounded-lg px-3 py-2 data-[state=active]:bg-social-accent data-[state=active]:text-white data-[state=active]:shadow-lg text-social-muted-foreground whitespace-nowrap transition-all duration-200 hover:text-social-foreground hover:bg-white/5"
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
            <PresentationVideoSection 
              userId={userId} 
              isOwner={isOwner}
              featuredVideoUrl={profile?.featured_video_url}
              featuredVideoThumbnail={profile?.featured_video_thumbnail}
              onVideoUpdate={(url, thumb) => {
                setProfile(prev => prev ? { ...prev, featured_video_url: url, featured_video_thumbnail: thumb } : prev);
              }}
            />
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

function StatItem({ icon, value, label, className, onClick }: { icon: React.ReactNode; value: number; label: string; className?: string; onClick?: () => void }) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className={cn("text-center group", onClick ? "cursor-pointer" : "cursor-default", className)} onClick={onClick}>
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
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchPosts = useCallback(async () => {
    // Fetch portfolio posts ordered by pinned first, then by created_at
    const { data } = await supabase
      .from('portfolio_posts')
      .select('id, media_url, thumbnail_url, caption, media_type, views_count, likes_count, post_type, is_pinned, pinned_at, created_at')
      .eq('user_id', userId)
      .neq('post_type', 'personal')
      .order('is_pinned', { ascending: false, nullsFirst: false })
      .order('pinned_at', { ascending: false, nullsFirst: true })
      .order('created_at', { ascending: false })
      .limit(20);

    setPosts(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, refreshKey]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-sm" />
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
        {posts.map((post, index) => {
          // Get Bunny CDN thumbnail for videos (same as main feed)
          const bunnyUrls = post.media_type === 'video' ? getBunnyVideoUrls(post.media_url) : null;
          const effectiveThumbnail = bunnyUrls?.thumbnail || post.thumbnail_url;
          
          return (
            <div
              key={post.id}
              onClick={() => onSelect(feedItems, index)}
              className="aspect-[4/5] relative group cursor-pointer overflow-hidden bg-muted rounded-sm"
            >
              {post.media_type === 'video' ? (
                <>
                  {effectiveThumbnail ? (
                    <img
                      src={effectiveThumbnail}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  {/* Video indicator - glassmorphism style */}
                  <div className="absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md bg-black/30 border border-white/10">
                    <Play className="h-3.5 w-3.5 text-white fill-white" />
                  </div>
                  {/* Views count */}
                  {(post.views_count ?? 0) > 0 && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-black/40 border border-white/10">
                      <Eye className="h-3 w-3 text-white/80" />
                      <span className="text-white text-xs font-medium">{formatCount(post.views_count || 0)}</span>
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={post.media_url}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              
              {/* Pinned badge */}
              {post.is_pinned && (
                <div className="absolute top-2 left-2 z-10">
                  <div className="bg-amber-500 text-white p-1 rounded-full backdrop-blur-md">
                    <Pin className="h-3 w-3" />
                  </div>
                </div>
              )}

              {/* Actions menu for owner */}
              {isOwner && (
                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <PostActionsMenu
                    postId={post.id}
                    isPinned={post.is_pinned || false}
                    caption={post.caption}
                    onUpdate={handleRefresh}
                  />
                </div>
              )}

              {/* Hover overlay with stats - glassmorphism style */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-4 px-4 py-2 rounded-full backdrop-blur-xl bg-white/10 border border-white/20">
                  {(post.likes_count || 0) >= 0 && (
                    <span className="flex items-center gap-1.5 text-white text-sm font-semibold">
                      <Heart className="h-4 w-4 text-red-400 fill-red-400" />
                      {formatCount(post.likes_count || 0)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Personal Feed Section (Casual posts)
function PersonalFeedSection({ userId, isOwner, onSelect, onUpload }: { userId: string; isOwner: boolean; onSelect: (items: FeedItem[], index: number) => void; onUpload: () => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('portfolio_posts')
      .select('id, media_url, thumbnail_url, caption, media_type, views_count, likes_count, post_type, is_pinned, pinned_at, created_at')
      .eq('user_id', userId)
      .eq('post_type', 'personal')
      .order('is_pinned', { ascending: false, nullsFirst: false })
      .order('pinned_at', { ascending: false, nullsFirst: true })
      .order('created_at', { ascending: false })
      .limit(30);

    setPosts(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, refreshKey]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-sm" />
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
        {posts.map((post, index) => {
          // Get Bunny CDN thumbnail for videos (same as main feed)
          const bunnyUrls = post.media_type === 'video' ? getBunnyVideoUrls(post.media_url) : null;
          const effectiveThumbnail = bunnyUrls?.thumbnail || post.thumbnail_url;
          
          return (
            <div
              key={post.id}
              onClick={() => onSelect(feedItems, index)}
              className="aspect-[4/5] relative group cursor-pointer overflow-hidden bg-muted rounded-sm"
            >
              {post.media_type === 'video' ? (
                <>
                  {effectiveThumbnail ? (
                    <img
                      src={effectiveThumbnail}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  {/* Video indicator - glassmorphism style */}
                  <div className="absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md bg-black/30 border border-white/10">
                    <Play className="h-3.5 w-3.5 text-white fill-white" />
                  </div>
                  {/* Views count */}
                  {(post.views_count ?? 0) > 0 && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-black/40 border border-white/10">
                      <Eye className="h-3 w-3 text-white/80" />
                      <span className="text-white text-xs font-medium">{formatCount(post.views_count || 0)}</span>
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={post.media_url}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              
              {/* Pinned badge */}
              {post.is_pinned && (
                <div className="absolute top-2 left-2 z-10">
                  <div className="bg-amber-500 text-white p-1 rounded-full backdrop-blur-md">
                    <Pin className="h-3 w-3" />
                  </div>
                </div>
              )}

              {/* Actions menu for owner */}
              {isOwner && (
                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <PostActionsMenu
                    postId={post.id}
                    isPinned={post.is_pinned || false}
                    caption={post.caption}
                    onUpdate={handleRefresh}
                  />
                </div>
              )}

              {/* Hover overlay with stats - glassmorphism style */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-4 px-4 py-2 rounded-full backdrop-blur-xl bg-white/10 border border-white/20">
                  {(post.likes_count || 0) >= 0 && (
                    <span className="flex items-center gap-1.5 text-white text-sm font-semibold">
                      <Heart className="h-4 w-4 text-red-400 fill-red-400" />
                      {formatCount(post.likes_count || 0)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PresentationVideoProps {
  userId: string;
  isOwner: boolean;
  featuredVideoUrl?: string;
  featuredVideoThumbnail?: string;
  onVideoUpdate?: (url: string, thumbnail: string) => void;
}

function PresentationVideoSection({ 
  userId, 
  isOwner, 
  featuredVideoUrl, 
  featuredVideoThumbnail,
  onVideoUpdate 
}: PresentationVideoProps) {
  // Use featured video from profile if available
  const videoUrl = featuredVideoUrl;
  const thumbnailUrl = featuredVideoThumbnail;

  if (!videoUrl) {
    return (
      <Card className="aspect-video flex items-center justify-center bg-gradient-to-br from-social-muted to-social-muted/50 border-dashed border-social-border">
        <div className="text-center p-8">
          <Play className="h-16 w-16 mx-auto text-social-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-social-foreground">Video de presentación</h3>
          <p className="text-sm text-social-muted-foreground mb-4">
            Sube un video horizontal (16:9) que destaque tu perfil
          </p>
          {isOwner && onVideoUpdate && (
            <FeaturedVideoUploader
              userId={userId}
              onUploadComplete={onVideoUpdate}
            />
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
      <video
        src={videoUrl}
        poster={thumbnailUrl}
        controls
        className="w-full h-full object-contain"
      />
      <Badge className="absolute top-4 left-4 bg-social-accent/90 text-social-accent-foreground">
        <Star className="h-3 w-3 mr-1" />
        Video destacado
      </Badge>
      {isOwner && onVideoUpdate && (
        <div className="absolute top-4 right-4">
          <FeaturedVideoUploader
            userId={userId}
            currentVideoUrl={videoUrl}
            onUploadComplete={onVideoUpdate}
          />
        </div>
      )}
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

        {/* Contact info and social links are shown in the Contact Reveal popup only */}
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
      const isVideo = selectedFile.type.startsWith('video/');

      if (isVideo) {
        // Upload video to Bunny via edge function
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('user_id', userId);
        formData.append('type', 'post');
        if (caption) {
          formData.append('caption', caption);
        }

        const supabaseUrl = (supabase as any).supabaseUrl as string;
        
        const response = await fetch(`${supabaseUrl}/functions/v1/bunny-portfolio-upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al subir el video');
        }

        const result = await response.json();
        console.log('[PortfolioProfile] Video uploaded to Bunny:', result);

        // Update the post with post_type (the edge function already created the post)
        if (result.id) {
          await supabase
            .from('portfolio_posts')
            .update({ post_type: postType })
            .eq('id', result.id);
        }

        toast.success('Video subido exitosamente', {
          description: 'El video se está procesando para mejor compatibilidad.'
        });
      } else {
        // Upload image to Supabase storage (images don't need Bunny processing)
        const ext = selectedFile.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from('portfolio_posts')
          .insert({
            user_id: userId,
            media_url: urlData.publicUrl,
            media_type: 'image',
            post_type: postType,
            caption: caption || null,
          });

        if (insertError) throw insertError;

        toast.success('Imagen subida exitosamente');
      }

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
