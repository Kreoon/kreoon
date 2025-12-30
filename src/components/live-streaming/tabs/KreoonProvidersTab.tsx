import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Settings2, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { AddProviderDialog } from '../dialogs/AddProviderDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { StreamingProvider } from '@/hooks/useLiveStreaming';

interface KreoonProvidersTabProps {
  providers: StreamingProvider[];
  onRefresh: () => Promise<void>;
  onSave: (provider: Partial<StreamingProvider> & { provider: string }) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
}

const PROVIDER_INFO = {
  restream: {
    name: 'Restream',
    description: 'Multi-streaming a múltiples plataformas simultáneamente',
    docsUrl: 'https://developers.restream.io/',
    color: 'bg-blue-500',
  },
  watchity: {
    name: 'Watchity',
    description: 'Plataforma profesional de live commerce',
    docsUrl: 'https://watchity.com/',
    color: 'bg-purple-500',
  },
  custom_rtmp: {
    name: 'RTMP Personalizado',
    description: 'Configuración manual de servidor RTMP',
    docsUrl: null,
    color: 'bg-gray-500',
  },
};

export function KreoonProvidersTab({ providers, onRefresh, onSave, onDelete }: KreoonProvidersTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<StreamingProvider | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleEdit = (provider: StreamingProvider) => {
    setEditingProvider(provider);
    setShowAddDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingProvider(null);
  };

  const handleToggleEnabled = async (provider: StreamingProvider) => {
    await onSave({
      ...provider,
      is_enabled: !provider.is_enabled,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Proveedores de Streaming
            </CardTitle>
            <CardDescription>
              Configura las APIs de los proveedores de streaming (Restream, Watchity, RTMP)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Proveedor
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {providers.length === 0 ? (
          <div className="text-center py-12">
            <Settings2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Sin proveedores configurados</h3>
            <p className="text-muted-foreground mb-4">
              Agrega un proveedor de streaming para habilitar las transmisiones en vivo
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Proveedor
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Habilitado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => {
                const info = PROVIDER_INFO[provider.provider] || PROVIDER_INFO.custom_rtmp;
                return (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${info.color}`} />
                        <div>
                          <div className="font-medium">{info.name}</div>
                          <div className="text-xs text-muted-foreground">{info.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={provider.mode === 'production' ? 'default' : 'secondary'}>
                        {provider.mode === 'production' ? 'Producción' : 'Test'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={provider.api_key_encrypted ? 'default' : 'outline'}>
                        {provider.api_key_encrypted ? 'Configurado' : 'Sin API Key'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={provider.is_enabled}
                        onCheckedChange={() => handleToggleEnabled(provider)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {info.docsUrl && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={info.docsUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(provider)}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        {onDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminarán las credenciales del proveedor.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(provider.id)}>
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Restream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Transmite simultáneamente a YouTube, Facebook, Twitch y más de 30 plataformas.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Watchity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Plataforma especializada en live commerce con integración de productos y carrito.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                RTMP Personalizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Configura tu propio servidor RTMP para mayor control y personalización.
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>

      <AddProviderDialog
        open={showAddDialog}
        onOpenChange={handleCloseDialog}
        onSave={onSave}
        editingProvider={editingProvider}
      />
    </Card>
  );
}
