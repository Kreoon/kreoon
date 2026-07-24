import {
  BLOCK_DEFINITIONS,
  type ProfileBlock,
} from "@/components/profile-builder/types/profile-builder";
import type { BuilderSection } from "./types";

const FALLBACK_LABELS: Record<string, string> = {
  hero_banner: "Portada",
  about: "Sobre mi",
  portfolio: "Portafolio",
  services: "Servicios",
  pricing: "Precios",
  reviews: "Resenas",
  verified_reviews: "Resenas verificadas",
  contact: "Contacto",
  cta_banner: "CTA",
  whatsapp_button: "WhatsApp",
  recommended_talent: "Talento recomendado",
};

export function blockToSection(block: ProfileBlock): BuilderSection {
  const definition = BLOCK_DEFINITIONS[block.type];
  return {
    id: `section-${block.id}`,
    blockId: block.id,
    type: block.type,
    label:
      FALLBACK_LABELS[block.type] || definition?.label || "Seccion avanzada",
    description:
      definition?.description || "Seccion personalizada del portafolio",
    isVisible: block.isVisible,
    isRequired: definition?.isRequired ?? false,
    isDeletable: definition?.isDeletable ?? true,
    block,
  };
}

export function blocksToSections(blocks: ProfileBlock[]): BuilderSection[] {
  return [...blocks]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(blockToSection);
}

export function getSelectedSection(
  blocks: ProfileBlock[],
  selectedBlockId: string | null,
): BuilderSection | null {
  if (!selectedBlockId) return null;
  const block = blocks.find((item) => item.id === selectedBlockId);
  return block ? blockToSection(block) : null;
}
