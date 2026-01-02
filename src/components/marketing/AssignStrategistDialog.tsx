import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, UserCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface AssignStrategistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  organizationId: string | null | undefined;
  onSuccess?: () => void;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface Assignment {
  user_id: string;
  is_primary: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  strategist: 'Estratega',
  trafficker: 'Trafficker',
  team_leader: 'Líder de Equipo',
  admin: 'Administrador',
};

export function AssignStrategistDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  organizationId,
  onSuccess,
}: AssignStrategistDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (open && organizationId && clientId) {
      fetchTeamMembers();
      fetchCurrentAssignments();
    }
  }, [open, organizationId, clientId]);

  const fetchTeamMembers = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      // Get all team members with strategist, trafficker, or team_leader roles
      const { data, error } = await supabase
        .from('organization_member_roles')
        .select('user_id, role, profiles:user_id(id, full_name, avatar_url)')
        .eq('organization_id', organizationId)
        .in('role', ['strategist', 'trafficker', 'team_leader', 'admin']);

      if (error) throw error;

      const members = (data || [])
        .map(d => ({
          id: (d.profiles as any)?.id,
          full_name: (d.profiles as any)?.full_name || 'Sin nombre',
          avatar_url: (d.profiles as any)?.avatar_url,
          role: d.role,
        }))
        .filter(m => m.id);

      // Remove duplicates (users with multiple roles)
      const uniqueMembers = members.reduce((acc, curr) => {
        const existing = acc.find(m => m.id === curr.id);
        if (!existing) {
          acc.push(curr);
        }
        return acc;
      }, [] as TeamMember[]);

      setTeamMembers(uniqueMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentAssignments = async () => {
    const { data, error } = await supabase
      .from('client_strategists')
      .select('strategist_id, is_primary')
      .eq('client_id', clientId);

    if (!error && data) {
      setAssignments(data.map(d => ({
        user_id: d.strategist_id,
        is_primary: d.is_primary || false,
      })));
    }
  };

  const isAssigned = (userId: string) => {
    return assignments.some(a => a.user_id === userId);
  };

  const isPrimary = (userId: string) => {
    return assignments.find(a => a.user_id === userId)?.is_primary || false;
  };

  const toggleAssignment = (userId: string) => {
    if (isAssigned(userId)) {
      setAssignments(assignments.filter(a => a.user_id !== userId));
    } else {
      setAssignments([...assignments, { user_id: userId, is_primary: false }]);
    }
  };

  const setPrimary = (userId: string) => {
    setAssignments(assignments.map(a => ({
      ...a,
      is_primary: a.user_id === userId,
    })));
  };

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);

    try {
      // Delete existing assignments
      await supabase
        .from('client_strategists')
        .delete()
        .eq('client_id', clientId);

      // Insert new assignments
      if (assignments.length > 0) {
        const { error } = await supabase
          .from('client_strategists')
          .insert(
            assignments.map(a => ({
              client_id: clientId,
              strategist_id: a.user_id,
              organization_id: organizationId,
              is_primary: a.is_primary,
              assigned_by: user?.id,
            }))
          );

        if (error) throw error;
      }

      toast.success('Equipo asignado correctamente');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Equipo</DialogTitle>
          <DialogDescription>
            Selecciona el equipo de marketing para {clientName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Cargando equipo...</p>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="py-8 text-center">
            <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No hay miembros del equipo con roles de marketing.
              <br />
              Asigna roles de Estratega, Trafficker o Líder de Equipo primero.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {teamMembers.map((member) => {
                const assigned = isAssigned(member.id);
                const primary = isPrimary(member.id);

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      assigned ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleAssignment(member.id)}
                  >
                    <Checkbox
                      checked={assigned}
                      onCheckedChange={() => toggleAssignment(member.id)}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{member.full_name}</span>
                        {primary && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </div>
                    {assigned && (
                      <Button
                        variant={primary ? "default" : "ghost"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimary(member.id);
                        }}
                      >
                        {primary ? 'Principal' : 'Hacer principal'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {assignments.length} asignado{assignments.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
