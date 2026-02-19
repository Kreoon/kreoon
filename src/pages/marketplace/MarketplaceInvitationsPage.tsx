import { useState } from 'react';
import { UserPlus, Send, Inbox, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  useOrgSentInvitations,
  useCreatorReceivedInvitations,
  useAcceptRecruitment,
  useDeclineRecruitment,
  useCancelRecruitment,
} from '@/hooks/useMarketplaceOrgInvitations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type InvTab = 'sent' | 'received';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400',
  accepted: 'bg-green-500/15 text-green-400',
  declined: 'bg-red-500/15 text-red-400',
  cancelled: 'bg-gray-500/15 text-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  declined: 'Rechazada',
  cancelled: 'Cancelada',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  creator: 'Creador',
  editor: 'Editor',
  strategist: 'Estratega',
  trafficker: 'Trafficker',
  team_leader: 'Líder de Equipo',
  client: 'Cliente',
};

export default function MarketplaceInvitationsPage() {
  const { profile, user } = useAuth();
  const orgId = profile?.current_organization_id || null;
  const [tab, setTab] = useState<InvTab>('sent');

  const { invitations: sent, loading: sentLoading } = useOrgSentInvitations(orgId);
  const { invitations: received, loading: receivedLoading } = useCreatorReceivedInvitations(user?.id);

  const acceptMutation = useAcceptRecruitment();
  const declineMutation = useDeclineRecruitment();
  const cancelMutation = useCancelRecruitment();

  const loading = tab === 'sent' ? sentLoading : receivedLoading;
  const invitations = tab === 'sent' ? sent : received;

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-purple-400" />
            Invitaciones de Reclutamiento
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona invitaciones de reclutamiento del marketplace</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/5 mb-6">
          <button
            onClick={() => setTab('sent')}
            className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
              tab === 'sent' ? 'text-foreground border-purple-500' : 'text-gray-500 border-transparent hover:text-foreground')}
          >
            <Send className="h-4 w-4" /> Enviadas {sent.length > 0 && `(${sent.length})`}
          </button>
          <button
            onClick={() => setTab('received')}
            className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
              tab === 'received' ? 'text-foreground border-purple-500' : 'text-gray-500 border-transparent hover:text-foreground')}
          >
            <Inbox className="h-4 w-4" /> Recibidas {received.length > 0 && `(${received.length})`}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-16">
            <UserPlus className="h-12 w-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">
              {tab === 'sent' ? 'No has enviado invitaciones aún' : 'No tienes invitaciones recibidas'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={
                    tab === 'sent'
                      ? inv.creator?.avatar_url || ''
                      : (inv as any).organization?.logo_url || ''
                  } />
                  <AvatarFallback className="text-xs bg-purple-500/20 text-purple-400">
                    {tab === 'sent'
                      ? (inv.creator?.full_name || '?').slice(0, 2).toUpperCase()
                      : ((inv as any).organization?.name || '?').slice(0, 2).toUpperCase()
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {tab === 'sent'
                      ? inv.creator?.full_name || 'Creador'
                      : (inv as any).organization?.name || 'Organización'
                    }
                  </p>
                  <p className="text-xs text-purple-400">
                    Rol: {ROLE_LABELS[inv.proposed_role] || inv.proposed_role}
                  </p>
                  {inv.message && <p className="text-xs text-gray-500 truncate mt-0.5">{inv.message}</p>}
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(inv.created_at).toLocaleDateString('es-CO')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs', STATUS_COLORS[inv.status] || '')}>
                    {STATUS_LABELS[inv.status] || inv.status}
                  </Badge>

                  {/* Sent tab: Cancel button for pending invitations */}
                  {tab === 'sent' && inv.status === 'pending' && (
                    <button
                      onClick={() => cancelMutation.mutate(inv.id)}
                      disabled={cancelMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 border border-white/10 rounded-lg hover:bg-white/5 hover:text-red-400 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancelar
                    </button>
                  )}

                  {/* Received tab: Accept/Decline buttons for pending invitations */}
                  {tab === 'received' && inv.status === 'pending' && (
                    <>
                      <button
                        onClick={() => acceptMutation.mutate(inv.id)}
                        disabled={acceptMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/10 transition-colors"
                      >
                        {acceptMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        Aceptar
                      </button>
                      <button
                        onClick={() => declineMutation.mutate({ invitationId: inv.id })}
                        disabled={declineMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        {declineMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
