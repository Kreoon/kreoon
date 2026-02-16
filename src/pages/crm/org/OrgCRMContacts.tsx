import { useState } from "react";
import {
  Contact,
  Plus,
  Search,
  ContactRound,
  LayoutList,
  LayoutGrid,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { cn } from "@/lib/utils";

import {
  useOrgContacts,
  useDeleteOrgContact,
} from "@/hooks/useCrm";

import {
  ContactCard,
  ContactDetailPanel,
  ContactKanban,
  CreateContactModal,
} from "@/components/crm";

import type { OrgContact } from "@/types/crm.types";

// =====================================================
// CONTACTS VIEW
// =====================================================

type ContactView = "list" | "kanban";

function ContactsContent({ orgId }: { orgId: string }) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ContactView>("list");
  const { data: contacts = [], isLoading, refetch } = useOrgContacts(orgId, {
    search: view === "list" ? search || undefined : undefined,
  });
  const deleteContact = useDeleteOrgContact(orgId);

  const [selectedContact, setSelectedContact] = useState<OrgContact | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleContactClick = (contact: OrgContact) => {
    setSelectedContact(contact);
  };

  const handlePanelUpdate = () => {
    refetch();
  };

  return (
    <div className="flex h-full">
      {/* Main content area - shrinks when panel is open */}
      <div
        className={cn(
          "flex-1 min-w-0 transition-all duration-300 ease-in-out",
          selectedContact && "mr-[440px]",
        )}
      >
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div
              className="flex items-center rounded-lg p-0.5"
              style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
            >
              <button
                onClick={() => setView("list")}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  view === "list"
                    ? "bg-[#8b5cf6] text-white shadow-sm"
                    : "text-white/40 hover:text-white/70",
                )}
                title="Vista lista"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("kanban")}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  view === "kanban"
                    ? "bg-[#8b5cf6] text-white shadow-sm"
                    : "text-white/40 hover:text-white/70",
                )}
                title="Vista kanban"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {/* Search (list view only - kanban has its own) */}
            {view === "list" && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  placeholder="Buscar contactos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            )}

            {/* Spacer for kanban view */}
            {view === "kanban" && <div className="flex-1" />}

            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Contacto
            </Button>
          </div>

          {/* View content */}
          {view === "list" ? (
            /* List View */
            isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl bg-white/5" />
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-16">
                <ContactRound className="h-12 w-12 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">No hay contactos aún</p>
                <p className="text-xs text-white/20 mt-1">Crea tu primer contacto para empezar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onClick={handleContactClick}
                    onDelete={(id) => {
                      deleteContact.mutate(id);
                      if (selectedContact?.id === id) setSelectedContact(null);
                    }}
                  />
                ))}
              </div>
            )
          ) : (
            /* Kanban View */
            <ContactKanban
              organizationId={orgId}
              onContactClick={handleContactClick}
            />
          )}
        </div>
      </div>

      {/* Contact Detail Side Panel */}
      {selectedContact && (
        <div className="fixed inset-y-0 right-0 z-40 animate-in slide-in-from-right duration-300">
          <ContactDetailPanel
            contact={selectedContact}
            organizationId={orgId}
            onClose={() => setSelectedContact(null)}
            onUpdate={handlePanelUpdate}
          />
        </div>
      )}

      {/* Create Contact Modal */}
      <CreateContactModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        organizationId={orgId}
      />
    </div>
  );
}

// =====================================================
// ORG CRM CONTACTS PAGE
// =====================================================

const OrgCRMContacts = () => {
  const { currentOrgId, currentOrgName } = useOrgOwner();

  if (!currentOrgId) {
    return (
      <div className="min-h-screen">
        <div className="p-4 md:p-6 space-y-6">
          <PageHeader icon={Contact} title="Contactos" subtitle="Gestión de contactos de la organización" />
          <div className="text-center py-16">
            <AlertTriangle className="h-8 w-8 text-yellow-400/50 mx-auto mb-2" />
            <p className="text-sm text-white/40">Selecciona una organización para acceder al CRM</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          icon={Contact}
          title="Contactos"
          subtitle={currentOrgName ? `Contactos de ${currentOrgName}` : "Gestión de contactos de la organización"}
        />
        <ContactsContent orgId={currentOrgId} />
      </div>
    </div>
  );
};

export default OrgCRMContacts;
