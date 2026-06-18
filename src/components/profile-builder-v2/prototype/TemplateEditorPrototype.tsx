import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Render, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { TemplateGallery } from "./TemplateGallery";
import { GrapesEditor } from "./GrapesEditor";
import { getTemplate } from "./registry";
import { puckConfig, PUCK_STORAGE_PREFIX } from "./puckConfig";
import { getTemplateSeed } from "./templateSeeds";
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

function loadPuckData(id: string): Data | null {
  try {
    const raw = localStorage.getItem(PUCK_STORAGE_PREFIX + id);
    return raw ? (JSON.parse(raw) as Data) : getTemplateSeed(id);
  } catch {
    return getTemplateSeed(id);
  }
}

/** Vista pública: renderiza el diseño guardado con <Render> de Puck. */
function PublicRender({ id }: { id: string }) {
  const data = loadPuckData(id);
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0d15] text-slate-400">
        <p>Este perfil aún no tiene un diseño publicado.</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#0f0d15]">
      <Render config={puckConfig} data={data} />
    </div>
  );
}

export function TemplateEditorPrototype({
  userId,
  creatorProfileId,
}: ProtoProps = {}) {
  const [searchParams] = useSearchParams();
  const verId = searchParams.get("ver");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [theme, setThemeState] = useState<EditorTheme>(() => loadEditorTheme());

  // Vista pública (solo lectura) con <Render>.
  if (verId) {
    return <PublicRender id={verId} />;
  }

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
