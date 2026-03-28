import { useState } from 'react';
import { useSavedItems, SavedItem, SavedCollection } from '@/hooks/useSavedItems';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bookmark, 
  Plus, 
  FolderPlus, 
  Trash2, 
  ArrowLeft,
  Play,
  Image as ImageIcon,
  User,
  Building2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function SavedPage() {
  const {
    items,
    collections,
    loading,
    saving,
    createCollection,
    deleteCollection,
    getItemsByCollection,
  } = useSavedItems();

  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    await createCollection(newCollectionName.trim());
    setNewCollectionName('');
    setShowNewCollection(false);
  };

  const handleDeleteCollection = async (id: string) => {
    await deleteCollection(id);
    if (selectedCollection === id) {
      setSelectedCollection(null);
    }
  };

  const displayItems = selectedCollection !== null
    ? getItemsByCollection(selectedCollection)
    : items;

  const currentCollection = selectedCollection
    ? collections.find(c => c.id === selectedCollection)
    : null;

  if (loading) {
    return (
      <div className="h-full overflow-y-auto  p-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto  pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          {selectedCollection !== null ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedCollection(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold">
                {currentCollection?.name || 'Sin colección'}
              </h1>
            </div>
          ) : (
            <h1 className="text-lg font-semibold">Guardados</h1>
          )}
          
          {selectedCollection === null && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewCollection(true)}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Nueva colección
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Collections grid (when no collection selected) */}
        {selectedCollection === null && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {/* All saved items */}
            <CollectionCard
              name="Todos los guardados"
              count={items.length}
              icon={<Bookmark className="h-8 w-8" />}
              onClick={() => setSelectedCollection(null)}
              isActive={false}
            />

            {/* User collections */}
            {collections.map(collection => (
              <CollectionCard
                key={collection.id}
                name={collection.name}
                count={collection.items_count || 0}
                coverUrl={collection.cover_url}
                icon={<Bookmark className="h-8 w-8" />}
                onClick={() => setSelectedCollection(collection.id)}
                onDelete={() => handleDeleteCollection(collection.id)}
                isActive={false}
              />
            ))}

            {/* Add collection button */}
            <button
              onClick={() => setShowNewCollection(true)}
              className="aspect-square rounded-sm border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-8 w-8" />
              <span className="text-sm">Nueva colección</span>
            </button>
          </div>
        )}

        {/* Saved items grid */}
        {(selectedCollection !== null || items.length > 0) && (
          <>
            {selectedCollection === null && (
              <h2 className="text-lg font-semibold mb-4">Elementos guardados</h2>
            )}
            
            {displayItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {selectedCollection !== null 
                  ? 'Esta colección está vacía'
                  : 'No tienes elementos guardados'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {displayItems.map(item => (
                  <SavedItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {items.length === 0 && selectedCollection === null && (
          <div className="text-center py-12">
            <Bookmark className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nada guardado aún</h3>
            <p className="text-muted-foreground">
              Guarda posts, videos y perfiles que te gusten
            </p>
          </div>
        )}
      </div>

      {/* New collection dialog */}
      {showNewCollection && (
        <Dialog open={showNewCollection} onOpenChange={setShowNewCollection}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva colección</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Nombre de la colección"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCollection(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCollection} disabled={saving || !newCollectionName.trim()}>
                {saving ? 'Creando...' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface CollectionCardProps {
  name: string;
  count: number;
  coverUrl?: string | null;
  icon?: React.ReactNode;
  onClick: () => void;
  onDelete?: () => void;
  isActive: boolean;
}

function CollectionCard({ 
  name, 
  count, 
  coverUrl, 
  icon, 
  onClick, 
  onDelete,
  isActive 
}: CollectionCardProps) {
  return (
    <div
      className={cn(
        "aspect-square rounded-sm relative overflow-hidden cursor-pointer group",
        "bg-muted hover:bg-muted/80 transition-colors",
        isActive && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      {coverUrl ? (
        <img src={coverUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="text-white font-medium truncate">{name}</div>
        <div className="text-white/70 text-sm">{count} elementos</div>
      </div>

      {onDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function SavedItemCard({ item }: { item: SavedItem }) {
  const getIcon = () => {
    switch (item.item_type) {
      case 'work_video':
        return <Play className="h-6 w-6" />;
      case 'post':
        return <ImageIcon className="h-6 w-6" />;
      case 'profile':
        return <User className="h-6 w-6" />;
      case 'company':
        return <Building2 className="h-6 w-6" />;
      default:
        return <Bookmark className="h-6 w-6" />;
    }
  };

  return (
    <div className="aspect-square rounded-sm bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
      <div className="text-muted-foreground">
        {getIcon()}
      </div>
    </div>
  );
}
