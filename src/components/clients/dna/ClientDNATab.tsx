import { ClientDNAPage } from '@/components/client-dna/ClientDNAPage';

interface ClientDNATabProps {
  clientId: string;
}

export function ClientDNATab({ clientId }: ClientDNATabProps) {
  return <ClientDNAPage clientId={clientId} />;
}
