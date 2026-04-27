import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrgMarketplace } from '@/hooks/useOrgMarketplace';
import { getPermissionGroup, getDashboardForRole } from '@/lib/permissionGroups';
import { MainLayout } from './MainLayout';
import { PublicLayout } from './PublicLayout';

interface MarketplaceLayoutProps {
  children: ReactNode;
}

/**
 * Layout wrapper for marketplace routes.
 * - Authenticated users get the full MainLayout (sidebar, header, etc.)
 * - Anonymous visitors get the PublicLayout (same header/footer as landing pages).
 * - Client users with marketplace disabled get redirected to their dashboard.
 */
export function MarketplaceLayout({ children }: MarketplaceLayoutProps) {
  const { user, loading, activeRole, roles } = useAuth();
  const { clientMarketplaceEnabled, loading: mktLoading } = useOrgMarketplace();

  // While auth is loading, show the public layout
  if (loading) {
    return (
      <PublicLayout showFooter={true} minimalFooter={true} transparentHeader={false}>
        {children}
      </PublicLayout>
    );
  }

  if (user) {
    const isClient = roles.some(r => getPermissionGroup(r) === 'client');

    // Block clients when clientMarketplaceEnabled is false
    if (isClient && !mktLoading && !clientMarketplaceEnabled) {
      const dashboard = getDashboardForRole(activeRole || roles[0]);
      return <Navigate to={dashboard} replace />;
    }

    return <MainLayout>{children}</MainLayout>;
  }

  return (
    <PublicLayout showFooter={true} minimalFooter={true} transparentHeader={false}>
      {children}
    </PublicLayout>
  );
}
