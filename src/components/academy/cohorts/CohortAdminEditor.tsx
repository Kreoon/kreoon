import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calendar, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Cohort {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  seats_total: number | null;
  seats_taken: number;
}

interface Props {
  courseId: string;
  courseMode: string;
  onModeChange: (mode: 'self_paced' | 'cohort') => void;
  accentColor?: string;
}

export function CohortAdminEditor({ courseId, courseMode, onModeChange, accentColor = '#8B5CF6' }: Props) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newCohort, setNewCohort] = useState({
    name: '',
    start_date: '',
    end_date: '',
    seats_total: '',
  });

  const { data: cohorts } = useQuery({
    queryKey: ['academy-cohorts-admin', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_cohorts')
        .select('*')
        .eq('course_id', courseId)
        .order('start_date', { ascending: false });
      return (data ?? []) as Cohort[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('academy_cohorts').insert({
        course_id: courseId,
        name: newCohort.name.trim(),
        start_date: newCohort.start_date,
        end_date: newCohort.end_date || null,
        seats_total: newCohort.seats_total ? Number(newCohort.seats_total) : null,
        status: 'upcoming',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cohorte creada');
      setShowCreate(false);
      setNewCohort({ name: '', start_date: '', end_date: '', seats_total: '' });
      qc.invalidateQueries({ queryKey: ['academy-cohorts-admin', courseId] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('academy_cohorts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cohorte eliminada');
      qc.invalidateQueries({ queryKey: ['academy-cohorts-admin', courseId] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  return (
    <div className="space-y-4">
      <Card className="bg-white/5 border-white/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">Modalidad del curso</h4>
            <p className="text-xs text-zinc-400 mt-1">
              {courseMode === 'cohort'
                ? 'Cohorte: drip por start_date de cohorte, capacidad limitada.'
                : 'Self-paced: drip por enrolled_at de cada estudiante.'}
            </p>
          </div>
          <div className="flex gap-1">
            {(['self_paced', 'cohort'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`px-3 py-1 rounded text-xs ${
                  courseMode === m ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:bg-white/5'
                }`}
                style={courseMode === m ? { color: accentColor } : undefined}
              >
                {m === 'self_paced' ? 'Self-paced' : 'Cohorte'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {courseMode === 'cohort' && (
        <>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-100">Cohortes</h4>
            <Button size="sm" onClick={() => setShowCreate((v) => !v)} variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" /> Nueva cohorte
            </Button>
          </div>

          {showCreate && (
            <Card className="bg-white/5 border-white/10 p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Nombre</Label>
                <Input
                  value={newCohort.name}
                  onChange={(e) => setNewCohort((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Cohorte Junio 2026"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Inicio</Label>
                  <Input
                    type="date"
                    value={newCohort.start_date}
                    onChange={(e) => setNewCohort((s) => ({ ...s, start_date: e.target.value }))}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Fin (opcional)</Label>
                  <Input
                    type="date"
                    value={newCohort.end_date}
                    onChange={(e) => setNewCohort((s) => ({ ...s, end_date: e.target.value }))}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Cupos totales (opcional)</Label>
                <Input
                  type="number"
                  value={newCohort.seats_total}
                  onChange={(e) => setNewCohort((s) => ({ ...s, seats_total: e.target.value }))}
                  placeholder="30"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newCohort.name || !newCohort.start_date || createMutation.isPending}
                style={{ backgroundColor: accentColor }}
                className="w-full"
              >
                Crear cohorte
              </Button>
            </Card>
          )}

          <div className="space-y-2">
            {cohorts?.map((c) => (
              <Card key={c.id} className="bg-white/5 border-white/10 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-100 truncate">{c.name}</p>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(c.start_date).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {c.seats_total ? `${c.seats_taken}/${c.seats_total}` : c.seats_taken}
                    </span>
                    <Badge variant="outline" className="border-white/10 text-[10px]">
                      {c.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`¿Eliminar cohorte "${c.name}"?`)) deleteMutation.mutate(c.id);
                  }}
                  className="text-zinc-400 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            ))}
            {!cohorts?.length && (
              <p className="text-xs text-zinc-500 text-center py-4">
                No hay cohortes. Crea la primera para abrir inscripciones.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
