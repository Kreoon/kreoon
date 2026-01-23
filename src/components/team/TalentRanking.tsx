import { useState, useEffect } from "react";
import { Trophy, Medal, Star, TrendingUp, Crown, Zap, Shield, Flame } from "lucide-react";
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
  // UP System data
  up_points: number;
  up_level: string;
  on_time_deliveries: number;
  late_deliveries: number;
  total_deliveries: number;
  // Star ratings from content
  avg_rating: number;
  rated_content_count: number;
  // Content count
  content_count: number;
}

const LEVEL_COLORS: Record<string, string> = {
  diamond: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  gold: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  silver: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
  bronze: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
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
      // Fetch directly from UP V2 tables
      const [{ data: creatorTotals }, { data: editorTotals }] = await Promise.all([
        supabase
          .from('up_creadores_totals')
          .select('user_id, total_points, current_level, on_time_deliveries, late_deliveries, total_deliveries')
          .eq('organization_id', currentOrgId),
        supabase
          .from('up_editores_totals')
          .select('user_id, total_points, current_level, on_time_deliveries, late_deliveries, total_deliveries')
          .eq('organization_id', currentOrgId)
      ]);

      // Collect all user IDs from both tables
      const creatorUserIds = creatorTotals?.map(t => t.user_id) || [];
      const editorUserIds = editorTotals?.map(t => t.user_id) || [];
      const allUserIds = [...new Set([...creatorUserIds, ...editorUserIds])];

      if (allUserIds.length === 0) {
        setTalents([]);
        setLoading(false);
        return;
      }

      // Get profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allUserIds);

      // Get ratings from content
      const [{ data: creatorContent }, { data: editorContent }] = await Promise.all([
        supabase
          .from('content')
          .select('creator_id, creator_rating')
          .eq('organization_id', currentOrgId)
          .in('creator_id', creatorUserIds)
          .not('creator_rating', 'is', null),
        supabase
          .from('content')
          .select('editor_id, editor_rating')
          .eq('organization_id', currentOrgId)
          .in('editor_id', editorUserIds)
          .not('editor_rating', 'is', null)
      ]);

      // Build maps from V2 tables
      const creatorUpMap = new Map(creatorTotals?.map(t => [t.user_id, t]) || []);
      const editorUpMap = new Map(editorTotals?.map(t => [t.user_id, t]) || []);

      // Calculate ratings
      const creatorRatings = new Map<string, { sum: number; count: number }>();
      creatorContent?.forEach(c => {
        if (c.creator_id && c.creator_rating !== null) {
          const existing = creatorRatings.get(c.creator_id) || { sum: 0, count: 0 };
          creatorRatings.set(c.creator_id, { 
            sum: existing.sum + c.creator_rating, 
            count: existing.count + 1 
          });
        }
      });

      const editorRatings = new Map<string, { sum: number; count: number }>();
      editorContent?.forEach(c => {
        if (c.editor_id && c.editor_rating !== null) {
          const existing = editorRatings.get(c.editor_id) || { sum: 0, count: 0 };
          editorRatings.set(c.editor_id, { 
            sum: existing.sum + c.editor_rating, 
            count: existing.count + 1 
          });
        }
      });

      // Build ranked talents - one entry per user per role
      const ranked: RankedTalent[] = [];
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Add creators
      creatorTotals?.forEach(ct => {
        const profile = profileMap.get(ct.user_id);
        if (!profile) return;
        const ratingData = creatorRatings.get(ct.user_id);
        
        ranked.push({
          id: ct.user_id,
          full_name: profile.full_name || 'Sin nombre',
          avatar_url: profile.avatar_url,
          role: 'creator',
          up_points: ct.total_points || 0,
          up_level: ct.current_level || 'bronze',
          on_time_deliveries: ct.on_time_deliveries || 0,
          late_deliveries: ct.late_deliveries || 0,
          total_deliveries: ct.total_deliveries || 0,
          avg_rating: ratingData ? ratingData.sum / ratingData.count : 0,
          rated_content_count: ratingData?.count || 0,
          content_count: ct.total_deliveries || 0,
        });
      });

      // Add editors
      editorTotals?.forEach(et => {
        const profile = profileMap.get(et.user_id);
        if (!profile) return;
        const ratingData = editorRatings.get(et.user_id);
        
        ranked.push({
          id: `${et.user_id}_editor`, // Unique key for editor entry
          full_name: profile.full_name || 'Sin nombre',
          avatar_url: profile.avatar_url,
          role: 'editor',
          up_points: et.total_points || 0,
          up_level: et.current_level || 'bronze',
          on_time_deliveries: et.on_time_deliveries || 0,
          late_deliveries: et.late_deliveries || 0,
          total_deliveries: et.total_deliveries || 0,
          avg_rating: ratingData ? ratingData.sum / ratingData.count : 0,
          rated_content_count: ratingData?.count || 0,
          content_count: et.total_deliveries || 0,
        });
      });

      // Sort by UP points descending
      ranked.sort((a, b) => b.up_points - a.up_points);
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

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Star key={i} className="h-3 w-3 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="h-3 w-3 text-muted-foreground/30" />);
      }
    }
    return stars;
  };

  const getPunctualityRate = (onTime: number, total: number) => 
    total > 0 ? Math.round((onTime / total) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Flame className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Ranking Sistema UP</h3>
      </div>

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
          const punctualityRate = getPunctualityRate(talent.on_time_deliveries, talent.total_deliveries);
          
          return (
            <div 
              key={talent.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all hover:shadow-md",
                index < 3 && "border-amber-500/30 bg-gradient-to-r from-card to-amber-500/5"
              )}
            >
              {/* Position */}
              <div className="flex-shrink-0 w-8 text-center">
                {index < 3 ? (
                  <Medal className={cn("h-5 w-5 mx-auto", getMedalColor(index))} />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
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
                  <span className="font-medium truncate text-sm">{talent.full_name}</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", LEVEL_COLORS[talent.up_level])}>
                    {talent.up_level}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {talent.role === 'creator' ? 'Creador' : 'Editor'}
                  </Badge>
                  <span>{talent.content_count} contenidos</span>
                  {talent.rated_content_count > 0 && (
                    <div className="flex items-center gap-0.5">
                      {renderStars(talent.avg_rating)}
                      <span className="ml-1">({talent.avg_rating.toFixed(1)})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs">
                {/* UP Points */}
                <div className="text-center">
                  <div className="flex items-center gap-1 text-primary">
                    <Zap className="h-3 w-3" />
                    <span className="font-bold">{talent.up_points}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">UP</span>
                </div>

                {/* Punctuality */}
                <div className="text-center">
                  <span className={cn(
                    "font-bold",
                    punctualityRate >= 80 ? "text-success" : punctualityRate >= 60 ? "text-warning" : "text-destructive"
                  )}>
                    {punctualityRate}%
                  </span>
                  <div className="text-[10px] text-muted-foreground">Puntual</div>
                </div>

                {/* Deliveries */}
                <div className="text-center hidden sm:block">
                  <span className="font-bold text-foreground">{talent.total_deliveries}</span>
                  <div className="text-[10px] text-muted-foreground">Entregas</div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTalents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay datos de ranking disponibles</p>
            <p className="text-xs mt-1">Los puntos UP se acumulan cuando se entregan contenidos</p>
          </div>
        )}
      </div>
    </div>
  );
}
