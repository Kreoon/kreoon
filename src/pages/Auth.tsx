import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, rolesLoaded, roles } = useAuth();

  useEffect(() => {
    // If user is logged in, redirect to appropriate dashboard
    if (user && !authLoading && rolesLoaded) {
      if (roles.length === 0) {
        navigate('/pending-access', { replace: true });
      } else if (roles.includes('admin')) {
        navigate('/dashboard', { replace: true });
      } else if (roles.includes('creator')) {
        navigate('/creator-dashboard', { replace: true });
      } else if (roles.includes('editor')) {
        navigate('/editor-dashboard', { replace: true });
      } else if (roles.includes('client')) {
        navigate('/client-dashboard', { replace: true });
      } else if (roles.includes('strategist')) {
        navigate('/strategist-dashboard', { replace: true });
      } else {
        navigate('/pending-access', { replace: true });
      }
    } else if (!authLoading && !user) {
      // If not logged in, redirect to home page where the landing is
      navigate('/', { replace: true });
    }
  }, [user, authLoading, rolesLoaded, roles, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
