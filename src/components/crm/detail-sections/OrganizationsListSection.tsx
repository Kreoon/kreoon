import { useState } from 'react';
import { Building2, Crown, Shield, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { DetailSection } from '@/components/crm/DetailSection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { OrganizationMembership } from '@/types/crm.types';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-400',
  team_leader: 'bg-blue-500/20 text-blue-400',
  strategist: 'bg-orange-500/20 text-orange-400',
  creator: 'bg-pink-500/20 text-pink-400',
  editor: 'bg-purple-500/20 text-purple-400',
  client: 'bg-green-500/20 text-green-400',
};

interface OrganizationsListSectionProps {
  organizations: OrganizationMembership[];
  userId: string;
  onActionComplete: () => void;
}

export function OrganizationsListSection({ organizations, userId, onActionComplete }: OrganizationsListSectionProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

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

  const handleChangeRole = async (orgId: string, newRole: string) => {
    const roleValue = newRole === 'none' ? null : newRole;
    await invokeAdmin('set_active_role', { userId, activeRole: roleValue });
    setEditingRole(null);
  };

  const handleToggleOwner = async (orgId: string, currentlyOwner: boolean) => {
    await invokeAdmin('set_owner', { userId, organizationId: orgId, makeOwner: !currentlyOwner });
  };

  const handleRemoveFromOrg = async (orgId: string) => {
    await invokeAdmin('remove_from_org', { userId });
  };

  if (!organizations || organizations.length === 0) return null;

  return (
    <DetailSection title="Organizaciones">
      <div className="space-y-2">
        {organizations.map((org) => (
          <div
            key={org.organization_id}
            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Building2 className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-white/80 truncate">{org.organization_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {org.is_owner && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[9px] font-semibold bg-yellow-500/20 text-yellow-400">
                      <Crown className="h-2.5 w-2.5" />
                      Propietario
                    </span>
                  )}
                  {org.role ? (
                    <span className={cn('px-1.5 py-0 rounded-full text-[9px] font-medium', ROLE_COLORS[org.role] || 'bg-white/10 text-white/50')}>
                      {org.role}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0 rounded-full text-[9px] font-medium bg-white/5 text-white/30">
                      Sin rol
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Toggle owner */}
              <button
                onClick={() => handleToggleOwner(org.organization_id, org.is_owner)}
                disabled={loading === 'set_owner'}
                className={cn(
                  'p-1 rounded hover:bg-white/10 transition-colors',
                  org.is_owner ? 'text-yellow-400' : 'text-white/30 hover:text-yellow-400',
                )}
                title={org.is_owner ? 'Quitar propietario' : 'Hacer propietario'}
              >
                <Crown className="h-3 w-3" />
              </button>

              {/* Change role */}
              {editingRole === org.organization_id ? (
                <Select
                  defaultValue={org.role || 'none'}
                  onValueChange={(v) => handleChangeRole(org.organization_id, v)}
                >
                  <SelectTrigger className="h-6 w-24 text-[10px] bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin rol</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="team_leader">Team Leader</SelectItem>
                    <SelectItem value="strategist">Estratega</SelectItem>
                    <SelectItem value="creator">Creador</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <button
                  onClick={() => setEditingRole(org.organization_id)}
                  className="p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-[#a855f7]"
                  title="Cambiar rol"
                >
                  <Shield className="h-3 w-3" />
                </button>
              )}

              {/* Remove from org */}
              <button
                onClick={() => handleRemoveFromOrg(org.organization_id)}
                disabled={loading === 'remove_from_org'}
                className="p-1 rounded hover:bg-red-500/10 transition-colors text-white/20 hover:text-red-400"
                title="Quitar de organización"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </DetailSection>
  );
}
