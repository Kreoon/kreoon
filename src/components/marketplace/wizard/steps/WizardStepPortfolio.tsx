import { useCallback, useState } from 'react';
import { Upload, Film, Image as ImageIcon, Star, Trash2, GripVertical, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PortfolioItemData } from '@/hooks/usePortfolioItems';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WizardStepPortfolioProps {
  creatorProfileId: string | null;
  userId: string;
  items: PortfolioItemData[];
  adding: boolean;
  onUploadVideo: (file: File, creatorId: string, metadata?: { title?: string; category?: string }) => Promise<PortfolioItemData | null>;
  onUploadImage: (file: File, creatorId: string, metadata?: { title?: string; category?: string }) => Promise<PortfolioItemData | null>;
  onDeleteItem: (id: string) => Promise<boolean>;
  onTogglePin: (id: string) => Promise<boolean>;
  onReorder: (orderedIds: string[]) => Promise<boolean>;
}

function SortablePortfolioItem({
  item,
  onDelete,
  onTogglePin,
}: {
  item: PortfolioItemData;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group rounded-xl overflow-hidden border transition-all',
        isDragging ? 'z-50 border-purple-500 shadow-2xl shadow-purple-500/20' : 'border-white/10',
        item.is_featured && 'ring-2 ring-yellow-500/50'
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-[9/16] bg-[#1a1a2e] relative">
        {item.thumbnail_url || (item.media_type === 'image' && item.media_url) ? (
          <img
            src={item.thumbnail_url || item.media_url}
            alt={item.title || ''}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-600">
            {item.media_type === 'video' ? <Film className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
            <span className="text-[10px]">Procesando...</span>
          </div>
        )}

        {/* Video play icon */}
        {item.media_type === 'video' && (
          <div className="absolute bottom-2 left-2">
            <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
              <Play className="h-3 w-3 text-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Featured badge */}
        {item.is_featured && (
          <div className="absolute top-2 left-2">
            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 text-[9px] font-bold rounded-full">
              Destacado
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-2 bg-black/60 rounded-lg hover:bg-black/80 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-white" />
          </button>

          {/* Pin */}
          <button
            onClick={() => onTogglePin(item.id)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              item.is_featured ? 'bg-yellow-500/40 hover:bg-yellow-500/60' : 'bg-black/60 hover:bg-black/80'
            )}
          >
            <Star className={cn('h-4 w-4', item.is_featured ? 'text-yellow-300 fill-yellow-300' : 'text-white')} />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 bg-red-500/40 rounded-lg hover:bg-red-500/60"
          >
            <Trash2 className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Title */}
      {item.title && (
        <div className="p-2 bg-white/5">
          <p className="text-white text-[10px] font-medium truncate">{item.title}</p>
        </div>
      )}
    </div>
  );
}

export function WizardStepPortfolio({
  creatorProfileId,
  userId,
  items,
  adding,
  onUploadVideo,
  onUploadImage,
  onDeleteItem,
  onTogglePin,
  onReorder,
}: WizardStepPortfolioProps) {
  const [dragActive, setDragActive] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newOrder = arrayMove(items.map(i => i.id), oldIndex, newIndex);
      onReorder(newOrder);
    }
  }, [items, onReorder]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!creatorProfileId) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith('video/')) {
        await onUploadVideo(file, userId, { title: file.name.replace(/\.[^.]+$/, '') });
      } else if (file.type.startsWith('image/')) {
        await onUploadImage(file, userId, { title: file.name.replace(/\.[^.]+$/, '') });
      }
    }
  }, [creatorProfileId, userId, onUploadVideo, onUploadImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset
    }
  }, [handleFiles]);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Tu portafolio</h2>
        <p className="text-gray-400 text-sm">
          Sube tu mejor contenido vertical (9:16). Las marcas veran esto primero.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
          dragActive
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
        )}
        onClick={() => document.getElementById('portfolio-file-input')?.click()}
      >
        {adding ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-purple-400 animate-spin" />
            <p className="text-gray-300 text-sm">Subiendo...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <Upload className="h-7 w-7 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-medium">Arrastra archivos o haz clic para subir</p>
              <p className="text-gray-500 text-xs mt-1">Videos (MP4, MOV, WebM) e imagenes (JPG, PNG, WebP)</p>
            </div>
          </div>
        )}

        <input
          id="portfolio-file-input"
          type="file"
          accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Portfolio grid */}
      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium text-sm">
              {items.length} {items.length === 1 ? 'item' : 'items'} en tu portafolio
            </h3>
            <p className="text-gray-500 text-xs">Arrastra para reordenar</p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.map(item => (
                  <SortablePortfolioItem
                    key={item.id}
                    item={item}
                    onDelete={onDeleteItem}
                    onTogglePin={onTogglePin}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Tips */}
      {items.length === 0 && !adding && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-gray-400 text-sm">
            <strong className="text-gray-300">Tips:</strong> Sube al menos 3 piezas de tu mejor trabajo.
            Los videos verticales (9:16) tienen mejor rendimiento. Puedes destacar hasta 3 items.
          </p>
        </div>
      )}
    </div>
  );
}
