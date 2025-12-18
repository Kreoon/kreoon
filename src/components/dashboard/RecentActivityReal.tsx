import { cn } from "@/lib/utils";
import { Video, Upload, Check, Edit, MessageSquare, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABELS, ContentStatus } from "@/types/database";

interface Activity {
  id: string;
  type: "status_change" | "comment";
  userName: string;
  action: string;
  target: string;
  time: string;
  newStatus?: ContentStatus;
}

const getIconForStatus = (status?: ContentStatus) => {
  if (!status) return { icon: MessageSquare, className: "bg-primary/10 text-primary" };
  
  switch (status) {
    case 'approved':
      return { icon: Check, className: "bg-success/10 text-success" };
    case 'recording':
      return { icon: Video, className: "bg-info/10 text-info" };
    case 'editing':
      return { icon: Edit, className: "bg-warning/10 text-warning" };
    case 'delivered':
      return { icon: Upload, className: "bg-success/10 text-success" };
    default:
      return { icon: Clock, className: "bg-muted text-muted-foreground" };
  }
};

export function RecentActivityReal() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        // Obtener historial de cambios de estado
        const { data: history } = await supabase
          .from('content_history')
          .select(`
            *,
            content:content_id(title),
            user:user_id(full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        // Obtener comentarios recientes
        const { data: comments } = await supabase
          .from('content_comments')
          .select(`
            *,
            content:content_id(title),
            user:user_id(full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        const historyActivities: Activity[] = (history || []).map(h => ({
          id: h.id,
          type: 'status_change' as const,
          userName: (h.user as any)?.full_name || 'Usuario',
          action: `movió a ${STATUS_LABELS[h.new_status as ContentStatus]}`,
          target: (h.content as any)?.title || 'Contenido',
          time: formatDistanceToNow(new Date(h.created_at || ''), { addSuffix: true, locale: es }),
          newStatus: h.new_status as ContentStatus
        }));

        const commentActivities: Activity[] = (comments || []).map(c => ({
          id: c.id,
          type: 'comment' as const,
          userName: (c.user as any)?.full_name || 'Usuario',
          action: 'comentó en',
          target: (c.content as any)?.title || 'Contenido',
          time: formatDistanceToNow(new Date(c.created_at || ''), { addSuffix: true, locale: es })
        }));

        // Combinar y ordenar
        const allActivities = [...historyActivities, ...commentActivities]
          .slice(0, 8);

        setActivities(allActivities);
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold text-card-foreground mb-4">Actividad Reciente</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold text-card-foreground mb-4">Actividad Reciente</h3>
        <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold text-card-foreground mb-4">Actividad Reciente</h3>
      
      <div className="space-y-4">
        {activities.map((activity) => {
          const config = getIconForStatus(activity.newStatus);
          const Icon = config.icon;
          
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                config.className
              )}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-card-foreground">
                  <span className="font-medium">{activity.userName}</span>
                  {" "}{activity.action}{" "}
                  <span className="font-medium">{activity.target}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
