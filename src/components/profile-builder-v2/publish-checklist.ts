import type { ProfileBlock } from "@/components/profile-builder/types/profile-builder";

export interface PublishChecklistItem {
  id: string;
  label: string;
  isComplete: boolean;
}

function itemCount(block: ProfileBlock | undefined, key: string): number {
  const value = (block?.content as Record<string, unknown> | undefined)?.[key];
  return Array.isArray(value) ? value.length : 0;
}

export function getPublishChecklist(
  blocks: ProfileBlock[],
): PublishChecklistItem[] {
  const hero = blocks.find((block) => block.type === "hero_banner");
  const portfolio = blocks.find((block) => block.type === "portfolio");
  const services = blocks.find((block) => block.type === "services");
  const contact = blocks.find(
    (block) =>
      block.type === "contact" ||
      block.type === "cta_banner" ||
      block.type === "whatsapp_button",
  );

  const heroContent =
    (hero?.content as Record<string, unknown> | undefined) ?? {};

  return [
    { id: "hero", label: "Portada configurada", isComplete: !!hero },
    {
      id: "bio",
      label: "Frase principal o bio",
      isComplete: !!(heroContent.subheadline || heroContent.headline),
    },
    {
      id: "portfolio",
      label: "Al menos 3 trabajos",
      isComplete: itemCount(portfolio, "items") >= 3,
    },
    {
      id: "services",
      label: "Al menos 1 servicio",
      isComplete: itemCount(services, "items") >= 1,
    },
    {
      id: "contact",
      label: "Contacto o CTA configurado",
      isComplete: !!contact,
    },
  ];
}
