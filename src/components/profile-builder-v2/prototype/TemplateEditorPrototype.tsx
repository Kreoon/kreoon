import { useState } from "react";
import { TemplateGallery } from "./TemplateGallery";
import { TemplateEditor } from "./TemplateEditor";
import { getTemplate } from "./registry";

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
  const template = templateId ? getTemplate(templateId) : undefined;

  if (!template) {
    return <TemplateGallery onSelect={setTemplateId} />;
  }

  return (
    <TemplateEditor
      template={template}
      onBack={() => setTemplateId(null)}
      userId={userId}
      creatorProfileId={creatorProfileId}
    />
  );
}
