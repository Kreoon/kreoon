import { Button } from "@/components/ui/button";
import { Plus, Sword } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { CreatorsContent } from "@/components/talent/CreatorsContent";

const Creators = () => {
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          icon={Sword}
          title="Kreoon Creators"
          subtitle="Sistema inteligente de gestión de creadores"
          action={
            isAdmin && (
              <Button variant="glow" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Creador</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )
          }
        />
        <CreatorsContent />
      </div>
    </div>
  );
};

export default Creators;
