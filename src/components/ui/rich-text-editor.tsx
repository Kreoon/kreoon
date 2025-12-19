import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bold, Italic, List, ListOrdered, Heading2, Undo, Redo, Code, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  className 
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

  // Sync editor when switching from HTML mode
  useEffect(() => {
    if (editor && !isHtmlMode) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== htmlContent) {
        editor.commands.setContent(htmlContent);
      }
    }
  }, [isHtmlMode, editor, htmlContent]);

  const handleHtmlChange = (value: string) => {
    setHtmlContent(value);
    onChange?.(value);
  };

  const toggleHtmlMode = () => {
    if (isHtmlMode && editor) {
      // Switching from HTML to visual mode - update editor
      editor.commands.setContent(htmlContent);
    }
    setIsHtmlMode(!isHtmlMode);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-background", className)}>
      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-1 p-2 border-b bg-muted/50">
          <div className="flex flex-wrap gap-1">
            {!isHtmlMode && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn(editor.isActive('bold') && 'bg-muted')}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn(editor.isActive('italic') && 'bg-muted')}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn(editor.isActive('heading', { level: 2 }) && 'bg-muted')}
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn(editor.isActive('bulletList') && 'bg-muted')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={cn(editor.isActive('orderedList') && 'bg-muted')}
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
            <span className="text-xs">{isHtmlMode ? 'Visual' : 'HTML'}</span>
          </Button>
        </div>
      )}
      
      {isHtmlMode ? (
        <Textarea
          value={htmlContent}
          onChange={(e) => handleHtmlChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[200px] border-0 rounded-none font-mono text-sm resize-none focus-visible:ring-0"
        />
      ) : (
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
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

  if (!editor) {
    return <div className={cn("p-4 bg-muted rounded-lg", className)}>{content || "Sin contenido"}</div>;
  }

  return (
    <div className={cn("prose prose-sm max-w-none p-4 bg-muted/30 rounded-lg border min-h-[100px]", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}