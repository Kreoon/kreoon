import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2, Globe, Instagram, MapPin, ExternalLink,
  Grid3X3, Play, Users, Heart, Settings, ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanyFollowButton } from '@/components/portfolio/CompanyFollowButton';
import { CompanyProfileEditor } from '@/components/portfolio/CompanyProfileEditor';
import FeedGridCard from '@/components/portfolio/feed/FeedGridCard';
import FeedGridModal from '@/components/portfolio/feed/FeedGridModal';

interface Company {
  id: string;
  name: string;
  username: string | null;
  bio: string | null;
  logo_url: string | null;
  category: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  is_public: boolean;
  is_vip: boolean | null;
}

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
  client_name?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function CompanyProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  
  // Stats
  const [followersCount, setFollowersCount] = useState(0);
  const [contentCount, setContentCount] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  
  // Content
  const [content, setContent] = useState<FeedItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  
  // Creators
  const [creators, setCreators] = useState<{ id: string; full_name: string; avatar_url: string | null; content_count: number }[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (username) {
      fetchCompany();
    }
  }, [username]);

  const fetchCompany = async () => {
    setLoading(true);
    try {
      // Fetch company by username
      const { data: companyData, error } = await supabase
        .from('clients')
        .select('*')
        .eq('username', username?.toLowerCase())
        .eq('is_public', true)
        .single();

      if (error || !companyData) {
        setNotFound(true);
        return;
      }

      setCompany(companyData as Company);
      
      // Check if current user is owner
      if (user?.id) {
        const { data: clientUser } = await supabase
          .from('client_users')
          .select('id')
          .eq('client_id', companyData.id)
          .eq('user_id', user.id)
          .single();
        
        setIsOwner(!!clientUser || companyData.user_id === user.id);
      }

      // Fetch stats in parallel
      await Promise.all([
        fetchFollowersCount(companyData.id),
        fetchContent(companyData.id),
        fetchCreators(companyData.id),
      ]);
    } catch (error) {
      console.error('Error fetching company:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowersCount = async (companyId: string) => {
    const { count } = await supabase
      .from('company_followers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    
    setFollowersCount(count || 0);
  };

  const fetchContent = async (companyId: string) => {
    setLoadingContent(true);
    try {
      const { data, error } = await supabase
        .from('content')
        .select(`
          id,
          title,
          video_url,
          video_urls,
          bunny_embed_url,
          thumbnail_url,
          creator_id,
          views_count,
          likes_count,
          created_at
        `)
        .eq('client_id', companyId)
        .eq('is_published', true)
        .or('video_url.not.is.null,bunny_embed_url.not.is.null,video_urls.not.is.null')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get creator profiles
      const creatorIds = [...new Set((data || []).map(c => c.creator_id).filter(Boolean))] as string[];
      const { data: profiles } = creatorIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', creatorIds)
        : { data: [] };
      
      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

      const items: FeedItem[] = (data || []).map(c => {
        const profile = profilesMap.get(c.creator_id);
        const videoUrls = c.video_urls as string[] | null;
        const directVideoUrl = videoUrls && videoUrls.length > 0 
          ? videoUrls[0] 
          : c.video_url || c.bunny_embed_url;

        return {
          id: c.id,
          type: 'work' as const,
          title: c.title,
          media_url: directVideoUrl,
          media_type: 'video' as const,
          thumbnail_url: c.thumbnail_url || undefined,
          user_id: c.creator_id || '',
          user_name: profile?.full_name,
          user_avatar: profile?.avatar_url,
          views_count: c.views_count || 0,
          likes_count: c.likes_count || 0,
          comments_count: 0,
          created_at: c.created_at,
        };
      });

      setContent(items);
      setContentCount(items.length);
      setTotalViews(items.reduce((sum, c) => sum + c.views_count, 0));
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const fetchCreators = async (companyId: string) => {
    setLoadingCreators(true);
    try {
      // Get all creator_ids from content for this company
      const { data: contentData } = await supabase
        .from('content')
        .select('creator_id')
        .eq('client_id', companyId)
        .not('creator_id', 'is', null);

      if (!contentData || contentData.length === 0) {
        setCreators([]);
        return;
      }

      // Count content per creator
      const creatorCounts = new Map<string, number>();
      contentData.forEach(c => {
        if (c.creator_id) {
          creatorCounts.set(c.creator_id, (creatorCounts.get(c.creator_id) || 0) + 1);
        }
      });

      const creatorIds = [...creatorCounts.keys()];
      
      // Get creator profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', creatorIds);

      const creatorsWithCount = (profiles || []).map(p => ({
        ...p,
        content_count: creatorCounts.get(p.id) || 0
      })).sort((a, b) => b.content_count - a.content_count);

      setCreators(creatorsWithCount);
    } catch (error) {
      console.error('Error fetching creators:', error);
    } finally {
      setLoadingCreators(false);
    }
  };

  const handleCardClick = (index: number) => {
    setSelectedIndex(index);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Empresa no encontrada</h1>
          <p className="text-muted-foreground">Este perfil no existe o no es público.</p>
          <Button onClick={() => navigate('/social')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold truncate">{company.name}</h1>
          </div>
          {isOwner && (
            <Button variant="outline" size="sm" onClick={() => setShowEditor(true)}>
              <Settings className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-60px)]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Profile Section */}
          <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
            {/* Avatar */}
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-2 border-border">
              <AvatarImage src={company.logo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                <Building2 className="w-10 h-10" />
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{company.name}</h2>
                {company.is_vip && (
                  <Badge variant="default" className="bg-amber-500">VIP</Badge>
                )}
              </div>

              {company.username && (
                <p className="text-muted-foreground">@{company.username}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <span className="font-bold">{contentCount}</span>
                  <span className="text-muted-foreground ml-1">contenidos</span>
                </div>
                <div className="text-center">
                  <span className="font-bold">{formatCount(followersCount)}</span>
                  <span className="text-muted-foreground ml-1">seguidores</span>
                </div>
                <div className="text-center">
                  <span className="font-bold">{formatCount(totalViews)}</span>
                  <span className="text-muted-foreground ml-1">views</span>
                </div>
              </div>

              {/* Bio */}
              {company.bio && (
                <p className="text-sm">{company.bio}</p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {company.category && (
                  <Badge variant="secondary">{company.category}</Badge>
                )}
                {(company.city || company.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[company.city, company.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>

              {/* Links */}
              <div className="flex flex-wrap items-center gap-2">
                {company.website && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={company.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-1" />
                      Website
                    </a>
                  </Button>
                )}
                {company.instagram && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://instagram.com/${company.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                      <Instagram className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>

              {/* Follow button */}
              {!isOwner && user?.id && (
                <CompanyFollowButton companyId={company.id} />
              )}
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
              <TabsTrigger 
                value="content" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Contenido
              </TabsTrigger>
              <TabsTrigger 
                value="creators"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Users className="h-4 w-4 mr-2" />
                Creadores
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-4">
              {loadingContent ? (
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square" />
                  ))}
                </div>
              ) : content.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aún no hay contenido publicado</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {content.map((item, index) => (
                    <FeedGridCard
                      key={item.id}
                      item={item}
                      onClick={() => handleCardClick(index)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="creators" className="mt-4">
              {loadingCreators ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : creators.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aún no hay creadores asociados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {creators.map(creator => (
                    <div 
                      key={creator.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/profile/${creator.id}`)}
                    >
                      <Avatar className="w-12 h-12 border">
                        <AvatarImage src={creator.avatar_url || undefined} />
                        <AvatarFallback>{creator.full_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{creator.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {creator.content_count} {creator.content_count === 1 ? 'contenido' : 'contenidos'}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Content Modal */}
      <FeedGridModal
        items={content}
        initialIndex={selectedIndex}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={() => {}}
        isSaved={() => false}
      />

      {/* Editor */}
      {isOwner && (
        <CompanyProfileEditor
          companyId={company.id}
          currentData={company}
          open={showEditor}
          onOpenChange={setShowEditor}
          onSave={fetchCompany}
        />
      )}
    </div>
  );
}
