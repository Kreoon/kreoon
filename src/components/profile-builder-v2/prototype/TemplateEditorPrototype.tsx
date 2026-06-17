import { useState } from "react";
import { TemplateGallery } from "./TemplateGallery";
import { TemplateEditor } from "./TemplateEditor";
import { getTemplate } from "./registry";

export function TemplateEditorPrototype() {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const template = templateId ? getTemplate(templateId) : undefined;

  if (!template) {
    return <TemplateGallery onSelect={setTemplateId} />;
  }

  return (
    <TemplateEditor template={template} onBack={() => setTemplateId(null)} />
  );
}
