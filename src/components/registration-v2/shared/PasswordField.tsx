import { useState } from 'react';
import { Eye, EyeOff, Lock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  showStrength?: boolean;
  disabled?: boolean;
}

interface PasswordRequirement {
  label: string;
  validator: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'Mínimo 8 caracteres', validator: (p) => p.length >= 8 },
  { label: 'Una letra mayúscula', validator: (p) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula', validator: (p) => /[a-z]/.test(p) },
  { label: 'Un número', validator: (p) => /[0-9]/.test(p) },
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: 'Débil', color: 'bg-red-500' };
  if (score <= 3) return { score: 2, label: 'Media', color: 'bg-yellow-500' };
  if (score <= 4) return { score: 3, label: 'Fuerte', color: 'bg-green-500' };
  return { score: 4, label: 'Muy fuerte', color: 'bg-emerald-500' };
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder = '••••••••',
  showStrength = false,
  disabled,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const strength = showStrength ? getPasswordStrength(value) : null;
  const showRequirements = showStrength && isFocused && value.length > 0;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-white/90">
        {label} <span className="text-red-400">*</span>
      </label>

      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-full h-11 pl-10 pr-12 rounded-lg border transition-all text-white",
            "bg-white/5 placeholder:text-white/40",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            error
              ? "border-red-500/50 focus:border-red-500"
              : "border-white/10 focus:border-primary",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/70 transition-colors"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Indicador de fortaleza */}
      {showStrength && value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-300", strength?.color)}
                style={{ width: `${(strength?.score || 0) * 25}%` }}
              />
            </div>
            <span className={cn(
              "text-xs font-medium",
              strength?.score === 1 && "text-red-400",
              strength?.score === 2 && "text-yellow-400",
              strength?.score === 3 && "text-green-400",
              strength?.score === 4 && "text-emerald-400",
            )}>
              {strength?.label}
            </span>
          </div>

          {/* Requisitos */}
          {showRequirements && (
            <div className="grid grid-cols-2 gap-1">
              {PASSWORD_REQUIREMENTS.map((req, idx) => {
                const isValid = req.validator(value);
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-1.5 text-xs",
                      isValid ? "text-green-400" : "text-white/40"
                    )}
                  >
                    {isValid ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    {req.label}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
