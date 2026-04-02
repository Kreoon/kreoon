import { Input } from '@/components/ui/input';
import { RawAssetsUploader } from '@/components/content/RawAssetsUploader';
import { SectionCard, FieldRow } from '../components/SectionCard';
import { EditableField, PermissionsGate } from '../components/PermissionsGate';
import { TabProps } from '../types';
import { useAuth } from '@/hooks/useAuth';
import { FolderOpen, ExternalLink } from 'lucide-react';

export function MaterialTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
  onUpdate,
  readOnly = false,
}: TabProps) {
  const { user, isAdmin } = useAuth();
  const effectiveEditMode = editMode && !readOnly;
  const canEditDrive = permissions.can('content.material.drive', 'edit') && !readOnly;
  
  // Check if user can upload (creator, editor assigned, or admin)
  const canUpload = !readOnly && (
    isAdmin ||
    content?.creator_id === user?.id ||
    content?.editor_id === user?.id
  );
  
  // Check if user can delete (uploader or admin)
  const canDelete = !readOnly && (isAdmin || content?.creator_id === user?.id);

  // Video embed helper for reference video
  const renderVideoEmbed = (url: string) => {
    if (!url) return null;
    
    if (url.includes('tiktok.com')) {
      const videoId = url.match(/video\/(\d+)/)?.[1];
      if (videoId) {
        return (
          <iframe
            src={`https://www.tiktok.com/embed/v2/${videoId}`}
            className="w-full h-full"
            style={{ aspectRatio: '9/16' }}
            allowFullScreen
          />
        );
      }
    }
    
    if (url.includes('instagram.com')) {
      const cleanUrl = url.split('?')[0].replace(/\/$/, '');
      return (
        <iframe
          src={`${cleanUrl}/embed/captioned`}
          className="w-full h-full"
          style={{ aspectRatio: '9/16' }}
          allowFullScreen
        />
      );
    }
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let embedUrl = url;
      if (url.includes('watch?v=')) {
        embedUrl = url.replace('watch?v=', 'embed/');
      } else if (url.includes('youtu.be/')) {
        embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
      } else if (url.includes('/shorts/')) {
        embedUrl = url.replace('/shorts/', '/embed/');
      }
      return <iframe src={embedUrl} className="w-full h-full" allowFullScreen />;
    }
    
    if (url.includes('drive.google.com')) {
      return <iframe src={url.replace('/view', '/preview')} className="w-full h-full" allowFullScreen />;
    }
    
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return <video src={url} className="w-full h-full object-contain" controls />;
    }
    
    return (
      <div className="w-full h-full flex items-center justify-center">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />Ver video
        </a>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Reference Video */}
      <SectionCard title="Video de Referencia" iconEmoji="🎬">
        {content?.reference_url ? (
          <div className="aspect-video max-h-[400px] rounded-sm overflow-hidden bg-black">
            {renderVideoEmbed(content.reference_url)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin video de referencia</p>
        )}
      </SectionCard>

      {/* Raw Assets - New Bunny Storage Uploader */}
      <SectionCard title="Material Crudo" iconEmoji="📁">
        <p className="text-sm text-muted-foreground mb-4">
          Sube archivos de video y audio originales (material sin editar). 
          Los archivos no se reproducen en la plataforma, solo se almacenan para descarga.
        </p>
        
        {content?.id ? (
          <RawAssetsUploader
            contentId={content.id}
            organizationId={(content as any).organization_id || ''}
            clientId={(content as any).client_id || undefined}
            disabled={readOnly}
            canUpload={canUpload}
            canDelete={canDelete}
          />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Guarda el proyecto primero para gestionar el material crudo</p>
          </div>
        )}
      </SectionCard>

      {/* Google Drive */}
      <SectionCard title="Carpeta de Google Drive" icon={FolderOpen}>
        <FieldRow label="URL de la carpeta">
          <EditableField
            permissions={permissions}
            resource="content.material.drive"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <Input
                value={formData.drive_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, drive_url: e.target.value }))}
                placeholder="https://drive.google.com/..."
              />
            }
            viewComponent={
              formData.drive_url ? (
                <a href={formData.drive_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  Abrir carpeta <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-muted-foreground">Sin carpeta asignada</p>
              )
            }
          />
        </FieldRow>
      </SectionCard>
    </div>
  );
}
