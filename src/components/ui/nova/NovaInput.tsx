import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Check, AlertCircle } from "lucide-react";

interface NovaInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  success?: boolean;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
}

/**
 * NovaInput - Input con estilo Nova premium
 *
 * Features:
 * - Icono a la izquierda o derecha
 * - Estados de validación (error, success)
 * - Label y hint text
 * - Focus con glow sutil
 *
 * @example
 * <NovaInput
 *   label="Nombre completo"
 *   icon={User}
 *   placeholder="Tu nombre"
 *   required
 * />
 */
const NovaInput = React.forwardRef<HTMLInputElement, NovaInputProps>(
  (
    {
      className,
      type = "text",
      label,
      hint,
      error,
      success,
      icon: Icon,
      iconPosition = "left",
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const hasLeftIcon = Icon && iconPosition === "left";
    const hasRightIcon = Icon && iconPosition === "right";
    const hasValidation = error || success;

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label className="block mb-2 text-sm font-medium text-[var(--nova-text-primary)]">
            {label}
            {required && (
              <span className="ml-1 text-[var(--nova-aurora-2)]">*</span>
            )}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {hasLeftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon className="h-5 w-5 text-[var(--nova-text-muted)]" />
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={type}
            disabled={disabled}
            className={cn(
              // Base styles (bordes sutilmente redondeados)
              "w-full h-12 rounded-sm",
              "bg-[var(--nova-bg-elevated)]",
              "border border-[var(--nova-border-default)]",
              "text-[var(--nova-text-primary)]",
              "placeholder:text-[var(--nova-text-muted)]",
              "transition-all duration-200",

              // Focus styles
              "focus:outline-none",
              "focus:border-[var(--nova-accent-primary)]",
              "focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)]",

              // Disabled styles
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "disabled:bg-[var(--nova-bg-surface)]",

              // Padding based on icons
              hasLeftIcon ? "pl-12" : "pl-4",
              hasRightIcon || hasValidation ? "pr-12" : "pr-4",

              // Error state
              error && [
                "border-[var(--nova-error)]",
                "focus:border-[var(--nova-error)]",
                "focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]",
              ],

              // Success state
              success && [
                "border-[var(--nova-success)]",
                "focus:border-[var(--nova-success)]",
                "focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]",
              ],

              className
            )}
            {...props}
          />

          {/* Right Icon or Validation */}
          {(hasRightIcon || hasValidation) && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              {error ? (
                <AlertCircle className="h-5 w-5 text-[var(--nova-error)]" />
              ) : success ? (
                <Check className="h-5 w-5 text-[var(--nova-success)]" />
              ) : hasRightIcon ? (
                <Icon className="h-5 w-5 text-[var(--nova-text-muted)]" />
              ) : null}
            </div>
          )}
        </div>

        {/* Hint or Error Message */}
        {(hint || error) && (
          <p
            className={cn(
              "mt-2 text-xs",
              error
                ? "text-[var(--nova-error)]"
                : "text-[var(--nova-text-muted)]"
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);
NovaInput.displayName = "NovaInput";

/**
 * NovaTextarea - Textarea con estilo Nova
 */
interface NovaTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const NovaTextarea = React.forwardRef<HTMLTextAreaElement, NovaTextareaProps>(
  ({ className, label, hint, error, disabled, required, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block mb-2 text-sm font-medium text-[var(--nova-text-primary)]">
            {label}
            {required && (
              <span className="ml-1 text-[var(--nova-aurora-2)]">*</span>
            )}
          </label>
        )}

        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            "w-full min-h-[120px] rounded-sm p-4",
            "bg-[var(--nova-bg-elevated)]",
            "border border-[var(--nova-border-default)]",
            "text-[var(--nova-text-primary)]",
            "placeholder:text-[var(--nova-text-muted)]",
            "transition-all duration-200 resize-y",
            "focus:outline-none",
            "focus:border-[var(--nova-accent-primary)]",
            "focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && [
              "border-[var(--nova-error)]",
              "focus:border-[var(--nova-error)]",
              "focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]",
            ],
            className
          )}
          {...props}
        />

        {(hint || error) && (
          <p
            className={cn(
              "mt-2 text-xs",
              error
                ? "text-[var(--nova-error)]"
                : "text-[var(--nova-text-muted)]"
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);
NovaTextarea.displayName = "NovaTextarea";

export { NovaInput, NovaTextarea };
export type { NovaInputProps, NovaTextareaProps };
