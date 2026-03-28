import { AIThumbnailGenerator } from '@/components/content/AIThumbnailGenerator';
import { ThumbnailSelector } from '@/components/content/ThumbnailSelector';
import { SectionCard } from '../components/SectionCard';
import { PermissionsGate } from '../components/PermissionsGate';
import { TabProps } from '../types';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { Image } from 'lucide-react';

interface ThumbnailTabProps extends TabProps {
  selectedProduct: any;
}

export default function ThumbnailTab({
  content,
  formData,
  permissions,
  onUpdate,
  selectedProduct,
  readOnly = false,
}: ThumbnailTabProps) {
  const { currentOrgId } = useOrgOwner();

  return (
    <div className="space-y-6">
      <h4 className="font-medium flex items-center gap-2">
        <Image className="h-4 w-4" /> Miniatura del Proyecto
      </h4>

      {/* Current thumbnail preview */}
      {content?.thumbnail_url && (
        <div className="flex items-start gap-4">
          <div className="relative w-32 aspect-[9/16] rounded-sm overflow-hidden border bg-black shrink-0">
            <img
              src={content.thumbnail_url}
              alt="Miniatura actual"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Miniatura actual</p>
            <p>Puedes cambiarla subiendo una nueva o generando una con IA.</p>
          </div>
        </div>
      )}

      <PermissionsGate permissions={permissions} resource="content.video.thumbnail" action="edit" showLockOnReadOnly={false}>
        <div className="space-y-4">
          <AIThumbnailGenerator
            contentId={content?.id || ''}
            organizationId={currentOrgId || ''}
            currentThumbnail={content?.thumbnail_url}
            scriptContext={{
              script: content?.script,
              salesAngle: content?.sales_angle,
              idealAvatar: selectedProduct?.ideal_avatar,
              hooksCount: formData.hooks_count,
              productName: selectedProduct?.name || content?.product,
              clientName: content?.client?.name,
            }}
            onThumbnailGenerated={() => onUpdate?.()}
          />
          <SectionCard title="Subir Miniatura Manual" iconEmoji="🖼️">
            <ThumbnailSelector
              contentId={content?.id || ''}
              currentThumbnail={content?.thumbnail_url}
              onThumbnailChange={() => onUpdate?.()}
              disabled={readOnly}
            />
          </SectionCard>
        </div>
      </PermissionsGate>
    </div>
  );
}
