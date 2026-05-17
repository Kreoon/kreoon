import { useState } from 'react';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useContentQueue } from '../../hooks/useContentQueue';
import { QueueSlots } from './QueueSlots';
import { DAY_LABELS } from '../../config/constants';
import type { QueueSlot } from '../../types/social.types';
import { toast } from 'sonner';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const QUEUE_EMOJIS = ['⏰', '📆', '🗓️', '📅', '⌚', '🔔', '📢'];

interface ContentQueueProps {
  accountId?: string;
  groupId?: string;
}

export function ContentQueueManager({ accountId, groupId }: ContentQueueProps) {
  const { queues, createQueue, updateSlots, deleteQueue } = useContentQueue(accountId, groupId);
  const [editingQueue, setEditingQueue] = useState<string | null>(null);

  const handleCreateQueue = async () => {
    try {
      await createQueue.mutateAsync({ account_id: accountId, group_id: groupId });
      toast.success('Cola creada');
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
      <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 py-12 flex flex-col items-center gap-3 text-center">
        <span className="text-5xl">⏳</span>
        <p className="font-semibold">¡Sin colas configuradas!</p>
        <p className="text-sm text-muted-foreground">
          Crea una cola para programar tus posts automáticamente
        </p>
        <Button size="sm" className="rounded-xl mt-2" onClick={handleCreateQueue} disabled={createQueue.isPending}>
          <Plus className="w-4 h-4 mr-1" /> Crear mi primera cola
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⏳</span>
          <h2 className="text-xl font-bold">Cola de Contenido</h2>
        </div>
        <Button size="sm" className="rounded-xl" onClick={handleCreateQueue} disabled={createQueue.isPending}>
          <Plus className="w-4 h-4 mr-1" /> Nueva Cola
        </Button>
      </div>

      {/* Queue cards */}
      <div className="space-y-3">
        {queues.map((queue, idx) => {
          const totalSlots = queue.schedule_slots.reduce((sum, s) => sum + (s.times?.length || 0), 0);
          const isEditing = editingQueue === queue.id;
          const emoji = QUEUE_EMOJIS[idx % QUEUE_EMOJIS.length];

          return (
            <div key={queue.id} className="rounded-2xl border-2 border-border/50 bg-card/30 overflow-hidden">
              {/* Queue header */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xl shrink-0">
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{queue.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalSlots} publicación{totalSlots !== 1 ? 'es' : ''} por semana · {queue.timezone}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8 rounded-lg"
                    onClick={() => setEditingQueue(isEditing ? null : queue.id)}
                  >
                    <Settings2 className={cn('w-4 h-4 transition-colors', isEditing && 'text-primary')} />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-300"
                    onClick={() => handleDeleteQueue(queue.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Day slots overview */}
              <div className="px-4 pb-4">
                <div className="grid grid-cols-7 gap-1">
                  {DAY_KEYS.map(day => {
                    const slot = queue.schedule_slots.find(s => s.day === day);
                    const count = slot?.times?.length || 0;
                    return (
                      <div key={day} className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">
                          {(DAY_LABELS[day] || day).slice(0, 3)}
                        </p>
                        <div className={cn(
                          'rounded-lg py-1 text-[11px] font-semibold',
                          count > 0 ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
                        )}>
                          {count > 0 ? `${count}×` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expanded slot editor */}
              {isEditing && (
                <div className="border-t border-border/40 p-4">
                  <QueueSlots
                    slots={queue.schedule_slots}
                    onSave={(slots) => handleUpdateSlots(queue.id, slots)}
                    isSaving={updateSlots.isPending}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
