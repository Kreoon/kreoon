import { useState, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_owner: boolean;
}

/**
 * Organization switcher for regular users who belong to multiple organizations.
 * Only renders if user has 2+ organizations (otherwise nothing to switch).
 */
export function UserOrgSwitcher() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<UserOrganization | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetchUserOrganizations();
  }, [user?.id]);

  useEffect(() => {
    const currentOrgId = profile?.current_organization_id;
    if (currentOrgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === currentOrgId);
      setCurrentOrg(org || null);
    }
  }, [profile?.current_organization_id, organizations]);

  const fetchUserOrganizations = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get organizations the user is a member of
      const { data: memberships, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, is_owner')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setOrganizations([]);
        setLoading(false);
        return;
      }

      const orgIds = memberships.map(m => m.organization_id);
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url')
        .in('id', orgIds)
        .order('name');

      if (orgsError) throw orgsError;

      // Combine org data with ownership info
      const userOrgs: UserOrganization[] = (orgs || []).map(org => ({
        ...org,
        is_owner: memberships.find(m => m.organization_id === org.id)?.is_owner || false,
      }));

      setOrganizations(userOrgs);
    } catch (error) {
      console.error('Error fetching user organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchOrg = async (org: UserOrganization) => {
    if (!org?.id || !user?.id) return;

    try {
      setSwitching(true);

      // Update current_organization_id in profile
      const { error } = await supabase
        .from('profiles')
        .update({ current_organization_id: org.id })
        .eq('id', user.id);

      if (error) throw error;

      setCurrentOrg(org);
      localStorage.setItem('currentOrganizationId', org.id);
      setOpen(false);

      // Refresh auth context and invalidate all cached queries
      await supabase.auth.refreshSession();
      await queryClient.invalidateQueries();
      navigate('/dashboard', { replace: true });

      toast({
        title: 'Organización cambiada',
        description: `Ahora estás en ${org.name}`,
      });
    } catch (error) {
      console.error('Error switching organization:', error);
      toast({
        title: 'Error cambiando organización',
        description: 'No se pudo cambiar de organización. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSwitching(false);
    }
  };

  // Don't render if user has fewer than 2 organizations
  if (loading || organizations.length < 2) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 w-full justify-between"
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentOrg?.logo_url ? (
              <img
                src={currentOrg.logo_url}
                alt={currentOrg.name}
                className="h-5 w-5 rounded object-cover shrink-0"
              />
            ) : (
              <Building2 className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate max-w-[140px]">
              {currentOrg?.name || 'Seleccionar'}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Mis Organizaciones</h4>
          <p className="text-xs text-muted-foreground">
            Cambia entre tus organizaciones
          </p>
        </div>

        <ScrollArea className="max-h-[240px]">
          <div className="p-2 space-y-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitchOrg(org)}
                disabled={switching || currentOrg?.id === org.id}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-sm text-left transition-colors",
                  "hover:bg-accent",
                  currentOrg?.id === org.id && "bg-accent",
                  switching && "opacity-60 pointer-events-none"
                )}
              >
                <div className="h-8 w-8 rounded-sm bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {org.logo_url ? (
                    <img src={org.logo_url} alt={org.name} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{org.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {org.is_owner ? 'Propietario' : 'Miembro'} • @{org.slug}
                  </p>
                </div>
                {currentOrg?.id === org.id && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
