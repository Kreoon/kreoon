import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useToast } from '@/hooks/use-toast';
import { useProfileBuilderData } from '@/components/profile-builder/hooks/useProfileBuilderData';
import {
  DEFAULT_BUILDER_CONFIG,
  type BuilderConfig,
  type ProfileBlock,
} from '@/components/profile-builder/types/profile-builder';
import { CanvasPreview } from './CanvasPreview';
import { ContextPanel } from './ContextPanel';
import { LeftToolRail } from './LeftToolRail';
import { getSelectedSection } from './section-adapter';
import { TopToolbarV2 } from './TopToolbarV2';
import type { BuilderPanel, DevicePreview } from './types';

interface ProfileBuilderV2Props {
  profileId: string;
}

export function ProfileBuilderV2({ profileId }: ProfileBuilderV2Props) {
  const { toast } = useToast();
  const {
    profile,
    blocks: loadedBlocks,
    saveBlocksAsync,
    publishBlocks,
    generatePreviewTokenAsync,
    isLoading,
    isError,
    error,
    isSaving: hookIsSaving,
  } = useProfileBuilderData(profileId);

  const [blocks, setBlocks] = useState<ProfileBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<BuilderPanel>('sections');
  const [device, setDevice] = useState<DevicePreview>('desktop');
  const [builderConfig, setBuilderConfig] = useState<BuilderConfig>(DEFAULT_BUILDER_CONFIG);
  const [isDirty, setIsDirty] = useState(false);
  const [hasLoadedBlocks, setHasLoadedBlocks] = useState(false);
  const [hasLoadedConfig, setHasLoadedConfig] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  useEffect(() => {
    if (!hasLoadedBlocks && loadedBlocks.length > 0) {
      setBlocks(loadedBlocks);
      setHasLoadedBlocks(true);
      setIsDirty(false);
    }
  }, [hasLoadedBlocks, loadedBlocks]);

  useEffect(() => {
    if (!hasLoadedConfig && profile?.builder_config) {
      setBuilderConfig(profile.builder_config);
      setHasLoadedConfig(true);
    }
  }, [hasLoadedConfig, profile?.builder_config]);

  const selectedSection = useMemo(
    () => getSelectedSection(blocks, selectedBlockId),
    [blocks, selectedBlockId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateBlock = useCallback((id: string, updates: Partial<ProfileBlock>) => {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, ...updates } : block))
    );
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (blocks.length === 0) {
      toast({
        title: 'No hay secciones',
        description: 'Agrega al menos una seccion antes de guardar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingLocal(true);
    try {
      await saveBlocksAsync(blocks, true);
      setIsDirty(false);
      toast({
        title: 'Borrador guardado',
        description: 'Tus cambios se guardaron como borrador.',
      });
    } catch (saveError) {
      toast({
        title: 'Error al guardar',
        description: saveError instanceof Error ? saveError.message : 'No se pudo guardar el borrador.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingLocal(false);
    }
  }, [blocks, saveBlocksAsync, toast]);

  const handlePublish = useCallback(() => {
    publishBlocks();
    setIsDirty(false);
  }, [publishBlocks]);

  const handlePreview = useCallback(async () => {
    const token = await generatePreviewTokenAsync();
    if (token) {
      window.open(`/preview/${token}`, '_blank', 'noopener,noreferrer');
      return;
    }

    toast({
      title: 'Error',
      description: 'No se pudo generar la vista previa.',
      variant: 'destructive',
    });
  }, [generatePreviewTokenAsync, toast]);

  const isSaving = hookIsSaving || isSavingLocal;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-destructive">Error al cargar el builder</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {error instanceof Error ? error.message : 'No se pudo cargar el portafolio.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors}>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <TopToolbarV2
          isDirty={isDirty}
          isSaving={isSaving}
          device={device}
          onDeviceChange={setDevice}
          onSave={handleSave}
          onPreview={handlePreview}
          onPublish={handlePublish}
        />

        <div className="flex min-h-0 flex-1">
          <LeftToolRail activePanel={activePanel} onPanelChange={setActivePanel} />

          <main className="min-w-0 flex-1 bg-muted/20">
            <CanvasPreview
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              device={device}
              builderConfig={builderConfig}
              userId={profile?.user_id}
              creatorProfileId={profileId}
              onSelectBlock={setSelectedBlockId}
              onUpdateBlock={updateBlock}
            />
          </main>

          <ContextPanel activePanel={activePanel} selectedSection={selectedSection} />
        </div>
      </div>
    </DndContext>
  );
}
