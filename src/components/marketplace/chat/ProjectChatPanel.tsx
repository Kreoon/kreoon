import { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
// TODO: Connect to real project messages table
import type { ProjectMessage } from '../types/marketplace';

interface ProjectChatPanelProps {
  projectId: string;
  currentUserId: string;
  currentUserRole: 'brand' | 'creator' | 'editor';
}

export function ProjectChatPanel({ projectId, currentUserId, currentUserRole }: ProjectChatPanelProps) {
  // TODO: Connect to real project messages table
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newMsg: ProjectMessage = {
      id: `msg-local-${Date.now()}`,
      project_id: projectId,
      sender_id: currentUserId,
      sender_name: currentUserRole === 'brand' ? 'Tu' : 'Tu',
      sender_role: currentUserRole,
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMsg]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-sm py-12">
            No hay mensajes aun. Inicia la conversacion.
          </div>
        )}
        {messages.map(msg => {
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
        })}
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
            disabled={!input.trim()}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-2 text-center">
          Comunicacion protegida dentro de Kreoon
        </p>
      </div>
    </div>
  );
}
