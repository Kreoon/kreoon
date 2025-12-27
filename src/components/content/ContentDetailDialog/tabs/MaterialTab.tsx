import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RawVideoUploader } from '@/components/content/RawVideoUploader';
import { PermissionsGate, ReadOnlyWrapper } from '../blocks/PermissionsGate';
import { SectionCard } from '../components/SectionCard';
import { useContentPermissions } from '../hooks/useContentPermissions';
import { TabProps } from '../types';
import { Link as LinkIcon, FolderOpen, Upload, ExternalLink } from 'lucide-react';

interface MaterialTabProps extends TabProps {}

export function MaterialTab({
  content,
  formData,
  setFormData,
  editMode,
  userRole,
  userId,
  organizationId,
  onUpdate
}: MaterialTabProps) {
  const permissions = useContentPermissions({ organizationId, role: userRole });
  const canEditMaterial = permissions.can('material', 'edit');
  const isAdmin = userRole === 'admin';
  const isCreator = userRole === 'creator';
  const isEditor = userRole === 'editor';
  
  // Check if user can edit drive url
  const isAssignedCreator = isCreator && content?.creator_id === userId;
  const canEditDriveUrl = isAdmin || isAssignedCreator;

  // Helper function to render video embed
  const renderVideoEmbed = (url: string) => {
    if (!url) return null;
    
    const isVerticalVideo = (videoUrl: string) => {
      return videoUrl.includes('instagram.com') || 
             videoUrl.includes('tiktok.com') || 
             videoUrl.includes('/shorts/') ||
             videoUrl.includes('/reel/');
    };
    
    const isVertical = isVerticalVideo(url);
    const containerClass = isVertical 
      ? "w-full h-full flex items-center justify-center"
      : "w-full h-full";
    const iframeClass = isVertical
      ? "w-auto h-full max-w-full"
      : "w-full h-full";
    
    if (url.includes('tiktok.com')) {
      const videoId = url.match(/video\/(\d+)/)?.[1];
      if (videoId) {
        return (
          <div className={containerClass}>
            <iframe
              src={`https://www.tiktok.com/embed/v2/${videoId}`}
              className={iframeClass}
              style={isVertical ? { aspectRatio: '9/16', height: '100%' } : undefined}
              allowFullScreen
            />
          </div>
        );
      }
    }
    
    if (url.includes('instagram.com')) {
      let cleanUrl = url.split('?')[0];
      cleanUrl = cleanUrl.replace(/\/$/, '');
      const embedUrl = cleanUrl + '/embed/captioned';
      return (
        <div className={containerClass}>
          <iframe
            src={embedUrl}
            className={iframeClass}
            style={isVertical ? { aspectRatio: '9/16', height: '100%' } : undefined}
            allowFullScreen
            scrolling="no"
            frameBorder="0"
          />
        </div>
      );
    }
    
    if (url.includes('/shorts/')) {
      const embedUrl = url.replace('/shorts/', '/embed/');
      return (
        <div className={containerClass}>
          <iframe
            src={embedUrl}
            className={iframeClass}
            style={{ aspectRatio: '9/16', height: '100%' }}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let embedUrl = url;
      if (url.includes('watch?v=')) {
        embedUrl = url.replace('watch?v=', 'embed/');
      } else if (url.includes('youtu.be/')) {
        embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
      }
      return (
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      );
    }
    
    if (url.includes('vimeo.com')) {
      return (
        <iframe
          src={url.replace('vimeo.com', 'player.vimeo.com/video')}
          className="w-full h-full"
          allowFullScreen
        />
      );
    }
    
    if (url.includes('drive.google.com')) {
      return (
        <iframe
          src={url.replace('/view', '/preview')}
          className="w-full h-full"
          allowFullScreen
        />
      );
    }
    
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return (
        <video
          src={url}
          className="w-full h-full object-contain"
          controls
        />
      );
    }
    
    return (
      <div className="w-full h-full flex items-center justify-center">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline flex items-center gap-2"
        >
          <ExternalLink className="h-5 w-5" />
          Ver video en nueva pestaña
        </a>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Video de Referencia */}
        <SectionCard 
          title="Video de Referencia" 
          icon={<LinkIcon className="h-4 w-4" />}
        >
          {content?.reference_url ? (
            <div className="space-y-2">
              <div 
                className="rounded-lg overflow-hidden bg-muted flex items-center justify-center"
                style={{ height: '350px' }}
              >
                {renderVideoEmbed(content.reference_url)}
              </div>
              <a 
                href={content.reference_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
              >
                Ver video original <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center" style={{ height: '200px' }}>
              <div className="text-center text-muted-foreground">
                <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay video de referencia</p>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Videos Crudos - Raw video uploader with download option */}
        <SectionCard 
          title="Videos Crudos (Material Original)" 
          icon={<Upload className="h-4 w-4" />}
        >
          <RawVideoUploader
            contentId={content?.id || ''}
            currentUrls={formData.raw_video_urls}
            onUploadComplete={(urls) => {
              setFormData((prev: any) => ({ 
                ...prev, 
                raw_video_urls: urls, 
                drive_url: urls[0] || prev.drive_url 
              }));
              onUpdate?.();
            }}
            disabled={!editMode && !canEditDriveUrl && !isCreator}
            showDownload={isEditor || isAdmin || isCreator}
            showPreview={false}
          />
        </SectionCard>
      </div>

      {/* Separador con "O" */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            O usa un enlace de Drive
          </span>
        </div>
      </div>

      {/* Link de Google Drive */}
      <SectionCard 
        title="Carpeta de Google Drive" 
        icon={<FolderOpen className="h-4 w-4" />}
      >
        <div className="flex gap-2">
          <Input
            value={formData.drive_url || ''}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, drive_url: e.target.value }))}
            placeholder="https://drive.google.com/drive/folders/..."
            disabled={!editMode && !canEditDriveUrl && !isCreator}
            className="flex-1"
          />
          {formData.drive_url && (
            <Button
              variant="outline"
              size="icon"
              asChild
            >
              <a href={formData.drive_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pega el enlace de la carpeta de Drive con los videos crudos. Al guardar, se procesarán automáticamente.
        </p>
      </SectionCard>
    </div>
  );
}
