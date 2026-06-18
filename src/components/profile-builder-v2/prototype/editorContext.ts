import { createContext, useContext } from "react";
import type { MediaItem } from "@/components/profile-builder/media/types";

export interface EditorMediaCtx {
  userId?: string;
  creatorProfileId?: string;
  /** Abre el MediaLibraryPicker de Kreoon y devuelve el medio elegido. */
  openPicker?: (onPick: (item: MediaItem) => void) => void;
  theme: "dark" | "light";
}

export const EditorMediaContext = createContext<EditorMediaCtx>({
  theme: "dark",
});

export const useEditorMedia = () => useContext(EditorMediaContext);
