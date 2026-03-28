/**
 * OverlayEditor - Editor de overlays para streaming
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Type,
  Image,
  MessageSquare,
  ShoppingBag,
  BarChart3,
  Layers,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Move,
  Save,
  Undo,
  Palette,
} from 'lucide-react';
import type { StreamingOverlay, OverlayType, OverlayPosition } from '@/types/streaming.types';

interface OverlayEditorProps {
  overlays: StreamingOverlay[];
  onSave?: (overlay: Partial<StreamingOverlay>) => void;
  onDelete?: (overlayId: string) => void;
  onToggleVisibility?: (overlayId: string, isVisible: boolean) => void;
  onCreate?: (type: OverlayType) => void;
  previewUrl?: string;
  className?: string;
}

const OVERLAY_TYPES: {
  type: OverlayType;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    type: 'text',
    label: 'Texto',
    icon: Type,
    description: 'Añade texto personalizado',
  },
  {
    type: 'image',
    label: 'Imagen',
    icon: Image,
    description: 'Logo o imagen estática',
  },
  {
    type: 'chat',
    label: 'Chat',
    icon: MessageSquare,
    description: 'Muestra el chat en vivo',
  },
  {
    type: 'product',
    label: 'Producto',
    icon: ShoppingBag,
    description: 'Producto destacado',
  },
  {
    type: 'stats',
    label: 'Estadísticas',
    icon: BarChart3,
    description: 'Viewers y métricas',
  },
];

const POSITIONS: { value: OverlayPosition; label: string }[] = [
  { value: 'top-left', label: 'Arriba Izquierda' },
  { value: 'top-center', label: 'Arriba Centro' },
  { value: 'top-right', label: 'Arriba Derecha' },
  { value: 'center-left', label: 'Centro Izquierda' },
  { value: 'center', label: 'Centro' },
  { value: 'center-right', label: 'Centro Derecha' },
  { value: 'bottom-left', label: 'Abajo Izquierda' },
  { value: 'bottom-center', label: 'Abajo Centro' },
  { value: 'bottom-right', label: 'Abajo Derecha' },
];

export function OverlayEditor({
  overlays,
  onSave,
  onDelete,
  onToggleVisibility,
  onCreate,
  previewUrl,
  className,
}: OverlayEditorProps) {
  const [selectedOverlay, setSelectedOverlay] = useState<StreamingOverlay | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, unknown>>({});

  // Handle overlay selection
  const handleSelect = (overlay: StreamingOverlay) => {
    setSelectedOverlay(overlay);
    setEditedContent(overlay.content || {});
  };

  // Handle save
  const handleSave = () => {
    if (!selectedOverlay || !onSave) return;
    onSave({
      id: selectedOverlay.id,
      content: editedContent,
    });
  };

  return (
    <div className={cn('grid gap-4 lg:grid-cols-3', className)}>
      {/* Overlay list */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Capas
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-4">
              {overlays.map((overlay) => (
                <div
                  key={overlay.id}
                  className={cn(
                    'flex items-center gap-2 rounded-sm p-2 cursor-pointer transition-colors',
                    selectedOverlay?.id === overlay.id
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => handleSelect(overlay)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Move className="h-4 w-4 text-muted-foreground cursor-grab" />
                    {overlay.overlay_type === 'text' && <Type className="h-4 w-4" />}
                    {overlay.overlay_type === 'image' && <Image className="h-4 w-4" />}
                    {overlay.overlay_type === 'chat' && <MessageSquare className="h-4 w-4" />}
                    {overlay.overlay_type === 'product' && <ShoppingBag className="h-4 w-4" />}
                    {overlay.overlay_type === 'stats' && <BarChart3 className="h-4 w-4" />}
                    <span className="text-sm truncate">{overlay.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility?.(overlay.id, !overlay.is_visible);
                    }}
                  >
                    {overlay.is_visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              ))}

              {overlays.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay overlays
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Add overlay buttons */}
          <div className="border-t p-4">
            <p className="text-sm font-medium mb-2">Añadir overlay</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {OVERLAY_TYPES.slice(0, 3).map((type) => (
                <Button
                  key={type.type}
                  variant="outline"
                  size="sm"
                  className="h-auto flex-col py-2"
                  onClick={() => onCreate?.(type.type)}
                >
                  <type.icon className="h-4 w-4 mb-1" />
                  <span className="text-xs">{type.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor panel */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {selectedOverlay ? `Editar: ${selectedOverlay.name}` : 'Editor'}
            </CardTitle>
            {selectedOverlay && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedOverlay(null)}>
                  <Undo className="mr-1 h-4 w-4" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="mr-1 h-4 w-4" />
                  Guardar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedOverlay ? (
            <Tabs defaultValue="content">
              <TabsList className="w-full">
                <TabsTrigger value="content" className="flex-1">
                  Contenido
                </TabsTrigger>
                <TabsTrigger value="position" className="flex-1">
                  Posición
                </TabsTrigger>
                <TabsTrigger value="style" className="flex-1">
                  Estilo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-4 space-y-4">
                {/* Text overlay */}
                {selectedOverlay.overlay_type === 'text' && (
                  <>
                    <div className="space-y-2">
                      <Label>Texto</Label>
                      <Textarea
                        value={(editedContent.text as string) || ''}
                        onChange={(e) =>
                          setEditedContent({ ...editedContent, text: e.target.value })
                        }
                        placeholder="Escribe tu texto aquí..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tamaño de fuente</Label>
                        <Select
                          value={(editedContent.fontSize as string) || '24'}
                          onValueChange={(v) =>
                            setEditedContent({ ...editedContent, fontSize: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[16, 20, 24, 32, 40, 48, 64].map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size}px
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={(editedContent.color as string) || '#ffffff'}
                            onChange={(e) =>
                              setEditedContent({ ...editedContent, color: e.target.value })
                            }
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={(editedContent.color as string) || '#ffffff'}
                            onChange={(e) =>
                              setEditedContent({ ...editedContent, color: e.target.value })
                            }
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Image overlay */}
                {selectedOverlay.overlay_type === 'image' && (
                  <div className="space-y-2">
                    <Label>URL de la imagen</Label>
                    <Input
                      value={(editedContent.url as string) || ''}
                      onChange={(e) =>
                        setEditedContent({ ...editedContent, url: e.target.value })
                      }
                      placeholder="https://..."
                    />
                    {editedContent.url && (
                      <div className="mt-2 rounded-sm border p-2">
                        <img
                          src={editedContent.url as string}
                          alt="Preview"
                          className="max-h-32 mx-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Chat overlay */}
                {selectedOverlay.overlay_type === 'chat' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Mensajes a mostrar</Label>
                      <Slider
                        value={[(editedContent.maxMessages as number) || 5]}
                        onValueChange={([v]) =>
                          setEditedContent({ ...editedContent, maxMessages: v })
                        }
                        min={3}
                        max={15}
                        step={1}
                      />
                      <p className="text-sm text-muted-foreground">
                        {(editedContent.maxMessages as number) || 5} mensajes
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Mostrar avatars</Label>
                      <Switch
                        checked={(editedContent.showAvatars as boolean) ?? true}
                        onCheckedChange={(checked) =>
                          setEditedContent({ ...editedContent, showAvatars: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Mostrar plataforma</Label>
                      <Switch
                        checked={(editedContent.showPlatform as boolean) ?? true}
                        onCheckedChange={(checked) =>
                          setEditedContent({ ...editedContent, showPlatform: checked })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Stats overlay */}
                {selectedOverlay.overlay_type === 'stats' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Mostrar viewers</Label>
                      <Switch
                        checked={(editedContent.showViewers as boolean) ?? true}
                        onCheckedChange={(checked) =>
                          setEditedContent({ ...editedContent, showViewers: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Mostrar tiempo</Label>
                      <Switch
                        checked={(editedContent.showTime as boolean) ?? true}
                        onCheckedChange={(checked) =>
                          setEditedContent({ ...editedContent, showTime: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Mostrar ventas</Label>
                      <Switch
                        checked={(editedContent.showSales as boolean) ?? false}
                        onCheckedChange={(checked) =>
                          setEditedContent({ ...editedContent, showSales: checked })
                        }
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="position" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Posición predefinida</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {POSITIONS.map((pos) => (
                      <Button
                        key={pos.value}
                        variant={selectedOverlay.position === pos.value ? 'secondary' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          onSave?.({ id: selectedOverlay.id, position: pos.value })
                        }
                      >
                        {pos.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Orden (z-index)</Label>
                  <Slider
                    value={[selectedOverlay.z_index || 1]}
                    onValueChange={([v]) =>
                      onSave?.({ id: selectedOverlay.id, z_index: v })
                    }
                    min={1}
                    max={100}
                    step={1}
                  />
                </div>
              </TabsContent>

              <TabsContent value="style" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Opacidad</Label>
                  <Slider
                    value={[(editedContent.opacity as number) || 100]}
                    onValueChange={([v]) =>
                      setEditedContent({ ...editedContent, opacity: v })
                    }
                    min={0}
                    max={100}
                    step={5}
                  />
                  <p className="text-sm text-muted-foreground">
                    {(editedContent.opacity as number) || 100}%
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Color de fondo</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={(editedContent.backgroundColor as string) || '#000000'}
                      onChange={(e) =>
                        setEditedContent({ ...editedContent, backgroundColor: e.target.value })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={(editedContent.backgroundColor as string) || 'transparent'}
                      onChange={(e) =>
                        setEditedContent({ ...editedContent, backgroundColor: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Delete button */}
                {onDelete && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        onDelete(selectedOverlay.id);
                        setSelectedOverlay(null);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar Overlay
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Selecciona un overlay</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Elige un overlay de la lista para editarlo
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default OverlayEditor;
