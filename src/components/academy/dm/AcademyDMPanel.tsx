// ============================================================================
// Panel de DMs: lista de threads + conversación abierta.
// Reglas de gating gestionadas en el RPC (creator↔talent libre, student/client
// solo con admin del space).
// ============================================================================

import { useEffect, useState, useRef } from 'react';
import { Send, Loader2, MessageSquare, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useMyDmThreads, useDmMessages, useSendDm, useMarkDmRead } from '@/hooks/academy/useAcademyDM';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props { spaceId?: string; }

export function AcademyDMPanel({ spaceId }: Props) {
  const { user } = useAuth();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeOtherUser, setActiveOtherUser] = useState<{ id: string; name: string } | null>(null);
  const [draft, setDraft] = useState('');
  const { data: threads = [], isLoading } = useMyDmThreads(spaceId);
  const { data: messages = [] } = useDmMessages(activeThreadId);
  const sendMutation = useSendDm();
  const markRead = useMarkDmRead();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeThreadId) markRead.mutate(activeThreadId);
  }, [activeThreadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    if (!draft.trim() || !activeOtherUser || !spaceId) return;
    try {
      await sendMutation.mutateAsync({
        spaceId,
        toUserId: activeOtherUser.id,
        body: draft.trim(),
      });
      setDraft('');
    } catch (e: any) {
      const msg = e?.message?.includes('dm_not_allowed_for_roles')
        ? 'Tu rol no permite chatear con este miembro. Solo admins pueden iniciar este DM.'
        : 'No pudimos enviar el mensaje';
      toast.error(msg);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[70vh]">
      {/* Sidebar threads */}
      <Card className={cn(
        'bg-white/5 border-white/10 overflow-hidden flex flex-col',
        activeThreadId && 'hidden md:flex'
      )}>
        <div className="border-b border-white/10 px-4 py-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-violet-400" />
            Mensajes
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-zinc-500 text-xs">Cargando...</div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-xs">
              No tenés conversaciones aún. Iniciá una desde el perfil de un miembro.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {threads.map((t) => (
                <li key={t.thread_id}>
                  <button
                    onClick={() => {
                      setActiveThreadId(t.thread_id);
                      setActiveOtherUser({ id: t.other_user_id, name: t.other_user_name });
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors flex gap-2',
                      activeThreadId === t.thread_id && 'bg-violet-500/10'
                    )}
                  >
                    <Avatar url={t.other_user_avatar} name={t.other_user_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-100 truncate">
                          {t.other_user_name}
                        </span>
                        {t.unread_count > 0 && (
                          <span className="text-[10px] bg-violet-500 text-white px-1.5 py-0.5 rounded-full">
                            {t.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {t.last_message_preview ?? '...'}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Conversation */}
      <Card className={cn(
        'bg-white/5 border-white/10 overflow-hidden flex flex-col',
        !activeThreadId && 'hidden md:flex'
      )}>
        {!activeThreadId ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm text-center px-6">
            Elegí una conversación de la izquierda.
          </div>
        ) : (
          <>
            <div className="border-b border-white/10 px-4 py-3 flex items-center gap-2">
              <button
                className="md:hidden text-zinc-400 hover:text-zinc-100"
                onClick={() => setActiveThreadId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-sm text-zinc-100">
                {activeOtherUser?.name}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[75%] px-3 py-2 rounded-2xl text-sm',
                      mine
                        ? 'bg-violet-500 text-white rounded-br-sm'
                        : 'bg-white/10 text-zinc-100 rounded-bl-sm'
                    )}>
                      {m.body}
                      <div className={cn(
                        'text-[10px] mt-1 opacity-60',
                        mine ? 'text-violet-100' : 'text-zinc-400'
                      )}>
                        {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <div className="border-t border-white/10 p-3 flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                placeholder="Escribí un mensaje..."
                className="bg-black/30 border-white/10"
                maxLength={4000}
              />
              <Button
                onClick={() => void send()}
                disabled={!draft.trim() || sendMutation.isPending}
                className="bg-violet-500 hover:bg-violet-600 text-white"
              >
                {sendMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) return <img src={url} alt="" className="h-9 w-9 rounded-full object-cover" />;
  return (
    <div className="h-9 w-9 rounded-full flex items-center justify-center bg-violet-500/20 text-violet-200 text-sm font-semibold">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/** Botón para iniciar un DM desde el perfil/card de un miembro. */
export function StartDmButton({
  spaceId,
  targetUserId,
  targetName,
  className,
}: {
  spaceId: string;
  targetUserId: string;
  targetName: string;
  className?: string;
}) {
  const sendMutation = useSendDm();
  const [showCompose, setShowCompose] = useState(false);
  const [body, setBody] = useState('');

  if (!showCompose) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowCompose(true)}
        className={className}
      >
        <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Enviar mensaje
      </Button>
    );
  }

  const send = async () => {
    if (!body.trim()) return;
    try {
      await sendMutation.mutateAsync({ spaceId, toUserId: targetUserId, body: body.trim() });
      toast.success(`Mensaje enviado a ${targetName}`);
      setBody('');
      setShowCompose(false);
    } catch (e: any) {
      const msg = e?.message?.includes('dm_not_allowed_for_roles')
        ? 'Tu rol no permite chatear directamente con este miembro.'
        : 'No pudimos enviar el mensaje';
      toast.error(msg, { icon: <ShieldAlert className="h-4 w-4" /> });
    }
  };

  return (
    <div className={cn('flex gap-2 items-start', className)}>
      <Input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`Mensaje a ${targetName}...`}
        autoFocus
        maxLength={4000}
        className="bg-black/30 border-white/10"
      />
      <Button
        onClick={() => void send()}
        disabled={!body.trim() || sendMutation.isPending}
        size="sm"
        className="bg-violet-500 hover:bg-violet-600 text-white"
      >
        {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
      <Button onClick={() => setShowCompose(false)} size="sm" variant="ghost">
        Cancelar
      </Button>
    </div>
  );
}
