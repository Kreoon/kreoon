import { useCallback, useMemo, useState, useEffect } from 'react';
import type { MarketplaceCreator } from '@/components/marketplace/types/marketplace';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface ScoredMarketplaceCreator extends MarketplaceCreator {
  recommendation_score: number;
  recommendation_reasons: string[];
}

interface UserSignals {
  categories: string[];
  languages: string[];
  country: string | null;
  marketplace_roles: string[];
  content_types: string[];
}

interface ServerRecommendation {
  creator_user_id: string;
  score: number;
  reasons: string[];
}

// ── Country code → name lookup ─────────────────────────────────────────

const COUNTRY_MAP: Record<string, string> = {
  CO: 'colombia', MX: 'méxico', CL: 'chile', PE: 'perú',
  AR: 'argentina', EC: 'ecuador', US: 'estados unidos',
};

function normalizeCountry(value: string | null): string {
  if (!value) return '';
  const lower = value.toLowerCase();
  return COUNTRY_MAP[value] || lower;
}

// ── Component 1: Profile Similarity (0-40 pts) ────────────────────────

function scoreProfileSimilarity(
  user: UserSignals,
  creator: MarketplaceCreator,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Category overlap: 8 pts each, max 24
  const userCats = user.categories.map(c => c.toLowerCase());
  const creatorCats = creator.categories.map(c => c.toLowerCase());
  const catOverlap = userCats.filter(c => creatorCats.includes(c)).length;
  if (catOverlap > 0) {
    score += Math.min(24, catOverlap * 8);
    reasons.push('Comparte tus categorías');
  }

  // Language match: 5 pts each, max 10
  const userLangs = user.languages.map(l => l.toLowerCase());
  const creatorLangs = creator.languages.map(l => l.toLowerCase());
  const langOverlap = userLangs.filter(l => creatorLangs.includes(l)).length;
  if (langOverlap > 0) {
    score += Math.min(10, langOverlap * 5);
  }

  // Country match: 6 pts
  const userCountry = normalizeCountry(user.country);
  const creatorCountry = normalizeCountry(creator.location_country);
  if (userCountry && creatorCountry && userCountry === creatorCountry) {
    score += 6;
    reasons.push('De tu misma región');
  }

  return { score: Math.min(40, score), reasons };
}

// ── Component 4: Quality Signal (0-30 pts) ─────────────────────────────

function scoreQuality(creator: MarketplaceCreator): number {
  let score = 0;

  // Rating: (rating / 5) * 12, max 12
  score += Math.round((creator.rating_avg / 5) * 12);

  // Completed projects: log scale, max 8
  score += Math.min(8, Math.round(Math.log2(creator.completed_projects + 1) * 2));

  // Level bonus: elite=6, gold=4, silver=2, bronze=0
  const levelBonus: Record<string, number> = { elite: 6, gold: 4, silver: 2, bronze: 0 };
  score += levelBonus[creator.level] || 0;

  // Has portfolio media: 4 pts
  if (creator.portfolio_media.length > 0) score += 4;

  return Math.min(30, score);
}

// ── Component 5: Freshness Boost (0-20 pts) ────────────────────────────

function scoreFreshness(creator: MarketplaceCreator): { score: number; reason: string | null } {
  const daysAgo = (Date.now() - new Date(creator.joined_at).getTime()) / 86400000;

  if (daysAgo < 7) return { score: 20, reason: 'Nuevo en la plataforma' };
  if (daysAgo < 14) return { score: 15, reason: 'Nuevo en la plataforma' };
  if (daysAgo < 30) return { score: 10, reason: 'Nuevo en la plataforma' };

  // Established top creators get a small boost
  if (creator.completed_projects > 10 && creator.rating_avg >= 4.5) {
    return { score: 5, reason: null };
  }

  return { score: 0, reason: null };
}

