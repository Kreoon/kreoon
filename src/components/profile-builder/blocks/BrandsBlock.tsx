import { memo, useState } from 'react';
import { Plus, Trash2, Building2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BlockProps } from '../types/profile-builder';
import { MediaLibraryPicker } from '../media/MediaLibraryPicker';
import type { MediaItem } from '../media/types';
import { getBlockStyleObject } from './blockStyles';

interface BrandItem {
  id: string;
  name: string;
  logoUrl: string;
}

interface BrandsConfig {
  grayscale: boolean;
}

interface BrandsContent {
  title?: string;
  brands?: BrandItem[];
}

const DEFAULT_BRANDS: BrandItem[] = [
  { id: '1', name: 'Marca 1', logoUrl: '' },
  { id: '2', name: 'Marca 2', logoUrl: '' },
  { id: '3', name: 'Marca 3', logoUrl: '' },
  { id: '4', name: 'Marca 4', logoUrl: '' },
  { id: '5', name: 'Marca 5', logoUrl: '' },
  { id: '6', name: 'Marca 6', logoUrl: '' },
];

function BrandsBlockComponent({ block, isEditing, isSelected, onUpdate, userId, creatorProfileId }: BlockProps) {
  const config = block.config as BrandsConfig;
  const content = block.content as BrandsContent;
  const styles = block.styles;
  const brands = content.brands || DEFAULT_BRANDS;
  const [newName, setNewName] = useState('');

  // Estado para media picker
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);

  const handleContentUpdate = (updates: Partial<BrandsContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const handleUpdateBrand = (id: string, updates: Partial<BrandItem>) => {
    const newBrands = brands.map((b) => (b.id === id ? { ...b, ...updates } : b));
    handleContentUpdate({ brands: newBrands });
  };

  const handleAddBrand = () => {
    if (!newName.trim()) return;
    const newBrand: BrandItem = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      logoUrl: '',
    };
    handleContentUpdate({ brands: [...brands, newBrand] });
    setNewName('');
  };

  const handleEditBrandLogo = (brandId: string) => {
    setEditingBrandId(brandId);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (media: MediaItem) => {
    if (editingBrandId) {
      handleUpdateBrand(editingBrandId, { logoUrl: media.url });
    }
    setMediaPickerOpen(false);
    setEditingBrandId(null);
  };

  const handleRemoveBrand = (id: string) => {
    handleContentUpdate({ brands: brands.filter((b) => b.id !== id) });
  };

  return (
    <div style={getBlockStyleObject(styles)}>
      {/* Titulo */}
      {isEditing && isSelected ? (
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => handleContentUpdate({ title: e.target.value })}
          placeholder="Marcas con las que he trabajado"
          className="text-xl md:text-2xl font-bold text-foreground bg-transparent border-none w-full mb-6 focus:outline-none focus:ring-1 focus:ring-primary rounded text-center"
        />
      ) : (
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6 text-center">
          {content.title || 'Marcas con las que he trabajado'}
        </h2>
      )}

      {/* Grid de logos */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 items-center justify-items-center">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className={cn(
              'relative group w-full flex flex-col items-center gap-2',
              isEditing && isSelected ? 'p-2' : '',
            )}
          >
            {/* Logo con botón de edición */}
            <div className="relative group/logo">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className={cn(
                    'h-10 w-auto max-w-[80px] object-contain transition-all duration-300',
                    config.grayscale && !isEditing
                      ? 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                      : '',
                  )}
                />
              ) : (
                <div
                  className={cn(
                    'h-10 w-16 rounded bg-muted/50 flex items-center justify-center',
                    config.grayscale && !isEditing ? 'opacity-40' : 'opacity-60',
                  )}
                >
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              {/* Overlay para editar logo */}
              {isEditing && isSelected && userId && (
                <button
                  onClick={() => handleEditBrandLogo(brand.id)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded opacity-0 group-hover/logo:opacity-100 transition-opacity"
                >
                  <Camera className="h-4 w-4 text-white" />
                </button>
              )}
            </div>

            {isEditing && isSelected ? (
              <div className="w-full flex flex-col gap-1">
                <Input
                  value={brand.name}
                  onChange={(e) => handleUpdateBrand(brand.id, { name: e.target.value })}
                  placeholder="Nombre"
                  className="h-6 text-xs bg-transparent border-border/50 p-1 text-center"
                />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground text-center leading-tight">
                {brand.name}
              </span>
            )}

            {isEditing && isSelected && (
              <button
                onClick={() => handleRemoveBrand(brand.id)}
                className="absolute -top-1 -right-1 p-0.5 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                aria-label={`Eliminar marca ${brand.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Agregar marca */}
      {isEditing && isSelected && (
        <div className="flex gap-2 mt-6">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la marca"
            className="bg-transparent border-border/50"
            onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddBrand}
            className="flex-shrink-0 gap-1"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
      )}

      {/* Media Library Picker */}
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

export const BrandsBlock = memo(BrandsBlockComponent);
