import { DndContext } from "@dnd-kit/core";
import { BuilderCanvas } from "@/components/profile-builder/BuilderCanvas";
import type {
  ProfileBlock,
  BuilderConfig,
} from "@/components/profile-builder/types/profile-builder";
import type { DevicePreview } from "./types";

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

/**
 * Envuelve el canvas legacy en un DndContext inerte. En el builder v2 el
 * reordenamiento se hace desde el panel de secciones, no arrastrando bloques,
 * pero BuilderCanvas usa SortableContext y requiere un DndContext padre.
 */
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
    <DndContext>
      <BuilderCanvas
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onSelectBlock={onSelectBlock}
        onUpdateBlock={onUpdateBlock}
        onReorderBlocks={() => undefined}
        previewDevice={device === "desktop" ? "desktop" : "mobile"}
        builderConfig={builderConfig}
        userId={userId}
        creatorProfileId={creatorProfileId}
      />
    </DndContext>
  );
}
