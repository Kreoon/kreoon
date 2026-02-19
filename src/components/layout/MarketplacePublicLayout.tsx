import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from './MainLayout';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Sparkles } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

interface MarketplaceLayoutProps {
  children: ReactNode;
}

/**
 * Layout wrapper for marketplace routes.
 * - Authenticated users get the full MainLayout (sidebar, header, etc.)
 * - Anonymous visitors get a minimal header with logo + login/register buttons.
 */
export function MarketplaceLayout({ children }: MarketplaceLayoutProps) {
  const { user, loading } = useAuth();

  // While auth is loading, show the children (marketplace pages handle their own skeleton)
  if (loading) {
    return <AnonymousMarketplaceShell>{children}</AnonymousMarketplaceShell>;
  }

  if (user) {
    return <MainLayout>{children}</MainLayout>;
  }

  return <AnonymousMarketplaceShell>{children}</AnonymousMarketplaceShell>;
}

function AnonymousMarketplaceShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const logoUrl = branding.logo_url || '/favicon.png';
  const platformName = branding.platform_name || 'KREOON';

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative">
      {/* Minimal header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-md px-4 md:px-6">
        <button
          onClick={() => navigate('/marketplace')}
          className="flex items-center gap-2"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden">
            <img src={logoUrl} alt={platformName} className="h-7 w-7 object-cover" loading="lazy" />
          </div>
          <span className="text-sm font-bold text-white">{platformName}</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/auth')}
            className="text-foreground/80 hover:text-foreground hover:bg-white/10"
          >
            <LogIn className="h-4 w-4 mr-1.5" />
            Iniciar sesión
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/register?intent=talent')}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Soy Talento
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/register?intent=brand')}
            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hidden sm:flex"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Busco Talento
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  );
}
