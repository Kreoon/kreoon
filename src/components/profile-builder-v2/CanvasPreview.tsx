import { BuilderCanvas } from '@/components/profile-builder/BuilderCanvas';
import type { BuilderConfig, ProfileBlock } from '@/components/profile-builder/types/profile-builder';
import type { DevicePreview } from './types';

interface CanvasPreviewProps {
  blocks: ProfileBlock[];
  selectedBlockId: string | null;
  device: DevicePreview;
  builderConfig: BuilderConfig;
  userId?: string;
  creatorProfileId?: string;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (id: string, updates: Partial<ProfileBlock>) => void;
}

export function CanvasPreview({
  blocks,
  selectedBlockId,
  device,
  builderConfig,
  userId,
  creatorProfileId,
  onSelectBlock,
  onUpdateBlock,
}: CanvasPreviewProps) {
  return (
    <BuilderCanvas
      blocks={blocks}
      selectedBlockId={selectedBlockId}
      onSelectBlock={onSelectBlock}
      onUpdateBlock={onUpdateBlock}
      onReorderBlocks={() => undefined}
      previewDevice={device === 'desktop' ? 'desktop' : 'mobile'}
      builderConfig={builderConfig}
      userId={userId}
      creatorProfileId={creatorProfileId}
    />
  );
}
