import { memo } from 'react';
import { Pencil } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';
import { TextFormatPopup, useTextFormatPopup } from '../TextFormatPopup';

interface TextContent {
  title?: string;
  text?: string;
}

// Renderiza HTML sanitizado de forma segura
function SafeHtml({ html, className }: { html: string; className?: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'span', 'p', 'br', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['style', 'href', 'target', 'class'],
  });

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

// Detecta si un string contiene HTML
function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

function TextBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const content = block.content as TextContent;
  const styles = block.styles;

  const {
    isOpen,
    editingField,
    editingContent,
    openEditor,
    closeEditor,
  } = useTextFormatPopup();

  const handleSave = (newContent: string) => {
    if (editingField) {
      onUpdate({
        content: { ...content, [editingField]: newContent },
      });
    }
    closeEditor();
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  const marginClasses = {
    none: 'my-0',
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-6',
    xl: 'my-8',
  };

  const titleContent = content.title || '';
  const textContent = content.text || '';

  return (
    <>
      <div
        className={cn(
          'rounded-lg',
          paddingClasses[styles.padding || 'md'],
          marginClasses[styles.margin || 'sm'],
          styles.shadow === 'sm' && 'shadow-sm',
          styles.shadow === 'md' && 'shadow-md',
          styles.shadow === 'lg' && 'shadow-lg',
        )}
        style={{
          backgroundColor: styles.backgroundColor,
          color: styles.textColor,
        }}
      >
        {/* Title (optional) - Editable */}
        <div
          className={cn(
            'group relative',
            titleContent && 'mb-2',
            isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded-md -mx-2 px-2 py-1 transition-colors'
          )}
          onClick={() => isEditing && isSelected && openEditor('title', titleContent)}
        >
          {titleContent ? (
            isHtml(titleContent) ? (
              <SafeHtml html={titleContent} className="text-lg font-semibold text-foreground" />
            ) : (
              <h3 className="text-lg font-semibold text-foreground">{titleContent}</h3>
            )
          ) : isEditing && isSelected ? (
            <span className="italic text-muted-foreground/50 text-sm">
              Haz clic para agregar titulo...
            </span>
          ) : null}
          {isEditing && isSelected && titleContent && (
            <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Content - Editable */}
        <div
          className={cn(
            'group relative',
            isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded-md -mx-2 px-2 py-2 transition-colors'
          )}
          onClick={() => isEditing && isSelected && openEditor('text', textContent)}
        >
          {textContent ? (
            isHtml(textContent) ? (
              <SafeHtml
                html={textContent}
                className="text-muted-foreground leading-relaxed prose prose-sm prose-invert max-w-none"
              />
            ) : (
              <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {textContent}
              </div>
            )
          ) : (
            <span className="italic text-muted-foreground/50">
              {isEditing ? 'Haz clic para escribir contenido...' : 'Escribe contenido...'}
            </span>
          )}
          {isEditing && isSelected && (
            <Pencil className="absolute right-2 top-2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {/* Editor Popup */}
      <TextFormatPopup
        open={isOpen}
        onOpenChange={(open) => !open && closeEditor()}
        initialContent={editingContent}
        onSave={handleSave}
        title={editingField === 'title' ? 'Editar titulo' : 'Editar contenido'}
        placeholder={editingField === 'title' ? 'Titulo...' : 'Escribe tu contenido aqui...'}
        mode={editingField === 'title' ? 'inline' : 'block'}
      />
    </>
  );
}

export const TextBlock = memo(TextBlockComponent);
