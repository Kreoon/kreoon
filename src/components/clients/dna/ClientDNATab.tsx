import { ClientDNAPage } from '@/components/client-dna/ClientDNAPage';

interface ClientDNATabProps {
  clientId: string;
  /** Solo el resultado, sin el asistente de generación (portal del cliente). */
  soloResultado?: boolean;
}

export function ClientDNATab({ clientId, soloResultado }: ClientDNATabProps) {
  return <ClientDNAPage clientId={clientId} soloResultado={soloResultado} />;
}