// ── Component 6: Variability Factor (controlled randomness) ────────────
// Genera un factor aleatorio basado en el ID del creador y el día actual
// Esto hace que el orden cambie cada día pero sea consistente durante el día
// REDUCIDO para que no domine sobre métricas reales

function getVariabilityFactor(creatorId: string): number {
  const today = new Date().toDateString();
  const seed = `${creatorId}-${today}`;

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Return a value between -3 and +3 (reduced variability)
  return (Math.abs(hash) % 7) - 3;
}

// ── Component 6: Diversity Penalty ─────────────────────────────────────

function applyDiversityPenalty(
  creators: ScoredMarketplaceCreator[],
): ScoredMarketplaceCreator[] {
  const result: ScoredMarketplaceCreator[] = [];
  const recentCategories: string[] = [];
  const recentCountries: string[] = [];

  for (const creator of creators) {
    let penalty = 0;
    const primaryCat = creator.categories[0]?.toLowerCase();

    // Penalize if same primary category appeared in last 5 results
    if (primaryCat && recentCategories.slice(-5).includes(primaryCat)) {
      penalty += 10;
    }

    // Penalize if same country appeared in last 3 results
    const country = creator.location_country?.toLowerCase();
    if (country && recentCountries.slice(-3).includes(country)) {
      penalty += 5;
    }

    result.push({
      ...creator,
      recommendation_score: Math.max(0, creator.recommendation_score - penalty),
    });

    if (primaryCat) recentCategories.push(primaryCat);
    if (country) recentCountries.push(country);
  }

  return result.sort((a, b) => b.recommendation_score - a.recommendation_score);
}

// ── Server-side recommendation fetcher ─────────────────────────────────

function useServerRecommendations(userId: string | undefined) {
  const [data, setData] = useState<ServerRecommendation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoaded(true);
      return;
    }

    let cancelled = false;

    const fetchRecommendations = async () => {
      try {
        const { data: fnData, error } = await supabase.functions.invoke(
          'marketplace-recommendations',
          { body: { user_id: userId, limit: 50 } },
        );

        if (cancelled) return;

        if (!error && fnData?.success && fnData.recommendations) {
          setData(fnData.recommendations as ServerRecommendation[]);
        }
      } catch {
        // Silently fail — client-side scoring is the fallback
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    fetchRecommendations();

    // Refresh every 5 minutes
    const interval = setInterval(fetchRecommendations, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId]);

  return { serverScores: data, serverLoaded: loaded };
}

// ── Main Hook ──────────────────────────────────────────────────────────

