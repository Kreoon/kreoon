import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Inbox,
  Clock,
  DollarSign,
  Calendar,
  Check,
  X,
  MessageCircle,
  ThumbsUp,
  Eye,
  ChevronRight,
  Loader2,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useMarketplaceProposals, useMarketplaceProposal } from '@/hooks/useMarketplaceProposals';
import { useAuth } from '@/hooks/useAuth';
import type { MarketplaceProposal, ProposalStatus } from '@/types/marketplace';
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_COLORS, SERVICE_TYPE_ICONS } from '@/types/marketplace';

interface ProposalInboxProps {
  className?: string;
}

export function ProposalInbox({ className }: ProposalInboxProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'negotiating' | 'history'>('pending');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

  // Fetch proposals as provider
  const { proposals, isLoading, markAsViewed, updateStatus, getCounts, pendingCount } =
    useMarketplaceProposals({ role: 'provider' });

  const counts = getCounts();

  // Filter proposals by tab
  const getFilteredProposals = () => {
    switch (activeTab) {
      case 'pending':
        return proposals.filter((p) => ['pending', 'viewed', 'interested'].includes(p.status));
      case 'negotiating':
        return proposals.filter((p) => p.status === 'negotiating');
      case 'history':
        return proposals.filter((p) =>
          ['accepted', 'declined', 'expired', 'withdrawn'].includes(p.status)
        );
      default:
        return proposals;
    }
  };

  const filteredProposals = getFilteredProposals();

  // Mark as viewed when opening
  const handleSelectProposal = async (proposal: MarketplaceProposal) => {
    setSelectedProposalId(proposal.id);
    if (proposal.status === 'pending' && proposal.provider_id === user?.id) {
      await markAsViewed(proposal.id);
    }
  };

  const formatBudget = (proposal: MarketplaceProposal) => {
    if (proposal.budget_type === 'open' || !proposal.proposed_budget) {
      return 'A convenir';
    }
    const prefix = proposal.budget_type === 'range' ? '' : '';
    const suffix =
      proposal.budget_type === 'range' && proposal.budget_max
        ? ` - $${proposal.budget_max}`
        : '';
    const hourly = proposal.budget_type === 'hourly' ? '/h' : '';
    return `$${proposal.proposed_budget}${suffix} ${proposal.budget_currency}${hourly}`;
  };

  const getStatusIcon = (status: ProposalStatus) => {
    switch (status) {
      case 'pending':
        return <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />;
      case 'viewed':
        return <Eye className="h-3 w-3 text-yellow-500" />;
      case 'interested':
        return <ThumbsUp className="h-3 w-3 text-green-500" />;
      case 'negotiating':
        return <MessageCircle className="h-3 w-3 text-purple-500" />;
      case 'accepted':
        return <Check className="h-3 w-3 text-green-600" />;
      case 'declined':
        return <X className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-social-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-social-foreground" />
          <h2 className="text-lg font-semibold text-social-foreground">Propuestas</h2>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="rounded-full px-2">
              {pendingCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-social-muted w-full">
          <TabsTrigger value="pending" className="flex-1 gap-1">
            Pendientes
            {counts.pending + counts.viewed + counts.interested > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {counts.pending + counts.viewed + counts.interested}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="negotiating" className="flex-1 gap-1">
            En negociación
            {counts.negotiating > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {counts.negotiating}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredProposals.length === 0 ? (
            <div className="text-center py-12 text-social-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay propuestas {activeTab === 'pending' ? 'pendientes' : 'en esta sección'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredProposals.map((proposal, index) => (
                  <Sheet key={proposal.id}>
                    <SheetTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelectProposal(proposal)}
                        className={cn(
                          "p-4 rounded-xl border cursor-pointer transition-all duration-200",
                          "bg-social-card border-social-border",
                          "hover:border-social-accent/50 hover:shadow-lg",
                          proposal.status === 'pending' && "border-l-4 border-l-blue-500"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Status indicator */}
                          <div className="mt-1">{getStatusIcon(proposal.status)}</div>

                          {/* Avatar */}
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={proposal.client?.avatar_url || undefined} />
                            <AvatarFallback>
                              {proposal.client?.full_name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-social-foreground">
                                {proposal.client?.full_name}
                              </span>
                              {proposal.client?.username && (
                                <span className="text-sm text-social-muted-foreground">
                                  @{proposal.client.username}
                                </span>
                              )}
                            </div>

                            <h4 className="font-medium text-social-foreground mt-1 line-clamp-1">
                              {proposal.title}
                            </h4>

                            <p className="text-sm text-social-muted-foreground mt-0.5 line-clamp-1">
                              {proposal.description}
                            </p>

                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1 text-social-foreground font-medium">
                                <DollarSign className="h-3.5 w-3.5" />
                                {formatBudget(proposal)}
                              </span>
                              {proposal.desired_deadline && (
                                <span className="flex items-center gap-1 text-social-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(proposal.desired_deadline).toLocaleDateString()}
                                </span>
                              )}
                              <span className="text-social-muted-foreground">
                                {formatDistanceToNow(new Date(proposal.created_at), {
                                  addSuffix: true,
                                  locale: es,
                                })}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="h-5 w-5 text-social-muted-foreground" />
                        </div>
                      </motion.div>
                    </SheetTrigger>

                    <SheetContent className="w-full sm:max-w-lg bg-social-card border-social-border">
                      <ProposalDetail
                        proposalId={proposal.id}
                        onStatusUpdate={(status) => updateStatus({ proposalId: proposal.id, status })}
                      />
                    </SheetContent>
                  </Sheet>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Proposal detail component
interface ProposalDetailProps {
  proposalId: string;
  onStatusUpdate: (status: ProposalStatus) => void;
}

function ProposalDetail({ proposalId, onStatusUpdate }: ProposalDetailProps) {
  const { proposal, messages, isLoading, sendMessage, isSending } = useMarketplaceProposal(proposalId);
  const [messageText, setMessageText] = useState('');

  if (isLoading || !proposal) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const formatBudget = () => {
    if (proposal.budget_type === 'open' || !proposal.proposed_budget) {
      return 'A convenir';
    }
    const suffix =
      proposal.budget_type === 'range' && proposal.budget_max
        ? ` - $${proposal.budget_max}`
        : '';
    return `$${proposal.proposed_budget}${suffix} ${proposal.budget_currency}`;
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    await sendMessage({ message: messageText });
    setMessageText('');
  };

  const canRespond = ['pending', 'viewed', 'interested', 'negotiating'].includes(proposal.status);

  return (
    <ScrollArea className="h-full">
      <SheetHeader>
        <SheetTitle className="text-social-foreground">{proposal.title}</SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        {/* Client info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={proposal.client?.avatar_url || undefined} />
            <AvatarFallback>{proposal.client?.full_name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-social-foreground">{proposal.client?.full_name}</p>
            {proposal.client?.username && (
              <p className="text-sm text-social-muted-foreground">@{proposal.client.username}</p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <Badge className={cn("w-fit", PROPOSAL_STATUS_COLORS[proposal.status])}>
          {PROPOSAL_STATUS_LABELS[proposal.status]}
        </Badge>

        {/* Description */}
        <div>
          <h4 className="text-sm font-medium text-social-foreground mb-2">Descripción</h4>
          <p className="text-sm text-social-muted-foreground whitespace-pre-wrap">
            {proposal.description}
          </p>
        </div>

        {/* Service */}
        {proposal.service && (
          <div>
            <h4 className="text-sm font-medium text-social-foreground mb-2">Servicio solicitado</h4>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-social-muted">
              <span>{SERVICE_TYPE_ICONS[proposal.service.service_type]}</span>
              <span className="text-social-foreground">{proposal.service.title}</span>
            </div>
          </div>
        )}

        {/* Budget & deadline */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-social-foreground mb-1">Presupuesto</h4>
            <p className="text-lg font-semibold text-social-foreground">{formatBudget()}</p>
          </div>
          {proposal.desired_deadline && (
            <div>
              <h4 className="text-sm font-medium text-social-foreground mb-1">Fecha deseada</h4>
              <p className="text-social-muted-foreground">
                {new Date(proposal.desired_deadline).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {canRespond && (
          <div className="flex gap-2 pt-4 border-t border-social-border">
            {proposal.status === 'pending' || proposal.status === 'viewed' ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onStatusUpdate('declined')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onStatusUpdate('interested')}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Interesado
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onStatusUpdate('declined')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-social-accent to-purple-600"
                  onClick={() => onStatusUpdate('accepted')}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aceptar
                </Button>
              </>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="pt-4 border-t border-social-border">
            <h4 className="text-sm font-medium text-social-foreground mb-3">Mensajes</h4>
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-lg text-sm",
                    msg.sender_id === proposal.provider_id
                      ? "bg-social-accent/20 ml-8"
                      : "bg-social-muted mr-8"
                  )}
                >
                  <p className="text-social-foreground">{msg.message}</p>
                  <p className="text-xs text-social-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message input */}
        {canRespond && (
          <div className="flex gap-2 pt-4">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-3 py-2 rounded-lg bg-social-muted border border-social-border text-social-foreground placeholder:text-social-muted-foreground focus:outline-none focus:ring-2 focus:ring-social-accent"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} disabled={isSending || !messageText.trim()}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
