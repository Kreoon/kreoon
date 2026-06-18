import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProfileBuilderData } from "@/components/profile-builder/hooks/useProfileBuilderData";
import { useCreatorPlanFeatures } from "@/hooks/useCreatorPlanFeatures";
import {
  generateBlocksFromTemplate,
  type CreatorDataForTemplate,
} from "@/lib/profile-builder/generateBlocksFromTemplate";
import {
  DEFAULT_BUILDER_CONFIG,
  type BuilderConfig,
  type ProfileBlock,
  type ProfileTemplate,
} from "@/components/profile-builder/types/profile-builder";
import { TopToolbarV2 } from "./TopToolbarV2";
import { LeftToolRail } from "./LeftToolRail";
import { CanvasPreview } from "./CanvasPreview";
import { ContextPanel } from "./ContextPanel";
import { useBuilderAutosave } from "./hooks/useBuilderAutosave";
import { blocksToSections, getSelectedSection } from "./section-adapter";
import type { ApplyMode } from "./panels/TemplatesPanel";
import type { BuilderPanel, DevicePreview } from "./types";

interface ProfileBuilderV2Props {
  profileId: string;
}

const AUTOSAVE_DELAY_MS = 1500;

export function ProfileBuilderV2({ profileId }: ProfileBuilderV2Props) {
  const { toast } = useToast();
  const { isPro, isPremium } = useCreatorPlanFeatures();
  const {
    profile,
    blocks: loadedBlocks,
    marketplaceData,
    currentTemplate,
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
  const [hydrated, setHydrated] = useState(false);

  // ─── Sincronizar datos cargados al estado local ────────────────────────────
  useEffect(() => {
    if (loadedBlocks && loadedBlocks.length > 0) {
      setBlocks(loadedBlocks);
      setHydrated(true);
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
    setBlocks((current) =>
      current
        .filter((block) => block.id !== blockId)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((block, orderIndex) => ({ ...block, orderIndex })),
    );
    setSelectedBlockId((current) => (current === blockId ? null : current));
    setIsDirty(true);
  }, []);

  const handleConfigChange = useCallback((updates: Partial<BuilderConfig>) => {
    setBuilderConfig((current) => ({ ...current, ...updates }));
    setIsDirty(true);
  }, []);

  // ─── Aplicar plantilla ─────────────────────────────────────────────────────
  const handleApplyTemplate = useCallback(
    (template: ProfileTemplate, mode: ApplyMode) => {
      if (mode === "style-only") {
        setBuilderConfig(template.config);
        setIsDirty(true);
        toast({
          title: "Estilo aplicado",
          description: `Se aplico el estilo de "${template.label}".`,
        });
        return;
      }

      const confirmed = window.confirm(
        `Reemplazar el contenido actual con la plantilla "${template.label}"? Esta accion no se puede deshacer hasta guardar.`,
      );
      if (!confirmed) return;

      if (!marketplaceData?.profile) {
        toast({
          title: "No se pudo aplicar",
          description:
            "Aun no se cargaron tus datos. Intenta de nuevo en unos segundos.",
          variant: "destructive",
        });
        return;
      }

      const creatorData: CreatorDataForTemplate = {
        profile: marketplaceData.profile,
        portfolioItems: marketplaceData.portfolioItems,
        services: marketplaceData.services,
        reviews: marketplaceData.reviews,
        trustStats: marketplaceData.trustStats || undefined,
        specializations:
          marketplaceData.specializations?.map((s) => s.name) || [],
      };

      const newBlocks = generateBlocksFromTemplate(template, creatorData);
      setBlocks(newBlocks);
      setBuilderConfig(template.config);
      setSelectedBlockId(null);
      setIsDirty(true);
      toast({
        title: "Plantilla aplicada",
        description: `Se aplico "${template.label}".`,
      });
    },
    [marketplaceData, toast],
  );

  // ─── Guardado silencioso (autosave) ────────────────────────────────────────
  const persist = useCallback(
    async (isDraft: boolean) => {
      await saveBuilderConfigAsync(builderConfig);
      await saveBlocksAsync(blocks, isDraft);
      setIsDirty(false);
    },
    [blocks, builderConfig, saveBlocksAsync, saveBuilderConfigAsync],
  );

  const { lastSavedAt, saveError } = useBuilderAutosave({
    enabled: hydrated && blocks.length > 0,
    isDirty,
    delayMs: AUTOSAVE_DELAY_MS,
    onSave: () => persist(true),
  });

  // ─── Guardar / Publicar / Preview manuales ─────────────────────────────────
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
      await persist(true);
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
  }, [blocks.length, persist, toast]);

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
      await persist(false);
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
  }, [blocks.length, persist, toast]);

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
    : saveError
      ? "Error al guardar"
      : isDirty
        ? "Cambios sin guardar"
        : lastSavedAt
          ? "Guardado"
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
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          builderConfig={builderConfig}
          currentTemplate={currentTemplate}
          canUsePro={isPro}
          canUsePremium={isPremium}
          isSaving={isSaving}
          onSelectSection={setSelectedBlockId}
          onToggleVisibility={toggleVisibility}
          onMoveSection={moveSection}
          onDeleteSection={deleteSection}
          onUpdateBlock={updateBlock}
          onConfigChange={handleConfigChange}
          onApplyTemplate={handleApplyTemplate}
          onPreview={handlePreview}
          onPublish={handlePublish}
        />
      </div>
    </div>
  );
}
