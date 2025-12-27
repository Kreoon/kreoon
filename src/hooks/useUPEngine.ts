import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useToast } from '@/hooks/use-toast';

export interface UPEvent {
  id: string;
  organization_id: string;
  user_id: string;
  content_id: string | null;
  event_type_key: string;
  event_data: Record<string, any>;
  points_awarded: number;
  rule_id: string | null;
  ai_inferred: boolean;
  ai_confidence: number | null;
  created_at: string;
}

export interface UPRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  event_type_key: string;
  conditions: any[];
  points: number;
  is_bonus: boolean;
  is_penalty: boolean;
  applies_to_roles: string[];
  max_per_day: number | null;
  max_per_week: number | null;
  max_per_content: number | null;
  is_active: boolean;
  priority: number;
}

export interface UPQuest {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  goal_metric: string;
  goal_value: number;
  reward_points: number;
  applies_to_roles: string[];
  starts_at: string;
  ends_at: string | null;
  is_ai_generated: boolean;
  is_active: boolean;
}

export interface UPQuestProgress {
  id: string;
  quest_id: string;
  user_id: string;
  current_value: number;
  completed_at: string | null;
  reward_claimed: boolean;
}

export interface UPQualityScore {
  id: string;
  content_id: string;
  score: number;
  breakdown: {
    hook: number;
    structure: number;
    cta: number;
    coherence: number;
    viralPotential: number;
  };
  reasons: string[];
  suggestions: string[];
  evaluated_at: string;
}

export interface UPSeason {
  id: string;
  organization_id: string;
  name: string;
  mode: 'permanent' | 'monthly' | 'quarterly' | 'custom';
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
}

export interface UPAIConfig {
  id: string;
  organization_id: string;
  quality_score_enabled: boolean;
  event_detection_enabled: boolean;
  anti_fraud_enabled: boolean;
  quest_generation_enabled: boolean;
  rule_recommendations_enabled: boolean;
  min_quality_for_approval: number;
}

