import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

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
  selectedCohortId: string | null;
  onSelect: (cohortId: string | null) => void;
  accentColor?: string;
}

export function CohortPicker({ courseId, selectedCohortId, onSelect, accentColor = '#8B5CF6' }: Props) {
  const { data: cohorts, isLoading } = useQuery({
    queryKey: ['academy-cohorts', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_cohorts')
        .select('id, name, start_date, end_date, status, seats_total, seats_taken')
        .eq('course_id', courseId)
        .in('status', ['upcoming', 'in_progress'])
        .order('start_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Cohort[];
    },
  });

  if (isLoading)
    return <div className="text-zinc-500 text-sm">Cargando cohortes disponibles…</div>;

  if (!cohorts?.length)
    return (
      <Card className="bg-white/5 border-white/10 p-4 text-center text-zinc-400 text-sm">
        No hay cohortes abiertas. Pronto se publicarán nuevas fechas.
      </Card>
    );

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400 font-medium">Elige tu cohorte</p>
      {cohorts.map((c) => {
        const isFull = c.seats_total != null && c.seats_taken >= c.seats_total;
        const isSelected = selectedCohortId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            disabled={isFull}
            onClick={() => onSelect(c.id)}
            className={`w-full text-left transition-all ${isFull ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'}`}
          >
            <Card
              className={`p-4 border ${
                isSelected ? 'border-2' : 'border-white/10'
              } bg-white/5`}
              style={isSelected ? { borderColor: accentColor } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{c.name}</p>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Inicia{' '}
                    {new Date(c.start_date).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {c.end_date && (
                      <>
                        {' '}
                        — termina{' '}
                        {new Date(c.end_date).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {c.status === 'in_progress' && (
                    <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20 text-[10px]">
                      En curso
                    </Badge>
                  )}
                  {isFull ? (
                    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                      <Lock className="h-3 w-3" /> Llena
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <Users className="h-3 w-3" />
                      {c.seats_total ? `${c.seats_taken}/${c.seats_total}` : `${c.seats_taken} inscritos`}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
