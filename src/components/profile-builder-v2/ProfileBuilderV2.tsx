import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Eye,
  Loader2,
  Palette,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BlockRenderer } from "@/components/profile-builder/BlockRenderer";
import { useProfileBuilderData } from "@/components/profile-builder/hooks/useProfileBuilderData";
import {
  DEFAULT_BUILDER_CONFIG,
  type BlockType,
  type BuilderConfig,
  type ProfileBlock,
} from "@/components/profile-builder/types/profile-builder";
import { SectionEditor } from "./editors";
import { StylePanel } from "./panels/StylePanel";
import { getPublishChecklist } from "./publish-checklist";
import { blockToSection } from "./section-adapter";

interface ProfileBuilderV2Props {
  profileId: string;
}

interface SectionStepDef {
  type: BlockType;
  label: string;
  question: string;
}

// Orden canónico de secciones que el asistente guía paso a paso.
const SECTION_STEPS: SectionStepDef[] = [
  {
    type: "hero_banner",
    label: "Tu portada",
    question: "Lo primero que verán de ti",
  },
  { type: "about", label: "Sobre ti", question: "Cuéntales quién eres" },
  {
    type: "portfolio",
    label: "Tus trabajos",
    question: "Muestra lo que sabes hacer",
  },
  { type: "services", label: "Tus servicios", question: "¿Qué ofreces?" },
  {
    type: "pricing",
    label: "Tus precios",
    question: "¿Cuánto cuesta trabajar contigo?",
  },
  { type: "contact", label: "Contacto", question: "¿Cómo te escriben?" },
];

type WizardStep =
  | {
      kind: "section";
      key: string;
      label: string;
      question: string;
      blockId: string;
    }
  | { kind: "style"; key: string; label: string; question: string }
  | { kind: "publish"; key: string; label: string; question: string };

// Vista previa de solo lectura de un bloque (sin el editor complejo).
function SectionPreview({
  block,
  theme,
  userId,
  creatorProfileId,
}: {
  block: ProfileBlock;
  theme: BuilderConfig["theme"];
  userId?: string;
  creatorProfileId?: string;
}) {
  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border",
        theme === "dark"
          ? "border-slate-800 bg-slate-950 text-slate-100"
          : "border-slate-200 bg-white text-slate-900",
      ].join(" ")}
    >
      <BlockRenderer
        block={block}
        isEditing={false}
        isSelected={false}
        onSelect={() => undefined}
        onUpdate={() => undefined}
        userId={userId}
        creatorProfileId={creatorProfileId}
        currentDevice="desktop"
      />
    </div>
  );
}

