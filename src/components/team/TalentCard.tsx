import { useState, type MouseEvent } from "react";
import { User, Video, Star, Zap, Clock, TrendingUp, AlertTriangle, Crown, Shield, Sparkles, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface TalentProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  role: 'creator' | 'editor' | 'strategist';
  content_count: number;
  is_ambassador: boolean;
  // Performance scores
  quality_score_avg?: number;
  reliability_score?: number;
  velocity_score?: number;
  // AI metadata
  ai_recommended_level?: 'junior' | 'pro' | 'elite';
  ai_risk_flag?: 'none' | 'warning' | 'high';
  // Ambassador
  ambassador_level?: 'none' | 'bronze' | 'silver' | 'gold';
  // Editor specific (legacy)
  editor_rating?: number;
  editor_completed_count?: number;
  editor_on_time_count?: number;
  // Workload
  active_tasks?: number;
  // UP System
  up_points?: number;
  up_level?: string;
  // Star ratings by role (0-5)
  avg_creator_rating?: number;
  avg_editor_rating?: number;
  avg_strategy_rating?: number;
  rated_content_count?: number;
  // Combined average (for backwards compatibility)
  avg_star_rating?: number;
}

interface TalentCardProps {
  talent: TalentProfile;
  onClick: () => void;
  onAmbassadorToggle?: (e: MouseEvent) => void;
  isAdmin?: boolean;
  showKPIs?: boolean;
}

