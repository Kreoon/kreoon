import { useState } from "react";
import { Plus, Trash2, Settings2, Play, Pause, Users, Timer, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDripSequences,
  useCreateDripSequence,
  useUpdateDripSequence,
  useDeleteDripSequence,
} from "@/hooks/useEmailMarketing";
import {
  DRIP_TRIGGER_LABELS,
  type DripTriggerType,
  type EmailDripSequence,
} from "@/types/email-marketing.types";

interface DripSequenceListProps {
  onSelect: (sequence: EmailDripSequence) => void;
}

export function DripSequenceList({ onSelect }: DripSequenceListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<DripTriggerType>("manual");

  const { data: sequences = [], isLoading } = useDripSequences();
  const createSequence = useCreateDripSequence();
  const updateSequence = useUpdateDripSequence();
  const deleteSequence = useDeleteDripSequence();

  const handleCreate = async () => {
    const created = await createSequence.mutateAsync({
      name,
      description: description || null,
      trigger_type: triggerType,
      is_active: false,
      organization_id: null,
      created_by: null,
    });
    setCreateOpen(false);
    setName("");
    setDescription("");
    setTriggerType("manual");
    if (created) onSelect(created);
  };

  const toggleActive = (seq: EmailDripSequence) => {
    updateSequence.mutate({ id: seq.id, is_active: !seq.is_active });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Secuencias de emails automatizados enviados en intervalos programados
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Secuencia
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando secuencias...</div>
      ) : sequences.length === 0 ? (
        <Card className="p-12 text-center">
          <Timer className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No hay secuencias drip</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear primera secuencia
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sequences.map((seq) => (
            <Card
              key={seq.id}
              className="p-4 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => onSelect(seq)}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{seq.name}</h3>
                    <Badge variant={seq.is_active ? "default" : "secondary"}>
                      {seq.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <Zap className="h-2.5 w-2.5 mr-1" />
                      {DRIP_TRIGGER_LABELS[seq.trigger_type]}
                    </Badge>
                  </div>
                  {seq.description && (
                    <p className="text-xs text-muted-foreground">{seq.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={seq.is_active}
                    onCheckedChange={() => toggleActive(seq)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect(seq)}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteSequence.mutate(seq.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Secuencia Drip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Onboarding nuevo usuario" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción de la secuencia..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Disparador</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as DripTriggerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DRIP_TRIGGER_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {triggerType === "manual" && "Los contactos se inscriben manualmente"}
                {triggerType === "on_lead_created" && "Se activa cuando se crea un nuevo lead"}
                {triggerType === "on_contact_created" && "Se activa cuando se crea un nuevo contacto"}
                {triggerType === "on_signup" && "Se activa cuando un usuario se registra"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createSequence.isPending}>
              Crear Secuencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
