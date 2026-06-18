import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProfileBuilderData } from "@/components/profile-builder/hooks/useProfileBuilderData";
import {
  DEFAULT_BUILDER_CONFIG,
  type BuilderConfig,
  type ProfileBlock,
} from "@/components/profile-builder/types/profile-builder";
import { TopToolbarV2 } from "./TopToolbarV2";
import { LeftToolRail } from "./LeftToolRail";
import { CanvasPreview } from "./CanvasPreview";
import { ContextPanel } from "./ContextPanel";
import { blocksToSections, getSelectedSection } from "./section-adapter";
import type { BuilderPanel, DevicePreview } from "./types";

interface ProfileBuilderV2Props {
  profileId: string;
}

export function ProfileBuilderV2({ profileId }: ProfileBuilderV2Props) {
  const { toast } = useToast();
  const {
    profile,
    blocks: loadedBlocks,
    isLoading,
    isSaving,
    saveBlocksAsync,
    saveBuilderConfigAsync,
    generatePreviewTokenAsync,
  } = useProfileBuilderData(profileId);

  const [blocks, setBlocks] = useState<ProfileBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<BuilderPanel>("sections");
  const [device, setDevice] = useState<DevicePreview>("desktop");
  const [builderConfig, setBuilderConfig] = useState<BuilderConfig>(
    DEFAULT_BUILDER_CONFIG,
  );
  const [isDirty, setIsDirty] = useState(false);

  // ─── Sincronizar datos cargados al estado local ────────────────────────────
  useEffect(() => {
    if (loadedBlocks && loadedBlocks.length > 0) {
      setBlocks(loadedBlocks);
    }
  }, [loadedBlocks]);

  useEffect(() => {
    if (profile?.builder_config) {
      setBuilderConfig(profile.builder_config);
    }
  }, [profile?.builder_config]);

  // ─── Acciones sobre bloques ────────────────────────────────────────────────
  const updateBlock = useCallback(
    (blockId: string, updates: Partial<ProfileBlock>) => {
      setBlocks((current) =>
        current.map((block) =>
          block.id === blockId ? { ...block, ...updates } : block,
        ),
      );
      setIsDirty(true);
    },
    [],
  );

  const toggleVisibility = useCallback((blockId: string) => {
    setBlocks((current) =>
      current.map((block) =>
        block.id === blockId
          ? { ...block, isVisible: !block.isVisible }
          : block,
      ),
    );
    setIsDirty(true);
  }, []);

  const moveSection = useCallback((blockId: string, direction: -1 | 1) => {
    setBlocks((current) => {
      const sorted = [...current].sort((a, b) => a.orderIndex - b.orderIndex);
      const index = sorted.findIndex((block) => block.id === blockId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length)
        return current;
      const [moved] = sorted.splice(index, 1);
      sorted.splice(nextIndex, 0, moved);
      return sorted.map((block, orderIndex) => ({ ...block, orderIndex }));
    });
    setIsDirty(true);
  }, []);

  const deleteSection = useCallback((blockId: string) => {
    setBlocks((current) => {
      const remaining = current.filter((block) => block.id !== blockId);
      return remaining
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((block, orderIndex) => ({ ...block, orderIndex }));
    });
    setSelectedBlockId((current) => (current === blockId ? null : current));
    setIsDirty(true);
  }, []);

  // ─── Guardar / Publicar / Preview ──────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!blocks.length) {
      toast({
        title: "No hay secciones",
        description: "Agrega al menos una seccion antes de guardar.",
        variant: "destructive",
      });
      return;
    }
    try {
      await saveBuilderConfigAsync(builderConfig);
      await saveBlocksAsync(blocks, true);
      setIsDirty(false);
      toast({
        title: "Borrador guardado",
        description: "Tus cambios se guardaron.",
      });
    } catch (err) {
      toast({
        title: "Error al guardar",
        description: err instanceof Error ? err.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  }, [blocks, builderConfig, saveBlocksAsync, saveBuilderConfigAsync, toast]);

  const handlePublish = useCallback(async () => {
    if (!blocks.length) {
      toast({
        title: "No hay secciones",
        description: "Agrega al menos una seccion antes de publicar.",
        variant: "destructive",
      });
      return;
    }
    try {
      await saveBuilderConfigAsync(builderConfig);
      await saveBlocksAsync(blocks, false);
      setIsDirty(false);
      toast({
        title: "Perfil publicado",
        description: "Tu portafolio ya es visible en el marketplace.",
      });
    } catch (err) {
      toast({
        title: "Error al publicar",
        description: err instanceof Error ? err.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  }, [blocks, builderConfig, saveBlocksAsync, saveBuilderConfigAsync, toast]);

  const handlePreview = useCallback(async () => {
    const token = await generatePreviewTokenAsync();
    if (token) {
      window.open(`/preview/${token}`, "_blank", "noopener,noreferrer");
    } else {
      toast({
        title: "Error",
        description: "No se pudo generar el enlace de vista previa.",
        variant: "destructive",
      });
    }
  }, [generatePreviewTokenAsync, toast]);

  // ─── Derivados ─────────────────────────────────────────────────────────────
  const sections = blocksToSections(blocks);
  const selectedSection = getSelectedSection(blocks, selectedBlockId);

  const statusLabel = isSaving
    ? "Guardando..."
    : isDirty
      ? "Cambios sin guardar"
      : "Todo guardado";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopToolbarV2
        statusLabel={statusLabel}
        isSaving={isSaving}
        device={device}
        onDeviceChange={setDevice}
        onSave={handleSave}
        onPreview={handlePreview}
        onPublish={handlePublish}
      />
      <div className="flex min-h-0 flex-1">
        <LeftToolRail
          activePanel={activePanel}
          onPanelChange={setActivePanel}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
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
        <ContextPanel
          activePanel={activePanel}
          selectedSection={selectedSection}
          sections={sections}
          selectedBlockId={selectedBlockId}
          builderConfig={builderConfig}
          onSelectSection={setSelectedBlockId}
          onToggleVisibility={toggleVisibility}
          onMoveSection={moveSection}
          onDeleteSection={deleteSection}
          onUpdateBlock={updateBlock}
          onConfigChange={(updates) => {
            setBuilderConfig((current) => ({ ...current, ...updates }));
            setIsDirty(true);
          }}
        />
      </div>
    </div>
  );
}
