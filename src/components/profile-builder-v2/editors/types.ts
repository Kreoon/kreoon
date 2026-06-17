import type { ProfileBlock } from "@/components/profile-builder/types/profile-builder";
import type { BuilderSection } from "../types";

export interface SectionEditorProps {
  section: BuilderSection;
  onUpdateBlock: (blockId: string, updates: Partial<ProfileBlock>) => void;
}

/** Helpers tipados para actualizar content/config de un bloque sin perder el resto de claves. */
export function patchContent(
  section: BuilderSection,
  patch: Record<string, unknown>,
): Partial<ProfileBlock> {
  return { content: { ...section.block.content, ...patch } };
}

export function patchConfig(
  section: BuilderSection,
  patch: Record<string, unknown>,
): Partial<ProfileBlock> {
  return { config: { ...section.block.config, ...patch } };
}
