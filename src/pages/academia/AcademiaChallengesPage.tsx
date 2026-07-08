import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Users, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { toast } from 'sonner';
import { KreoonSkeleton } from '@/components/ui/kreoon/KreoonSkeleton';

interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  mode: 'fixed_dates' | 'always_on';
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  xp_reward: number;
  status: string;
}

export default function AcademiaChallengesPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { user } = useAuth();
  const { data: space } = useAcademySpace(spaceSlug);
  const qc = useQueryClient();

  const accent = space?.accent_color || '#8B5CF6';

  const { data: challenges, isLoading } = useQuery({
    queryKey: ['academy-challenges', space?.id],
    enabled: !!space?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_challenges')
        .select('id, slug, title, description, cover_url, mode, start_date, end_date, duration_days, xp_reward, status')
        .eq('space_id', space!.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      return (data ?? []) as Challenge[];
    },
  });

  const { data: myParticipations } = useQuery({
    queryKey: ['academy-my-participations', space?.id, user?.id],
    enabled: !!user?.id && !!space?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_challenge_participants')
        .select('challenge_id, status, current_checkpoint_order, completed_at')
        .eq('user_id', user!.id);
      return data ?? [];
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user) throw new Error('not_authenticated');
      const { error } = await supabase
        .from('academy_challenge_participants')
        .insert({ challenge_id: challengeId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Te uniste al reto');
      qc.invalidateQueries({ queryKey: ['academy-my-participations'] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const partMap = new Map((myParticipations ?? []).map((p: any) => [p.challenge_id, p]));

  if (!space)
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center text-zinc-400">
        Cargando…
      </div>
    );

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="h-6 w-6" style={{ color: accent }} />
          <div>
            <h1 className="text-2xl font-bold">Retos</h1>
            <p className="text-xs text-zinc-400">
              Series de checkpoints para construir hábito y desbloquear XP.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <KreoonSkeleton key={i} variant="card" height={160} />
            ))}
          </div>
        ) : !challenges?.length ? (
          <Card className="bg-white/5 border-white/10 p-10 text-center">
            <Sparkles className="h-10 w-10 mx-auto mb-3" style={{ color: accent }} />
            <p className="text-zinc-300">No hay retos activos por ahora.</p>
            <p className="text-xs text-zinc-500 mt-1">Pronto se publicarán nuevos.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.map((c) => {
              const part = partMap.get(c.id) as any;
              const joined = !!part;
              return (
                <Card key={c.id} className="bg-white/5 border-white/10 overflow-hidden">
                  {c.cover_url ? (
                    <img src={c.cover_url} alt="" className="w-full h-32 object-cover" />
                  ) : (
                    <div
                      className="w-full h-32 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${accent}33, transparent)` }}
                    >
                      <Trophy className="h-12 w-12" style={{ color: accent }} />
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-zinc-100">{c.title}</h3>
                      <Badge variant="outline" className="border-white/10 text-zinc-300 text-[10px] shrink-0">
                        +{c.xp_reward} XP
                      </Badge>
                    </div>
                    {c.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2">{c.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                      {c.mode === 'fixed_dates' ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(c.start_date!).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                          })}{' '}
                          –{' '}
                          {new Date(c.end_date!).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {c.duration_days} días desde tu join
                        </span>
                      )}
                    </div>

                    {joined ? (
                      <Link to={`/academia/${spaceSlug}/retos/${c.slug}`}>
                        <Button
                          variant="outline"
                          className="w-full justify-between border-white/10"
                          style={{ color: accent }}
                        >
                          Continuar reto <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={() => joinMutation.mutate(c.id)}
                        disabled={joinMutation.isPending}
                        style={{ backgroundColor: accent }}
                        className="w-full"
                      >
                        Unirme al reto
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
