import { memo } from 'react';
import { Pencil } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';
import { TextFormatPopup, useTextFormatPopup } from '../TextFormatPopup';
import { getBlockStyleObject } from './blockStyles';

interface AboutContent {
  text?: string;
  title?: string;
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

function AboutBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const content = block.content as AboutContent;
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

  const titleContent = content.title || 'Sobre mi';
  const textContent = content.text || '';

  return (
    <>
      <div
        className={cn(
          'rounded-lg',
          paddingClasses[styles.padding || 'md'],
          marginClasses[styles.margin || 'md'],
          styles.backgroundColor ? '' : 'bg-card/50',
          styles.shadow === 'sm' && 'shadow-sm',
          styles.shadow === 'md' && 'shadow-md',
          styles.shadow === 'lg' && 'shadow-lg',
        )}
        style={getBlockStyleObject(styles)}
      >
        {/* Title - Editable */}
        <div
          className={cn(
            'group relative mb-4',
            isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded-md -mx-2 px-2 py-1 transition-colors'
          )}
          onClick={() => isEditing && isSelected && openEditor('title', titleContent)}
        >
          {isHtml(titleContent) ? (
            <SafeHtml html={titleContent} className="text-xl font-semibold text-foreground" />
          ) : (
            <h2 className="text-xl font-semibold text-foreground">{titleContent}</h2>
          )}
          {isEditing && isSelected && (
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
              {isEditing ? 'Haz clic para agregar tu biografia...' : 'Agrega una descripcion sobre ti...'}
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
        title={editingField === 'title' ? 'Editar titulo' : 'Editar descripcion'}
        placeholder={editingField === 'title' ? 'Titulo de la seccion...' : 'Escribe tu biografia aqui...'}
        mode={editingField === 'title' ? 'inline' : 'block'}
      />
    </>
  );
}

export const AboutBlock = memo(AboutBlockComponent);
