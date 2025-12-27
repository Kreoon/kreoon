import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePortfolioPermissions } from '@/hooks/usePortfolioPermissions';
import { useProfileBlocksConfig } from '@/hooks/useProfileBlocksConfig';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Edit, Grid, Bookmark, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ProfileBlocksRenderer from '@/components/portfolio/profile/ProfileBlocksRenderer';
import BlocksEditorDialog from '@/components/portfolio/profile/BlocksEditorDialog';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ProfileStats {
  posts_count: number;
  followers_count: number;
  following_count: number;
  work_count: number;
}

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const { can, canEditBlock, isOrgAdmin } = usePortfolioPermissions();
  const { blocks, loading: blocksLoading } = useProfileBlocksConfig();
  const navigate = useNavigate();

  const [stats, setStats] = useState<ProfileStats>({
    posts_count: 0,
    followers_count: 0,
    following_count: 0,
    work_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showBlocksEditor, setShowBlocksEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'videos' | 'saved'>('grid');

  useEffect(() => {
    if (!user?.id) return;

    const fetchStats = async () => {
      try {
        const [postsRes, followersRes, followingRes, workRes] = await Promise.all([
          supabase
            .from('portfolio_posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', user.id),
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', user.id),
          supabase
            .from('content')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', user.id)
            .eq('is_published', true),
        ]);

        setStats({
          posts_count: postsRes.count || 0,
          followers_count: followersRes.count || 0,
          following_count: followingRes.count || 0,
          work_count: workRes.count || 0,
        });
      } catch (error) {
        console.error('[ProfilePage] Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  if (!user || !profile) {
    return (
      <div className="h-full flex items-center justify-center md:ml-20 lg:ml-64">
        <div className="text-muted-foreground">Inicia sesión para ver tu perfil</div>
      </div>
    );
  }

  const canEdit = can('portfolio.profile.edit');

  return (
    <div className="h-full overflow-y-auto md:ml-20 lg:ml-64 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{profile.full_name || 'Mi Perfil'}</h1>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant={editMode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                <Edit className="h-4 w-4 mr-1" />
                {editMode ? 'Guardar' : 'Editar'}
              </Button>
            )}
            {isOrgAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBlocksEditor(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Profile header */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 ring-4 ring-primary/20">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">
              {profile.full_name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold">{profile.full_name}</h2>
            {profile.bio && (
              <p className="text-muted-foreground mt-1 max-w-md">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="flex justify-center sm:justify-start gap-6 mt-4">
              <StatItem label="Posts" value={stats.posts_count} />
              <StatItem label="Trabajos" value={stats.work_count} />
              <StatItem label="Seguidores" value={stats.followers_count} />
              <StatItem label="Siguiendo" value={stats.following_count} />
            </div>

            {/* Actions */}
            {canEdit && (
              <div className="mt-4 flex justify-center sm:justify-start gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                  Editar perfil
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content tabs */}
      <div className="max-w-4xl mx-auto px-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0">
            <TabsTrigger 
              value="grid" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Grid className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="videos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Play className="h-4 w-4 mr-2" />
              Videos
            </TabsTrigger>
            {can('portfolio.saved.view') && (
              <TabsTrigger 
                value="saved"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Bookmark className="h-4 w-4 mr-2" />
                Guardados
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="grid" className="mt-4">
            {blocksLoading ? (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square" />
                ))}
              </div>
            ) : (
              <ProfileBlocksRenderer
                blocks={blocks}
                userId={user.id}
                isOwner={true}
                editMode={editMode}
              />
            )}
          </TabsContent>

          <TabsContent value="videos" className="mt-4">
            <ProfileVideosGrid userId={user.id} />
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            <ProfileSavedGrid />
          </TabsContent>
        </Tabs>
      </div>

      {/* Blocks editor dialog */}
      {showBlocksEditor && (
        <BlocksEditorDialog
          open={showBlocksEditor}
          onOpenChange={setShowBlocksEditor}
        />
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ProfileVideosGrid({ userId }: { userId: string }) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      const [{ data: workData }, { data: postData }] = await Promise.all([
        supabase
          .from('content')
          .select('id, title, video_url, thumbnail_url, views_count')
          .eq('creator_id', userId)
          .eq('is_published', true)
          .not('video_url', 'is', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('portfolio_posts')
          .select('id, media_url, thumbnail_url, views_count')
          .eq('user_id', userId)
          .eq('media_type', 'video')
          .order('created_at', { ascending: false }),
      ]);

      setVideos([
        ...(workData || []).map(w => ({ ...w, type: 'work' })),
        ...(postData || []).map(p => ({ ...p, type: 'post', video_url: p.media_url })),
      ]);
      setLoading(false);
    };

    fetchVideos();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[9/16]" />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay videos publicados
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {videos.map(video => (
        <div 
          key={`${video.type}-${video.id}`}
          className="aspect-[9/16] relative group cursor-pointer overflow-hidden rounded-sm"
        >
          <img
            src={video.thumbnail_url || '/placeholder.svg'}
            alt={video.title || 'Video'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="h-8 w-8 text-white" />
          </div>
          {video.views_count > 0 && (
            <div className="absolute bottom-1 left-1 text-white text-xs flex items-center gap-1">
              <Play className="h-3 w-3" />
              {video.views_count}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProfileSavedGrid() {
  const { items, collections, loading } = require('@/hooks/useSavedItems').useSavedItems();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* All saved */}
      <div className="aspect-square bg-muted rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
        <Bookmark className="h-8 w-8 mb-2" />
        <span className="font-medium">Todos</span>
        <span className="text-sm text-muted-foreground">{items.length} elementos</span>
      </div>

      {/* Collections */}
      {collections.map((col: any) => (
        <div 
          key={col.id}
          className="aspect-square bg-muted rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
        >
          <Bookmark className="h-8 w-8 mb-2" />
          <span className="font-medium">{col.name}</span>
          <span className="text-sm text-muted-foreground">{col.items_count} elementos</span>
        </div>
      ))}
    </div>
  );
}
