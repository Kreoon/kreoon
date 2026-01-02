import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AssignStrategistsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  organizationId: string;
  onSuccess?: () => void;
}

interface Strategist {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface AssignedStrategist {
  strategist_id: string;
  is_primary: boolean;
}

export function AssignStrategistsDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  organizationId,
  onSuccess,
}: AssignStrategistsDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [strategists, setStrategists] = useState<Strategist[]>([]);
  const [assigned, setAssigned] = useState<AssignedStrategist[]>([]);

  useEffect(() => {
    if (open && organizationId && clientId) {
      fetchStrategists();
      fetchAssigned();
    }
  }, [open, organizationId, clientId]);

  const fetchStrategists = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_members')
      .select('user_id, profiles:user_id(id, full_name, avatar_url)')
      .eq('organization_id', organizationId)
      .eq('role', 'strategist');

    if (!error && data) {
      const list = data
        .map(d => ({
          id: (d.profiles as any)?.id,
          full_name: (d.profiles as any)?.full_name || 'Sin nombre',
          avatar_url: (d.profiles as any)?.avatar_url,
        }))
        .filter(s => s.id);
      setStrategists(list);
    }
    setLoading(false);
  };

  const fetchAssigned = async () => {
    const { data, error } = await supabase
      .from('client_strategists')
      .select('strategist_id, is_primary')
      .eq('client_id', clientId);

    if (!error && data) {
      setAssigned(data);
    }
  };

  const isAssigned = (strategistId: string) => {
    return assigned.some(a => a.strategist_id === strategistId);
  };

  const isPrimary = (strategistId: string) => {
    return assigned.find(a => a.strategist_id === strategistId)?.is_primary || false;
  };

  const toggleAssignment = (strategistId: string) => {
    if (isAssigned(strategistId)) {
      setAssigned(assigned.filter(a => a.strategist_id !== strategistId));
    } else {
      setAssigned([...assigned, { strategist_id: strategistId, is_primary: false }]);
    }
  };

  const setPrimary = (strategistId: string) => {
    setAssigned(assigned.map(a => ({
      ...a,
      is_primary: a.strategist_id === strategistId,
    })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete all existing assignments
      await supabase
        .from('client_strategists')
        .delete()
        .eq('client_id', clientId);

      // Insert new assignments
      if (assigned.length > 0) {
        const { error } = await supabase
          .from('client_strategists')
          .insert(
            assigned.map(a => ({
              client_id: clientId,
              strategist_id: a.strategist_id,
              organization_id: organizationId,
              is_primary: a.is_primary,
              assigned_by: user?.id,
            }))
          );

        if (error) throw error;
      }

      toast.success('Estrategas asignados correctamente');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Error al guardar asignaciones');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Estrategas</DialogTitle>
          <DialogDescription>
            Selecciona los estrategas para <strong>{clientName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : strategists.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay estrategas en la organización
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2 pr-4">
              {strategists.map((strategist) => (
                <div
                  key={strategist.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isAssigned(strategist.id) ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={isAssigned(strategist.id)}
                    onCheckedChange={() => toggleAssignment(strategist.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={strategist.avatar_url || undefined} />
                    <AvatarFallback>
                      {strategist.full_name?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {strategist.full_name}
                    </p>
                  </div>
                  {isAssigned(strategist.id) && (
                    <Button
                      variant={isPrimary(strategist.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPrimary(strategist.id)}
                      className="gap-1"
                    >
                      <Star className={`h-3 w-3 ${isPrimary(strategist.id) ? 'fill-current' : ''}`} />
                      {isPrimary(strategist.id) ? 'Principal' : 'Hacer principal'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Badge variant="secondary" className="text-xs">
            {assigned.length} estratega{assigned.length !== 1 ? 's' : ''} seleccionado{assigned.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
