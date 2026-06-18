import type {
  BlockType,
  ProfileBlock,
} from "@/components/profile-builder/types/profile-builder";

export type BuilderPanel =
  | "templates"
  | "sections"
  | "style"
  | "media"
  | "ai"
  | "publish";

export type DevicePreview = "desktop" | "mobile";

export interface BuilderSection {
  id: string;
  blockId: string;
  type: BlockType;
  label: string;
  description: string;
  isVisible: boolean;
  isRequired: boolean;
  isDeletable: boolean;
  block: ProfileBlock;
}
