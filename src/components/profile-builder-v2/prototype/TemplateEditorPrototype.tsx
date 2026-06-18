import { useState } from "react";
import { TemplateGallery } from "./TemplateGallery";
import { GrapesEditor } from "./GrapesEditor";
import { getTemplate } from "./registry";
import {
  loadEditorTheme,
  saveEditorTheme,
  type EditorTheme,
} from "./editorTheme";

interface ProtoProps {
  /** Usuario autenticado (habilita biblioteca de medios + Bunny). */
  userId?: string;
  /** Perfil de creador (para guardar/leer medios del portafolio). */
  creatorProfileId?: string;
}

export function TemplateEditorPrototype({
  userId,
  creatorProfileId,
}: ProtoProps = {}) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [theme, setThemeState] = useState<EditorTheme>(() => loadEditorTheme());
  const template = templateId ? getTemplate(templateId) : undefined;

  const toggleTheme = () => {
    setThemeState((current) => {
      const next: EditorTheme = current === "dark" ? "light" : "dark";
      saveEditorTheme(next);
      return next;
    });
  };

  if (!template) {
    return (
      <TemplateGallery
        onSelect={setTemplateId}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <GrapesEditor
      template={template}
      onBack={() => setTemplateId(null)}
      userId={userId}
      creatorProfileId={creatorProfileId}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
