import { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TextFormatToolbar } from './TextFormatToolbar';
import { TextFormatPopupProps } from './types';

// ─── Extensiones TipTap (base sin placeholder) ───────────────────────────────
// Nota: StarterKit ya incluye Underline internamente; no se registra por separado.

const BASE_EXTENSIONS = [
  StarterKit.configure({
    // Desactivar historia innecesaria para modo inline simple
    history: {},
  }),
  TextStyle,
  Color,
  FontFamily,
  TextAlign.configure({
    types: ['paragraph', 'heading'],
  }),
];

function buildExtensions(placeholder: string) {
  return [
    ...BASE_EXTENSIONS,
    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),
  ];
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TextFormatPopup({
  open,
  onOpenChange,
  initialContent,
  onSave,
  onCancel,
  title = 'Editar texto',
  placeholder = 'Escribe aquí...',
  mode = 'inline',
}: TextFormatPopupProps) {
  const editor = useEditor({
    extensions: buildExtensions(placeholder),
    content: initialContent,
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'outline-none',
        // Permite espacios y caracteres especiales sin interceptación
        spellCheck: 'true',
      },
      handleKeyDown: (_view, event) => {
        // Guardar con Cmd+Enter en modo block
        if (mode === 'block' && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          handleSave();
          return true;
        }
        return false;
      },
    },
    // Evita warning de SSR/hydration
    immediatelyRender: false,
  });

  // Sincronizar contenido cuando el Dialog se abre con nuevo contenido
  useEffect(() => {
    if (!editor || !open) return;
    const currentHtml = editor.getHTML();
    if (currentHtml !== initialContent) {
      editor.commands.setContent(initialContent || '', { emitUpdate: false });
    }
    // Mover cursor al final al abrir
    setTimeout(() => {
      editor.commands.focus('end');
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialContent]);

  // Limpiar editor al desmontar
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const handleSave = useCallback(() => {
    if (!editor) return;

    // Para modo plain, devolver solo texto sin formato
    if (mode === 'plain') {
      const plainText = editor.getText().trim();
      onSave(plainText);
      return;
    }

    // Para modos inline/block, devolver HTML sanitizado
    const rawHtml = editor.getHTML();
    const sanitized = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4',
        'ul', 'ol', 'li', 'span', 'a',
      ],
      ALLOWED_ATTR: ['style', 'href', 'target', 'rel', 'class'],
    });
    onSave(sanitized);
  }, [editor, onSave, mode]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  // Escape cierra sin guardar — manejado nativamente por el Dialog de Radix

  const minHeight = mode === 'block' ? 'min-h-[180px]' : 'min-h-[80px]';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent
        className="max-w-lg p-0 gap-0 overflow-hidden"
        aria-describedby={undefined}
        // Evitar que clicks dentro de popovers cierren el dialog
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target?.closest?.('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target?.closest?.('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
      >
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-sm font-medium">{title}</DialogTitle>
        </DialogHeader>

        {/* Toolbar + Editor */}
        <div className="mt-3 border rounded-sm mx-4 overflow-hidden bg-background">
          {/* Ocultar toolbar en modo plain */}
          {editor && mode !== 'plain' && <TextFormatToolbar editor={editor} />}

          <EditorContent
            editor={editor}
            className={cn(
              // Área editable
              '[&_.ProseMirror]:p-3',
              `[&_.ProseMirror]:${minHeight}`,
              '[&_.ProseMirror]:text-sm',
              '[&_.ProseMirror]:leading-relaxed',
              '[&_.ProseMirror]:outline-none',
              // Placeholder
              '[&_.ProseMirror_.is-editor-empty:first-child::before]:text-muted-foreground',
              '[&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
              '[&_.ProseMirror_.is-editor-empty:first-child::before]:float-left',
              '[&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none',
              // Estilos básicos de contenido
              '[&_.ProseMirror_strong]:font-bold',
              '[&_.ProseMirror_em]:italic',
              '[&_.ProseMirror_u]:underline',
              '[&_.ProseMirror_p]:mb-1 [&_.ProseMirror_p:last-child]:mb-0',
            )}
          />
        </div>

        {/* Hint de atajo */}
        <div className="px-4 pt-1">
          <p className="text-xs text-muted-foreground">
            {mode === 'block'
              ? 'Cmd+Enter para guardar · Escape para cancelar'
              : 'Escape para cancelar'}
          </p>
        </div>

        {/* Footer */}
        <DialogFooter className="px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
