import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useToast } from '@/hooks/use-toast';

export interface UPSeason {
  id: string;
  organization_id: string;
  name: string;
  mode: 'permanent' | 'monthly' | 'quarterly' | 'custom';
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface SeasonSnapshot {
  id: string;
  season_id: string;
  user_id: string;
  user_type: 'creator' | 'editor';
  final_points: number;
  final_level: string;
  final_rank: number;
  total_events: number;
  achievements_unlocked: number;
  organization_id: string;
  created_at: string;
  // Joined data
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
  season?: UPSeason;
}

export function useUPSeasons() {
  const { currentOrgId } = useOrgOwner();
  const { toast } = useToast();
  const [seasons, setSeasons] = useState<UPSeason[]>([]);
  const [activeSeason, setActiveSeason] = useState<UPSeason | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSeasons = useCallback(async () => {
    if (!currentOrgId) return;

    try {
      const { data, error } = await supabase
        .from('up_seasons')
        .select('*')
        .eq('organization_id', currentOrgId)
        .order('starts_at', { ascending: false });

      if (error) throw error;

      const seasonsData = (data || []) as UPSeason[];
      setSeasons(seasonsData);
      setActiveSeason(seasonsData.find(s => s.is_active) || null);
    } catch (error) {
      console.error('Error fetching seasons:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  /**
   * Create a new season and optionally close the current one
   */
  const createSeason = async (data: {
    name: string;
    mode: 'monthly' | 'quarterly' | 'yearly' | 'custom' | 'permanent';
    starts_at: string;
    ends_at: string;
    reset_points?: boolean;
    reset_ranking?: boolean;
    closeCurrentSeason?: boolean;
  }) => {
    if (!currentOrgId) return null;

    try {
      // If requested, create snapshot and close current active season
      if (data.closeCurrentSeason && activeSeason) {
        await createSeasonSnapshot(activeSeason.id);
        await supabase
          .from('up_seasons')
          .update({ is_active: false })
          .eq('id', activeSeason.id);
      }

      // Create new season
      const insertData = {
        organization_id: currentOrgId,
        name: data.name,
        mode: data.mode as 'monthly' | 'quarterly' | 'custom' | 'permanent',
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        reset_points: data.reset_points ?? true,
        reset_ranking: data.reset_ranking ?? true,
        reset_streaks: false,
        is_active: true
      };

      const { data: newSeason, error } = await supabase
        .from('up_seasons')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Temporada creada',
        description: `La temporada "${data.name}" ha sido creada exitosamente`
      });

      await fetchSeasons();
      return newSeason;
    } catch (error) {
      console.error('Error creating season:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la temporada',
        variant: 'destructive'
      });
      return null;
    }
  };

  /**
   * Close a season (deactivate it and create snapshot)
   */
  const closeSeason = async (seasonId: string) => {
    try {
      // Create snapshot first
      await createSeasonSnapshot(seasonId);

      // Deactivate season
      const { error } = await supabase
        .from('up_seasons')
        .update({ is_active: false })
        .eq('id', seasonId);

      if (error) throw error;

      toast({
        title: 'Temporada cerrada',
        description: 'La temporada ha sido cerrada y los rankings guardados'
      });

      await fetchSeasons();
      return true;
    } catch (error) {
      console.error('Error closing season:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cerrar la temporada',
        variant: 'destructive'
      });
      return false;
    }
  };

  /**
   * Create a snapshot of the current season's rankings
   */
  const createSeasonSnapshot = async (seasonId: string) => {
    if (!currentOrgId) return false;

    try {
      // Get creator totals
      const { data: creatorTotals } = await supabase
        .from('up_creadores_totals')
        .select('user_id, total_points, current_level')
        .eq('organization_id', currentOrgId)
        .order('total_points', { ascending: false });

      // Get editor totals
      const { data: editorTotals } = await supabase
        .from('up_editores_totals')
        .select('user_id, total_points, current_level')
        .eq('organization_id', currentOrgId)
        .order('total_points', { ascending: false });

      // Create snapshots for creators
      if (creatorTotals && creatorTotals.length > 0) {
        const creatorSnapshots = creatorTotals.map((c, index) => ({
          season_id: seasonId,
          user_id: c.user_id,
          user_type: 'creator' as const,
          final_points: c.total_points || 0,
          final_level: c.current_level || 'bronze',
          final_rank: index + 1,
          total_events: 0,
          achievements_unlocked: 0,
          organization_id: currentOrgId
        }));

        await supabase.from('up_season_snapshots').insert(creatorSnapshots);
      }

      // Create snapshots for editors
      if (editorTotals && editorTotals.length > 0) {
        const editorSnapshots = editorTotals.map((e, index) => ({
          season_id: seasonId,
          user_id: e.user_id,
          user_type: 'editor' as const,
          final_points: e.total_points || 0,
          final_level: e.current_level || 'bronze',
          final_rank: index + 1,
          total_events: 0,
          achievements_unlocked: 0,
          organization_id: currentOrgId
        }));

        await supabase.from('up_season_snapshots').insert(editorSnapshots);
      }

      toast({ title: 'Snapshot creado', description: 'Los rankings de la temporada han sido guardados.' });
      return true;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      toast({ title: 'Error', description: 'No se pudo crear el snapshot.', variant: 'destructive' });
      return false;
    }
  };

  /**
   * Get snapshots for a specific season
   */
  const getSeasonSnapshots = async (seasonId: string, userType?: 'creator' | 'editor'): Promise<SeasonSnapshot[]> => {
    try {
      let query = supabase
        .from('up_season_snapshots')
        .select('*')
        .eq('season_id', seasonId)
        .order('final_rank', { ascending: true });

      if (userType) {
        query = query.eq('user_type', userType);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles for the users
      const userIds = (data || []).map(d => d.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

        return (data || []).map(d => ({
          ...d as SeasonSnapshot,
          profile: profilesMap.get(d.user_id)
        }));
      }

      return (data || []) as SeasonSnapshot[];
    } catch (error) {
      console.error('Error fetching season snapshots:', error);
      return [];
    }
  };

  /**
   * Get all finished seasons with their final results
   */
  const getFinishedSeasonsWithResults = async (): Promise<{
    season: UPSeason;
    creatorWinner?: SeasonSnapshot;
    editorWinner?: SeasonSnapshot;
    totalParticipants: number;
  }[]> => {
    if (!currentOrgId) return [];

    try {
      // Get finished seasons (not active)
      const finishedSeasons = seasons.filter(s => !s.is_active);
      const results: {
        season: UPSeason;
        creatorWinner?: SeasonSnapshot;
        editorWinner?: SeasonSnapshot;
        totalParticipants: number;
      }[] = [];

      for (const season of finishedSeasons) {
        const snapshots = await getSeasonSnapshots(season.id);
        
        const creatorWinner = snapshots.find(s => s.user_type === 'creator' && s.final_rank === 1);
        const editorWinner = snapshots.find(s => s.user_type === 'editor' && s.final_rank === 1);
        
        results.push({
          season,
          creatorWinner,
          editorWinner,
          totalParticipants: snapshots.length
        });
      }

      return results;
    } catch (error) {
      console.error('Error fetching finished seasons results:', error);
      return [];
    }
  };

  /**
   * Close all expired seasons automatically
   */
  const closeExpiredSeasons = async () => {
    try {
      const { data, error } = await supabase.rpc('close_expired_seasons');

      if (error) throw error;

      if (data?.seasons_closed > 0) {
        toast({
          title: 'Temporadas cerradas',
          description: data.message
        });
        await fetchSeasons();
      }

      return data;
    } catch (error) {
      console.error('Error closing expired seasons:', error);
      return null;
    }
  };

  // Auto-check for expired seasons on mount
  useEffect(() => {
    if (activeSeason?.ends_at) {
      const endsAt = new Date(activeSeason.ends_at);
      const now = new Date();
      if (endsAt < now) {
        closeExpiredSeasons();
      }
    }
  }, [activeSeason]);

  return {
    seasons,
    activeSeason,
    loading,
    refetch: fetchSeasons,
    createSeason,
    closeSeason,
    closeExpiredSeasons,
    createSeasonSnapshot,
    getSeasonSnapshots,
    getFinishedSeasonsWithResults
  };
}
