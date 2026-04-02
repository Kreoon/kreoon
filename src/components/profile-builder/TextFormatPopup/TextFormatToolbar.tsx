import { type Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#000000', '#4B5563', '#FFFFFF',
  '#8B5CF6', '#EC4899', '#3B82F6',
  '#10B981', '#F59E0B', '#EF4444',
];

interface FontOption {
  value: string;
  label: string;
}

const AVAILABLE_FONTS: FontOption[] = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'system-ui, sans-serif', label: 'Sistema' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Playfair Display", serif', label: 'Playfair' },
  { value: 'monospace', label: 'Monospace' },
];

// ─── Componente ───────────────────────────────────────────────────────────────

interface TextFormatToolbarProps {
  editor: Editor;
}

export function TextFormatToolbar({ editor }: TextFormatToolbarProps) {
  const currentColor = editor.getAttributes('textStyle').color as string | undefined;

  const handleColorSelect = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };

  const handleFontSelect = (fontFamily: string) => {
    editor.chain().focus().setFontFamily(fontFamily).run();
  };

  const currentFont = editor.getAttributes('textStyle').fontFamily as string | undefined;
  const currentFontLabel =
    AVAILABLE_FONTS.find((f) => f.value === currentFont)?.label ?? 'Fuente';

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/40">
      {/* Bold */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('bold') && 'bg-muted')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Negrita"
        title="Negrita (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>

      {/* Italic */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('italic') && 'bg-muted')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Cursiva"
        title="Cursiva (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>

      {/* Underline */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('underline') && 'bg-muted')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Subrayado"
        title="Subrayado (Ctrl+U)"
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>

      {/* Separador */}
      <div className="h-5 w-px bg-border mx-1" aria-hidden="true" />

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            aria-label="Color de texto"
            title="Color de texto"
          >
            <span className="text-xs font-medium">A</span>
            <span
              className="w-3 h-1 rounded-full border border-border/50"
              style={{ backgroundColor: currentColor ?? '#000000' }}
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-2"
          align="start"
          data-dialog-ignore-outside
        >
          <p className="text-xs text-muted-foreground mb-2">Color de texto</p>
          <div className="grid grid-cols-3 gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  'w-6 h-6 rounded border border-border/60 hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  currentColor === color && 'ring-2 ring-ring ring-offset-1'
                )}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                aria-label={`Color ${color}`}
                title={color}
              />
            ))}
          </div>
          {/* Input hex manual */}
          <div className="mt-2 flex items-center gap-1.5">
            <input
              type="color"
              className="h-6 w-6 cursor-pointer rounded border border-border/60 bg-transparent p-0"
              value={currentColor ?? '#000000'}
              onChange={(e) => handleColorSelect(e.target.value)}
              aria-label="Color personalizado"
              title="Color personalizado"
            />
            <span className="text-xs text-muted-foreground">Personalizado</span>
          </div>
        </PopoverContent>
      </Popover>

      {/* Fuente */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs max-w-[80px] truncate"
            aria-label="Seleccionar fuente"
            title="Fuente"
          >
            {currentFontLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-40 p-1"
          align="start"
          data-dialog-ignore-outside
        >
          <p className="text-xs text-muted-foreground px-2 py-1">Fuente</p>
          {AVAILABLE_FONTS.map((font) => (
            <button
              key={font.value}
              type="button"
              className={cn(
                'w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted transition-colors',
                currentFont === font.value && 'bg-muted font-medium'
              )}
              style={{ fontFamily: font.value }}
              onClick={() => handleFontSelect(font.value)}
            >
              {font.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Separador */}
      <div className="h-5 w-px bg-border mx-1" aria-hidden="true" />

      {/* Alineación */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive({ textAlign: 'left' }) && 'bg-muted')}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        aria-label="Alinear izquierda"
        title="Alinear izquierda"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive({ textAlign: 'center' }) && 'bg-muted')}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        aria-label="Centrar"
        title="Centrar"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive({ textAlign: 'right' }) && 'bg-muted')}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        aria-label="Alinear derecha"
        title="Alinear derecha"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive({ textAlign: 'justify' }) && 'bg-muted')}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        aria-label="Justificar"
        title="Justificar"
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
