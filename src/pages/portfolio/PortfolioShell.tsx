import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Play, User, Bookmark, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolioPermissions } from '@/hooks/usePortfolioPermissions';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SocialNotificationsDropdown } from '@/components/portfolio/SocialNotificationsDropdown';
import { KreoonSocialLogo } from '@/components/social/KreoonSocialBrand';

// Lazy load pages for performance
const FeedPage = lazy(() => import('./FeedPage'));
const VideosPage = lazy(() => import('./VideosPage'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const SavedPage = lazy(() => import('./SavedPage'));

type TabKey = 'feed' | 'videos' | 'profile' | 'saved';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: typeof Home;
  permission: 'portfolio.feed.view' | 'portfolio.videos.view' | 'portfolio.profile.view' | 'portfolio.saved.view';
}

const TABS: TabConfig[] = [
  { key: 'feed', label: 'Feed', icon: Home, permission: 'portfolio.feed.view' },
  { key: 'videos', label: 'Videos', icon: Play, permission: 'portfolio.videos.view' },
  { key: 'profile', label: 'Mi Perfil', icon: User, permission: 'portfolio.profile.view' },
  { key: 'saved', label: 'Guardados', icon: Bookmark, permission: 'portfolio.saved.view' },
];

// Persist tab state
const TAB_STORAGE_KEY = 'portfolio_active_tab';

function TabSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function PortfolioShell() {
  const { user } = useAuth();
  const { can, loading: permissionsLoading } = usePortfolioPermissions();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get initial tab from URL hash or storage
  const getInitialTab = (): TabKey => {
    const hash = location.hash.replace('#', '') as TabKey;
    if (TABS.some(t => t.key === hash)) return hash;
    
    const stored = localStorage.getItem(TAB_STORAGE_KEY) as TabKey | null;
    if (stored && TABS.some(t => t.key === stored)) return stored;
    
    return 'feed';
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab);
  const [tabStates, setTabStates] = useState<Record<TabKey, boolean>>({
    feed: false,
    videos: false,
    profile: false,
    saved: false,
  });

  // Mark tab as loaded (for state preservation)
  useEffect(() => {
    setTabStates(prev => ({ ...prev, [activeTab]: true }));
  }, [activeTab]);

  const handleTabChange = useCallback((tab: TabKey) => {
    // Pause all videos when switching tabs to avoid audio overlap
    document.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.muted = true;
    });
    
    setActiveTab(tab);
    localStorage.setItem(TAB_STORAGE_KEY, tab);
    // Update URL hash without navigation
    window.history.replaceState(null, '', `#${tab}`);
  }, []);

  // Get visible tabs based on permissions
  const visibleTabs = TABS.filter(tab => 
    permissionsLoading || can(tab.permission)
  );

  // Render tab content with state preservation
  const renderTabContent = () => {
    return (
      <Suspense fallback={<TabSkeleton />}>
        {/* Keep all visited tabs mounted but hidden for state preservation */}
        <div className={cn(activeTab === 'feed' ? 'block' : 'hidden', 'h-full')}>
          {tabStates.feed && <FeedPage />}
        </div>
        <div className={cn(activeTab === 'videos' ? 'block' : 'hidden', 'h-full')}>
          {tabStates.videos && <VideosPage />}
        </div>
        <div className={cn(activeTab === 'profile' ? 'block' : 'hidden', 'h-full')}>
          {tabStates.profile && <ProfilePage />}
        </div>
        <div className={cn(activeTab === 'saved' ? 'block' : 'hidden', 'h-full')}>
          {tabStates.saved && <SavedPage />}
        </div>
      </Suspense>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-social-background">
      {/* Mobile header with notifications */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-social-background/95 backdrop-blur-lg border-b border-social-border z-50 flex items-center px-4">
        <KreoonSocialLogo className="flex-1" />
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-social-foreground hover:bg-social-muted"
            onClick={() => navigate('/explore')}
          >
            <Compass className="h-5 w-5" />
          </Button>
          <SocialNotificationsDropdown />
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-hidden pt-14 md:pt-0">
        {renderTabContent()}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-social-background/95 backdrop-blur-lg border-t border-social-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  isActive 
                    ? "text-social-accent" 
                    : "text-social-muted-foreground hover:text-social-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
                <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar navigation - shown on md+ */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 lg:w-64 bg-social-card border-r border-social-border flex-col z-40">
        {/* Logo area with notifications */}
        <div className="h-16 flex items-center gap-3 lg:px-6 border-b border-social-border px-4">
          {/* In md (mini sidebar) show only the mark to avoid overlap */}
          <div className="flex items-center min-w-0 flex-1">
            <img src="/favicon.png" alt="KREOON" className="h-9 w-9 rounded-md lg:hidden" />
            <KreoonSocialLogo className="hidden lg:flex" />
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-social-foreground hover:bg-social-muted"
              onClick={() => navigate('/explore')}
            >
              <Compass className="h-4 w-4" />
            </Button>
            <SocialNotificationsDropdown />
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-4">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 lg:px-6 py-3 transition-colors",
                  isActive 
                    ? "bg-social-accent/10 text-social-accent border-r-2 border-social-accent" 
                    : "text-social-muted-foreground hover:bg-social-muted hover:text-social-foreground"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="hidden lg:block font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className="p-4 border-t border-social-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-social-foreground hover:bg-social-muted"
              onClick={() => navigate('/settings')}
            >
              <div className="h-8 w-8 rounded-full bg-social-accent/20 flex items-center justify-center">
                <User className="h-4 w-4 text-social-accent" />
              </div>
              <span className="hidden lg:block text-sm truncate">
                Configuración
              </span>
            </Button>
          </div>
        )}
      </aside>

      {/* Chat button removed - using comments instead */}

      {/* Spacer for mobile bottom nav */}
      <div className="h-16 md:hidden" />
      
      {/* Spacer for desktop sidebar */}
      <div className="hidden md:block w-20 lg:w-64 flex-shrink-0" />
    </div>
  );
}
