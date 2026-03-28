import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FollowButton } from './FollowButton';
import { FounderBadge } from './FounderBadge';
import { cn } from '@/lib/utils';
import { MapPin, Users, Video, CheckCircle2 } from 'lucide-react';

export interface UserProfileCardData {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  tagline: string | null;
  city: string | null;
  country: string | null;
  is_verified?: boolean;
  is_platform_founder?: boolean;
  founder_badge_type?: string;
  followers_count?: number;
  content_count?: number;
  specialties?: string[];
}

interface UserProfileCardProps {
  user: UserProfileCardData;
  variant?: 'default' | 'compact' | 'horizontal';
  showFollowButton?: boolean;
  showStats?: boolean;
  className?: string;
  onFollow?: () => void;
}

export function UserProfileCard({
  user,
  variant = 'default',
  showFollowButton = true,
  showStats = true,
  className,
  onFollow,
}: UserProfileCardProps) {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = () => {
    navigate(`/profile/${user.id}`);
  };

  const location = [user.city, user.country].filter(Boolean).join(', ');

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-sm cursor-pointer",
          "bg-social-card/50 hover:bg-social-card border border-social-border/50",
          "transition-all duration-200 hover:scale-[1.02]",
          className
        )}
        onClick={handleClick}
      >
        <Avatar className="h-12 w-12 ring-2 ring-social-accent/20">
          <AvatarImage 
            src={user.avatar_url || undefined} 
            onLoad={() => setImageLoaded(true)}
            className={cn(!imageLoaded && "opacity-0")}
          />
          <AvatarFallback className="bg-social-accent/10 text-social-accent font-semibold">
            {user.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-social-foreground truncate text-sm">
              {user.full_name}
            </p>
            {user.is_verified && (
              <CheckCircle2 className="h-3.5 w-3.5 text-social-accent flex-shrink-0" />
            )}
            {user.is_platform_founder && (
              <FounderBadge badgeType={user.founder_badge_type} size="sm" />
            )}
          </div>
          {user.username && (
            <p className="text-xs text-social-muted-foreground">@{user.username}</p>
          )}
        </div>
        {showFollowButton && (
          <FollowButton 
            profileId={user.id} 
            size="sm"
            variant="outline"
            onFollowChange={onFollow}
          />
        )}
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <Card
        className={cn(
          "cursor-pointer overflow-hidden",
          "bg-social-card border-social-border/50",
          "hover:border-social-accent/30 hover:shadow-lg hover:shadow-social-accent/5",
          "transition-all duration-300 hover:scale-[1.01]",
          className
        )}
        onClick={handleClick}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-social-accent/20 ring-offset-2 ring-offset-social-card">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-social-accent/10 text-social-accent font-bold text-lg">
              {user.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-social-foreground truncate">
                {user.full_name}
              </h3>
              {user.is_verified && (
                <CheckCircle2 className="h-4 w-4 text-social-accent flex-shrink-0" />
              )}
              {user.is_platform_founder && (
                <FounderBadge badgeType={user.founder_badge_type} size="sm" />
              )}
            </div>
            
            {user.username && (
              <p className="text-sm text-social-accent mb-1">@{user.username}</p>
            )}
            
            {user.bio && (
              <p className="text-sm text-social-muted-foreground line-clamp-2">
                {user.bio}
              </p>
            )}
            
            {showStats && (user.followers_count !== undefined || user.content_count !== undefined) && (
              <div className="flex items-center gap-4 mt-2 text-xs text-social-muted-foreground">
                {user.followers_count !== undefined && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {user.followers_count} seguidores
                  </span>
                )}
                {user.content_count !== undefined && (
                  <span className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {user.content_count} videos
                  </span>
                )}
              </div>
            )}
          </div>

          {showFollowButton && (
            <FollowButton 
              profileId={user.id} 
              variant="default"
              onFollowChange={onFollow}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant - vertical card
  return (
    <Card
      className={cn(
        "cursor-pointer overflow-hidden group",
        "bg-social-card border-social-border/50",
        "hover:border-social-accent/30 hover:shadow-xl hover:shadow-social-accent/10",
        "transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1",
        className
      )}
      onClick={handleClick}
    >
      {/* Gradient background */}
      <div className="h-20 bg-gradient-to-br from-social-accent/20 via-social-accent/10 to-transparent relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(var(--social-accent-rgb),0.15),transparent)]" />
      </div>
      
      <CardContent className="pt-0 pb-4 px-4 -mt-10 relative">
        {/* Avatar */}
        <div className="flex justify-center mb-3">
          <Avatar className="h-20 w-20 ring-4 ring-social-card ring-offset-0 shadow-lg group-hover:ring-social-accent/30 transition-all">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-social-accent text-social-accent-foreground font-bold text-2xl">
              {user.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name & username */}
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-1.5">
            <h3 className="font-semibold text-social-foreground truncate">
              {user.full_name}
            </h3>
            {user.is_verified && (
              <CheckCircle2 className="h-4 w-4 text-social-accent flex-shrink-0" />
            )}
            {user.is_platform_founder && (
              <FounderBadge badgeType={user.founder_badge_type} size="sm" />
            )}
          </div>
          {user.username && (
            <p className="text-sm text-social-accent">@{user.username}</p>
          )}
        </div>

        {/* Tagline or bio */}
        {(user.tagline || user.bio) && (
          <p className="text-sm text-social-muted-foreground text-center line-clamp-2 mb-3">
            {user.tagline || user.bio}
          </p>
        )}

        {/* Location */}
        {location && (
          <div className="flex items-center justify-center gap-1 text-xs text-social-muted-foreground mb-3">
            <MapPin className="h-3 w-3" />
            <span>{location}</span>
          </div>
        )}

        {/* Specialties */}
        {user.specialties && user.specialties.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mb-3">
            {user.specialties.slice(0, 3).map((specialty, i) => (
              <Badge 
                key={i} 
                variant="secondary" 
                className="text-xs bg-social-muted/50 text-social-muted-foreground"
              >
                {specialty}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        {showStats && (user.followers_count !== undefined || user.content_count !== undefined) && (
          <div className="flex items-center justify-center gap-6 py-2 border-t border-social-border/50 mb-3">
            {user.followers_count !== undefined && (
              <div className="text-center">
                <p className="font-semibold text-social-foreground">{user.followers_count}</p>
                <p className="text-xs text-social-muted-foreground">Seguidores</p>
              </div>
            )}
            {user.content_count !== undefined && (
              <div className="text-center">
                <p className="font-semibold text-social-foreground">{user.content_count}</p>
                <p className="text-xs text-social-muted-foreground">Videos</p>
              </div>
            )}
          </div>
        )}

        {/* Follow button */}
        {showFollowButton && (
          <div onClick={(e) => e.stopPropagation()}>
            <FollowButton 
              profileId={user.id} 
              className="w-full"
              onFollowChange={onFollow}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
