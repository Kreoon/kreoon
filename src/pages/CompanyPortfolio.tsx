import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader';
import { 
  Play, 
  Loader2, 
  Building2,
  Video as VideoIcon,
  Eye,
  Heart,
  Globe,
  Instagram,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { TikTokFeed } from '@/components/content/TikTokFeed';
import { BunnyVideoCard } from '@/components/content/BunnyVideoCard';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ParsedText } from '@/components/ui/parsed-text';

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
}

interface Product {
  id: string;
  name: string;
  description: string | null;
}

export default function CompanyPortfolio() {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [showTikTokView, setShowTikTokView] = useState(false);
  const [initialVideoIndex, setInitialVideoIndex] = useState(0);
  const [isAssociatedUser, setIsAssociatedUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'products'>('content');
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
          // It's a username, resolve it
          const { data, error } = await supabase
            .from('clients')
            .select('id')
            .eq('username', paramId)
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
        .select('id, name, username, logo_url, bio, instagram, tiktok, facebook, portfolio_url, is_public, contact_email')
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
        is_public: companyData.is_public ?? true
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
      }

      // Fetch company's approved content
      const { data: contentData } = await supabase
        .from('content')
        .select('id, title, caption, thumbnail_url, video_url, video_urls, bunny_embed_url, views_count, likes_count, created_at, creator_id')
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
        is_pinned: item.caption?.includes('[PINNED]') || false
      }));
      setContent(enrichedContent);

      // Fetch company products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, description')
        .eq('client_id', resolvedCompanyId)
        .order('name');
      
      setProducts(productsData || []);

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

  const videoContent = content.filter(c => c.video_url || (c.video_urls && c.video_urls.length > 0) || c.bunny_embed_url);
  const sortedContent = [...videoContent].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalViews = content.reduce((sum, c) => sum + (c.views_count || 0), 0);
  const totalLikes = content.reduce((sum, c) => sum + (c.likes_count || 0), 0);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold mb-2">Empresa no encontrada</h1>
        <p className="text-muted-foreground text-center mb-4">
          Esta empresa no existe o su perfil es privado.
        </p>
        <Button onClick={() => navigate('/portfolio')}>
          Ir al portfolio
        </Button>
      </div>
    );
  }

  // TikTok-style fullscreen view
  if (showTikTokView && sortedContent.length > 0) {
    const videoItems = sortedContent.map(item => ({
      id: item.id,
      title: item.title,
      videoUrls: item.bunny_embed_url 
        ? [item.bunny_embed_url] 
        : (item.video_urls || (item.video_url ? [item.video_url] : [])),
      thumbnailUrl: item.thumbnail_url,
      viewsCount: item.views_count,
      likesCount: item.likes_count,
      isLiked: item.is_liked,
      clientName: company.name
    }));

    return (
      <VideoPlayerProvider>
        <TikTokFeed
          videos={videoItems}
          onLike={handleLike}
          onView={handleView}
          onShare={(video) => handleShare(sortedContent.find(c => c.id === video.id)!)}
        />
      </VideoPlayerProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PortfolioHeader />

      {/* Company Profile Section */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-6">
        {/* Avatar & Info */}
        <div className="flex flex-col items-center text-center mb-6">
          <Avatar className="w-24 h-24 mb-4 border-2 border-primary/20">
            <AvatarImage src={company.logo_url || undefined} alt={company.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              <Building2 className="w-10 h-10" />
            </AvatarFallback>
          </Avatar>
          
          <h1 className="text-xl font-bold">{company.name}</h1>
          {company.username && (
            <p className="text-sm text-muted-foreground">@{company.username}</p>
          )}
          
          {company.bio && (
            <div className="mt-3 text-sm text-muted-foreground max-w-md">
              <ParsedText text={company.bio} />
            </div>
          )}

          {/* Social Links */}
          <div className="flex gap-3 mt-4">
            {company.instagram && (
              <a 
                href={`https://instagram.com/${company.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {company.tiktok && (
              <a 
                href={`https://tiktok.com/@${company.tiktok.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"
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
                className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"
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
                className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"
              >
                <Globe className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 py-4 border-y border-border">
          <div className="text-center">
            <div className="text-lg font-bold">{sortedContent.length}</div>
            <div className="text-xs text-muted-foreground">Videos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{formatNumber(totalViews)}</div>
            <div className="text-xs text-muted-foreground">Vistas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{formatNumber(totalLikes)}</div>
            <div className="text-xs text-muted-foreground">Likes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{products.length}</div>
            <div className="text-xs text-muted-foreground">Productos</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mt-4">
          <button
            onClick={() => setActiveTab('content')}
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
              activeTab === 'content' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <VideoIcon className="w-4 h-4" />
            Contenido
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
              activeTab === 'products' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 className="w-4 h-4" />
            Productos
          </button>
        </div>

        {/* Content Grid */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-3 gap-1 mt-4">
            {sortedContent.length === 0 ? (
              <div className="col-span-3 py-12 text-center text-muted-foreground">
                <VideoIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Sin contenido publicado</p>
              </div>
            ) : (
              sortedContent.map((item, index) => (
                <div
                  key={item.id}
                  className="relative aspect-[9/16] bg-muted cursor-pointer group overflow-hidden"
                  onClick={() => {
                    setInitialVideoIndex(index);
                    setShowTikTokView(true);
                  }}
                >
                  {item.thumbnail_url ? (
                    <img 
                      src={item.thumbnail_url} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Pinned badge */}
                  {item.is_pinned && (
                    <div className="absolute top-1 left-1 bg-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                      📌
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  
                  {/* Stats */}
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between text-white text-xs">
                    <span className="flex items-center gap-0.5 drop-shadow-lg">
                      <Eye className="w-3 h-3" />
                      {formatNumber(item.views_count)}
                    </span>
                    <span className="flex items-center gap-0.5 drop-shadow-lg">
                      <Heart className={cn("w-3 h-3", item.is_liked && "fill-red-500 text-red-500")} />
                      {formatNumber(item.likes_count)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Products List */}
        {activeTab === 'products' && (
          <div className="mt-4 space-y-3">
            {products.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Sin productos registrados</p>
              </div>
            ) : (
              products.map(product => (
                <div 
                  key={product.id}
                  className="p-4 bg-muted/50 rounded-lg border border-border"
                >
                  <h3 className="font-medium">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}