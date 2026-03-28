import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Clock, RotateCcw, Upload, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedTabProps } from '../types';

interface Deliverable {
  id: string;
  title?: string;
  description?: string;
  file_url: string;
  file_type?: string;
  thumbnail_url?: string;
  status: string;
  revision_number: number;
  max_revisions: number;
  feedback?: string;
  submitted_at?: string;
  reviewed_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendiente', color: 'text-gray-500', icon: Clock },
  submitted: { label: 'Enviado', color: 'text-blue-500', icon: Upload },
  approved: { label: 'Aprobado', color: 'text-green-500', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: 'text-red-500', icon: X },
  revision_requested: { label: 'Revision', color: 'text-orange-500', icon: RotateCcw },
};

export default function DeliverablesTab({ project, permissions, readOnly, sectionKey }: UnifiedTabProps & { sectionKey?: string }) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const isContent = project.source === 'content';

  // Fetch deliverables for marketplace projects
  useEffect(() => {
    if (isContent) {
      setLoading(false);
      return;
    }

    if (!project.id) {
      setLoading(false);
      return;
    }

    const fetchDeliverables = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('project_deliveries')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setDeliverables(data);
        }
      } catch (err) {
        console.error('[DeliverablesTab] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliverables();
  }, [project.id, isContent]);

  // Content source: show video/material info
  if (isContent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Los entregables de contenido se gestionan en las pestanas de Video y Material del proyecto original.
        </p>
        {project.contentData?.video_url && (
          <div className="border rounded-sm p-4">
            <h4 className="text-sm font-medium mb-2">Video principal</h4>
            <a
              href={project.contentData.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver video <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        {project.contentData?.video_urls && project.contentData.video_urls.length > 0 && (
          <div className="border rounded-sm p-4">
            <h4 className="text-sm font-medium mb-2">Videos adicionales ({project.contentData.video_urls.length})</h4>
            <div className="space-y-1">
              {project.contentData.video_urls.map((url: string, i: number) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Video {i + 1} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Entregables ({deliverables.filter(d => d.status === 'approved').length}/{deliverables.length})
        </h3>
      </div>

      {deliverables.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay entregables aun</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliverables.map(d => {
            const statusConfig = STATUS_CONFIG[d.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;

            return (
              <div key={d.id} className="border rounded-sm p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn('h-4 w-4', statusConfig.color)} />
                    <span className="font-medium text-sm">{d.title || `Entregable ${d.revision_number}`}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {statusConfig.label}
                  </Badge>
                </div>

                {d.description && (
                  <p className="text-sm text-muted-foreground">{d.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Revision {d.revision_number}/{d.max_revisions}</span>
                  {d.submitted_at && (
                    <span>Enviado: {new Date(d.submitted_at).toLocaleDateString('es-CO')}</span>
                  )}
                </div>

                {d.file_url && (
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Ver archivo <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {d.feedback && (
                  <div className="bg-muted/50 rounded-sm p-3 text-sm">
                    <span className="font-medium">Feedback:</span> {d.feedback}
                  </div>
                )}

                {/* Approve/reject actions for brand owners */}
                {d.status === 'submitted' && permissions.can('project.deliverables', 'approve') && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="default" className="text-xs">
                      Aprobar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      Solicitar revision
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
