import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, List, ListOrdered, Heading2, Undo, Redo, Code, Eye } from "lucide-react";
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
                {features.bold !== false && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn(editor.isActive("bold") && "bg-muted")}
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
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                )}
                {features.lists !== false && (
                  <>
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
                  </>
                )}
                {features.history !== false && (
                  <>
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
    <div className={cn(
      "rounded-lg border bg-card p-5 leading-7 text-base",
      // Enhanced prose styling for script content
      "prose prose-sm dark:prose-invert max-w-none",
      // Headers
      "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-3 [&_h2]:text-foreground",
      "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground",
      "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-2",
      // Paragraphs with generous spacing
      "[&_p]:leading-relaxed [&_p]:mb-4 [&_p]:last:mb-0",
      // Emphasis styling (tone indicators)
      "[&_em]:text-muted-foreground [&_em]:font-medium [&_em]:text-xs [&_em]:uppercase [&_em]:tracking-wide [&_em]:bg-muted/60 [&_em]:px-2 [&_em]:py-1 [&_em]:rounded [&_em]:not-italic [&_em]:inline-block [&_em]:mb-2",
      // Strong styling
      "[&_strong]:font-bold [&_strong]:text-foreground",
      // Lists with good spacing
      "[&_ul]:space-y-2 [&_ul]:pl-4 [&_ul]:mb-4 [&_ul]:list-disc",
      "[&_ol]:space-y-2 [&_ol]:pl-4 [&_ol]:mb-4 [&_ol]:list-decimal",
      "[&_li]:leading-relaxed [&_li]:pl-1",
      // Underline for CTAs
      "[&_u]:underline [&_u]:decoration-2 [&_u]:underline-offset-4 [&_u]:decoration-primary",
      className
    )}>
      <EditorContent editor={editor} />
    </div>
  );
}
