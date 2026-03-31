import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, ArrowLeft } from 'lucide-react';
import { PortfolioProfile } from '@/components/portfolio/profile/PortfolioProfile';
import { KreoonSocialLogo } from '@/components/social/KreoonSocialBrand';

export default function PublicProfilePage() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  useEffect(() => {
    if (!userIdParam) return;
    resolveProfile(userIdParam);
  }, [userIdParam]);

  const resolveProfile = async (identifier: string) => {
    setLoading(true);
    setNotFound(false);
    setProfileExists(false);

    try {
      // Allow /profile/:id (uuid) and /profile/:username
      const query = supabase
        .from('profiles')
        .select('id, username')
        .limit(1);

      const { data, error } = isUuid(identifier)
        ? await query.eq('id', identifier).single()
        : await query.eq('username', identifier).single();

      if (error || !data?.id) {
        setNotFound(true);
        return;
      }

      // If viewing own profile (by id or username), redirect to internal profile
      if (user?.id && data.id === user.id) {
        navigate('/settings?section=marketplace', { replace: true });
        return;
      }

      setResolvedUserId(data.id);
      setProfileExists(true);
    } catch (error) {
      console.error('Error checking profile:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            <Skeleton className="w-24 h-24 rounded-full bg-background" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48 bg-background" />
              <Skeleton className="h-4 w-32 bg-background" />
              <Skeleton className="h-4 w-64 bg-background" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profileExists || !resolvedUserId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <User className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Usuario no encontrado</h1>
          <p className="text-muted-foreground">Este perfil no existe.</p>
          <Button 
            onClick={() => navigate('/marketplace')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Back button header */}
      <header className="sticky top-0 z-30 bg-background/95 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="text-foreground hover:bg-background"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <KreoonSocialLogo />
          </div>
        </div>
      </header>

      {/* Profile content - Using the same template */}
      <PortfolioProfile
        userId={resolvedUserId}
        isOwner={false}
      />
    </div>
  );
}
