import { useState, useCallback, useMemo } from 'react';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { MediaLibraryGrid } from './MediaLibraryGrid';
import { MediaLibraryUploader } from './MediaLibraryUploader';
import type { MediaItem, MediaLibraryPickerProps, MediaFilters } from './types';

type TypeFilterValue = 'all' | 'image' | 'video';

export function MediaLibraryPicker({
  open,
  onOpenChange,
  onSelect,
  allowedTypes = ['image', 'video'],
  creatorProfileId,
  userId,
}: MediaLibraryPickerProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>(() => {
    // Si solo se permite un tipo, pre-seleccionarlo
    if (allowedTypes.length === 1) return allowedTypes[0];
    return 'all';
  });

  const filters = useMemo((): Partial<MediaFilters> => ({
    type: typeFilter,
    searchQuery,
    source: 'all',
  }), [typeFilter, searchQuery]);

  const { items, loading, error, refresh, addItem } = useMediaLibrary({
    userId,
    creatorProfileId,
    filters,
  });

  const handleSelect = useCallback((item: MediaItem) => {
    setSelectedItem(item);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedItem) return;
    onSelect(selectedItem);
    // Reset estado interno al cerrar
    setSelectedItem(null);
    setSearchQuery('');
  }, [selectedItem, onSelect]);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) {
        setSelectedItem(null);
        setSearchQuery('');
      }
      onOpenChange(value);
    },
    [onOpenChange]
  );

  const handleUploaded = useCallback(
    (item: MediaItem) => {
      addItem(item);
      setSelectedItem(item);
    },
    [addItem]
  );

  // Calcular cuantos items de cada tipo hay para los labels del filtro
  const counts = useMemo(() => {
    const all = items.length;
    // Cuando filters esten activos items ya esta filtrado, solo mostrar total en "Todos"
    return { all };
  }, [items]);

  const showTypeFilter =
    allowedTypes.includes('image') && allowedTypes.includes('video');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">Biblioteca de medios</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="library" className="flex flex-col min-h-0">
          <div className="flex items-center gap-4 px-6 pt-4 border-b pb-0">
            <TabsList className="h-9 bg-transparent p-0 gap-0">
              <TabsTrigger
                value="library"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 h-9 text-sm"
              >
                Mis medios
                {!loading && (
                  <span className="ml-1.5 text-xs text-muted-foreground">({counts.all})</span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 h-9 text-sm"
              >
                Subir nuevo
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pestana: Biblioteca */}
          <TabsContent value="library" className="flex flex-col gap-0 mt-0 min-h-0">
            {/* Barra de filtros */}
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-background">
              <div className="relative flex-1">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  placeholder="Buscar por titulo o etiqueta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  aria-label="Buscar medios"
                />
              </div>

              {showTypeFilter && (
                <div
                  className="flex items-center gap-1 bg-muted rounded-md p-0.5"
                  role="group"
                  aria-label="Filtrar por tipo"
                >
                  {(['all', 'image', 'video'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTypeFilter(value)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        typeFilter === value
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      aria-pressed={typeFilter === value}
                    >
                      {value === 'all' ? 'Todos' : value === 'image' ? 'Imagenes' : 'Videos'}
                    </button>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => refresh()}
                disabled={loading}
                aria-label="Refrescar biblioteca"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Contenido del grid */}
            <ScrollArea className="h-[360px]">
              {loading ? (
                <div className="flex items-center justify-center h-full py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => refresh()}>
                    Reintentar
                  </Button>
                </div>
              ) : (
                <MediaLibraryGrid
                  items={items}
                  selectedId={selectedItem?.id ?? null}
                  onSelect={handleSelect}
                />
              )}
            </ScrollArea>

            {/* Footer con acciones */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-background">
              <p className="text-xs text-muted-foreground">
                {selectedItem
                  ? `Seleccionado: ${selectedItem.title ?? selectedItem.type}`
                  : 'Haz clic en un medio para seleccionarlo'}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedItem}
                  onClick={handleConfirm}
                >
                  Usar medio
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Pestana: Subir */}
          <TabsContent value="upload" className="flex flex-col mt-0 min-h-0">
            <ScrollArea className="h-[360px]">
              <MediaLibraryUploader
                userId={userId}
                creatorProfileId={creatorProfileId}
                allowedTypes={allowedTypes}
                onUploaded={handleUploaded}
              />
            </ScrollArea>

            {/* Footer pestana upload */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-background">
              <p className="text-xs text-muted-foreground">
                {selectedItem
                  ? `Listo para usar: ${selectedItem.title ?? selectedItem.type}`
                  : 'Sube un archivo para seleccionarlo automaticamente'}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedItem}
                  onClick={handleConfirm}
                >
                  Usar medio
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
