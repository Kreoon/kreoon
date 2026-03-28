import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Timer, Mail, ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  useDripSteps,
  useCreateDripStep,
  useUpdateDripStep,
  useDeleteDripStep,
  useDripEnrollments,
  useEnrollContacts,
  useEmailTemplates,
} from "@/hooks/useEmailMarketing";
import {
  ENROLLMENT_STATUS_LABELS,
  type EmailDripSequence,
  type EmailDripStep,
} from "@/types/email-marketing.types";

interface DripSequenceEditorProps {
  sequence: EmailDripSequence;
  onBack: () => void;
}

export function DripSequenceEditor({ sequence, onBack }: DripSequenceEditorProps) {
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [newDelay, setNewDelay] = useState("0");
  const [newDelayUnit, setNewDelayUnit] = useState<"minutes" | "hours" | "days">("hours");
  const [newTemplateId, setNewTemplateId] = useState("");
  const [newSubjectOverride, setNewSubjectOverride] = useState("");
  const [enrollEmails, setEnrollEmails] = useState("");

  const { data: steps = [], isLoading: stepsLoading } = useDripSteps(sequence.id);
  const { data: enrollments = [] } = useDripEnrollments(sequence.id);
  const { data: templates = [] } = useEmailTemplates();
  const createStep = useCreateDripStep();
  const updateStep = useUpdateDripStep();
  const deleteStep = useDeleteDripStep();
  const enrollContacts = useEnrollContacts();

  const delayToMinutes = (val: number, unit: string): number => {
    if (unit === "hours") return val * 60;
    if (unit === "days") return val * 60 * 24;
    return val;
  };

  const formatDelay = (minutes: number): string => {
    if (minutes === 0) return "Inmediato";
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} horas`;
    return `${Math.round(minutes / 1440)} días`;
  };

  const handleAddStep = async () => {
    const delayMinutes = delayToMinutes(parseInt(newDelay) || 0, newDelayUnit);
    await createStep.mutateAsync({
      sequence_id: sequence.id,
      step_order: steps.length,
      delay_minutes: delayMinutes,
      template_id: newTemplateId || null,
      subject_override: newSubjectOverride || null,
      conditions: {},
      is_active: true,
    });
    setAddStepOpen(false);
    setNewDelay("0");
    setNewTemplateId("");
    setNewSubjectOverride("");
  };

  const handleEnroll = async () => {
    const emails = enrollEmails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) return;

    await enrollContacts.mutateAsync({
      sequence_id: sequence.id,
      contacts: emails.map((email) => ({ email })),
    });
    setEnrollOpen(false);
    setEnrollEmails("");
  };

  const activeEnrollments = enrollments.filter((e) => e.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold">{sequence.name}</h2>
            <p className="text-xs text-muted-foreground">{sequence.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {activeEnrollments} inscritos activos
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setEnrollOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Inscribir contactos
          </Button>
          <Button size="sm" onClick={() => setAddStepOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar paso
          </Button>
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="space-y-0">
        {stepsLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando pasos...</div>
        ) : steps.length === 0 ? (
          <Card className="p-8 text-center">
            <Timer className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">Sin pasos configurados</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setAddStepOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar primer paso
            </Button>
          </Card>
        ) : (
          steps.map((step, idx) => (
            <div key={step.id} className="relative">
              {/* Connector line */}
              {idx > 0 && (
                <div className="flex items-center justify-center py-2">
                  <div className="h-8 w-px bg-border" />
                  <Badge variant="outline" className="absolute text-[10px] bg-background">
                    <Timer className="h-2.5 w-2.5 mr-1" />
                    {formatDelay(step.delay_minutes)}
                  </Badge>
                </div>
              )}

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {step.email_templates
                            ? (step.email_templates as any).name
                            : "Sin template"}
                        </span>
                      </div>
                      {step.subject_override && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Asunto: {step.subject_override}
                        </p>
                      )}
                      {idx === 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Se envía {formatDelay(step.delay_minutes).toLowerCase()} después de inscripción
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={step.is_active}
                      onCheckedChange={(checked) =>
                        updateStep.mutate({ id: step.id, sequence_id: sequence.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteStep.mutate({ id: step.id, sequence_id: sequence.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Enrollments */}
      {enrollments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Contactos inscritos ({enrollments.length})</h3>
          <div className="border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Email</th>
                  <th className="text-left p-2 font-medium">Nombre</th>
                  <th className="text-center p-2 font-medium">Paso</th>
                  <th className="text-center p-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.slice(0, 20).map((enrollment) => (
                  <tr key={enrollment.id} className="border-t">
                    <td className="p-2 text-xs">{enrollment.contact_email}</td>
                    <td className="p-2 text-xs text-muted-foreground">{enrollment.contact_name || "-"}</td>
                    <td className="p-2 text-xs text-center">{enrollment.current_step + 1}/{steps.length}</td>
                    <td className="p-2 text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {ENROLLMENT_STATUS_LABELS[enrollment.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {enrollments.length > 20 && (
              <div className="p-2 text-center text-xs text-muted-foreground bg-muted/50">
                Mostrando 20 de {enrollments.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Step Dialog */}
      <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Paso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Espera antes de enviar</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={newDelay}
                  onChange={(e) => setNewDelay(e.target.value)}
                  className="w-24"
                />
                <Select value={newDelayUnit} onValueChange={(v) => setNewDelayUnit(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutos</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                    <SelectItem value="days">Días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Template *</Label>
              <Select value={newTemplateId} onValueChange={setNewTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Asunto personalizado (opcional)</Label>
              <Input
                value={newSubjectOverride}
                onChange={(e) => setNewSubjectOverride(e.target.value)}
                placeholder="Deja vacío para usar el del template"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStepOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddStep} disabled={!newTemplateId || createStep.isPending}>
              Agregar Paso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Dialog */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscribir Contactos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Emails (uno por línea o separados por coma)</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={enrollEmails}
                onChange={(e) => setEnrollEmails(e.target.value)}
                placeholder={"usuario1@ejemplo.com\nusuario2@ejemplo.com\nusuario3@ejemplo.com"}
              />
              <p className="text-xs text-muted-foreground">
                {enrollEmails.split(/[,\n]/).filter((e) => e.trim().includes("@")).length} emails detectados
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancelar</Button>
            <Button onClick={handleEnroll} disabled={enrollContacts.isPending}>
              <UserPlus className="h-4 w-4 mr-2" />
              Inscribir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
