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
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  
  const isOwner = user?.id === userId;

  useEffect(() => {
    if (userId) {
      // If viewing own profile, redirect to profile page
      if (user?.id === userId) {
        navigate('/social#profile', { replace: true });
        return;
      }
      checkProfile();
    }
  }, [userId, user?.id]);

  const checkProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (error || !data) {
        setNotFound(true);
        return;
      }

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
      <div className="min-h-screen bg-social-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            <Skeleton className="w-24 h-24 rounded-full bg-social-muted" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48 bg-social-muted" />
              <Skeleton className="h-4 w-32 bg-social-muted" />
              <Skeleton className="h-4 w-64 bg-social-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profileExists || !userId) {
    return (
      <div className="min-h-screen bg-social-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <User className="h-16 w-16 mx-auto text-social-muted-foreground" />
          <h1 className="text-xl font-semibold text-social-foreground">Usuario no encontrado</h1>
          <p className="text-social-muted-foreground">Este perfil no existe.</p>
          <Button 
            onClick={() => navigate('/social')}
            className="bg-social-accent hover:bg-social-accent/90 text-social-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-social-background pb-20">
      {/* Back button header */}
      <header className="sticky top-0 z-30 bg-social-background/95 backdrop-blur-lg border-b border-social-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="text-social-foreground hover:bg-social-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <KreoonSocialLogo />
          </div>
        </div>
      </header>

      {/* Profile content - Using the same template */}
      <PortfolioProfile
        userId={userId}
        isOwner={false}
      />
    </div>
  );
}
