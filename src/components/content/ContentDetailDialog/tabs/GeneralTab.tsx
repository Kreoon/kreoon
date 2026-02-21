import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FieldRow } from '../components/SectionCard';
import { EditableField } from '../components/PermissionsGate';
import { TabProps } from '../types';
import { Target, FileText, Zap, Lightbulb, RefreshCw, Heart, Video, Upload, Loader2, Trash2, Link as LinkIcon } from 'lucide-react';
import { QualityScoreWidget } from '@/components/points/QualityScoreWidget';
import { AutoPauseVideo } from '@/components/content/AutoPauseVideo';
import { Badge } from '@/components/ui/badge';
import { supabase, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { markLocalUpdate } from '@/hooks/useContent';
import { useToast } from '@/hooks/use-toast';

// Sphere phases configuration - synced with ContentDetailDialog header
const SPHERE_PHASES = [
  { value: 'engage', label: 'Enganchar', shortLabel: 'Fase 1', icon: Zap, color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/50' },
  { value: 'solution', label: 'Solución', shortLabel: 'Fase 2', icon: Lightbulb, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/50' },
  { value: 'remarketing', label: 'Remarketing', shortLabel: 'Fase 3', icon: RefreshCw, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/50' },
  { value: 'fidelize', label: 'Fidelizar', shortLabel: 'Fase 4', icon: Heart, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/50' },
];

/**
 * Convert a social media URL to an embeddable URL.
 * Returns null if the URL is not recognized as embeddable.
 */
function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);

    // YouTube watch
    if ((u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') && u.pathname === '/watch') {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }

    // YouTube shorts
    const shortsMatch = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;

    // youtu.be
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }

    // YouTube already embed
    if (u.hostname === 'www.youtube.com' && u.pathname.startsWith('/embed/')) return url;

    // TikTok
    const tiktokMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    if (tiktokMatch) return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;

    // Instagram reel
    const instaReelMatch = url.match(/instagram\.com\/reel\/([A-Za-z0-9_-]+)/);
    if (instaReelMatch) return `https://www.instagram.com/reel/${instaReelMatch[1]}/embed/`;

    // Instagram post
    const instaPostMatch = url.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/);
    if (instaPostMatch) return `https://www.instagram.com/p/${instaPostMatch[1]}/embed/`;

    // Facebook video
    if (u.hostname.includes('facebook.com') && url.includes('/video')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  } catch {
    // Invalid URL
  }
  return null;
}

/** Check if URL is a Bunny CDN or direct video URL */
function isBunnyOrDirectVideo(url: string): boolean {
  if (!url) return false;
  return (
    url.includes('iframe.mediadelivery.net') ||
    url.includes('b-cdn.net') ||
    /\.(mp4|webm|ogg)(\?|$)/i.test(url)
  );
}

interface GeneralTabProps extends TabProps {
  selectedProduct: any;
  onProductChange: (productId: string) => void;
}

export function GeneralTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
  selectedProduct,
  onProductChange,
  readOnly = false,
}: GeneralTabProps) {
  const canEditGeneral = permissions.can('content.general', 'edit') && !readOnly;
  const effectiveEditMode = editMode && !readOnly;
  // Reference video: editable regardless of block readOnly (it's independent of workflow stage)
  const canEditReferenceVideo = permissions.can('content.general', 'edit');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const referenceUrl = formData.reference_url || '';
  const embedUrl = toEmbedUrl(referenceUrl);
  const isBunnyVideo = isBunnyOrDirectVideo(referenceUrl);
  const hasVideo = !!referenceUrl && (!!embedUrl || isBunnyVideo);

  // Auto-save reference_url to DB (independent of edit mode)
  const autoSaveReferenceUrl = (url: string) => {
    const contentId = content?.id;
    if (!contentId) return;
    markLocalUpdate(contentId, 5 * 60 * 1000);
    supabase
      .rpc('update_content_by_id', {
        p_content_id: contentId,
        p_updates: { reference_url: url || null },
      })
      .then(({ error }) => {
        if (error) console.error('[GeneralTab] Failed to auto-save reference_url:', error);
      });
  };

  // Upload video to Bunny CDN
  const handleFileUpload = async (file: File) => {
    if (!content?.id) return;
    setUploading(true);
    setUploadProgress('Subiendo video...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No autenticado');

      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', `ref-${content.title || 'video'}`);
      fd.append('content_id', content.id);

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: fd,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Error al subir video');
      }

      const result = await response.json();
      const newUrl = result.embedUrl || result.embed_url || '';

      if (newUrl) {
        setFormData(prev => ({ ...prev, reference_url: newUrl }));
        // Auto-save to DB immediately
        autoSaveReferenceUrl(newUrl);
        toast({ title: 'Video de referencia subido' });
      }
    } catch (err: any) {
      toast({ title: 'Error al subir video', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Quality Score Widget - Solo mostrar si hay contenido existente */}
      {content?.id && (
        <QualityScoreWidget contentId={content.id} />
      )}

      {/* ============ VIDEO DE REFERENCIA ============ */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video de Referencia
          </h4>
          {canEditReferenceVideo && referenceUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                setFormData(prev => ({ ...prev, reference_url: '' }));
                autoSaveReferenceUrl('');
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Quitar
            </Button>
          )}
        </div>

        {/* Video Player */}
        {hasVideo && (
          <div className="aspect-[9/16] max-h-[400px] rounded-lg overflow-hidden bg-black mx-auto w-full max-w-[280px]">
            {isBunnyVideo ? (
              <AutoPauseVideo
                src={referenceUrl}
                className="w-full h-full"
                contentId={content?.id}
              />
            ) : embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : null}
          </div>
        )}

        {/* Non-embeddable URL — show as link */}
        {referenceUrl && !hasVideo && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <a
              href={referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline truncate"
            >
              {referenceUrl}
            </a>
          </div>
        )}

        {/* Empty state (only for view-only users) */}
        {!referenceUrl && !canEditReferenceVideo && (
          <div className="text-center py-6 text-muted-foreground">
            <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sin video de referencia</p>
          </div>
        )}

        {/* Upload/URL controls — always visible for users with edit permission (ignores block readOnly) */}
        {canEditReferenceVideo && (
          <div className="space-y-2">
            <Input
              value={referenceUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, reference_url: e.target.value }))}
              onBlur={() => {
                // Auto-save when user finishes typing
                autoSaveReferenceUrl(referenceUrl);
              }}
              placeholder="Pega una URL de YouTube, TikTok, Instagram..."
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    {uploadProgress}
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3 mr-1" />
                    Subir Video
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                o pega un enlace arriba
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ángulo de Ventas */}
        <FieldRow label="Ángulo de Ventas" icon={Target}>
          <EditableField
            permissions={permissions}
            resource="content.general"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <Input
                value={formData.sales_angle || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_angle: e.target.value }))}
                placeholder="Ej: Dolor, Beneficio, Urgencia..."
              />
            }
            viewComponent={<p className="font-medium">{formData.sales_angle || '—'}</p>}
          />
        </FieldRow>

        {/* Descripción */}
        <FieldRow label="Descripción" icon={FileText}>
          <EditableField
            permissions={permissions}
            resource="content.general"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del contenido..."
              />
            }
            viewComponent={<p className="font-medium">{formData.description || '—'}</p>}
          />
        </FieldRow>

        {/* Semana de Campaña */}
        <FieldRow label="Semana de Campaña">
          <EditableField
            permissions={permissions}
            resource="content.general"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <Input
                value={formData.campaign_week || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, campaign_week: e.target.value }))}
                placeholder="Ej: Semana 1, Q1 2024..."
              />
            }
            viewComponent={<p className="font-medium">{formData.campaign_week || '—'}</p>}
          />
        </FieldRow>

        {/* Fase Esfera (Método Esfera) */}
        <FieldRow label="Fase Esfera (Objetivo)">
          <EditableField
            permissions={permissions}
            resource="content.general"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <SearchableSelect
                value={formData.sphere_phase || ''}
                onValueChange={(v) => setFormData(prev => ({ ...prev, sphere_phase: v }))}
                options={[
                  { value: '', label: 'Sin fase' },
                  ...SPHERE_PHASES.map(phase => ({ value: phase.value, label: phase.label })),
                ]}
                placeholder="Seleccionar fase..."
                triggerClassName="w-full h-9"
              />
            }
            viewComponent={
              formData.sphere_phase ? (
                (() => {
                  const phase = SPHERE_PHASES.find(p => p.value === formData.sphere_phase);
                  if (!phase) return <p className="font-medium">—</p>;
                  const Icon = phase.icon;
                  return (
                    <Badge className={`${phase.bgColor} ${phase.color} gap-1`}>
                      <Icon className="h-3 w-3" />
                      {phase.label}
                    </Badge>
                  );
                })()
              ) : (
                <p className="font-medium">—</p>
              )
            }
          />
        </FieldRow>
      </div>
    </div>
  );
}