export function ProfileBuilderV2({ profileId }: ProfileBuilderV2Props) {
  const { toast } = useToast();
  const {
    profile,
    blocks: loadedBlocks,
    saveBlocksAsync,
    saveBuilderConfigAsync,
    publishBlocks,
    generatePreviewTokenAsync,
    isLoading,
    isError,
    error,
    isSaving: hookIsSaving,
    isPublishing,
  } = useProfileBuilderData(profileId);

  const [blocks, setBlocks] = useState<ProfileBlock[]>([]);
  const [builderConfig, setBuilderConfig] = useState<BuilderConfig>(
    DEFAULT_BUILDER_CONFIG,
  );
  const [currentStep, setCurrentStep] = useState(0);
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

  // ─── Pasos del asistente ──────────────────────────────────────────────────
  const steps = useMemo<WizardStep[]>(() => {
    const sectionSteps = SECTION_STEPS.reduce<WizardStep[]>((acc, def) => {
      const block = blocks.find((item) => item.type === def.type);
      if (block) {
        acc.push({
          kind: "section",
          key: def.type,
          label: def.label,
          question: def.question,
          blockId: block.id,
        });
      }
      return acc;
    }, []);

    return [
      ...sectionSteps,
      {
        kind: "style",
        key: "style",
        label: "Estilo",
        question: "Dale tu toque",
      },
      {
        kind: "publish",
        key: "publish",
        label: "Publicar",
        question: "Revisa y publica",
      },
    ];
  }, [blocks]);

  const stepIndex = Math.min(currentStep, steps.length - 1);
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const progressValue = Math.round(((stepIndex + 1) / steps.length) * 100);

  const updateBlock = useCallback(
    (id: string, updates: Partial<ProfileBlock>) => {
      setBlocks((current) =>
        current.map((block) =>
          block.id === id ? { ...block, ...updates } : block,
        ),
      );
      setIsDirty(true);
    },
    [],
  );

  const handleConfigChange = useCallback((updates: Partial<BuilderConfig>) => {
    setBuilderConfig((current) => ({ ...current, ...updates }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (blocks.length === 0) return;
    setIsSavingLocal(true);
    try {
      await saveBlocksAsync(blocks, true);
      await saveBuilderConfigAsync(builderConfig);
      setIsDirty(false);
    } catch (saveError) {
      toast({
        title: "Error al guardar",
        description:
          saveError instanceof Error
            ? saveError.message
            : "No se pudo guardar el borrador.",
        variant: "destructive",
      });
    } finally {
      setIsSavingLocal(false);
    }
  }, [blocks, builderConfig, saveBlocksAsync, saveBuilderConfigAsync, toast]);

  const handlePublish = useCallback(async () => {
    setIsSavingLocal(true);
    try {
      // El RPC publica el borrador guardado: hay que guardar antes de publicar.
      await saveBlocksAsync(blocks, true);
      await saveBuilderConfigAsync(builderConfig);
      setIsDirty(false);
      publishBlocks();
    } catch (publishError) {
      toast({
        title: "Error al publicar",
        description:
          publishError instanceof Error
            ? publishError.message
            : "No se pudo publicar el perfil.",
        variant: "destructive",
      });
    } finally {
      setIsSavingLocal(false);
    }
  }, [
    blocks,
    builderConfig,
    publishBlocks,
    saveBlocksAsync,
    saveBuilderConfigAsync,
    toast,
  ]);

  const handlePreview = useCallback(async () => {
    await handleSave();
    const token = await generatePreviewTokenAsync();
    if (token) {
      window.open(`/preview/${token}`, "_blank", "noopener,noreferrer");
      return;
    }
    toast({
      title: "Error",
      description: "No se pudo generar la vista previa.",
      variant: "destructive",
    });
  }, [generatePreviewTokenAsync, handleSave, toast]);

  const goNext = useCallback(() => {
    setCurrentStep((current) => Math.min(current + 1, steps.length - 1));
    if (isDirty) void handleSave();
  }, [steps.length, isDirty, handleSave]);

  const goBack = useCallback(() => {
    setCurrentStep((current) => Math.max(current - 1, 0));
  }, []);

  const isSaving = hookIsSaving || isSavingLocal;

  const checklist = useMemo(() => getPublishChecklist(blocks), [blocks]);

  // ─── Estados de carga ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-destructive">
            Error al cargar el builder
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "No se pudo cargar el portafolio."}
          </p>
        </div>
      </div>
    );
  }

  const currentBlock =
    step?.kind === "section"
      ? blocks.find((item) => item.id === step.blockId)
      : undefined;
  const styleBlock =
    blocks.find((item) => item.type === "hero_banner") ?? blocks[0];

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#ffffff_100%)] text-slate-900">
      {/* ─── Encabezado fijo: progreso ─── */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span>Arma tu perfil</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {isSaving ? "Guardando…" : isDirty ? "Sin guardar" : "Guardado"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
              >
                <Save className="h-4 w-4" />
                Guardar
              </Button>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Paso {stepIndex + 1} de {steps.length} · {step?.label}
              </span>
              <span>{progressValue}%</span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        </div>
      </header>

      {/* ─── Cuerpo: una sección a la vez ─── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {step?.label}
          </h1>
          <p className="text-sm text-slate-600">{step?.question}</p>
        </div>

        <div className="mt-6 space-y-6">
          {step?.kind === "section" && currentBlock && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionEditor
                  section={blockToSection(currentBlock)}
                  onUpdateBlock={updateBlock}
                />
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Eye className="h-3.5 w-3.5" />
                  Así se ve
                </p>
                <SectionPreview
                  block={currentBlock}
                  theme={builderConfig.theme}
                  userId={profile?.user_id}
                  creatorProfileId={profileId}
                />
              </div>
            </>
          )}

          {step?.kind === "style" && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <StylePanel
                  config={builderConfig}
                  onChange={handleConfigChange}
                />
              </div>
              {styleBlock && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Eye className="h-3.5 w-3.5" />
                    Vista previa
                  </p>
                  <SectionPreview
                    block={styleBlock}
                    theme={builderConfig.theme}
                    userId={profile?.user_id}
                    creatorProfileId={profileId}
                  />
                </div>
              )}
            </>
          )}

          {step?.kind === "publish" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">
                  Antes de publicar
                </p>
                <ul className="mt-3 space-y-2">
                  {checklist.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      {item.isComplete ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                      )}
                      <span
                        className={
                          item.isComplete ? "text-slate-700" : "text-slate-400"
                        }
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 text-white">
                <p className="text-sm font-semibold">Todo listo</p>
                <p className="mt-1 text-sm text-white/70">
                  Publica para que tu perfil sea visible. Puedes seguir
                  editándolo después.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={handlePreview}
                    disabled={isSaving}
                  >
                    <Eye className="h-4 w-4" />
                    Ver vista previa
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handlePublish}
                    disabled={isSaving || isPublishing}
                  >
                    {isPublishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Publicar perfil
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step?.kind === "section" && !currentBlock && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Esta sección aún no está disponible en tu perfil.
            </div>
          )}
        </div>
      </main>

      {/* ─── Pie fijo: navegación ─── */}
      <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={stepIndex === 0}
          >
            <ArrowLeft className="h-4 w-4" />
            Atrás
          </Button>

          <div className="flex items-center gap-1.5">
            {steps.map((wizardStep, index) => (
              <span
                key={wizardStep.key}
                className={[
                  "h-1.5 rounded-full transition-all",
                  index === stepIndex
                    ? "w-5 bg-slate-900"
                    : "w-1.5 bg-slate-300",
                ].join(" ")}
              />
            ))}
          </div>

          {isLastStep ? (
            <Button
              type="button"
              onClick={handlePublish}
              disabled={isSaving || isPublishing}
            >
              <Check className="h-4 w-4" />
              Publicar
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
