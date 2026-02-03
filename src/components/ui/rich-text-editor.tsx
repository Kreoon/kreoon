import { useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Undo,
  Redo,
  Code,
  Eye,
  Link2,
  Table as TableIcon,
  CheckSquare,
  Image as ImageIcon,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TextEditorFeatures {
  headings?: boolean;
  bold?: boolean;
  italic?: boolean;
  lists?: boolean;
  quotes?: boolean;
  code?: boolean;
  highlight?: boolean;
  emojis?: boolean;
  comments?: boolean;
  history?: boolean;
  links?: boolean;
  tables?: boolean;
  checklist?: boolean;
  images?: boolean;
}

interface RichTextEditorProps {
  content: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  features?: TextEditorFeatures;
}

const DEFAULT_FEATURES: TextEditorFeatures = {
  headings: true,
  bold: true,
  italic: true,
  lists: true,
  quotes: true,
  code: true,
  highlight: true,
  emojis: true,
  comments: true,
  history: true,
  links: true,
  tables: true,
  checklist: true,
  images: true,
};

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Escribe aquí...",
  editable = true,
  className,
  features = DEFAULT_FEATURES,
}: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState(content);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 cursor-pointer",
        },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: "max-w-full rounded-lg my-2",
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHtmlContent(html);
      onChange?.(html);
    },
  });

  // Parent can change content programmatically (e.g., AI generation).
  useEffect(() => {
    if (content !== htmlContent) setHtmlContent(content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useEffect(() => {
    if (!editor) return;
    if (isHtmlMode) return;
    const currentHtml = editor.getHTML();
    if (currentHtml !== content) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [content, editor, isHtmlMode]);

  const handleHtmlChange = (value: string) => {
    setHtmlContent(value);
    onChange?.(value);
  };

  const toggleHtmlMode = () => {
    if (isHtmlMode && editor) {
      editor.commands.setContent(htmlContent || "", { emitUpdate: false });
    }
    setIsHtmlMode(!isHtmlMode);
  };

  const setLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkUrl("");
    setLinkOpen(false);
  }, [editor, linkUrl]);

  const insertImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl("");
    setImageOpen(false);
  }, [editor, imageUrl]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-muted/40">
          <div className="flex flex-wrap items-center gap-1">
            {!isHtmlMode && (
              <>
                {/* Formatting */}
                {features.bold !== false && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn(editor.isActive("bold") && "bg-muted")}
                    title="Negrita"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                )}
                {features.italic !== false && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn(editor.isActive("italic") && "bg-muted")}
                    title="Cursiva"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                )}
                {features.headings !== false && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn(editor.isActive("heading", { level: 2 }) && "bg-muted")}
                    title="Título"
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                )}

                {/* Lists */}
                {features.lists !== false && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      className={cn(editor.isActive("bulletList") && "bg-muted")}
                      title="Lista"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      className={cn(editor.isActive("orderedList") && "bg-muted")}
                      title="Lista numerada"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Checklist */}
                {features.checklist !== false && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    className={cn(editor.isActive("taskList") && "bg-muted")}
                    title="Lista de tareas"
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                )}

                <div className="h-6 w-px bg-border mx-1" />

                {/* Link */}
                {features.links !== false && (
                  <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(editor.isActive("link") && "bg-muted")}
                        title="Enlace"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium">Insertar enlace</span>
                        <Input
                          placeholder="https://..."
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && setLink()}
                        />
                        <div className="flex gap-2 justify-end">
                          {editor.isActive("link") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                editor.chain().focus().unsetLink().run();
                                setLinkOpen(false);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Quitar
                            </Button>
                          )}
                          <Button size="sm" onClick={setLink}>
                            Aplicar
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Table */}
                {features.tables !== false && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(editor.isActive("table") && "bg-muted")}
                        title="Tabla"
                      >
                        <TableIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() =>
                            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                          }
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Insertar tabla
                        </Button>
                        {editor.isActive("table") && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start"
                              onClick={() => editor.chain().focus().addColumnAfter().run()}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Agregar columna
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start"
                              onClick={() => editor.chain().focus().addRowAfter().run()}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Agregar fila
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start"
                              onClick={() => editor.chain().focus().deleteColumn().run()}
                            >
                              <Minus className="h-4 w-4 mr-2" />
                              Eliminar columna
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start"
                              onClick={() => editor.chain().focus().deleteRow().run()}
                            >
                              <Minus className="h-4 w-4 mr-2" />
                              Eliminar fila
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start text-destructive"
                              onClick={() => editor.chain().focus().deleteTable().run()}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar tabla
                            </Button>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Image */}
                {features.images !== false && (
                  <Popover open={imageOpen} onOpenChange={setImageOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" title="Imagen">
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium">Insertar imagen (URL)</span>
                        <Input
                          placeholder="https://..."
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && insertImage()}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" onClick={insertImage}>
                            Insertar
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {/* History */}
                {features.history !== false && (
                  <>
                    <div className="h-6 w-px bg-border mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().undo().run()}
                      disabled={!editor.can().undo()}
                      title="Deshacer"
                    >
                      <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().redo().run()}
                      disabled={!editor.can().redo()}
                      title="Rehacer"
                    >
                      <Redo className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>

          <Button
            type="button"
            variant={isHtmlMode ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleHtmlMode}
            className="gap-1"
          >
            {isHtmlMode ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
            <span className="text-xs">{isHtmlMode ? "Visual" : "HTML"}</span>
          </Button>
        </div>
      )}

      {isHtmlMode ? (
        <Textarea
          value={htmlContent}
          onChange={(e) => handleHtmlChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[220px] border-0 rounded-none font-mono text-sm resize-none focus-visible:ring-0"
        />
      ) : (
        <EditorContent
          editor={editor}
          className={cn(
            "bg-background",
            // Word-like feel
            "[&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:p-5",
            "[&_.ProseMirror]:leading-7 [&_.ProseMirror]:text-base",
            "[&_.ProseMirror]:outline-none",
            // Placeholder
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
            // Table styling
            "[&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:mb-4",
            "[&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-muted",
            "[&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:p-2",
            // Task list styling
            "[&_.ProseMirror_ul[data-type='taskList']]:list-none [&_.ProseMirror_ul[data-type='taskList']]:pl-0",
            "[&_.ProseMirror_li[data-type='taskItem']]:flex [&_.ProseMirror_li[data-type='taskItem']]:gap-2",
            "[&_.ProseMirror_li[data-type='taskItem']_input]:mt-1"
          )}
        />
      )}
    </div>
  );
}

export function RichTextViewer({ content, className }: { content: string; className?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 cursor-pointer",
        },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: "max-w-full rounded-lg my-2",
        },
      }),
    ],
    content,
    editable: false,
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (currentHtml !== content) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return <div className={cn("p-4 bg-muted rounded-lg", className)}>{content || "Sin contenido"}</div>;
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5 leading-7 text-base",
        "prose prose-sm dark:prose-invert max-w-none",
        // Headers
        "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-3 [&_h2]:text-foreground",
        "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground",
        "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-2",
        // Paragraphs
        "[&_p]:leading-relaxed [&_p]:mb-4 [&_p]:last:mb-0",
        // Emphasis
        "[&_em]:text-muted-foreground [&_em]:font-medium [&_em]:text-xs [&_em]:uppercase [&_em]:tracking-wide [&_em]:bg-muted/60 [&_em]:px-2 [&_em]:py-1 [&_em]:rounded [&_em]:not-italic [&_em]:inline-block [&_em]:mb-2",
        "[&_strong]:font-bold [&_strong]:text-foreground",
        // Lists
        "[&_ul]:space-y-2 [&_ul]:pl-4 [&_ul]:mb-4 [&_ul]:list-disc",
        "[&_ol]:space-y-2 [&_ol]:pl-4 [&_ol]:mb-4 [&_ol]:list-decimal",
        "[&_li]:leading-relaxed [&_li]:pl-1",
        // Underline
        "[&_u]:underline [&_u]:decoration-2 [&_u]:underline-offset-4 [&_u]:decoration-primary",
        // Table
        "[&_table]:border-collapse [&_table]:w-full [&_table]:mb-4",
        "[&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted",
        "[&_td]:border [&_td]:border-border [&_td]:p-2",
        // Task list
        "[&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']]:pl-0",
        "[&_li[data-type='taskItem']]:flex [&_li[data-type='taskItem']]:gap-2",
        "[&_li[data-type='taskItem']_input]:mt-1",
        className
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
