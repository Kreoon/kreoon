import { HeroSectionEditor } from "./HeroSectionEditor";
import { AboutSectionEditor } from "./AboutSectionEditor";
import { PortfolioSectionEditor } from "./PortfolioSectionEditor";
import { ServicesSectionEditor } from "./ServicesSectionEditor";
import { PricingSectionEditor } from "./PricingSectionEditor";
import { ContactSectionEditor } from "./ContactSectionEditor";
import { AdvancedSectionEditor } from "./AdvancedSectionEditor";
import type { SectionEditorProps } from "./types";

/** Enruta la sección seleccionada al editor simple correspondiente. */
export function SectionEditor({ section, onUpdateBlock }: SectionEditorProps) {
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
