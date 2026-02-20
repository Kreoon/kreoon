import { useState, useMemo } from "react";
import {
  Contact,
  Plus,
  Search,
  ContactRound,
  Kanban,
  AlertTriangle,
  Star,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import {
  useOrgContacts,
  useDeleteOrgContact,
} from "@/hooks/useCrm";

import {
  ContactCard,
  ContactDetailPanel,
  ContactKanban,
  CreateContactModal,
  ViewModeToggle,
} from "@/components/crm";
import type { ViewMode } from "@/components/crm";

import type { OrgContact } from "@/types/crm.types";
import {
  CONTACT_TYPE_LABELS,
  RELATIONSHIP_STRENGTH_LABELS,
  RELATIONSHIP_STRENGTH_COLORS,
} from "@/types/crm.types";
import type { ContactType, RelationshipStrength } from "@/types/crm.types";

// =====================================================
// CONTACTS VIEW
// =====================================================

export function ContactsContent({ orgId }: { orgId: string }) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showKanban, setShowKanban] = useState(false);

  const { data: contacts = [], isLoading, refetch } = useOrgContacts(orgId, {
    search: !showKanban ? search || undefined : undefined,
  });
  const deleteContact = useDeleteOrgContact(orgId);

  const [selectedContact, setSelectedContact] = useState<OrgContact | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleContactClick = (contact: OrgContact) => {
    setSelectedContact((prev) => (prev?.id === contact.id ? null : contact));
  };

  const handlePanelUpdate = () => {
    refetch();
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="flex h-full">
      <div
        className={cn(
          "flex-1 min-w-0 transition-all duration-300 ease-in-out",
          selectedContact && "md:mr-[440px]",
        )}
      >
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            {!showKanban && (
              <>
                <ViewModeToggle value={viewMode} onChange={setViewMode} />
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    placeholder="Buscar contactos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </>
            )}

            {showKanban && <div className="flex-1" />}

            <button
              onClick={() => setShowKanban(!showKanban)}
              title="Pipeline"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                showKanban
                  ? "bg-[#8b5cf6] text-white border-[#8b5cf6] shadow-sm"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5 border-white/10"
              )}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pipeline</span>
            </button>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Contacto
            </Button>
          </div>

          {/* ========== KANBAN VIEW ========== */}
          {showKanban ? (
            <ContactKanban
              organizationId={orgId}
              onContactClick={handleContactClick}
            />
          ) : (
            <>
              {/* Loading */}
              {isLoading ? (
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
                <>
                  {/* ========== CARDS VIEW ========== */}
                  {viewMode === "cards" && (
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
                  )}

                  {/* ========== TABLE VIEW ========== */}
                  {viewMode === "table" && (
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-white/70">Contacto</TableHead>
                            <TableHead className="text-white/70 hidden md:table-cell">Empresa</TableHead>
                            <TableHead className="text-white/70">Tipo</TableHead>
                            <TableHead className="text-white/70 hidden md:table-cell">Relación</TableHead>
                            <TableHead className="text-white/70 hidden lg:table-cell">Valor deal</TableHead>
                            <TableHead className="text-white/70 hidden lg:table-cell">Actualizado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contacts.map((contact) => (
                            <TableRow
                              key={contact.id}
                              onClick={() => handleContactClick(contact)}
                              className={cn(
                                "border-white/10 hover:bg-white/5 cursor-pointer",
                                selectedContact?.id === contact.id && "bg-[#8b5cf6]/10"
                              )}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {contact.avatar_url ? (
                                    <img
                                      src={contact.avatar_url}
                                      alt=""
                                      className="w-9 h-9 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-sm">
                                      {contact.full_name?.charAt(0) || "?"}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm text-white font-medium truncate">{contact.full_name}</p>
                                    <p className="text-xs text-white/40 truncate">{contact.email || contact.phone || "—"}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-white/70 text-sm hidden md:table-cell">
                                {contact.company || "—"}
                              </TableCell>
                              <TableCell>
                                {contact.contact_type ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                                    {CONTACT_TYPE_LABELS[contact.contact_type]}
                                  </span>
                                ) : (
                                  <span className="text-white/30 text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {contact.relationship_strength ? (
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full", RELATIONSHIP_STRENGTH_COLORS[contact.relationship_strength])}>
                                    {RELATIONSHIP_STRENGTH_LABELS[contact.relationship_strength]}
                                  </span>
                                ) : (
                                  <span className="text-white/30 text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-green-400 text-sm hidden lg:table-cell">
                                {contact.deal_value ? formatCurrency(contact.deal_value) : "—"}
                              </TableCell>
                              <TableCell className="text-white/50 text-xs hidden lg:table-cell">
                                {formatDistanceToNow(new Date(contact.updated_at), { addSuffix: true, locale: es })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  )}

                  {/* ========== LIST VIEW ========== */}
                  {viewMode === "list" && (
                    <div className="space-y-1.5">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => handleContactClick(contact)}
                          className={cn(
                            "flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent",
                            selectedContact?.id === contact.id && "bg-[#8b5cf6]/10 border-[#8b5cf6]/30"
                          )}
                        >
                          {contact.avatar_url ? (
                            <img
                              src={contact.avatar_url}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-sm">
                              {contact.full_name?.charAt(0) || "?"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{contact.full_name}</p>
                            <p className="text-xs text-white/40 truncate">
                              {contact.email || contact.phone || "Sin contacto"}
                              {contact.company && ` · ${contact.company}`}
                            </p>
                          </div>
                          {contact.contact_type && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 hidden sm:inline-flex">
                              {CONTACT_TYPE_LABELS[contact.contact_type]}
                            </span>
                          )}
                          {contact.relationship_strength && (
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full hidden md:inline-flex", RELATIONSHIP_STRENGTH_COLORS[contact.relationship_strength])}>
                              {RELATIONSHIP_STRENGTH_LABELS[contact.relationship_strength]}
                            </span>
                          )}
                          {contact.deal_value != null && contact.deal_value > 0 && (
                            <span className="text-xs text-green-400">
                              {formatCurrency(contact.deal_value)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile backdrop */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSelectedContact(null)} />
      )}

      {/* Contact Detail Side Panel */}
      {selectedContact && (
        <div className="fixed inset-y-0 right-0 w-full md:w-auto z-40 animate-in slide-in-from-right duration-300">
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
