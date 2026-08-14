import { Building2, RotateCcw, Loader2, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import type { ArchivedClient } from '@/hooks/useUnifiedClients';

interface ArchivedClientCardProps {
  client: ArchivedClient;
  onRestore: () => void;
  restoring?: boolean;
}

/** Tarjeta simple para la pestaña "Archivadas": solo muestra el dato y el botón de restaurar */
export function ArchivedClientCard({ client, onRestore, restoring }: ArchivedClientCardProps) {
  const archivedAgo = client.deleted_at
    ? formatDistanceToNow(new Date(client.deleted_at), { addSuffix: true, locale: es })
    : null;

  return (
    <div className="rounded-sm border border-dashed border-border bg-muted/20 p-4 flex flex-col h-full">
      <div className="flex items-start gap-3 mb-3">
        {client.logo_url ? (
          <img
            src={client.logo_url}
            alt={client.name}
            className="h-12 w-12 object-cover rounded-sm ring-1 ring-border grayscale opacity-70 flex-shrink-0"
          />
        ) : (
          <div className="h-12 w-12 flex items-center justify-center rounded-sm bg-muted ring-1 ring-border flex-shrink-0">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
          {client.contact_email && (
            <p className="text-xs text-muted-foreground truncate">{client.contact_email}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3 flex-1">
        <Archive className="h-3 w-3 flex-shrink-0" />
        {archivedAgo ? `Archivada ${archivedAgo}` : 'Archivada'}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full mt-auto"
        onClick={onRestore}
        disabled={restoring}
      >
        {restoring ? (
          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
        ) : (
          <RotateCcw className="h-3.5 w-3.5 mr-2" />
        )}
        Restaurar empresa
      </Button>
    </div>
  );
}
