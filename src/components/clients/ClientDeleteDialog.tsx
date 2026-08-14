import { useState } from 'react';
import {
  Archive, ChevronDown, Loader2, ShieldAlert, Trash2, Info,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ClientDeletionImpact {
  contenidos: number;
  productos: number;
  paquetes: number;
  pagos: number;
  usuarios_portal: number;
  runs_pipeline: number;
  documentos: number;
  licencias: number;
}

interface ClientDeleteDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama después de archivar exitosamente */
  onArchived?: () => void;
  /** Se llama después de borrar definitivamente */
  onDeleted?: () => void;
}

/** Textos en singular/plural para cada número que devuelve get_client_deletion_impact */
const IMPACT_ROWS: { key: keyof ClientDeletionImpact; singular: string; plural: string }[] = [
  { key: 'contenidos', singular: 'video quedará sin empresa', plural: 'videos quedarán sin empresa' },
  { key: 'productos', singular: 'producto con su ADN y su estrategia se perderá', plural: 'productos con su ADN y su estrategia se perderán' },
  { key: 'paquetes', singular: 'campaña o paquete contratado se perderá', plural: 'campañas o paquetes contratados se perderán' },
  { key: 'pagos', singular: 'pago o cobro registrado se perderá', plural: 'pagos o cobros registrados se perderán' },
  { key: 'usuarios_portal', singular: 'acceso al portal de cliente se perderá', plural: 'accesos al portal de cliente se perderán' },
  { key: 'runs_pipeline', singular: 'investigación (ADN) generada se perderá', plural: 'investigaciones (ADN) generadas se perderán' },
  { key: 'documentos', singular: 'documento adjunto se perderá', plural: 'documentos adjuntos se perderán' },
];

export function ClientDeleteDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
  onArchived,
  onDeleted,
}: ClientDeleteDialogProps) {
  const { toast } = useToast();
  const [archiving, setArchiving] = useState(false);
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [impact, setImpact] = useState<ClientDeletionImpact | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const resetState = () => {
    setShowDeleteSection(false);
    setImpact(null);
    setConfirmName('');
    setArchiving(false);
    setDeleting(false);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const { error } = await supabase.rpc('admin_archive_client' as any, { p_client_id: clientId });
      if (error) throw error;
      toast({
        title: 'Empresa archivada',
        description: `${clientName} se ocultó de las listas. Puedes recuperarla cuando quieras desde "Archivadas".`,
      });
      onArchived?.();
      handleDialogChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo archivar la empresa';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setArchiving(false);
    }
  };

  const handleToggleDeleteSection = async (next: boolean) => {
    setShowDeleteSection(next);
    if (next && !impact && !loadingImpact) {
      setLoadingImpact(true);
      try {
        const { data, error } = await supabase.rpc('get_client_deletion_impact' as any, { p_client_id: clientId });
        if (error) throw error;
        setImpact(data as unknown as ClientDeletionImpact);
      } catch {
        toast({ title: 'Error', description: 'No se pudo calcular qué se perdería al borrar', variant: 'destructive' });
      } finally {
        setLoadingImpact(false);
      }
    }
  };

  const hasLicenses = (impact?.licencias || 0) > 0;
  const nameMatches = confirmName.trim().length > 0 && confirmName.trim() === clientName.trim();
  const canDelete = !!impact && !hasLicenses && nameMatches;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error('No autenticado');

      const { error } = await supabase.functions.invoke('admin-users', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'delete_client', clientId },
      });
      if (error) throw error;

      toast({
        title: 'Empresa eliminada',
        description: `${clientName} y toda su información se borraron definitivamente.`,
      });
      onDeleted?.();
      handleDialogChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la empresa';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const visibleImpactRows = impact
    ? IMPACT_ROWS.filter(row => (impact[row.key] || 0) > 0)
    : [];

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            Eliminar "{clientName}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nivel 1: Archivar (recomendado, reversible) */}
          <div className="rounded-sm border border-primary/30 bg-primary/5 p-4 space-y-3">
            <p className="text-sm text-foreground leading-relaxed">
              Al archivar, <strong>"{clientName}"</strong> desaparece de las listas y búsquedas,
              pero <strong>no se pierde absolutamente nada</strong>: sus videos, productos, pagos y accesos
              quedan guardados tal cual. Puedes recuperarla cuando quieras desde la pestaña
              "Archivadas".
            </p>
            <Button onClick={handleArchive} disabled={archiving} className="w-full">
              {archiving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              Archivar empresa
            </Button>
          </div>

          {/* Nivel 2: Borrado definitivo (escondido, irreversible) */}
          <Collapsible open={showDeleteSection} onOpenChange={handleToggleDeleteSection}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showDeleteSection && 'rotate-180')} />
                Quiero borrarla definitivamente
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-3">
              {loadingImpact ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : impact ? (
                <div className="space-y-3 rounded-sm border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-destructive font-medium">
                      Esto es irreversible. Se borra investigación y trabajo que costó dinero generar.
                    </p>
                  </div>

                  {hasLicenses ? (
                    <div className="flex items-start gap-2 rounded-sm bg-amber-500/10 border border-amber-500/30 p-3">
                      <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-500">
                        Esta empresa tiene <strong>{impact.licencias}</strong> licencia{impact.licencias !== 1 ? 's' : ''} activa{impact.licencias !== 1 ? 's' : ''}.
                        No se puede borrar mientras tenga licencias activas — solo se puede archivar.
                      </p>
                    </div>
                  ) : visibleImpactRows.length > 0 ? (
                    <ul className="space-y-1.5">
                      {visibleImpactRows.map(row => {
                        const n = impact[row.key];
                        return (
                          <li key={row.key} className="text-xs text-foreground flex items-start gap-1.5">
                            <span className="text-destructive mt-0.5">•</span>
                            <span><strong>{n}</strong> {n === 1 ? row.singular : row.plural}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">Esta empresa no tiene información asociada.</p>
                  )}

                  {!hasLicenses && (
                    <div className="space-y-2 pt-1">
                      <Label htmlFor="confirm-delete-name" className="text-xs">
                        Escribe <strong>{clientName}</strong> para confirmar
                      </Label>
                      <Input
                        id="confirm-delete-name"
                        value={confirmName}
                        onChange={e => setConfirmName(e.target.value)}
                        placeholder={clientName}
                        autoComplete="off"
                      />
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={!canDelete || deleting}
                        onClick={handleDelete}
                      >
                        {deleting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Borrar definitivamente
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
}