export function useMarketplaceRecommendations() {
  const { user } = useAuth();
  const { profile: creatorProfile, loading: profileLoading } = useCreatorProfile();
  const { serverScores, serverLoaded } = useServerRecommendations(user?.id);

  // Build a lookup map for server scores: creator_user_id → {score, reasons}
  const serverScoreMap = useMemo(() => {
    const map = new Map<string, { score: number; reasons: string[] }>();
    for (const rec of serverScores) {
      map.set(rec.creator_user_id, { score: rec.score, reasons: rec.reasons });
    }
    return map;
  }, [serverScores]);

  const userSignals: UserSignals | null = useMemo(() => {
    if (!creatorProfile) return null;
    return {
      categories: creatorProfile.categories || [],
      languages: creatorProfile.languages || ['es'],
      country: creatorProfile.location_country || null,
      marketplace_roles: creatorProfile.marketplace_roles || [],
      content_types: creatorProfile.content_types || [],
    };
  }, [creatorProfile]);

  const isPersonalized = !!user && (!!userSignals && userSignals.categories.length > 0 || serverScores.length > 0);

  const scoreCreators = useCallback(
    (creators: MarketplaceCreator[]): ScoredMarketplaceCreator[] => {
      const scored = creators.map(creator => {
        let totalScore = 0;
        const reasons: string[] = [];

        // ── Client-side scoring ──

        // Profile similarity (only if user has a profile with categories)
        if (userSignals) {
          const similarity = scoreProfileSimilarity(userSignals, creator);
          totalScore += similarity.score;
          reasons.push(...similarity.reasons);
        }

        // Quality signal (always) - PESO AUMENTADO para priorizar resultados
        const qualityScore = scoreQuality(creator);
        totalScore += qualityScore * 2; // Multiplicador x2 para que calidad domine

        // Freshness boost
        const freshness = scoreFreshness(creator);
        totalScore += freshness.score;
        if (freshness.reason) reasons.push(freshness.reason);

        // Subscription boost
        if ((creator as any).is_subscribed) {
          totalScore += 8;
          reasons.push('Creador verificado');
        }

        // Portfolio richness bonus (más contenido = más visible)
        if (creator.portfolio_media.length >= 5) {
          totalScore += 10;
        } else if (creator.portfolio_media.length >= 3) {
          totalScore += 5;
        }

        // Rating excellence bonus
        if (creator.rating_avg >= 4.8 && creator.rating_count >= 5) {
          totalScore += 15;
          reasons.push('Excelentes reseñas');
        } else if (creator.rating_avg >= 4.5 && creator.rating_count >= 3) {
          totalScore += 8;
        }

        // Active projects bonus (marketplace + org)
        if (creator.completed_projects >= 20) {
          totalScore += 15;
          reasons.push('Alta experiencia');
        } else if (creator.completed_projects >= 10) {
          totalScore += 10;
          reasons.push('Experiencia comprobada');
        } else if (creator.completed_projects >= 5) {
          totalScore += 5;
        }

        // Bonus específico por proyectos de organización (trabajo en equipo)
        const orgProjects = (creator as any).org_projects || 0;
        if (orgProjects >= 15) {
          totalScore += 12;
          reasons.push('Experto en equipos');
        } else if (orgProjects >= 8) {
          totalScore += 8;
          reasons.push('Trabajo en equipo');
        } else if (orgProjects >= 3) {
          totalScore += 4;
        }

        // Bonus por verificación de identidad
        if (creator.is_verified) {
          totalScore += 10;
          reasons.push('Identidad verificada');
        }

        // Bonus por cantidad de reseñas (social proof)
        if (creator.rating_count >= 10) {
          totalScore += 8;
        } else if (creator.rating_count >= 5) {
          totalScore += 5;
        } else if (creator.rating_count >= 2) {
          totalScore += 2;
        }

        // Bonus por entrega a tiempo (confiabilidad)
        const onTimePct = (creator as any).on_time_delivery_pct;
        if (onTimePct === 100) {
          totalScore += 10;
          reasons.push('Siempre puntual');
        } else if (onTimePct >= 90) {
          totalScore += 6;
        } else if (onTimePct >= 80) {
          totalScore += 3;
        }

        // Bonus por tiempo de respuesta rápido
        const responseHours = (creator as any).response_time_hours;
        if (responseHours !== undefined && responseHours < 6) {
          totalScore += 5;
          reasons.push('Respuesta rápida');
        } else if (responseHours !== undefined && responseHours < 12) {
          totalScore += 3;
        }

        // ── Server-side scoring (behavioral + AI + collaborative) ──
        const server = serverScoreMap.get(creator.user_id);
        if (server) {
          totalScore += server.score;
          reasons.push(...server.reasons);
        }

        // ── Variability factor (cambia cada día) ──
        totalScore += getVariabilityFactor(creator.id);

        return {
          ...creator,
          recommendation_score: totalScore,
          recommendation_reasons: [...new Set(reasons)],
        } as ScoredMarketplaceCreator;
      });

      // Sort by score descending
      scored.sort((a, b) => b.recommendation_score - a.recommendation_score);

      // Apply diversity penalty
      return applyDiversityPenalty(scored);
    },
    [userSignals, serverScoreMap],
  );

  return {
    scoreCreators,
    isPersonalized,
    isLoading: profileLoading && !serverLoaded,
  };
}
