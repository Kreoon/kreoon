import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Castle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useTrialGuard } from "@/hooks/useTrialGuard";
import { ClientsContent, type ClientsContentHandle } from "@/components/clients/ClientsContent";

const Clients = () => {
  const { isAdmin } = useAuth();
  const { isReadOnly } = useTrialGuard();
  const clientsContentRef = useRef<ClientsContentHandle>(null);

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          icon={Castle}
          title="Kreoon Clientes"
          subtitle="Gestión inteligente de marcas y representantes"
          action={
            isAdmin && (
              <Button
                variant="glow"
                size="sm"
                className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0"
                onClick={() => clientsContentRef.current?.openCreateClientDialog()}
                disabled={isReadOnly}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Cliente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )
          }
        />
        <ClientsContent ref={clientsContentRef} />
      </div>
    </div>
  );
};

export default Clients;
