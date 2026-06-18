import type { ProfileBlock } from "@/components/profile-builder/types/profile-builder";

export interface PublishChecklistItem {
  id: string;
  label: string;
  isComplete: boolean;
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

  const portfolioItems = Array.isArray(portfolio?.content?.items)
    ? portfolio!.content.items
    : [];
  const serviceItems = Array.isArray(services?.content?.items)
    ? services!.content.items
    : [];

  return [
    { id: "hero", label: "Portada configurada", isComplete: !!hero },
    {
      id: "bio",
      label: "Bio o frase principal",
      isComplete: !!hero?.content?.subheadline,
    },
    {
      id: "portfolio",
      label: "Minimo 3 trabajos",
      isComplete: portfolioItems.length >= 3,
    },
    {
      id: "services",
      label: "Minimo 1 servicio",
      isComplete: serviceItems.length >= 1,
    },
    {
      id: "contact",
      label: "Contacto o CTA configurado",
      isComplete: !!contact,
    },
  ];
}