export function useUPEngine(organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const { toast } = useToast();
  
  const [rules, setRules] = useState<UPRule[]>([]);
  const [events, setEvents] = useState<UPEvent[]>([]);
  const [quests, setQuests] = useState<UPQuest[]>([]);
  const [seasons, setSeasons] = useState<UPSeason[]>([]);
  const [aiConfig, setAIConfig] = useState<UPAIConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgId) {
      fetchAll();
      
      // Subscribe to realtime updates
      const eventsChannel = supabase
        .channel('up-events-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'up_events',
            filter: `organization_id=eq.${orgId}`
          },
          (payload) => {
            setEvents(prev => [payload.new as UPEvent, ...prev].slice(0, 100));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(eventsChannel);
      };
    }
  }, [orgId]);

  const fetchAll = async () => {
    if (!orgId) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchRulesInternal(),
        fetchEventsInternal(),
        fetchQuestsInternal(),
        fetchSeasonsInternal(),
        fetchAIConfigInternal()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRulesInternal = async () => {
    if (!orgId) return;
    
    const { data, error } = await supabase
      .from('up_rules')
      .select('*')
      .eq('organization_id', orgId)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching rules:', error);
      return;
    }

    setRules(data as UPRule[]);
  };

  const fetchEventsInternal = async () => {
    if (!orgId) return;
    
    const { data, error } = await supabase
      .from('up_events')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching events:', error);
      return;
    }

    setEvents(data as UPEvent[]);
  };

  const fetchQuestsInternal = async () => {
    if (!orgId) return;
    
    const { data, error } = await supabase
      .from('up_quests')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quests:', error);
      return;
    }

    setQuests(data as UPQuest[]);
  };

  const fetchSeasonsInternal = async () => {
    if (!orgId) return;
    
    const { data, error } = await supabase
      .from('up_seasons')
      .select('*')
      .eq('organization_id', orgId)
      .order('starts_at', { ascending: false });

    if (error) {
      console.error('Error fetching seasons:', error);
      return;
    }

    setSeasons(data as UPSeason[]);
  };

  const fetchAIConfigInternal = async () => {
    if (!orgId) return;
    
    const { data, error } = await supabase
      .from('up_ai_config')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching AI config:', error);
      return;
    }

    setAIConfig(data as UPAIConfig);
  };

  const createRule = async (rule: Partial<UPRule>) => {
    if (!orgId) return null;

    const { data, error } = await supabase
      .from('up_rules')
      .insert({
        name: rule.name || '',
        event_type_key: rule.event_type_key || '',
        points: rule.points || 0,
        organization_id: orgId,
        description: rule.description,
        conditions: rule.conditions,
        is_bonus: rule.is_bonus,
        is_penalty: rule.is_penalty,
        applies_to_roles: rule.applies_to_roles,
        max_per_day: rule.max_per_day,
        max_per_week: rule.max_per_week,
        max_per_content: rule.max_per_content,
        is_active: rule.is_active ?? true,
        priority: rule.priority
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear la regla', variant: 'destructive' });
      return null;
    }

    await fetchRulesInternal();
    toast({ title: 'Regla creada', description: `${data.name} se ha creado correctamente` });
    return data;
  };

  const updateRule = async (id: string, updates: Partial<UPRule>) => {
    const { error } = await supabase
      .from('up_rules')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la regla', variant: 'destructive' });
      return false;
    }

    await fetchRulesInternal();
    toast({ title: 'Regla actualizada' });
    return true;
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase
      .from('up_rules')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar la regla', variant: 'destructive' });
      return false;
    }

    await fetchRulesInternal();
    toast({ title: 'Regla eliminada' });
    return true;
  };

  const createQuest = async (quest: Partial<UPQuest>) => {
    if (!orgId) return null;

    const { data, error } = await supabase
      .from('up_quests')
      .insert({
        title: quest.title || '',
        goal_metric: quest.goal_metric || '',
        goal_value: quest.goal_value || 1,
        reward_points: quest.reward_points || 0,
        organization_id: orgId,
        description: quest.description,
        applies_to_roles: quest.applies_to_roles,
        starts_at: quest.starts_at,
        ends_at: quest.ends_at,
        is_ai_generated: quest.is_ai_generated,
        is_active: quest.is_active ?? true
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear la misión', variant: 'destructive' });
      return null;
    }

    await fetchQuestsInternal();
    toast({ title: 'Misión creada', description: `${data.title} se ha creado correctamente` });
    return data;
  };

  const createSeason = async (season: Partial<UPSeason>) => {
    if (!orgId) return null;

    const { data, error } = await supabase
      .from('up_seasons')
      .insert({
        name: season.name || '',
        mode: season.mode || 'monthly',
        organization_id: orgId,
        starts_at: season.starts_at,
        ends_at: season.ends_at,
        is_active: season.is_active ?? false
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear la temporada', variant: 'destructive' });
      return null;
    }

    await fetchSeasonsInternal();
    toast({ title: 'Temporada creada', description: `${data.name} se ha creado correctamente` });
    return data;
  };

  const updateSeason = async (id: string, updates: Partial<UPSeason>) => {
    const { error } = await supabase
      .from('up_seasons')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la temporada', variant: 'destructive' });
      return false;
    }

    await fetchSeasonsInternal();
    toast({ title: 'Temporada actualizada' });
    return true;
  };

  const updateAIConfig = async (updates: Partial<UPAIConfig>) => {
    if (!orgId) return false;

    const { error } = await supabase
      .from('up_ai_config')
      .upsert({ 
        organization_id: orgId,
        ...aiConfig,
        ...updates 
      });

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la configuración', variant: 'destructive' });
      return false;
    }

    await fetchAIConfigInternal();
    toast({ title: 'Configuración de IA actualizada' });
    return true;
  };

  const evaluateQualityScore = useCallback(async (contentId: string) => {
    if (!orgId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('up-ai-copilot', {
        body: {
          action: 'quality_score',
          contentId,
          organizationId: orgId
        }
      });

      if (error) throw error;
      return data as UPQualityScore;
    } catch (error) {
      console.error('Error evaluating quality:', error);
      toast({ title: 'Error', description: 'No se pudo evaluar la calidad', variant: 'destructive' });
      return null;
    }
  }, [orgId, toast]);

  const detectEvents = useCallback(async (contentId: string, userId: string) => {
    if (!orgId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('up-ai-copilot', {
        body: {
          action: 'detect_events',
          contentId,
          organizationId: orgId,
          userId
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error detecting events:', error);
      return null;
    }
  }, [orgId]);

  const checkAntiFraud = useCallback(async () => {
    if (!orgId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('up-ai-copilot', {
        body: {
          action: 'anti_fraud',
          organizationId: orgId
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking anti-fraud:', error);
      return null;
    }
  }, [orgId]);

  const generateQuests = useCallback(async (role?: string) => {
    if (!orgId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('up-ai-copilot', {
        body: {
          action: 'generate_quests',
          organizationId: orgId,
          role
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating quests:', error);
      toast({ title: 'Error', description: 'No se pudieron generar misiones', variant: 'destructive' });
      return null;
    }
  }, [orgId, toast]);

  const getRuleRecommendations = useCallback(async () => {
    if (!orgId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('up-ai-copilot', {
        body: {
          action: 'rule_recommendations',
          organizationId: orgId
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return null;
    }
  }, [orgId]);

  const getActiveSeason = () => {
    return seasons.find(s => s.is_active);
  };

  return {
    rules,
    events,
    quests,
    seasons,
    aiConfig,
    loading,
    // CRUD
    createRule,
    updateRule,
    deleteRule,
    createQuest,
    createSeason,
    updateSeason,
    updateAIConfig,
    // AI Functions
    evaluateQualityScore,
    detectEvents,
    checkAntiFraud,
    generateQuests,
    getRuleRecommendations,
    // Helpers
    getActiveSeason,
    refetch: fetchAll
  };
}

export function useUserQuests(userId?: string) {
  const { currentOrgId } = useOrgOwner();
  const [quests, setQuests] = useState<(UPQuest & { progress?: UPQuestProgress })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrgId && userId) {
      fetchUserQuests();
    }
  }, [currentOrgId, userId]);

  const fetchUserQuests = async () => {
    if (!currentOrgId || !userId) return;

    setLoading(true);
    try {
      // Fetch active quests
      const { data: questsData, error: questsError } = await supabase
        .from('up_quests')
        .select('*')
        .eq('organization_id', currentOrgId)
        .eq('is_active', true);

      if (questsError) throw questsError;

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('up_quest_progress')
        .select('*')
        .eq('user_id', userId);

      if (progressError) throw progressError;

      const progressMap = new Map(
        (progressData || []).map(p => [p.quest_id, p])
      );

      const questsWithProgress = (questsData || []).map(quest => ({
        ...quest,
        progress: progressMap.get(quest.id)
      }));

      setQuests(questsWithProgress as any);
    } catch (error) {
      console.error('Error fetching user quests:', error);
    } finally {
      setLoading(false);
    }
  };

  return { quests, loading, refetch: fetchUserQuests };
}

export function useContentQualityScore(contentId?: string) {
  const [qualityScore, setQualityScore] = useState<UPQualityScore | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contentId) {
      fetchScore();
    }
  }, [contentId]);

  const fetchScore = async () => {
    if (!contentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('up_quality_scores')
        .select('*')
        .eq('content_id', contentId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setQualityScore({
          ...data,
          breakdown: data.breakdown as UPQualityScore['breakdown']
        });
      }
    } catch (error) {
      console.error('Error fetching quality score:', error);
    } finally {
      setLoading(false);
    }
  };

  return { qualityScore, loading, refetch: fetchScore };
}
