import type {
  BuilderConfig,
  ProfileBlock,
} from "@/components/profile-builder/types/profile-builder";
import type { BuilderPanel, BuilderSection } from "./types";
import { SectionsPanel } from "./panels/SectionsPanel";
import { StylePanel } from "./panels/StylePanel";
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
  selectedBlockId: string | null;
  builderConfig: BuilderConfig;
  onSelectSection: (blockId: string) => void;
  onToggleVisibility: (blockId: string) => void;
  onMoveSection: (blockId: string, direction: -1 | 1) => void;
  onDeleteSection: (blockId: string) => void;
  onUpdateBlock: (blockId: string, updates: Partial<ProfileBlock>) => void;
  onConfigChange: (updates: Partial<BuilderConfig>) => void;
}

const PANEL_TITLES: Record<BuilderPanel, string> = {
  templates: "Plantillas",
  sections: "Secciones",
  style: "Estilo",
  media: "Medios",
  ai: "Asistente IA",
  publish: "Publicar",
};

export function ContextPanel({
  activePanel,
  selectedSection,
  sections,
  selectedBlockId,
  builderConfig,
  onSelectSection,
  onToggleVisibility,
  onMoveSection,
  onDeleteSection,
  onUpdateBlock,
  onConfigChange,
}: ContextPanelProps) {
  return (
    <aside className="flex w-80 flex-col border-l border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">
          {selectedSection && activePanel === "sections"
            ? selectedSection.label
            : PANEL_TITLES[activePanel]}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{renderPanel()}</div>
    </aside>
  );

  function renderPanel() {
    switch (activePanel) {
      case "sections":
        return selectedSection ? (
          <SectionEditor
            section={selectedSection}
            onUpdateBlock={onUpdateBlock}
          />
        ) : (
          <SectionsPanel
            sections={sections}
            selectedBlockId={selectedBlockId}
            onSelect={onSelectSection}
            onToggleVisibility={onToggleVisibility}
            onMoveUp={(id) => onMoveSection(id, -1)}
            onMoveDown={(id) => onMoveSection(id, 1)}
            onDelete={onDeleteSection}
          />
        );
      case "style":
        return <StylePanel config={builderConfig} onChange={onConfigChange} />;
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Este panel estara disponible pronto.
          </p>
        );
    }
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
