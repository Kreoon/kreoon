import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader';
import { CompanyProfileEditor } from '@/components/portfolio/CompanyProfileEditor';
import { 
  Loader2, 
  Building2,
  Video as VideoIcon,
  Globe,
  Instagram,
  Pencil,
  Lock,
  Unlock,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { BunnyVideoCard } from '@/components/content/BunnyVideoCard';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { AppRole } from '@/types/database';
import { toast } from 'sonner';
import { ParsedText } from '@/components/ui/parsed-text';
import { VipBadge } from '@/components/ui/vip-badge';
import { CompanyFollowButton } from '@/components/portfolio/CompanyFollowButton';

interface CompanyProfile {
  id: string;
  name: string;
  username: string | null;
  logo_url: string | null;
  bio: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  portfolio_url: string | null;
  is_public: boolean;
  contact_email: string | null;
  is_vip: boolean;
}

interface ContentItem {
  id: string;
  title: string;
  caption: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  video_urls: string[] | null;
  bunny_embed_url: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
  creator_id: string | null;
  is_liked: boolean;
  is_pinned?: boolean;
  is_portfolio_public?: boolean;
}


export default function CompanyPortfolio() {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const isMobile = useIsMobile();
  const isAdmin = roles?.includes('admin' as AppRole);
  
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssociatedUser, setIsAssociatedUser] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewerId] = useState(() => {
    const stored = localStorage.getItem('portfolio_viewer_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('portfolio_viewer_id', newId);
    return newId;
  });

  // Resolve username or UUID to company id
  useEffect(() => {
    const resolveCompany = async () => {
      if (!paramId) {
        setLoading(false);
        return;
      }
      
      try {
        // Check if it's a UUID format
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);
        
        if (isUuid) {
          setResolvedCompanyId(paramId);
        } else {
          // It's a username, resolve it (remove @ prefix if present)
          const cleanUsername = paramId.startsWith('@') ? paramId.slice(1) : paramId;
          const { data, error } = await supabase
            .from('clients')
            .select('id')
            .eq('username', cleanUsername)
            .maybeSingle();
          
          if (error) {
            console.error('Error resolving company username:', error);
            setResolvedCompanyId(null);
            setLoading(false);
            return;
          }
          
          if (data) {
            setResolvedCompanyId(data.id);
          } else {
            setResolvedCompanyId(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error in resolveCompany:', error);
        setResolvedCompanyId(null);
        setLoading(false);
      }
    };
    
    resolveCompany();
  }, [paramId]);

  useEffect(() => {
    if (resolvedCompanyId) {
      fetchData();
    }
  }, [resolvedCompanyId, user?.id]);

  const fetchData = async () => {
    if (!resolvedCompanyId) return;
    
    setLoading(true);

    try {
      // Fetch company profile
      const { data: companyData, error: companyError } = await supabase
        .from('clients')
        .select('id, name, username, logo_url, bio, instagram, tiktok, facebook, portfolio_url, is_public, contact_email, is_vip')
        .eq('id', resolvedCompanyId)
        .maybeSingle();

      if (companyError || !companyData) {
        console.error('Company not found');
        setLoading(false);
        return;
      }

      // Check if profile is public or user has access
      if (!companyData.is_public) {
        // Check if current user is associated
        if (user) {
          const { data: association } = await supabase
            .from('client_users')
            .select('id')
            .eq('client_id', resolvedCompanyId)
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (!association) {
            // Not public and not associated - can't view
            setLoading(false);
            return;
          }
        } else {
          setLoading(false);
          return;
        }
      }

      setCompany({
        ...companyData,
        username: companyData.username ?? null,
        is_public: companyData.is_public ?? true,
        is_vip: companyData.is_vip ?? false
      });

      // Check if current user is associated with this company
      if (user) {
        const { data: userAssoc } = await supabase
          .from('client_users')
          .select('id')
          .eq('client_id', resolvedCompanyId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsAssociatedUser(!!userAssoc);

        // Check if user follows this company
        const { data: followingData } = await supabase.rpc('is_following_company', { 
          _company_id: resolvedCompanyId 
        });
        setIsFollowing(followingData === true);
      }

      // Fetch followers count
      const { data: followersData } = await supabase.rpc('get_company_followers_count', {
        _company_id: resolvedCompanyId
      });
      setFollowersCount(Number(followersData) || 0);

      // Fetch company's approved content
      const { data: contentData } = await supabase
        .from('content')
        .select('id, title, caption, thumbnail_url, video_url, video_urls, bunny_embed_url, views_count, likes_count, created_at, creator_id, is_portfolio_public')
        .eq('client_id', resolvedCompanyId)
        .in('status', ['approved', 'delivered', 'paid'])
        .or('video_url.not.is.null,video_urls.not.is.null')
        .order('created_at', { ascending: false });

      // Get liked content IDs
      const contentIds = contentData?.map(c => c.id) || [];
      const { data: likedData } = contentIds.length > 0 
        ? await supabase.from('content_likes').select('content_id').eq('viewer_id', viewerId).in('content_id', contentIds)
        : { data: [] };
      const likedSet = new Set((likedData || []).map(l => l.content_id));
      
      const enrichedContent: ContentItem[] = (contentData || []).map(item => ({
        ...item,
        caption: item.caption || null,
        is_liked: likedSet.has(item.id),
        is_pinned: item.caption?.includes('[PINNED]') || false,
        is_portfolio_public: item.is_portfolio_public ?? false
      }));
      setContent(enrichedContent);


    } catch (error) {
      console.error('Error fetching company data:', error);
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

      toast.success(data ? '❤️ Me gusta' : 'Ya no te gusta');
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Error al dar like');
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

  const handleShare = async (item: ContentItem) => {
    const url = `${window.location.origin}/empresa/${company?.username || company?.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: company?.name || 'Empresa',
          text: `Mira el perfil de ${company?.name}`,
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado al portapapeles');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Toggle content visibility in portfolio
  const toggleContentVisibility = async (contentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const item = content.find(c => c.id === contentId);
    if (!item) return;
    
    const newVisibility = !item.is_portfolio_public;
    
    const { error } = await supabase
      .from('content')
      .update({ is_portfolio_public: newVisibility })
      .eq('id', contentId);
    
    if (error) {
      toast.error('Error al actualizar visibilidad');
      return;
    }
    
    setContent(prev => prev.map(c => 
      c.id === contentId ? { ...c, is_portfolio_public: newVisibility } : c
    ));
    
    toast.success(newVisibility ? 'Contenido ahora es público' : 'Contenido ahora es privado');
  };

  // Check if user can manage content visibility
  const canManageVisibility = isAssociatedUser || isAdmin;

  const videoContent = content.filter(c => c.video_url || (c.video_urls && c.video_urls.length > 0) || c.bunny_embed_url);
  
  // Filter content based on user access
  const visibleContent = canManageVisibility 
    ? videoContent // Show all content to company users and admins
    : videoContent.filter(c => c.is_portfolio_public); // Show only public content to visitors
  
  const sortedContent = [...visibleContent].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalViews = visibleContent.reduce((sum, c) => sum + (c.views_count || 0), 0);
  const totalLikes = visibleContent.reduce((sum, c) => sum + (c.likes_count || 0), 0);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <PortfolioHeader />
        <div className="flex items-center justify-center pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-black text-white">
        <PortfolioHeader />
        <div className="flex flex-col items-center justify-center pt-20 p-4">
          <Building2 className="w-16 h-16 text-white/30 mb-4" />
          <h1 className="text-xl font-semibold mb-2">Empresa no encontrada</h1>
          <p className="text-white/50 text-center mb-4">
            Esta empresa no existe o su perfil es privado.
          </p>
          <Button 
            onClick={() => navigate('/portfolio')}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Ir al portfolio
          </Button>
        </div>
      </div>
    );
  }

  // Prepare video data for BunnyVideoCard
  const getVideoUrls = (item: ContentItem) => {
    if (item.bunny_embed_url) return [item.bunny_embed_url];
    if (item.video_urls && item.video_urls.length > 0) return item.video_urls;
    if (item.video_url) return [item.video_url];
    return [];
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <PortfolioHeader />

      {/* Company Profile Section */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-6">
        {/* Profile Section - TikTok style */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 py-6">
          {/* Avatar */}
          <div className="relative group">
            <Avatar className="h-24 w-24 md:h-36 md:w-36 ring-2 ring-white/20">
              <AvatarImage src={company.logo_url || undefined} alt={company.name} className="object-cover" />
              <AvatarFallback className="bg-zinc-800 text-white text-2xl md:text-4xl">
                <Building2 className="w-10 h-10 md:w-14 md:h-14" />
              </AvatarFallback>
            </Avatar>
            {(isAssociatedUser || isAdmin) && (
              <button
                onClick={() => setShowProfileEditor(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-6 w-6 text-white" />
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col items-center md:items-start gap-1 mb-3">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-white">{company.name}</h1>
                {company.is_vip && <VipBadge size="sm" variant="minimal" />}
              </div>
              {company.username && (
                <span className="text-sm text-white/60">@{company.username}</span>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap mb-4">
              {user && !isAssociatedUser && (
                <CompanyFollowButton
                  companyId={company.id}
                  isFollowing={isFollowing}
                  onFollowChange={(following) => {
                    setIsFollowing(following);
                    setFollowersCount(prev => following ? prev + 1 : Math.max(0, prev - 1));
                  }}
                  size="sm"
                />
              )}
              {(isAssociatedUser || isAdmin) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowProfileEditor(true)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar perfil
                </Button>
              )}
            </div>
            
            {company.bio && (
              <div className="text-sm text-white/70 max-w-md mx-auto md:mx-0">
                <ParsedText text={company.bio} />
              </div>
            )}

            {/* Social Links */}
            <div className="flex gap-3 mt-4 justify-center md:justify-start">
              {company.instagram && (
                <a 
                  href={`https://instagram.com/${company.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {company.tiktok && (
                <a 
                  href={`https://tiktok.com/@${company.tiktok.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              )}
              {company.facebook && (
                <a 
                  href={`https://facebook.com/${company.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              )}
              {company.portfolio_url && (
                <a 
                  href={company.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white"
                >
                  <Globe className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats - TikTok style */}
        <div className="flex justify-center gap-8 py-4 border-y border-white/10">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{formatNumber(followersCount)}</div>
            <div className="text-xs text-white/50">Seguidores</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{sortedContent.length}</div>
            <div className="text-xs text-white/50">Videos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{formatNumber(totalViews)}</div>
            <div className="text-xs text-white/50">Vistas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{formatNumber(totalLikes)}</div>
            <div className="text-xs text-white/50">Likes</div>
          </div>
        </div>

        {/* Content Header */}
        <div className="flex items-center justify-center gap-2 py-3 mt-4 border-b border-white/10">
          <VideoIcon className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">Contenido</span>
        </div>

        {/* Content Grid - Same style as UserPortfolio */}
        <div className="px-4 py-6">
          {sortedContent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <VideoIcon className="h-12 w-12 mb-3" />
              <p className="text-sm">Sin contenido publicado</p>
            </div>
          ) : (
            <VideoPlayerProvider>
              <div className={cn(
                "grid gap-3 md:gap-4",
                isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"
              )}>
                {sortedContent.map((item) => (
                  <div key={item.id} className="relative">
                    {/* Private indicator overlay */}
                    {canManageVisibility && !item.is_portfolio_public && (
                      <div className="absolute top-2 right-2 z-20 bg-yellow-500/90 text-black text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <EyeOff className="w-3 h-3" />
                        Privado
                      </div>
                    )}
                    
                    {/* Visibility toggle button for owners */}
                    {canManageVisibility && (
                      <button
                        onClick={(e) => toggleContentVisibility(item.id, e)}
                        className="absolute top-10 right-2 z-20 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded transition-opacity"
                        title={item.is_portfolio_public ? 'Hacer privado' : 'Hacer público'}
                      >
                        {item.is_portfolio_public ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    
                    <BunnyVideoCard
                      id={item.id}
                      title={item.title}
                      caption={item.caption || item.title}
                      videoUrls={getVideoUrls(item)}
                      thumbnailUrl={item.thumbnail_url}
                      viewsCount={item.views_count}
                      likesCount={item.likes_count}
                      isLiked={item.is_liked}
                      isPinned={item.is_pinned}
                      isOwner={canManageVisibility}
                      showActions={true}
                      onLike={(e) => handleLike(item.id, e)}
                      onView={() => handleView(item.id)}
                      onShare={() => handleShare(item)}
                    />
                  </div>
                ))}
              </div>
            </VideoPlayerProvider>
          )}
        </div>
      </div>
      
      {/* Profile Editor Dialog */}
      {company && (
        <CompanyProfileEditor
          companyId={company.id}
          currentName={company.name}
          currentBio={company.bio}
          currentLogo={company.logo_url}
          currentUsername={company.username}
          currentIsPublic={company.is_public}
          currentInstagram={company.instagram}
          currentTiktok={company.tiktok}
          currentFacebook={company.facebook}
          currentPortfolioUrl={company.portfolio_url}
          open={showProfileEditor}
          onOpenChange={setShowProfileEditor}
          onSave={fetchData}
        />
      )}
    </div>
  );
}