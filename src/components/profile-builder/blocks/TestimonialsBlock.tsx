import { memo, useState } from 'react';
import { Plus, Trash2, Quote, Pencil, Camera } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BlockProps } from '../types/profile-builder';
import { TextFormatPopup, useTextFormatPopup } from '../TextFormatPopup';
import { MediaLibraryPicker } from '../media/MediaLibraryPicker';
import type { MediaItem } from '../media/types';
import { getBlockStyleObject } from './blockStyles';

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

interface TestimonialItem {
  id: string;
  author: string;
  role?: string;
  company?: string;
  avatar?: string;
  text: string;
}

interface TestimonialsConfig {
  layout: 'grid' | 'featured';
}

interface TestimonialsContent {
  title?: string;
  items?: TestimonialItem[];
}

const DEFAULT_ITEMS: TestimonialItem[] = [
  {
    id: '1',
    author: 'Maria Garcia',
    role: 'Marketing Manager',
    company: 'Marca Colombia',
    text: 'El contenido que creo es simplemente increible. Cada video captura exactamente la esencia de nuestra marca y genera engagement real con nuestra audiencia.',
  },
  {
    id: '2',
    author: 'Carlos Lopez',
    role: 'CEO',
    company: 'Startup Tech',
    text: 'Trabajar con este creador transformo completamente nuestra estrategia de contenido. Los resultados hablan por si solos: 3x mas engagement en el primer mes.',
  },
  {
    id: '3',
    author: 'Ana Rodriguez',
    role: 'Brand Director',
    company: 'Fashion Brand',
    text: 'Profesionalismo, creatividad y entrega puntual. Exactamente lo que necesitabamos para nuestras campanas de temporada.',
  },
];

function TestimonialsBlockComponent({ block, isEditing, isSelected, onUpdate, userId, creatorProfileId }: BlockProps) {
  const content = block.content as TestimonialsContent;
  const styles = block.styles;
  const items = content.items || DEFAULT_ITEMS;
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Estado para media picker (avatars)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [editingAvatarItemId, setEditingAvatarItemId] = useState<string | null>(null);

  const {
    isOpen,
    editingField,
    editingContent,
    openEditor,
    closeEditor,
  } = useTextFormatPopup();

  const handleContentUpdate = (updates: Partial<TestimonialsContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const handleUpdateItem = (id: string, updates: Partial<TestimonialItem>) => {
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

  const handleEditAvatar = (itemId: string) => {
    setEditingAvatarItemId(itemId);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (media: MediaItem) => {
    if (editingAvatarItemId) {
      handleUpdateItem(editingAvatarItemId, { avatar: media.url });
    }
    setMediaPickerOpen(false);
    setEditingAvatarItemId(null);
  };

  const handleAddItem = () => {
    const newItem: TestimonialItem = {
      id: crypto.randomUUID(),
      author: 'Cliente satisfecho',
      role: 'Cargo',
      company: 'Empresa',
      text: 'Testimonio del cliente sobre el trabajo realizado.',
    };
    handleContentUpdate({ items: [...items, newItem] });
  };

  const handleRemoveItem = (id: string) => {
    handleContentUpdate({ items: items.filter((item) => item.id !== id) });
  };

  return (
    <div style={getBlockStyleObject(styles)}>
      {/* Titulo - Editable */}
      <div
        className={cn(
          'group relative mb-8',
          isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded-md -mx-2 px-2 py-1 transition-colors'
        )}
        onClick={() => isEditing && isSelected && openEditor('title', content.title || 'Testimonios')}
      >
        {isHtml(content.title || '') ? (
          <SafeHtml html={content.title || 'Testimonios'} className="text-xl md:text-2xl font-bold text-foreground" />
        ) : (
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            {content.title || 'Testimonios'}
          </h2>
        )}
        {isEditing && isSelected && (
          <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative bg-card/50 rounded-xl border border-border/50 p-6 flex flex-col gap-4 group"
          >
            {/* Icono de cita */}
            <Quote className="h-8 w-8 text-primary/20 flex-shrink-0" />

            {/* Texto del testimonio - Editable */}
            <div
              className={cn(
                'group/text relative flex-1',
                isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 py-1 transition-colors'
              )}
              onClick={() => isEditing && isSelected && openItemEditor(item.id, 'text', item.text)}
            >
              {isHtml(item.text) ? (
                <SafeHtml html={item.text} className="text-muted-foreground leading-relaxed text-sm" />
              ) : (
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {item.text}
                </p>
              )}
              {isEditing && isSelected && (
                <Pencil className="absolute right-0 top-0 h-3 w-3 text-muted-foreground opacity-0 group-hover/text:opacity-100 transition-opacity" />
              )}
            </div>

            {/* Autor */}
            <div className="flex items-center gap-3 pt-2 border-t border-border/50">
              {/* Avatar con botón de edición */}
              <div className="relative group/avatar flex-shrink-0">
                {item.avatar ? (
                  <img
                    src={item.avatar}
                    alt={item.author}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {item.author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Overlay para editar avatar */}
                {isEditing && isSelected && userId && (
                  <button
                    onClick={() => handleEditAvatar(item.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                  >
                    <Camera className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>

              <div className="min-w-0 flex-1">
                {isEditing && isSelected ? (
                  <>
                    <Input
                      value={item.author}
                      onChange={(e) => handleUpdateItem(item.id, { author: e.target.value })}
                      placeholder="Nombre del cliente"
                      className="font-medium text-sm bg-transparent border-border/50 h-6 p-1 mb-1"
                    />
                    <div className="flex gap-1">
                      <Input
                        value={item.role || ''}
                        onChange={(e) => handleUpdateItem(item.id, { role: e.target.value })}
                        placeholder="Cargo"
                        className="text-xs bg-transparent border-border/50 h-5 p-1"
                      />
                      <Input
                        value={item.company || ''}
                        onChange={(e) => handleUpdateItem(item.id, { company: e.target.value })}
                        placeholder="Empresa"
                        className="text-xs bg-transparent border-border/50 h-5 p-1"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground truncate">{item.author}</p>
                    {(item.role || item.company) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[item.role, item.company].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {isEditing && isSelected && (
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="absolute top-3 right-3 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                aria-label={`Eliminar testimonio de ${item.author}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditing && isSelected && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddItem}
          className="mt-6 gap-1"
        >
          <Plus className="h-4 w-4" />
          Agregar testimonio
        </Button>
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
        title={editingField === 'title' ? 'Editar titulo' : 'Editar testimonio'}
        placeholder={editingField === 'title' ? 'Titulo de la seccion...' : 'Escribe el testimonio...'}
        mode={editingField === 'text' ? 'block' : 'inline'}
      />

      {/* Media Library Picker para avatars */}
      {userId && (
        <MediaLibraryPicker
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          onSelect={handleMediaSelect}
          allowedTypes={['image']}
          userId={userId}
          creatorProfileId={creatorProfileId}
        />
      )}
    </div>
  );
}

export const TestimonialsBlock = memo(TestimonialsBlockComponent);
