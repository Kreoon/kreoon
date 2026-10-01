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
 * Consentimiento del registro (diseño docs/legal/registro-2026-10/consentimiento-ux.md):
 *   - Aviso breve de privacidad antes de las casillas.
 *   - Dos casillas, ninguna premarcada: (1) mayoría de edad + términos, (2) tratamiento de datos.
 *   - Los enlaces van FUERA de los <label>, en su propia línea, para que tocarlos no marque la casilla.
 *   - «Leer los términos» abre un panel con cada documento vigente (lista y versiones del servidor,
 *     legal_consent_requirements) sin perder lo escrito en el formulario.
 * La evidencia (versión, fecha, IP) la escribe el servidor al completar el alta.
 */
export function ConsentBlock({ documents, checked, onCheckedChange, disabled, id = "creator-consent" }: ConsentBlockProps) {
  const [terms, setTerms] = React.useState(checked);
  const [privacy, setPrivacy] = React.useState(checked);
  const [docsOpen, setDocsOpen] = React.useState(false);
  const privacyId = `${id}-privacy`;

  // Si el padre reinicia el consentimiento (p. ej. cambió la versión de un documento), desmarcar ambas
  React.useEffect(() => {
    if (!checked && terms && privacy) {
      setTerms(false);
      setPrivacy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  const update = (nextTerms: boolean, nextPrivacy: boolean) => {
    setTerms(nextTerms);
    setPrivacy(nextPrivacy);
    onCheckedChange(nextTerms && nextPrivacy);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Usamos tus datos para crear y gestionar tu cuenta de creador. Puedes conocerlos, actualizarlos, corregirlos
        o pedir que los borremos, y retirar tu autorización cuando quieras.
      </p>

      <div>
        <div className="flex items-start gap-3">
          <Checkbox
            id={id}
            checked={terms}
            onCheckedChange={(v) => update(v === true, privacy)}
            disabled={disabled}
            className="mt-0.5 h-5 w-5"
          />
          <label htmlFor={id} className="text-sm leading-snug">
            Declaro que soy mayor de edad y acepto los términos de mi cuenta de creador.
          </label>
        </div>
        <button
          type="button"
          onClick={() => setDocsOpen(true)}
          className="ml-8 mt-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Leer los términos
        </button>
      </div>

      <div>
        <div className="flex items-start gap-3">
          <Checkbox
            id={privacyId}
            checked={privacy}
            onCheckedChange={(v) => update(terms, v === true)}
            disabled={disabled}
            className="mt-0.5 h-5 w-5"
          />
          <label htmlFor={privacyId} className="text-sm leading-snug">
            Autorizo el tratamiento de mis datos para crear y gestionar mi cuenta de creador, según la Política de privacidad.
          </label>
        </div>
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-8 mt-1 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Leer la política
        </a>
      </div>

      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Términos de tu cuenta de creador</DialogTitle>
            <DialogDescription>
              Al marcar la casilla aceptas estos documentos. Ábrelos para leerlos; lo que escribiste en el formulario no se pierde.
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
