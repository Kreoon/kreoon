import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Star,
  CheckCircle2,
  XCircle,
  Bookmark,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { HostProfileCard } from '../shared/HostProfileCard';
import { useLiveHostingHosts } from '@/hooks/useLiveHosting';
import type { LiveHostingHostWithProfile, HostStatus } from '@/types/live-hosting.types';
import { HOST_STATUS_LABELS } from '@/types/live-hosting.types';

interface ApplicationReviewPanelProps {
  requestId: string;
}

export function ApplicationReviewPanel({ requestId }: ApplicationReviewPanelProps) {
  const { hosts, isLoading, reviewHost, isReviewing, finalizeNegotiation, isFinalizing } =
    useLiveHostingHosts(requestId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHost, setSelectedHost] = useState<LiveHostingHostWithProfile | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [hostToReject, setHostToReject] = useState<string | null>(null);

  const filteredHosts = hosts.filter(
    (h) =>
      h.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.creator_slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedHosts = {
    applied: filteredHosts.filter((h) => h.status === 'applied'),
    shortlisted: filteredHosts.filter((h) => h.status === 'shortlisted'),
    selected: filteredHosts.filter((h) => h.status === 'selected'),
    confirmed: filteredHosts.filter((h) => h.status === 'confirmed'),
    rejected: filteredHosts.filter((h) => h.status === 'rejected'),
  };

  const handleShortlist = async (hostId: string) => {
    await reviewHost({
      host_id: hostId,
      action: 'shortlist',
    });
  };

  const handleSelect = async (hostId: string) => {
    await reviewHost({
      host_id: hostId,
      action: 'select',
    });
  };

  const handleReject = async () => {
    if (!hostToReject) return;
    await reviewHost({
      host_id: hostToReject,
      action: 'reject',
      reason: rejectReason,
    });
    setRejectDialogOpen(false);
    setHostToReject(null);
    setRejectReason('');
  };

  const handleConfirm = async (hostId: string, agreedRate: number) => {
    await finalizeNegotiation({
      host_id: hostId,
      agreed_rate_usd: agreedRate,
    });
  };

  const openRejectDialog = (hostId: string) => {
    setHostToReject(hostId);
    setRejectDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Aplicaciones ({hosts.length})</span>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar hosts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="applied">
            <TabsList>
              <TabsTrigger value="applied">
                Nuevas ({groupedHosts.applied.length})
              </TabsTrigger>
              <TabsTrigger value="shortlisted">
                Preseleccionados ({groupedHosts.shortlisted.length})
              </TabsTrigger>
              <TabsTrigger value="selected">
                Seleccionado ({groupedHosts.selected.length})
              </TabsTrigger>
              <TabsTrigger value="confirmed">
                Confirmado ({groupedHosts.confirmed.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applied" className="mt-4 space-y-3">
              {groupedHosts.applied.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay aplicaciones nuevas
                </p>
              ) : (
                groupedHosts.applied.map((host) => (
                  <div key={host.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <HostProfileCard
                        host={host}
                        showStatus={false}
                        onClick={() => setSelectedHost(host)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShortlist(host.id)}
                        disabled={isReviewing}
                      >
                        <Bookmark className="h-4 w-4 mr-1" />
                        Preseleccionar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openRejectDialog(host.id)}
                        disabled={isReviewing}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="shortlisted" className="mt-4 space-y-3">
              {groupedHosts.shortlisted.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay hosts preseleccionados
                </p>
              ) : (
                groupedHosts.shortlisted.map((host) => (
                  <div key={host.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <HostProfileCard
                        host={host}
                        showStatus={false}
                        onClick={() => setSelectedHost(host)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSelect(host.id)}
                        disabled={isReviewing}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Seleccionar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openRejectDialog(host.id)}
                        disabled={isReviewing}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="selected" className="mt-4 space-y-3">
              {groupedHosts.selected.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay host seleccionado
                </p>
              ) : (
                groupedHosts.selected.map((host) => (
                  <div key={host.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <HostProfileCard
                        host={host}
                        showStatus={false}
                        onClick={() => setSelectedHost(host)}
                      />
                    </div>
                    <Button
                      onClick={() =>
                        handleConfirm(host.id, host.proposed_rate_usd || 0)
                      }
                      disabled={isFinalizing}
                    >
                      {isFinalizing ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      Confirmar y Pagar
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="confirmed" className="mt-4 space-y-3">
              {groupedHosts.confirmed.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay host confirmado
                </p>
              ) : (
                groupedHosts.confirmed.map((host) => (
                  <div key={host.id}>
                    <HostProfileCard
                      host={host}
                      onClick={() => setSelectedHost(host)}
                    />
                    <div className="mt-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                      <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                        Host confirmado - Tarifa acordada: ${host.agreed_rate_usd} USD
                      </p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Host detail sheet */}
      <Sheet open={!!selectedHost} onOpenChange={() => setSelectedHost(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Detalle del Host</SheetTitle>
            <SheetDescription>
              Información completa de la aplicación
            </SheetDescription>
          </SheetHeader>

          {selectedHost && (
            <div className="mt-6 space-y-6">
              <HostProfileCard host={selectedHost} />

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Propuesta económica</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Tarifa: ${selectedHost.proposed_rate_usd} USD</span>
                    {selectedHost.commission_on_sales_pct && (
                      <span>+ {selectedHost.commission_on_sales_pct}% comisión</span>
                    )}
                  </div>
                </div>

                {selectedHost.application_message && (
                  <div>
                    <h4 className="font-medium mb-2">Mensaje de aplicación</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedHost.application_message}
                    </p>
                  </div>
                )}

                {selectedHost.experience_description && (
                  <div>
                    <h4 className="font-medium mb-2">Experiencia</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedHost.experience_description}
                    </p>
                  </div>
                )}

                {selectedHost.portfolio_links && selectedHost.portfolio_links.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Portafolio</h4>
                    <div className="space-y-2">
                      {selectedHost.portfolio_links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar aplicación</AlertDialogTitle>
            <AlertDialogDescription>
              Indica el motivo del rechazo (opcional). El host será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo del rechazo..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject}>
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
