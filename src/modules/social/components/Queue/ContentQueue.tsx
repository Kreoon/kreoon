import { useState } from 'react';
import { Clock, Plus, Trash2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useContentQueue } from '../../hooks/useContentQueue';
import { QueueSlots } from './QueueSlots';
import { DAY_LABELS } from '../../config/constants';
import type { ContentQueue as ContentQueueType, QueueSlot } from '../../types/social.types';
import { toast } from 'sonner';

interface ContentQueueProps {
  accountId?: string;
  groupId?: string;
}

export function ContentQueueManager({ accountId, groupId }: ContentQueueProps) {
  const { queues, primaryQueue, createQueue, updateQueue, updateSlots, deleteQueue } =
    useContentQueue(accountId, groupId);
  const [editingQueue, setEditingQueue] = useState<string | null>(null);

  const handleCreateQueue = async () => {
    try {
      await createQueue.mutateAsync({
        account_id: accountId,
        group_id: groupId,
      });
      toast.success('Cola de publicación creada');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateSlots = async (queueId: string, slots: QueueSlot[]) => {
    try {
      await updateSlots.mutateAsync({ queueId, slots });
      toast.success('Horarios actualizados');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteQueue = async (queueId: string) => {
    try {
      await deleteQueue.mutateAsync(queueId);
      toast.success('Cola eliminada');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (queues.length === 0) {
    return (
      <Card className="bg-muted/20">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <Clock className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No hay colas de publicación configuradas.
          </p>
          <Button size="sm" onClick={handleCreateQueue} disabled={createQueue.isPending}>
            <Plus className="w-4 h-4 mr-1" /> Crear Cola
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Colas de Publicación
        </h3>
        <Button size="sm" variant="outline" onClick={handleCreateQueue} disabled={createQueue.isPending}>
          <Plus className="w-4 h-4 mr-1" /> Nueva Cola
        </Button>
      </div>

      {queues.map(queue => (
        <Card key={queue.id} className="bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm">{queue.name}</CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {queue.timezone}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditingQueue(editingQueue === queue.id ? null : queue.id)}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-400 hover:text-red-300"
                  onClick={() => handleDeleteQueue(queue.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Compact slot overview */}
            <div className="grid grid-cols-7 gap-1">
              {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(day => {
                const slot = queue.schedule_slots.find(s => s.day === day);
                const count = slot?.times.length || 0;
                return (
                  <div key={day} className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      {DAY_LABELS[day]?.slice(0, 3)}
                    </p>
                    <div className={cn(
                      'rounded px-1 py-0.5 text-[10px] font-medium',
                      count > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {count > 0 ? `${count}x` : '-'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expanded editor */}
            {editingQueue === queue.id && (
              <div className="mt-4 pt-4 border-t">
                <QueueSlots
                  slots={queue.schedule_slots}
                  onSave={(slots) => handleUpdateSlots(queue.id, slots)}
                  isSaving={updateSlots.isPending}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
