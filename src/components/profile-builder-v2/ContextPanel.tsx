import { useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BlockType,
  BuilderConfig,
  ProfileBlock,
  ProfileTemplate,
} from "@/components/profile-builder/types/profile-builder";
import type { BuilderPanel, BuilderSection } from "./types";
import { SectionsPanel } from "./panels/SectionsPanel";
import { StylePanel } from "./panels/StylePanel";
import { TemplatesPanel, type ApplyMode } from "./panels/TemplatesPanel";
import { PublishPanel } from "./panels/PublishPanel";
import { AIPanel } from "./panels/AIPanel";
import { AddSectionPanel } from "./panels/AddSectionPanel";
import {
  HeroSectionEditor,
  AboutSectionEditor,
  PortfolioSectionEditor,
  ServicesSectionEditor,
  PricingSectionEditor,
  ContactSectionEditor,
  AdvancedSectionEditor,
} from "./editors";

interface ContextPanelProps {
  activePanel: BuilderPanel;
  selectedSection: BuilderSection | null;
  sections: BuilderSection[];
  blocks: ProfileBlock[];
  selectedBlockId: string | null;
  builderConfig: BuilderConfig;
  currentTemplate?: string;
  canUsePro: boolean;
  canUsePremium: boolean;
  isSaving: boolean;
  onSelectSection: (blockId: string) => void;
  onToggleVisibility: (blockId: string) => void;
  onMoveSection: (blockId: string, direction: -1 | 1) => void;
  onDeleteSection: (blockId: string) => void;
  onUpdateBlock: (blockId: string, updates: Partial<ProfileBlock>) => void;
  onConfigChange: (updates: Partial<BuilderConfig>) => void;
  onApplyTemplate: (template: ProfileTemplate, mode: ApplyMode) => void;
  onPreview: () => void;
  onPublish: () => void;
  onAddSection: (type: BlockType) => void;
  onClearSelection: () => void;
  /** Solo < md: el panel se muestra como hoja inferior cuando está abierto. */
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const PANEL_TITLES: Record<BuilderPanel, string> = {
  templates: "Plantillas",
  sections: "Secciones",
  style: "Estilo",
  media: "Medios",
  ai: "Asistente IA",
  publish: "Publicar",
};

export function ContextPanel(props: ContextPanelProps) {
  const { activePanel, selectedSection, isMobileOpen, onCloseMobile } = props;
  const [isAdding, setIsAdding] = useState(false);
  const showAdd = isAdding && activePanel === "sections" && !selectedSection;
  const headerTitle = showAdd
    ? "Añadir sección"
    : selectedSection && activePanel === "sections"
      ? selectedSection.label
      : PANEL_TITLES[activePanel];

  return (
    <aside
      className={cn(
        "flex-col border-border bg-card",
        // Móvil: hoja inferior sobre el lienzo, encima de la barra de herramientas inferior
        "fixed inset-x-0 bottom-16 z-40 max-h-[70dvh] rounded-t-2xl border-t shadow-2xl",
        // Escritorio: panel lateral fijo
        "md:static md:z-auto md:flex md:max-h-none md:w-80 md:rounded-none md:border-l md:border-t-0 md:shadow-none",
        isMobileOpen ? "flex" : "hidden",
      )}
      aria-label={headerTitle}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="truncate text-sm font-semibold">{headerTitle}</h2>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Cerrar panel"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-4">
        {renderPanel(props, showAdd, setIsAdding)}
      </div>
    </aside>
  );
}

function renderPanel(
  props: ContextPanelProps,
  showAdd: boolean,
  setIsAdding: (value: boolean) => void,
) {
  switch (props.activePanel) {
    case "sections":
      if (showAdd) {
        return (
          <AddSectionPanel
            blocks={props.blocks}
            onBack={() => setIsAdding(false)}
            onAdd={(type) => {
              setIsAdding(false);
              props.onAddSection(type);
            }}
          />
        );
      }
      return props.selectedSection ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={props.onClearSelection}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a las secciones
          </button>
          <SectionEditor
            section={props.selectedSection}
            onUpdateBlock={props.onUpdateBlock}
          />
        </div>
      ) : (
        <SectionsPanel
          sections={props.sections}
          selectedBlockId={props.selectedBlockId}
          onSelect={props.onSelectSection}
          onToggleVisibility={props.onToggleVisibility}
          onMoveUp={(id) => props.onMoveSection(id, -1)}
          onMoveDown={(id) => props.onMoveSection(id, 1)}
          onDelete={props.onDeleteSection}
          onAddClick={() => setIsAdding(true)}
        />
      );
    case "style":
      return (
        <StylePanel
          config={props.builderConfig}
          onChange={props.onConfigChange}
        />
      );
    case "templates":
      return (
        <TemplatesPanel
          currentTemplate={props.currentTemplate}
          canUsePro={props.canUsePro}
          canUsePremium={props.canUsePremium}
          onApplyTemplate={props.onApplyTemplate}
        />
      );
    case "publish":
      return (
        <PublishPanel
          blocks={props.blocks}
          isSaving={props.isSaving}
          onPreview={props.onPreview}
          onPublish={props.onPublish}
        />
      );
    case "ai":
      return <AIPanel selectedLabel={props.selectedSection?.label} />;
    default:
      return (
        <p className="text-sm text-muted-foreground">
          Este panel estara disponible pronto.
        </p>
      );
  }
}

function SectionEditor({
  section,
  onUpdateBlock,
}: {
  section: BuilderSection;
  onUpdateBlock: (blockId: string, updates: Partial<ProfileBlock>) => void;
}) {
  switch (section.type) {
    case "hero_banner":
      return (
        <HeroSectionEditor section={section} onUpdateBlock={onUpdateBlock} />
      );
    case "about":
      return (
        <AboutSectionEditor section={section} onUpdateBlock={onUpdateBlock} />
      );
    case "portfolio":
      return (
        <PortfolioSectionEditor
          section={section}
          onUpdateBlock={onUpdateBlock}
        />
      );
    case "services":
      return (
        <ServicesSectionEditor
          section={section}
          onUpdateBlock={onUpdateBlock}
        />
      );
    case "pricing":
      return (
        <PricingSectionEditor section={section} onUpdateBlock={onUpdateBlock} />
      );
    case "contact":
      return (
        <ContactSectionEditor section={section} onUpdateBlock={onUpdateBlock} />
      );
    default:
      return (
        <AdvancedSectionEditor
          section={section}
          onUpdateBlock={onUpdateBlock}
        />
      );
  }
}
