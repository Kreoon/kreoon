/**
 * «Mi portafolio» del creador (decisión 2026-10-01: editor simple).
 *
 * El portafolio público tiene un diseño fijo (Estudio UGC), así que aquí solo se edita lo que se ve:
 *   1. Tu presentación: foto, nombre, frase, sobre ti, ciudad y dirección del enlace.
 *   2. Tus trabajos: videos y fotos.
 * Publicar es un acto explícito (publish_profile_blocks activa is_active / is_published); nada se publica solo.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, Globe, Loader2, CheckCircle2, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { PublicProfileTab } from '@/pages/settings/sections/ProfileSection';
import { PortfolioTab } from '@/components/settings/PortfolioTab';
import { PROFILE_COMPLETION_QUERY_KEY } from '@/hooks/useProfileCompletion';

export default function MyPortfolioPage() {
  const { profile, loading, refresh } = useCreatorProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [publishedNow, setPublishedNow] = useState<boolean | null>(null);

  // is_active es lo que hace visible el perfil (publish_profile_blocks lo activa junto con is_published)
  const isPublished = publishedNow ?? Boolean(profile?.is_active);
  const publicUrl = profile?.slug ? `/p/${profile.slug}` : profile?.id ? `/marketplace/creator/${profile.id}` : null;

  const publish = async () => {
    if (!profile?.id) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc('publish_profile_blocks', { profile_id: profile.id });
      if (error) throw error;
      setPublishedNow(true);
      toast({ title: '¡Tu portafolio ya está publicado!', description: 'Las marcas ya pueden verlo. Compártelo donde quieras.' });
      queryClient.invalidateQueries({ queryKey: [PROFILE_COMPLETION_QUERY_KEY] });
      await refresh();
    } catch (err) {
      toast({
        title: 'No pudimos publicar tu portafolio',
        description: err instanceof Error ? err.message : 'Inténtalo otra vez. Tus cambios están guardados.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const hide = async () => {
    if (!profile?.id) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from('creator_profiles')
        .update({ is_active: false, is_published: false })
        .eq('id', profile.id);
      if (error) throw error;
      setPublishedNow(false);
      toast({ title: 'Tu portafolio quedó oculto', description: 'Puedes volver a publicarlo cuando quieras.' });
      await refresh();
    } catch (err) {
      toast({ title: 'No pudimos ocultarlo', description: err instanceof Error ? err.message : 'Inténtalo otra vez.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-10">
      {/* Barra superior: estado + ver + publicar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Mi portafolio</h1>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {isPublished ? (
              <><CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" /> Publicado: las marcas pueden verlo</>
            ) : (
              <><EyeOff className="h-4 w-4" aria-hidden="true" /> Sin publicar: solo tú lo ves</>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {publicUrl && (
            <Button asChild variant="outline" className="h-11 rounded-full px-4">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4" aria-hidden="true" /> Ver cómo se ve
              </a>
            </Button>
          )}
          {isPublished ? (
            <Button variant="ghost" className="h-11 rounded-full px-4 text-muted-foreground" onClick={hide} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />} Ocultar
            </Button>
          ) : (
            <Button className="h-11 rounded-full px-5" onClick={publish} disabled={busy || !profile?.id}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" aria-hidden="true" />} Publicar mi portafolio
            </Button>
          )}
        </div>
      </div>

      <section aria-labelledby="mp-presentacion" className="space-y-3">
        <div>
          <h2 id="mp-presentacion" className="text-lg font-semibold">1. Tu presentación</h2>
          <p className="text-sm text-muted-foreground">Así te presentas a las marcas: foto, frase y unas líneas sobre ti.</p>
        </div>
        <PublicProfileTab simple />
      </section>

      <section aria-labelledby="mp-trabajos" className="space-y-3">
        <div>
          <h2 id="mp-trabajos" className="text-lg font-semibold">2. Tus trabajos</h2>
          <p className="text-sm text-muted-foreground">Sube tus mejores videos y fotos. Es lo primero que miran las marcas.</p>
        </div>
        <PortfolioTab />
      </section>
    </div>
  );
}
