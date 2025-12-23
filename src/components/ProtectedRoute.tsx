import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppRole } from '@/types/database';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

// Helper to get the correct dashboard path based on user roles
function getDashboardPath(roles: AppRole[]): string {
  if (roles.length === 0) return '/pending-access';
  if (roles.includes('admin')) return '/';
  if (roles.includes('ambassador')) return '/';
  if (roles.includes('strategist')) return '/strategist-dashboard';
  if (roles.includes('creator')) return '/creator-dashboard';
  if (roles.includes('editor')) return '/editor-dashboard';
  if (roles.includes('client')) return '/client-dashboard';
  return '/pending-access';
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, roles, loading, rolesLoaded } = useAuth();
  const [clientHasCompany, setClientHasCompany] = useState<boolean | null>(null);
  const [checkingCompany, setCheckingCompany] = useState(false);

  const isClient = roles.includes('client');

  useEffect(() => {
    async function checkClientCompany() {
      if (!user || !isClient) {
        setClientHasCompany(true); // Non-clients don't need company
        return;
      }

      setCheckingCompany(true);
      try {
        const { data, error } = await supabase
          .from('client_users')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Error checking client company:', error);
          setClientHasCompany(false);
        } else {
          setClientHasCompany(data && data.length > 0);
        }
      } catch (err) {
        console.error('Error:', err);
        setClientHasCompany(false);
      } finally {
        setCheckingCompany(false);
      }
    }

    if (rolesLoaded && user) {
      checkClientCompany();
    }
  }, [user, isClient, rolesLoaded]);

  // Wait for both auth loading AND roles to be loaded
  if (loading || !rolesLoaded || (isClient && clientHasCompany === null) || checkingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Users without any roles need to request access
  if (roles.length === 0) {
    return <Navigate to="/pending-access" replace />;
  }

  // Client users without an associated company cannot access the app
  if (isClient && !clientHasCompany) {
    return <Navigate to="/no-company" replace />;
  }

  // Client users without an associated company cannot access the app
  if (isClient && !clientHasCompany) {
    return <Navigate to="/no-company" replace />;
  }

  // Check if user has the required role
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => roles.includes(role));
    if (!hasAllowedRole) {
      // Instead of showing unauthorized, redirect to their appropriate dashboard
      const correctDashboard = getDashboardPath(roles);
      return <Navigate to={correctDashboard} replace />;
    }
  }

  return <>{children}</>;
}
