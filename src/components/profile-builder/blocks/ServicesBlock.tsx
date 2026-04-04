import { memo, useState } from 'react';
import { Plus, Trash2, Briefcase, Pencil } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
  price?: string;
}

interface ServicesConfig {
  layout: 'cards' | 'list';
  columns: '1' | '2' | '3' | '4';
}

interface ServicesContent {
  title?: string;
  items?: ServiceItem[];
}

const DEFAULT_ITEMS: ServiceItem[] = [
  {
    id: '1',
    title: 'Produccion de contenido',
    description: 'Videos y fotos de alta calidad para tu marca',
    price: 'Desde $200',
  },
  {
    id: '2',
    title: 'UGC Ads',
    description: 'Contenido autentico para campanas publicitarias',
    price: 'Desde $150',
  },
  {
    id: '3',
    title: 'Paquete mensual',
    description: 'Contenido continuo con estrategia de marca',
    price: 'Desde $500',
  },
];

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

// Clases de columnas segun configuracion
const COLUMNS_CLASSES: Record<string, string> = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 md:grid-cols-2',
  '3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

function getColumnsClass(columns: string | number | undefined): string {
  if (!columns) return COLUMNS_CLASSES['3'];
  const key = String(columns);
  return COLUMNS_CLASSES[key] || COLUMNS_CLASSES['3'];
}

function ServicesBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = {
    layout: 'cards',
    columns: '3',
    ...block.config,
  } as ServicesConfig;
  const content = block.content as ServicesContent;
  const styles = block.styles;
  const items = content.items || DEFAULT_ITEMS;
  const [newTitle, setNewTitle] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const {
    isOpen,
    editingField,
    editingContent,
    openEditor,
    closeEditor,
  } = useTextFormatPopup();

  const handleContentUpdate = (updates: Partial<ServicesContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const handleUpdateItem = (id: string, updates: Partial<ServiceItem>) => {
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
    const newItem: ServiceItem = {
      id: crypto.randomUUID(),
      title: newTitle || 'Nuevo servicio',
      description: 'Descripcion del servicio',
      price: '',
    };
    handleContentUpdate({ items: [...items, newItem] });
    setNewTitle('');
  };

  const handleRemoveItem = (id: string) => {
    handleContentUpdate({ items: items.filter((item) => item.id !== id) });
  };

  return (
    <div
      className={cn('rounded-lg', paddingClasses[styles.padding || 'md'])}
      style={{ backgroundColor: styles.backgroundColor, color: styles.textColor }}
    >
      {/* Titulo de seccion - Editable */}
      <div
        className={cn(
          'group relative mb-6',
          isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded-md -mx-2 px-2 py-1 transition-colors'
        )}
        onClick={() => isEditing && isSelected && openEditor('title', content.title || 'Mis Servicios')}
      >
        {isHtml(content.title || '') ? (
          <SafeHtml html={content.title || 'Mis Servicios'} className="text-xl md:text-2xl font-bold text-foreground" />
        ) : (
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            {content.title || 'Mis Servicios'}
          </h2>
        )}
        {isEditing && isSelected && (
          <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Items */}
      <div
        className={cn(
          config.layout === 'cards'
            ? cn('grid gap-4', getColumnsClass(config.columns))
            : 'flex flex-col gap-3',
        )}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'relative rounded-lg border border-border/50 bg-card/50 transition-shadow hover:shadow-md',
              config.layout === 'cards' ? 'p-5' : 'p-4 flex items-start gap-4',
            )}
          >
            {/* Icono */}
            <div
              className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center',
                config.layout === 'list' ? '' : 'mb-3',
              )}
            >
              <Briefcase className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Titulo del servicio - Editable */}
              <div
                className={cn(
                  'group/title relative mb-1',
                  isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors'
                )}
                onClick={() => isEditing && isSelected && openItemEditor(item.id, 'title', item.title)}
              >
                {isHtml(item.title) ? (
                  <SafeHtml html={item.title} className="font-semibold text-foreground" />
                ) : (
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                )}
                {isEditing && isSelected && (
                  <Pencil className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity" />
                )}
              </div>

              {/* Descripcion del servicio - Editable */}
              <div
                className={cn(
                  'group/desc relative mb-2',
                  isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors'
                )}
                onClick={() => isEditing && isSelected && openItemEditor(item.id, 'description', item.description)}
              >
                {isHtml(item.description) ? (
                  <SafeHtml html={item.description} className="text-sm text-muted-foreground leading-relaxed" />
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                )}
                {isEditing && isSelected && (
                  <Pencil className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-0 group-hover/desc:opacity-100 transition-opacity" />
                )}
              </div>

              {/* Precio - Input simple */}
              {isEditing && isSelected ? (
                <Input
                  value={item.price || ''}
                  onChange={(e) => handleUpdateItem(item.id, { price: e.target.value })}
                  placeholder="Precio (ej: Desde $200)"
                  className="text-sm bg-transparent border-border/50 h-7"
                />
              ) : item.price ? (
                <span className="text-sm font-medium text-primary">{item.price}</span>
              ) : null}
            </div>

            {isEditing && isSelected && (
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`Eliminar servicio ${item.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Boton agregar */}
      {isEditing && isSelected && (
        <div className="flex gap-2 mt-4">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nombre del nuevo servicio"
            className="bg-transparent border-border/50"
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddItem}
            className="flex-shrink-0 gap-1"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
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
        title={editingField === 'title' ? 'Editar titulo' : editingField === 'description' ? 'Editar descripcion' : 'Editar texto'}
        placeholder={editingField === 'title' ? 'Titulo...' : 'Descripcion...'}
        mode={editingField === 'title' ? 'inline' : 'block'}
      />
    </div>
  );
}

export const ServicesBlock = memo(ServicesBlockComponent);
