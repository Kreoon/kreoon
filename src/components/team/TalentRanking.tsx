import { useState, useEffect } from "react";
import { Trophy, Medal, Star, TrendingUp, Crown, Zap, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RankedTalent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: 'creator' | 'editor';
  quality_score_avg: number;
  reliability_score: number;
  velocity_score: number;
  total_score: number;
  content_count: number;
  ai_recommended_level: 'junior' | 'pro' | 'elite';
}

const LEVEL_ICONS = {
  junior: Shield,
  pro: Zap,
  elite: Crown
};

export function TalentRanking() {
  const { currentOrgId } = useOrgOwner();
  const [talents, setTalents] = useState<RankedTalent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'creator' | 'editor'>('all');

  useEffect(() => {
    if (currentOrgId) {
      fetchRanking();
    }
  }, [currentOrgId]);

  const fetchRanking = async () => {
    if (!currentOrgId) return;
    setLoading(true);

    try {
      // Get all creators and editors in org
      const { data: memberRoles } = await supabase
        .from('organization_member_roles')
        .select('user_id, role')
        .eq('organization_id', currentOrgId)
        .in('role', ['creator', 'editor']);

      if (!memberRoles?.length) {
        setTalents([]);
        return;
      }

      const userIds = [...new Set(memberRoles.map(r => r.user_id))];
      const roleMap = new Map(memberRoles.map(r => [r.user_id, r.role]));

      // Get profiles with performance data
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          id, full_name, avatar_url,
          quality_score_avg, reliability_score, velocity_score,
          ai_recommended_level
        `)
        .in('id', userIds);

      // Get content counts
      const { data: creatorCounts } = await supabase
        .from('content')
        .select('creator_id')
        .eq('organization_id', currentOrgId)
        .eq('status', 'approved')
        .in('creator_id', userIds);

      const { data: editorCounts } = await supabase
        .from('content')
        .select('editor_id')
        .eq('organization_id', currentOrgId)
        .eq('status', 'approved')
        .in('editor_id', userIds);

      const countMap = new Map<string, number>();
      creatorCounts?.forEach(c => {
        if (c.creator_id) countMap.set(c.creator_id, (countMap.get(c.creator_id) || 0) + 1);
      });
      editorCounts?.forEach(c => {
        if (c.editor_id) countMap.set(c.editor_id, (countMap.get(c.editor_id) || 0) + 1);
      });

      const ranked: RankedTalent[] = (profiles || []).map(p => {
        const quality = p.quality_score_avg || 0;
        const reliability = p.reliability_score || 0;
        const velocity = p.velocity_score || 0;
        const totalScore = (quality + reliability + velocity) / 3;

        return {
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          role: roleMap.get(p.id) as 'creator' | 'editor',
          quality_score_avg: quality,
          reliability_score: reliability,
          velocity_score: velocity,
          total_score: totalScore,
          content_count: countMap.get(p.id) || 0,
          ai_recommended_level: (p.ai_recommended_level as 'junior' | 'pro' | 'elite') || 'junior'
        };
      });

      // Sort by total score descending
      ranked.sort((a, b) => b.total_score - a.total_score);
      setTalents(ranked);
    } catch (error) {
      console.error('Error fetching ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTalents = filter === 'all' 
    ? talents 
    : talents.filter(t => t.role === filter);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return "text-amber-500";
      case 1: return "text-slate-400";
      case 2: return "text-orange-600";
      default: return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'creator', 'editor'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filter === f 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f === 'all' ? 'Todos' : f === 'creator' ? 'Creadores' : 'Editores'}
          </button>
        ))}
      </div>

      {/* Ranking list */}
      <div className="space-y-2">
        {filteredTalents.map((talent, index) => {
          const LevelIcon = LEVEL_ICONS[talent.ai_recommended_level];
          
          return (
            <div 
              key={talent.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border bg-card transition-all hover:shadow-md",
                index < 3 && "border-amber-500/30 bg-gradient-to-r from-card to-amber-500/5"
              )}
            >
              {/* Position */}
              <div className="flex-shrink-0 w-8 text-center">
                {index < 3 ? (
                  <Medal className={cn("h-6 w-6 mx-auto", getMedalColor(index))} />
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                )}
              </div>

              {/* Avatar */}
              {talent.avatar_url ? (
                <img 
                  src={talent.avatar_url} 
                  alt={talent.full_name}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                  <span className="text-sm font-semibold text-primary">
                    {talent.full_name.charAt(0)}
                  </span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{talent.full_name}</span>
                  <LevelIcon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    talent.ai_recommended_level === 'elite' ? "text-amber-500" :
                    talent.ai_recommended_level === 'pro' ? "text-blue-500" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {talent.role === 'creator' ? 'Creador' : 'Editor'}
                  </Badge>
                  <span>{talent.content_count} videos</span>
                </div>
              </div>

              {/* Scores */}
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="h-3 w-3" />
                  </div>
                  <span className="font-semibold">{talent.quality_score_avg.toFixed(1)}</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                  </div>
                  <span className="font-semibold">{talent.total_score.toFixed(1)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTalents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay datos de ranking disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}
