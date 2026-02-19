import { useState } from "react";
import { RefreshCw, Trash2, Plus, Users, Loader2, CloudUpload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useEmailSegments,
  useCreateSegment,
  useSyncSegment,
  useSyncContacts,
  useDeleteSegment,
} from "@/hooks/useEmailMarketing";
import type { SegmentFilterCriteria } from "@/types/email-marketing.types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function SegmentList() {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactType, setContactType] = useState<string>("");
  const [strength, setStrength] = useState<string>("");

  const { data: segments = [], isLoading } = useEmailSegments();
  const createSegment = useCreateSegment();
  const syncSegment = useSyncSegment();
  const syncContacts = useSyncContacts();
  const deleteSegment = useDeleteSegment();

  const handleCreate = async () => {
    const criteria: SegmentFilterCriteria = {};
    if (contactType) criteria.contact_type = contactType;
    if (strength) criteria.relationship_strength = strength;

    await createSegment.mutateAsync({
      name,
      description: description || null,
      organization_id: null,
      filter_criteria: criteria,
      created_by: null,
    });
    setCreateOpen(false);
    setName("");
    setDescription("");
    setContactType("");
    setStrength("");
  };

  const handleSyncAll = async (segmentId: string) => {
    await syncSegment.mutateAsync(segmentId);
    await syncContacts.mutateAsync(segmentId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Segmentos sincronizados con Resend para envío de campañas
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Segmento
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando segmentos...</div>
      ) : segments.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No hay segmentos creados</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear primer segmento
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {segments.map((segment) => (
            <Card key={segment.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-sm">{segment.name}</h3>
                  {segment.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{segment.description}</p>
                  )}
                </div>
                <Badge variant={segment.resend_segment_id ? "default" : "secondary"}>
                  {segment.resend_segment_id ? "Sincronizado" : "Local"}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {segment.contact_count} contactos
                </span>
                {segment.last_synced_at && (
                  <span>
                    Sync: {formatDistanceToNow(new Date(segment.last_synced_at), { addSuffix: true, locale: es })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyncAll(segment.id)}
                  disabled={syncSegment.isPending || syncContacts.isPending}
                >
                  {(syncSegment.isPending || syncContacts.isPending) ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <CloudUpload className="h-3 w-3 mr-1" />
                  )}
                  Sync con Resend
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => deleteSegment.mutate(segment.id)}
                  disabled={deleteSegment.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Segmento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Leads activos" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del segmento..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de contacto</Label>
                <Select value={contactType} onValueChange={setContactType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Leads</SelectItem>
                    <SelectItem value="client">Clientes</SelectItem>
                    <SelectItem value="partner">Partners</SelectItem>
                    <SelectItem value="influencer">Influencers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Relación</Label>
                <Select value={strength} onValueChange={setStrength}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createSegment.isPending}>
              Crear Segmento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
