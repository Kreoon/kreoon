import { useState } from 'react';
import {
  LayoutDashboard, LinkIcon, PenSquare, Calendar, BarChart3,
  Plus, FolderOpen, Clock, Shield,
} from 'lucide-react';
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

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'composer', label: 'Crear Post', icon: PenSquare },
  { id: 'calendar', label: 'Calendario', icon: Calendar },
  { id: 'queue', label: 'Cola', icon: Clock },
  { id: 'analytics', label: 'Métricas', icon: BarChart3 },
  { id: 'groups', label: 'Grupos', icon: FolderOpen },
  { id: 'accounts', label: 'Cuentas', icon: LinkIcon },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SocialHubPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewingPost, setViewingPost] = useState<ScheduledPost | null>(null);
  const [accountSelection, setAccountSelection] = useState<AccountSelection>({ type: 'all' });
  const { accounts, isLoading: accountsLoading } = useSocialAccounts();
  const { stats } = useScheduledPosts();

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
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cuentas</p>
            <p className="text-lg font-bold">{accounts.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Programados</p>
            <p className="text-lg font-bold">{stats.scheduledCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Publicados</p>
            <p className="text-lg font-bold">{stats.publishedCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <PenSquare className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Borradores</p>
            <p className="text-lg font-bold">{stats.draftCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
              <tab.icon className="w-4 h-4" />
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
              <PostComposer onSuccess={() => setActiveTab('dashboard')} />
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
                  className="w-full rounded-lg aspect-video object-cover"
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
