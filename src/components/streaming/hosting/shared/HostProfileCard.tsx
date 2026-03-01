import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Star, ExternalLink } from 'lucide-react';
import type { LiveHostingHostWithProfile } from '@/types/live-hosting.types';
import { HOST_STATUS_LABELS, HOST_STATUS_COLORS } from '@/types/live-hosting.types';

// Mapeo de clases Tailwind completas para evitar problemas con clases dinámicas
const HOST_BADGE_CLASSES: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};

interface HostProfileCardProps {
  host: LiveHostingHostWithProfile;
  compact?: boolean;
  showStatus?: boolean;
  onClick?: () => void;
}

export function HostProfileCard({
  host,
  compact = false,
  showStatus = true,
  onClick
}: HostProfileCardProps) {
  const initials = host.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={onClick}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={host.avatar_url || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{host.full_name || 'Sin nombre'}</p>
          {host.creator_rating && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{host.creator_rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        {showStatus && (
          <Badge variant="outline" className={HOST_BADGE_CLASSES[HOST_STATUS_COLORS[host.status]] || HOST_BADGE_CLASSES.gray}>
            {HOST_STATUS_LABELS[host.status]}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={host.avatar_url || undefined} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold truncate">{host.full_name || 'Sin nombre'}</h3>
              {showStatus && (
                <Badge variant="outline">
                  {HOST_STATUS_LABELS[host.status]}
                </Badge>
              )}
            </div>

            {host.creator_slug && (
              <p className="text-sm text-muted-foreground">@{host.creator_slug}</p>
            )}

            {host.creator_bio && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {host.creator_bio}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2">
              {host.creator_rating && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{host.creator_rating.toFixed(1)}</span>
                </div>
              )}

              {host.proposed_rate_usd && (
                <span className="text-sm font-medium text-green-600">
                  ${host.proposed_rate_usd} USD
                </span>
              )}

              {host.fit_score > 0 && (
                <span className="text-xs text-muted-foreground">
                  Compatibilidad: {host.fit_score}%
                </span>
              )}
            </div>

            {host.portfolio_links && host.portfolio_links.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {host.portfolio_links.length} enlaces de portafolio
                </span>
              </div>
            )}
          </div>
        </div>

        {host.application_message && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground line-clamp-3">
              "{host.application_message}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
