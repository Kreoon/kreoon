import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
 */
export function ConsentBlock({ documents, checked, onCheckedChange, disabled, id = "creator-consent" }: ConsentBlockProps) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          disabled={disabled}
          className="mt-0.5 h-5 w-5"
          aria-describedby={`${id}-docs`}
        />
        <label htmlFor={id} className="text-sm leading-snug">
          Declaro que soy mayor de edad y acepto los documentos que rigen mi cuenta de creador:
        </label>
      </div>
      <ul id={`${id}-docs`} className="mt-2 space-y-1 pl-8 text-sm">
        {documents.map((d) => (
          <li key={d.document_id}>
            <a
              href={`/legal/${encodeURIComponent(d.document_type)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              {d.title}
            </a>{" "}
            <span className="text-xs text-muted-foreground">({d.version.replace(/^v/i, "v")})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