const ROLE_STYLES = {
  creator: { label: "Creador de Contenido", className: "bg-primary/10 text-primary border-primary/20" },
  editor: { label: "Productor Audio-Visual", className: "bg-info/10 text-info border-info/20" },
  strategist: { label: "Estratega", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" }
};

const LEVEL_STYLES = {
  junior: { label: "Junior", icon: Shield, className: "bg-muted text-muted-foreground" },
  pro: { label: "Pro", icon: Zap, className: "bg-blue-500/10 text-blue-500" },
  elite: { label: "Elite", icon: Crown, className: "bg-amber-500/10 text-amber-500" }
};

const AMBASSADOR_STYLES = {
  none: null,
  bronze: { label: "Bronce", className: "bg-orange-700/10 text-orange-700 border-orange-700/20" },
  silver: { label: "Plata", className: "bg-slate-400/10 text-slate-500 border-slate-400/20" },
  gold: { label: "Oro", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" }
};

const RISK_STYLES = {
  none: null,
  warning: { label: "Riesgo medio", className: "text-warning", icon: AlertTriangle },
  high: { label: "Alto riesgo", className: "text-destructive", icon: AlertTriangle }
};

export function TalentCard({ talent, onClick, onAmbassadorToggle, isAdmin, showKPIs = true }: TalentCardProps) {
  const level = talent.ai_recommended_level || 'junior';
  const levelStyle = LEVEL_STYLES[level];
  const LevelIcon = levelStyle.icon;
  
  const ambassadorStyle = talent.ambassador_level && talent.ambassador_level !== 'none' 
    ? AMBASSADOR_STYLES[talent.ambassador_level] 
    : null;
  
  const riskStyle = talent.ai_risk_flag && talent.ai_risk_flag !== 'none' 
    ? RISK_STYLES[talent.ai_risk_flag] 
    : null;

  const qualityScore = talent.quality_score_avg || 0;
  const reliabilityScore = talent.reliability_score || 0;
  const velocityScore = talent.velocity_score || 0;
  
  // Calculate overall performance score (0-100)
  const overallScore = Math.round(((qualityScore + reliabilityScore + velocityScore) / 30) * 100);

  return (
    <TooltipProvider>
      <div 
        onClick={onClick}
        className={cn(
          "group rounded-sm border bg-card p-5 transition-all duration-300 hover:shadow-lg cursor-pointer relative overflow-hidden",
          talent.is_ambassador || ambassadorStyle
            ? "border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_-3px_rgba(245,158,11,0.5)] hover:border-amber-500 bg-gradient-to-br from-card via-card to-amber-500/5" 
            : riskStyle?.className === "text-destructive"
            ? "border-destructive/30 hover:border-destructive/50"
            : "border-border hover:border-primary/20"
        )}
      >
        {/* Risk indicator */}
        {riskStyle && (
          <div className={cn("absolute top-2 right-2", riskStyle.className)}>
            <Tooltip>
              <TooltipTrigger>
                <riskStyle.icon className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{riskStyle.label}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Header with avatar and badges */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            {talent.avatar_url ? (
              <img 
                src={talent.avatar_url} 
                alt={talent.full_name}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            {/* Level indicator on avatar */}
            <div className={cn(
              "absolute -bottom-1 -right-1 rounded-full p-1",
              levelStyle.className
            )}>
              <LevelIcon className="h-3 w-3" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-card-foreground truncate">{talent.full_name}</h3>
              {(talent.is_ambassador || ambassadorStyle) && (
                <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
              )}
            </div>
            
            {/* Role and level badges */}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className={cn("text-xs", ROLE_STYLES[talent.role].className)}>
                {ROLE_STYLES[talent.role].label}
              </Badge>
              <Badge variant="outline" className={cn("text-xs gap-1", levelStyle.className)}>
                <LevelIcon className="h-3 w-3" />
                {levelStyle.label}
              </Badge>
              {ambassadorStyle && (
                <Badge variant="outline" className={cn("text-xs gap-1", ambassadorStyle.className)}>
                  <Star className="h-3 w-3 fill-current" />
                  {ambassadorStyle.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* KPIs Section */}
        {showKPIs && (
          <div className="space-y-3 mb-4">
            {/* Star Rating Display - show role-specific rating */}
            {(() => {
              const roleRating = talent.role === 'creator' ? talent.avg_creator_rating :
                                talent.role === 'editor' ? talent.avg_editor_rating :
                                talent.avg_strategy_rating;
              const displayRating = roleRating ?? talent.avg_star_rating;
              
              if (displayRating && displayRating > 0) {
                return (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-4 w-4",
                            star <= Math.round(displayRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({displayRating.toFixed(1)})
                      </span>
                    </div>
                    {talent.rated_content_count && talent.rated_content_count > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {talent.rated_content_count} calificados
                      </span>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            {/* UP Points and Level */}
            {(talent.up_points !== undefined && talent.up_points > 0) && (
              <div className="flex items-center justify-between p-2 rounded-sm bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-primary">{talent.up_points} UP</span>
                </div>
                {talent.up_level && (
                  <Badge variant="outline" className={cn(
                    "text-[10px]",
                    talent.up_level === 'diamond' ? 'text-cyan-400 border-cyan-400/30' :
                    talent.up_level === 'gold' ? 'text-yellow-400 border-yellow-400/30' :
                    talent.up_level === 'silver' ? 'text-gray-400 border-gray-400/30' :
                    'text-orange-400 border-orange-400/30'
                  )}>
                    {talent.up_level}
                  </Badge>
                )}
              </div>
            )}

            {/* Overall score bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Performance</span>
                <span className={cn(
                  "font-medium",
                  overallScore >= 70 ? "text-success" : overallScore >= 40 ? "text-warning" : "text-destructive"
                )}>
                  {overallScore}%
                </span>
              </div>
              <Progress 
                value={overallScore} 
                className="h-1.5"
              />
            </div>

            {/* Mini KPIs grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2 rounded-sm bg-muted/50">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
                      <Star className="h-3 w-3" />
                    </div>
                    <p className="text-sm font-semibold">{qualityScore.toFixed(1)}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Calidad</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2 rounded-sm bg-muted/50">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
                      <Clock className="h-3 w-3" />
                    </div>
                    <p className="text-sm font-semibold">{reliabilityScore.toFixed(1)}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Puntualidad</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2 rounded-sm bg-muted/50">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
                      <Zap className="h-3 w-3" />
                    </div>
                    <p className="text-sm font-semibold">{velocityScore.toFixed(1)}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Velocidad</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Footer with stats */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{talent.content_count}</span>
            </div>
            {talent.active_tasks !== undefined && talent.active_tasks > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-info">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">{talent.active_tasks}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Tareas activas</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Ambassador quick toggle for admins */}
            {isAdmin && onAmbassadorToggle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAmbassadorToggle(e);
                    }}
                    className={cn(
                      "flex items-center justify-center h-6 w-6 rounded-sm border transition-all cursor-pointer",
                      talent.is_ambassador
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-muted/50 border-border hover:border-amber-500/50 hover:bg-amber-500/10"
                    )}
                  >
                    {talent.is_ambassador ? (
                      <Star className="h-3.5 w-3.5 fill-current" />
                    ) : (
                      <Star className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {talent.is_ambassador ? "Quitar embajador" : "Hacer embajador"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* AI Recommended indicator */}
            {level === 'elite' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Recomendado por IA</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
