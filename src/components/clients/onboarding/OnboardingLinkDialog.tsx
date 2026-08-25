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
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Copy, Check, Link2, RefreshCw, Loader2, MessageCircle, Mail } from "lucide-react";

interface OnboardingLinkDialogProps {
  clientId: string;
  clientName: string;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama tras crear o regenerar, para que el padre refresque */
  onChanged?: () => void;
  /** Teléfono de contacto de la empresa, para el botón de WhatsApp */
  contactPhone?: string | null;
  /** Correo de contacto de la empresa, para el botón de enviar por correo */
  contactEmail?: string | null;
}

type OnboardingFormStatus = "pending" | "in_progress" | "submitted" | "processed";

interface OnboardingForm {
  id: string;
  token: string;
  status: OnboardingFormStatus;
  expires_at: string;
  claimed_at: string | null;
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

/**
 * `functions.invoke` no lanza en 4xx/5xx: deja `data` en null y un
 * FunctionsHttpError cuyo cuerpo hay que abrir a mano. Mismo patron que
 * `readFunctionError` en `useClientPipeline.ts`.
 */
async function readSendError(fnError: unknown): Promise<string> {
  const context = (fnError as { context?: { json?: () => Promise<unknown> } })?.context;
  if (context?.json) {
    try {
      const body = (await context.json()) as { error?: string; message?: string };
      if (body?.error === "sin_correo") {
        return "La empresa no tiene correo registrado";
      }
      if (body?.message) return body.message;
    } catch {
      /* el cuerpo no era JSON: seguimos al mensaje genérico */
    }
  }
  return "No se pudo enviar el correo";
}

/** Dígitos de un teléfono para wa.me. Si son 10 y empiezan por 3 (celular
 * colombiano sin indicativo), se prefija 57. */
function toWhatsappDigits(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) {
    return `57${digits}`;
  }
  return digits;
}

export function OnboardingLinkDialog({
  clientId,
  clientName,
  organizationId,
  open,
  onOpenChange,
  onChanged,
  contactPhone,
  contactEmail,
}: OnboardingLinkDialogProps) {
  const { copiedKey, copy } = useCopyToClipboard();

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [form, setForm] = useState<OnboardingForm | null>(null);

  const fetchActiveForm = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("client_onboarding_forms" as any)
        .select("id, token, status, expires_at, claimed_at")
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
      const { data, error } = await supabase.rpc(
        "create_onboarding_form_for_client" as any,
        { p_client_id: clientId } as any,
      );

      if (error) throw error;
      await fetchActiveForm();
      const reused = (data as { reused?: boolean } | null)?.reused;
      toast.success(reused ? "Ya había un link activo para este cliente" : "Link de onboarding generado");
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

      const { error: rpcError } = await supabase.rpc(
        "create_onboarding_form_for_client" as any,
        { p_client_id: clientId } as any,
      );

      if (rpcError) throw rpcError;

      await fetchActiveForm();
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

  const handleSendWhatsapp = () => {
    if (!form || !contactPhone) return;
    const digits = toWhatsappDigits(contactPhone);
    if (!digits) return;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSendEmail = async () => {
    if (!form) return;
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-onboarding-send", {
        body: { form_id: form.id },
      });

      if (error) {
        const message = await readSendError(error);
        throw new Error(message);
      }
      if (data?.ok === false) {
        throw new Error(data?.message ?? "No se pudo enviar el correo");
      }

      toast.success(`Enviado a ${data?.sent_to ?? contactEmail ?? "el correo de la empresa"}`);
    } catch (error) {
      console.error("Error enviando el link de onboarding por correo:", error);
      const message = error instanceof Error ? error.message : "No se pudo enviar el correo";
      toast.error(message);
    } finally {
      setSendingEmail(false);
    }
  };

  const onboardingUrl = form ? `${window.location.origin}/onboarding/${form.token}` : "";
  const whatsappMessage = form
    ? `¡Hola! Para arrancar con el contenido de ${clientName} te dejo tu link de Kreoon. Ahí creas tu acceso (1 minuto) y nos cuentas de tu marca y tu producto. Se guarda solo, puedes cerrarlo y seguir después: ${onboardingUrl}`
    : "";

  const whatsappDigits = toWhatsappDigits(contactPhone);
  const canSendWhatsapp = !!form && whatsappDigits.length > 0;
  const canSendEmail = !!form && !!contactEmail;

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
                <div className="flex items-center gap-1.5">
                  <KreoonBadge variant={STATUS_VARIANTS[form.status]}>
                    {STATUS_LABELS[form.status]}
                  </KreoonBadge>
                  {form.claimed_at && (
                    <KreoonBadge variant="success">Cuenta creada</KreoonBadge>
                  )}
                </div>
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

              {/* Envío directo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-kreoon-text-muted">
                  Enviar directamente
                </label>
                <div className="flex flex-wrap gap-2">
                  <KreoonButton
                    variant="outline"
                    size="sm"
                    onClick={handleSendWhatsapp}
                    disabled={!canSendWhatsapp}
                    title={canSendWhatsapp ? undefined : "La empresa no tiene WhatsApp registrado"}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Enviar por WhatsApp
                  </KreoonButton>
                  <KreoonButton
                    variant="outline"
                    size="sm"
                    onClick={handleSendEmail}
                    loading={sendingEmail}
                    disabled={!canSendEmail}
                    title={canSendEmail ? undefined : "La empresa no tiene correo registrado"}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Enviar por correo
                  </KreoonButton>
                </div>
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
