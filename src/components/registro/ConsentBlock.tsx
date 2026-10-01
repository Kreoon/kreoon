import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SignupDocument } from "@/lib/registration/service";

interface ConsentBlockProps {
  documents: SignupDocument[];
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * Consentimiento explícito. La lista y las versiones salen del servidor
 * (legal_consent_requirements); el usuario lee cada documento en /legal/:tipo.
 * Una sola casilla por acción, nunca premarcada. La evidencia (versión, fecha, IP) la
 * escribe el servidor al completar el alta.
 *
 * A la vista solo hay dos enlaces: «Términos y condiciones» abre la lista completa de
 * documentos que se aceptan (todos siguen accesibles) y «Política de privacidad».
 */
export function ConsentBlock({ documents, checked, onCheckedChange, disabled, id = "creator-consent" }: ConsentBlockProps) {
  const [docsOpen, setDocsOpen] = React.useState(false);

  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          disabled={disabled}
          className="mt-0.5 h-5 w-5"
        />
        <p className="text-sm leading-snug">
          <label htmlFor={id}>Tengo 18 años o más y acepto los </label>
          <button
            type="button"
            onClick={() => setDocsOpen(true)}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Términos y condiciones
          </button>
          <label htmlFor={id}> y la </label>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Política de privacidad
          </a>
          <label htmlFor={id}>.</label>
        </p>
      </div>

      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Términos y condiciones</DialogTitle>
            <DialogDescription>
              Al crear tu cuenta de creador aceptas estos documentos. Puedes abrir cada uno para leerlo.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {documents.map((d) => (
              <li key={d.document_id} className="flex items-baseline justify-between gap-3">
                <a
                  href={`/legal/${encodeURIComponent(d.document_type)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {d.title}
                </a>
                <span className="shrink-0 text-xs text-muted-foreground">{d.version.replace(/^v/i, "v")}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
