import { useState } from "react";
import { Plus, Trash2, Loader2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COLLECTION_COLORS } from "../config";
import { useCollectionItems } from "../hooks/useAdLibraryCollections";
import { AdGrid } from "./AdGrid";
import type { AdLibraryAd, AdLibraryCollection } from "../types/ad-intelligence.types";

interface CollectionManagerProps {
  collections: AdLibraryCollection[];
  isLoading: boolean;
  onCreateCollection: (params: { name: string; description?: string; color?: string }) => void;
  onDeleteCollection: (collectionId: string) => void;
  isCreating: boolean;
  onViewDetail: (ad: AdLibraryAd) => void;
  onAnalyze: (adId: string) => void;
  onAddToCollection: (collectionId: string, adId: string) => void;
}

export function CollectionManager({
  collections,
  isLoading,
  onCreateCollection,
  onDeleteCollection,
  isCreating,
  onViewDetail,
  onAnalyze,
  onAddToCollection,
}: CollectionManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(COLLECTION_COLORS[0]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const { data: collectionItems, isLoading: isLoadingItems } = useCollectionItems(selectedCollectionId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateCollection({ name: newName, description: newDesc || undefined, color: newColor });
    setShowCreateDialog(false);
    setNewName("");
    setNewDesc("");
    setNewColor(COLLECTION_COLORS[0]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If viewing a specific collection
  if (selectedCollectionId) {
    const collection = collections.find(c => c.id === selectedCollectionId);
    const ads = (collectionItems || []).map(item => item.ad).filter(Boolean) as AdLibraryAd[];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCollectionId(null)}>
            &larr; Volver
          </Button>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: collection?.color }} />
          <h3 className="text-lg font-semibold">{collection?.name}</h3>
          <Badge variant="secondary">{ads.length} anuncios</Badge>
        </div>
        {collection?.description && (
          <p className="text-sm text-muted-foreground">{collection.description}</p>
        )}
        <AdGrid
          ads={ads}
          collections={collections}
          isLoading={isLoadingItems}
          onViewDetail={onViewDetail}
          onAnalyze={onAnalyze}
          onAddToCollection={onAddToCollection}
          emptyMessage="Esta colección está vacía"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Colecciones</h3>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva colección
        </Button>
      </div>

      {!collections.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No hay colecciones</p>
          <p className="text-sm mt-1">Crea colecciones para organizar los anuncios que más te inspiren</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col) => (
            <Card
              key={col.id}
              className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all group"
              onClick={() => setSelectedCollectionId(col.id)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                    <CardTitle className="text-base">{col.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCollection(col.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {col.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{col.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Creada {new Date(col.created_at).toLocaleDateString("es-CO")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva colección</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Hooks Virales"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="¿Para qué es esta colección?"
                rows={2}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {COLLECTION_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-7 h-7 rounded-full transition-all ${
                      newColor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
