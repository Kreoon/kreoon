import { Input } from '@/components/ui/input';
import { RawAssetsUploader } from '@/components/content/RawAssetsUploader';
import { FolderOpen, ExternalLink, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { markLocalUpdate } from '@/hooks/useContent';
import type { UnifiedTabProps } from '../types';

export default function MaterialsTab({
  project,
  formData,
  setFormData,
  editMode,
  permissions,
  readOnly = false,
}: UnifiedTabProps) {
  const canEdit = permissions.can('project.materials', 'edit') && !readOnly;
  const effectiveEditMode = editMode && !readOnly;

  // Content source: show RawAssetsUploader + Google Drive URL
  if (project.source === 'content') {
    const orgId = project.organizationId || project.contentData?.organization_id || '';
    const clientId = project.clientId || project.contentData?.client_id || '';
    const driveUrl = formData.drive_url || '';

    const autoSaveDriveUrl = (url: string) => {
      if (!project.id) return;
      markLocalUpdate(project.id, 5 * 60 * 1000);
      supabase
        .rpc('update_content_by_id', {
          p_content_id: project.id,
          p_updates: { drive_url: url || null },
        })
        .then(({ error }) => {
          if (error) console.error('[MaterialsTab] Failed to auto-save drive_url:', error);
        });
    };

    return (
      <div className="space-y-6">
        {/* Raw Assets Uploader */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Material Crudo
          </h4>
          <RawAssetsUploader
            contentId={project.id}
            organizationId={orgId}
            clientId={clientId}
            disabled={!effectiveEditMode}
            canUpload={canEdit}
            canDelete={canEdit}
          />
        </div>

        {/* Google Drive URL */}
        <div className="rounded-sm border p-4 space-y-3">
          <h4 className="font-medium text-sm">Google Drive</h4>
          {effectiveEditMode && canEdit ? (
            <Input
              value={driveUrl}
              onChange={(e) => setFormData((prev: Record<string, any>) => ({ ...prev, drive_url: e.target.value }))}
              onBlur={() => autoSaveDriveUrl(driveUrl)}
              placeholder="URL de carpeta de Google Drive..."
              className="text-sm"
            />
          ) : driveUrl ? (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Abrir en Google Drive <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Sin carpeta de Google Drive</p>
          )}
        </div>
      </div>
    );
  }

  // Marketplace source: show basic materials info
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FolderOpen className="h-5 w-5" />
        Materiales del Proyecto
      </h3>
      <div className="flex items-center gap-2 p-4 text-muted-foreground border rounded-sm">
        <Info className="h-4 w-4" />
        <span className="text-sm">Los materiales del marketplace se gestionan directamente en la plataforma del proyecto.</span>
      </div>
    </div>
  );
}
