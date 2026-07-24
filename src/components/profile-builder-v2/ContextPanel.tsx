import type {
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
  const { activePanel, selectedSection } = props;
  const headerTitle =
    selectedSection && activePanel === "sections"
      ? selectedSection.label
      : PANEL_TITLES[activePanel];

  return (
    <aside className="flex w-80 flex-col border-l border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{headerTitle}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{renderPanel(props)}</div>
    </aside>
  );
}

function renderPanel(props: ContextPanelProps) {
  switch (props.activePanel) {
    case "sections":
      return props.selectedSection ? (
        <SectionEditor
          section={props.selectedSection}
          onUpdateBlock={props.onUpdateBlock}
        />
      ) : (
        <SectionsPanel
          sections={props.sections}
          selectedBlockId={props.selectedBlockId}
          onSelect={props.onSelectSection}
          onToggleVisibility={props.onToggleVisibility}
          onMoveUp={(id) => props.onMoveSection(id, -1)}
          onMoveDown={(id) => props.onMoveSection(id, 1)}
          onDelete={props.onDeleteSection}
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
