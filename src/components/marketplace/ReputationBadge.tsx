import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Star, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type GlobalLevel = 'pro' | 'elite' | 'master' | 'legend';

interface ReputationData {
  global_points: number;
  global_level: GlobalLevel;
  composite_score: number;
  total_projects_completed: number;
  total_on_time_pct: number;
  avg_review_rating: number;
  total_reviews: number;
}

const LEVEL_CONFIG: Record<GlobalLevel, {
  label: string;
  icon: string;
  color: string;
  bg: string;
}> = {
  pro: {
    label: 'Pro',
    icon: '⚡',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
  elite: {
    label: 'Elite',
    icon: '🔥',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  master: {
    label: 'Master',
    icon: '👑',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
  },
  legend: {
    label: 'Legend',
    icon: '💎',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10 border-cyan-400/30',
  },
};

interface ReputationBadgeProps {
  userId: string;
  compact?: boolean;
  showScore?: boolean;
}

export function ReputationBadge({ userId, compact = false, showScore = false }: ReputationBadgeProps) {
  const [data, setData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchReputation = async () => {
      try {
        const { data: rep } = await supabase
          .rpc('get_public_reputation', { p_user_id: userId });

        if (rep && rep.length > 0) {
          setData(rep[0] as ReputationData);
        }
      } catch (err) {
        console.error('Error fetching reputation:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReputation();
  }, [userId]);

  if (loading) {
    return <Skeleton className={compact ? "h-6 w-16" : "h-8 w-24"} />;
  }

  if (!data) return null;

  const level = (data.global_level || 'pro') as GlobalLevel;
  const config = LEVEL_CONFIG[level];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn("gap-1 text-xs cursor-default", config.bg, config.color)}
            >
              <span>{config.icon}</span>
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-medium">{data.global_points} UP</p>
              {data.total_reviews > 0 && (
                <p>{data.avg_review_rating.toFixed(1)} rating ({data.total_reviews} reviews)</p>
              )}
              <p>{data.total_on_time_pct}% on-time delivery</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 px-3 py-2 rounded-sm border", config.bg)}>
      <div className="text-2xl">{config.icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("font-bold text-sm", config.color)}>{config.label}</span>
          {showScore && data.composite_score > 0 && (
            <span className="text-xs text-muted-foreground">
              Score: {data.composite_score.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {data.global_points} UP
          </span>
          {data.total_reviews > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {data.avg_review_rating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {data.total_on_time_pct}%
          </span>
        </div>
      </div>
    </div>
  );
}
