/**
 * Qué le falta al creador para tener el perfil completo.
 *
 * Una sola fuente para la tarjeta de Configuración y el aviso global (ProfileCompletionBanner).
 * Cada pendiente trae un recordatorio cálido y la pestaña de Configuración donde se completa
 * (/settings?section=profile&tab=<tab>). El aviso se muestra hasta que todo esté lleno.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type CompletionTab = 'personal' | 'public' | 'social' | 'specializations' | 'portfolio' | 'services';

export interface CompletionItem {
  key: string;
  label: string;
  done: boolean;
  /** Recordatorio corto y amable para el aviso */
  tip: string;
  tab: CompletionTab;
}

/** Mínimos para considerar cada parte «bien llena», no solo «con algo» */
export const MIN_TAGLINE = 20;
export const MIN_ABOUT = 120;
export const MIN_WORKS = 3;

// Ojo: 'profile-completion' ya lo usa useOnboardingGate con otra forma de datos
export const PROFILE_COMPLETION_QUERY_KEY = 'creator-profile-checklist';

export function profileCompletionHref(tab: CompletionTab) {
  return `/settings?section=profile&tab=${tab}`;
}

interface CompletionData {
  fullName: string;
  avatar: string;
  city: string;
  tagline: string;
  about: string;
  categories: number;
  socials: number;
  works: number;
  services: number;
}

async function fetchCompletion(userId: string): Promise<CompletionData> {
  const db = supabase as any;
  const [{ data: p }, { data: cp }] = await Promise.all([
    db.from('profiles')
      .select('full_name, avatar_url, city, instagram, tiktok, facebook, social_youtube, social_linkedin, social_twitter')
      .eq('id', userId)
      .maybeSingle(),
    db.from('creator_profiles')
      .select('id, bio, bio_full, avatar_url, location_city, categories, social_links')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const [items, posts, services] = await Promise.all([
    cp?.id
      ? db.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('creator_id', cp.id)
      : Promise.resolve({ count: 0 }),
    db.from('portfolio_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('creator_services').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
  ]);

  const socialFromProfile = [p?.instagram, p?.tiktok, p?.facebook, p?.social_youtube, p?.social_linkedin, p?.social_twitter]
    .filter((v) => typeof v === 'string' && v.trim()).length;
  const socialFromCreator = Object.values((cp?.social_links as Record<string, string>) || {})
    .filter((v) => typeof v === 'string' && v.trim()).length;

  return {
    fullName: (p?.full_name || '').trim(),
    avatar: p?.avatar_url || cp?.avatar_url || '',
    city: (p?.city || cp?.location_city || '').trim(),
    tagline: (cp?.bio || '').trim(),
    about: (cp?.bio_full || '').trim(),
    categories: Array.isArray(cp?.categories) ? cp.categories.length : 0,
    socials: Math.max(socialFromProfile, socialFromCreator),
    works: (items.count || 0) + (posts.count || 0),
    services: services.count || 0,
  };
}

function buildItems(d: CompletionData): CompletionItem[] {
  return [
    { key: 'name', label: 'Tu nombre', done: !!d.fullName, tab: 'personal',
      tip: 'Agrega tu nombre para que las marcas sepan con quién hablan.' },
    { key: 'avatar', label: 'Foto de perfil', done: !!d.avatar, tab: 'public',
      tip: 'Sube una foto donde se te vea la cara: genera confianza al instante.' },
    { key: 'city', label: 'Tu ciudad', done: !!d.city, tab: 'personal',
      tip: 'Cuéntanos tu ciudad: muchas marcas buscan creadores cerca.' },
    { key: 'tagline', label: 'Tu frase para las marcas', done: d.tagline.length >= MIN_TAGLINE, tab: 'public',
      tip: d.tagline
        ? 'Tu frase está muy corta. Una línea clara sobre qué haces te hace destacar.'
        : 'Escribe una frase corta que diga qué creas y para quién.' },
    { key: 'about', label: 'Sobre ti', done: d.about.length >= MIN_ABOUT, tab: 'public',
      tip: d.about
        ? 'Cuéntales un poco más sobre ti: dos o tres frases bastan.'
        : 'Escribe dos o tres frases sobre ti y tu estilo de contenido.' },
    { key: 'categories', label: 'Tus categorías', done: d.categories > 0, tab: 'specializations',
      tip: 'Elige tus categorías para aparecer cuando una marca te busque.' },
    { key: 'socials', label: 'Tus redes', done: d.socials > 0, tab: 'social',
      tip: 'Conecta al menos una red social: las marcas quieren ver tu contenido.' },
    { key: 'works', label: `${MIN_WORKS} trabajos en tu portafolio`, done: d.works >= MIN_WORKS, tab: 'portfolio',
      tip: d.works > 0
        ? `Llevas ${d.works} de ${MIN_WORKS} trabajos. Sube ${MIN_WORKS - d.works} más para mostrar tu estilo.`
        : 'Sube tus mejores videos: es lo primero que miran las marcas.' },
    { key: 'services', label: 'Al menos 1 servicio', done: d.services > 0, tab: 'services',
      tip: 'Crea un servicio con su precio para que te puedan contratar directo.' },
  ];
}

export function useProfileCompletion(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const enabled = (options.enabled ?? true) && !!user?.id;

  const query = useQuery({
    queryKey: [PROFILE_COMPLETION_QUERY_KEY, user?.id],
    queryFn: () => fetchCompletion(user!.id),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Defensa: si la caché trae otra forma de datos, no romper la página
  const items = query.data && typeof query.data.tagline === 'string' ? buildItems(query.data) : [];
  const doneCount = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const missing = items.filter((i) => !i.done);

  return {
    items,
    missing,
    pct,
    isComplete: items.length > 0 && missing.length === 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
