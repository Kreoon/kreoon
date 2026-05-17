import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import type { QuickShareData } from '../types/social.types';
import {
  LayoutDashboard, LinkIcon, PenSquare, Calendar, BarChart3,
  Plus, FolderOpen, Clock, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AccountsManager } from '../components/Accounts/AccountsManager';
import { PostComposer } from '../components/Composer/PostComposer';
import { CalendarView } from '../components/Calendar/CalendarView';
import { AnalyticsDashboard } from '../components/Analytics/AnalyticsDashboard';
import { PostList } from '../components/Dashboard/PostList';
import { AccountSwitcher, type AccountSelection } from '../components/AccountSwitcher/AccountSwitcher';
import { GroupsManager } from '../components/Settings/GroupsManager';
import { ContentQueueManager } from '../components/Queue/ContentQueue';
import { useSocialAccounts } from '../hooks/useSocialAccounts';
import { useScheduledPosts } from '../hooks/useScheduledPosts';
import type { ScheduledPost } from '../types/social.types';

const ALL_TABS = [
  { id: 'analytics', label: 'Métricas', emoji: '📊', icon: BarChart3, managerOnly: false },
  { id: 'dashboard', label: 'Publicaciones', emoji: '🗓️', icon: LayoutDashboard, managerOnly: false },
  { id: 'composer', label: 'Crear Post', emoji: '✏️', icon: PenSquare, managerOnly: false },
  { id: 'calendar', label: 'Calendario', emoji: '📅', icon: Calendar, managerOnly: false },
  { id: 'queue', label: 'Cola', emoji: '⏳', icon: Clock, managerOnly: true },
  { id: 'groups', label: 'Grupos', emoji: '👥', icon: FolderOpen, managerOnly: true },
  { id: 'accounts', label: 'Cuentas', emoji: '🔗', icon: LinkIcon, managerOnly: false },
] as const;

type TabId = (typeof ALL_TABS)[number]['id'];

export default function SocialHubPage() {
  const [activeTab, setActiveTab] = useState<TabId>('analytics');
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewingPost, setViewingPost] = useState<ScheduledPost | null>(null);
  const [accountSelection, setAccountSelection] = useState<AccountSelection>({ type: 'all' });
  const [sharedContent, setSharedContent] = useState<Partial<QuickShareData> | undefined>(undefined);
  const { accounts, isLoading: accountsLoading, isManagerRole } = useSocialAccounts();
  const { stats } = useScheduledPosts();

  // Filter tabs based on role
  const TABS = ALL_TABS.filter(tab => !tab.managerOnly || isManagerRole);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Handle content shared from content board via navigate state
  useEffect(() => {
    const state = location.state as { shareContent?: QuickShareData } | null;
    if (state?.shareContent) {
      setSharedContent(state.shareContent);
      setActiveTab('composer');
      // Clear the state so it doesn't persist on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Handle OAuth callback redirect (fallback when popup doesn't have opener)
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const platform = searchParams.get('platform');
    if (success === 'true') {
      toast.success(`${platform || 'Cuenta'} conectado correctamente`);
      setActiveTab('accounts');
      setSearchParams({}, { replace: true });
    } else if (error) {
      toast.error(`Error: ${decodeURIComponent(error)}`);
      setActiveTab('accounts');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCreatePost = () => {
    if (accounts.length === 0) {
      setActiveTab('accounts');
      return;
    }
    setComposerOpen(true);
  };

  const handleViewPost = (post: ScheduledPost) => {
    setViewingPost(post);
  };

  // Get the selected account ID for queue tab
  const selectedAccountId = accountSelection.type === 'account' ? accountSelection.accountId : undefined;
  const selectedGroupId = accountSelection.type === 'group' ? accountSelection.groupId : undefined;

  return (
    <div className="space-y-6">
      {/* Header with AccountSwitcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div>
            <h1 className="text-2xl font-bold">Social Hub</h1>
            <p className="text-sm text-muted-foreground">
              Programa, publica y mide tu contenido en todas tus redes sociales.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AccountSwitcher value={accountSelection} onChange={setAccountSelection} />
          <Button onClick={handleCreatePost}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Post
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { emoji: '📱', label: 'Cuentas',     value: accounts.length,       bg: 'bg-blue-500/10' },
          { emoji: '📅', label: 'Programados', value: stats.scheduledCount,  bg: 'bg-yellow-500/10' },
          { emoji: '✅', label: 'Publicados',  value: stats.publishedCount,  bg: 'bg-green-500/10' },
          { emoji: '✏️', label: 'Borradores',  value: stats.draftCount,      bg: 'bg-orange-500/10' },
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border-2 border-transparent hover:border-border/60 transition-colors">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${stat.bg}`}>
              {stat.emoji}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
              <span className="text-base leading-none">{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="dashboard" className="mt-0">
            <PostList onViewPost={handleViewPost} />
          </TabsContent>

          <TabsContent value="composer" className="mt-0">
            <div className="max-w-2xl">
              <PostComposer
                initialData={sharedContent}
                onSuccess={() => {
                  setActiveTab('dashboard');
                  setSharedContent(undefined);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <CalendarView onCreatePost={handleCreatePost} onViewPost={handleViewPost} />
          </TabsContent>

          <TabsContent value="queue" className="mt-0">
            <ContentQueueManager accountId={selectedAccountId} groupId={selectedGroupId} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="groups" className="mt-0">
            <GroupsManager />
          </TabsContent>

          <TabsContent value="accounts" className="mt-0">
            <AccountsManager />
          </TabsContent>
        </div>
      </Tabs>

      {/* Quick composer dialog */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Post</DialogTitle>
          </DialogHeader>
          <PostComposer
            onSuccess={() => {
              setComposerOpen(false);
              setActiveTab('dashboard');
            }}
            onClose={() => setComposerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Post detail dialog */}
      <Dialog open={!!viewingPost} onOpenChange={() => setViewingPost(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Publicación</DialogTitle>
          </DialogHeader>
          {viewingPost && (
            <div className="space-y-4">
              {viewingPost.thumbnail_url && (
                <img
                  src={viewingPost.thumbnail_url}
                  alt=""
                  className="w-full rounded-sm aspect-video object-cover"
                />
              )}
              <p className="text-sm whitespace-pre-wrap">{viewingPost.caption}</p>
              {viewingPost.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {viewingPost.hashtags.map(tag => (
                    <span key={tag} className="text-xs text-primary">#{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Estado:</span>
                <span className="text-sm">{viewingPost.status}</span>
              </div>
              {viewingPost.scheduled_at && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Programado:</span>
                  <span className="text-sm">
                    {new Date(viewingPost.scheduled_at).toLocaleString('es')}
                  </span>
                </div>
              )}
              {viewingPost.publish_results && viewingPost.publish_results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Resultados:</p>
                  {viewingPost.publish_results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={r.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                        {r.platform}: {r.status}
                      </span>
                      {r.error && <span className="text-red-400">({r.error})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
