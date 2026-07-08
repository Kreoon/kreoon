import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Lock, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { toast } from 'sonner';

interface Checkpoint {
  id: string;
  sort_order: number;
  title: string;
  description: string | null;
  video_url: string | null;
  submission_type: 'none' | 'text' | 'file' | 'video' | 'link' | 'photo';
  submission_prompt: string | null;
  xp_reward: number;
  requires_review: boolean;
}

export default function AcademiaChallengeDetailPage() {
  const { spaceSlug, challengeSlug } = useParams<{ spaceSlug: string; challengeSlug: string }>();
  const { user } = useAuth();
  const { data: space } = useAcademySpace(spaceSlug);
  const qc = useQueryClient();
  const accent = space?.accent_color || '#8B5CF6';

  const { data: challenge } = useQuery({
    queryKey: ['academy-challenge', space?.id, challengeSlug],
    enabled: !!space?.id && !!challengeSlug,
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_challenges')
        .select('*')
        .eq('space_id', space!.id)
        .eq('slug', challengeSlug!)
        .maybeSingle();
      return data;
    },
  });

  const { data: checkpoints } = useQuery({
    queryKey: ['academy-checkpoints', challenge?.id],
    enabled: !!challenge?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_challenge_checkpoints')
        .select('*')
        .eq('challenge_id', challenge!.id)
        .order('sort_order', { ascending: true });
      return (data ?? []) as Checkpoint[];
    },
  });

  const { data: participant } = useQuery({
    queryKey: ['academy-participant', challenge?.id, user?.id],
    enabled: !!challenge?.id && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_challenge_participants')
        .select('*')
        .eq('challenge_id', challenge!.id)
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ['academy-my-submissions', challenge?.id, user?.id],
    enabled: !!user?.id && !!challenge?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_challenge_submissions')
        .select('checkpoint_id, status')
        .eq('user_id', user!.id);
      return data ?? [];
    },
  });

  const subMap = new Map((submissions ?? []).map((s: any) => [s.checkpoint_id, s.status]));

  if (!space || !challenge) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center text-zinc-400">
        Cargando…
      </div>
    );
  }

  const currentOrder = participant?.current_checkpoint_order ?? 0;

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6" style={{ color: accent }} />
          <div>
            <h1 className="text-xl font-bold">{challenge.title}</h1>
            {challenge.description && (
              <p className="text-sm text-zinc-400">{challenge.description}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {checkpoints?.map((cp, idx) => {
            const subStatus = subMap.get(cp.id);
            const isCompleted = subStatus === 'approved' || subStatus === 'auto_approved';
            const isPending = subStatus === 'pending';
            const isUnlocked = idx <= currentOrder || isCompleted;
            return (
              <CheckpointCard
                key={cp.id}
                checkpoint={cp}
                participantId={participant?.id ?? null}
                isUnlocked={isUnlocked}
                isCompleted={isCompleted}
                isPending={isPending}
                accentColor={accent}
                onSubmitted={() => {
                  qc.invalidateQueries({ queryKey: ['academy-my-submissions'] });
                  qc.invalidateQueries({ queryKey: ['academy-participant'] });
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CheckpointCard({
  checkpoint,
  participantId,
  isUnlocked,
  isCompleted,
  isPending,
  accentColor,
  onSubmitted,
}: {
  checkpoint: Checkpoint;
  participantId: string | null;
  isUnlocked: boolean;
  isCompleted: boolean;
  isPending: boolean;
  accentColor: string;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [link, setLink] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !participantId) throw new Error('no_participant');
      const { error } = await supabase.from('academy_challenge_submissions').insert({
        checkpoint_id: checkpoint.id,
        participant_id: participantId,
        user_id: user.id,
        submission_text: text || null,
        link_url: link || null,
      });
      if (error) throw error;
      // Avanza el participant
      await supabase
        .from('academy_challenge_participants')
        .update({ current_checkpoint_order: checkpoint.sort_order + 1 })
        .eq('id', participantId);
    },
    onSuccess: () => {
      toast.success('¡Checkpoint enviado!');
      setText('');
      setLink('');
      onSubmitted();
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  return (
    <Card
      className={`p-4 border ${isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <Check className="h-5 w-5 text-emerald-400" />
          ) : !isUnlocked ? (
            <Lock className="h-4 w-4 text-zinc-600" />
          ) : (
            <div
              className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: accentColor + '33', color: accentColor }}
            >
              {checkpoint.sort_order + 1}
            </div>
          )}
          <h3 className={`text-sm font-medium ${isUnlocked ? 'text-zinc-100' : 'text-zinc-500'}`}>
            {checkpoint.title}
          </h3>
        </div>
        <Badge variant="outline" className="border-white/10 text-zinc-400 text-[10px]">
          +{checkpoint.xp_reward} XP
        </Badge>
      </div>

      {isUnlocked && checkpoint.description && (
        <p className="text-xs text-zinc-400 mb-3">{checkpoint.description}</p>
      )}

      {isUnlocked && !isCompleted && checkpoint.submission_type !== 'none' && (
        <div className="space-y-2 mt-3">
          {isPending && (
            <p className="text-xs text-amber-300">En revisión por el instructor</p>
          )}
          {!isPending && (
            <>
              {(checkpoint.submission_type === 'text' || checkpoint.submission_type === 'video' || checkpoint.submission_type === 'photo') && (
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={checkpoint.submission_prompt || 'Tu respuesta'}
                  rows={3}
                  className="bg-white/5 border-white/10 text-sm"
                />
              )}
              {checkpoint.submission_type === 'link' && (
                <Input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://…"
                  className="bg-white/5 border-white/10 text-sm"
                />
              )}
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || (!text && !link)}
                size="sm"
                style={{ backgroundColor: accentColor }}
                className="w-full"
              >
                Enviar checkpoint
              </Button>
            </>
          )}
        </div>
      )}

      {isUnlocked && !isCompleted && checkpoint.submission_type === 'none' && !isPending && (
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          size="sm"
          variant="outline"
          className="border-white/10 mt-3"
        >
          Marcar como visto
        </Button>
      )}
    </Card>
  );
}
