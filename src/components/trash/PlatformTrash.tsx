import { useState } from 'react';
import { usePlatformTrash, getTableLabel, TrashItem } from '@/hooks/usePlatformTrash';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, RotateCcw, Clock, User, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function PlatformTrash() {
  const {
    items,
    itemsByTable,
    stats,
    loading,
    restoreFromTrash,
    restoreFromBackup,
    restoreMultiple,
    refetch,
    totalCount,
  } = usePlatformTrash();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<TrashItem | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const handleSelectItem = (backupId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(backupId);
    } else {
      newSelected.delete(backupId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (tableName: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    const tableItems = itemsByTable[tableName] || [];
    tableItems.forEach(item => {
      if (checked) {
        newSelected.add(item.backup_id);
      } else {
        newSelected.delete(item.backup_id);
      }
    });
    setSelectedItems(newSelected);
  };

  const handleRestoreSingle = async (item: TrashItem) => {
    setRestoring(true);
    try {
      if (item.backup_type === 'hard_delete') {
        await restoreFromBackup(item.backup_id);
      } else {
        await restoreFromTrash(item.table_name, item.record_id);
      }
      toast({
        title: 'Restaurado',
        description: `"${item.record_name || 'Registro'}" ha sido restaurado exitosamente.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al restaurar',
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
      setConfirmRestore(null);
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedItems.size === 0) return;

    setRestoring(true);
    try {
      const itemsToRestore = items
        .filter(item => selectedItems.has(item.backup_id))
        .map(item => ({ tableName: item.table_name, recordId: item.record_id }));

      await restoreMultiple(itemsToRestore);

      toast({
        title: 'Restaurados',
        description: `${selectedItems.size} elementos restaurados exitosamente.`,
      });
      setSelectedItems(new Set());
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al restaurar',
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
    }
  };

  const renderTrashItem = (item: TrashItem) => (
    <div
      key={item.backup_id}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <Checkbox
        checked={selectedItems.has(item.backup_id)}
        onCheckedChange={(checked) => handleSelectItem(item.backup_id, !!checked)}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">{item.record_name || 'Sin nombre'}</span>
          {item.backup_type === 'hard_delete' && (
            <Badge variant="destructive" className="text-xs">Eliminado</Badge>
          )}
        </div>

        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true, locale: es })}
          </span>
          {item.deleted_by_name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {item.deleted_by_name}
            </span>
          )}
        </div>

        {item.deletion_reason && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Razón: {item.deletion_reason}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirmRestore(item)}
        disabled={restoring}
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        Restaurar
      </Button>
    </div>
  );

  const renderTableSection = (tableName: string, tableItems: TrashItem[]) => {
    const allSelected = tableItems.every(item => selectedItems.has(item.backup_id));
    const someSelected = tableItems.some(item => selectedItems.has(item.backup_id));

    return (
      <div key={tableName} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) (el as any).indeterminate = someSelected && !allSelected;
              }}
              onCheckedChange={(checked) => handleSelectAll(tableName, !!checked)}
            />
            <h3 className="font-medium">{getTableLabel(tableName)}</h3>
            <Badge variant="secondary">{tableItems.length}</Badge>
          </div>
        </div>

        <div className="space-y-2 pl-6">
          {tableItems.map(renderTrashItem)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const tableNames = Object.keys(itemsByTable);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Papelera
            </CardTitle>
            <CardDescription>
              {totalCount} elementos eliminados. Los elementos pueden ser restaurados en cualquier momento.
            </CardDescription>
          </div>

          {selectedItems.size > 0 && (
            <Button onClick={handleRestoreSelected} disabled={restoring}>
              {restoring ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Restaurar {selectedItems.size} seleccionados
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {totalCount === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>La papelera está vacía</p>
            <p className="text-sm">Los elementos eliminados aparecerán aquí</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                Todos ({totalCount})
              </TabsTrigger>
              {stats.slice(0, 5).map(stat => (
                <TabsTrigger key={stat.table_name} value={stat.table_name}>
                  {getTableLabel(stat.table_name)} ({stat.item_count})
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[500px]">
              <TabsContent value="all" className="space-y-6 mt-0">
                {tableNames.map(tableName =>
                  renderTableSection(tableName, itemsByTable[tableName])
                )}
              </TabsContent>

              {tableNames.map(tableName => (
                <TabsContent key={tableName} value={tableName} className="space-y-2 mt-0">
                  {itemsByTable[tableName]?.map(renderTrashItem)}
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        )}
      </CardContent>

      <AlertDialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar elemento</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas restaurar "{confirmRestore?.record_name || 'este elemento'}"?
              {confirmRestore?.backup_type === 'hard_delete' && (
                <span className="block mt-2 text-amber-600">
                  Este elemento fue eliminado permanentemente. Se recreará desde el backup.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRestore && handleRestoreSingle(confirmRestore)}
              disabled={restoring}
            >
              {restoring ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
