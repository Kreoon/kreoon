import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Video, Upload, Loader2, Trash2, Link as LinkIcon } from 'lucide-react';
import { useState, useRef } from 'react';
import { ProjectDNASection } from '../components/ProjectDNASection';
import { AutoPauseVideo } from '@/components/content/AutoPauseVideo';
import { supabase, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { markLocalUpdate } from '@/hooks/useContent';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedTabProps } from '../types';
import type { BriefFieldConfig } from '@/types/unifiedProject.types';

/**
 * Convert a social media URL to an embeddable URL.
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
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;
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

function isBunnyOrDirectVideo(url: string): boolean {
  if (!url) return false;
  return (
    url.includes('iframe.mediadelivery.net') ||
    url.includes('b-cdn.net') ||
    /\.(mp4|webm|ogg)(\?|$)/i.test(url)
  );
}

export default function BriefTab({ project, formData, setFormData, editMode, permissions, typeConfig, readOnly }: UnifiedTabProps) {
  const brief = formData.brief || {};
  const isEditing = editMode && !readOnly;
  const canEdit = permissions.can('project.brief', 'edit') && !readOnly;
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
    const contentId = project.source === 'content' ? project.id : null;
    if (!contentId) return;
    markLocalUpdate(contentId, 5 * 60 * 1000);
    supabase
      .rpc('update_content_by_id', {
        p_content_id: contentId,
        p_updates: { reference_url: url || null },
      })
      .then(({ error }) => {
        if (error) console.error('[BriefTab] Failed to auto-save reference_url:', error);
      });
  };

  const updateBriefField = (key: string, value: any) => {
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      brief: { ...prev.brief, [key]: value },
    }));
  };

  const updateDNA = (dna: any) => {
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      brief: { ...prev.brief, dna },
    }));
  };

  // Upload video to Bunny CDN
  const handleFileUpload = async (file: File) => {
    if (!project?.id) return;
    setUploading(true);
    setUploadProgress('Subiendo video...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No autenticado');

      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', `ref-${project.title || 'video'}`);
      fd.append('content_id', project.id);

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
        setFormData((prev: Record<string, any>) => ({ ...prev, reference_url: newUrl }));
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

  // Group fields by group key
  const groupedFields = typeConfig.sections.brief.fields.reduce<Record<string, BriefFieldConfig[]>>((acc, field) => {
    const group = field.group || 'general';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Project DNA section */}
      {typeConfig.sections.brief.hasProjectDNA && (
        <ProjectDNASection
          projectType={typeConfig.type}
          projectId={project?.id}
          dnaData={brief.dna || { responses: {}, audio_url: null, audio_duration: null }}
          onUpdate={updateDNA}
          editing={isEditing}
        />
      )}

      {/* ============ VIDEO DE REFERENCIA ============ */}
      {project.source === 'content' && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video de Referencia
            </h4>
            {canEdit && referenceUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => {
                  setFormData((prev: Record<string, any>) => ({ ...prev, reference_url: '' }));
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
                  contentId={project?.id}
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
          {!referenceUrl && !canEdit && (
            <div className="text-center py-6 text-muted-foreground">
              <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin video de referencia</p>
            </div>
          )}

          {/* Upload/URL controls — always visible for users with edit permission */}
          {canEdit && (
            <div className="space-y-2">
              <Input
                value={referenceUrl}
                onChange={(e) => setFormData((prev: Record<string, any>) => ({ ...prev, reference_url: e.target.value }))}
                onBlur={() => autoSaveReferenceUrl(referenceUrl)}
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
      )}

      <h3 className="text-lg font-semibold">Brief del Proyecto</h3>

      {Object.entries(groupedFields).map(([group, fields]) => (
        <div key={group} className="space-y-4">
          {group !== 'general' && (
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{group}</h4>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(field => (
              <BriefField
                key={field.key}
                field={field}
                value={brief[field.key]}
                onChange={(val) => updateBriefField(field.key, val)}
                editing={isEditing}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Display any extra brief fields not in the config (from existing data) */}
      {Object.keys(brief).filter(k => k !== 'dna' && !typeConfig.sections.brief.fields.some(f => f.key === k) && brief[k]).length > 0 && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-medium text-muted-foreground">Campos adicionales</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(brief)
              .filter(([k]) => k !== 'dna' && !typeConfig.sections.brief.fields.some(f => f.key === k))
              .filter(([, v]) => v != null && v !== '')
              .map(([key, value]) => (
                <div key={key}>
                  <label className="text-sm font-medium text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <p className="text-sm mt-1">{String(value)}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Individual field renderer
// ============================================================

function BriefField({
  field,
  value,
  onChange,
  editing,
}: {
  field: BriefFieldConfig;
  value: any;
  onChange: (val: any) => void;
  editing: boolean;
}) {
  const [tagInput, setTagInput] = useState('');
  const isFullWidth = field.type === 'textarea' || field.type === 'tags';

  return (
    <div className={isFullWidth ? 'md:col-span-2' : ''}>
      <label className="text-sm font-medium text-muted-foreground">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </label>

      {!editing ? (
        // Read-only display
        <div className="mt-1">
          {field.type === 'tags' ? (
            <div className="flex flex-wrap gap-1">
              {Array.isArray(value) && value.length > 0 ? (
                value.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          ) : (
            <p className="text-sm">{value || <span className="text-muted-foreground">-</span>}</p>
          )}
        </div>
      ) : (
        // Editable field
        <div className="mt-1">
          {field.type === 'text' && (
            <Input
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
            />
          )}

          {field.type === 'textarea' && (
            <Textarea
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              rows={3}
            />
          )}

          {field.type === 'url' && (
            <Input
              type="url"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
            />
          )}

          {field.type === 'number' && (
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              placeholder={field.placeholder}
            />
          )}

          {field.type === 'date' && (
            <Input
              type="date"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
            />
          )}

          {field.type === 'select' && (
            <SearchableSelect
              value={value || ''}
              onValueChange={onChange}
              options={[
                { value: '', label: `Sin ${field.label.toLowerCase()}` },
                ...(field.options || []).map(opt => ({ value: opt, label: opt })),
              ]}
              placeholder={field.placeholder || 'Seleccionar...'}
              triggerClassName="w-full h-9"
            />
          )}

          {field.type === 'tags' && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {Array.isArray(value) && value.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs gap-1">
                    {tag}
                    <button
                      onClick={() => onChange(value.filter((_: string, j: number) => j !== i))}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder={field.placeholder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      onChange([...(value || []), tagInput.trim()]);
                      setTagInput('');
                    }
                  }}
                  className="flex-1"
                />
                <button
                  onClick={() => {
                    if (tagInput.trim()) {
                      onChange([...(value || []), tagInput.trim()]);
                      setTagInput('');
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
