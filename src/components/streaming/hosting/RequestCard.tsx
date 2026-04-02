import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  Video,
  ChevronRight,
  Building2,
  Briefcase,
  Store,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LiveHostingRequest } from '@/types/live-hosting.types';
import {
  HOSTING_CHANNEL_LABELS,
  HOSTING_REQUEST_STATUS_LABELS,
  HOSTING_REQUEST_STATUS_COLORS,
} from '@/types/live-hosting.types';

interface RequestCardProps {
  request: LiveHostingRequest;
  onClick?: () => void;
  showChannel?: boolean;
  compact?: boolean;
}

const CHANNEL_ICONS = {
  marketplace: Store,
  direct: Briefcase,
  org_managed: Building2,
};

// Mapeo de clases Tailwind completas para evitar problemas con clases dinámicas
const STATUS_BADGE_CLASSES: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};

export function RequestCard({
  request,
  onClick,
  showChannel = true,
  compact = false,
}: RequestCardProps) {
  const ChannelIcon = CHANNEL_ICONS[request.channel];
  const statusColor = HOSTING_REQUEST_STATUS_COLORS[request.status];

  const budgetDisplay = request.fixed_rate_usd
    ? `$${request.fixed_rate_usd}`
    : request.budget_min_usd && request.budget_max_usd
    ? `$${request.budget_min_usd} - $${request.budget_max_usd}`
    : request.commission_on_sales_pct
    ? `${request.commission_on_sales_pct}% comisión`
    : 'Por definir';

  if (compact) {
    return (
      <div
        className="flex items-center justify-between p-3 rounded-sm border hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium line-clamp-1">{request.title}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(request.scheduled_date), 'd MMM', { locale: es })}
              <Clock className="h-3 w-3 ml-2" />
              {request.scheduled_time_start.slice(0, 5)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={STATUS_BADGE_CLASSES[statusColor] || STATUS_BADGE_CLASSES.gray}
          >
            {HOSTING_REQUEST_STATUS_LABELS[request.status]}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <Card
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg line-clamp-1">{request.title}</CardTitle>
            {showChannel && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <ChannelIcon className="h-4 w-4" />
                {HOSTING_CHANNEL_LABELS[request.channel]}
              </div>
            )}
          </div>
          <Badge
            variant="outline"
            className={STATUS_BADGE_CLASSES[statusColor] || STATUS_BADGE_CLASSES.gray}
          >
            {HOSTING_REQUEST_STATUS_LABELS[request.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {request.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {request.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(request.scheduled_date), "d 'de' MMMM", { locale: es })}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {request.scheduled_time_start.slice(0, 5)} ({request.estimated_duration_minutes}min)
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium text-foreground">{budgetDisplay}</span>
          </div>
          {request.preferred_niches && request.preferred_niches.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{request.preferred_niches.slice(0, 2).join(', ')}</span>
            </div>
          )}
        </div>

        {request.actual_revenue_usd && request.status === 'completed' && (
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-sm text-muted-foreground">Revenue generado:</span>
            <span className="font-semibold text-green-600">
              ${request.actual_revenue_usd.toFixed(2)}
            </span>
          </div>
        )}

        <Button variant="ghost" className="w-full justify-between" onClick={onClick}>
          Ver detalles
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
