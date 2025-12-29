import { RawAssetsUploader } from '@/components/content/RawAssetsUploader';
import { SectionCard } from '../components/SectionCard';
import { TabProps } from '../types';
import { useAuth } from '@/hooks/useAuth';
import { FolderOpen } from 'lucide-react';

export function RawMaterialTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
  onUpdate,
  readOnly = false,
}: TabProps) {
  const { user, isAdmin } = useAuth();
  
  // Check if user can upload (creator, editor assigned, or admin)
  const canUpload = !readOnly && (
    isAdmin ||
    content?.creator_id === user?.id ||
    content?.editor_id === user?.id
  );
  
  // Check if user can delete (uploader or admin)
  const canDelete = !readOnly && (isAdmin || content?.creator_id === user?.id);

  if (!content?.id) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Guarda el proyecto primero para gestionar el material crudo</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Material Crudo" iconEmoji="📁">
        <p className="text-sm text-muted-foreground mb-4">
          Sube archivos de video y audio originales (material sin editar). 
          Los archivos no se reproducen en la plataforma, solo se almacenan para descarga.
        </p>
        
        <RawAssetsUploader
          contentId={content.id}
          organizationId={(content as any).organization_id || ''}
          clientId={(content as any).client_id || undefined}
          disabled={readOnly}
          canUpload={canUpload}
          canDelete={canDelete}
        />
      </SectionCard>
    </div>
  );
}
