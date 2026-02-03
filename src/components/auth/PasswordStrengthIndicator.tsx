import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordRequirement {
  key: string;
  label: string;
  met: boolean;
}

const REQUIREMENTS: Array<{ key: string; label: string; test: (pwd: string) => boolean }> = [
  { key: "length", label: "Mínimo 8 caracteres", test: (p) => p.length >= 8 },
  { key: "uppercase", label: "Al menos una mayúscula", test: (p) => /[A-Z]/.test(p) },
  { key: "number", label: "Al menos un número", test: (p) => /[0-9]/.test(p) },
  {
    key: "special",
    label: "Al menos un caracter especial",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

function computeScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function getLabel(score: number): string {
  if (score <= 1) return "Débil";
  if (score === 2) return "Regular";
  if (score === 3) return "Buena";
  return "Excelente";
}

function getColor(score: number): string {
  if (score <= 1) return "#ef4444";
  if (score === 2) return "#f59e0b";
  if (score === 3) return "#22c55e";
  return "#10b981";
}

/**
 * Hook que calcula score, requisitos, etiqueta y color para una contraseña.
 */
export function usePasswordStrength(password: string): {
  score: number;
  requirements: PasswordRequirement[];
  label: string;
  color: string;
} {
  const score = React.useMemo(() => computeScore(password), [password]);
  const requirements = React.useMemo(
    () =>
      REQUIREMENTS.map((r) => ({
        key: r.key,
        label: r.label,
        met: r.test(password),
      })),
    [password],
  );
  const label = getLabel(score);
  const color = getColor(score);
  return { score, requirements, label, color };
}

export interface PasswordStrengthIndicatorProps {
  /** Contraseña a evaluar */
  password: string;
  /** Mostrar lista de requisitos con check/X */
  showRequirements?: boolean;
  /** Clases adicionales para el contenedor */
  className?: string;
}

/**
 * Indicador visual de fortaleza de contraseña: barra de 4 segmentos,
 * texto de estado y opcional lista de requisitos.
 */
export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  className,
}: PasswordStrengthIndicatorProps) {
  const { score, requirements, label, color } = usePasswordStrength(password);

  const showBar = password.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {showBar && (
        <div className="flex items-center gap-2">
          <div className="flex h-1.5 flex-1 gap-0.5 overflow-hidden rounded-full bg-kreoon-bg-card">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-full flex-1 rounded-full transition-all duration-300 ease-out"
                style={{
                  backgroundColor: i < score ? color : "var(--kreoon-bg-card, #1a1a24)",
                }}
              />
            ))}
          </div>
          <span
            className="text-xs font-medium tabular-nums transition-colors duration-300"
            style={{ color: showBar ? color : undefined }}
          >
            {label}
          </span>
        </div>
      )}

      {showRequirements && (
        <ul className="space-y-1 text-xs text-kreoon-text-muted">
          {requirements.map((req) => (
            <li
              key={req.key}
              className="flex items-center gap-2 transition-colors duration-200"
            >
              {req.met ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 text-kreoon-text-muted opacity-60" />
              )}
              <span className={req.met ? "text-kreoon-text-secondary" : ""}>
                {req.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

PasswordStrengthIndicator.displayName = "PasswordStrengthIndicator";
