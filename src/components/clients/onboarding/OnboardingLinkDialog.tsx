import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KreoonButton, KreoonBadge } from "@/components/ui/kreoon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Copy, Check, Link2, RefreshCw, Loader2 } from "lucide-react";

interface OnboardingLinkDialogProps {
  clientId: string;
  clientName: string;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama tras crear o regenerar, para que el padre refresque */
  onChanged?: () => void;
}

type OnboardingFormStatus = "pending" | "in_progress" | "submitted" | "processed";

interface OnboardingForm {
  id: string;
  token: string;
  status: OnboardingFormStatus;
  expires_at: string;
}

const STATUS_LABELS: Record<OnboardingFormStatus, string> = {
  pending: "Sin enviar",
  in_progress: "En progreso",
  submitted: "Completado",
  processed: "Procesado",
};

const STATUS_VARIANTS: Record<OnboardingFormStatus, "default" | "success" | "warning" | "purple"> = {
  pending: "default",
  in_progress: "warning",
  submitted: "success",
  processed: "purple",
};

/**
 * Copia un texto al portapapeles con feedback visual (icono Copy -> Check por 2s)
 * y toast de confirmacion. Mismo patron que src/components/crm/CopyButton.tsx.
 */
function useCopyToClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  }, []);

  return { copiedKey, copy };
}

export function OnboardingLinkDialog({
  clientId,
  clientName,
  organizationId,
  open,
  onOpenChange,
  onChanged,
}: OnboardingLinkDialogProps) {
  const { user } = useAuth();
  const { copiedKey, copy } = useCopyToClipboard();

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [form, setForm] = useState<OnboardingForm | null>(null);

  const fetchActiveForm = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("client_onboarding_forms" as any)
        .select("id, token, status, expires_at")
        .eq("client_id", clientId)
        .eq("organization_id", organizationId)
        .neq("status", "processed")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setForm((data as OnboardingForm | null) ?? null);
    } catch (error) {
      console.error("Error buscando formulario de onboarding:", error);
      toast.error("No se pudo cargar el estado del formulario");
    } finally {
      setLoading(false);
    }
  }, [clientId, organizationId]);

  useEffect(() => {
    if (open) {
      fetchActiveForm();
    } else {
      setConfirmRegenOpen(false);
    }
  }, [open, fetchActiveForm]);

  const handleGenerate = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("client_onboarding_forms" as any)
        .insert({
          organization_id: organizationId,
          client_id: clientId,
          created_by: user?.id ?? null,
        })
        .select("id, token, status, expires_at")
        .single();

      if (error) throw error;
      setForm(data as OnboardingForm);
      toast.success("Link de onboarding generado");
      onChanged?.();
    } catch (error) {
      console.error("Error generando formulario de onboarding:", error);
      toast.error("No se pudo generar el link");
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!form) return;
    setRegenerating(true);
    try {
      const { error: expireError } = await supabase
        .from("client_onboarding_forms" as any)
        .update({ expires_at: new Date().toISOString() })
        .eq("id", form.id);

      if (expireError) throw expireError;

      const { data, error: insertError } = await supabase
        .from("client_onboarding_forms" as any)
        .insert({
          organization_id: organizationId,
          client_id: clientId,
          created_by: user?.id ?? null,
        })
        .select("id, token, status, expires_at")
        .single();

      if (insertError) throw insertError;

      setForm(data as OnboardingForm);
      toast.success("Link regenerado. El anterior ya no funciona");
      onChanged?.();
    } catch (error) {
      console.error("Error regenerando formulario de onboarding:", error);
      toast.error("No se pudo regenerar el link");
    } finally {
      setRegenerating(false);
      setConfirmRegenOpen(false);
    }
  };

  const onboardingUrl = form ? `${window.location.origin}/onboarding/${form.token}` : "";
  const whatsappMessage = form
    ? `¡Hola! Para arrancar con el contenido de ${clientName} necesitamos que completes unos datos. Te toma unos 10 minutos y se va guardando solo, así que puedes cerrarlo y seguir después cuando quieras, sin perder nada. Aquí está tu link: ${onboardingUrl}`
    : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[calc(100%-1rem)] sm:w-full max-w-md max-h-[90dvh] overflow-y-auto bg-kreoon-bg-secondary border-kreoon-border"
        >
          <DialogHeader>
            <DialogTitle className="text-kreoon-text-primary">
              Link de onboarding
            </DialogTitle>
            <DialogDescription className="text-kreoon-text-muted">
              Compartí este link con {clientName} para que complete sus datos.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-kreoon-text-muted">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Buscando formulario...
            </div>
          ) : !form ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-kreoon-purple-500/10 border border-kreoon-border flex items-center justify-center">
                <Link2 className="h-5 w-5 text-kreoon-text-muted" />
              </div>
              <p className="text-sm text-kreoon-text-muted max-w-xs">
                Todavía no hay un link activo para este cliente. Generá uno para
                empezar a recolectar sus datos.
              </p>
              <KreoonButton onClick={handleGenerate} loading={creating}>
                Generar link
              </KreoonButton>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <KreoonBadge variant={STATUS_VARIANTS[form.status]}>
                  {STATUS_LABELS[form.status]}
                </KreoonBadge>
                <span className="text-xs text-kreoon-text-muted">
                  Vence el{" "}
                  {format(new Date(form.expires_at), "d 'de' MMMM, yyyy", { locale: es })}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-kreoon-text-muted">
                  Link del formulario
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={onboardingUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="text-xs text-kreoon-text-primary bg-kreoon-bg-secondary border-kreoon-border"
                  />
                  <KreoonButton
                    variant="outline"
                    size="md"
                    className="shrink-0 px-3"
                    onClick={() => copy("link", onboardingUrl)}
                  >
                    {copiedKey === "link" ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </KreoonButton>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-kreoon-text-muted">
                  Mensaje sugerido para WhatsApp
                </label>
                <Textarea
                  readOnly
                  value={whatsappMessage}
                  rows={5}
                  onFocus={(e) => e.currentTarget.select()}
                  className="text-xs text-kreoon-text-primary bg-kreoon-bg-secondary border-kreoon-border resize-none"
                />
                <KreoonButton
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => copy("message", whatsappMessage)}
                >
                  {copiedKey === "message" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar mensaje
                    </>
                  )}
                </KreoonButton>
              </div>

              <KreoonButton
                variant="ghost"
                size="sm"
                className="self-start text-kreoon-text-muted"
                onClick={() => setConfirmRegenOpen(true)}
                disabled={regenerating}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerar link
              </KreoonButton>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRegenOpen} onOpenChange={setConfirmRegenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Regenerar el link?</AlertDialogTitle>
            <AlertDialogDescription>
              El link anterior deja de funcionar de inmediato. Si ya se lo
              enviaste a {clientName}, vas a tener que mandarle el nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRegenerate();
              }}
              disabled={regenerating}
            >
              {regenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Regenerando...
                </>
              ) : (
                "Sí, regenerar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
