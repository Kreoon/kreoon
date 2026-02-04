import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Star,
  Package,
  ChevronRight,
  Sparkles,
  MessageCircle,
  Heart,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CreatorMatch, MatchReason } from '@/types/ai-matching';
import { INDUSTRY_DATA } from '@/types/ai-matching';
import { useMarketplaceFavorites } from '@/hooks/useMarketplaceFavorites';

interface CreatorMatchingCardProps {
  match: CreatorMatch;
  onContact?: () => void;
  onViewProfile?: () => void;
  onClick?: () => void;
  variant?: 'default' | 'compact' | 'featured';
  showMatchScore?: boolean;
}

export function CreatorMatchingCard({
  match,
  onContact,
  onViewProfile,
  onClick,
  variant = 'default',
  showMatchScore = true,
}: CreatorMatchingCardProps) {
  const { isFavorite, toggleFavorite, isAdding, isRemoving } = useMarketplaceFavorites();
  const [isHovered, setIsHovered] = useState(false);

  const {
    creator,
    profile,
    match_score,
    match_reasons,
    top_service,
  } = match;

  const isFav = isFavorite(creator.id);
  const industry = profile.primary_category
    ? INDUSTRY_DATA[profile.primary_category]
    : null;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(creator.id);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500 bg-green-500/20';
    if (score >= 60) return 'text-yellow-500 bg-yellow-500/20';
    return 'text-orange-500 bg-orange-500/20';
  };

  const getReasonIcon = (type: string) => {
    switch (type) {
      case 'industry':
      case 'experience':
        return '🎯';
      case 'style':
        return '✨';
      case 'rating':
        return '⭐';
      case 'platform':
        return '📱';
      case 'budget':
        return '💰';
      case 'availability':
        return '✅';
      default:
        return '•';
    }
  };

  if (variant === 'compact') {
    return (
      <motion.div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg cursor-pointer",
          "bg-social-card border border-social-border",
          "hover:border-social-accent/50 transition-all"
        )}
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={creator.avatar_url || undefined} />
          <AvatarFallback>{creator.full_name[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-social-foreground truncate">
            {creator.full_name}
          </p>
          <p className="text-xs text-social-muted-foreground truncate">
            {match_reasons[0]?.label}
          </p>
        </div>

        {showMatchScore && (
          <Badge className={cn("text-xs", getScoreColor(match_score))}>
            {match_score}%
          </Badge>
        )}
      </motion.div>
    );
  }

  if (variant === 'featured') {
    return (
      <motion.div
        className={cn(
          "relative p-6 rounded-2xl cursor-pointer overflow-hidden",
          "bg-gradient-to-br from-social-card via-social-card to-social-accent/10",
          "border-2 border-social-accent/30",
          "hover:border-social-accent/50 transition-all"
        )}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ y: -4 }}
      >
        {/* Featured badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-social-accent to-purple-600 text-white text-xs font-medium">
          <Sparkles className="h-3 w-3" />
          TOP MATCH
        </div>

        {/* Match score */}
        {showMatchScore && (
          <div className={cn(
            "absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-bold",
            getScoreColor(match_score)
          )}>
            {match_score}% match
          </div>
        )}

        <div className="flex items-start gap-4 mt-8">
          <Avatar className="h-16 w-16 ring-2 ring-social-accent/50">
            <AvatarImage src={creator.avatar_url || undefined} />
            <AvatarFallback className="text-lg">{creator.full_name[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h3 className="text-xl font-semibold text-social-foreground">
              {creator.full_name}
            </h3>
            {creator.username && (
              <p className="text-social-muted-foreground">@{creator.username}</p>
            )}

            {/* Industry & stats */}
            <div className="flex items-center gap-3 mt-2 text-sm">
              {industry && (
                <span className="flex items-center gap-1">
                  <span>{industry.icon}</span>
                  {industry.name_es}
                </span>
              )}
              {creator.avg_rating && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {creator.avg_rating}
                </span>
              )}
              {creator.total_projects > 0 && (
                <span className="flex items-center gap-1 text-social-muted-foreground">
                  <Package className="h-4 w-4" />
                  {creator.total_projects}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Match reasons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {match_reasons.slice(0, 3).map((reason, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="bg-social-muted/50 text-social-foreground"
            >
              {getReasonIcon(reason.type)} {reason.label}
            </Badge>
          ))}
        </div>

        {/* Top service */}
        {top_service && (
          <div className="mt-4 p-3 rounded-lg bg-social-muted/50">
            <p className="text-sm text-social-muted-foreground">Servicio destacado</p>
            <div className="flex items-center justify-between mt-1">
              <p className="font-medium text-social-foreground">{top_service.title}</p>
              {top_service.price_amount && (
                <p className="font-bold text-social-accent">
                  ${top_service.price_amount}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1 bg-gradient-to-r from-social-accent to-purple-600"
            onClick={(e) => {
              e.stopPropagation();
              onContact?.();
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Contactar
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFavoriteClick}
                  disabled={isAdding || isRemoving}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isFav && "fill-red-500 text-red-500"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFav ? 'Quitar de favoritos' : 'Guardar'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      className={cn(
        "relative p-4 rounded-xl cursor-pointer",
        "bg-social-card border border-social-border",
        "hover:border-social-accent/50 hover:shadow-lg transition-all",
        "group"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
    >
      {/* Match score badge */}
      {showMatchScore && (
        <div className={cn(
          "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold",
          getScoreColor(match_score)
        )}>
          {match_score}%
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={creator.avatar_url || undefined} />
          <AvatarFallback>{creator.full_name[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-social-foreground truncate">
              {creator.full_name}
            </h4>
            {creator.avg_rating && (
              <span className="flex items-center gap-0.5 text-xs">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {creator.avg_rating}
              </span>
            )}
          </div>

          {creator.username && (
            <p className="text-sm text-social-muted-foreground">
              @{creator.username}
            </p>
          )}

          {/* Primary reason */}
          {match_reasons[0] && (
            <p className="text-sm text-social-accent mt-1 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {match_reasons[0].label}
            </p>
          )}

          {/* Service preview */}
          {top_service && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-social-muted-foreground truncate">
                {top_service.title}
              </span>
              {top_service.price_amount && (
                <span className="font-semibold text-social-foreground">
                  ${top_service.price_amount}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={handleFavoriteClick}
            className="p-1.5 rounded-full hover:bg-social-muted transition-colors"
            disabled={isAdding || isRemoving}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors",
                isFav ? "fill-red-500 text-red-500" : "text-social-muted-foreground"
              )}
            />
          </button>
          <ChevronRight className="h-4 w-4 text-social-muted-foreground group-hover:text-social-accent transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

// Grid of matching cards
interface CreatorMatchingGridProps {
  matches: CreatorMatch[];
  onCreatorClick?: (match: CreatorMatch) => void;
  onContact?: (match: CreatorMatch) => void;
  variant?: 'default' | 'compact';
  showFeatured?: boolean;
  emptyMessage?: string;
}

export function CreatorMatchingGrid({
  matches,
  onCreatorClick,
  onContact,
  variant = 'default',
  showFeatured = true,
  emptyMessage = 'No se encontraron creadores',
}: CreatorMatchingGridProps) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-social-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const [topMatch, ...restMatches] = matches;

  return (
    <div className="space-y-4">
      {/* Featured top match */}
      {showFeatured && topMatch && topMatch.match_score >= 70 && (
        <CreatorMatchingCard
          match={topMatch}
          variant="featured"
          onClick={() => onCreatorClick?.(topMatch)}
          onContact={() => onContact?.(topMatch)}
        />
      )}

      {/* Grid of other matches */}
      <div className={cn(
        "grid gap-3",
        variant === 'compact'
          ? "grid-cols-1"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {(showFeatured && topMatch?.match_score >= 70 ? restMatches : matches).map((match) => (
          <CreatorMatchingCard
            key={match.creator_id}
            match={match}
            variant={variant}
            onClick={() => onCreatorClick?.(match)}
            onContact={() => onContact?.(match)}
          />
        ))}
      </div>
    </div>
  );
}
