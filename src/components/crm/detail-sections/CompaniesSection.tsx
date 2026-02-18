import { useState } from 'react';
import { Briefcase, Trash2, Plus, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DetailSection } from '@/components/crm/DetailSection';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CompanyLink } from '@/types/crm.types';

interface CompaniesSectionProps {
  companies: CompanyLink[];
  userId: string;
  onActionComplete: () => void;
}

export function CompaniesSection({ companies, userId, onActionComplete }: CompaniesSectionProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [availableClients, setAvailableClients] = useState<{ id: string; name: string; organization_name: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState('');

  const invokeAdmin = async (action: string, body: Record<string, unknown>) => {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action, ...body },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onActionComplete();
      return data;
    } finally {
      setLoading(null);
    }
  };

  const handleUnlink = async (clientId: string) => {
    await invokeAdmin('unlink_from_company', { userId, clientId });
  };

  const handleLink = async () => {
    if (!selectedClient) return;
    await invokeAdmin('link_to_company', { userId, clientId: selectedClient });
    setLinkOpen(false);
    setSelectedClient('');
  };

  const openLinkForm = async () => {
    setLinkOpen(true);
    // Fetch all clients to pick from (platform admin can see all)
    const { data } = await supabase
      .from('clients')
      .select('id, name, organization_id')
      .order('name')
      .limit(200);

    if (data) {
      // Already linked client IDs
      const linkedIds = new Set(companies.map(c => c.client_id));
      setAvailableClients(
        data
          .filter(c => !linkedIds.has(c.id))
          .map(c => ({ id: c.id, name: c.name, organization_name: '' }))
      );
    }
  };

  return (
    <DetailSection
      title="Empresas Vinculadas"
      action={
        <button
          onClick={linkOpen ? () => setLinkOpen(false) : openLinkForm}
          className="p-1 rounded hover:bg-white/10 transition-colors text-white/40 hover:text-[#a855f7]"
          title="Vincular a empresa"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      }
    >
      <div className="space-y-2">
        {/* Link form */}
        {linkOpen && (
          <div className="flex gap-2 items-end p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="flex-1">
              <label className="text-[10px] text-white/40 mb-1 block">Empresa</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="h-7 text-[10px] bg-white/5 border-white/10">
                  <SelectValue placeholder="Seleccionar empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {availableClients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleLink}
              disabled={!selectedClient || loading === 'link_to_company'}
              className="h-7 px-3 text-[10px] bg-[#8b5cf6] hover:bg-[#7c3aed]"
            >
              Vincular
            </Button>
          </div>
        )}

        {/* Companies list */}
        {companies.length === 0 && !linkOpen && (
          <p className="text-[10px] text-white/30 italic">Sin empresas vinculadas</p>
        )}

        {companies.map((company) => (
          <div
            key={company.client_id}
            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Briefcase className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-white/80 truncate">{company.client_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {company.organization_name && (
                    <span className="flex items-center gap-0.5 text-[9px] text-white/30">
                      <Building2 className="h-2 w-2" />
                      {company.organization_name}
                    </span>
                  )}
                  <span className="px-1.5 py-0 rounded-full text-[9px] font-medium bg-green-500/15 text-green-400">
                    {company.role || 'viewer'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleUnlink(company.client_id)}
              disabled={loading === 'unlink_from_company'}
              className="p-1 rounded hover:bg-red-500/10 transition-colors text-white/20 hover:text-red-400 flex-shrink-0"
              title="Desvincular"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </DetailSection>
  );
}
