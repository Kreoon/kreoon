/**
 * useUnifiedReputation — Main hook for the Unified Reputation Engine
 *
 * Provides: logEvent, getLeaderboard, user scores, marketplace reputation,
 * role archetypes, org config, seasons, events.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import type {
  RoleArchetype,
  UnifiedReputationConfig,
  UserReputationTotals,
  MarketplaceReputation,
  ReputationSeason,
  RankingEntry,
  CalculationResult,
} from '@/lib/reputation';
import { getCalculatorForRole, calculateDeliveryPoints } from '@/lib/reputation';

// ─── useOrgRepConfig: fetch org reputation config ────────────

export function useOrgRepConfig(organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [config, setConfig] = useState<UnifiedReputationConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('unified_reputation_config')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      setConfig(data as UnifiedReputationConfig | null);
      setLoading(false);
    })();
  }, [orgId]);

  const updateConfig = useCallback(async (updates: Partial<UnifiedReputationConfig>) => {
    if (!orgId) return false;
    const { error } = await supabase
      .from('unified_reputation_config')
      .upsert({ organization_id: orgId, ...config, ...updates } as any);
    if (error) { console.error('Error updating rep config:', error); return false; }
    setConfig(prev => prev ? { ...prev, ...updates } : null);
    return true;
  }, [orgId, config]);

  return { config, loading, updateConfig };
}

// ─── useRoleArchetypes: fetch merged role weights ────────────

export function useRoleArchetypes(organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [archetypes, setArchetypes] = useState<RoleArchetype[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      // Fetch global defaults + org overrides
      const { data } = await supabase
        .from('role_archetypes')
        .select('*')
        .or(`organization_id.is.null,organization_id.eq.${orgId}`)
        .eq('is_active', true)
        .order('role_key');

      if (data) {
        // Merge: org override wins over global
        const map = new Map<string, RoleArchetype>();
        for (const row of data as RoleArchetype[]) {
          const existing = map.get(row.role_key);
          if (!existing || (row.organization_id && !existing.organization_id)) {
            map.set(row.role_key, row);
          }
        }
        setArchetypes(Array.from(map.values()));
      }
      setLoading(false);
    })();
  }, [orgId]);

  const updateArchetype = useCallback(async (id: string, updates: Partial<RoleArchetype>) => {
    const { error } = await supabase
      .from('role_archetypes')
      .update(updates)
      .eq('id', id);
    if (error) { console.error('Error updating archetype:', error); return false; }
    setArchetypes(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    return true;
  }, []);

  return { archetypes, loading, updateArchetype };
}

// ─── useOrgRanking: leaderboard ──────────────────────────────

export function useOrgRanking(organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRanking = useCallback(async (options?: {
    role?: string;
    archetype?: string;
    sortBy?: 'lifetime' | 'season' | 'normalized';
    limit?: number;
  }) => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_org_ranking', {
      p_org_id: orgId,
      p_role: options?.role ?? null,
      p_archetype: options?.archetype ?? null,
      p_sort_by: options?.sortBy ?? 'lifetime',
      p_limit: options?.limit ?? 50,
    });
    if (error) { console.error('Error fetching ranking:', error); }
    setRanking((data as RankingEntry[]) || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  return { ranking, loading, refetch: fetchRanking };
}

// ─── useUserReputation: scores for a user in an org ──────────

export function useUserReputation(userId?: string, organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [scores, setScores] = useState<UserReputationTotals[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !orgId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_reputation', {
        p_user_id: userId,
        p_org_id: orgId,
      });
      if (error) console.error('Error fetching user reputation:', error);
      setScores((data as UserReputationTotals[]) || []);
      setLoading(false);
    })();
  }, [userId, orgId]);

  // Computed: primary score (highest points role)
  const primaryScore = scores.length > 0
    ? scores.reduce((a, b) => a.lifetime_points > b.lifetime_points ? a : b)
    : null;

  return { scores, primaryScore, loading };
}

// ─── usePublicReputation: marketplace profile ────────────────

export function usePublicReputation(userId?: string) {
  const [reputation, setReputation] = useState<MarketplaceReputation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_public_reputation', {
        p_user_id: userId,
      });
      if (error) console.error('Error fetching public reputation:', error);
      setReputation(data?.[0] as MarketplaceReputation || null);
      setLoading(false);
    })();
  }, [userId]);

  return { reputation, loading };
}

// ─── useUserEvents: event history ────────────────────────────

export function useUserEvents(userId?: string, organizationId?: string, role?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_events', {
        p_user_id: userId,
        p_org_id: orgId ?? null,
        p_role: role ?? null,
        p_limit: 100,
      });
      if (error) console.error('Error fetching user events:', error);
      setEvents(data || []);
      setLoading(false);
    })();
  }, [userId, orgId, role]);

  return { events, loading };
}

// ─── useReputationSeasons ────────────────────────────────────

export function useReputationSeasons(organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [seasons, setSeasons] = useState<ReputationSeason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('reputation_seasons')
        .select('*')
        .eq('organization_id', orgId)
        .order('start_date', { ascending: false });
      setSeasons((data as ReputationSeason[]) || []);
      setLoading(false);
    })();
  }, [orgId]);

  const activeSeason = seasons.find(s => s.is_active) ?? null;

  const createSeason = useCallback(async (season: Partial<ReputationSeason>) => {
    if (!orgId) return null;
    const { data, error } = await supabase
      .from('reputation_seasons')
      .insert({
        organization_id: orgId,
        name: season.name || '',
        start_date: season.start_date,
        end_date: season.end_date,
        is_active: season.is_active ?? false,
      } as any)
      .select()
      .single();
    if (error) { console.error('Error creating season:', error); return null; }
    setSeasons(prev => [data as ReputationSeason, ...prev]);
    return data;
  }, [orgId]);

  return { seasons, activeSeason, loading, createSeason };
}

// ─── logReputationEvent: RPC SECURITY DEFINER (anti-fraude) ──
//
// Migrado de insert directo en 'reputation_events' a RPC
// award_reputation_event. El servidor valida:
//   - p_user_id == auth.uid() (no se pueden falsificar eventos de otro)
//   - membresía en la org
//   - base_points en [-500, 500]
//   - multiplier en [0.1, 5.0]
//   - dedup graceful (unique_violation → duplicate: true)
//   - side-effect sync_marketplace_reputation dentro de la RPC

export async function logReputationEvent(params: {
  organizationId: string;
  userId: string;
  roleKey: string;
  referenceType: string;
  referenceId: string;
  eventType: string;
  eventSubtype?: string;
  basePoints: number;
  multiplier?: number;
  breakdown?: Record<string, any>;
  seasonId?: string;
}) {
  const { data, error } = await (supabase as any).rpc('award_reputation_event', {
    p_organization_id: params.organizationId,
    p_user_id:         params.userId,
    p_role_key:        params.roleKey,
    p_reference_type:  params.referenceType,
    p_reference_id:    params.referenceId,
    p_event_type:      params.eventType,
    p_event_subtype:   params.eventSubtype ?? null,
    p_base_points:     params.basePoints,
    p_multiplier:      params.multiplier ?? 1.0,
    p_breakdown:       params.breakdown ?? null,
    p_season_id:       params.seasonId ?? null,
  });

  if (error) {
    console.error('[Reputation] Error logging event via RPC:', error);
    return { data: null, error, duplicate: false };
  }

  // La RPC devuelve un objeto JSONB con { data, error, duplicate }
  const result = data as { data: { id: string } | null; error: null; duplicate: boolean };

  if (result?.duplicate) {
    console.log('[Reputation] Event already exists, skipping duplicate');
    return { data: null, error: null, duplicate: true };
  }

  // sync_marketplace_reputation ya se invoca dentro de la RPC.
  // No es necesario el fire-and-forget adicional del cliente.

  return { data: result?.data ?? null, error: null, duplicate: false };
}
