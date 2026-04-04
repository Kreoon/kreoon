import { memo, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { BlockProps } from '../types/profile-builder';
import { TextFormatPopup, useTextFormatPopup } from '../TextFormatPopup';

// Renderiza HTML sanitizado
function SafeHtml({ html, className }: { html: string; className?: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'span', 'p', 'br'],
    ALLOWED_ATTR: ['style', 'class'],
  });
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQConfig {
  allowMultipleOpen: boolean;
}

interface FAQContent {
  title?: string;
  items?: FAQItem[];
}

const DEFAULT_ITEMS: FAQItem[] = [
  {
    id: '1',
    question: 'Cual es tu tiempo de entrega?',
    answer:
      'El tiempo de entrega varia segun el paquete. Generalmente entre 3 y 7 dias habiles a partir de la aprobacion del brief.',
  },
  {
    id: '2',
    question: 'Cuantas revisiones incluye?',
    answer:
      'Depende del paquete seleccionado. El basico incluye 1 revision, el estandar 2 y el premium hasta 3 revisiones.',
  },
  {
    id: '3',
    question: 'Los videos incluyen derechos comerciales?',
    answer:
      'Si, todos los videos incluyen licencia para uso en redes sociales organico. Para publicidad paga, se recomienda el paquete Estandar o Premium.',
  },
  {
    id: '4',
    question: 'Como es el proceso de trabajo?',
    answer:
      'Primero hacemos un brief, luego produzco el contenido y te envio un primer borrador. Despues de tus comentarios realizo las revisiones acordadas y entrego el archivo final.',
  },
];

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

function FAQBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as FAQConfig;
  const content = block.content as FAQContent;
  const styles = block.styles;
  const items = content.items || DEFAULT_ITEMS;
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const {
    isOpen,
    editingField,
    editingContent,
    openEditor,
    closeEditor,
  } = useTextFormatPopup();

  const handleContentUpdate = (updates: Partial<FAQContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const handleUpdateItem = (id: string, updates: Partial<FAQItem>) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    handleContentUpdate({ items: newItems });
  };

  const handleSave = (newContent: string) => {
    if (editingField === 'title') {
      handleContentUpdate({ title: newContent });
    } else if (editingField && editingItemId) {
      handleUpdateItem(editingItemId, { [editingField]: newContent });
    }
    setEditingItemId(null);
    closeEditor();
  };

  const openItemEditor = (itemId: string, field: string, content: string) => {
    setEditingItemId(itemId);
    openEditor(field, content);
  };

  const handleAddItem = () => {
    const newItem: FAQItem = {
      id: crypto.randomUUID(),
      question: 'Nueva pregunta?',
      answer: 'Respuesta a la pregunta.',
    };
    handleContentUpdate({ items: [...items, newItem] });
  };

  const handleRemoveItem = (id: string) => {
    handleContentUpdate({ items: items.filter((item) => item.id !== id) });
  };

  return (
    <div
      className={cn('rounded-lg', paddingClasses[styles.padding || 'md'])}
      style={{ backgroundColor: styles.backgroundColor, color: styles.textColor }}
    >
      {/* Titulo - Editable */}
      <div
        className={cn(
          'group relative mb-6',
          isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded-md -mx-2 px-2 py-1 transition-colors'
        )}
        onClick={() => isEditing && isSelected && openEditor('title', content.title || 'Preguntas frecuentes')}
      >
        {isHtml(content.title || '') ? (
          <SafeHtml html={content.title || 'Preguntas frecuentes'} className="text-xl md:text-2xl font-bold text-foreground" />
        ) : (
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            {content.title || 'Preguntas frecuentes'}
          </h2>
        )}
        {isEditing && isSelected && (
          <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Modo edicion: campos editables */}
      {isEditing && isSelected ? (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative rounded-lg border border-border/50 bg-card/30 p-4 flex flex-col gap-3"
            >
              {/* Pregunta - Editable */}
              <div
                className="group/q cursor-pointer hover:bg-primary/5 rounded px-2 -mx-2 py-1 transition-colors"
                onClick={() => openItemEditor(item.id, 'question', item.question)}
              >
                {isHtml(item.question) ? (
                  <SafeHtml html={item.question} className="font-medium text-foreground" />
                ) : (
                  <p className="font-medium text-foreground">{item.question || 'Pregunta...'}</p>
                )}
                <Pencil className="inline-block ml-2 h-3 w-3 text-muted-foreground opacity-0 group-hover/q:opacity-100 transition-opacity" />
              </div>

              {/* Respuesta - Editable */}
              <div
                className="group/a cursor-pointer hover:bg-primary/5 rounded px-2 -mx-2 py-1 transition-colors"
                onClick={() => openItemEditor(item.id, 'answer', item.answer)}
              >
                {isHtml(item.answer) ? (
                  <SafeHtml html={item.answer} className="text-sm text-muted-foreground" />
                ) : (
                  <p className="text-sm text-muted-foreground">{item.answer || 'Respuesta...'}</p>
                )}
                <Pencil className="inline-block ml-2 h-3 w-3 text-muted-foreground opacity-0 group-hover/a:opacity-100 transition-opacity" />
              </div>

              <button
                onClick={() => handleRemoveItem(item.id)}
                className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`Eliminar pregunta ${item.question}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Button
            size="sm"
            variant="outline"
            onClick={handleAddItem}
            className="gap-1 self-start"
          >
            <Plus className="h-4 w-4" />
            Agregar pregunta
          </Button>
        </div>
      ) : (
        /* Modo preview: Accordion de shadcn - separado por tipo para evitar warning de Radix */
        config.allowMultipleOpen ? (
          <Accordion type="multiple" className="w-full space-y-2">
            {items.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className={cn(
                  'rounded-lg border border-border/50 bg-card/30 px-4',
                  'data-[state=open]:bg-card/60',
                )}
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-2">
            {items.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className={cn(
                  'rounded-lg border border-border/50 bg-card/30 px-4',
                  'data-[state=open]:bg-card/60',
                )}
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )
      )}

      {/* Editor Popup */}
      <TextFormatPopup
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItemId(null);
            closeEditor();
          }
        }}
        initialContent={editingContent}
        onSave={handleSave}
        title={
          editingField === 'title' ? 'Editar titulo' :
          editingField === 'question' ? 'Editar pregunta' :
          'Editar respuesta'
        }
        placeholder={
          editingField === 'title' ? 'Titulo de la seccion...' :
          editingField === 'question' ? 'Escribe la pregunta...' :
          'Escribe la respuesta...'
        }
        mode={editingField === 'answer' ? 'block' : 'inline'}
      />
    </div>
  );
}

export const FAQBlock = memo(FAQBlockComponent);
// Alias para BlockRenderer (case-insensitive filesystem en Windows)
export { FAQBlock as FaqBlock };
