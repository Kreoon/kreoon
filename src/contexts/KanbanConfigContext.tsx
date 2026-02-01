import { createContext, useContext, ReactNode } from "react";
import type {
  OrganizationStatus,
  BoardSettings,
  BoardStatusRule,
  BoardCustomField,
  BoardPermission,
} from "@/hooks/useBoardSettings";

export interface StatePermission {
  id: string;
  organization_id: string;
  status_id: string;
  role: string;
  can_view: boolean;
  can_view_assigned_only: boolean;
  can_move_to: boolean;
  can_edit: boolean;
}

export interface KanbanConfigContextValue {
  organizationId: string | null;
  loading: boolean;
  settings: BoardSettings | null;
  statuses: OrganizationStatus[];
  rules: BoardStatusRule[];
  customFields: BoardCustomField[];
  permissions: BoardPermission[];
  statePermissions: StatePermission[];
  kanbanConfigJson: Record<string, unknown> | null;
  refetch: () => Promise<void>;
}

const KanbanConfigContext = createContext<KanbanConfigContextValue | null>(null);

export function useKanbanConfig() {
  const ctx = useContext(KanbanConfigContext);
  return ctx;
}

interface KanbanConfigProviderProps {
  organizationId: string | null;
  value: KanbanConfigContextValue;
  children: ReactNode;
}

export function KanbanConfigProvider({ organizationId, value, children }: KanbanConfigProviderProps) {
  return (
    <KanbanConfigContext.Provider value={value}>
      {children}
    </KanbanConfigContext.Provider>
  );
}
