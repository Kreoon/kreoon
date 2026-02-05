import { createContext, useContext, useMemo, ReactNode } from "react";
import { useStrategistClients } from "@/hooks/useStrategistClients";

interface StrategistClient {
  id: string;
  name: string;
  logo_url: string | null;
}

interface StrategistClientContextType {
  clients: {
    id: string;
    client_id: string;
    is_primary: boolean;
    client: StrategistClient;
  }[];
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  selectedClient: StrategistClient | undefined;
  loading: boolean;
  refetch: () => Promise<void>;
}

const StrategistClientContext = createContext<StrategistClientContextType | null>(null);

export function StrategistClientProvider({ children }: { children: ReactNode }) {
  const strategistClients = useStrategistClients();

  const contextValue = useMemo(() => strategistClients, [
    strategistClients.clients,
    strategistClients.selectedClientId,
    strategistClients.setSelectedClientId,
    strategistClients.selectedClient,
    strategistClients.loading,
    strategistClients.refetch
  ]);

  return (
    <StrategistClientContext.Provider value={contextValue}>
      {children}
    </StrategistClientContext.Provider>
  );
}

export function useStrategistClientContext() {
  const context = useContext(StrategistClientContext);
  if (!context) {
    throw new Error("useStrategistClientContext must be used within StrategistClientProvider");
  }
  return context;
}
