import { useMemo } from 'react';
import { Content, ContentStatus, STATUS_LABELS } from '@/types/database';
import {
  FileText,
  CheckCircle2,
  Clock,
  Video,
  Edit,
  Eye,
  AlertTriangle,
  Sparkles,
  Send,
  Mic,
  DollarSign,
  LucideIcon,
} from 'lucide-react';

export interface ActivityItem {
  id: string;
  contentId: string;
  contentTitle: string;
  type: 'status_change' | 'creation' | 'delivery' | 'approval' | 'payment';
  status: ContentStatus;
  description: string;
  timestamp: Date;
  icon: LucideIcon;
  color: string;
}

const statusToActivity: Record<string, {
  icon: LucideIcon;
  color: string;
  description: (title: string) => string;
  type: ActivityItem['type'];
}> = {
  draft: {
    icon: FileText,
    color: 'text-gray-400',
    description: (title) => `Borrador creado: "${title}"`,
    type: 'creation',
  },
  script_pending: {
    icon: Send,
    color: 'text-blue-400',
    description: (title) => `Guión enviado a revisión: "${title}"`,
    type: 'status_change',
  },
  script_approved: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    description: (title) => `Guión aprobado: "${title}"`,
    type: 'approval',
  },
  assigned: {
    icon: Sparkles,
    color: 'text-purple-400',
    description: (title) => `Creador asignado: "${title}"`,
    type: 'status_change',
  },
  recording: {
    icon: Mic,
    color: 'text-cyan-400',
    description: (title) => `En grabación: "${title}"`,
    type: 'status_change',
  },
  recorded: {
    icon: Video,
    color: 'text-cyan-400',
    description: (title) => `Grabación completada: "${title}"`,
    type: 'status_change',
  },
  editing: {
    icon: Edit,
    color: 'text-purple-400',
    description: (title) => `En edición: "${title}"`,
    type: 'status_change',
  },
  review: {
    icon: Eye,
    color: 'text-amber-400',
    description: (title) => `Listo para revisión: "${title}"`,
    type: 'status_change',
  },
  delivered: {
    icon: Send,
    color: 'text-blue-400',
    description: (title) => `Video entregado: "${title}"`,
    type: 'delivery',
  },
  corrected: {
    icon: CheckCircle2,
    color: 'text-blue-400',
    description: (title) => `Correcciones aplicadas: "${title}"`,
    type: 'status_change',
  },
  issue: {
    icon: AlertTriangle,
    color: 'text-orange-400',
    description: (title) => `Novedad reportada: "${title}"`,
    type: 'status_change',
  },
  approved: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    description: (title) => `Video aprobado: "${title}"`,
    type: 'approval',
  },
  paid: {
    icon: DollarSign,
    color: 'text-emerald-400',
    description: (title) => `Pago procesado: "${title}"`,
    type: 'payment',
  },
};

// Mapping of status to timestamp field
const statusTimestampMap: Record<string, string> = {
  draft: 'draft_at',
  script_pending: 'script_pending_at',
  script_approved: 'script_approved_at',
  assigned: 'assigned_at',
  recording: 'recording_at',
  recorded: 'recorded_at',
  editing: 'editing_at',
  review: 'review_at',
  delivered: 'delivered_at',
  corrected: 'corrected_at',
  approved: 'approved_at',
  paid: 'paid_at',
};

export function useClientActivityFeed(
  contentItems: Content[],
  limit: number = 15
): ActivityItem[] {
  return useMemo(() => {
    const activities: ActivityItem[] = [];

    // Process each content item
    contentItems.forEach((content) => {
      // Check each status timestamp
      Object.entries(statusTimestampMap).forEach(([status, timestampField]) => {
        const timestamp = (content as any)[timestampField];

        if (timestamp) {
          const config = statusToActivity[status];
          if (config) {
            activities.push({
              id: `${content.id}-${status}`,
              contentId: content.id,
              contentTitle: content.title,
              type: config.type,
              status: status as ContentStatus,
              description: config.description(content.title),
              timestamp: new Date(timestamp),
              icon: config.icon,
              color: config.color,
            });
          }
        }
      });

      // Also add created_at as initial activity
      if (content.created_at) {
        activities.push({
          id: `${content.id}-created`,
          contentId: content.id,
          contentTitle: content.title,
          type: 'creation',
          status: 'draft' as ContentStatus,
          description: `Contenido creado: "${content.title}"`,
          timestamp: new Date(content.created_at),
          icon: FileText,
          color: 'text-gray-400',
        });
      }
    });

    // Sort by timestamp descending (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Remove duplicates (same content + same day + same status)
    const uniqueActivities: ActivityItem[] = [];
    const seen = new Set<string>();

    activities.forEach((activity) => {
      const dateKey = activity.timestamp.toISOString().split('T')[0];
      const key = `${activity.contentId}-${activity.status}-${dateKey}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueActivities.push(activity);
      }
    });

    return uniqueActivities.slice(0, limit);
  }, [contentItems, limit]);
}
