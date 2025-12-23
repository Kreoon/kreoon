import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, List, ListOrdered, Heading2, Undo, Redo, Code, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Escribe aquí...",
  editable = true,
  className,
}: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState(content);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
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

  // Parent can change `content` programmatically (e.g., AI generation). TipTap won't auto-sync.
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

  // Sync editor when switching from HTML mode
  useEffect(() => {
    if (!editor) return;
    if (!isHtmlMode) return;
    // In HTML mode, we only track the textarea; keep editor untouched.
  }, [editor, isHtmlMode]);

  const handleHtmlChange = (value: string) => {
    setHtmlContent(value);
    onChange?.(value);
  };

  const toggleHtmlMode = () => {
    if (isHtmlMode && editor) {
      // HTML -> Visual: push the textarea HTML into the editor
      editor.commands.setContent(htmlContent || "", { emitUpdate: false });
    }
    setIsHtmlMode(!isHtmlMode);
  };

  if (!editor) return null;

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-muted/40">
          <div className="flex flex-wrap gap-1">
            {!isHtmlMode && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn(editor.isActive("bold") && "bg-muted")}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn(editor.isActive("italic") && "bg-muted")}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn(editor.isActive("heading", { level: 2 }) && "bg-muted")}
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn(editor.isActive("bulletList") && "bg-muted")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={cn(editor.isActive("orderedList") && "bg-muted")}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <div className="h-6 w-px bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                >
                  <Redo className="h-4 w-4" />
                </Button>
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
            // “Word-like” page feel
            "[&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:p-5",
            "[&_.ProseMirror]:leading-7 [&_.ProseMirror]:text-base",
            "[&_.ProseMirror]:outline-none",
            // Placeholder
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
          )}
        />
      )}
    </div>
  );
}

export function RichTextViewer({ content, className }: { content: string; className?: string }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
  });

  // TipTap viewer doesn't auto-update when `content` changes.
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
    <div className={cn("rounded-lg border bg-card p-5 leading-7 text-base prose prose-sm max-w-none", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
