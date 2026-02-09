import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function MarketplaceDashboard() {
  const { activeRole, isCreator, isEditor, isAdmin } = useAuth();

  if (isCreator || activeRole === 'creator') {
    return <Navigate to="/creator-dashboard" replace />;
  }

  if (isEditor || activeRole === 'editor') {
    return <Navigate to="/editor-dashboard" replace />;
  }

  if (isAdmin || activeRole === 'admin' || activeRole === 'team_leader') {
    return <Navigate to="/dashboard" replace />;
  }

  // Default: client or other roles
  return <Navigate to="/dashboard" replace />;
}
