import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProfileBuilder } from '@/components/profile-builder/ProfileBuilder';

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProfileBuilderPage() {
  const { user, loading: authLoading } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchOrCreateProfileId() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('creator_profiles')
          .select('id')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data?.id) {
          setProfileId(data.id);
          return;
        }

        // Si no existe perfil, crear uno básico
        const { data: newProfile, error: createError } = await supabase
          .from('creator_profiles')
          .insert({
            user_id: user!.id,
            display_name: user!.email?.split('@')[0] ?? 'Creador',
            location_country: 'CO',
            country_flag: '🇨🇴',
            categories: [],
            content_types: [],
            languages: ['es'],
            platforms: [],
            social_links: {},
            level: 'bronze',
            is_verified: false,
            is_available: true,
            rating_avg: 0,
            rating_count: 0,
            completed_projects: 0,
            currency: 'COP',
            accepts_product_exchange: false,
            response_time_hours: 24,
            on_time_delivery_pct: 0,
            repeat_clients_pct: 0,
            marketplace_roles: [],
            is_active: true,
            profile_customization: {},
          })
          .select('id')
          .single();

        if (createError) throw createError;
        if (newProfile?.id) setProfileId(newProfile.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar el perfil';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrCreateProfileId();
  }, [user]);

  // ── Estados de carga ────────────────────────────────────────────────────────

  if (authLoading || (user && loading)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-background"
        role="status"
        aria-label="Cargando editor de perfil"
      >
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-destructive font-medium">Error al cargar el perfil</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-primary hover:underline"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <ProfileBuilder profileId={profileId} />;
}
