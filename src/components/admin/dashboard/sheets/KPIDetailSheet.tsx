import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AdminDashboardStats, AdminAIStats } from "@/types/admin-dashboard.types";
import { UsersDetailSheet } from "./UsersDetailSheet";
import { OrganizationsDetailSheet } from "./OrganizationsDetailSheet";
import { CreatorsDetailSheet } from "./CreatorsDetailSheet";
import { LeadsDetailSheet } from "./LeadsDetailSheet";
import { TokensDetailSheet } from "./TokensDetailSheet";
import { HealthDetailSheet } from "./HealthDetailSheet";

export type KPIType = "users" | "organizations" | "creators" | "leads" | "tokens" | "health";

const KPI_TITLES: Record<KPIType, string> = {
  users: "Usuarios",
  organizations: "Organizaciones",
  creators: "Creadores",
  leads: "Leads",
  tokens: "Tokens IA",
  health: "Health Score",
};

interface KPIDetailSheetProps {
  type: KPIType | null;
  isOpen: boolean;
  onClose: () => void;
  stats?: AdminDashboardStats;
  aiStats?: AdminAIStats;
}

export function KPIDetailSheet({ type, isOpen, onClose, stats, aiStats }: KPIDetailSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full p-0 overflow-hidden bg-[#1a1a2e] border-white/10"
      >
        <SheetTitle className="sr-only">
          {type ? KPI_TITLES[type] : "Detalle KPI"}
        </SheetTitle>
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          {type === "users" && <UsersDetailSheet stats={stats} />}
          {type === "organizations" && <OrganizationsDetailSheet stats={stats} />}
          {type === "creators" && <CreatorsDetailSheet stats={stats} />}
          {type === "leads" && <LeadsDetailSheet stats={stats} />}
          {type === "tokens" && <TokensDetailSheet aiStats={aiStats} />}
          {type === "health" && <HealthDetailSheet stats={stats} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
