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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-[120px]" />
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl animate-pulse" />
        <Loader2 className="w-10 h-10 animate-spin text-primary relative z-10" />
      </div>
    </div>
  );
}
