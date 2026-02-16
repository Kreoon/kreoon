import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectMessage } from '../types/marketplace';

interface ProjectChatPanelProps {
  projectId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  currentUserRole: 'brand' | 'creator' | 'editor';
}

export function ProjectChatPanel({
  projectId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserRole,
}: ProjectChatPanelProps) {
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Fetch existing messages
  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('project_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data.map((row: any) => ({
          id: row.id,
          project_id: row.project_id,
          sender_id: row.sender_id,
          sender_name: row.sender_name,
          sender_avatar: row.sender_avatar || undefined,
          sender_role: row.sender_role,
          content: row.content,
          attachment_url: row.file_url || undefined,
          attachment_type: row.file_type || undefined,
          created_at: row.created_at,
        })));
      }
    } catch (err) {
      console.error('[ProjectChatPanel] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`project-messages-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload: any) => {
          const row = payload.new;
          // Don't add duplicates (our own messages are already added optimistically)
          setMessages(prev => {
            if (prev.some(m => m.id === row.id)) return prev;
            return [...prev, {
              id: row.id,
              project_id: row.project_id,
              sender_id: row.sender_id,
              sender_name: row.sender_name,
              sender_avatar: row.sender_avatar || undefined,
              sender_role: row.sender_role,
              content: row.content,
              attachment_url: row.file_url || undefined,
              attachment_type: row.file_type || undefined,
              created_at: row.created_at,
            }];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset unread count when viewing chat
  useEffect(() => {
    const field = currentUserRole === 'brand' ? 'unread_brand_messages' : 'unread_creator_messages';
    (supabase as any)
      .from('marketplace_projects')
      .update({ [field]: 0 })
      .eq('id', projectId)
      .then(() => {});
  }, [projectId, currentUserRole]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    // Optimistic add
    const optimisticMsg: ProjectMessage = {
      id: tempId,
      project_id: projectId,
      sender_id: currentUserId,
      sender_name: currentUserName,
      sender_avatar: currentUserAvatar || undefined,
      sender_role: currentUserRole,
      content: trimmed,
      created_at: now,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');
    setSending(true);

    try {
      const { data, error } = await (supabase as any)
        .from('project_messages')
        .insert({
          project_id: projectId,
          sender_id: currentUserId,
          sender_name: currentUserName,
          sender_avatar: currentUserAvatar || null,
          sender_role: currentUserRole,
          content: trimmed,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Replace temp ID with real ID
      if (data?.id) {
        setMessages(prev =>
          prev.map(m => m.id === tempId ? { ...m, id: data.id } : m),
        );
      }
    } catch (err) {
      console.error('[ProjectChatPanel] Send error:', err);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(trimmed); // Restore input
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-600 text-xs">Cargando mensajes...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-12">
            No hay mensajes aun. Inicia la conversacion.
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === currentUserId;
            const isSystem = msg.sender_role === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full">
                    <Bot className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-500 text-xs">{msg.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn('flex gap-2.5', isMe ? 'flex-row-reverse' : 'flex-row')}
              >
                {!isMe && (
                  msg.sender_avatar ? (
                    <img
                      src={msg.sender_avatar}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold flex-shrink-0">
                      {msg.sender_name.charAt(0)}
                    </div>
                  )
                )}
                <div className={cn('max-w-[75%]', isMe ? 'items-end' : 'items-start')}>
                  {!isMe && (
                    <p className="text-gray-500 text-xs mb-1">{msg.sender_name}</p>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      isMe
                        ? 'bg-purple-600 text-white rounded-tr-sm'
                        : 'bg-white/10 text-gray-200 rounded-tl-sm',
                    )}
                  >
                    {msg.content}
                  </div>
                  <p className="text-gray-600 text-xs mt-1">
                    {new Date(msg.created_at).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-2 text-center">
          Comunicacion protegida dentro de Kreoon
        </p>
      </div>
    </div>
  );
}
