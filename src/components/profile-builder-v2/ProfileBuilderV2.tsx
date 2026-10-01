import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useProfileBuilderData } from "@/components/profile-builder/hooks/useProfileBuilderData";
import { useCreatorPlanFeatures } from "@/hooks/useCreatorPlanFeatures";
import {
  generateBlocksFromTemplate,
  type CreatorDataForTemplate,
} from "@/lib/profile-builder/generateBlocksFromTemplate";
import {
  BLOCK_DEFINITIONS,
  DEFAULT_BUILDER_CONFIG,
  createBlock,
  type BlockType,
  type BuilderConfig,
  type ProfileBlock,
  type ProfileTemplate,
} from "@/components/profile-builder/types/profile-builder";
import { TopToolbarV2 } from "./TopToolbarV2";
import { LeftToolRail } from "./LeftToolRail";
import { CanvasPreview } from "./CanvasPreview";
import { ContextPanel } from "./ContextPanel";
import { useBuilderAutosave } from "./hooks/useBuilderAutosave";
import { NewEditorNotice } from "./NewEditorNotice";
import { blocksToSections, getSelectedSection } from "./section-adapter";
import type { ApplyMode } from "./panels/TemplatesPanel";
import type { BuilderPanel, DevicePreview } from "./types";

interface ProfileBuilderV2Props {
  profileId: string;
  /** Panel inicial (p. ej. `?tab=templates` desde «Guardar como plantilla»). */
  initialPanel?: BuilderPanel;
}

const AUTOSAVE_DELAY_MS = 1500;

export function ProfileBuilderV2({
  profileId,
  initialPanel = "sections",
}: ProfileBuilderV2Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isPro, isPremium, canUseBlock } = useCreatorPlanFeatures();
  const {
    profile,
    blocks: loadedBlocks,
    marketplaceData,
    currentTemplate,
    isLoading,
    isSaving,
    saveBlocksAsync,
    saveBuilderConfigAsync,
    publishBlocksAsync,
    generatePreviewTokenAsync,
  } = useProfileBuilderData(profileId);

  const [blocks, setBlocks] = useState<ProfileBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<BuilderPanel>(initialPanel);
  // Solo < md: el panel contextual se abre como hoja inferior
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [device, setDevice] = useState<DevicePreview>("desktop");
  const [builderConfig, setBuilderConfig] = useState<BuilderConfig>(
    DEFAULT_BUILDER_CONFIG,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [configHydrated, setConfigHydrated] = useState(false);

  // ─── Cargar los datos guardados UNA sola vez ───────────────────────────────
  // Antes se sincronizaba en cada cambio de `loadedBlocks`: (a) cada autoguardado invalida la query y
  // el refetch pisaba lo que el creador escribía mientras tanto; (b) sin bloques guardados,
  // `loadedBlocks` se genera desde plantilla con ids nuevos en cada render → bucle de renders.
  useEffect(() => {
    if (hydrated || isLoading) return;
    setBlocks(loadedBlocks ?? []);
    setHydrated(true);
  }, [hydrated, isLoading, loadedBlocks]);

  useEffect(() => {
    if (configHydrated || isLoading) return;
    if (profile?.builder_config) {
      setBuilderConfig({ ...DEFAULT_BUILDER_CONFIG, ...profile.builder_config });
    }
    setConfigHydrated(true);
  }, [configHydrated, isLoading, profile?.builder_config]);

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

  // ─── Añadir sección tocando (sin arrastrar) ─────────────────────────────────
  const addSection = useCallback(
    (type: BlockType) => {
      if (!canUseBlock(type)) {
        toast({
          title: "Sección no disponible",
          description: "Esta sección requiere un plan superior.",
          variant: "destructive",
        });
        return;
      }
      const definition = BLOCK_DEFINITIONS[type];
      const count = blocks.filter((block) => block.type === type).length;
      if (definition.maxInstances > 0 && count >= definition.maxInstances) {
        toast({
          title: "Ya tienes esta sección",
          description: `«${definition.label}» solo se puede añadir una vez.`,
        });
        return;
      }
      const newBlock = createBlock(type, blocks.length);
      setBlocks((current) => [
        ...current,
        { ...newBlock, orderIndex: current.length },
      ]);
      setSelectedBlockId(newBlock.id);
      setActivePanel("sections");
      setIsDirty(true);
    },
    [blocks, canUseBlock, toast],
  );

  const handleSelectBlock = useCallback((blockId: string | null) => {
    setSelectedBlockId(blockId);
    if (blockId) {
      setActivePanel("sections");
      setIsMobilePanelOpen(true);
    }
  }, []);

  const handlePanelChange = useCallback(
    (panel: BuilderPanel) => {
      // En móvil, tocar la pestaña activa con la hoja abierta la cierra
      setIsMobilePanelOpen((open) => !(open && panel === activePanel));
      setActivePanel(panel);
      if (panel !== "sections") setSelectedBlockId(null);
    },
    [activePanel],
  );

  const handleExit = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/creator-dashboard");
  }, [navigate]);

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
            "Aún no se cargaron tus datos. Intenta de nuevo en unos segundos.",
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
      await saveBuilderConfigAsync(builderConfig, { isDraft });
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
        description: "Agrega al menos una sección antes de guardar.",
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
        description: "Agrega al menos una sección antes de publicar.",
        variant: "destructive",
      });
      return;
    }
    try {
      // publish_profile_blocks borra los publicados y promueve los borradores: primero guardar como
      // borrador y luego publicar (antes guardaba directo como publicado y nunca llamaba a publicar).
      await persist(true);
      await publishBlocksAsync();
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
  }, [blocks.length, persist, publishBlocksAsync, toast]);

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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <TopToolbarV2
        onExit={handleExit}
        statusLabel={statusLabel}
        isSaving={isSaving}
        device={device}
        onDeviceChange={setDevice}
        onSave={handleSave}
        onPreview={handlePreview}
        onPublish={handlePublish}
      />
      <NewEditorNotice userId={profile?.user_id} />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <LeftToolRail
          activePanel={activePanel}
          onPanelChange={handlePanelChange}
        />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-muted/30 p-2 sm:p-4 md:p-6">
          <CanvasPreview
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            device={device}
            builderConfig={builderConfig}
            userId={profile?.user_id}
            creatorProfileId={profileId}
            onSelectBlock={handleSelectBlock}
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
          onClearSelection={() => setSelectedBlockId(null)}
          onAddSection={addSection}
          isMobileOpen={isMobilePanelOpen}
          onCloseMobile={() => setIsMobilePanelOpen(false)}
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
