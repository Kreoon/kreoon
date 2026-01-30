import { useState, useEffect } from "react";
import { Building2, ChevronDown, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  organization_type: string | null;
}

export function RootOrgSwitcher() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    const currentOrgId = (profile as any)?.current_organization_id;
    if (currentOrgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === currentOrgId);
      setCurrentOrg(org || null);
    }
  }, [(profile as any)?.current_organization_id, organizations]);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, organization_type')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchOrg = async (org: Organization) => {
    if (!org?.id) return;

    try {
      setSwitching(true);

      // In migration scenarios, the in-memory profile can briefly be null (or the profile id
      // differs from auth.uid()). Resolve a safe profile id before updating.
      let profileId = profile?.id;

      if (!profileId) {
        const { data: authRes } = await supabase.auth.getUser();
        const email = authRes.user?.email;

        if (email) {
          const { data: profileByEmail, error: profileByEmailError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (profileByEmailError) throw profileByEmailError;
          profileId = profileByEmail?.id;
        }
      }

      if (!profileId) {
        toast({
          title: 'No se pudo cambiar de organización',
          description: 'Tu perfil aún no está listo. Espera 2–3 segundos y vuelve a intentar.',
          variant: 'destructive',
        });
        return;
      }

      // Update current_organization_id in profile
      const { error } = await supabase
        .from('profiles')
        .update({ current_organization_id: org.id })
        .eq('id', profileId);

      if (error) throw error;

      setCurrentOrg(org);
      localStorage.setItem('currentOrganizationId', org.id);
      setOpen(false);
      
      // Reload to apply org context
      window.location.reload();
    } catch (error) {
      console.error('Error switching organization:', error);
      toast({
        title: 'Error cambiando organización',
        description: 'No se pudo guardar la organización seleccionada. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSwitching(false);
    }
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(search.toLowerCase()) ||
    org.slug.toLowerCase().includes(search.toLowerCase())
  );

  const getOrgTypeLabel = (type: string | null) => {
    switch (type) {
      case 'agency': return 'Agencia';
      case 'community': return 'Comunidad';
      case 'academy': return 'Academia';
      case 'brand': return 'Marca';
      default: return 'Organización';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
        >
          <Crown className="h-4 w-4" />
          <span className="hidden md:inline max-w-[120px] truncate">
            {currentOrg?.name || 'Seleccionar Org'}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-sm">Acceso Root</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Cambia entre organizaciones para administrarlas
          </p>
        </div>
        
        <div className="p-2 border-b">
          <Input
            placeholder="Buscar organización..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>

        <ScrollArea className="h-[280px]">
          <div className="p-2 space-y-1">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Cargando...
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No se encontraron organizaciones
              </div>
            ) : (
              filteredOrgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrg(org)}
                  disabled={switching}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                    "hover:bg-accent",
                    currentOrg?.id === org.id && "bg-accent",
                    switching && "opacity-60 pointer-events-none"
                  )}
                >
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getOrgTypeLabel(org.organization_type)} • @{org.slug}
                    </p>
                  </div>
                  {currentOrg?.id === org.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
