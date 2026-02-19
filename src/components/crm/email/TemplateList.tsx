import { useState } from "react";
import { Plus, Trash2, Edit2, Eye, FileText, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useEmailTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from "@/hooks/useEmailMarketing";
import {
  TEMPLATE_CATEGORY_LABELS,
  type TemplateCategory,
  type EmailTemplate,
} from "@/types/email-marketing.types";

export function TemplateList() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | "all">("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("general");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");

  const { data: templates = [], isLoading } = useEmailTemplates({
    category: categoryFilter === "all" ? undefined : categoryFilter,
    search: search || undefined,
  });

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSubject("");
    setCategory("general");
    setHtmlBody("");
    setTextBody("");
    setEditorOpen(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setName(t.name);
    setSubject(t.subject);
    setCategory(t.category);
    setHtmlBody(t.html_body);
    setTextBody(t.text_body || "");
    setEditorOpen(true);
  };

  const openPreview = (t: EmailTemplate) => {
    setEditing(t);
    setPreviewOpen(true);
  };

  const handleSave = async () => {
    if (editing) {
      await updateTemplate.mutateAsync({
        id: editing.id,
        name,
        subject,
        category,
        html_body: htmlBody,
        text_body: textBody || null,
      });
    } else {
      await createTemplate.mutateAsync({
        name,
        subject,
        category,
        html_body: htmlBody,
        text_body: textBody || null,
        organization_id: null,
        variables: [],
        is_active: true,
        created_by: null,
      });
    }
    setEditorOpen(false);
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando templates...</div>
      ) : templates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No hay templates</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Crear template
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="p-4 group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{template.name}</h3>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{template.subject}</p>
                </div>
                <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                  {TEMPLATE_CATEGORY_LABELS[template.category]}
                </Badge>
              </div>

              {/* Mini preview */}
              <div
                className="mt-3 h-24 overflow-hidden rounded border bg-white text-[6px] leading-tight p-1"
                dangerouslySetInnerHTML={{ __html: template.html_body }}
              />

              <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => openPreview(template)}>
                  <Eye className="h-3 w-3 mr-1" /> Preview
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(template)}>
                  <Edit2 className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => deleteTemplate.mutate(template.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Template" : "Nuevo Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bienvenida" />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Asunto *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto del email" />
            </div>
            <div className="space-y-2">
              <Label>HTML Body *</Label>
              <Textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                placeholder="<html>...</html>"
                rows={12}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Texto plano (fallback)</Label>
              <Textarea
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                placeholder="Versión texto del email..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !subject.trim() || !htmlBody.trim() || isSaving}>
              {editing ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview: {editing?.name}</DialogTitle>
            <DialogDescription>Asunto: {editing?.subject}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              srcDoc={editing?.html_body || ""}
              className="w-full h-[500px] border-0"
              title="Email Preview"
              sandbox=""
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
