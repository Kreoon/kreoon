import { Button } from '@/components/ui/button';
import { SmartSearch } from '@/components/portfolio/SmartSearch';
import { Home, User, RefreshCw, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

interface PortfolioHeaderProps {
  onRefresh?: () => void;
  refreshing?: boolean;
  showTabs?: boolean;
  activeTab?: 'for-you' | 'following';
  onTabChange?: (tab: 'for-you' | 'following') => void;
}

export function PortfolioHeader({
  onRefresh,
  refreshing = false,
  showTabs = false,
  activeTab = 'for-you',
  onTabChange,
}: PortfolioHeaderProps) {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!user;
  
  // Check if we're on a profile page (not the main social feed)
  const isProfilePage = location.pathname.startsWith('/p/') || 
                        location.pathname.startsWith('/@') ||
                        (location.pathname !== '/social' && !location.pathname.startsWith('/social'));

  const getDashboardRoute = () => {
    if (roles.includes('admin')) return '/';
    if (roles.includes('creator')) return '/creator-dashboard';
    if (roles.includes('editor')) return '/editor-dashboard';
    if (roles.includes('client')) return '/client-dashboard';
    return '/social';
  };

  return (
    <div className="sticky top-0 z-50 p-4 bg-gradient-to-b from-black via-black/90 to-transparent pointer-events-none">
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Back button when on profile page */}
          {isProfilePage && (
            <button 
              onClick={() => navigate('/social')}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
          )}
          
          {/* Logo - Always visible */}
          <button 
            onClick={() => navigate('/social')}
            className="h-8 w-8 rounded-lg bg-social-accent flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            <span className="text-white font-bold text-xs">SC</span>
          </button>
          
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={refreshing}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        
        {/* Feed Tabs - Only show on main portfolio when logged in */}
        {showTabs && isLoggedIn && onTabChange && (
          <div className="flex items-center bg-black/40 rounded-full p-1">
            <button
              onClick={() => onTabChange('following')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                activeTab === 'following' ? 'bg-white text-black' : 'text-white/70'
              }`}
            >
              Siguiendo
            </button>
            <button
              onClick={() => onTabChange('for-you')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                activeTab === 'for-you' ? 'bg-white text-black' : 'text-white/70'
              }`}
            >
              Para ti
            </button>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Search Icon */}
          <SmartSearch variant="icon" />
          
          {isLoggedIn ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => user && navigate(`/p/${user.id}`)}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(getDashboardRoute())}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <Home className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => navigate('/auth')}
              className="bg-gradient-gold text-black font-semibold text-xs px-3 h-8"
            >
              Entrar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
