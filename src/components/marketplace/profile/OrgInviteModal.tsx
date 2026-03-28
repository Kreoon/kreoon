import { useState } from 'react';
import { X, Send, Loader2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSendRecruitment } from '@/hooks/useMarketplaceOrgInvitations';

const ROLE_OPTIONS = [
  { value: 'creator', label: 'Creador de Contenido', desc: 'Producción de contenido UGC, reels, videos' },
  { value: 'editor', label: 'Productor Audio-Visual', desc: 'Edición de video, audio y post-producción' },
  { value: 'strategist', label: 'Estratega', desc: 'Planificación de contenido y estrategia digital' },
  { value: 'trafficker', label: 'Trafficker', desc: 'Gestión de pauta publicitaria y ads' },
  { value: 'team_leader', label: 'Líder de Equipo', desc: 'Coordinación y supervisión de equipos' },
] as const;

interface OrgInviteModalProps {
  creatorUserId: string;
  creatorName: string;
  onClose: () => void;
}

export function OrgInviteModal({ creatorUserId, creatorName, onClose }: OrgInviteModalProps) {
  const sendRecruitment = useSendRecruitment();
  const [selectedRole, setSelectedRole] = useState('creator');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    sendRecruitment.mutate(
      {
        creator_user_id: creatorUserId,
        proposed_role: selectedRole,
        message: message.trim() || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-card border border-white/10 rounded-sm w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-sm">Invitar a mi organización</h2>
                <p className="text-gray-500 text-xs mt-0.5">{creatorName}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Role selector */}
            <div>
              <label className="text-foreground/80 text-sm font-medium block mb-2">
                Rol propuesto <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map(role => (
                  <button
                    key={role.value}
                    onClick={() => setSelectedRole(role.value)}
                    className={cn(
                      'w-full text-left border rounded-sm p-3 transition-all',
                      selectedRole === role.value
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 hover:border-purple-500/30',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          selectedRole === role.value ? 'border-purple-500' : 'border-gray-600',
                        )}
                      >
                        {selectedRole === role.value && (
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{role.label}</p>
                        <p className="text-gray-500 text-xs">{role.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-foreground/80 text-sm font-medium block mb-1.5">
                Mensaje personalizado (opcional)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Cuéntale por qué quieres que se una a tu equipo..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 resize-none"
              />
              <p className="text-gray-600 text-xs mt-1">{message.length}/300 caracteres</p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-white/10 text-gray-400 py-3 rounded-sm hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={sendRecruitment.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-sm transition-colors text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sendRecruitment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sendRecruitment.isPending ? 'Enviando...' : 'Enviar Invitación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
