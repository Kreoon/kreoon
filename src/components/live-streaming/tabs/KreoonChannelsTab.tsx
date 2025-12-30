import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link2, Youtube, Twitch, Facebook, RefreshCw, Trash2, Plus, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StreamingAccount } from '@/hooks/useLiveStreaming';
import { AddChannelDialog } from '@/components/live-streaming/dialogs/AddChannelDialog';

interface KreoonChannelsTabProps {
  accounts: StreamingAccount[];
  onRefresh: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSave: (account: Partial<StreamingAccount>) => Promise<void>;
}

const PLATFORM_CONFIG = {
  youtube: { icon: Youtube, color: 'text-red-500', name: 'YouTube' },
  twitch: { icon: Twitch, color: 'text-purple-500', name: 'Twitch' },
  facebook: { icon: Facebook, color: 'text-blue-500', name: 'Facebook' },
  tiktok: { icon: Link2, color: 'text-foreground', name: 'TikTok' },
  instagram: { icon: Link2, color: 'text-pink-500', name: 'Instagram' },
};

export function KreoonChannelsTab({ accounts, onRefresh, onDelete, onSave }: KreoonChannelsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'connected' | 'disconnected'>('all');

  const filteredAccounts = accounts.filter(acc => {
    if (viewMode === 'connected') return acc.status === 'connected';
    if (viewMode === 'disconnected') return acc.status !== 'connected';
    return true;
  });

  const connectedCount = accounts.filter(a => a.status === 'connected').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Canales de Transmisión
              </CardTitle>
              <CardDescription>
                Los clientes conectan sus propias cuentas para transmitir
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onRefresh} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Conectar Canal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {connectedCount} Conectados
            </Badge>
            <Badge variant="outline" className="gap-2">
              <XCircle className="h-3 w-3 text-muted-foreground" />
              {accounts.length - connectedCount} Desconectados
            </Badge>
          </div>

          {/* Filters */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Todos ({accounts.length})</TabsTrigger>
              <TabsTrigger value="connected">Conectados ({connectedCount})</TabsTrigger>
              <TabsTrigger value="disconnected">Desconectados ({accounts.length - connectedCount})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Table */}
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Sin canales</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {viewMode === 'all' 
                  ? 'No hay canales conectados aún'
                  : viewMode === 'connected'
                  ? 'No hay canales conectados'
                  : 'No hay canales desconectados'}
              </p>
              {viewMode === 'all' && (
                <Button onClick={() => setShowAddDialog(true)}>Conectar Primer Canal</Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última Sync</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => {
                  const platform = PLATFORM_CONFIG[account.platform_type as keyof typeof PLATFORM_CONFIG] 
                    || { icon: Link2, color: 'text-muted-foreground', name: account.platform_type };
                  const Icon = platform.icon;

                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-5 w-5 ${platform.color}`} />
                          <span>{platform.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{account.account_name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.status === 'connected' ? 'default' : 'secondary'}>
                          {account.status === 'connected' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Conectado</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Desconectado</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {account.last_sync_at 
                          ? format(new Date(account.last_sync_at), 'dd/MM/yyyy HH:mm', { locale: es })
                          : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost" 
                            size="icon"
                            onClick={() => onDelete(account.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Los clientes conectan sus propias cuentas de streaming (YouTube, Twitch, etc.)</p>
          <p>• La organización no tiene acceso a los tokens de autenticación del cliente</p>
          <p>• Cada cliente es responsable de mantener sus conexiones activas</p>
          <p>• Las transmisiones solo pueden iniciarse si el cliente tiene horas disponibles</p>
        </CardContent>
      </Card>

      {/* Add Channel Dialog */}
      <AddChannelDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSave={async (data) => { await onSave(data); return true; }}
      />
    </div>
  );
}
