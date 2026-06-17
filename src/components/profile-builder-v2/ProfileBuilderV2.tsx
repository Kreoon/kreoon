import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ArrowRight, CheckCircle2, GripVertical, Layers3, Palette, ShieldCheck, Sparkles, Eye, Monitor, Smartphone, Save, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useProfileBuilderData } from '@/components/profile-builder/hooks/useProfileBuilderData';
import {
  DEFAULT_BUILDER_CONFIG,
  type BuilderConfig,
  type ProfileBlock,
} from '@/components/profile-builder/types/profile-builder';
import { CanvasPreview } from './CanvasPreview';
import { blocksToSections, getSelectedSection } from './section-adapter';
import type { BuilderPanel, DevicePreview } from './types';

interface ProfileBuilderV2Props {
  profileId: string;
}

const STEP_META: Record<BuilderPanel, { title: string; copy: string; action: string; icon: typeof Layers3 }> = {
  templates: {
    title: 'Empieza con una base',
    copy: 'Elige un punto de partida y deja que el contenido se acomode solo.',
    action: 'Abrir plantillas',
    icon: Sparkles,
  },
  sections: {
    title: 'Ordena lo importante',
    copy: 'Arrastra o selecciona las secciones para dejar lo esencial arriba.',
    action: 'Ver secciones',
    icon: Layers3,
  },
  style: {
    title: 'Ponlo a tu gusto',
    copy: 'Cambia el color, el estilo y la forma sin tocar nada técnico.',
    action: 'Cambiar estilo',
    icon: Palette,
  },
  media: {
    title: 'Agrega fotos o video',
    copy: 'Sube media cuando quieras; por ahora solo guía visual y acceso rápido.',
    action: 'Ir a media',
    icon: Eye,
  },
  ai: {
    title: 'Pide ayuda a la IA',
    copy: 'Usa sugerencias guiadas para mejorar texto y secciones sin romper nada.',
    action: 'Abrir IA',
    icon: Sparkles,
  },
  publish: {
    title: 'Revisa antes de salir',
    copy: 'Haz el chequeo final y publica cuando todo se vea correcto.',
    action: 'Ver publicación',
    icon: ShieldCheck,
  },
};

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

  const sections = useMemo(() => blocksToSections(blocks), [blocks]);
  const visibleCount = sections.filter((section) => section.isVisible).length;
  const requiredCount = sections.filter((section) => section.isRequired).length;
  const totalCount = sections.length || 1;
  const progressValue = Math.round((visibleCount / totalCount) * 100);
  const currentStepIndex = activePanel === 'templates' ? 0 : activePanel === 'sections' ? 1 : activePanel === 'style' ? 2 : 3;
  const activeStep = STEP_META[activePanel];
  const selectedTitle = selectedSection?.label ?? 'Sin sección seleccionada';

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
      <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#ffffff_100%)] text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-4 py-4 md:px-6">
          <header className="mb-4 rounded-[18px] border border-slate-200 bg-white/85 px-4 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    V2 guiado
                  </Badge>
                  <Badge variant="outline" className="gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {visibleCount} visibles
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                    Construye tu perfil sin pelearte con el editor
                  </h1>
                  <p className="max-w-3xl text-sm text-slate-600 md:text-base">
                    Sigue los pasos de izquierda a derecha: primero ordena, luego ajusta el estilo y al final revisa antes de publicar.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-[16px] border border-slate-200 bg-slate-50/90 p-3 md:min-w-[320px]">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Paso {currentStepIndex + 1} de 4</span>
                  <span>{progressValue}% armado</span>
                </div>
                <Progress value={progressValue} className="h-2" />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setActivePanel('sections')}>
                    <Layers3 className="h-4 w-4" />
                    Ordenar
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setActivePanel('style')}>
                    <Palette className="h-4 w-4" />
                    Estilo
                  </Button>
                  <Button type="button" size="sm" onClick={handlePublish} disabled={isSaving}>
                    <Send className="h-4 w-4" />
                    Publicar
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
            <aside className="min-h-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Haz esto primero</p>
                    <p className="text-xs text-slate-500">Tres pasos simples, sin paneles técnicos.</p>
                  </div>
                  <Badge variant="outline" className="gap-1.5">
                    <GripVertical className="h-3.5 w-3.5" />
                    Simple
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto p-4">
                {(['templates', 'sections', 'style', 'publish'] as BuilderPanel[]).map((panel, index) => {
                  const meta = STEP_META[panel];
                  const Icon = meta.icon;
                  const isActive = activePanel === panel;
                  return (
                    <button
                      key={panel}
                      type="button"
                      onClick={() => setActivePanel(panel)}
                      className={[
                        'group w-full rounded-[18px] border px-4 py-4 text-left transition-all',
                        isActive
                          ? 'border-slate-900 bg-slate-950 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]'
                          : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-3">
                        <div className={[
                          'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold',
                          isActive ? 'border-white/20 bg-white/10 text-white' : 'border-slate-200 bg-white text-slate-900',
                        ].join(' ')}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <p className="text-sm font-semibold">{meta.title}</p>
                          </div>
                          <p className={['mt-1 text-sm leading-5', isActive ? 'text-white/75' : 'text-slate-600'].join(' ')}>
                            {meta.copy}
                          </p>
                          <div className="mt-3 flex items-center gap-2 text-xs font-medium">
                            <span>{meta.action}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Secciones del perfil</span>
                    <span>{sections.length}</span>
                  </div>
                  {sections.map((section) => {
                    const isSelected = section.blockId === selectedBlockId;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setSelectedBlockId(section.blockId)}
                        className={[
                          'flex w-full items-center justify-between gap-3 rounded-[14px] border px-3 py-3 text-left transition-all',
                          isSelected
                            ? 'border-slate-900 bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]'
                            : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{section.label}</p>
                          <p className={['truncate text-xs', isSelected ? 'text-white/70' : 'text-slate-500'].join(' ')}>
                            {section.isVisible ? 'Visible' : 'Oculta'} · {section.isRequired ? 'Necesaria' : 'Opcional'}
                          </p>
                        </div>
                        <Badge variant={section.isVisible ? 'success' : 'outline'} className="shrink-0">
                          {section.isVisible ? 'On' : 'Off'}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <main className="min-h-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.10)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Vista previa</p>
                  <p className="text-xs text-slate-500">
                    Toca una sección para editarla. Todo lo demás queda fuera de tu camino.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                  <Button
                    type="button"
                    variant={device === 'desktop' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setDevice('desktop')}
                  >
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </Button>
                  <Button
                    type="button"
                    variant={device === 'mobile' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setDevice('mobile')}
                  >
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </Button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
                <div className="absolute left-4 top-4 z-10 max-w-[420px] rounded-[18px] border border-sky-200 bg-sky-50/95 px-4 py-3 text-sm text-sky-950 shadow-sm">
                  <p className="font-semibold">Ahora mismo</p>
                  <p className="mt-1 text-sm">
                    {selectedSection
                      ? `Estás editando ${selectedTitle.toLowerCase()}.`
                      : 'Elige una sección para empezar por lo más fácil.'}
                  </p>
                </div>

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
              </div>
            </main>

            <aside className="min-h-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-200 px-4 py-4">
                <p className="text-sm font-semibold text-slate-950">Siguiente paso</p>
                <p className="text-xs text-slate-500">Sin pantallas raras. Solo lo que necesitas hacer ahora.</p>
              </div>

              <div className="space-y-4 overflow-y-auto p-4">
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <ShieldCheck className="h-4 w-4" />
                    {selectedTitle}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedSection
                      ? selectedSection.description
                      : 'Haz clic en una sección a la izquierda para abrirla aquí con instrucciones cortas y directas.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setActivePanel('sections')}>
                      <Layers3 className="h-4 w-4" />
                      Secciones
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setActivePanel('style')}>
                      <Palette className="h-4 w-4" />
                      Estilo
                    </Button>
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-slate-950">Lista rápida</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Bloques visibles</span>
                      <span>{visibleCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Bloques necesarios</span>
                      <span>{requiredCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Guardado</span>
                      <span>{isSaving ? 'Ahora mismo' : isDirty ? 'Pendiente' : 'Listo'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-200 bg-slate-950 px-4 py-4 text-white">
                  <p className="text-sm font-semibold">Acción final</p>
                  <p className="mt-2 text-sm text-white/70">
                    Cuando todo se vea bien, guarda o publica sin tener que buscar botones escondidos.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button type="button" variant="secondary" className="justify-start" onClick={handleSave} disabled={isSaving}>
                      <Save className="h-4 w-4" />
                      Guardar borrador
                    </Button>
                    <Button type="button" className="justify-start" onClick={handlePublish} disabled={isSaving}>
                      <Send className="h-4 w-4" />
                      Publicar perfil
                    </Button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
